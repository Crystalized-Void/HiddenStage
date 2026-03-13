
(() => {
    const signIn = document.getElementById('sign-in');
    const signUp = document.getElementById('sign-up');
    const form = document.getElementById('form');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const guestAccessButton = document.getElementById('guest-access');

    const LOCAL_API_ORIGIN = 'http://localhost:3000';
    const isLocalFrontend =
        window.location.protocol === 'file:' ||
        ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const isBackendOrigin = window.location.origin === LOCAL_API_ORIGIN;

    const API_BASE = isLocalFrontend && !isBackendOrigin
        ? LOCAL_API_ORIGIN
        : '';
    const MAIN_PAGE_URL = '../pagina_principal/pagina_principal.html';

    const saveSessionUser = (user) => {
        localStorage.setItem('hiddenstageUser', JSON.stringify(user));
    };

    const buildGuestUser = () => ({
        id_usuario: null,
        username: 'Invitado',
        email: '',
        biografia: 'Explorando HiddenStage como visitante.',
        pronombres: '',
        red_social_1: '',
        red_social_2: '',
        red_social_3: '',
        red_social_4: '',
        red_social_5: '',
        foto_perfil: '',
        banner_perfil: '',
        isGuest: true
    });

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
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = registerForm.querySelector('#register-name')?.value?.trim();
            const email = registerForm.querySelector('#register-email')?.value?.trim();
            const password = registerForm.querySelector('#register-password')?.value;

            if (!username || !email || !password) {
                alert('Completa nombre de usuario, email y contraseña.');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/api/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    alert(data.message || 'No se pudo registrar el usuario.');
                    return;
                }

                alert('Registro exitoso. Ahora puedes iniciar sesión.');
                registerForm.reset();
                form?.classList.remove('toggle');
            } catch (error) {
                alert('No se pudo conectar con el servidor.');
            }
        });
    }

    if (guestAccessButton) {
        guestAccessButton.addEventListener('click', () => {
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
                alert('Ingresa email y contraseña.');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    alert(data.message || 'Credenciales inválidas.');
                    return;
                }

                saveSessionUser(data.user);

                alert(`Bienvenido, ${data.user.username}`);
                loginForm.reset();
                window.location.href = MAIN_PAGE_URL;
            } catch (error) {
                alert('No se pudo conectar con el servidor.');
            }
        });
    }
})();

