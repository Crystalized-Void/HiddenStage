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

const createAuthorRequestId = () => {
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `HA-${datePart}-${randomPart}`;
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

app.post('/api/author-request', async (req, res) => {
    try {
        const {
            id_usuario,
            username,
            fullName,
            contactEmail,
            contentType,
            experience,
            motivation,
            referenceLink
        } = req.body || {};

        const normalizedUsername = typeof username === 'string' ? username.trim() : '';
        const normalizedFullName = typeof fullName === 'string' ? fullName.trim() : '';
        const normalizedContactEmail = typeof contactEmail === 'string' ? contactEmail.trim() : '';
        const normalizedContentType = typeof contentType === 'string' ? contentType.trim() : '';
        const normalizedExperience = typeof experience === 'string' ? experience.trim() : '';
        const normalizedMotivation = typeof motivation === 'string' ? motivation.trim() : '';
        const normalizedReferenceLink = typeof referenceLink === 'string' ? referenceLink.trim() : '';

        if (!normalizedFullName || !normalizedContactEmail || !normalizedContentType || !normalizedExperience || !normalizedMotivation) {
            return res.status(400).json({ message: 'Faltan campos obligatorios de la solicitud.' });
        }

        const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedContactEmail);
        if (!validEmail) {
            return res.status(400).json({ message: 'El correo de contacto no es válido.' });
        }

        const mailHost = process.env.MAIL_HOST;
        const mailPort = Number(process.env.MAIL_PORT || 587);
        const mailSecure = String(process.env.MAIL_SECURE || 'false').toLowerCase() === 'true';
        const mailUser = process.env.MAIL_USER;
        const mailPass = process.env.MAIL_PASS;
        const mailFrom = process.env.MAIL_FROM || mailUser;
        const mailTo = process.env.AUTHOR_REQUEST_TO || process.env.MAIL_TO || 'autores@hiddenstage.io';

        if (!mailHost || !mailUser || !mailPass || !mailFrom) {
            return res.status(500).json({ message: 'El servicio de correo no está configurado en el servidor.' });
        }

        const requestId = createAuthorRequestId();
        const requestDate = new Date().toLocaleString('es-MX', {
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

        const mailInfo = await transporter.sendMail({
            from: `HiddenStage Solicitudes <${mailFrom}>`,
            to: mailTo,
            replyTo: normalizedContactEmail,
            subject: `[${requestId}] Solicitud para Autor - ${normalizedFullName}`,
            text: [
                `Nueva solicitud para Autor - ${requestId}`,
                `Fecha: ${requestDate}`,
                `Usuario: ${normalizedUsername || 'No especificado'}`,
                `ID de usuario: ${id_usuario || 'No especificado'}`,
                `Nombre completo: ${normalizedFullName}`,
                `Correo de contacto: ${normalizedContactEmail}`,
                `Tipo de contenido: ${normalizedContentType}`,
                `Enlace de referencia: ${normalizedReferenceLink || 'No especificado'}`,
                '',
                'Experiencia o enfoque:',
                normalizedExperience,
                '',
                'Motivación:',
                normalizedMotivation
            ].join('\n'),
            html: `
                <h2>Nueva solicitud para Autor</h2>
                <p><strong>Folio:</strong> ${escapeHtml(requestId)}</p>
                <p><strong>Fecha:</strong> ${escapeHtml(requestDate)}</p>
                <p><strong>Usuario:</strong> ${escapeHtml(normalizedUsername || 'No especificado')}</p>
                <p><strong>ID de usuario:</strong> ${escapeHtml(id_usuario || 'No especificado')}</p>
                <p><strong>Nombre completo:</strong> ${escapeHtml(normalizedFullName)}</p>
                <p><strong>Correo de contacto:</strong> ${escapeHtml(normalizedContactEmail)}</p>
                <p><strong>Tipo de contenido:</strong> ${escapeHtml(normalizedContentType)}</p>
                <p><strong>Enlace de referencia:</strong> ${escapeHtml(normalizedReferenceLink || 'No especificado')}</p>
                <p><strong>Experiencia o enfoque:</strong></p>
                <p>${escapeHtml(normalizedExperience).replace(/\n/g, '<br>')}</p>
                <p><strong>Motivación:</strong></p>
                <p>${escapeHtml(normalizedMotivation).replace(/\n/g, '<br>')}</p>
            `
        });

        const acceptedRecipients = Array.isArray(mailInfo.accepted) ? mailInfo.accepted : [];
        const rejectedRecipients = Array.isArray(mailInfo.rejected) ? mailInfo.rejected : [];

        if (!acceptedRecipients.length || rejectedRecipients.length > 0) {
            return res.status(502).json({ message: 'El servidor de correo rechazó la solicitud para Autor.' });
        }

        return res.status(201).json({
            message: 'Solicitud enviada correctamente',
            requestId
        });
    } catch (error) {
        console.error('Error al enviar solicitud para Autor:', error);
        return res.status(500).json({ message: 'No se pudo enviar la solicitud para Autor' });
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

// ============================================================
// Endpoints para Verificación de Dos Pasos (2FA) por Email
// ============================================================

// Función auxiliar para generar código aleatorio de 6 dígitos
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// POST /api/send-verification-code - Envía un código al correo del usuario
app.post('/api/send-verification-code', async (req, res) => {
    try {
        const { id_usuario, email } = req.body;

        if (!id_usuario || !email) {
            return res.status(400).json({ message: 'id_usuario y email son obligatorios' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const userId = Number(id_usuario);

        // Verifica que el usuario existe y el email coincide
        const [users] = await pool.query(
            'SELECT id_usuario, username, email FROM usuarios WHERE id_usuario = ? AND email = ? LIMIT 1',
            [userId, normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuario o email no encontrado' });
        }

        const user = users[0];
        const verificationCode = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Válido por 10 minutos

        // Guarda el código en la BD
        await pool.query(
            `UPDATE usuarios 
             SET verification_code = ?, verification_code_expires = ?
             WHERE id_usuario = ? LIMIT 1`,
            [verificationCode, expiresAt, userId]
        );

        // Configura el transportador de correo
        const mailHost = process.env.MAIL_HOST;
        const mailPort = Number(process.env.MAIL_PORT || 587);
        const mailSecure = String(process.env.MAIL_SECURE || 'false').toLowerCase() === 'true';
        const mailUser = process.env.MAIL_USER;
        const mailPass = process.env.MAIL_PASS;
        const mailFrom = process.env.MAIL_FROM || mailUser;

        if (!mailHost || !mailUser || !mailPass) {
            return res.status(500).json({ message: 'El servicio de correo no está configurado' });
        }

        const transporter = nodemailer.createTransport({
            host: mailHost,
            port: mailPort,
            secure: mailSecure,
            auth: {
                user: mailUser,
                pass: mailPass
            }
        });

        // Envía el email con el código
        await transporter.sendMail({
            from: `HiddenStage Soporte <${mailFrom}>`,
            to: normalizedEmail,
            subject: 'Código de verificación de HiddenStage',
            text: `Hola ${user.username},\n\nTu código de verificación es: ${verificationCode}\n\nEste código expira en 10 minutos.\n\nNo compartas este código con nadie.\n\nSaludos,\nEl equipo de HiddenStage`,
            html: `
                <h2>Verificación de correo</h2>
                <p>Hola <strong>${escapeHtml(user.username)}</strong>,</p>
                <p>Tu código de verificación es:</p>
                <h1 style="color: #007bff; font-size: 2em; letter-spacing: 5px; font-family: monospace;">${escapeHtml(verificationCode)}</h1>
                <p>Este código expira en <strong>10 minutos</strong>.</p>
                <p style="color: #666; font-size: 0.9em;">No compartas este código con nadie.</p>
                <hr>
                <p style="color: #999; font-size: 0.85em;">El equipo de HiddenStage</p>
            `
        });

        return res.json({
            message: 'Código de verificación enviado correctamente al correo',
            expiresIn: 600000 // 10 minutos en milisegundos
        });
    } catch (error) {
        console.error('Error al enviar código de verificación:', error);
        return res.status(500).json({ message: 'Error al enviar el código de verificación' });
    }
});

// POST /api/verify-code - Valida el código ingresado por el usuario
app.post('/api/verify-code', async (req, res) => {
    try {
        const { id_usuario, code } = req.body;

        if (!id_usuario || !code) {
            return res.status(400).json({ message: 'id_usuario y code son obligatorios' });
        }

        const userId = Number(id_usuario);
        const inputCode = String(code).trim();

        // Obtiene el usuario y su código
        const [users] = await pool.query(
            `SELECT id_usuario, verification_code, verification_code_expires, email_verified
             FROM usuarios 
             WHERE id_usuario = ? LIMIT 1`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const user = users[0];
        const storedCode = String(user.verification_code || '');
        const expiresAt = user.verification_code_expires;

        if (!storedCode) {
            return res.status(400).json({ message: 'No hay código de verificación pendiente' });
        }

        // Verifica si el código ha expirado
        if (new Date() > new Date(expiresAt)) {
            return res.status(400).json({ message: 'El código de verificación ha expirado' });
        }

        // Verifica si el código es correcto
        if (inputCode !== storedCode) {
            return res.status(401).json({ message: 'Código de verificación incorrecto' });
        }

        // Marca el email como verificado y limpia el código
        await pool.query(
            `UPDATE usuarios 
             SET email_verified = TRUE, verification_code = NULL, verification_code_expires = NULL
             WHERE id_usuario = ? LIMIT 1`,
            [userId]
        );

        return res.json({
            message: 'Correo verificado correctamente',
            emailVerified: true
        });
    } catch (error) {
        console.error('Error al verificar código:', error);
        return res.status(500).json({ message: 'Error al verificar el código' });
    }
});

// GET /api/2fa-status - Obtiene el estado de 2FA del usuario
app.get('/api/2fa-status/:id_usuario', async (req, res) => {
    try {
        const userId = Number(req.params.id_usuario);

        if (!userId) {
            return res.status(400).json({ message: 'id_usuario inválido' });
        }

        const [users] = await pool.query(
            `SELECT id_usuario, two_factor_enabled, email_verified
             FROM usuarios 
             WHERE id_usuario = ? LIMIT 1`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const user = users[0];
        return res.json({
            twoFactorEnabled: Boolean(user.two_factor_enabled),
            emailVerified: Boolean(user.email_verified)
        });
    } catch (error) {
        console.error('Error al obtener estado 2FA:', error);
        return res.status(500).json({ message: 'Error al obtener estado 2FA' });
    }
});

// POST /api/enable-2fa - Habilita la verificación de dos pasos
app.post('/api/enable-2fa', async (req, res) => {
    try {
        const { id_usuario } = req.body;

        if (!id_usuario) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const userId = Number(id_usuario);

        // Verifica que el correo esté verificado
        const [users] = await pool.query(
            `SELECT id_usuario, email_verified
             FROM usuarios 
             WHERE id_usuario = ? LIMIT 1`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if (!users[0].email_verified) {
            return res.status(400).json({ message: 'Debes verificar tu correo primero' });
        }

        // Habilita 2FA
        await pool.query(
            `UPDATE usuarios 
             SET two_factor_enabled = TRUE
             WHERE id_usuario = ? LIMIT 1`,
            [userId]
        );

        return res.json({
            message: 'Verificación de dos pasos habilitada correctamente',
            twoFactorEnabled: true
        });
    } catch (error) {
        console.error('Error al habilitar 2FA:', error);
        return res.status(500).json({ message: 'Error al habilitar 2FA' });
    }
});

// POST /api/disable-2fa - Deshabilita la verificación de dos pasos
app.post('/api/disable-2fa', async (req, res) => {
    try {
        const { id_usuario } = req.body;

        if (!id_usuario) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const userId = Number(id_usuario);

        // Deshabilita 2FA
        await pool.query(
            `UPDATE usuarios 
             SET two_factor_enabled = FALSE
             WHERE id_usuario = ? LIMIT 1`,
            [userId]
        );

        return res.json({
            message: 'Verificación de dos pasos deshabilitada correctamente',
            twoFactorEnabled: false
        });
    } catch (error) {
        console.error('Error al deshabilitar 2FA:', error);
        return res.status(500).json({ message: 'Error al deshabilitar 2FA' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});
