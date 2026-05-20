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
            'modal.panel_admin': 'Panel administrador'
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
            'modal.panel_admin': 'Admin panel'
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
