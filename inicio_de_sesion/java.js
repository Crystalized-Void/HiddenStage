
(() => {
    const signIn = document.getElementById('sign-in');
    const signUp = document.getElementById('sign-up');
    const form = document.getElementById('form');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const guestAccessButton = document.getElementById('guest-access');
    const themeToggleButton = document.getElementById('theme-toggle');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    const themeToggleLabel = document.getElementById('theme-toggle-label');
    const noticeStack = document.getElementById('notice-stack');
    const registerVerificationStep = document.getElementById('register-verification-step');
    const registerCodeInput = document.getElementById('register-code');
    const registerSubmitButton = document.getElementById('register-submit-btn');
    const loginSubmitButton = loginForm?.querySelector('.primary-button');

    const THEME_KEY = 'hiddenstageTheme';
    const REGISTER_VERIFICATION_KEY = 'hiddenstageRegisterVerification';

    const LOCAL_API_ORIGIN = 'http://localhost:3000';
    const isLocalFrontend =
        window.location.protocol === 'file:' ||
        ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const isBackendOrigin = window.location.origin === LOCAL_API_ORIGIN;

    const API_BASE = isLocalFrontend && !isBackendOrigin
        ? LOCAL_API_ORIGIN
        : '';
    const MAIN_PAGE_URL = '../pagina_principal/pagina_principal.html';
    const VERIFICATION_CODE_LENGTH = 6;

    const applyTheme = (themeName) => {
        const isDarkTheme = themeName === 'dark';

        document.body.dataset.theme = isDarkTheme ? 'dark' : 'light';

        if (themeToggleLabel) {
            themeToggleLabel.textContent = isDarkTheme ? 'Modo claro' : 'Modo oscuro';
        }

        if (themeToggleIcon) {
            themeToggleIcon.textContent = isDarkTheme ? '☀️' : '🌙';
        }
    };

    const readStoredTheme = () => {
        const storedTheme = localStorage.getItem(THEME_KEY);

        if (storedTheme === 'dark' || storedTheme === 'light') {
            return storedTheme;
        }

        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = prefersDark ? 'dark' : 'light';
        localStorage.setItem(THEME_KEY, initialTheme);
        return initialTheme;
    };

    const toggleTheme = () => {
        const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem(THEME_KEY, nextTheme);
        applyTheme(nextTheme);
    };

    const saveSessionUser = (user) => {
        if (!user || typeof user !== 'object') {
            return;
        }

        const { password, ...safeUser } = user;
        localStorage.setItem('hiddenstageUser', JSON.stringify(safeUser));
    };

    const readJSON = (key) => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    };

    const writeJSON = (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    };

    const clearRegisterVerification = () => {
        localStorage.removeItem(REGISTER_VERIFICATION_KEY);
    };

    const saveVerifiedEmail = (email) => {
        writeJSON('hiddenstageEmailVerification', {
            verified: true,
            email: normalizeEmail(email),
            verifiedAt: new Date().toISOString()
        });
    };

    const getRegisterVerificationState = () => readJSON(REGISTER_VERIFICATION_KEY);

    const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
    const normalizeCode = (value) => String(value || '').replace(/\D/g, '').trim();

    const setRegisterVerificationUI = (state) => {
        if (!registerVerificationStep || !registerSubmitButton || !form) {
            return;
        }

        const isCodeStep = state?.step === 'code';
        registerVerificationStep.hidden = !isCodeStep;
        registerSubmitButton.textContent = isCodeStep ? 'Verificar código' : 'Crear cuenta';
        registerSubmitButton.disabled = Boolean(state?.busy);
        form.classList.toggle('register-verification-active', isCodeStep);
    };

    const requestRegisterVerificationCode = async (email) => {
        const response = await fetch(`${API_BASE}/api/email-verification/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || 'No se pudo enviar el código de verificación.');
        }

        return data;
    };

    const confirmRegisterVerificationCode = async (email, code) => {
        const response = await fetch(`${API_BASE}/api/email-verification/confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, code })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || 'No se pudo confirmar el código.');
        }

        return data;
    };

    const buildGuestUser = () => ({
        username: 'Invitado',
        isGuest: true,
        id_rol: 6,
        nombre_rol: 'Visitante'
    });

    const hideNotice = (noticeElement) => {
        if (!noticeElement || noticeElement.dataset.dismissed === 'true') {
            return;
        }

        noticeElement.dataset.dismissed = 'true';
        noticeElement.classList.add('notice--exit');
        window.setTimeout(() => noticeElement.remove(), 220);
    };

    const showNotice = (message, type = 'info', title) => {
        if (!noticeStack || !message) {
            return;
        }

        const notice = document.createElement('article');
        notice.className = `notice notice--${type}`;

        const labels = {
            info: { icon: 'i', title: title || 'Aviso' },
            success: { icon: '✓', title: title || 'Listo' },
            error: { icon: '!', title: title || 'Error' }
        };
        const noticeLabel = labels[type] || labels.info;

        notice.innerHTML = `
            <div class="notice__icon notice__icon--${type}">${noticeLabel.icon}</div>
            <div class="notice__content">
                <strong class="notice__title">${noticeLabel.title}</strong>
                <span class="notice__text">${message}</span>
            </div>
            <button type="button" class="notice__close" aria-label="Cerrar aviso">×</button>
        `;

        notice.querySelector('.notice__close')?.addEventListener('click', () => hideNotice(notice));
        noticeStack.appendChild(notice);

        window.setTimeout(() => hideNotice(notice), type === 'error' ? 4200 : 3200);
    };

    const setButtonLoading = (button, isLoading, loadingLabel) => {
        if (!button) {
            return;
        }

        if (!button.dataset.defaultLabel) {
            button.dataset.defaultLabel = button.textContent || '';
        }

        button.disabled = isLoading;
        button.classList.toggle('is-loading', isLoading);
        button.setAttribute('aria-busy', isLoading ? 'true' : 'false');

        if (isLoading) {
            button.innerHTML = `<span class="button-spinner" aria-hidden="true"></span><span>${loadingLabel || button.dataset.defaultLabel}</span>`;
            return;
        }

        button.textContent = button.dataset.defaultLabel || button.textContent || '';
    };

    applyTheme(readStoredTheme());

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }

    if (signIn && signUp && form) {
        signIn.addEventListener('click', (e) => {
            e.preventDefault();
            form.classList.remove('toggle');
        });

        signUp.addEventListener('click', (e) => {
            e.preventDefault();
            form.classList.add('toggle');
        });
    }

    if (registerForm) {
        const restoreRegisterVerification = () => {
            const state = getRegisterVerificationState();
            if (!state?.email) {
                setRegisterVerificationUI({ step: 'email' });
                return;
            }

            const registerEmailValue = registerForm.querySelector('#register-email')?.value?.trim();
            const shouldShowCodeStep = normalizeEmail(registerEmailValue) === normalizeEmail(state.email);
            setRegisterVerificationUI(shouldShowCodeStep ? { step: 'code' } : { step: 'email' });
        };

        restoreRegisterVerification();

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = registerForm.querySelector('#register-name')?.value?.trim();
            const email = registerForm.querySelector('#register-email')?.value?.trim();
            const password = registerForm.querySelector('#register-password')?.value;
            const code = registerCodeInput?.value?.trim() || '';
            const registerState = getRegisterVerificationState();
            const normalizedEmail = normalizeEmail(email);

            if (!username || !email || !password) {
                showNotice('Completa apodo, email y contraseña.', 'error');
                return;
            }

            if (!registerState?.step || normalizeEmail(registerState.email) !== normalizedEmail) {
                try {
                    setRegisterVerificationUI({ step: 'code', busy: true });
                    await requestRegisterVerificationCode(normalizedEmail);
                    writeJSON(REGISTER_VERIFICATION_KEY, {
                        step: 'code',
                        email: normalizedEmail,
                        requestedAt: new Date().toISOString()
                    });
                    setRegisterVerificationUI({ step: 'code' });
                    if (registerCodeInput) {
                        registerCodeInput.value = '';
                        registerCodeInput.focus();
                    }
                    showNotice('Te enviamos un código a tu correo. Escríbelo para terminar el registro.', 'success', 'Código enviado');
                } catch (error) {
                    clearRegisterVerification();
                    setRegisterVerificationUI({ step: 'email' });
                    showNotice(error.message || 'No se pudo enviar el código de verificación.', 'error');
                }

                return;
            }

            if (!code || normalizeCode(code).length !== VERIFICATION_CODE_LENGTH) {
                showNotice('Ingresa el código de 6 dígitos que llegó a tu correo.', 'error');
                registerCodeInput?.focus();
                return;
            }

            try {
                setRegisterVerificationUI({ step: 'code', busy: true });
                await confirmRegisterVerificationCode(normalizedEmail, normalizeCode(code));

                const response = await fetch(`${API_BASE}/api/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    showNotice(data.message || 'No se pudo registrar el usuario.', 'error');
                    setRegisterVerificationUI({ step: 'code' });
                    return;
                }

                saveVerifiedEmail(normalizedEmail);
                clearRegisterVerification();
                showNotice('Registro exitoso. Ahora puedes iniciar sesión.', 'success', 'Cuenta creada');
                registerForm.reset();
                if (registerCodeInput) {
                    registerCodeInput.value = '';
                }
                setRegisterVerificationUI({ step: 'email' });
                form?.classList.remove('toggle');
            } catch (error) {
                showNotice(error.message || 'No se pudo completar la verificación.', 'error');
                setRegisterVerificationUI({ step: 'code' });
            }
        });
    }

    if (guestAccessButton) {
        guestAccessButton.addEventListener('click', () => {
            localStorage.setItem(THEME_KEY, document.body.dataset.theme === 'dark' ? 'dark' : 'light');
            saveSessionUser(buildGuestUser());
            window.location.href = MAIN_PAGE_URL;
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = loginForm.querySelector('#login-email')?.value?.trim();
            const password = loginForm.querySelector('#login-password')?.value;

            if (!email || !password) {
                showNotice('Ingresa email y contraseña.', 'error');
                return;
            }

            try {
                setButtonLoading(loginSubmitButton, true, 'Ingresando...');
                const response = await fetch(`${API_BASE}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    setButtonLoading(loginSubmitButton, false);
                    showNotice(data.message || 'Credenciales inválidas.', 'error');
                    return;
                }

                saveSessionUser(data.user);
                localStorage.setItem(THEME_KEY, document.body.dataset.theme === 'dark' ? 'dark' : 'light');

                setButtonLoading(loginSubmitButton, false);
                showNotice(`Bienvenido, ${data.user.username}`, 'success', 'Sesión iniciada');
                loginForm.reset();
                window.setTimeout(() => {
                    window.location.href = MAIN_PAGE_URL;
                }, 700);
            } catch (error) {
                setButtonLoading(loginSubmitButton, false);
                showNotice('No se pudo conectar con el servidor.', 'error');
            }
        });
    }
})();

