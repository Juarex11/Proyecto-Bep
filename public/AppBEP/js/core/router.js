/* Navegacion: carga cada pantalla de pages/<nombre>/<nombre>.html (y su .js) dentro de la aplicacion.
 * Las secciones del BEP y de Configuracion se identifican con una clave corta (la que usan los menus)
 * y aqui se indica a que pagina corresponde cada una. */

// Estado de la navegacion (BEP, revision y proyecto abiertos)
var ProBepId = 0, RevProId = 0, RevBepIdBase = 0, TipoBepId = 0, edicionBep = false;
// RevBepId (etapa abierta; 0 = el BEP aun no se registro). Al cambiar, se bloquea o habilita el menu del BEP.
var _revBepId = 0;
Object.defineProperty(window, 'RevBepId', { configurable: true, get() { return _revBepId; }, set(v) { _revBepId = v; actualizarBloqueoBep(); } });
var CampanaId = 0, CompaniaId = 0, ClienteId = 0, CampanaNombre = '';

/** pages/<nombre>/<nombre>.html */
const rutaPagina = (nombre) => `pages/${nombre}/${nombre}.html`;

// Secciones del formulario BEP (menu lateral de pages/bep)
const SECCIONES_BEP = {
    descripcion: 'bep-descripcion',
    alcance: 'bep-alcance',
    objetivos_cliente: 'bep-objetivos-cliente',
    objetivos_proyecto: 'bep-objetivos-proyecto',
    objetivos_bim: 'bep-objetivos-bim',
    objetivos_usosBim: 'bep-objetivos-usos-bim',
    matriz_contacto: 'bep-matriz-contacto',
    matriz_raci: 'bep-matriz-raci',
    estrategiaInformacion_hitosConstruccion: 'bep-estrategia-informacion-hitos-construccion',
    estrategiaInformacion_hitosEntrega: 'bep-estrategia-informacion-hitos-entrega',
    estrategiaInformacion_flujoTrabajo: 'bep-estrategia-informacion-flujo-trabajo',
    estrategiaInformacion_entornoComunDatos: 'bep-estrategia-informacion-entorno-comun-datos',
    estrategiaComunicacion_estrategiaReunion: 'bep-estrategia-comunicacion-reunion',
    estrategiaComunicacion_canalComunicacion: 'bep-estrategia-comunicacion-canal'
};

// Secciones de Configuracion (menu lateral de pages/configuracion)
const SECCIONES_CONFIG = {
    proyectos_tipos: 'cfg-proyectos-tipos',
    proyectos_categorias: 'cfg-proyectos-clases',
    proyectos_usosBim: 'cfg-proyectos-usos-bim',
    proyectos_campanas: 'cfg-proyectos-campanas',
    alcance_especialidades: 'cfg-alcance-especialidades',
    alcance_categorias: 'cfg-alcance-categorias',
    alcance_elementos: 'cfg-alcance-elementos',
    alcance_lod: 'cfg-alcance-lod',
    alcance_parametros: 'cfg-alcance-parametros',
    matriz_organizaciones: 'cfg-matriz-organizaciones',
    matriz_roles: 'cfg-matriz-roles',
    matriz_actividades: 'cfg-matriz-actividades',
    matriz_procesos: 'cfg-matriz-procesos',
    matriz_leyRaci: 'cfg-matriz-leyenda-raci',
    administracion_empresas: 'cfg-administracion-empresas',
    administracion_empresa: 'cfg-administracion-mi-empresa',
    administracion_usuarios: 'cfg-administracion-usuarios'
};

// ---------- Direcciones de cada pantalla (se puede recargar o compartir el enlace: /<empresa>/empresas, /<empresa>/bep-12 ...) ----------
const URL_CONFIG = {
    tipos: 'proyectos_tipos', clases: 'proyectos_categorias', 'usos-bim': 'proyectos_usosBim', proyectos: 'proyectos_campanas',
    especialidades: 'alcance_especialidades', categorias: 'alcance_categorias', elementos: 'alcance_elementos', lod: 'alcance_lod', parametros: 'alcance_parametros',
    organizaciones: 'matriz_organizaciones', roles: 'matriz_roles', actividades: 'matriz_actividades', procesos: 'matriz_procesos', 'leyenda-raci': 'matriz_leyRaci',
    empresas: 'administracion_empresas', 'mi-empresa': 'administracion_empresa', usuarios: 'administracion_usuarios'
};
const URL_DE_CONFIG = Object.fromEntries(Object.entries(URL_CONFIG).map(([u, k]) => [k, u]));
const kebab = (k) => k.replace(/([A-Z])/g, '-$1').replace(/_/g, '-').toLowerCase();
const URL_DE_SECCION = Object.fromEntries(Object.keys(SECCIONES_BEP).map((k) => [k, kebab(k)]));
const SECCION_DE_URL = Object.fromEntries(Object.entries(URL_DE_SECCION).map(([k, u]) => [u, k]));

/** Parte de la direccion que identifica la pantalla (despues de /<empresa>/) */
function slugActual() {
    let r = window.location.pathname.slice(basePath.length).replace(/^\/+|\/+$/g, '');
    if (/^AppBEP(\/|$)/i.test(r) || /^index\.html$/i.test(r)) r = '';
    return decodeURIComponent(r);
}
/** Cambia la direccion del navegador sin recargar (Atras/Adelante vuelven a la pantalla anterior) */
function ponerUrl(slug) {
    const destino = basePath + '/' + slug;
    if (window.location.pathname === destino || (slug === '' && window.location.pathname === basePath + '/')) return;
    const actual = slugActual();
    const f = (actual === 'configuracion' || actual === 'crear') && slug !== '' ? 'replaceState' : 'pushState';   // pantallas de paso: no se apilan
    try { history[f]({}, '', destino + (slug === '' ? '' : '')); } catch (e) { /* ignorar */ }
}
/** Direccion de la seccion abierta del BEP: crear | bep-12 | bep-12-alcance | ver-12-matriz-raci */
function urlBep(idMenu) {
    if (!ProBepId || ProBepId == 0) return 'crear';
    const pre = edicionBep ? 'bep-' : 'ver-';
    return pre + ProBepId + (idMenu && idMenu !== 'descripcion' ? '-' + URL_DE_SECCION[idMenu] : '');
}
/** Abre la pantalla que indica la direccion actual (al entrar, recargar o usar Atras/Adelante) */
async function abrirDesdeUrl() {
    const slug = slugActual();
    window._seccionInicialBep = null; window._tabInicialConfig = null;
    if (slug === '' ) { irA('home'); return; }
    if (slug === 'crear') { nuevoBEP(); return; }
    if (slug === 'configuracion' || URL_CONFIG[slug]) {
        const clave = URL_CONFIG[slug];
        const permitido = rolEmpresa === 'admin' && (clave !== 'administracion_empresas' || esSuperadmin);
        if (!permitido) { ponerUrl(''); irA('home'); return; }
        window._tabInicialConfig = clave || null;
        irA('configuracion'); return;
    }
    const m = slug.match(/^(bep|ver)-(\d+)(?:-(.+))?$/);
    if (m) {
        let item = null;
        try {
            const r = await fetch(baseUrl + 'APIBEP/GetListaBEP?buscar=', { cache: 'no-store' });
            item = ((await r.json()).SDTListaBEP || []).find((x) => String(x.id) === m[2]);
        } catch (e) { item = null; }
        if (!item) { ponerUrl(''); irA('home'); return; }
        ProBepId = item.id; RevProId = item.idRevision; RevBepId = item.idEtapa; RevBepIdBase = item.idEtapa; TipoBepId = item.idTipoBep; CampanaNombre = item.proyecto;
        edicionBep = m[1] === 'bep';
        window._seccionInicialBep = m[3] ? (SECCION_DE_URL[m[3]] || null) : null;
        irA('bep'); return;
    }
    ponerUrl(''); irA('home');   // direccion desconocida
}
window.addEventListener('popstate', () => { if (typeof SESION_OK !== 'undefined' && SESION_OK && document.getElementById('navbar') && document.getElementById('navbar').children.length) abrirDesdeUrl(); });

/** Carga el menu superior y abre la pantalla inicial */
function cargarNavbar() {
    fetch(rutaPagina('navbar'))
        .then(response => response.text())
        .then(data => {
            document.getElementById("navbar").innerHTML = data;
            const el = (id) => document.getElementById(id);
            aplicarTema(document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light');   // logo y interruptor segun el tema
            const swTema = el('swTema');   // interruptor del modo oscuro
            if (swTema) { swTema.checked = document.documentElement.getAttribute('data-bs-theme') === 'dark'; swTema.addEventListener('change', () => aplicarTema(swTema.checked ? 'dark' : 'light', true)); }
            iniciarPerfil();   // empresa, usuario, foto y popup de perfil (js/ui/perfil.js)
            if (el('navCambiar')) {   // solo el superadmin cambia de empresa
                if (esSuperadmin) el('navCambiar').href = portalUrl + '?cambiar=1'; else el('navCambiar').remove();
            }
            if (el('navSalir')) {
                el('navSalir').href = portalUrl + 'auth/salir';   // respaldo si falla el script
                el('navSalir').addEventListener('click', function (ev) { ev.preventDefault(); cerrarSesion(); });
            }
            if (rolEmpresa !== 'admin' && el('navConfig')) { el('navConfig').classList.remove('d-flex'); el('navConfig').classList.add('d-none'); }   // la configuracion y los usuarios son del administrador
            abrirDesdeUrl();
        });
}

/** Reemplaza el contenido principal por una pagina. ruta: 'pages/home/home.html' */
function route(ruta) {
    loading("init");
    fetch(ruta)
        .then(response => response.text())
        .then(html => {
            const root = document.getElementById('root');
            root.classList.remove('show');
            $("#root").empty().html(html);
            actualizarBloqueoBep();
            requestAnimationFrame(() => root.classList.add('show'));   // "fade" de Bootstrap
            loading("end");
        });
}

// Todas las paginas usan el diseno nuevo (css/tema-bep2.css): la clase tema-bep2 va siempre en <body>.

/** Abre una pagina por su nombre: irA('home'), irA('bep'), irA('configuracion') */
var navActivo = 'lista';   // opcion del menu superior marcada con la linea naranja: crear | lista | config
function irA(pagina) {
    document.body.dataset.pagina = pagina;
    if (pagina === 'home') navActivo = 'lista';
    else if (pagina === 'configuracion') navActivo = 'config';
    else if (pagina === 'bep' && navActivo !== 'crear') navActivo = 'lista';
    document.body.dataset.nav = navActivo;
    document.body.classList.add('tema-bep2');   // (se conserva por compatibilidad: el aspecto sale de Bootstrap)
    if (pagina === 'home') ponerUrl('');
    route(rutaPagina(pagina));
}

/** Carga una pagina dentro de un contenedor de la pantalla actual */
function routeLink(contenedor, ruta) {
    fetch(ruta)
        .then(response => response.text())
        .then(html => {
            const cont = document.getElementById(contenedor);
            cont.classList.add('fade'); cont.classList.remove('show');
            $("#"+contenedor).empty().html(html);
            requestAnimationFrame(() => cont.classList.add('show'));   // "fade" de Bootstrap
        });
}

function marcarMenu(idMenu) {
    $('.menu-item').removeClass('menu-active');
    $('.menu-subitem').removeClass('menu-active');
    $('#opcion_'+idMenu).addClass('menu-active');
    const sub = document.querySelector('#opcion_' + idMenu) && document.querySelector('#opcion_' + idMenu).closest('.submenu');   // el grupo de esa seccion queda desplegado
    if (sub && sub.classList.contains('collapse') && !sub.classList.contains('show') && window.bootstrap) bootstrap.Collapse.getOrCreateInstance(sub, { toggle: false }).show();
}

/** Bloquea el menu del BEP (todo menos "Descripcion del Proyecto") mientras el BEP no este registrado */
function actualizarBloqueoBep() {
    const sb = document.getElementById('sidebarBep');
    if (!sb) return;
    const bloqueado = !RevBepId || RevBepId == 0;
    sb.classList.toggle('bep-bloqueado', bloqueado);
    sb.querySelectorAll('a.menu-item, a.menu-subitem, .menu-item[data-menu]').forEach((e) => {
        if (e.id === 'opcion_descripcion') return;
        if (bloqueado) { e.setAttribute('aria-disabled', 'true'); if (e.tagName === 'A') e.setAttribute('tabindex', '-1'); }
        else { e.removeAttribute('aria-disabled'); e.removeAttribute('tabindex'); }
    });
}

/** Seccion del formulario BEP (clave de SECCIONES_BEP) */
function routeTab(idMenu){
    if (RevBepId == 0 && idMenu != "descripcion") {
        // respaldo: el menu ya viene bloqueado; el aviso se muestra una sola vez (no se apilan)
        if (!window._avisoBep) {
            window._avisoBep = true; setTimeout(() => { window._avisoBep = false; }, 3000);
            notifyError(null, "Es necesario registrar el BEP antes de continuar con el llenado de los módulos.");
        }
        return;
    }
    if (window._seccionInicialBep) { const ini = window._seccionInicialBep; window._seccionInicialBep = null; if (SECCIONES_BEP[ini] && RevBepId != 0) idMenu = ini; }   // seccion pedida en la direccion
    if (!SECCIONES_BEP[idMenu]) { console.error('Seccion de BEP desconocida:', idMenu); return; }
    marcarMenu(idMenu);
    ponerUrl(urlBep(idMenu));
    routeLink("contentBep", rutaPagina(SECCIONES_BEP[idMenu]));
}

/** Seccion de Configuracion (clave de SECCIONES_CONFIG) */
function routeTabConfig(idMenu){
    if (window._tabInicialConfig) { const ini = window._tabInicialConfig; window._tabInicialConfig = null; if (SECCIONES_CONFIG[ini]) idMenu = ini; }   // seccion pedida en la direccion
    if (!SECCIONES_CONFIG[idMenu]) { console.error('Seccion de configuracion desconocida:', idMenu); return; }
    marcarMenu(idMenu);
    ponerUrl(URL_DE_CONFIG[idMenu]);
    routeLink("contentConfiguracion", rutaPagina(SECCIONES_CONFIG[idMenu]));
}

function nuevoBEP(){
    ProBepId = 0; RevBepId = 0; edicionBep = true;
    navActivo = 'crear';
    irA('bep');
}

/** Arranque de la aplicacion (lo llama main.js) */
function iniciarApp() {
    cargarNavbar();
}


/** Menu lateral (BEP y Configuracion): cada grupo se despliega con la animacion "collapse" de Bootstrap y se cierra el resto */
function iniciarMenuLateral() {
    document.querySelectorAll('.sidebar .menu-item[data-menu]').forEach((item) => {
        const sub = document.getElementById('submenu-' + item.getAttribute('data-menu'));
        if (!sub) return;
        sub.classList.add('collapse');
        const icono = item.querySelector('i.rotate-icon');
        sub.addEventListener('show.bs.collapse', () => icono && icono.classList.add('open'));
        sub.addEventListener('hide.bs.collapse', () => icono && icono.classList.remove('open'));
        item.addEventListener('click', () => {
            document.querySelectorAll('.sidebar .submenu.show').forEach((s) => { if (s !== sub) bootstrap.Collapse.getOrCreateInstance(s, { toggle: false }).hide(); });
            bootstrap.Collapse.getOrCreateInstance(sub, { toggle: false }).toggle();
        });
    });
}
