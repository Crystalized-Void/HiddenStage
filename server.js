const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const PROJECT_ROOT = __dirname;

app.use('/img', express.static(path.join(PROJECT_ROOT, 'img')));;

app.use(cors());
app.use(express.json());
app.use(express.static(PROJECT_ROOT));

app.get('/', (req, res) => {
    res.redirect('/inicio_de_sesion/index.html');
});

const MAX_PROFILE_PHOTO_BYTES = 1024 * 1024;

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
             VALUES (
                ?,
                ?,
                ?,
                (SELECT id_rol FROM roles WHERE nombre_rol = 'Usuario registrado' LIMIT 1)
             )`,
            [normalizedUsername, normalizedEmail, hashedPassword]
        );

        return res.status(201).json({ message: 'Usuario registrado correctamente' });
    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ message: 'No existe el rol de Usuario registrado en la tabla roles' });
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
            `SELECT id_usuario, username, email, password, biografia, pronombres,
                    red_social_1, red_social_2, red_social_3, red_social_4, red_social_5,
                    foto_perfil, banner_perfil
             FROM usuarios
             WHERE email = ?
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

        return res.json({
            message: 'Inicio de sesión correcto',
            user: {
                id_usuario: user.id_usuario,
                username: user.username,
                email: user.email,
                biografia: user.biografia || '',
                pronombres: user.pronombres || '',
                red_social_1: user.red_social_1 || '',
                red_social_2: user.red_social_2 || '',
                red_social_3: user.red_social_3 || '',
                red_social_4: user.red_social_4 || '',
                red_social_5: user.red_social_5 || '',
                foto_perfil: user.foto_perfil || '',
                banner_perfil: user.banner_perfil || ''
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

        const [updatedUsers] = await pool.query(
            `SELECT id_usuario, username, email, biografia, pronombres,
                    red_social_1, red_social_2, red_social_3, red_social_4, red_social_5,
                    foto_perfil, banner_perfil
             FROM usuarios
             WHERE id_usuario = ?
             LIMIT 1`,
            [Number(id_usuario)]
        );

        return res.json({
            message: 'Perfil actualizado correctamente',
            user: updatedUsers[0]
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

app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});
