function usuarios() {
    return {
        data: [], showNew: false,
        campos: {usuarioId: '', personalId: '', rolId: '', rol: 'usuario', dni: '', nombre: '', apellido: '', telefono: '', correo: '', direccion: '', password: '', estado: true}, 
        pag: {buscar: "", estado: true, anterior: 'US000', siguiente: 'US000', inicio:'US000'},
        automatico(){
            this.listaUsuarios();
        },
        /** Columnas de la tabla (DataTables, ver js/ui/tablas.js) */
        cols(){
            return [
                {t: '#', c: 'id', prioridad: 500},
                {t: '', orden: false, ancho: '44px', prioridad: 400, render: (u) => '<span class="av-mini">' + (u.foto ? '<img src="' + bepEsc(this.fotoUrl(u.id, u.foto)) + '" alt="" onerror="this.style.display=\'none\'">' : bepEsc(this.iniciales(u.nombre + ' ' + u.apellido))) + '</span>'},
                {t: 'Nombre', c: 'nombre', cls: 'fw-semibold'},
                {t: 'Apellidos', c: 'apellido'},
                {t: 'DNI', c: 'dni', prioridad: 300},
                {t: 'Teléfono', c: 'telefono', prioridad: 301},
                {t: 'Correo', c: 'correo'},
                {t: 'Rol', texto: (u) => u.rol == 'admin' ? 'Administrador' : 'Usuario'},
                {t: 'Estado', c: 'estado', tipo: 'estado'}
            ];
        },
        listaUsuarios(inicio = 'US000'){
            this.pag.inicio = inicio < 'US009' ? 'US000' : inicio;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetListaUsuarios?buscar='+this.pag.buscar+'&estado='+this.pag.estado+'&id='+this.pag.inicio+'&todos=1', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.pag.siguiente = response.siguiente;
                    this.pag.anterior = response.anterior;
                    this.data = response.data; loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista de Usuarios !"); loading("end");
                });
        },
        guardarUsuario(){
            loading("init");
            fetch(baseUrl+'APIConfigBEP/PostUsuarioGuardar', {
                method: 'POST',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => response.json())
            .then((response) => {
                if(!/^(Registrado|Editado) correctamente/.test(response.mensaje || '')){
                    notifyError(null, response.mensaje == "Correo ya existe" ? "Correo ya existe, ingrese otro !" : (response.mensaje || "No se pudo guardar")); loading("end"); return;
                }
                if (this.campos.usuarioId == "") {
                    notifySuccess("Usuario guardado correctamente !"); loading("end");
                    this.listaUsuarios();
                }else{
                    notifySuccess("Usuario editado correctamente !"); loading("end");
                    this.listaUsuarios(this.pag.inicio);
                }
                this.cancelarUsuario();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        fotoUrl(id, ver){ return URL_FOTO_DE(id, ver); },
        iniciales(n){ return (n || '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || '?'; },
        refrescarFila(id, ver){ const f = this.data.find((x) => String(x.id) === String(id)); if (f) f.foto = ver; },
        async subirFoto(ev){
            const f = ev.target.files[0]; ev.target.value = '';
            if (!f) return;
            const ver = await cambiarFotoDe(this.campos.usuarioId, f);
            if (ver) { this.campos.foto = ver; this.refrescarFila(this.campos.usuarioId, ver); }
        },
        async quitarFoto(){
            if (!await confirmar('¿Quitar la foto de este usuario?')) return;
            if (await quitarFotoDe(this.campos.usuarioId)) { this.campos.foto = 0; this.refrescarFila(this.campos.usuarioId, 0); }
        },
        cancelarUsuario(){
            this.showNew = false;
            this.campos = {usuarioId: '', personalId: '', rolId: '', rol: 'usuario', dni: '', nombre: '', apellido: '', telefono: '', correo: '', direccion: '', password: '', estado: true, foto: 0};
        },
        async editarUsuario(item){
            this.showNew = true;
            loading("init");
            const consultaItem = await fetch(baseUrl+'APIConfigBEP/GetUsuarioInfo?id='+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            loading("end");
        },
        async eliminarUsuario(item){
            if(!await confirmar("Seguro deseas eliminar Usuario ?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrl+'APIConfigBEP/GetUsuarioInfo?id='+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            this.campos.estado = false;
            
            fetch(baseUrl+'APIConfigBEP/PostUsuarioGuardar', {
                method: 'POST',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => response.json())
            .then((response) => {
                if(!/^(Registrado|Editado) correctamente/.test(response.mensaje || '')){
                    notifyError(null, response.mensaje || "No se pudo eliminar"); loading("end"); return;
                }
                notifySuccess("Usuario eliminado correctamente!"); loading("end");
                this.listaUsuarios();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Usuario !"); loading("end");
            });
        }
    }
}