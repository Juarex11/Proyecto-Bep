/* Interfaz: pantalla de carga, notificaciones, campos de texto y modo solo lectura */

/* Modo oscuro (nativo de Bootstrap 5.3: data-bs-theme). Se recuerda en este navegador; el interruptor esta en el menu del perfil. */
function temaGuardado() { try { return localStorage.getItem('bep_tema'); } catch (e) { return null; } }
function aplicarTema(t, guardar) {
    document.documentElement.setAttribute('data-bs-theme', t === 'dark' ? 'dark' : 'light');
    if (guardar) { try { localStorage.setItem('bep_tema', t === 'dark' ? 'dark' : 'light'); } catch (e) { /* sin almacenamiento */ } }
    const sw = document.getElementById('swTema'); if (sw) sw.checked = (t === 'dark');
    document.querySelectorAll('img[data-logo]').forEach((im) => { im.src = t === 'dark' ? im.dataset.logoOscuro : im.dataset.logo; });   // logo blanco en modo oscuro
}
if (temaGuardado()) aplicarTema(temaGuardado()); else if (tema === "dark") aplicarTema('dark');   // "tema" = cookie antigua

function loading(status) {
    if(status == "init"){
        $("#loading").removeClass("loading-hidden");
    }else{
        setTimeout(function() { $("#loading").addClass("loading-hidden") }, 150);
    }
}

/** Aviso con un Toast de Bootstrap (esquina inferior derecha). tipo: success | danger */
function mostrarToast(texto, tipo) {
    const cont = document.getElementById('notifications');
    if (!cont) return;
    const el = document.createElement('div');
    el.className = 'toast align-items-center border-0 text-bg-' + tipo;
    el.setAttribute('role', tipo === 'danger' ? 'alert' : 'status');
    el.setAttribute('aria-live', tipo === 'danger' ? 'assertive' : 'polite');
    el.setAttribute('aria-atomic', 'true');
    const fila = document.createElement('div'); fila.className = 'd-flex';
    const cuerpo = document.createElement('div'); cuerpo.className = 'toast-body d-flex align-items-start gap-2';
    const ico = document.createElement('i'); ico.className = 'bi mt-1 ' + (tipo === 'danger' ? 'bi-exclamation-octagon' : 'bi-check-circle');
    const msg = document.createElement('span'); msg.textContent = texto;
    cuerpo.append(ico, msg);
    const cerrar = document.createElement('button'); cerrar.type = 'button'; cerrar.className = 'btn-close btn-close-white me-2 m-auto'; cerrar.setAttribute('data-bs-dismiss', 'toast'); cerrar.setAttribute('aria-label', 'Cerrar');
    fila.append(cuerpo, cerrar); el.append(fila); cont.append(el);
    el.addEventListener('hidden.bs.toast', () => el.remove());
    bootstrap.Toast.getOrCreateInstance(el, { delay: tipo === 'danger' ? 6500 : 3500 }).show();
}

function notifySuccess(text){
    mostrarToast(text, "success");
}

function notifyError(error, text = ""){
    if(text === ""){
        text = "Upps! Error en el servidor, tus cambios no serán guardados.";
    }
    mostrarToast(text, "danger");
    if(error != null){
        console.log(error);
    }
}

function ajustarTextarea(event) {
    event.target.style.height = 'auto';
    event.target.style.height = event.target.scrollHeight + 'px';
}

function ajustarTextAuto(camposTextArea){
    camposTextArea.forEach(function(campo) {
        const $textarea = $(`[name="${campo}"]`);
        if ($textarea.length) {
            $textarea.on('input', ajustarTextarea);
            ajustarTextarea({ target: $textarea[0] });
        }
    });
}

function ajustarTextAutoId(campo){
    const $textarea = $(`#${campo}`);
    if ($textarea.length) {
        $textarea.on('input', ajustarTextarea);
        ajustarTextarea({ target: $textarea[0] });
    }
}

function readOnlyBEP(clase) {
    if(!edicionBep){
        $("."+clase+" input").attr("disabled", "disabled");
        $("."+clase+" textarea").attr("disabled", "disabled");
        $("."+clase+" select").attr("disabled", "disabled");
        $("."+clase+" button").attr("disabled", "disabled").hide();

        $("."+clase+" .icon-plus").hide();
        $("."+clase+" .card-agregar").hide(); 
        $("."+clase+" .action").remove();

        $("."+clase+" .ver button").removeAttr("disabled").show();
    }
}


/** Ventana de confirmacion (modal de Bootstrap; reemplaza a confirm() del navegador). Uso: if (!await confirmar('¿Eliminar?')) return;
 *  Devuelve true si el usuario acepta y false si cancela (boton, Esc o clic fuera). */
function confirmar(mensaje, opciones) {
    const o = opciones || {};
    let texto = String(mensaje || '').trim().replace(/\s+\?$/, '?');
    if (/^seguro\b/i.test(texto) && !texto.startsWith('¿')) texto = '¿' + texto;
    const acciones = [[/elimin/i, 'Eliminar', 'Sí, eliminar'], [/desactiv/i, 'Desactivar', 'Sí, desactivar'], [/quitar/i, 'Quitar', 'Sí, quitar'], [/cambiar/i, 'Cambiar', 'Sí, cambiar']];
    const acc0 = acciones.find((x) => x[0].test(texto));
    if (acc0) { o.titulo = o.titulo || acc0[1]; o.aceptar = o.aceptar || acc0[2]; }
    return new Promise((resolve) => {
        const previo = document.activeElement;
        const el = document.createElement('div');
        el.className = 'modal fade'; el.tabIndex = -1; el.style.zIndex = 2300; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true');
        el.innerHTML = '<div class="modal-dialog modal-dialog-centered modal-sm"><div class="modal-content text-center"><div class="modal-body p-4">'
            + '<div class="rounded-circle bg-warning-subtle text-warning-emphasis d-grid mx-auto mb-3" style="width:4.2rem;height:4.2rem;place-items:center;font-size:1.9rem"><i class="bi bi-exclamation-triangle"></i></div>'
            + '<h5 class="modal-title mb-1"></h5><p class="text-body-secondary mb-4"></p>'
            + '<div class="d-flex gap-2"><button type="button" class="btn btn-secondary flex-fill" data-bs-dismiss="modal"></button><button type="button" class="btn btn-orange flex-fill" data-ok></button></div>'
            + '</div></div></div>';
        el.querySelector('.modal-title').textContent = o.titulo || 'Confirmar acción';
        el.querySelector('p').textContent = texto;
        el.querySelector('[data-bs-dismiss]').textContent = o.cancelar || 'Cancelar';
        const si = el.querySelector('[data-ok]'); si.textContent = o.aceptar || 'Aceptar';
        document.body.append(el);
        const modal = new bootstrap.Modal(el, { backdrop: true, keyboard: true });
        let acepto = false;
        si.addEventListener('click', () => { acepto = true; modal.hide(); });
        el.addEventListener('shown.bs.modal', () => si.focus());
        el.addEventListener('hidden.bs.modal', () => {
            modal.dispose(); el.remove();
            if (previo && previo.focus) { try { previo.focus(); } catch (e) { /* sin foco */ } }
            resolve(acepto);
        });
        modal.show();
    });
}

/** Boton flotante de ayuda (abajo a la izquierda). Pendiente de definir: por ahora no abre nada. */
function abrirAyuda() {
    // TODO: contenido de la ayuda (por definir)
}



/* Barra superior: al bajar la pagina se vuelve compacta (clase bep-scrolled en <body>; el estilo esta en bep-bootstrap.css).
   - El contenedor #navbar conserva el alto de la barra grande, asi compactarla no cambia el alto del documento (evita el bucle de crecer/achicar).
   - Histeresis: se compacta pasando 60px y solo vuelve a crecer al regresar a menos de 10px. */
(function () {
    let ticking = false;
    const medir = () => {
        if (document.body.classList.contains('bep-scrolled')) return;
        const cont = document.getElementById('navbar'), nav = cont && cont.querySelector('.bep-navbar');
        if (nav) cont.style.minHeight = nav.offsetHeight + 'px';
    };
    const marcar = () => {
        ticking = false;
        const y = window.scrollY, b = document.body, ya = b.classList.contains('bep-scrolled');
        if (!ya && y > 60) b.classList.add('bep-scrolled');
        else if (ya && y < 10) { b.classList.remove('bep-scrolled'); medir(); }
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(marcar); } }, { passive: true });
    window.addEventListener('resize', medir);
    document.addEventListener('DOMContentLoaded', () => {
        const cont = document.getElementById('navbar');
        if (cont) new MutationObserver(medir).observe(cont, { childList: true, subtree: true });
        medir(); marcar();
    });
})();
