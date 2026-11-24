/* Llamadas al servidor.
 * baseUrl  -> API de la empresa:      <empresa>/General/        (apibep, apiconfig)
 * baseUrlT -> CRUD de tablas:         <empresa>/rest/General/
 * portalUrl -> API de la plataforma:  <raiz>/auth, <raiz>/portal (cuenta y administracion de empresas; solo superadmin)
 * Si la sesion vence (401) session.js lleva al portal. */

/** Respuesta JSON de una llamada a la API de la empresa. ruta: 'APIBEP/GetListaBEP?buscar=' */
async function apiBackend(ruta, metodo = 'GET', cuerpo) {
    const r = await fetch(baseUrl + ruta, {
        method: metodo,
        headers: cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
        cache: 'no-store'
    });
    return r.json();
}

/** Llamada a la API de la plataforma. Devuelve { ok, status, d } (d = cuerpo JSON). */
async function apiPlataforma(ruta, metodo = 'GET', cuerpo) {
    const r = await fetch(portalUrl + ruta, {
        method: metodo,
        headers: cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
        cache: 'no-store'
    });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok && d.ok !== false, status: r.status, d };
}
