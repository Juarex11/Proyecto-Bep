/* Identificacion en el menu superior: logo de la empresa, foto del usuario y popup "Mi perfil".
 * Las imagenes las entrega la plataforma (<raiz>/auth/foto y <raiz>/auth/logo/<empresa>); /auth/yo indica si existen
 * y una "version" para que el navegador cargue la nueva al cambiarlas. */

const perfilDatos = { correo: '', foto: 0, logo: 0 };   // foto / logo: 0 = sin imagen, otro numero = version
const URL_FOTO = () => `${portalUrl}auth/foto?v=${perfilDatos.foto}`;
const URL_FOTO_DE = (id, ver) => `${portalUrl}auth/foto/${encodeURIComponent(id)}?v=${ver}`;   // foto de otro usuario (su administrador / el superadmin)
const URL_LOGO_DE = (slug, ver) => `${portalUrl}auth/logo/${encodeURIComponent(slug)}?v=${ver}`;
const URL_LOGO = () => `${portalUrl}auth/logo/${encodeURIComponent(sesionDatos.slug || '')}?v=${perfilDatos.logo}`;

function _nodo(tag, clase, texto) { const n = document.createElement(tag); if (clase) n.className = clase; if (texto != null) n.textContent = texto; return n; }
function _inicialesDe(nombre) { return (nombre || '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || '?'; }
function _rolTexto() { return esSuperadmin ? 'Superadmin' : (rolEmpresa === 'admin' ? 'Administrador' : 'Usuario'); }
function _nombreUsuario() { return (usuarioName || '').trim() || 'Usuario'; }

/** Pone la foto (si hay) o las iniciales dentro de un circulo */
function pintarAvatar(contenedor) {
    contenedor.replaceChildren(); contenedor.classList.toggle('sin-foto', !perfilDatos.foto);
    if (perfilDatos.foto) {
        const im = _nodo('img'); im.alt = ''; im.src = URL_FOTO();
        im.onerror = () => { perfilDatos.foto = 0; pintarAvatar(contenedor); };
        contenedor.append(im);
    } else contenedor.append(_nodo('i', 'bi bi-person-fill'));
}

/** Dibuja el recuadro Empresa | Usuario del menu superior y los datos del popup */
function pintarIdentidad() {
    const cont = document.getElementById('navEmpresa');
    if (!cont) return;
    const nombre = _nombreUsuario();
    // empresa: logo o icono
    const ico = _nodo('span', 'ne-ico');
    if (perfilDatos.logo) {
        const im = _nodo('img'); im.alt = ''; im.src = URL_LOGO(); ico.classList.add('con-logo');
        im.onerror = () => { perfilDatos.logo = 0; pintarIdentidad(); };
        ico.append(im);
    } else ico.append(_nodo('i', 'bi bi-building'));
    const emp = _nodo('span', 'ne-emp'); const t1 = _nodo('span', 'ne-txt');
    t1.append(_nodo('small', null, 'Empresa'), _nodo('b', null, empresaNombre || '-')); emp.append(ico, t1);
    // usuario: boton que abre el popup de perfil
    const ava = _nodo('span', 'ne-ava'); pintarAvatar(ava);
    const usu = _nodo('button', 'ne-user'); usu.type = 'button'; usu.id = 'navUser'; usu.setAttribute('aria-haspopup', 'dialog'); usu.setAttribute('aria-expanded', 'false');
    const t2 = _nodo('span', 'ne-txt'); t2.append(_nodo('small', null, _rolTexto()), _nodo('b', null, nombre));
    usu.append(ava, t2, _nodo('i', 'ne-caret bi bi-chevron-down'));
    usu.addEventListener('click', (ev) => { ev.stopPropagation(); alternarPerfil(); });
    cont.replaceChildren(emp, usu);
    cont.title = 'Empresa: ' + empresaNombre + ' · Usuario: ' + nombre + ' (' + _rolTexto() + ')';
    // popup
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    pintarAvatar(document.getElementById('npAva') || _nodo('span'));
    set('npNombre', nombre); set('npRol', _rolTexto()); set('npCorreo', perfilDatos.correo || '-'); set('npEmpresa', empresaNombre || '-'); set('npRol2', _rolTexto());
    const q = document.getElementById('npQuitar'); if (q) q.hidden = !perfilDatos.foto;
}

function alternarPerfil(abrir) {
    const pop = document.getElementById('navPerfil'); const btn = document.getElementById('navUser');
    if (!pop) return;
    const mostrar = abrir === undefined ? pop.hidden : abrir;
    pop.hidden = !mostrar;
    if (btn) btn.setAttribute('aria-expanded', String(mostrar));
}

/** Reduce la imagen en el navegador (foto: cuadrada 256 px; logo: hasta 480x240 px) y la devuelve como Blob */
function reducirImagen(archivo, modo) {
    return new Promise((resolve, reject) => {
        if (!archivo || !/^image\/(png|jpeg|webp)$/.test(archivo.type)) return reject(new Error('Elija una imagen PNG, JPG o WEBP'));
        if (archivo.size > 10 * 1024 * 1024) return reject(new Error('La imagen es demasiado grande (máximo 10 MB)'));
        const url = URL.createObjectURL(archivo); const im = new Image();
        im.onload = () => {
            URL.revokeObjectURL(url);
            const c = document.createElement('canvas'); const g = c.getContext('2d');
            if (modo === 'foto') {
                const lado = Math.min(im.width, im.height); c.width = c.height = 256;
                g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
                g.drawImage(im, (im.width - lado) / 2, (im.height - lado) / 2, lado, lado, 0, 0, 256, 256);
                c.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', 0.88);
            } else {
                const k = Math.min(1, 480 / im.width, 240 / im.height); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
                g.drawImage(im, 0, 0, c.width, c.height);
                c.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))), 'image/png');
            }
        };
        im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
        im.src = url;
    });
}

async function _enviarImagen(ruta, metodo, blob) {
    let r;
    try { r = await fetch(portalUrl + ruta, { method: metodo, headers: blob ? { 'Content-Type': blob.type } : {}, body: blob || undefined, cache: 'no-store' }); }
    catch (e) { return { ok: false, d: { mensaje: 'No se pudo conectar con el servidor' } }; }
    const d = await r.json().catch(() => ({}));
    // si el servidor no respondio con un mensaje propio, se explica la causa probable
    if (!r.ok && !d.mensaje && !d.error) d.mensaje = r.status === 404 ? 'El servidor no tiene esta función (versión antigua): reinicie el servicio de BEP y ejecute iisreset'
        : r.status === 401 ? 'La sesión venció: vuelva a ingresar' : r.status === 413 ? 'La imagen es demasiado grande (máximo 1 MB)' : `El servidor respondió con error ${r.status}${r.status >= 500 ? ' (revise el registro del servicio)' : ''}`;
    return { ok: r.ok && d.ok !== false, d };
}

async function cambiarFoto(archivo) {
    try {
        loading("init");
        const blob = await reducirImagen(archivo, 'foto');
        const r = await _enviarImagen('auth/foto', 'POST', blob);
        loading("end");
        if (!r.ok) { notifyError(null, r.d.mensaje || r.d.error || 'No se pudo guardar la foto'); return; }
        perfilDatos.foto = r.d.ver || Date.now(); pintarIdentidad(); notifySuccess('Foto actualizada');
    } catch (e) { loading("end"); notifyError(null, e.message || 'No se pudo guardar la foto'); }
}
async function quitarFoto() {
    const r = await _enviarImagen('auth/foto', 'DELETE'); if (!r.ok) { notifyError(null, r.d.mensaje || 'No se pudo quitar la foto'); return; }
    perfilDatos.foto = 0; pintarIdentidad(); notifySuccess('Foto eliminada');
}

/** Logo de la empresa (lo usa Configuracion > Administracion > Mi empresa; solo el administrador) */
async function cambiarLogoEmpresa(archivo) {
    try {
        loading("init");
        const blob = await reducirImagen(archivo, 'logo');
        const r = await _enviarImagen('auth/logo/' + encodeURIComponent(sesionDatos.slug), 'POST', blob);
        loading("end");
        if (!r.ok) { notifyError(null, r.d.mensaje || r.d.error || 'No se pudo guardar el logo'); return false; }
        perfilDatos.logo = r.d.ver || Date.now(); pintarIdentidad(); notifySuccess('Logo actualizado'); return true;
    } catch (e) { loading("end"); notifyError(null, e.message || 'No se pudo guardar el logo'); return false; }
}
async function quitarLogoEmpresa() {
    const r = await _enviarImagen('auth/logo/' + encodeURIComponent(sesionDatos.slug), 'DELETE'); if (!r.ok) { notifyError(null, r.d.mensaje || 'No se pudo quitar el logo'); return false; }
    perfilDatos.logo = 0; pintarIdentidad(); notifySuccess('Logo eliminado'); return true;
}

/** Foto de OTRO usuario (la suya: cambiarFoto). Devuelve la version nueva o null si no se pudo. */
async function cambiarFotoDe(id, archivo) {
    if (String(id) === String(usuarioId)) { await cambiarFoto(archivo); return perfilDatos.foto || null; }
    try {
        loading("init");
        const blob = await reducirImagen(archivo, 'foto');
        const r = await _enviarImagen('auth/foto/' + encodeURIComponent(id), 'POST', blob);
        loading("end");
        if (!r.ok) { notifyError(null, r.d.mensaje || r.d.error || 'No se pudo guardar la foto'); return null; }
        notifySuccess('Foto actualizada'); return r.d.ver || Date.now();
    } catch (e) { loading("end"); notifyError(null, e.message || 'No se pudo guardar la foto'); return null; }
}
async function quitarFotoDe(id) {
    if (String(id) === String(usuarioId)) { await quitarFoto(); return !perfilDatos.foto; }
    const r = await _enviarImagen('auth/foto/' + encodeURIComponent(id), 'DELETE');
    if (!r.ok) { notifyError(null, r.d.mensaje || 'No se pudo quitar la foto'); return false; }
    notifySuccess('Foto eliminada'); return true;
}

/** Logo de cualquier empresa (superadmin). Devuelve la version nueva o null. */
async function cambiarLogoDe(slug, archivo) {
    try {
        loading("init");
        const blob = await reducirImagen(archivo, 'logo');
        const r = await _enviarImagen('auth/logo/' + encodeURIComponent(slug), 'POST', blob);
        loading("end");
        if (!r.ok) { notifyError(null, r.d.mensaje || r.d.error || 'No se pudo guardar el logo'); return null; }
        const ver = r.d.ver || Date.now();
        if (slug === sesionDatos.slug) { perfilDatos.logo = ver; pintarIdentidad(); }
        notifySuccess('Logo actualizado'); return ver;
    } catch (e) { loading("end"); notifyError(null, e.message || 'No se pudo guardar el logo'); return null; }
}
async function quitarLogoDe(slug) {
    const r = await _enviarImagen('auth/logo/' + encodeURIComponent(slug), 'DELETE');
    if (!r.ok) { notifyError(null, r.d.mensaje || 'No se pudo quitar el logo'); return false; }
    if (slug === sesionDatos.slug) { perfilDatos.logo = 0; pintarIdentidad(); }
    notifySuccess('Logo eliminado'); return true;
}

/** Lo llama el router cuando el menu superior ya esta en pantalla */
function iniciarPerfil() {
    pintarIdentidad();
    const foto = document.getElementById('npFoto');
    if (foto) foto.addEventListener('change', () => { const f = foto.files[0]; foto.value = ''; if (f) cambiarFoto(f); });
    const q = document.getElementById('npQuitar'); if (q) q.addEventListener('click', quitarFoto);
    document.addEventListener('click', (ev) => { const pop = document.getElementById('navPerfil'); if (pop && !pop.hidden && !pop.contains(ev.target)) alternarPerfil(false); });
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') alternarPerfil(false); });
    // correo, foto y logo: los entrega la plataforma
    fetch(`${portalUrl}auth/yo?_=${Date.now()}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => {
        if (!d) return;
        perfilDatos.correo = d.usuario.correo || ''; perfilDatos.foto = d.usuario.foto || 0;
        const e = (d.empresas || []).find((x) => x.slug === sesionDatos.slug); perfilDatos.logo = e ? (e.logo || 0) : 0;
        pintarIdentidad();
    }).catch(() => { /* sin imagenes: se ven las iniciales y el icono */ });
}
