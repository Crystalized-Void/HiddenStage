(function () {
    const KEY = 'hiddenstageLang';

    const translations = {
        es: {
            'nav.inicio': 'Inicio',
            'nav.relevancia': 'Relevancia',
            'nav.nuevo': 'Nuevo',
            'nav.guias': 'Guías',
            'nav.trucos': 'Trucos',
            'nav.foro': 'Foro',
            'nav.generos': 'Géneros',
            'menu.cuenta': 'Cuenta',
            'menu.perfil': 'Perfil',
            'menu.tu_perfil': 'Tu perfil',
            'menu.editar_perfil': 'Editar perfil',
            'menu.configuracion': 'Configuración',
            'menu.tema_oscuro': 'Tema oscuro',
            'menu.tema_claro': 'Tema claro',
            'menu.cambiar_cuenta': 'Cambiar de cuenta',
            'menu.idioma': 'Idioma',
            'menu.sesion': 'Sesión',
            'menu.cerrar_sesion': 'Cerrar sesión',
            'menu.regresar': 'Regresar',
            'modal.crear_publicacion': 'Crear publicación',
            'modal.crear_nota': 'Crear nota',
            'modal.revisar_publicaciones': 'Revisar publicaciones',
            'modal.moderar_comunidad': 'Moderar comunidad',
            'modal.panel_admin': 'Panel administrador',
            'profile.tabs.posts': 'Publicaciones',
            'profile.tabs.collection': 'Colección',
            'profile.tabs.saved': 'Guardados',
            'profile.socials': 'Redes sociales',
            'profile.following': 'Seguidos:',
            'profile.following_more': 'ver más',
            'profile.create_post_text': 'Crear publicación',
            'profile.collection.title': 'Colección de videojuegos',
            'profile.joined': 'Se unió el',
            'config.sidebar.perfil': 'Perfil',
            'config.sidebar.autor': 'Solicitud para Autor',
            'config.sidebar.privacidad_seguridad': 'Privacidad y Seguridad',
            'config.sidebar.legal_terminos': 'Legal y Términos',
            'config.sidebar.centro_asistencia': 'Centro de asistencia',
            'config.panel.title': 'Configuración',
            'config.profile.nombre': 'Nombre',
            'config.profile.nombre_placeholder': 'Tu nombre visible',
            'config.profile.nombre_help': 'Tu nombre puede aparecer en HiddenStage cuando publiques o comentes.',
            'config.profile.biografia': 'Biografía',
            'config.profile.biografia_placeholder': 'Cuéntanos algo sobre ti.',
            'config.profile.biografia_help': 'Cuéntanos algo sobre ti.',
            'config.profile.pronombres': 'Pronombres',
            'config.profile.redes_sociales': 'Redes sociales',
            'config.profile.banner': 'Imagen de banner',
            'config.profile.foto': 'Foto de perfil',
            'config.profile.desactivar_titulo': 'Desactivar cuenta',
            'config.profile.desactivar_desc': 'Si desactivas esta cuenta podrás recuperarla en cualquier momento, pero si la eliminas no.',
            'config.profile.desactivar_cuenta': 'Desactivar cuenta',
            'config.profile.eliminar_cuenta': 'Eliminar cuenta',
            'config.profile.guardar_cambios': 'Guardar cambios',
            'config.author.title': 'Solicitud para ser Autor',
            'config.author.description': 'Completa esta solicitud para habilitar la creación de publicaciones (guías, trucos, noticias, reseñas y más).',
            'config.author.nombre_completo': 'Nombre completo',
            'config.author.correo_contacto': 'Correo de contacto',
            'config.author.tipo_contenido': 'Tipo de contenido que quieres publicar',
            'config.author.select': 'Selecciona una opción',
            'config.author.guias': 'Guías',
            'config.author.trucos': 'Trucos',
            'config.author.noticias': 'Noticias',
            'config.author.resenas': 'Reseñas',
            'config.author.mixto': 'Mixto (varios tipos)',
            'config.author.experiencia': 'Experiencia o enfoque',
            'config.author.por_que': '¿Por qué quieres ser Autor?',
            'config.author.enlace_ref': 'Enlace de referencia (opcional)',
            'config.author.enlace_help': 'Puede ser una red social, portafolio o contenido previo.',
            'config.author.terms': 'Acepto que mi solicitud sea revisada por el equipo de HiddenStage.',
            'config.author.submit': 'Enviar solicitud',
            'config.author.wait_note': 'Importante: después de enviar tu solicitud, espera hasta 2 días hábiles para validar tu acceso como Autor.',
            'config.privacy.title': 'Privacidad de la cuenta',
            'config.privacy.visibility': 'Visibilidad del perfil',
            'config.privacy.visibility_desc': 'Controla si tu perfil se muestra como público o privado.',
            'config.privacy.online': 'Estado de conexión',
            'config.privacy.online_desc': 'Permite mostrar en tu perfil si estás en línea.',
            'config.security.title': 'Seguridad',
            'config.security.2fa_title': 'Verificación de dos pasos (2FA)',
            'config.security.2fa_desc': 'La verificación de dos pasos está desactivada.',
            'config.security.password_title': 'Contraseña',
            'config.security.password_desc': 'Última modificación: 15 ago 2025',
            'config.security.phone_title': 'Teléfono de recuperación',
            'config.security.email_title': 'Correo de recuperación',
            'config.legal.privacy_title': 'Política de privacidad',
            'config.legal.terms_title': 'Términos de servicio y uso',
            'config.legal.community_title': 'Reglas de la comunidad',
            'config.legal.disclaimer_title': 'Descargo de responsabilidad',
            'config.legal.contact_title': 'Modificaciones y contacto',
            'config.help.search_placeholder': '¿En qué podemos ayudarte?',
            'config.help.cuenta': 'Mi cuenta',
            'config.help.publicar': 'Publicar contenido',
            'config.help.contacto': 'Contacto y soporte',
            'config.help.caption': 'Selecciona una categoría para ver una guía rápida.',
            'config.help.account_title': 'Mi cuenta: guía rápida',
            'config.help.publish_title': 'Publicar contenido: recomendaciones',
            'config.help.contact_title': 'Contacto y soporte',
            'support.back_config': 'Volver a configuración',
            'support.title': 'Contacto y soporte',
            'support.subtitle': 'Cuéntanos qué problema tienes y te generamos un folio de seguimiento.',
            'support.open_ticket': 'Abrir ticket',
            'support.user': 'Usuario',
            'support.contact_email': 'Correo de contacto',
            'support.problem_type': 'Tipo de problema',
            'support.priority': 'Prioridad',
            'support.subject': 'Asunto',
            'support.description': 'Descripción del problema',
            'support.attachment': 'Captura del problema (opcional)',
            'support.send_ticket': 'Enviar ticket',
            'support.before_send': 'Antes de enviar',
            'support.direct_email': 'Correo directo',
            'support.select': 'Selecciona',
            'support.access_account': 'Acceso / Cuenta',
            'support.profile_settings': 'Perfil y configuración',
            'support.posts_content': 'Publicaciones y contenido',
            'support.technical_error': 'Error técnico',
            'support.other': 'Otro',
            'support.low': 'Baja',
            'support.medium': 'Media',
            'support.high': 'Alta',
            'support.account_hint': 'Tu usuario en HiddenStage',
            'support.email_hint': 'tu_correo@ejemplo.com',
            'support.subject_hint': 'Ejemplo: No puedo guardar mi perfil',
            'support.description_hint': 'Explícanos qué pasó, en qué pantalla y qué intentaste hacer.',
            'support.tip': 'Tip: entre más detalle compartas, más rápido podemos ayudarte.',
            'support.attachment_hint': 'Puedes subir una imagen PNG, JPG o WEBP de máximo 2MB.',
            'support.before_send_item1': 'Verifica que puedas acceder correctamente a tu cuenta desde hiddenstage.io.',
            'support.before_send_item2': 'Incluye una captura y explica qué hiciste antes del error (por ejemplo: entré a mi perfil, di clic en Guardar y apareció un mensaje).',
            'support.before_send_item3': 'Si olvidaste contraseña, escribe desde tu correo registrado.',
            'support.contact_time': 'Tiempo estimado de respuesta: 24 a 72 horas hábiles.'
        },
        en: {
            'nav.inicio': 'Home',
            'nav.relevancia': 'Top',
            'nav.nuevo': 'New',
            'nav.guias': 'Guides',
            'nav.trucos': 'Tips',
            'nav.foro': 'Forum',
            'nav.generos': 'Genres',
            'menu.cuenta': 'Account',
            'menu.perfil': 'Profile',
            'menu.tu_perfil': 'Your profile',
            'menu.editar_perfil': 'Edit profile',
            'menu.configuracion': 'Settings',
            'menu.tema_oscuro': 'Dark theme',
            'menu.tema_claro': 'Light theme',
            'menu.cambiar_cuenta': 'Switch account',
            'menu.idioma': 'Language',
            'menu.sesion': 'Session',
            'menu.cerrar_sesion': 'Sign out',
            'menu.regresar': 'Back',
            'modal.crear_publicacion': 'Create publication',
            'modal.crear_nota': 'Create note',
            'modal.revisar_publicaciones': 'Review publications',
            'modal.moderar_comunidad': 'Moderate community',
            'modal.panel_admin': 'Admin panel',
            'profile.tabs.posts': 'Posts',
            'profile.tabs.collection': 'Collection',
            'profile.tabs.saved': 'Saved',
            'profile.socials': 'Social links',
            'profile.following': 'Following:',
            'profile.following_more': 'see more',
            'profile.create_post_text': 'Create post',
            'profile.collection.title': 'Game collection',
            'profile.joined': 'Joined',
            'config.sidebar.perfil': 'Profile',
            'config.sidebar.autor': 'Author request',
            'config.sidebar.privacidad_seguridad': 'Privacy and Security',
            'config.sidebar.legal_terminos': 'Legal and Terms',
            'config.sidebar.centro_asistencia': 'Help center',
            'config.panel.title': 'Settings',
            'config.profile.nombre': 'Name',
            'config.profile.nombre_placeholder': 'Your display name',
            'config.profile.nombre_help': 'Your name may appear on HiddenStage when you post or comment.',
            'config.profile.biografia': 'Bio',
            'config.profile.biografia_placeholder': 'Tell us something about yourself.',
            'config.profile.biografia_help': 'Tell us something about yourself.',
            'config.profile.pronombres': 'Pronouns',
            'config.profile.redes_sociales': 'Social links',
            'config.profile.banner': 'Banner image',
            'config.profile.foto': 'Profile picture',
            'config.profile.desactivar_titulo': 'Deactivate account',
            'config.profile.desactivar_desc': 'If you deactivate this account you can recover it at any time, but if you delete it you cannot.',
            'config.profile.desactivar_cuenta': 'Deactivate account',
            'config.profile.eliminar_cuenta': 'Delete account',
            'config.profile.guardar_cambios': 'Save changes',
            'config.author.title': 'Author request',
            'config.author.description': 'Complete this request to enable publishing content (guides, tips, news, reviews, and more).',
            'config.author.nombre_completo': 'Full name',
            'config.author.correo_contacto': 'Contact email',
            'config.author.tipo_contenido': 'Type of content you want to publish',
            'config.author.select': 'Select an option',
            'config.author.guias': 'Guides',
            'config.author.trucos': 'Tips',
            'config.author.noticias': 'News',
            'config.author.resenas': 'Reviews',
            'config.author.mixto': 'Mixed (multiple types)',
            'config.author.experiencia': 'Experience or focus',
            'config.author.por_que': 'Why do you want to be an Author?',
            'config.author.enlace_ref': 'Reference link (optional)',
            'config.author.enlace_help': 'Can be a social network, portfolio, or previous content.',
            'config.author.terms': 'I accept that my request will be reviewed by the HiddenStage team.',
            'config.author.submit': 'Submit request',
            'config.author.wait_note': 'Important: after sending your request, wait up to 2 business days to validate your access as an Author.',
            'config.privacy.title': 'Account privacy',
            'config.privacy.visibility': 'Profile visibility',
            'config.privacy.visibility_desc': 'Control whether your profile is shown as public or private.',
            'config.privacy.online': 'Online status',
            'config.privacy.online_desc': 'Allows your profile to show whether you are online.',
            'config.security.title': 'Security',
            'config.security.2fa_title': 'Two-step verification (2FA)',
            'config.security.2fa_desc': 'Two-step verification is disabled.',
            'config.security.password_title': 'Password',
            'config.security.password_desc': 'Last changed: Aug 15, 2025',
            'config.security.phone_title': 'Recovery phone',
            'config.security.email_title': 'Recovery email',
            'config.legal.privacy_title': 'Privacy policy',
            'config.legal.terms_title': 'Terms of service and use',
            'config.legal.community_title': 'Community rules',
            'config.legal.disclaimer_title': 'Disclaimer',
            'config.legal.contact_title': 'Changes and contact',
            'config.help.search_placeholder': 'How can we help you?',
            'config.help.cuenta': 'My account',
            'config.help.publicar': 'Publish content',
            'config.help.contacto': 'Contact and support',
            'config.help.caption': 'Select a category to see a quick guide.',
            'config.help.account_title': 'My account: quick guide',
            'config.help.publish_title': 'Publishing content: recommendations',
            'config.help.contact_title': 'Contact and support',
            'support.back_config': 'Back to settings',
            'support.title': 'Contact and support',
            'support.subtitle': 'Tell us what problem you have and we will generate a tracking number.',
            'support.open_ticket': 'Open ticket',
            'support.user': 'User',
            'support.contact_email': 'Contact email',
            'support.problem_type': 'Issue type',
            'support.priority': 'Priority',
            'support.subject': 'Subject',
            'support.description': 'Problem description',
            'support.attachment': 'Problem screenshot (optional)',
            'support.send_ticket': 'Send ticket',
            'support.before_send': 'Before you send',
            'support.direct_email': 'Direct email',
            'support.select': 'Select',
            'support.access_account': 'Access / Account',
            'support.profile_settings': 'Profile and settings',
            'support.posts_content': 'Posts and content',
            'support.technical_error': 'Technical error',
            'support.other': 'Other',
            'support.low': 'Low',
            'support.medium': 'Medium',
            'support.high': 'High',
            'support.account_hint': 'Your HiddenStage username',
            'support.email_hint': 'your_email@example.com',
            'support.subject_hint': 'Example: I cannot save my profile',
            'support.description_hint': 'Explain what happened, on which screen and what you tried to do.',
            'support.tip': 'Tip: the more detail you share, the faster we can help.',
            'support.attachment_hint': 'You can upload a PNG, JPG or WEBP image up to 2MB.',
            'support.before_send_item1': 'Check that you can correctly access your account from hiddenstage.io.',
            'support.before_send_item2': 'Include a screenshot and explain what you did before the error (for example: I entered my profile, clicked Save and a message appeared).',
            'support.before_send_item3': 'If you forgot your password, write from your registered email.',
            'support.contact_time': 'Estimated response time: 24 to 72 business hours.'
        }
    };

    const getText = (lang, key, fallback) => {
        const selectedLang = translations[lang] ? lang : 'es';
        return translations[selectedLang][key] || translations.es[key] || fallback || '';
    };

    const setTextPreservingIcons = (element, text) => {
        if (!element) {
            return;
        }

        if (element.querySelector('i')) {
            Array.from(element.childNodes).forEach((node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    node.remove();
                }
            });
            element.appendChild(document.createTextNode(` ${text}`));
            return;
        }

        element.textContent = text;
    };

    const applyThemeLabel = (lang) => {
        document.querySelectorAll('[data-theme-label]').forEach((element) => {
            const isDarkTheme = document.body.dataset.theme === 'dark';
            const key = isDarkTheme ? 'menu.tema_claro' : 'menu.tema_oscuro';
            setTextPreservingIcons(element, getText(lang, key, element.textContent));
        });
    };

    const translatePage = (lang) => {
        const selectedLang = translations[lang] ? lang : 'es';
        document.documentElement.lang = selectedLang;

        document.querySelectorAll('[data-i18n]').forEach((element) => {
            const key = element.getAttribute('data-i18n');
            const text = getText(selectedLang, key, element.textContent);
            setTextPreservingIcons(element, text);
        });

        applyThemeLabel(selectedLang);
    };

    const setLanguage = (lang) => {
        const selectedLang = translations[lang] ? lang : 'es';
        localStorage.setItem(KEY, selectedLang);
        translatePage(selectedLang);
    };

    window.hiddenstageGetTranslation = (key, fallback = '') => {
        const currentLang = translations[localStorage.getItem(KEY)] ? localStorage.getItem(KEY) : 'es';
        return getText(currentLang, key, fallback);
    };

    window.setLanguage = setLanguage;

    document.addEventListener('DOMContentLoaded', () => {
        const selector = document.getElementById('langSelector');
        const storedLang = localStorage.getItem(KEY) || 'es';

        if (selector) {
            selector.value = translations[storedLang] ? storedLang : 'es';
            selector.addEventListener('change', (event) => {
                setLanguage(event.target.value);
            });
        }

        translatePage(storedLang);

        const observer = new MutationObserver(() => {
            applyThemeLabel(localStorage.getItem(KEY) || 'es');
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
    });
})();
