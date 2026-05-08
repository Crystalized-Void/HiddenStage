(() => {
    // ====================================================================
    // Configuración y Variables Globales
    // ====================================================================
    const LOCAL_API_ORIGIN = 'http://localhost:3000';
    const isLocalFrontend =
        window.location.protocol === 'file:' ||
        ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const isBackendOrigin = window.location.origin === LOCAL_API_ORIGIN;

    const API_BASE = isLocalFrontend && !isBackendOrigin
        ? LOCAL_API_ORIGIN
        : '';

    let currentUser = null;

    // ====================================================================
    // Elementos del DOM
    // ====================================================================
    const setupElements = () => {
        return {
            // Elementos generales
            userNameDisplay: document.querySelector('[data-user-name]'),
            
            // Botones del menú
            sectionButtons: document.querySelectorAll('[data-section-btn]'),
            
            // Secciones
            settingsSections: document.querySelectorAll('[data-section]'),
            
            // Perfil
            profileNameInput: document.getElementById('profile-name'),
            profileBioInput: document.getElementById('profile-bio'),
            profilePronounsInput: document.getElementById('profile-pronouns'),
            socialLinks: [
                document.getElementById('social-link-1'),
                document.getElementById('social-link-2'),
                document.getElementById('social-link-3'),
                document.getElementById('social-link-4'),
                document.getElementById('social-link-5')
            ],
            profilePhotoBtns: document.querySelectorAll('.profile-photo .edit-chip'),
            bannerBtns: document.querySelectorAll('.banner-upload .edit-chip'),
            profilePhotoInput: document.getElementById('profile-photo-input'),
            profileBannerInput: document.getElementById('profile-banner-input'),
            profilePhotoPreview: document.getElementById('profile-photo-preview'),
            bannerPreview: document.getElementById('profile-banner-preview'),
            saveProfileBtn: document.getElementById('save-profile-btn')
        };
    };

    // ====================================================================
    // Carga de Datos del Usuario
    // ====================================================================
    const loadUserData = () => {
        const userJson = localStorage.getItem('hiddenstageUser');
        if (!userJson) {
            window.location.href = '../inicio_de_sesion/index.html';
            return null;
        }
        
        currentUser = JSON.parse(userJson);
        return currentUser;
    };

    const displayUserName = () => {
        const els = setupElements();
        if (currentUser && els.userNameDisplay) {
            els.userNameDisplay.textContent = currentUser.username || 'Usuario';
        }
    };

    // ====================================================================
    // Gestión de Secciones del Menú
    // ====================================================================
    const setupMenuNavigation = () => {
        const els = setupElements();
        
        els.sectionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.getAttribute('data-section-btn');
                
                // Remueve active de botones y secciones
                els.sectionButtons.forEach(b => b.classList.remove('active'));
                els.settingsSections.forEach(s => s.classList.remove('active'));
                
                // Agrega active al botón y sección clickeado
                btn.classList.add('active');
                const sectionEl = document.querySelector(`[data-section="${section}"]`);
                if (sectionEl) {
                    sectionEl.classList.add('active');
                }

                // Actualiza el título
                const panelHead = document.querySelector('.panel-head h1');
                if (panelHead) {
                    const titles = {
                        perfil: 'Perfil',
                        autor: 'Solicitud para Autor',
                        privacidad: 'Privacidad y Seguridad',
                        legal: 'Legal y Términos',
                        asistencia: 'Centro de asistencia'
                    };
                    panelHead.textContent = titles[section] || 'Configuración';
                }
            });
        });
    };

    // ====================================================================
    // Carga de Datos del Perfil
    // ====================================================================
    const loadProfileData = () => {
        if (!currentUser) return;

        const els = setupElements();

        if (els.profileNameInput) els.profileNameInput.value = currentUser.username || '';
        if (els.profileBioInput) els.profileBioInput.value = currentUser.biografia || '';
        if (els.profilePronounsInput) els.profilePronounsInput.value = currentUser.pronombres || '';

        currentUser.red_social_1 && els.socialLinks[0] && (els.socialLinks[0].value = currentUser.red_social_1);
        currentUser.red_social_2 && els.socialLinks[1] && (els.socialLinks[1].value = currentUser.red_social_2);
        currentUser.red_social_3 && els.socialLinks[2] && (els.socialLinks[2].value = currentUser.red_social_3);
        currentUser.red_social_4 && els.socialLinks[3] && (els.socialLinks[3].value = currentUser.red_social_4);
        currentUser.red_social_5 && els.socialLinks[4] && (els.socialLinks[4].value = currentUser.red_social_5);

        if (currentUser.foto_perfil && els.profilePhotoPreview) {
            els.profilePhotoPreview.style.backgroundImage = `url('${currentUser.foto_perfil}')`;
        }

        if (currentUser.banner_perfil && els.bannerPreview) {
            els.bannerPreview.style.backgroundImage = `url('${currentUser.banner_perfil}')`;
        }
    };

    // ====================================================================
    // Guardado de Perfil
    // ====================================================================
    const setupProfileSave = () => {
        const els = setupElements();
        if (!els.saveProfileBtn) return;

        els.saveProfileBtn.addEventListener('click', async () => {
            try {
                els.saveProfileBtn.disabled = true;
                els.saveProfileBtn.textContent = 'Guardando...';

                const profileData = {
                    id_usuario: currentUser.id_usuario,
                    username: els.profileNameInput?.value || '',
                    biografia: els.profileBioInput?.value || '',
                    pronombres: els.profilePronounsInput?.value || '',
                    red_social_1: els.socialLinks[0]?.value || '',
                    red_social_2: els.socialLinks[1]?.value || '',
                    red_social_3: els.socialLinks[2]?.value || '',
                    red_social_4: els.socialLinks[3]?.value || '',
                    red_social_5: els.socialLinks[4]?.value || '',
                    foto_perfil: currentUser.foto_perfil || '',
                    banner_perfil: currentUser.banner_perfil || ''
                };

                const response = await fetch(`${API_BASE}/api/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(profileData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Error al guardar perfil');
                }

                const data = await response.json();
                currentUser = data.user;
                localStorage.setItem('hiddenstageUser', JSON.stringify(currentUser));
                
                alert('Perfil guardado correctamente');

            } catch (error) {
                console.error('Error:', error);
                alert('Error: ' + error.message);
            } finally {
                els.saveProfileBtn.disabled = false;
                els.saveProfileBtn.textContent = 'Guardar cambios';
            }
        });
    };

    // ====================================================================
    // Inicialización
    // ====================================================================
    document.addEventListener('DOMContentLoaded', async () => {
        // Carga datos del usuario
        if (!loadUserData()) return;

        displayUserName();
        setupMenuNavigation();
        loadProfileData();
        setupProfileSave();
    });

})();
