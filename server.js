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

app.get('/api/posts/:id_usuario', async (req, res) => {
    try {
        const userId = Number(req.params.id_usuario);

        if (!userId) {
            return res.status(400).json({ message: 'id_usuario inválido' });
        }

        const [posts] = await pool.query(
            `SELECT id_post, id_usuario, titulo, contenido, portada_url, youtube_url, resumen_media_json, created_at
             FROM publicaciones
             WHERE id_usuario = ?
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
                    u.username, u.foto_perfil
             FROM publicaciones_principales p
             INNER JOIN usuarios u ON p.id_autor = u.id_usuario
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

app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});
