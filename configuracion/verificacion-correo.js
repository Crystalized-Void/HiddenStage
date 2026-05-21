(() => {
    const LOCAL_API_ORIGIN = 'http://localhost:3000';
    const isLocalFrontend =
        window.location.protocol === 'file:' ||
        ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const isBackendOrigin = window.location.origin === LOCAL_API_ORIGIN;
    const API_BASE = isLocalFrontend && !isBackendOrigin
        ? LOCAL_API_ORIGIN
        : '';

    const STORAGE_KEY = 'hiddenstageEmailVerification';
    const PENDING_KEY = 'hiddenstageEmailVerificationPending';

    const triggerButton = document.querySelector('[data-verification-trigger]');
    const statusText = document.querySelector('[data-verification-status-text]');
    const modal = document.getElementById('email-verification-modal');
    const modalEmailInput = document.getElementById('verification-email-input');
    const modalCodeInput = document.getElementById('verification-code-input');
    const sendEmailButton = document.querySelector('[data-send-verification-email]');
    const submitCodeButton = document.querySelector('[data-submit-verification-code]');
    const backToEmailButton = document.querySelector('[data-back-to-email-step]');
    const feedbackText = document.querySelector('[data-verification-feedback]');
    const emailStep = document.querySelector('[data-verification-step="email"]');
    const codeStep = document.querySelector('[data-verification-step="code"]');
    const closeButtons = document.querySelectorAll('[data-verification-close]');

    if (!triggerButton || !modal || !modalEmailInput || !modalCodeInput || !sendEmailButton || !submitCodeButton || !emailStep || !codeStep) {
        return;
    }

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

    const getStoredUserEmail = () => {
        const storedUserRaw = localStorage.getItem('hiddenstageUser');
        if (!storedUserRaw) {
            return '';
        }

        try {
            const storedUser = JSON.parse(storedUserRaw);
            return normalizeEmail(storedUser?.email || storedUser?.correo || '');
        } catch (error) {
            return '';
        }
    };

    const getVerifiedState = () => readJSON(STORAGE_KEY);
    const getPendingState = () => readJSON(PENDING_KEY);

    const setFeedback = (message, tone = 'neutral') => {
        if (!feedbackText) {
            return;
        }

        feedbackText.textContent = message;
        feedbackText.dataset.tone = tone;
    };

    const setStep = (stepName) => {
        const isEmailStep = stepName === 'email';
        emailStep.hidden = !isEmailStep;
        codeStep.hidden = isEmailStep;
        emailStep.classList.toggle('is-active', isEmailStep);
        codeStep.classList.toggle('is-active', !isEmailStep);
        modal.dataset.step = stepName;
    };

    const closeModal = () => {
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        setFeedback('');
    };

    const openModal = () => {
        const pending = getPendingState();
        const storedEmail = pending?.email || getStoredUserEmail();

        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');

        if (storedEmail && !modalEmailInput.value.trim()) {
            modalEmailInput.value = storedEmail;
        }

        if (pending?.email && pending?.code) {
            setStep('code');
            setFeedback('Ingresa el código que recibiste en tu correo.', 'neutral');
            modalCodeInput.value = '';
            modalCodeInput.focus();
            return;
        }

        setStep('email');
        setFeedback('Te enviaremos un código para confirmar tu correo.', 'neutral');
        modalEmailInput.focus();
    };

    const applyVerifiedUI = (state) => {
        const isVerified = Boolean(state?.verified);
        const verifiedEmail = normalizeEmail(state?.email || '');

        if (isVerified) {
            triggerButton.classList.add('is-verified');
            triggerButton.disabled = true;
            triggerButton.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>Verificado</span>';
            if (statusText) {
                statusText.textContent = verifiedEmail
                    ? `Correo verificado: ${verifiedEmail}`
                    : 'Correo verificado correctamente.';
            }
            return;
        }

        triggerButton.classList.remove('is-verified');
        triggerButton.disabled = false;
        triggerButton.innerHTML = '<i class="fa-regular fa-circle-check" aria-hidden="true"></i><span>Verificar</span>';
        if (statusText) {
            statusText.textContent = 'Aún no verificado.';
        }
    };

    const markVerified = (email) => {
        const nextState = {
            verified: true,
            email: normalizeEmail(email),
            verifiedAt: new Date().toISOString()
        };

        writeJSON(STORAGE_KEY, nextState);
        localStorage.removeItem(PENDING_KEY);
        applyVerifiedUI(nextState);
        closeModal();
    };

    const requestVerificationCode = async (email) => {
        const response = await fetch(`${API_BASE}/api/email-verification/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || 'No se pudo enviar el código.');
        }

        return data;
    };

    const confirmVerificationCode = async (email, code) => {
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

    const loadExistingState = () => {
        const verifiedState = getVerifiedState();
        const pendingState = getPendingState();
        const storedUserEmail = getStoredUserEmail();

        if (verifiedState?.verified) {
            if (!verifiedState.email || verifiedState.email === storedUserEmail) {
                applyVerifiedUI(verifiedState);
                return;
            }
        }

        if (pendingState?.email) {
            modalEmailInput.value = pendingState.email;
            setStep('code');
        }

        applyVerifiedUI(null);
    };

    triggerButton.addEventListener('click', () => {
        if (triggerButton.disabled) {
            return;
        }

        openModal();
    });

    closeButtons.forEach((button) => {
        button.addEventListener('click', closeModal);
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal.hidden) {
            closeModal();
        }
    });

    sendEmailButton.addEventListener('click', () => {
        const email = normalizeEmail(modalEmailInput.value);
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setFeedback('Ingresa un correo válido para continuar.', 'error');
            modalEmailInput.focus();
            return;
        }

        const previousLabel = sendEmailButton.innerHTML;
        sendEmailButton.disabled = true;
        sendEmailButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Enviando...</span>';

        requestVerificationCode(email)
            .then((data) => {
                writeJSON(PENDING_KEY, {
                    email,
                    requestedAt: new Date().toISOString(),
                    expiresInMinutes: data.expiresInMinutes || null
                });

                setStep('code');
                modalCodeInput.value = '';
                setFeedback('Revisa tu correo y escribe el código que recibiste.', 'neutral');
                modalCodeInput.focus();
            })
            .catch((error) => {
                setFeedback(error.message || 'No se pudo enviar el código.', 'error');
            })
            .finally(() => {
                sendEmailButton.disabled = false;
                sendEmailButton.innerHTML = previousLabel;
            });
    });

    submitCodeButton.addEventListener('click', async () => {
        const pending = getPendingState();
        const enteredCode = normalizeCode(modalCodeInput.value);

        if (!pending?.email) {
            setFeedback('Primero solicita un código con tu correo.', 'error');
            setStep('email');
            modalEmailInput.focus();
            return;
        }

        if (!enteredCode || enteredCode.length !== 6) {
            setFeedback('Ingresa un código de 6 dígitos.', 'error');
            modalCodeInput.focus();
            return;
        }

        const previousLabel = submitCodeButton.innerHTML;
        submitCodeButton.disabled = true;
        submitCodeButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Verificando...</span>';

        try {
            const result = await confirmVerificationCode(pending.email, enteredCode);
            localStorage.removeItem(PENDING_KEY);
            markVerified(result.email || pending.email);
        } catch (error) {
            setFeedback(error.message || 'El código no coincide. Intenta nuevamente.', 'error');
            modalCodeInput.focus();
        } finally {
            submitCodeButton.disabled = false;
            submitCodeButton.innerHTML = previousLabel;
        }
    });

    backToEmailButton.addEventListener('click', () => {
        const pending = getPendingState();
        if (pending?.email) {
            modalEmailInput.value = pending.email;
        }

        setStep('email');
        setFeedback('Puedes actualizar el correo antes de solicitar un nuevo código.', 'neutral');
        modalEmailInput.focus();
    });

    loadExistingState();
})();
