function procesos() {
    return {
        data: [], showNew: false, actividades: [],
        campos: {SubActId: 0, ActId:0, SubActNombre:"", SubActDefault: true, SubActFecha: obtenerFechaActual(true), SubActFechaAct: obtenerFechaActual(true), SubActEstado: true},
        pag: {buscar: "", actId: 0, estado: true, anterior: 0, siguiente: 0, inicio:0},
        automatico(){
            this.listaSubActividades();
            this.listaActividades();
        },
        listaSubActividades(inicio = 0){
            this.pag.inicio = inicio < 9 ? 0 : inicio;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetListaSubActividades?buscar='+this.pag.buscar+'&actId='+this.pag.actId+'&estado='+this.pag.estado+'&inicio='+this.pag.inicio+'&todos=1', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.pag.siguiente = response.siguiente;
                    this.pag.anterior = response.anterior;
                    this.data = response.data; loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Procesos del proyecto !"); loading("end");
                });
        },
        listaActividades(){
            fetch(baseUrl+'APIConfigBEP/GetSelectConfigBEP?opcion=actividad', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.actividades = response.SDTSelectConfigBEP; 
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Actividades !");
                });
        },
        guardarSubActividad(){
            loading("init");
            fetch(baseUrlT+'SubActividad/'+this.campos.SubActId, {
                method: this.campos.SubActId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar Proceso");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                if (this.campos.SubActId == 0) {
                    notifySuccess("Proceso guardado correctamente !"); loading("end");
                    this.listaSubActividades();
                }else{
                    notifySuccess("Proceso editado correctamente !"); loading("end");
                    this.listaSubActividades(this.pag.inicio);
                }
                this.cancelarSubActividad();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarSubActividad(){
            this.showNew = false;
            this.campos = {SubActId: 0, ActId:0, SubActNombre:"", SubActDefault: true, SubActFecha: obtenerFechaActual(true), SubActFechaAct: obtenerFechaActual(true), SubActEstado: true};
        },
        async editarSubActividad(item){
            this.showNew = true;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'SubActividad/'+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            loading("end");
        },
        async eliminarSubActividad(item){
            if(!await confirmar("Seguro deseas eliminar Proceso ?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrlT+'SubActividad/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.SubActEstado = false;
            
            fetch(baseUrlT+'SubActividad/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Proceso eliminado correctamente!"); loading("end");
                this.listaSubActividades();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Proceso !"); loading("end");
            });
        }
    }
}