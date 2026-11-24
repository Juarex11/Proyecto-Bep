// Administracion de empresas: solo el superadmin. Usa la API de la plataforma (<raiz>/portal/empresas), que comparte sesion con el sistema.
function empresas() {
    const vacio = () => ({id: '', nombre: '', slug: '', adminCorreo: '', adminNombre: '', adminApellido: '', adminPassword: ''});
    const slugify = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
    const api = apiPlataforma;   // core/api.js
    return {
        data: [], showNew: false, slugManual: false, campos: vacio(), adm: {id: ''}, usr: {id: '', lista: []},
        actualId: sesionDatos.emp, base: portalUrl.replace(/\/$/, ''),
        automatico() {
            if (!esSuperadmin) { notifyError(null, "Solo el superadministrador puede ver esta sección."); return; }
            this.lista();
        },
        async lista() {
            loading("init");
            const r = await api('portal/empresas').catch(() => ({ok: false, d: {}}));
            loading("end");
            if (!r.ok) { notifyError(null, r.d.mensaje || "Error al cargar la lista de Empresas !"); return; }
            this.data = r.d.empresas;
        },
        logoUrl(e) { return URL_LOGO_DE(e.slug, e.logo); },
        /** Columnas y acciones de la tabla (DataTables, ver js/ui/tablas.js) */
        cols() {
            return [
                {t: 'Logo', orden: false, ancho: '64px', prioridad: 400, render: (e) => '<span class="logo-mini">' + (e.logo ? '<img src="' + bepEsc(this.logoUrl(e)) + '" alt="" onerror="this.style.display=\'none\'">' : '<i class="bi bi-building"></i>') + '</span>'},
                {t: 'Empresa', cls: 'fw-semibold', render: (e) => bepEsc(e.nombre) + (e.id == this.actualId ? ' <span class="badge text-bg-secondary">Esta empresa</span>' : '')},
                {t: 'Dirección', texto: (e) => '/' + e.slug},
                {t: 'Usuarios', c: 'usuarios', prioridad: 300},
                {t: 'Administradores', texto: (e) => (e.admins || []).join(', ') || '—', prioridad: 301},
                {t: 'Estado', render: (e) => e.activa ? '<span class="badge rounded-pill bg-success-subtle text-success-emphasis">Activa</span>' : '<span class="badge rounded-pill bg-secondary-subtle text-secondary-emphasis">Desactivada</span>'}
            ];
        },
        acciones() {
            return {
                entrar: {fn: (e) => (e.activa && e.id != this.actualId) && this.entrar(e), icono: 'box-arrow-in-right', titulo: 'Entrar a esta empresa', cls: 'btn-orange'},
                editar: (e) => this.editar(e),
                admin: {fn: (e) => this.nuevoAdmin(e), icono: 'person-plus', titulo: 'Agregar administrador', cls: 'btn-orange'}
            };
        },
        empActual() { return this.data.find((x) => x.id == this.campos.id) || null; },   // empresa abierta en el formulario de edicion
        async subirLogo(e, ev) {
            const f = ev.target.files[0]; ev.target.value = '';
            if (!f || !e) return;
            const ver = await cambiarLogoDe(e.slug, f);
            if (ver) e.logo = ver;
        },
        async quitarLogo(e) {
            if (await confirmar('¿Quitar el logo de "' + e.nombre + '"?') && await quitarLogoDe(e.slug)) e.logo = 0;
        },
        autoSlug() { if (!this.slugManual && this.campos.id == '') this.campos.slug = slugify(this.campos.nombre); },
        async guardar() {
            loading("init");
            const c = this.campos;
            const r = c.id == ''
                ? await api('portal/empresas', 'POST', {nombre: c.nombre, slug: c.slug, adminCorreo: c.adminCorreo, adminNombre: c.adminNombre, adminApellido: c.adminApellido, adminPassword: c.adminPassword})
                : await api('portal/empresas/' + c.id, 'PUT', {nombre: c.nombre, slug: c.slug});
            loading("end");
            if (!r.ok) { notifyError(null, r.d.mensaje || "No se pudo guardar"); return; }
            notifySuccess(r.d.mensaje || "Empresa guardada correctamente !");
            const eraActual = c.id == sesionDatos.emp && c.slug != sesionDatos.slug;
            this.cancelar(); this.lista();
            if (eraActual) setTimeout(() => { window.location.href = portalUrl; }, 1200);   // cambio la direccion de la empresa actual: hay que volver a entrar
        },
        cancelar() { this.showNew = false; this.slugManual = false; this.campos = vacio(); },
        editar(e) { this.adm = {id: ''}; this.showNew = true; this.slugManual = true; this.campos = {...vacio(), id: e.id, nombre: e.nombre, slug: e.slug}; },
        nuevoAdmin(e) { this.cancelar(); this.adm = {id: e.id, nombre: e.nombre, correo: '', password: '', nombreP: '', apellido: ''}; },
        async guardarAdmin() {
            loading("init");
            const a = this.adm;
            const r = await api('portal/empresas/' + a.id + '/admin', 'POST', {correo: a.correo, nombre: a.nombreP, apellido: a.apellido, password: a.password});
            loading("end");
            if (!r.ok) { notifyError(null, r.d.mensaje || "No se pudo agregar"); return; }
            notifySuccess(r.d.mensaje || "Administrador agregado !");
            this.adm = {id: ''}; this.lista();
        },
        async verUsuarios(e) {
            if (this.usr.id == e.id) { this.usr = {id: '', lista: []}; return; }
            const r = await api('portal/empresas/' + e.id + '/usuarios');
            if (!r.ok) { notifyError(null, r.d.mensaje || "No se pudo cargar"); return; }
            this.usr = {id: e.id, lista: r.d.usuarios};
        },
        async cambiarEstado(e) {
            if (e.activa && !await confirmar("Desactivar \"" + e.nombre + "\"? Sus usuarios no podrán entrar hasta que la reactive.")) return;
            const r = await api('portal/empresas/' + e.id, 'PUT', {activa: !e.activa});
            if (!r.ok) { notifyError(null, r.d.mensaje || "No se pudo cambiar"); return; }
            notifySuccess(e.activa ? "Empresa desactivada" : "Empresa activada"); this.lista();
        },
        async entrar(e) {
            const r = await api('auth/entrar', 'POST', {slug: e.slug});
            if (r.ok && r.d.url) window.location.href = r.d.url; else notifyError(null, r.d.mensaje || "No se pudo entrar");
        }
    }
}
