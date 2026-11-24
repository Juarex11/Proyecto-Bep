function actividades() {
    return {
        data: [], showNew: false,
        campos: {ActId: 0, ActNombre: "", ActFecha: obtenerFechaActual(true), ActEstado: true},
        pag: {buscar: "", estado: true, anterior: 0, siguiente: 0, inicio:0},
        automatico(){
            this.listaActividades();
        },
        listaActividades(inicio = 0){
            this.pag.inicio = inicio < 9 ? 0 : inicio;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetListaActividades?buscar='+this.pag.buscar+'&estado='+this.pag.estado+'&inicio='+this.pag.inicio+'&todos=1', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.pag.siguiente = response.siguiente;
                    this.pag.anterior = response.anterior;
                    this.data = response.data; loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Actividades del proyecto !"); loading("end");
                });
        },
        guardarActividad(){
            loading("init");
            fetch(baseUrlT+'Actividad/'+this.campos.ActId, {
                method: this.campos.ActId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar Actividad");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                if (this.campos.ActId == 0) {
                    notifySuccess("Actividad guardada correctamente !"); loading("end");
                    this.listaActividades();
                }else{
                    notifySuccess("Actividad editada correctamente !"); loading("end");
                    this.listaActividades(this.pag.inicio);
                }
                this.cancelarActividad();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarActividad(){
            this.showNew = false;
            this.campos = {ActId: 0, ActNombre: "", ActFecha: obtenerFechaActual(true), ActEstado: true};
        },
        async editarActividad(item){
            this.showNew = true;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'Actividad/'+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            loading("end");
        },
        async eliminarActividad(item){
            if(!await confirmar("Seguro deseas eliminar Actividad ?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrlT+'Actividad/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.ActEstado = false;
            
            fetch(baseUrlT+'Actividad/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Actividad eliminada correctamente!"); loading("end");
                this.listaActividades();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Actividad !"); loading("end");
            });
        }
    }
}