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
    let twoFactorState = { enabled: false, emailVerified: false };
    let verificationInProgress = false;

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
            saveProfileBtn: document.getElementById('save-profile-btn'),
            
            // 2FA
            twoFactorItem: document.querySelector('[class*="security-item"]:has(h3:contains("Verificación de dos pasos"))'),
            twoFactorSection: document.querySelector('.security-item-list')
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
    // Obtener Estado de 2FA
    // ====================================================================
    const fetch2FAStatus = async () => {
        try {
            const response = await fetch(
                `${API_BASE}/api/2fa-status/${currentUser.id_usuario}`,
                { method: 'GET' }
            );

            if (!response.ok) {
                console.error('Error al obtener estado 2FA');
                return;
            }

            const data = await response.json();
            twoFactorState = {
                enabled: Boolean(data.twoFactorEnabled),
                emailVerified: Boolean(data.emailVerified)
            };

            updateTwoFactorUI();
        } catch (error) {
            console.error('Error al consultar 2FA:', error);
        }
    };

    // ====================================================================
    // Actualizar UI de 2FA
    // ====================================================================
    const updateTwoFactorUI = () => {
        const securityList = document.querySelector('.security-item-list');
        if (!securityList) return;

        // Busca el item de 2FA
        const twoFactorItem = Array.from(securityList.querySelectorAll('.security-item')).find(item => {
            return item.querySelector('h3')?.textContent.includes('Verificación de dos pasos');
        });

        if (!twoFactorItem) return;

        const statusText = twoFactorItem.querySelector('p');
        if (statusText) {
            if (twoFactorState.emailVerified) {
                statusText.textContent = twoFactorState.enabled 
                    ? 'La verificación de dos pasos está activada' 
                    : 'La verificación de dos pasos está desactivada';
            } else {
                statusText.textContent = 'Verifica tu correo primero';
            }
        }

        // Si el email no está verificado, agrega un botón para iniciar verificación
        if (!twoFactorState.emailVerified) {
            const existingBtn = twoFactorItem.querySelector('.verify-email-btn');
            if (!existingBtn) {
                const button = document.createElement('button');
                button.className = 'btn btn-primary verify-email-btn';
                button.textContent = 'Verificar Correo';
                button.style.marginTop = '10px';
                button.addEventListener('click', () => startEmailVerification());
                twoFactorItem.appendChild(button);
            }
        } else if (twoFactorState.emailVerified) {
            // Si el email está verificado, muestra botones de habilitar/deshabilitar
            const existingToggle = twoFactorItem.querySelector('.toggle-2fa-btn');
            if (!existingToggle) {
                const button = document.createElement('button');
                button.className = 'btn toggle-2fa-btn';
                button.className = twoFactorState.enabled ? 'btn btn-danger' : 'btn btn-primary';
                button.textContent = twoFactorState.enabled ? 'Desactivar 2FA' : 'Activar 2FA';
                button.style.marginTop = '10px';
                button.addEventListener('click', () => toggleTwoFactor());
                twoFactorItem.appendChild(button);
            }
        }
    };

    // ====================================================================
    // Verificación de Correo
    // ====================================================================
    const startEmailVerification = async () => {
        const securityList = document.querySelector('.security-item-list');
        if (!securityList) return;

        const twoFactorItem = Array.from(securityList.querySelectorAll('.security-item')).find(item => {
            return item.querySelector('h3')?.textContent.includes('Verificación de dos pasos');
        });

        if (!twoFactorItem) return;

        // Limpia botones anteriores
        const btn = twoFactorItem.querySelector('.verify-email-btn');
        if (btn) btn.remove();

        try {
            // Envía el código de verificación
            const response = await fetch(`${API_BASE}/api/send-verification-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_usuario: currentUser.id_usuario,
                    email: currentUser.email
                })
            });

            if (!response.ok) {
                const error = await response.json();
                alert('Error: ' + error.message);
                updateTwoFactorUI();
                return;
            }

            // Muestra modal para ingresar el código
            showVerificationCodeModal();

        } catch (error) {
            console.error('Error al enviar código:', error);
            alert('Error al enviar el código de verificación');
            updateTwoFactorUI();
        }
    };

    // ====================================================================
    // Modal de Verificación
    // ====================================================================
    const showVerificationCodeModal = () => {
        const modal = document.createElement('div');
        modal.className = 'verification-modal-overlay';
        modal.innerHTML = `
            <div class="verification-modal">
                <h2>Verificar tu correo</h2>
                <p>Hemos enviado un código a <strong>${currentUser.email}</strong></p>
                <p>El código expira en 10 minutos.</p>
                
                <div class="verification-input-group">
                    <label for="verification-code-input">Ingresa el código de 6 dígitos:</label>
                    <input 
                        id="verification-code-input" 
                        type="text" 
                        maxlength="6" 
                        placeholder="000000"
                        inputmode="numeric"
                        pattern="[0-9]{6}"
                    >
                </div>
                
                <div class="verification-actions">
                    <button type="button" class="btn btn-primary verify-btn">Verificar</button>
                    <button type="button" class="btn btn-soft cancel-btn">Cancelar</button>
                </div>
                
                <p class="verification-error-text" style="display: none; color: #d32f2f; margin-top: 10px;"></p>
            </div>
        `;

        document.body.appendChild(modal);

        // Estilos del modal
        const style = document.createElement('style');
        style.textContent = `
            .verification-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            
            .verification-modal {
                background: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            }
            
            .verification-modal h2 {
                margin-top: 0;
                color: #333;
                font-size: 1.5em;
                margin-bottom: 10px;
            }
            
            .verification-modal p {
                color: #666;
                font-size: 0.95em;
                margin: 8px 0;
            }
            
            .verification-input-group {
                margin: 20px 0;
            }
            
            .verification-input-group label {
                display: block;
                margin-bottom: 8px;
                color: #333;
                font-weight: 500;
            }
            
            .verification-input-group input {
                width: 100%;
                padding: 12px;
                font-size: 1.2em;
                letter-spacing: 4px;
                text-align: center;
                border: 2px solid #ddd;
                border-radius: 8px;
                font-family: monospace;
                transition: border-color 0.3s;
            }
            
            .verification-input-group input:focus {
                outline: none;
                border-color: #007bff;
            }
            
            .verification-actions {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }
            
            .verification-actions button {
                flex: 1;
            }
        `;
        document.head.appendChild(style);

        const input = modal.querySelector('#verification-code-input');
        const verifyBtn = modal.querySelector('.verify-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');
        const errorText = modal.querySelector('.verification-error-text');

        verifyBtn.addEventListener('click', async () => {
            const code = input.value.trim();
            if (code.length !== 6 || !/^\d+$/.test(code)) {
                errorText.textContent = 'Ingresa un código válido de 6 dígitos';
                errorText.style.display = 'block';
                return;
            }

            verifyBtn.disabled = true;
            verifyBtn.textContent = 'Verificando...';

            try {
                const response = await fetch(`${API_BASE}/api/verify-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_usuario: currentUser.id_usuario,
                        code: code
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    errorText.textContent = error.message || 'Error al verificar el código';
                    errorText.style.display = 'block';
                    verifyBtn.disabled = false;
                    verifyBtn.textContent = 'Verificar';
                    return;
                }

                // Verificación exitosa
                modal.remove();
                style.remove();
                await fetch2FAStatus();
                alert('¡Correo verificado correctamente! Ahora puedes activar 2FA');

            } catch (error) {
                console.error('Error:', error);
                errorText.textContent = 'Error al procesar la verificación';
                errorText.style.display = 'block';
                verifyBtn.disabled = false;
                verifyBtn.textContent = 'Verificar';
            }
        });

        cancelBtn.addEventListener('click', () => {
            modal.remove();
            style.remove();
        });

        // Focus en el input
        input.focus();
    };

    // ====================================================================
    // Toggle 2FA
    // ====================================================================
    const toggleTwoFactor = async () => {
        try {
            const endpoint = twoFactorState.enabled
                ? '/api/disable-2fa'
                : '/api/enable-2fa';

            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_usuario: currentUser.id_usuario
                })
            });

            if (!response.ok) {
                const error = await response.json();
                alert('Error: ' + error.message);
                return;
            }

            await fetch2FAStatus();
            alert(twoFactorState.enabled 
                ? '2FA desactivado correctamente' 
                : '2FA activado correctamente');

        } catch (error) {
            console.error('Error:', error);
            alert('Error al cambiar configuración de 2FA');
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

        // Carga estado de 2FA
        await fetch2FAStatus();
    });

})();
