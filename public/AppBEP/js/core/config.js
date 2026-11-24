/* Direccion de la aplicacion y de la API.
 * El front lo sirve el mismo backend Node (BackNode), asi que la API esta en el mismo origen.
 * Estructura de direcciones:  <raiz>/                portal (login y eleccion de empresa)
 *                             <raiz>/<empresa>/      esta aplicacion
 *                             <raiz>/<empresa>/General/ y /rest/General/   API de la empresa
 */

// Direccion de la empresa actual, tambien si esta publicada bajo un sitio (ej. http://localhost/BEP/principal -> /BEP/principal)
// Se toma de donde se cargo este script (js/core/config.js) y no de la direccion de la pagina: asi cada pantalla puede tener su propia
// direccion (ej. /BEP/principal/empresas) y al recargar sigue funcionando.
const basePath = (function () {
    const s = document.currentScript && document.currentScript.src;
    if (s) return new URL(s).pathname.replace(/\/(AppBEP\/)?js\/core\/config\.js$/i, '');
    return window.location.pathname.replace(/\/(AppBEP\/)?(index\.html)?$/i, '');
})();
let url = window.location.origin + basePath;

const baseUrl = url + "/General/";          // APIBEP / APIConfigBEP
const baseUrlT = url + "/rest/General/";    // CRUD de tablas

// Portal de la plataforma: elegir empresa, cerrar sesion, administrar empresas
const portalUrl = window.location.origin + basePath.replace(/\/[^\/]*$/, '') + '/';
