const signIn = document.getElementById('sign-in');
const signUp = document.getElementById('sign-up');
const form = document.getElementById('form');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

const LOCAL_API_ORIGIN = 'http://localhost:3000';
const isLocalFrontend =
    window.location.protocol === 'file:' ||
    ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isBackendOrigin = window.location.origin === LOCAL_API_ORIGIN;

const API_BASE = isLocalFrontend && !isBackendOrigin
    ? LOCAL_API_ORIGIN
    : '';

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

        const username = document.getElementById('register-name')?.value?.trim();
        const email = document.getElementById('register-email')?.value?.trim();
        const password = document.getElementById('register-password')?.value;

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

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email')?.value?.trim();
        const password = document.getElementById('password')?.value;

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

            localStorage.setItem('hiddenstageUser', JSON.stringify(data.user));

            alert(`Bienvenido, ${data.user.username}`);
            loginForm.reset();
            window.location.href = 'pagina_principal.html';
        } catch (error) {
            alert('No se pudo conectar con el servidor.');
        }
    });
}
