function lod() {
    return {
        data: [], showNew: false,
        campos: {LeyLodId: 0, LeyLodNombre: "", LeyLodDescripcion:"", LeyLodDefault: true, LeyLodFecha: obtenerFechaActual(true), LeyLodEstado: true}, 
        pag: {buscar: "", estado: true, anterior: 0, siguiente: 0, inicio:0},
        automatico(){
            this.listaLOD();
        },
        listaLOD(inicio = 0){
            this.pag.inicio = inicio < 9 ? 0 : inicio;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetListaLOD?buscar='+this.pag.buscar+'&estado='+this.pag.estado+'&inicio='+this.pag.inicio+'&todos=1', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.pag.siguiente = response.siguiente;
                    this.pag.anterior = response.anterior;
                    this.data = response.data; loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista de LOD del proyecto !"); loading("end");
                });
        },
        guardarLOD(){
            loading("init");
            fetch(baseUrlT+'LeyendaLOD/'+this.campos.LeyLodId, {
                method: this.campos.LeyLodId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar LOD");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                if (this.campos.LeyLodId == 0) {
                    notifySuccess("LOD guardado correctamente !"); loading("end");
                    this.listaLOD();
                }else{
                    notifySuccess("LOD editado correctamente !"); loading("end");
                    this.listaLOD(this.pag.inicio);
                }
                this.cancelarLOD();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarLOD(){
            this.showNew = false;
            this.campos = {LeyLodId: 0, LeyLodNombre: "", LeyLodDescripcion:"", LeyLodDefault: true, LeyLodFecha: obtenerFechaActual(true), LeyLodEstado: true};
        },
        async editarLOD(item){
            this.showNew = true;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'LeyendaLOD/'+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            loading("end");
        },
        async eliminarLOD(item){
            if(!await confirmar("Seguro deseas eliminar LOD ?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrlT+'LeyendaLOD/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.LeyLodEstado = false;
            
            fetch(baseUrlT+'LeyendaLOD/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("LOD eliminado correctamente!"); loading("end");
                this.listaLOD();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar LOD !"); loading("end");
            });
        }
    }
}