
(() => {
    /* === Toast & loader helpers === */
    const TOAST_DEFAULT_TITLES = {
        success: 'Listo',
        error: 'Error',
        info: 'Información',
        warning: 'Atención'
    };
    const TOAST_ICONS = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        info: 'fa-circle-info',
        warning: 'fa-triangle-exclamation'
    };

    const ensureToastContainer = () => {
        let c = document.getElementById('hs-toast-container');
        if (!c) {
            c = document.createElement('div');
            c.id = 'hs-toast-container';
            c.className = 'hs-toast-container';
            document.body.appendChild(c);
        }
        return c;
    };

    const showToast = (message, type = 'info', { title, duration = 3800 } = {}) => {
        const container = ensureToastContainer();
        const toast = document.createElement('div');
        toast.className = `hs-toast hs-toast-${type}`;
        const iconClass = TOAST_ICONS[type] || TOAST_ICONS.info;
        const resolvedTitle = title || TOAST_DEFAULT_TITLES[type] || 'Aviso';
        toast.innerHTML = `
            <div class="hs-toast-icon"><i class="fa-solid ${iconClass}"></i></div>
            <div class="hs-toast-body">
                <p class="hs-toast-title"></p>
                <p class="hs-toast-msg"></p>
            </div>
            <button type="button" class="hs-toast-close" aria-label="Cerrar">&times;</button>
        `;
        toast.querySelector('.hs-toast-title').textContent = resolvedTitle;
        toast.querySelector('.hs-toast-msg').textContent = message || '';
        const dismiss = () => {
            if (!toast.isConnected) return;
            toast.classList.add('hs-toast-leaving');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        };
        toast.querySelector('.hs-toast-close').addEventListener('click', dismiss);
        container.appendChild(toast);
        if (duration > 0) setTimeout(dismiss, duration);
        return toast;
    };

    let loaderEl = null;
    let loaderCount = 0;
    const showLoader = (text = 'Cargando…') => {
        loaderCount += 1;
        if (!loaderEl) {
            loaderEl = document.createElement('div');
            loaderEl.className = 'hs-loader-overlay';
            loaderEl.innerHTML = `
                <div class="hs-loader-card">
                    <div class="hs-spinner" aria-hidden="true"></div>
                    <p class="hs-loader-text"></p>
                </div>
            `;
            document.body.appendChild(loaderEl);
        }
        loaderEl.querySelector('.hs-loader-text').textContent = text;
    };
    const hideLoader = () => {
        loaderCount = Math.max(0, loaderCount - 1);
        if (loaderCount > 0 || !loaderEl) return;
        const el = loaderEl;
        loaderEl = null;
        el.classList.add('hs-loader-leaving');
        el.addEventListener('animationend', () => el.remove(), { once: true });
    };

    const signIn = document.getElementById('sign-in');
    const signUp = document.getElementById('sign-up');
    const form = document.getElementById('form');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const guestAccessButton = document.getElementById('guest-access');
    const themeToggleButton = document.getElementById('theme-toggle');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    const themeToggleLabel = document.getElementById('theme-toggle-label');
    const registerVerificationStep = document.getElementById('register-verification-step');
    const registerCodeInput = document.getElementById('register-code');
    const registerSubmitButton = document.getElementById('register-submit-btn');

    const THEME_KEY = 'hiddenstageTheme';
    const REGISTER_VERIFICATION_KEY = 'hiddenstageRegisterVerification';
    const VERIFICATION_CODE_LENGTH = 6;

    const LOCAL_API_ORIGIN = 'http://localhost:3000';
    const isLocalFrontend =
        window.location.protocol === 'file:' ||
        ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const isBackendOrigin = window.location.origin === LOCAL_API_ORIGIN;

    const API_BASE = isLocalFrontend && !isBackendOrigin
        ? LOCAL_API_ORIGIN
        : '';
    const MAIN_PAGE_URL = '../pagina_principal/pagina_principal.html';

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

    const buildGuestUser = () => ({
        username: 'Invitado',
        isGuest: true,
        id_rol: 6,
        nombre_rol: 'Visitante'
    });

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

    const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
    const normalizeCode = (value) => String(value || '').replace(/\D/g, '').trim();
    const getRegisterVerificationState = () => readJSON(REGISTER_VERIFICATION_KEY);
    const clearRegisterVerification = () => localStorage.removeItem(REGISTER_VERIFICATION_KEY);

    const saveVerifiedEmail = (email) => {
        writeJSON('hiddenstageEmailVerification', {
            verified: true,
            email: normalizeEmail(email),
            verifiedAt: new Date().toISOString()
        });
    };

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
            headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || 'No se pudo confirmar el código.');
        }
        return data;
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
                showToast('Completa apodo, email y contraseña.', 'warning');
                return;
            }

            // Paso 1: solicitar código
            if (!registerState?.step || normalizeEmail(registerState.email) !== normalizedEmail) {
                try {
                    setRegisterVerificationUI({ step: 'code', busy: true });
                    showLoader('Enviando código de verificación…');
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
                    showToast('Te enviamos un código a tu correo. Escríbelo para terminar el registro.', 'info', { title: 'Código enviado' });
                } catch (error) {
                    clearRegisterVerification();
                    setRegisterVerificationUI({ step: 'email' });
                    showToast(error.message || 'No se pudo enviar el código de verificación.', 'error');
                } finally {
                    hideLoader();
                }
                return;
            }

            // Paso 2: confirmar código + crear cuenta
            if (!code || normalizeCode(code).length !== VERIFICATION_CODE_LENGTH) {
                showToast('Ingresa el código de 6 dígitos que llegó a tu correo.', 'warning');
                registerCodeInput?.focus();
                return;
            }

            try {
                setRegisterVerificationUI({ step: 'code', busy: true });
                showLoader('Creando tu cuenta…');
                await confirmRegisterVerificationCode(normalizedEmail, normalizeCode(code));

                const response = await fetch(`${API_BASE}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    showToast(data.message || 'No se pudo registrar el usuario.', 'error');
                    setRegisterVerificationUI({ step: 'code' });
                    return;
                }

                saveVerifiedEmail(normalizedEmail);
                clearRegisterVerification();
                showToast('Registro exitoso. Ahora puedes iniciar sesión.', 'success', { title: '¡Bienvenido!' });
                registerForm.reset();
                if (registerCodeInput) registerCodeInput.value = '';
                setRegisterVerificationUI({ step: 'email' });
                form?.classList.remove('toggle');
            } catch (error) {
                showToast(error.message || 'No se pudo completar la verificación.', 'error');
                setRegisterVerificationUI({ step: 'code' });
            } finally {
                hideLoader();
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
                showToast('Ingresa email y contraseña.', 'warning');
                return;
            }

            try {
                showLoader('Iniciando sesión…');
                const response = await fetch(`${API_BASE}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    showToast(data.message || 'Credenciales inválidas.', 'error');
                    return;
                }

                saveSessionUser(data.user);
                localStorage.setItem(THEME_KEY, document.body.dataset.theme === 'dark' ? 'dark' : 'light');

                showToast(`Bienvenido, ${data.user.username}`, 'success', { title: '¡Hola de nuevo!' });
                loginForm.reset();
                setTimeout(() => { window.location.href = MAIN_PAGE_URL; }, 700);
            } catch (error) {
                showToast('No se pudo conectar con el servidor.', 'error');
            } finally {
                hideLoader();
            }
        });
    }
})();

