/* Sesion de la empresa actual.
 * El servidor entrega la sesion en la cookie `bep_token` (solo valida para /<empresa>/); aqui se lee para conocer
 * al usuario, su rol y la empresa. Si no hay sesion valida se vuelve al portal.
 * El servidor revisa el rol y el acceso en cada peticion: estos datos solo sirven para dibujar la pantalla. */

function getCookieValue(cookieName) {
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
        const [name, value] = cookie.split('=');
        if (name === cookieName) {
            return decodeURIComponent(value);
        }
    }
    return null;
}

function decodificarJWT(token) {
    const [header, payload, signature] = token.split('.');
    if(payload){
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = JSON.parse(atob(base64));
        return jsonPayload;
    }
    return null;
}

/** Datos de la sesion o null (y redirige al portal) si no hay una sesion valida de ESTA empresa */
function leerSesion() {
    const cookie = getCookieValue('bep_token');
    let datos = null;
    try { datos = cookie === null ? null : decodificarJWT(cookie); } catch (e) { datos = null; }
    const vencida = datos && datos.exp && datos.exp * 1000 < Date.now();
    const otraEmpresa = datos && datos.slug && datos.slug !== basePath.split('/').pop();
    if (datos === null || vencida || otraEmpresa) {
        window.location.href = url + "/login.html";   // el servidor lo lleva al portal
        return null;
    }
    return datos;
}

const dataToken = leerSesion();
const SESION_OK = dataToken !== null;
const sesionDatos = dataToken || {};

const empresaId = sesionDatos.VCompaniaId;
const rolEmpresa = sesionDatos.rol || 'usuario';          // 'admin' (administrador de la empresa) | 'usuario'
const esSuperadmin = !!sesionDatos.sup;
const empresaNombre = sesionDatos.Compania || '';
const usuarioId = sesionDatos.vidusuario;
const personalId = sesionDatos.vPersonalId;
const usuarioName = (sesionDatos.vnombres || '') + " " + (sesionDatos.vapellidos || '');
const usoBep = getCookieValue('bep_uso'); //"soloBEP": no se muestran proyectos para BEP
const tema = getCookieValue('theme');

// Si la sesion de esta empresa vence (401), vuelve al portal, que lo regresa aqui tras iniciar sesion
(function () {
    const nativo = window.fetch.bind(window);
    window.fetch = async function (...args) {
        const r = await nativo(...args);
        if (r.status === 401 && SESION_OK) {
            try {
                const ult = Number(sessionStorage.getItem('bep401') || 0);
                if (Date.now() - ult > 15000) { sessionStorage.setItem('bep401', String(Date.now())); window.location.href = portalUrl + '?empresa=' + encodeURIComponent(sesionDatos.slug || ''); }
            } catch (e) { /* sin sessionStorage: no se redirige */ }
        }
        return r;
    };
})();

// Si se vuelve a esta pagina con el boton "atras" despues de cerrar sesion, no se muestra el sistema
window.addEventListener('pageshow', function (e) {
    if (e.persisted && getCookieValue('bep_token') === null) window.location.reload();
});

/** Cierra la sesion (anula la sesion en el servidor y borra las cookies) y vuelve al portal */
async function cerrarSesion() {
    try { await fetch(portalUrl + 'auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); } catch (e) { /* se intenta salir igual */ }
    window.location.replace(portalUrl);
}
