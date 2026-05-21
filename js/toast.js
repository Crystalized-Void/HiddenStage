/* HiddenStage – Toast & Loader (shared)
 * Provee window.showToast, window.showLoader, window.hideLoader
 * Sobreescribe window.alert para mostrar un toast en lugar del diálogo nativo.
 */
(() => {
    if (window.__HS_TOAST_LOADED__) return;
    window.__HS_TOAST_LOADED__ = true;

    const STYLE_ID = 'hs-toast-styles';
    const CSS = `
.hs-toast-container{position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:12px;pointer-events:none;max-width:calc(100vw - 40px)}
.hs-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:12px;min-width:280px;max-width:380px;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.96);color:#1f1736;box-shadow:0 18px 40px -12px rgba(60,30,130,.35),0 6px 14px rgba(0,0,0,.08);border:1px solid rgba(140,110,220,.25);backdrop-filter:blur(8px);animation:hsToastIn .35s cubic-bezier(.22,1,.36,1) both;position:relative;overflow:hidden;font-family:inherit}
.hs-toast.hs-toast-leaving{animation:hsToastOut .25s ease-in forwards}
@keyframes hsToastIn{from{opacity:0;transform:translateX(40px) scale(.96)}to{opacity:1;transform:translateX(0) scale(1)}}
@keyframes hsToastOut{to{opacity:0;transform:translateX(40px) scale(.96)}}
.hs-toast::before{content:'';position:absolute;inset:0 auto 0 0;width:4px;background:var(--hs-toast-accent,#6c2bd9)}
.hs-toast-icon{flex-shrink:0;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;color:#fff;background:var(--hs-toast-accent,#6c2bd9);font-size:14px;font-weight:700}
.hs-toast-body{flex:1;min-width:0}
.hs-toast-title{font-weight:700;font-size:14px;margin:0 0 2px;color:#1f1736}
.hs-toast-msg{font-size:13px;color:rgba(45,35,80,.78);line-height:1.4;margin:0;word-wrap:break-word}
.hs-toast-close{flex-shrink:0;border:none;background:transparent;color:rgba(45,35,80,.5);font-size:18px;line-height:1;cursor:pointer;padding:2px 4px;border-radius:6px;transition:background .15s,color .15s}
.hs-toast-close:hover{background:rgba(140,110,220,.12);color:#1f1736}
.hs-toast-success{--hs-toast-accent:#2fb86b}
.hs-toast-error{--hs-toast-accent:#e23b5f}
.hs-toast-info{--hs-toast-accent:#2f8fe2}
.hs-toast-warning{--hs-toast-accent:#e2a32f}
body[data-theme="dark"] .hs-toast,html[data-theme="dark"] .hs-toast{background:rgba(30,22,56,.96);color:#f1ecff;border-color:rgba(180,150,255,.3)}
body[data-theme="dark"] .hs-toast-title,html[data-theme="dark"] .hs-toast-title{color:#f1ecff}
body[data-theme="dark"] .hs-toast-msg,html[data-theme="dark"] .hs-toast-msg{color:rgba(232,226,255,.78)}
body[data-theme="dark"] .hs-toast-close,html[data-theme="dark"] .hs-toast-close{color:rgba(232,226,255,.55)}
body[data-theme="dark"] .hs-toast-close:hover,html[data-theme="dark"] .hs-toast-close:hover{background:rgba(255,255,255,.08);color:#fff}
.hs-loader-overlay{position:fixed;inset:0;z-index:99998;display:grid;place-items:center;background:rgba(20,12,40,.55);backdrop-filter:blur(6px);animation:hsFadeIn .2s ease both}
.hs-loader-overlay.hs-loader-leaving{animation:hsFadeOut .2s ease forwards}
@keyframes hsFadeIn{from{opacity:0}to{opacity:1}}
@keyframes hsFadeOut{to{opacity:0}}
.hs-loader-card{background:rgba(255,255,255,.97);color:#1f1736;padding:28px 32px;border-radius:18px;box-shadow:0 24px 60px -18px rgba(60,30,130,.55);display:flex;flex-direction:column;align-items:center;gap:14px;min-width:220px;border:1px solid rgba(140,110,220,.3)}
body[data-theme="dark"] .hs-loader-card,html[data-theme="dark"] .hs-loader-card{background:rgba(30,22,56,.97);color:#f1ecff;border-color:rgba(180,150,255,.3)}
.hs-spinner{width:44px;height:44px;border-radius:50%;border:4px solid rgba(140,110,220,.25);border-top-color:#6c2bd9;animation:hsSpin .9s linear infinite}
body[data-theme="dark"] .hs-spinner,html[data-theme="dark"] .hs-spinner{border-color:rgba(180,150,255,.25);border-top-color:#c4a8ff}
@keyframes hsSpin{to{transform:rotate(360deg)}}
.hs-loader-text{font-size:14px;font-weight:600;letter-spacing:.2px;margin:0;text-align:center}
`;

    const injectStyles = () => {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CSS;
        document.head.appendChild(style);
    };

    const TITLES = { success: 'Listo', error: 'Error', info: 'Información', warning: 'Atención' };
    // Glyphs in plain Unicode so it works even without Font Awesome
    const GLYPHS = { success: '✓', error: '!', info: 'i', warning: '!' };

    const ensureContainer = () => {
        let c = document.getElementById('hs-toast-container');
        if (!c) {
            c = document.createElement('div');
            c.id = 'hs-toast-container';
            c.className = 'hs-toast-container';
            document.body.appendChild(c);
        }
        return c;
    };

    const showToast = (message, type = 'info', opts = {}) => {
        injectStyles();
        const container = ensureContainer();
        const { title, duration = 3800 } = opts;
        const realType = ['success', 'error', 'info', 'warning'].includes(type) ? type : 'info';
        const toast = document.createElement('div');
        toast.className = `hs-toast hs-toast-${realType}`;
        toast.innerHTML = `
            <div class="hs-toast-icon"></div>
            <div class="hs-toast-body">
                <p class="hs-toast-title"></p>
                <p class="hs-toast-msg"></p>
            </div>
            <button type="button" class="hs-toast-close" aria-label="Cerrar">&times;</button>
        `;
        toast.querySelector('.hs-toast-icon').textContent = GLYPHS[realType];
        toast.querySelector('.hs-toast-title').textContent = title || TITLES[realType];
        toast.querySelector('.hs-toast-msg').textContent = message == null ? '' : String(message);
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
        injectStyles();
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

    // Auto-detect type based on message keywords
    const detectType = (msg) => {
        const s = String(msg || '').toLowerCase();
        const positive = /(exitos|correctamente|publicad|enviad[oa]|bienvenid|listo|guardad|actualizad|creado|✓)/;
        const negative = /(error|no se pudo|no tienes|inválid|invalid|fallo|❌|falta|excede|supera|sesión)/;
        const warning  = /(completa|ingresa|debes|elige|requerid|obligatori|atención|aviso|válido)/;
        if (positive.test(s)) return 'success';
        if (negative.test(s)) return 'error';
        if (warning.test(s))  return 'warning';
        return 'info';
    };

    // Override window.alert globally
    const nativeAlert = window.alert.bind(window);
    window.alert = (msg) => {
        try {
            showToast(msg, detectType(msg));
        } catch (e) {
            nativeAlert(msg);
        }
    };

    window.showToast = showToast;
    window.showLoader = showLoader;
    window.hideLoader = hideLoader;
    window.hsToast = { show: showToast, loader: showLoader, hideLoader, _nativeAlert: nativeAlert };
})();
