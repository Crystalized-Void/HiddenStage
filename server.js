const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const path = require('path');

const rootEnvPath = path.join(__dirname, '.env');
const dbEnvPath = path.join(__dirname, 'database', '.env');

const rootEnvResult = dotenv.config({ path: rootEnvPath });
if (rootEnvResult.error) {
    dotenv.config({ path: dbEnvPath });
}

const app = express();
const PORT = process.env.PORT || 3000;
const PROJECT_ROOT = __dirname;

app.use('/img', express.static(path.join(PROJECT_ROOT, 'img')));;

app.use(cors());
app.use(express.json({ limit: '6mb' }));
app.use(express.static(PROJECT_ROOT));

app.get('/', (req, res) => {
    res.redirect('/inicio_de_sesion/index.html');
});

const MAX_PROFILE_PHOTO_BYTES = 1024 * 1024;
const MAX_SUPPORT_ATTACHMENT_BYTES = 2 * 1024 * 1024;

const getBase64PayloadBytes = (dataUrl) => {
    if (typeof dataUrl !== 'string') {
        return 0;
    }

    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) {
        return 0;
    }

    const base64 = dataUrl.slice(commaIndex + 1);
    if (!base64) {
        return 0;
    }

    const padding = (base64.match(/=+$/) || [''])[0].length;
    return Math.floor((base64.length * 3) / 4) - padding;
};

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const createSupportTicketId = () => {
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `HS-${datePart}-${randomPart}`;
};

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const getUserWithRoleById = async (id_usuario) => {
    const [rows] = await pool.query(
        `SELECT u.id_usuario, u.username, u.email, u.biografia, u.pronombres,
                u.red_social_1, u.red_social_2, u.red_social_3, u.red_social_4, u.red_social_5,
                u.foto_perfil, u.banner_perfil, u.id_rol, r.nombre_rol
         FROM usuarios u
         INNER JOIN roles r ON u.id_rol = r.id_rol
         WHERE u.id_usuario = ?
         LIMIT 1`,
        [Number(id_usuario)]
    );

    if (rows.length === 0) {
        return null;
    }

    return rows[0];
};

const hasRole = (user, allowedRoles) => {
    return Boolean(user && Array.isArray(allowedRoles) && allowedRoles.includes(Number(user.id_rol)));
};

const getApprovedPublicationById = async (publicationId) => {
    const [rows] = await pool.query(
        `SELECT p.id_publicacion, p.id_autor, p.titulo, p.encabezado, p.contenido,
                p.categoria, p.imagen_principal, p.galeria_json, p.enlaces_json,
                p.estado, p.motivo_rechazo, p.created_at, p.updated_at,
                u.username, u.foto_perfil
         FROM publicaciones_principales p
         INNER JOIN usuarios u ON p.id_autor = u.id_usuario
         WHERE p.id_publicacion = ?
           AND p.estado = 'aprobada'
         LIMIT 1`,
        [Number(publicationId)]
    );

    return rows[0] || null;
};

const getEnumValuesForColumn = async (tableName, columnName) => {
    const [rows] = await pool.query(
        `SELECT COLUMN_TYPE
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?
         LIMIT 1`,
        [tableName, columnName]
    );

    const columnType = String(rows[0]?.COLUMN_TYPE || '');
    const match = columnType.match(/^enum\((.*)\)$/i);

    if (!match) {
        return [];
    }

    return match[1]
        .split(',')
        .map((value) => value.trim().replace(/^'/, '').replace(/'$/, '').replace(/''/g, "'"))
        .filter(Boolean);
};

const canStoreRoleChangeHistory = async () => {
    try {
        const [actionValues, contentValues] = await Promise.all([
            getEnumValuesForColumn('moderacion_historial', 'tipo_accion'),
            getEnumValuesForColumn('moderacion_historial', 'tipo_contenido')
        ]);

        return actionValues.includes('cambiar_rol_usuario') && contentValues.includes('usuario');
    } catch (error) {
        return false;
    }
};

const VALID_COMMENT_CONTENT_TYPES = ['publicacion_principal', 'post_perfil'];
const VALID_COMMENT_STATES = ['activo', 'oculto', 'eliminado'];
const VALID_REACTION_CONTENT_TYPES = ['publicacion_principal', 'post_perfil'];
const VALID_REACTION_TYPES = ['like', 'hype'];
const VALID_MODERATED_POST_STATES = ['activo', 'oculto', 'eliminado'];

app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 AS ok');
        return res.json({ ok: rows[0]?.ok === 1 });
    } catch (error) {
        return res.status(500).json({ ok: false, message: 'No se pudo conectar con la base de datos' });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'username, email y password son obligatorios' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedUsername = String(username).trim();

        const [existingUsers] = await pool.query(
            'SELECT id_usuario FROM usuarios WHERE username = ? OR email = ? LIMIT 1',
            [normalizedUsername, normalizedEmail]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'El usuario o email ya existe' });
        }

        const hashedPassword = await bcrypt.hash(String(password), 10);

        await pool.query(
            `INSERT INTO usuarios (username, email, password, id_rol)
             VALUES (?, ?, ?, 1)`,
            [normalizedUsername, normalizedEmail, hashedPassword]
        );

        return res.status(201).json({ message: 'Usuario registrado correctamente' });
    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ message: 'No existe el rol con id_rol = 1 en la tabla roles' });
        }

        return res.status(500).json({ message: 'Error interno al registrar usuario' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'email y password son obligatorios' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const [users] = await pool.query(
            `SELECT u.id_usuario, u.password
             FROM usuarios u
             INNER JOIN roles r ON u.id_rol = r.id_rol
             WHERE u.email = ?
             LIMIT 1`,
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const user = users[0];
        const inputPassword = String(password);
        const storedPassword = String(user.password || '');
        const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(storedPassword);

        let validPassword = false;

        if (isBcryptHash) {
            validPassword = await bcrypt.compare(inputPassword, storedPassword);
        } else {
            validPassword = inputPassword === storedPassword;

            if (validPassword) {
                const upgradedHash = await bcrypt.hash(inputPassword, 10);
                await pool.query(
                    'UPDATE usuarios SET password = ? WHERE id_usuario = ? LIMIT 1',
                    [upgradedHash, Number(user.id_usuario)]
                );
            }
        }

        if (!validPassword) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const userWithRole = await getUserWithRoleById(Number(user.id_usuario));

        if (!userWithRole) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        return res.json({
            message: 'Inicio de sesión correcto',
            user: {
                id_usuario: userWithRole.id_usuario,
                username: userWithRole.username,
                email: userWithRole.email,
                biografia: userWithRole.biografia || '',
                pronombres: userWithRole.pronombres || '',
                red_social_1: userWithRole.red_social_1 || '',
                red_social_2: userWithRole.red_social_2 || '',
                red_social_3: userWithRole.red_social_3 || '',
                red_social_4: userWithRole.red_social_4 || '',
                red_social_5: userWithRole.red_social_5 || '',
                foto_perfil: userWithRole.foto_perfil || '',
                banner_perfil: userWithRole.banner_perfil || '',
                id_rol: userWithRole.id_rol,
                nombre_rol: userWithRole.nombre_rol
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al iniciar sesión' });
    }
});

app.put('/api/profile', async (req, res) => {
    try {
        const {
            id_usuario,
            username,
            biografia,
            pronombres,
            red_social_1,
            red_social_2,
            red_social_3,
            red_social_4,
            red_social_5,
            foto_perfil,
            banner_perfil
        } = req.body;

        if (!id_usuario || !username) {
            return res.status(400).json({ message: 'id_usuario y username son obligatorios' });
        }

        const normalizedUsername = String(username).trim();
        const normalizedBio = typeof biografia === 'string'
            ? biografia.trim()
            : '';
        const normalizedPronouns = typeof pronombres === 'string'
            ? pronombres.trim()
            : '';
        const normalizedSocial1 = typeof red_social_1 === 'string' ? red_social_1.trim() : '';
        const normalizedSocial2 = typeof red_social_2 === 'string' ? red_social_2.trim() : '';
        const normalizedSocial3 = typeof red_social_3 === 'string' ? red_social_3.trim() : '';
        const normalizedSocial4 = typeof red_social_4 === 'string' ? red_social_4.trim() : '';
        const normalizedSocial5 = typeof red_social_5 === 'string' ? red_social_5.trim() : '';
        const normalizedPhoto = typeof foto_perfil === 'string' ? foto_perfil.trim() : '';
        const normalizedBanner = typeof banner_perfil === 'string' ? banner_perfil.trim() : '';

        if (normalizedPhoto && !/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(normalizedPhoto)) {
            return res.status(400).json({ message: 'El formato de la foto no es válido' });
        }

        if (normalizedPhoto) {
            const photoBytes = getBase64PayloadBytes(normalizedPhoto);
            if (photoBytes > MAX_PROFILE_PHOTO_BYTES) {
                return res.status(413).json({ message: 'La foto de perfil debe pesar máximo 1MB' });
            }
        }

        if (normalizedBanner && !/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(normalizedBanner)) {
            return res.status(400).json({ message: 'El formato del banner no es válido' });
        }

        if (normalizedBanner) {
            const bannerBytes = getBase64PayloadBytes(normalizedBanner);
            if (bannerBytes > MAX_PROFILE_PHOTO_BYTES) {
                return res.status(413).json({ message: 'El banner de perfil debe pesar máximo 1MB' });
            }
        }

        if (!normalizedUsername) {
            return res.status(400).json({ message: 'El nombre de usuario no puede estar vacío' });
        }

        const [duplicateUsers] = await pool.query(
            'SELECT id_usuario FROM usuarios WHERE username = ? AND id_usuario <> ? LIMIT 1',
            [normalizedUsername, Number(id_usuario)]
        );

        if (duplicateUsers.length > 0) {
            return res.status(409).json({ message: 'Ese nombre de usuario ya está en uso' });
        }

        const [updateResult] = await pool.query(
            `UPDATE usuarios
             SET username = ?,
                 biografia = ?,
                 pronombres = ?,
                 red_social_1 = ?,
                 red_social_2 = ?,
                 red_social_3 = ?,
                 red_social_4 = ?,
                 red_social_5 = ?,
                 foto_perfil = ?,
                 banner_perfil = ?
             WHERE id_usuario = ?
             LIMIT 1`,
            [
                normalizedUsername,
                normalizedBio,
                normalizedPronouns,
                normalizedSocial1,
                normalizedSocial2,
                normalizedSocial3,
                normalizedSocial4,
                normalizedSocial5,
                normalizedPhoto,
                normalizedBanner,
                Number(id_usuario)
            ]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const updatedUser = await getUserWithRoleById(Number(id_usuario));

        if (!updatedUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        return res.json({
            message: 'Perfil actualizado correctamente',
            user: {
                id_usuario: updatedUser.id_usuario,
                username: updatedUser.username,
                email: updatedUser.email,
                biografia: updatedUser.biografia || '',
                pronombres: updatedUser.pronombres || '',
                red_social_1: updatedUser.red_social_1 || '',
                red_social_2: updatedUser.red_social_2 || '',
                red_social_3: updatedUser.red_social_3 || '',
                red_social_4: updatedUser.red_social_4 || '',
                red_social_5: updatedUser.red_social_5 || '',
                foto_perfil: updatedUser.foto_perfil || '',
                banner_perfil: updatedUser.banner_perfil || '',
                id_rol: updatedUser.id_rol,
                nombre_rol: updatedUser.nombre_rol
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al actualizar perfil' });
    }
});

app.get('/api/admin/usuarios', async (req, res) => {
    try {
        const { id_admin, search, rol } = req.query || {};
        const adminId = Number(id_admin);
        const normalizedSearch = typeof search === 'string' ? search.trim() : '';
        const roleFilter = rol === undefined || rol === null || rol === '' ? null : Number(rol);

        if (!adminId) {
            return res.status(400).json({ message: 'id_admin es obligatorio' });
        }

        if (rol !== undefined && rol !== null && rol !== '' && Number.isNaN(roleFilter)) {
            return res.status(400).json({ message: 'rol debe ser numérico' });
        }

        const adminUser = await getUserWithRoleById(adminId);

        if (!adminUser) {
            return res.status(404).json({ message: 'Usuario administrador no encontrado' });
        }

        if (!hasRole(adminUser, [5])) {
            return res.status(403).json({ message: 'No tienes permisos para ver usuarios' });
        }

        const whereClauses = [];
        const queryParams = [];

        if (normalizedSearch) {
            whereClauses.push('(u.username LIKE ? OR u.email LIKE ?)');
            const searchTerm = `%${normalizedSearch}%`;
            queryParams.push(searchTerm, searchTerm);
        }

        if (roleFilter !== null) {
            whereClauses.push('u.id_rol = ?');
            queryParams.push(roleFilter);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const [rows] = await pool.query(
            `SELECT u.id_usuario, u.username, u.email, u.biografia, u.pronombres,
                    u.foto_perfil, u.banner_perfil, u.id_rol, r.nombre_rol,
                    u.created_at, u.updated_at
             FROM usuarios u
             INNER JOIN roles r ON u.id_rol = r.id_rol
             ${whereSql}
             ORDER BY u.created_at DESC`,
            queryParams
        );

        return res.json({ usuarios: rows });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al obtener usuarios administrables' });
    }
});

app.get('/api/admin/roles', async (req, res) => {
    try {
        const { id_admin } = req.query || {};
        const adminId = Number(id_admin);

        if (!adminId) {
            return res.status(400).json({ message: 'id_admin es obligatorio' });
        }

        const adminUser = await getUserWithRoleById(adminId);

        if (!adminUser) {
            return res.status(404).json({ message: 'Usuario administrador no encontrado' });
        }

        if (!hasRole(adminUser, [5])) {
            return res.status(403).json({ message: 'No tienes permisos para consultar roles' });
        }

        const [rows] = await pool.query(
            `SELECT id_rol, nombre_rol
             FROM roles
             ORDER BY id_rol ASC`
        );

        return res.json({ roles: rows });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al obtener roles' });
    }
});

app.patch('/api/admin/usuarios/:id/rol', async (req, res) => {
    try {
        const targetUserId = Number(req.params.id);
        const { id_admin, id_rol } = req.body || {};
        const adminId = Number(id_admin);
        const nextRoleId = Number(id_rol);

        if (!targetUserId) {
            return res.status(400).json({ message: 'id de usuario inválido' });
        }

        if (!adminId) {
            return res.status(400).json({ message: 'id_admin es obligatorio' });
        }

        if (id_rol === undefined || id_rol === null || id_rol === '') {
            return res.status(400).json({ message: 'id_rol es obligatorio' });
        }

        if (Number.isNaN(nextRoleId)) {
            return res.status(400).json({ message: 'id_rol debe ser numérico' });
        }

        const adminUser = await getUserWithRoleById(adminId);

        if (!adminUser) {
            return res.status(404).json({ message: 'Usuario administrador no encontrado' });
        }

        if (!hasRole(adminUser, [5])) {
            return res.status(403).json({ message: 'No tienes permisos para cambiar roles' });
        }

        if (Number(adminUser.id_usuario) === targetUserId && nextRoleId !== 5) {
            return res.status(400).json({ message: 'No puedes quitarte a ti mismo el rol de administrador.' });
        }

        const targetUser = await getUserWithRoleById(targetUserId);

        if (!targetUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const [roleRows] = await pool.query(
            `SELECT id_rol, nombre_rol
             FROM roles
             WHERE id_rol = ?
             LIMIT 1`,
            [nextRoleId]
        );

        if (roleRows.length === 0) {
            return res.status(404).json({ message: 'El rol seleccionado no existe' });
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            await connection.query(
                `UPDATE usuarios
                 SET id_rol = ?
                 WHERE id_usuario = ?
                 LIMIT 1`,
                [nextRoleId, targetUserId]
            );

            const [updatedRows] = await connection.query(
                `SELECT u.id_usuario, u.username, u.email, u.biografia, u.pronombres,
                        u.foto_perfil, u.banner_perfil, u.id_rol, r.nombre_rol,
                        u.created_at, u.updated_at
                 FROM usuarios u
                 INNER JOIN roles r ON u.id_rol = r.id_rol
                 WHERE u.id_usuario = ?
                 LIMIT 1`,
                [targetUserId]
            );

            await connection.commit();

            const updatedUser = updatedRows[0];

            const canLogRoleChange = await canStoreRoleChangeHistory();

            if (canLogRoleChange) {
                try {
                    await pool.query(
                        `INSERT INTO moderacion_historial (
                            id_moderador,
                            tipo_accion,
                            tipo_contenido,
                            id_contenido,
                            detalle
                        ) VALUES (?, 'cambiar_rol_usuario', 'usuario', ?, ?)`,
                        [adminId, targetUserId, `Cambio de rol a ${updatedUser.nombre_rol}`]
                    );
                } catch (historyError) {
                    // Si el esquema no admite este valor o el historial falla, no bloqueamos el cambio de rol.
                }
            }

            return res.json({
                message: 'Rol actualizado correctamente',
                usuario: updatedUser
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al cambiar el rol del usuario' });
    }
});

app.get('/api/posts/:id_usuario', async (req, res) => {
    try {
        const userId = Number(req.params.id_usuario);

        if (!userId) {
            return res.status(400).json({ message: 'id_usuario inválido' });
        }

        const [posts] = await pool.query(
            `SELECT id_post, id_usuario, titulo, contenido, portada_url, youtube_url, resumen_media_json, created_at
             FROM publicaciones
             WHERE id_usuario = ? AND (estado = 'activo' OR estado IS NULL)
             ORDER BY created_at DESC`,
            [userId]
        );

        return res.json({ posts });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al obtener publicaciones' });
    }
});

app.post('/api/posts', async (req, res) => {
    try {
        const {
            id_usuario,
            titulo,
            contenido,
            portada_url,
            youtube_url,
            resumen_media
        } = req.body;

        const userId = Number(id_usuario);
        const normalizedTitle = typeof titulo === 'string' ? titulo.trim() : '';
        const normalizedContent = typeof contenido === 'string' ? contenido.trim() : '';
        const normalizedCoverUrl = typeof portada_url === 'string' ? portada_url.trim() : '';
        const normalizedYoutubeUrl = typeof youtube_url === 'string' ? youtube_url.trim() : '';

        if (!userId || !normalizedTitle || !normalizedContent) {
            return res.status(400).json({ message: 'id_usuario, titulo y contenido son obligatorios' });
        }

        if (normalizedTitle.length > 120) {
            return res.status(400).json({ message: 'El título supera el máximo permitido' });
        }

        const mediaSummary = resumen_media && typeof resumen_media === 'object'
            ? JSON.stringify(resumen_media)
            : null;

        const [insertResult] = await pool.query(
            `INSERT INTO publicaciones (id_usuario, titulo, contenido, portada_url, youtube_url, resumen_media_json)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                userId,
                normalizedTitle,
                normalizedContent,
                normalizedCoverUrl || null,
                normalizedYoutubeUrl || null,
                mediaSummary
            ]
        );

        const [createdRows] = await pool.query(
            `SELECT id_post, id_usuario, titulo, contenido, portada_url, youtube_url, resumen_media_json, created_at
             FROM publicaciones
             WHERE id_post = ?
             LIMIT 1`,
            [Number(insertResult.insertId)]
        );

        return res.status(201).json({
            message: 'Publicación creada correctamente',
            post: createdRows[0]
        });
    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ message: 'El usuario no existe para crear publicación' });
        }

        return res.status(500).json({ message: 'Error interno al crear publicación' });
    }
});

app.post('/api/publicaciones-principales', async (req, res) => {
    try {
        const {
            id_autor,
            titulo,
            encabezado,
            contenido,
            categoria,
            imagen_principal,
            galeria_json,
            enlaces_json
        } = req.body || {};

        const authorId = Number(id_autor);
        const normalizedTitle = typeof titulo === 'string' ? titulo.trim() : '';
        const normalizedHeader = typeof encabezado === 'string' ? encabezado.trim() : '';
        const normalizedContent = typeof contenido === 'string' ? contenido.trim() : '';
        const normalizedCategory = typeof categoria === 'string' ? categoria.trim() : '';
        const normalizedMainImage = typeof imagen_principal === 'string' ? imagen_principal.trim() : '';

        if (!authorId || !normalizedTitle || !normalizedHeader || !normalizedContent || !normalizedCategory) {
            return res.status(400).json({
                message: 'id_autor, titulo, encabezado, contenido y categoria son obligatorios'
            });
        }

        const authorUser = await getUserWithRoleById(authorId);

        if (!authorUser) {
            return res.status(404).json({ message: 'Autor no encontrado' });
        }

        if (!hasRole(authorUser, [2, 5])) {
            return res.status(403).json({ message: 'No tienes permisos para crear publicaciones principales' });
        }

        const normalizedGalleryJson = (() => {
            if (galeria_json === null || typeof galeria_json === 'undefined' || galeria_json === '') {
                return null;
            }

            if (typeof galeria_json === 'string') {
                try {
                    JSON.parse(galeria_json);
                    return galeria_json;
                } catch (error) {
                    return '__INVALID_JSON__';
                }
            }

            return JSON.stringify(galeria_json);
        })();

        if (normalizedGalleryJson === '__INVALID_JSON__') {
            return res.status(400).json({ message: 'galeria_json no contiene un JSON válido' });
        }

        const normalizedLinksJson = (() => {
            if (enlaces_json === null || typeof enlaces_json === 'undefined' || enlaces_json === '') {
                return null;
            }

            if (typeof enlaces_json === 'string') {
                try {
                    JSON.parse(enlaces_json);
                    return enlaces_json;
                } catch (error) {
                    return '__INVALID_JSON__';
                }
            }

            return JSON.stringify(enlaces_json);
        })();

        if (normalizedLinksJson === '__INVALID_JSON__') {
            return res.status(400).json({ message: 'enlaces_json no contiene un JSON válido' });
        }

        const [insertResult] = await pool.query(
            `INSERT INTO publicaciones_principales (
                id_autor,
                titulo,
                encabezado,
                contenido,
                categoria,
                imagen_principal,
                galeria_json,
                enlaces_json,
                estado
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
            [
                authorId,
                normalizedTitle,
                normalizedHeader,
                normalizedContent,
                normalizedCategory,
                normalizedMainImage || null,
                normalizedGalleryJson,
                normalizedLinksJson
            ]
        );

        const [createdRows] = await pool.query(
            `SELECT p.id_publicacion, p.id_autor, p.titulo, p.encabezado, p.contenido,
                    p.categoria, p.imagen_principal, p.galeria_json, p.enlaces_json,
                    p.estado, p.motivo_rechazo, p.created_at, p.updated_at,
                    u.username, u.foto_perfil
             FROM publicaciones_principales p
             INNER JOIN usuarios u ON p.id_autor = u.id_usuario
             WHERE p.id_publicacion = ?
             LIMIT 1`,
            [Number(insertResult.insertId)]
        );

        return res.status(201).json({
            message: 'Publicación principal creada correctamente',
            publicacion: createdRows[0]
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al crear publicación principal' });
    }
});

app.get('/api/publicaciones-principales', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT p.id_publicacion, p.id_autor, p.titulo, p.encabezado, p.contenido,
                    p.categoria, p.imagen_principal, p.galeria_json, p.enlaces_json,
                    p.estado, p.motivo_rechazo, p.created_at, p.updated_at,
                    u.username, u.foto_perfil,
                    COALESCE(h.hype_count, 0) AS hype_count
             FROM publicaciones_principales p
             INNER JOIN usuarios u ON p.id_autor = u.id_usuario
             LEFT JOIN (
                 SELECT id_contenido, COUNT(*) AS hype_count
                 FROM reacciones
                 WHERE tipo_contenido = 'publicacion_principal'
                   AND tipo_reaccion = 'hype'
                 GROUP BY id_contenido
             ) h ON h.id_contenido = p.id_publicacion
             WHERE p.estado = 'aprobada'
             ORDER BY p.created_at DESC`
        );

        return res.json({ publicaciones: rows });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al obtener publicaciones principales' });
    }
});

app.get('/api/publicaciones-principales/autor/:id_autor', async (req, res) => {
    try {
        const authorId = Number(req.params.id_autor);

        if (!authorId) {
            return res.status(400).json({ message: 'id_autor inválido' });
        }

        const [rows] = await pool.query(
            `SELECT p.id_publicacion, p.id_autor, p.titulo, p.encabezado, p.contenido,
                    p.categoria, p.imagen_principal, p.galeria_json, p.enlaces_json,
                    p.estado, p.motivo_rechazo, p.created_at, p.updated_at,
                    u.username, u.foto_perfil
             FROM publicaciones_principales p
             INNER JOIN usuarios u ON p.id_autor = u.id_usuario
             WHERE p.id_autor = ?
             ORDER BY p.created_at DESC`,
            [authorId]
        );

        return res.json({ publicaciones: rows });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al obtener publicaciones del autor' });
    }
});

app.get('/api/publicaciones-principales/:id', async (req, res) => {
    try {
        const publicationId = Number(req.params.id);

        if (!publicationId) {
            return res.status(400).json({ message: 'id_publicacion inválido' });
        }

        const [rows] = await pool.query(
            `SELECT p.id_publicacion, p.id_autor, p.titulo, p.encabezado, p.contenido,
                    p.categoria, p.imagen_principal, p.galeria_json, p.enlaces_json,
                    p.estado, p.motivo_rechazo, p.created_at, p.updated_at,
                    u.username, u.foto_perfil
             FROM publicaciones_principales p
             INNER JOIN usuarios u ON p.id_autor = u.id_usuario
             WHERE p.id_publicacion = ?
             LIMIT 1`,
            [publicationId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Publicación principal no encontrada' });
        }

        const publication = rows[0];

        if (publication.estado === 'aprobada') {
            return res.json({ publicacion: publication });
        }

        const requesterUserId = Number(req.query.id_usuario);

        if (!requesterUserId) {
            return res.status(400).json({
                message: 'Se requiere id_usuario para ver publicaciones no aprobadas'
            });
        }

        const requesterUser = await getUserWithRoleById(requesterUserId);

        if (!requesterUser) {
            return res.status(404).json({ message: 'Usuario solicitante no encontrado' });
        }

        const canViewNonApproved =
            Number(requesterUser.id_usuario) === Number(publication.id_autor) ||
            hasRole(requesterUser, [4, 5]);

        if (!canViewNonApproved) {
            return res.status(403).json({ message: 'No tienes permisos para ver esta publicación' });
        }

        return res.json({ publicacion: publication });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al obtener publicación principal' });
    }
});

app.post('/api/publicaciones-principales/:id/guardar', async (req, res) => {
    try {
        const publicationId = Number(req.params.id);
        const userId = Number(req.body?.id_usuario);

        if (!publicationId) {
            return res.status(400).json({ message: 'id_publicacion inválido' });
        }

        if (!userId) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const user = await getUserWithRoleById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const publication = await getApprovedPublicationById(publicationId);
        if (!publication) {
            return res.status(404).json({ message: 'Publicación principal no encontrada o no aprobada' });
        }

        await pool.query(
            `INSERT IGNORE INTO publicaciones_guardadas (id_usuario, id_publicacion)
             VALUES (?, ?)`,
            [userId, publicationId]
        );

        return res.json({
            message: 'Publicación guardada correctamente',
            guardado: true
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al guardar publicación principal' });
    }
});

app.delete('/api/publicaciones-principales/:id/guardar', async (req, res) => {
    try {
        const publicationId = Number(req.params.id);
        const userId = Number(req.body?.id_usuario);

        if (!publicationId) {
            return res.status(400).json({ message: 'id_publicacion inválido' });
        }

        if (!userId) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const user = await getUserWithRoleById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        await pool.query(
            `DELETE FROM publicaciones_guardadas
             WHERE id_usuario = ?
               AND id_publicacion = ?`,
            [userId, publicationId]
        );

        return res.json({
            message: 'Publicación removida de guardados',
            guardado: false
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al quitar guardado' });
    }
});

app.get('/api/publicaciones-principales/:id/guardado', async (req, res) => {
    try {
        const publicationId = Number(req.params.id);
        const userId = Number(req.query.id_usuario);

        if (!publicationId) {
            return res.status(400).json({ message: 'id_publicacion inválido' });
        }

        if (!userId) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const user = await getUserWithRoleById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const publication = await getApprovedPublicationById(publicationId);
        if (!publication) {
            return res.status(404).json({ message: 'Publicación principal no encontrada o no aprobada' });
        }

        const [rows] = await pool.query(
            `SELECT id_guardado
             FROM publicaciones_guardadas
             WHERE id_usuario = ?
               AND id_publicacion = ?
             LIMIT 1`,
            [userId, publicationId]
        );

        return res.json({ guardado: rows.length > 0 });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al consultar guardado' });
    }
});

app.get('/api/usuarios/:id_usuario/guardados', async (req, res) => {
    try {
        const userId = Number(req.params.id_usuario);

        if (!userId) {
            return res.status(400).json({ message: 'id_usuario inválido' });
        }

        const user = await getUserWithRoleById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const [rows] = await pool.query(
            `SELECT pg.id_guardado,
                    pg.id_publicacion,
                    p.titulo,
                    p.encabezado,
                    p.contenido,
                    p.categoria,
                    p.imagen_principal,
                    p.created_at,
                    pg.created_at AS fecha_guardado,
                    u.username,
                    u.foto_perfil
             FROM publicaciones_guardadas pg
             INNER JOIN publicaciones_principales p ON pg.id_publicacion = p.id_publicacion
             INNER JOIN usuarios u ON p.id_autor = u.id_usuario
             WHERE pg.id_usuario = ?
               AND p.estado = 'aprobada'
             ORDER BY pg.created_at DESC`,
            [userId]
        );

        return res.json({ guardados: rows });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al obtener publicaciones guardadas' });
    }
});

app.get('/api/moderacion/publicaciones-pendientes', async (req, res) => {
    try {
        const reviewerUserId = Number(req.query.id_usuario);

        if (!reviewerUserId) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const reviewerUser = await getUserWithRoleById(reviewerUserId);

        if (!reviewerUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if (!hasRole(reviewerUser, [4, 5])) {
            return res.status(403).json({ message: 'No tienes permisos para revisar publicaciones pendientes' });
        }

        const [rows] = await pool.query(
            `SELECT p.id_publicacion, p.id_autor, p.titulo, p.encabezado, p.contenido,
                    p.categoria, p.imagen_principal, p.galeria_json, p.enlaces_json,
                    p.estado, p.motivo_rechazo, p.created_at, p.updated_at,
                    u.username, u.foto_perfil
             FROM publicaciones_principales p
             INNER JOIN usuarios u ON p.id_autor = u.id_usuario
             WHERE p.estado = 'pendiente'
             ORDER BY p.created_at ASC`
        );

        return res.json({ publicaciones: rows });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al obtener publicaciones pendientes' });
    }
});

app.get('/api/moderacion/publicaciones-principales', async (req, res) => {
    try {
        const reviewerUserId = Number(req.query.id_usuario);
        const normalizedState = typeof req.query.estado === 'string' ? req.query.estado.trim() : '';

        if (!reviewerUserId) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const reviewerUser = await getUserWithRoleById(reviewerUserId);

        if (!reviewerUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if (!hasRole(reviewerUser, [4, 5])) {
            return res.status(403).json({ message: 'No tienes permisos para revisar publicaciones principales' });
        }

        const queryParams = [];
        let whereClause = '';

        if (normalizedState) {
            whereClause = 'WHERE p.estado = ?';
            queryParams.push(normalizedState);
        }

        const [rows] = await pool.query(
            `SELECT p.id_publicacion, p.id_autor, p.titulo, p.encabezado, p.contenido,
                    p.categoria, p.imagen_principal, p.galeria_json, p.enlaces_json,
                    p.estado, p.motivo_rechazo, p.created_at, p.updated_at,
                    u.username, u.foto_perfil
             FROM publicaciones_principales p
             INNER JOIN usuarios u ON p.id_autor = u.id_usuario
             ${whereClause}
             ORDER BY p.created_at DESC`,
            queryParams
        );

        return res.json({ publicaciones: rows });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al obtener publicaciones principales' });
    }
});

app.patch('/api/moderacion/publicaciones-principales/:id/estado', async (req, res) => {
    try {
        const publicationId = Number(req.params.id);
        const { id_moderador, estado, motivo_rechazo } = req.body || {};

        const moderatorUserId = Number(id_moderador);
        const normalizedState = typeof estado === 'string' ? estado.trim().toLowerCase() : '';
        const normalizedReason = typeof motivo_rechazo === 'string' ? motivo_rechazo.trim() : '';

        if (!publicationId) {
            return res.status(400).json({ message: 'id de publicación inválido' });
        }

        if (!moderatorUserId) {
            return res.status(400).json({ message: 'id_moderador es obligatorio' });
        }

        if (!normalizedState) {
            return res.status(400).json({ message: 'estado es obligatorio' });
        }

        if (!['aprobada', 'rechazada'].includes(normalizedState)) {
            return res.status(400).json({ message: "estado solo puede ser 'aprobada' o 'rechazada'" });
        }

        const moderatorUser = await getUserWithRoleById(moderatorUserId);

        if (!moderatorUser) {
            return res.status(404).json({ message: 'Usuario moderador no encontrado' });
        }

        if (!hasRole(moderatorUser, [4, 5])) {
            return res.status(403).json({ message: 'No tienes permisos para moderar publicaciones' });
        }

        const [publicationRows] = await pool.query(
            `SELECT id_publicacion, id_autor, titulo, encabezado, contenido, categoria,
                    imagen_principal, galeria_json, enlaces_json, estado, motivo_rechazo,
                    created_at, updated_at
             FROM publicaciones_principales
             WHERE id_publicacion = ?
             LIMIT 1`,
            [publicationId]
        );

        if (publicationRows.length === 0) {
            return res.status(404).json({ message: 'Publicación principal no encontrada' });
        }

        const currentPublication = publicationRows[0];

        if (currentPublication.estado !== 'pendiente') {
            return res.status(409).json({ message: 'Solo se pueden moderar publicaciones pendientes' });
        }

        if (normalizedState === 'rechazada' && !normalizedReason) {
            return res.status(400).json({ message: 'motivo_rechazo es obligatorio al rechazar' });
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const nextReason = normalizedState === 'rechazada' ? normalizedReason : null;

            await connection.query(
                `UPDATE publicaciones_principales
                 SET estado = ?,
                     motivo_rechazo = ?
                 WHERE id_publicacion = ?
                 LIMIT 1`,
                [normalizedState, nextReason, publicationId]
            );

            const tipoAccion = normalizedState === 'aprobada'
                ? 'aprobar_publicacion'
                : 'rechazar_publicacion';
            const detalle = normalizedState === 'aprobada'
                ? 'Publicación principal aprobada'
                : normalizedReason;

            await connection.query(
                `INSERT INTO moderacion_historial (
                    id_moderador,
                    tipo_accion,
                    tipo_contenido,
                    id_contenido,
                    detalle
                ) VALUES (?, ?, 'publicacion_principal', ?, ?)`,
                [moderatorUserId, tipoAccion, publicationId, detalle]
            );

            await connection.commit();

            const [updatedRows] = await connection.query(
                `SELECT p.id_publicacion, p.id_autor, p.titulo, p.encabezado, p.contenido,
                        p.categoria, p.imagen_principal, p.galeria_json, p.enlaces_json,
                        p.estado, p.motivo_rechazo, p.created_at, p.updated_at,
                        u.username, u.foto_perfil
                 FROM publicaciones_principales p
                 INNER JOIN usuarios u ON p.id_autor = u.id_usuario
                 WHERE p.id_publicacion = ?
                 LIMIT 1`,
                [publicationId]
            );

            return res.json({
                message: normalizedState === 'aprobada'
                    ? 'Publicación aprobada correctamente'
                    : 'Publicación rechazada correctamente',
                publicacion: updatedRows[0]
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al moderar la publicación' });
    }
});

app.delete('/api/moderacion/publicaciones-principales/:id', async (req, res) => {
    try {
        const publicationId = Number(req.params.id);
        const { id_moderador } = req.body || {};
        const moderatorUserId = Number(id_moderador);

        if (!publicationId) {
            return res.status(400).json({ message: 'id de publicación inválido' });
        }

        if (!moderatorUserId) {
            return res.status(400).json({ message: 'id_moderador es obligatorio' });
        }

        const moderatorUser = await getUserWithRoleById(moderatorUserId);

        if (!moderatorUser) {
            return res.status(404).json({ message: 'Usuario moderador no encontrado' });
        }

        if (!hasRole(moderatorUser, [4, 5])) {
            return res.status(403).json({ message: 'No tienes permisos para eliminar publicaciones principales' });
        }

        const [publicationRows] = await pool.query(
            `SELECT id_publicacion
             FROM publicaciones_principales
             WHERE id_publicacion = ?
             LIMIT 1`,
            [publicationId]
        );

        if (publicationRows.length === 0) {
            return res.status(404).json({ message: 'Publicación principal no encontrada' });
        }

        const [deleteResult] = await pool.query(
            `DELETE FROM publicaciones_principales
             WHERE id_publicacion = ?
             LIMIT 1`,
            [publicationId]
        );

        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ message: 'Publicación principal no encontrada' });
        }

        try {
            await pool.query(
                `INSERT INTO moderacion_historial (
                    id_moderador,
                    tipo_accion,
                    tipo_contenido,
                    id_contenido,
                    detalle
                ) VALUES (?, ?, 'publicacion_principal', ?, ?)`,
                [
                    moderatorUserId,
                    'eliminar_publicacion_principal',
                    publicationId,
                    'Publicación principal eliminada por moderación'
                ]
            );
        } catch (historyError) {
            // El historial no debe impedir el borrado.
        }

        return res.status(200).json({ message: 'Publicación principal eliminada correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al eliminar la publicación principal' });
    }
});

app.get('/api/comentarios', async (req, res) => {
    try {
        const { tipo_contenido, id_contenido } = req.query || {};
        const normalizedContentType = typeof tipo_contenido === 'string' ? tipo_contenido.trim() : '';
        const contentId = Number(id_contenido);

        if (!normalizedContentType || !contentId) {
            return res.status(400).json({ message: 'tipo_contenido e id_contenido son obligatorios' });
        }

        if (!VALID_COMMENT_CONTENT_TYPES.includes(normalizedContentType)) {
            return res.status(400).json({
                message: "tipo_contenido solo puede ser 'publicacion_principal' o 'post_perfil'"
            });
        }

        const [rows] = await pool.query(
            `SELECT c.id_comentario, c.id_usuario, c.tipo_contenido, c.id_contenido,
                    c.contenido, c.estado, c.created_at, c.updated_at,
                    u.username, u.foto_perfil
             FROM comentarios c
             INNER JOIN usuarios u ON c.id_usuario = u.id_usuario
             WHERE c.tipo_contenido = ?
               AND c.id_contenido = ?
               AND c.estado = 'activo'
             ORDER BY c.created_at ASC`,
            [normalizedContentType, contentId]
        );

        return res.json({ comentarios: rows });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al obtener comentarios' });
    }
});

app.post('/api/comentarios', async (req, res) => {
    try {
        const {
            id_usuario,
            tipo_contenido,
            id_contenido,
            contenido
        } = req.body || {};

        const userId = Number(id_usuario);
        const normalizedContentType = typeof tipo_contenido === 'string' ? tipo_contenido.trim() : '';
        const contentId = Number(id_contenido);
        const normalizedText = typeof contenido === 'string' ? contenido.trim() : '';

        if (!userId || !normalizedContentType || !contentId || !normalizedText) {
            return res.status(400).json({
                message: 'id_usuario, tipo_contenido, id_contenido y contenido son obligatorios'
            });
        }

        if (!VALID_COMMENT_CONTENT_TYPES.includes(normalizedContentType)) {
            return res.status(400).json({
                message: "tipo_contenido solo puede ser 'publicacion_principal' o 'post_perfil'"
            });
        }

        const user = await getUserWithRoleById(userId);

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if (!hasRole(user, [1, 2, 3, 4, 5])) {
            return res.status(403).json({ message: 'No tienes permisos para comentar' });
        }

        const [insertResult] = await pool.query(
            `INSERT INTO comentarios (
                id_usuario,
                tipo_contenido,
                id_contenido,
                contenido,
                estado
            ) VALUES (?, ?, ?, ?, 'activo')`,
            [userId, normalizedContentType, contentId, normalizedText]
        );

        const [createdRows] = await pool.query(
            `SELECT c.id_comentario, c.id_usuario, c.tipo_contenido, c.id_contenido,
                    c.contenido, c.estado, c.created_at, c.updated_at,
                    u.username, u.foto_perfil
             FROM comentarios c
             INNER JOIN usuarios u ON c.id_usuario = u.id_usuario
             WHERE c.id_comentario = ?
             LIMIT 1`,
            [Number(insertResult.insertId)]
        );

        return res.status(201).json({
            message: 'Comentario creado correctamente',
            comentario: createdRows[0]
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al crear comentario' });
    }
});

app.get('/api/moderacion/comentarios', async (req, res) => {
    try {
        const { id_usuario, estado, tipo_contenido, id_contenido } = req.query || {};
        const moderatorId = Number(id_usuario);
        const normalizedEstado = typeof estado === 'string' ? estado.trim().toLowerCase() : '';
        const normalizedContentType = typeof tipo_contenido === 'string' ? tipo_contenido.trim() : '';
        const contentId = Number(id_contenido);

        if (!moderatorId) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const moderator = await getUserWithRoleById(moderatorId);

        if (!moderator) {
            return res.status(404).json({ message: 'Usuario moderador no encontrado' });
        }

        if (!hasRole(moderator, [3, 5])) {
            return res.status(403).json({ message: 'No tienes permisos para moderar comentarios' });
        }

        const whereClauses = [];
        const queryParams = [];

        if (normalizedEstado) {
            if (!VALID_COMMENT_STATES.includes(normalizedEstado)) {
                return res.status(400).json({ message: "estado solo puede ser 'activo', 'oculto' o 'eliminado'" });
            }

            whereClauses.push('c.estado = ?');
            queryParams.push(normalizedEstado);
        } else {
            whereClauses.push('c.estado != ?');
            queryParams.push('eliminado');
        }

        if (normalizedContentType) {
            if (!VALID_COMMENT_CONTENT_TYPES.includes(normalizedContentType)) {
                return res.status(400).json({ message: "tipo_contenido solo puede ser 'publicacion_principal' o 'post_perfil'" });
            }

            whereClauses.push('c.tipo_contenido = ?');
            queryParams.push(normalizedContentType);
        }

        if (contentId) {
            whereClauses.push('c.id_contenido = ?');
            queryParams.push(contentId);
        }

        const whereSql = whereClauses.length > 0 ? `AND ${whereClauses.join(' AND ')}` : '';

        const [rows] = await pool.query(
            `SELECT c.id_comentario, c.contenido, c.estado, c.tipo_contenido, c.id_contenido,
                    c.created_at, c.updated_at, c.id_usuario,
                    u.username, u.foto_perfil
             FROM comentarios c
             INNER JOIN usuarios u ON c.id_usuario = u.id_usuario
             WHERE 1 = 1
             ${whereSql}
             ORDER BY c.created_at DESC`,
            queryParams
        );

        return res.json({ comentarios: rows });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al obtener comentarios para moderación' });
    }
});

app.patch('/api/moderacion/comentarios/:id/estado', async (req, res) => {
    try {
        const commentId = Number(req.params.id);
        const { id_moderador, estado, detalle } = req.body || {};

        const moderatorId = Number(id_moderador);
        const normalizedEstado = typeof estado === 'string' ? estado.trim().toLowerCase() : '';
        const normalizedDetalle = typeof detalle === 'string' ? detalle.trim() : '';

        if (!commentId) {
            return res.status(400).json({ message: 'id de comentario inválido' });
        }

        if (!moderatorId) {
            return res.status(400).json({ message: 'id_moderador es obligatorio' });
        }

        if (!normalizedEstado) {
            return res.status(400).json({ message: 'estado es obligatorio' });
        }

        if (!VALID_COMMENT_STATES.includes(normalizedEstado)) {
            return res.status(400).json({ message: "estado solo puede ser 'activo', 'oculto' o 'eliminado'" });
        }

        const moderator = await getUserWithRoleById(moderatorId);

        if (!moderator) {
            return res.status(404).json({ message: 'Usuario moderador no encontrado' });
        }

        if (!hasRole(moderator, [3, 5])) {
            return res.status(403).json({ message: 'No tienes permisos para moderar comentarios' });
        }

        const [commentRows] = await pool.query(
            `SELECT id_comentario, id_usuario, tipo_contenido, id_contenido, contenido, estado, created_at, updated_at
             FROM comentarios
             WHERE id_comentario = ?
             LIMIT 1`,
            [commentId]
        );

        if (commentRows.length === 0) {
            return res.status(404).json({ message: 'Comentario no encontrado' });
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            await connection.query(
                `UPDATE comentarios
                 SET estado = ?
                 WHERE id_comentario = ?
                 LIMIT 1`,
                [normalizedEstado, commentId]
            );

            const tipoAccion = normalizedEstado === 'oculto'
                ? 'ocultar_comentario'
                : normalizedEstado === 'eliminado'
                    ? 'eliminar_comentario'
                    : 'restaurar_comentario';

            const detalleFinal = normalizedDetalle || `Comentario ${normalizedEstado}`;

            await connection.query(
                `INSERT INTO moderacion_historial (
                    id_moderador,
                    tipo_accion,
                    tipo_contenido,
                    id_contenido,
                    detalle
                ) VALUES (?, ?, 'comentario', ?, ?)`,
                [moderatorId, tipoAccion, commentId, detalleFinal]
            );

            const [updatedRows] = await connection.query(
                `SELECT c.id_comentario, c.id_usuario, c.tipo_contenido, c.id_contenido,
                        c.contenido, c.estado, c.created_at, c.updated_at,
                        u.username, u.foto_perfil
                 FROM comentarios c
                 INNER JOIN usuarios u ON c.id_usuario = u.id_usuario
                 WHERE c.id_comentario = ?
                 LIMIT 1`,
                [commentId]
            );

            await connection.commit();

            return res.json({
                message: 'Comentario moderado correctamente',
                comentario: updatedRows[0]
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al moderar comentario' });
    }
});

app.get('/api/moderacion/posts-personales', async (req, res) => {
    try {
        const { id_usuario, estado, id_autor } = req.query || {};
        const moderatorId = Number(id_usuario);
        const normalizedEstado = typeof estado === 'string' ? estado.trim().toLowerCase() : '';
        const authorId = Number(id_autor);

        if (!moderatorId) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const moderator = await getUserWithRoleById(moderatorId);

        if (!moderator) {
            return res.status(404).json({ message: 'Usuario moderador no encontrado' });
        }

        if (!hasRole(moderator, [3, 5])) {
            return res.status(403).json({ message: 'No tienes permisos para moderar publicaciones personales' });
        }

        const whereClauses = [];
        const queryParams = [];

        if (normalizedEstado) {
            if (!VALID_MODERATED_POST_STATES.includes(normalizedEstado)) {
                return res.status(400).json({ message: "estado solo puede ser 'activo', 'oculto' o 'eliminado'" });
            }

            whereClauses.push('p.estado = ?');
            queryParams.push(normalizedEstado);
        } else {
            whereClauses.push('p.estado != ?');
            queryParams.push('eliminado');
        }

        if (authorId) {
            whereClauses.push('p.id_usuario = ?');
            queryParams.push(authorId);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const [rows] = await pool.query(
            `SELECT p.id_post, p.id_usuario, p.titulo, p.contenido, p.portada_url,
                    p.youtube_url, p.resumen_media_json, p.estado, p.created_at, p.updated_at,
                    u.username, u.foto_perfil
             FROM publicaciones p
             INNER JOIN usuarios u ON p.id_usuario = u.id_usuario
             ${whereSql}
             ORDER BY p.created_at DESC`,
            queryParams
        );

        return res.json({ publicaciones: rows });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al obtener publicaciones personales' });
    }
});

app.patch('/api/moderacion/posts-personales/:id/estado', async (req, res) => {
    try {
        const postId = Number(req.params.id);
        const { id_moderador, estado, detalle } = req.body || {};

        const moderatorId = Number(id_moderador);
        const normalizedEstado = typeof estado === 'string' ? estado.trim().toLowerCase() : '';
        const normalizedDetalle = typeof detalle === 'string' ? detalle.trim() : '';

        if (!postId) {
            return res.status(400).json({ message: 'id de publicación inválido' });
        }

        if (!moderatorId) {
            return res.status(400).json({ message: 'id_moderador es obligatorio' });
        }

        if (!normalizedEstado) {
            return res.status(400).json({ message: 'estado es obligatorio' });
        }

        if (!VALID_MODERATED_POST_STATES.includes(normalizedEstado)) {
            return res.status(400).json({ message: "estado solo puede ser 'activo', 'oculto' o 'eliminado'" });
        }

        const moderator = await getUserWithRoleById(moderatorId);

        if (!moderator) {
            return res.status(404).json({ message: 'Usuario moderador no encontrado' });
        }

        if (!hasRole(moderator, [3, 5])) {
            return res.status(403).json({ message: 'No tienes permisos para moderar publicaciones personales' });
        }

        const [postRows] = await pool.query(
            `SELECT id_post, id_usuario, titulo, contenido, portada_url, youtube_url, resumen_media_json, estado, created_at, updated_at
             FROM publicaciones
             WHERE id_post = ?
             LIMIT 1`,
            [postId]
        );

        if (postRows.length === 0) {
            return res.status(404).json({ message: 'Publicación personal no encontrada' });
        }

        await pool.query(
            `UPDATE publicaciones
             SET estado = ?
             WHERE id_post = ?
             LIMIT 1`,
            [normalizedEstado, postId]
        );

        const tipoAccion = normalizedEstado === 'oculto'
            ? 'ocultar_post_personal'
            : normalizedEstado === 'eliminado'
                ? 'eliminar_post_personal'
                : 'restaurar_post_personal';

        const detalleFinal = normalizedDetalle || `Publicación personal ${normalizedEstado}`;

        try {
            await pool.query(
                `INSERT INTO moderacion_historial (
                    id_moderador,
                    tipo_accion,
                    tipo_contenido,
                    id_contenido,
                    detalle
                ) VALUES (?, ?, 'post_perfil', ?, ?)`,
                [moderatorId, tipoAccion, postId, detalleFinal]
            );
        } catch (historyError) {
            // El historial no debe impedir la actualización del estado.
        }

        const [updatedRows] = await pool.query(
            `SELECT p.id_post, p.id_usuario, p.titulo, p.contenido, p.portada_url,
                    p.youtube_url, p.resumen_media_json, p.estado, p.created_at, p.updated_at,
                    u.username, u.foto_perfil
             FROM publicaciones p
             INNER JOIN usuarios u ON p.id_usuario = u.id_usuario
             WHERE p.id_post = ?
             LIMIT 1`,
            [postId]
        );

        return res.json({
            message: 'Publicación personal moderada correctamente',
            publicacion: updatedRows[0]
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al moderar publicación personal' });
    }
});

app.get('/api/reacciones/resumen', async (req, res) => {
    try {
        const { tipo_contenido, id_contenido, id_usuario } = req.query || {};
        const normalizedContentType = typeof tipo_contenido === 'string' ? tipo_contenido.trim() : '';
        const contentId = Number(id_contenido);
        const userId = Number(id_usuario);

        if (!normalizedContentType || !contentId) {
            return res.status(400).json({ message: 'tipo_contenido e id_contenido son obligatorios' });
        }

        if (!VALID_REACTION_CONTENT_TYPES.includes(normalizedContentType)) {
            return res.status(400).json({
                message: "tipo_contenido solo puede ser 'publicacion_principal' o 'post_perfil'"
            });
        }

        const [summaryRows] = await pool.query(
            `SELECT
                COALESCE(SUM(CASE WHEN tipo_reaccion = 'like' THEN 1 ELSE 0 END), 0) AS total_like,
                COALESCE(SUM(CASE WHEN tipo_reaccion = 'hype' THEN 1 ELSE 0 END), 0) AS total_hype
             FROM reacciones
             WHERE tipo_contenido = ?
               AND id_contenido = ?`,
            [normalizedContentType, contentId]
        );

        let userLike = false;
        let userHype = false;

        if (userId) {
            const [userRows] = await pool.query(
                `SELECT tipo_reaccion
                 FROM reacciones
                 WHERE tipo_contenido = ?
                   AND id_contenido = ?
                   AND id_usuario = ?
                 LIMIT 2`,
                [normalizedContentType, contentId, userId]
            );

            userLike = userRows.some((row) => row.tipo_reaccion === 'like');
            userHype = userRows.some((row) => row.tipo_reaccion === 'hype');
        }

        return res.json({
            total_like: Number(summaryRows[0]?.total_like || 0),
            total_hype: Number(summaryRows[0]?.total_hype || 0),
            user_like: userLike,
            user_hype: userHype
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al obtener resumen de reacciones' });
    }
});

app.post('/api/reacciones', async (req, res) => {
    try {
        const {
            id_usuario,
            tipo_contenido,
            id_contenido,
            tipo_reaccion
        } = req.body || {};

        const userId = Number(id_usuario);
        const normalizedContentType = typeof tipo_contenido === 'string' ? tipo_contenido.trim() : '';
        const contentId = Number(id_contenido);
        const normalizedReactionType = typeof tipo_reaccion === 'string' ? tipo_reaccion.trim().toLowerCase() : '';

        if (!userId || !normalizedContentType || !contentId || !normalizedReactionType) {
            return res.status(400).json({
                message: 'id_usuario, tipo_contenido, id_contenido y tipo_reaccion son obligatorios'
            });
        }

        if (!VALID_REACTION_CONTENT_TYPES.includes(normalizedContentType)) {
            return res.status(400).json({
                message: "tipo_contenido solo puede ser 'publicacion_principal' o 'post_perfil'"
            });
        }

        if (!VALID_REACTION_TYPES.includes(normalizedReactionType)) {
            return res.status(400).json({
                message: "tipo_reaccion solo puede ser 'like' o 'hype'"
            });
        }

        const user = await getUserWithRoleById(userId);

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if (!hasRole(user, [1, 2, 3, 4, 5])) {
            return res.status(403).json({ message: 'No tienes permisos para reaccionar' });
        }

        try {
            const [insertResult] = await pool.query(
                `INSERT INTO reacciones (
                    id_usuario,
                    tipo_contenido,
                    id_contenido,
                    tipo_reaccion
                ) VALUES (?, ?, ?, ?)`,
                [userId, normalizedContentType, contentId, normalizedReactionType]
            );

            return res.status(201).json({
                message: 'Reacción creada correctamente',
                reaccion: {
                    id_reaccion: insertResult.insertId,
                    id_usuario: userId,
                    tipo_contenido: normalizedContentType,
                    id_contenido: contentId,
                    tipo_reaccion: normalizedReactionType
                }
            });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Ya existe esa reacción para este contenido' });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al crear reacción' });
    }
});

app.delete('/api/reacciones', async (req, res) => {
    try {
        const {
            id_usuario,
            tipo_contenido,
            id_contenido,
            tipo_reaccion
        } = req.body || {};

        const userId = Number(id_usuario);
        const normalizedContentType = typeof tipo_contenido === 'string' ? tipo_contenido.trim() : '';
        const contentId = Number(id_contenido);
        const normalizedReactionType = typeof tipo_reaccion === 'string' ? tipo_reaccion.trim().toLowerCase() : '';

        if (!userId || !normalizedContentType || !contentId || !normalizedReactionType) {
            return res.status(400).json({
                message: 'id_usuario, tipo_contenido, id_contenido y tipo_reaccion son obligatorios'
            });
        }

        if (!VALID_REACTION_CONTENT_TYPES.includes(normalizedContentType)) {
            return res.status(400).json({
                message: "tipo_contenido solo puede ser 'publicacion_principal' o 'post_perfil'"
            });
        }

        if (!VALID_REACTION_TYPES.includes(normalizedReactionType)) {
            return res.status(400).json({
                message: "tipo_reaccion solo puede ser 'like' o 'hype'"
            });
        }

        const [deleteResult] = await pool.query(
            `DELETE FROM reacciones
             WHERE id_usuario = ?
               AND tipo_contenido = ?
               AND id_contenido = ?
               AND tipo_reaccion = ?`,
            [userId, normalizedContentType, contentId, normalizedReactionType]
        );

        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ message: 'No se encontró esa reacción para eliminar' });
        }

        return res.json({ message: 'Reacción eliminada correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al eliminar reacción' });
    }
});

app.post('/api/support-ticket', async (req, res) => {
    try {
        const {
            username,
            email,
            category,
            priority,
            subject,
            description,
            attachment_name,
            attachment_data
        } = req.body || {};

        const normalizedUsername = typeof username === 'string' ? username.trim() : '';
        const normalizedEmail = typeof email === 'string' ? email.trim() : '';
        const normalizedCategory = typeof category === 'string' ? category.trim() : '';
        const normalizedPriority = typeof priority === 'string' ? priority.trim() : '';
        const normalizedSubject = typeof subject === 'string' ? subject.trim() : '';
        const normalizedDescription = typeof description === 'string' ? description.trim() : '';
        const normalizedAttachmentName = typeof attachment_name === 'string' ? attachment_name.trim() : '';
        const normalizedAttachmentData = typeof attachment_data === 'string' ? attachment_data.trim() : '';

        if (!normalizedEmail || !normalizedCategory || !normalizedPriority || !normalizedSubject || !normalizedDescription) {
            return res.status(400).json({ message: 'Faltan campos obligatorios del ticket.' });
        }

        const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
        if (!validEmail) {
            return res.status(400).json({ message: 'El correo de contacto no es válido.' });
        }

        const mailHost = process.env.MAIL_HOST;
        const mailPort = Number(process.env.MAIL_PORT || 587);
        const mailSecure = String(process.env.MAIL_SECURE || 'false').toLowerCase() === 'true';
        const mailUser = process.env.MAIL_USER;
        const mailPass = process.env.MAIL_PASS;
        const mailTo = process.env.MAIL_TO || 'soporte@hiddenstage.io';
        const mailFrom = process.env.MAIL_FROM || mailUser;

        if (!mailHost || !mailUser || !mailPass || !mailFrom) {
            return res.status(500).json({ message: 'El servicio de correo no está configurado en el servidor.' });
        }

        let attachments = [];
        if (normalizedAttachmentData) {
            const isValidImageDataUrl = /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(normalizedAttachmentData);
            if (!isValidImageDataUrl) {
                return res.status(400).json({ message: 'El adjunto no tiene un formato de imagen válido.' });
            }

            const attachmentBytes = getBase64PayloadBytes(normalizedAttachmentData);
            if (attachmentBytes > MAX_SUPPORT_ATTACHMENT_BYTES) {
                return res.status(413).json({ message: 'La captura supera el máximo permitido de 2MB.' });
            }

            const commaIndex = normalizedAttachmentData.indexOf(',');
            const mimePart = normalizedAttachmentData.slice(5, normalizedAttachmentData.indexOf(';'));
            const ext = mimePart.split('/')[1] || 'png';
            const base64Payload = normalizedAttachmentData.slice(commaIndex + 1);

            attachments = [
                {
                    filename: normalizedAttachmentName || `captura-ticket.${ext}`,
                    content: base64Payload,
                    encoding: 'base64',
                    contentType: mimePart
                }
            ];
        }

        const ticketId = createSupportTicketId();
        const ticketDate = new Date().toLocaleString('es-MX', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        const transporter = nodemailer.createTransport({
            host: mailHost,
            port: mailPort,
            secure: mailSecure,
            auth: {
                user: mailUser,
                pass: mailPass
            }
        });

        await transporter.sendMail({
            from: `HiddenStage Soporte <${mailFrom}>`,
            to: mailTo,
            replyTo: normalizedEmail,
            subject: `[${ticketId}] ${normalizedSubject}`,
            text: [
                `Nuevo ticket de soporte - ${ticketId}`,
                `Fecha: ${ticketDate}`,
                `Usuario: ${normalizedUsername || 'No especificado'}`,
                `Correo: ${normalizedEmail}`,
                `Categoría: ${normalizedCategory}`,
                `Prioridad: ${normalizedPriority}`,
                `Asunto: ${normalizedSubject}`,
                '',
                'Descripción:',
                normalizedDescription
            ].join('\n'),
            html: `
                <h2>Nuevo ticket de soporte</h2>
                <p><strong>Folio:</strong> ${escapeHtml(ticketId)}</p>
                <p><strong>Fecha:</strong> ${escapeHtml(ticketDate)}</p>
                <p><strong>Usuario:</strong> ${escapeHtml(normalizedUsername || 'No especificado')}</p>
                <p><strong>Correo:</strong> ${escapeHtml(normalizedEmail)}</p>
                <p><strong>Categoría:</strong> ${escapeHtml(normalizedCategory)}</p>
                <p><strong>Prioridad:</strong> ${escapeHtml(normalizedPriority)}</p>
                <p><strong>Asunto:</strong> ${escapeHtml(normalizedSubject)}</p>
                <hr>
                <p><strong>Descripción:</strong></p>
                <p>${escapeHtml(normalizedDescription).replace(/\n/g, '<br>')}</p>
            `,
            attachments
        });

        return res.status(201).json({
            message: 'Ticket enviado correctamente por correo.',
            ticketId
        });
    } catch (error) {
        return res.status(500).json({ message: 'No se pudo enviar el ticket por correo.' });
    }
});

app.delete('/api/posts/:id_post', async (req, res) => {
    try {
        const postId = Number(req.params.id_post);
        const { id_usuario } = req.body || {};
        const requesterUserId = Number(id_usuario);

        if (!postId || Number.isNaN(postId)) {
            return res.status(400).json({ message: 'id_post es obligatorio' });
        }

        if (!requesterUserId || Number.isNaN(requesterUserId)) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const requesterUser = await getUserWithRoleById(requesterUserId);

        if (!requesterUser) {
            return res.status(404).json({ message: 'Usuario solicitante no encontrado' });
        }

        const [posts] = await pool.query(
            `SELECT id_post, id_usuario
             FROM publicaciones
             WHERE id_post = ?
             LIMIT 1`,
            [postId]
        );

        if (posts.length === 0) {
            return res.status(404).json({ message: 'Publicación no encontrada' });
        }

        const post = posts[0];
        const isOwner = Number(post.id_usuario) === Number(requesterUser.id_usuario);
        const isAdmin = hasRole(requesterUser, [5]);
        const isCommunityModerator = hasRole(requesterUser, [3]);

        if (!isOwner && !isAdmin && !isCommunityModerator) {
            return res.status(403).json({ message: 'No tienes permisos para eliminar esta publicación' });
        }

        const [deleteResult] = await pool.query(
            `DELETE FROM publicaciones
             WHERE id_post = ?
             LIMIT 1`,
            [postId]
        );

        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ message: 'Publicación no encontrada' });
        }

        if (!isOwner) {
            try {
                await pool.query(
                    `INSERT INTO moderacion_historial (
                        id_moderador,
                        tipo_accion,
                        tipo_contenido,
                        id_contenido,
                        detalle
                    ) VALUES (?, ?, 'post_personal', ?, ?)`,
                    [
                        requesterUser.id_usuario,
                        'eliminar_post_personal',
                        postId,
                        'Publicación personal eliminada'
                    ]
                );
            } catch (historyError) {
                // El historial no debe impedir el borrado.
            }
        }

        return res.status(200).json({ message: 'Publicación eliminada correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al eliminar publicación' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});
