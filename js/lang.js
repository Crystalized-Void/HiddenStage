(function(){
    const KEY = 'hiddenstageLang';

    const translations = {
        es: {
            'menu.cuenta': 'Cuenta',
            'menu.tu_perfil': 'Tu perfil',
            'menu.ajustes': 'Ajustes',
            'menu.tema': 'Tema oscuro',
            'menu.cambiar_cuenta': 'Cambiar de cuenta',
            'menu.idioma': 'Idioma',
            'menu.sesion': 'Sesión',
            'menu.cerrar_sesion': 'Cerrar sesión',
            'menu.regresar': 'Regresar',
            'nav.inicio': 'Inicio',
            'nav.relevancia': 'Relevancia',
            'nav.nuevo': 'Nuevo',
            'nav.guias': 'Guías',
            'nav.trucos': 'Trucos',
            'nav.foro': 'Foro',
            'nav.generos': 'Géneros',
            'modal.create_post': 'Crear publicación',
            'modal.create_note': 'Crear nota',
            'create.title': 'Crear Publicación',
                'create.cancel': 'Cancelar',
                'create.publicar': 'Publicar',
                'form.title.label': 'Título de la publicación *',
                'form.heading.label': 'Encabezado o resumen *',
                'form.category.label': 'Categoría *',
                'form.image.label': 'Imagen principal (portada)',
                'form.gallery.label': 'Galería de imágenes (múltiples)',
                'form.links.label': 'Enlaces útiles',
                'form.link.add': 'Agregar enlace',
                'form.content.label': 'Desarrollo textual de la publicación *',
                'placeholder.title': 'Ej: Los mejores juegos de 2026',
                'placeholder.heading': 'Breve descripción que aparecerá en la vista previa',
                'placeholder.link.title': 'Nombre del enlace',
                'placeholder.link.url': 'https://ejemplo.com',
                'placeholder.content': 'Escribe el contenido completo de tu publicación aquí...',
                'upload.click.image': 'Haz clic para subir imagen',
                'upload.click.images': 'Haz clic para subir múltiples imágenes',
                // additional UI
                'section.community': '¿Qué opina la comunidad?',
                'section.community_short': 'Comunidad',
                'comment.write_title': 'Escribe un comentario',
                'comment.placeholder': 'Escribe tu comentario aquí...',
                'comment.post_button': 'Publicar comentario',
                'comment.logged_as': 'Comentando como:',
                // profile page
                'profile.tabs.posts': 'POST',
                'profile.tabs.collection': 'COLECCION',
                'profile.tabs.saved': 'GUARDADOS',
                'profile.socials': 'Redes sociales',
                'profile.following': 'Seguidos:',
                'profile.following.more': 'ver más',
                'profile.create_post_text': 'Crear post en nueva página',
                'profile.collection.title': 'COLECCION DE VIDEOJUEGOS',
                'profile.joined': 'Se unió el'
                ,
                // post actions
                'post.delete': 'Eliminar publicación',
                'post.delete.confirm': '¿Eliminar esta publicación? Esta acción no se puede deshacer.',
                'post.delete.success': 'Publicación eliminada',
                'post.delete.cannot_sql': 'No se puede eliminar una publicación proveniente de la base de datos.',
                // section and genre headings
                'section.populars': 'MAS RELEVANTES',
                'section.new': 'NOVEDADES',
                'section.guides': 'GUIAS',
                'section.tips': 'TRUCOS',
                'genre.carreras': 'CARRERAS',
                'genre.plataformas': 'PLATAFORMAS',
                'genre.romance': 'ROMANCE',
                'genre.porturnos': 'POR TURNOS',
                'genre.accion': 'ACCIÓN',
                'genre.aventuras': 'AVENTURAS'
                ,
                'no.posts.category': 'No hay publicaciones en esta categoría aún.'
        },
        en: {
            'menu.cuenta': 'Account',
            'menu.tu_perfil': 'Your profile',
            'menu.ajustes': 'Settings',
            'menu.tema': 'Dark theme',
            'menu.cambiar_cuenta': 'Switch account',
            'menu.idioma': 'Language',
            'menu.sesion': 'Session',
            'menu.cerrar_sesion': 'Sign out',
            'menu.regresar': 'Back',
            'nav.inicio': 'Home',
            'nav.relevancia': 'Top',
            'nav.nuevo': 'New',
            'nav.guias': 'Guides',
            'nav.trucos': 'Tips',
            'nav.foro': 'Forum',
            'nav.generos': 'Genres',
            'modal.create_post': 'Create post',
            'modal.create_note': 'Create note',
            'create.title': 'Create Post',
            'create.cancel': 'Cancel',
            'create.publicar': 'Publish',
            'form.title.label': 'Post title *',
            'form.heading.label': 'Heading or summary *',
            'form.category.label': 'Category *',
            'form.image.label': 'Main image (cover)',
            'form.gallery.label': 'Image gallery (multiple)',
            'form.links.label': 'Useful links',
            'form.link.add': 'Add link',
            'form.content.label': 'Post content *',
            'placeholder.title': 'Ex: Best games of 2026',
            'placeholder.heading': 'Brief description for preview',
            'placeholder.link.title': 'Link name',
            'placeholder.link.url': 'https://example.com',
            'placeholder.content': 'Write full post content here...',
            'upload.click.image': 'Click to upload image',
            'upload.click.images': 'Click to upload multiple images',
            // additional UI
            'section.community': 'What does the community think?',
            'section.community_short': 'Community',
            'comment.write_title': 'Write a comment',
            'comment.placeholder': 'Write your comment here...',
            'comment.post_button': 'Post comment',
            'comment.logged_as': 'Commenting as:',
            // profile page
            'profile.tabs.posts': 'POSTS',
            'profile.tabs.collection': 'COLLECTION',
            'profile.tabs.saved': 'SAVED',
            'profile.socials': 'Socials',
            'profile.following': 'Following:',
            'profile.following.more': 'see more',
            'profile.create_post_text': 'Create post in new page',
            'profile.collection.title': 'GAME COLLECTION',
            'profile.joined': 'Joined'
            ,
            // post actions
            'post.delete': 'Delete post',
            'post.delete.confirm': 'Delete this post? This cannot be undone.',
            'post.delete.success': 'Post deleted',
            'post.delete.cannot_sql': 'Cannot delete a post originating from the database.',
            // section and genre headings
            'section.populars': 'MOST POPULAR',
            'section.new': 'NEWS',
            'section.guides': 'GUIDES',
            'section.tips': 'TIPS',
            'genre.carreras': 'RACING',
            'genre.plataformas': 'PLATFORMS',
            'genre.romance': 'ROMANCE',
            'genre.porturnos': 'TURN-BASED',
            'genre.accion': 'ACTION',
            'genre.aventuras': 'ADVENTURES'
            ,
            'no.posts.category': 'No posts in this category yet.'
        }
    };

    function translatePage(lang) {
        if (!lang) return;
        try { document.documentElement.lang = lang; } catch(e){}
        // Translate only UI elements outside of post content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            // skip elements inside the post content area
            if (el.closest && (el.closest('#postContent') || el.closest('.post-content-text'))) return;
            const key = el.getAttribute('data-i18n');
            const txt = (translations[lang] && translations[lang][key]) || translations['es'][key] || el.textContent;
            // support translating title and aria-label via data attributes
            if (el.hasAttribute('data-i18n-title')) {
                const tKey = el.getAttribute('data-i18n-title');
                const tTxt = (translations[lang] && translations[lang][tKey]) || translations['es'][tKey] || el.title || '';
                try { el.title = tTxt; } catch(e){}
            }
            if (el.hasAttribute('data-i18n-aria')) {
                const aKey = el.getAttribute('data-i18n-aria');
                const aTxt = (translations[lang] && translations[lang][aKey]) || translations['es'][aKey] || el.getAttribute('aria-label') || '';
                try { el.setAttribute('aria-label', aTxt); } catch(e){}
            }
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.hasAttribute('placeholder')) el.placeholder = txt;
                else el.value = txt;
            } else {
                // preserve icon elements (i) when replacing text
                if (el.querySelector && el.querySelector('i')) {
                    Array.from(el.childNodes).forEach(n => { if (n.nodeType === Node.TEXT_NODE) n.remove(); });
                    el.appendChild(document.createTextNode(' ' + txt));
                } else {
                    el.textContent = txt;
                }
            }
        });

        // nav labels that may be plain links without data-i18n: try common ones
        const navMap = {
            '#postSearchInput': { placeholder: { es: 'Buscar...', en: 'Search...' } }
        };
        const searchEl = document.querySelector('#postSearchInput');
        if (searchEl) searchEl.placeholder = lang === 'en' ? 'Search...' : 'Buscar...';

        // Update theme label inversion if needed
        document.querySelectorAll('[data-theme-label]').forEach(el => {
            if (document.body.dataset.theme === 'dark') {
                el.textContent = lang === 'en' ? 'Light theme' : 'Tema claro';
            } else {
                el.textContent = lang === 'en' ? 'Dark theme' : 'Tema oscuro';
            }
        });

        // Translate elements by exact Spanish text matching translations (useful for navs / static labels)
        try {
            const reverse = {};
            Object.keys(translations.es).forEach(k => {
                const v = (translations.es[k] || '').toString().trim();
                if (v) reverse[v] = k;
            });

            // selectors to consider (restrict to common UI elements)
            const candidates = document.querySelectorAll('a,button,span,h1,h2,h3,h4,label,li,p,div');
            candidates.forEach(el => {
                if (!el || !el.textContent) return;
                // skip elements inside a post/article
                if (el.closest && (el.closest('#postContent') || el.closest('.post-content-text') || el.closest('.post-article'))) return;
                // skip elements that already contain translatable children to avoid duplicated text nodes
                if (el.querySelector && el.querySelector('[data-i18n]')) return;
                const text = el.textContent.trim();
                const key = reverse[text];
                if (key) {
                    const newText = (translations[lang] && translations[lang][key]) || text;
                    if (el.querySelector && el.querySelector('i')) {
                        Array.from(el.childNodes).forEach(n => { if (n.nodeType === Node.TEXT_NODE) n.remove(); });
                        el.appendChild(document.createTextNode(' ' + newText));
                    } else {
                        el.textContent = newText;
                    }
                }
            });
        } catch (e) { /* ignore translation-by-text errors */ }

        // Ensure elements that request title/aria translations are updated (process globally)
        try {
            document.querySelectorAll('[data-i18n-title]').forEach(el => {
                const key = el.getAttribute('data-i18n-title');
                const txt = (translations[lang] && translations[lang][key]) || translations['es'][key] || '';
                try { el.title = txt; } catch (e) {}
            });
            document.querySelectorAll('[data-i18n-aria]').forEach(el => {
                const key = el.getAttribute('data-i18n-aria');
                const txt = (translations[lang] && translations[lang][key]) || translations['es'][key] || '';
                try { el.setAttribute('aria-label', txt); } catch (e) {}
            });
        } catch (e) { /* ignore */ }
    }

    function setLanguage(lang) {
        if (!lang) return;
        localStorage.setItem(KEY, lang);
        translatePage(lang);
    }

    // expose for onclick handlers in HTML
    window.setLanguage = setLanguage;

    document.addEventListener('DOMContentLoaded', () => {
        const stored = localStorage.getItem(KEY) || 'es';
        translatePage(stored);

        // Hook language selector if present (real-time)
        const sel = document.getElementById('langSelector');
        if (sel) {
            sel.value = stored;
            sel.addEventListener('change', (e) => {
                setLanguage(e.target.value);
            });
        }

        // Also translate common nav links if present
        const navMap = {
            'Inicio': { key: 'nav.inicio' },
        };

        // Try to translate top nav anchors by text content if they match Spanish words
        document.querySelectorAll('.nav-bar a, nav a').forEach(a => {
            const text = a.textContent.trim();
            // map a few Spanish words to i18n keys
            const lookup = {
                'Inicio': 'nav.inicio', 'Relevancia': 'nav.relevancia', 'Nuevo': 'nav.nuevo', 'Guías': 'nav.guias', 'Trucos': 'nav.trucos', 'Foro': 'nav.foro', 'Géneros': 'nav.generos', 'Género': 'nav.generos'
            };
            const key = lookup[text];
            if (key) {
                a.childNodes.forEach(node => {}); // noop
                const newText = (translations[stored] && translations[stored][key]) || text;
                // preserve icon HTML if present
                if (a.querySelector('i')) {
                    // remove text nodes and append new text node
                    Array.from(a.childNodes).forEach(n => {
                        if (n.nodeType === Node.TEXT_NODE) n.remove();
                    });
                    a.appendChild(document.createTextNode(' ' + newText));
                } else {
                    a.textContent = newText;
                }
            }
        });
    });
})();
