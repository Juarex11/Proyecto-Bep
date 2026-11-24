function roles() {
    return {
        data: [], showNew: false,
        campos: {RolBepId: 0, RolBepNombre: "", RolBepDescripcion: "", RolBepFecha: obtenerFechaActual(true), RolBepEstado: true},
        pag: {buscar: "", estado: true, anterior: 0, siguiente: 0, inicio:0},
        automatico(){
            this.listaRoles();
        },
        listaRoles(inicio = 0){
            this.pag.inicio = inicio < 9 ? 0 : inicio;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetListaRoles?buscar='+this.pag.buscar+'&estado='+this.pag.estado+'&inicio='+this.pag.inicio+'&todos=1', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.pag.siguiente = response.siguiente;
                    this.pag.anterior = response.anterior;
                    this.data = response.data; loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Roles del proyecto !"); loading("end");
                });
        },
        guardarRol(){
            loading("init");
            fetch(baseUrlT+'RolBEP/'+this.campos.RolBepId, {
                method: this.campos.RolBepId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar Rol");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                if (this.campos.RolBepId == 0) {
                    notifySuccess("Rol guardado correctamente !"); loading("end");
                    this.listaRoles();
                }else{
                    notifySuccess("Rol editado correctamente !"); loading("end");
                    this.listaRoles(this.pag.inicio);
                }
                this.cancelarRol();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarRol(){
            this.showNew = false;
            this.campos = {RolBepId: 0, RolBepNombre: "", RolBepDescripcion: "", RolBepFecha: obtenerFechaActual(true), RolBepEstado: true};
        },
        async editarRol(item){
            this.showNew = true;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'RolBEP/'+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            loading("end");
        },
        async eliminarRol(item){
            if(!await confirmar("Seguro deseas eliminar Rol ?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrlT+'RolBEP/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.RolBepEstado = false;
            
            fetch(baseUrlT+'RolBEP/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Rol eliminado correctamente!"); loading("end");
                this.listaRoles();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Rol !"); loading("end");
            });
        }
    }
}