function tipos() {
    return {
        data: [], showNew: false,
        campos: {TipoBepId: 0, TipoBepNombre: "", TipoBepFecha: obtenerFechaActual(true), TipoBepEstado: true},
        pag: {buscar: "", estado: true, anterior: 0, siguiente: 0, inicio:0},
        automatico(){
            this.listaTipos();
        },
        listaTipos(inicio = 0){
            this.pag.inicio = inicio < 9 ? 0 : inicio;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetListaTiposBEP?buscar='+this.pag.buscar+'&estado='+this.pag.estado+'&inicio='+this.pag.inicio+'&todos=1', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.pag.siguiente = response.siguiente;
                    this.pag.anterior = response.anterior;
                    this.data = response.data; loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Tipos del proyecto !"); loading("end");
                });
        },
        guardarTipo(){
            loading("init");
            fetch(baseUrlT+'TipoBEP/'+this.campos.TipoBepId, {
                method: this.campos.TipoBepId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar Tipo");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                if (this.campos.TipoBepId == 0) {
                    notifySuccess("Tipo guardado correctamente !"); loading("end");
                    this.listaTipos();
                }else{
                    notifySuccess("Tipo editado correctamente !"); loading("end");
                    this.listaTipos(this.pag.inicio);
                }
                this.cancelarTipo();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarTipo(){
            this.showNew = false;
            this.campos = {TipoBepId: 0, TipoBepNombre: "", TipoBepFecha: obtenerFechaActual(true), TipoBepEstado: true};
        },
        async editarTipo(item){
            this.showNew = true;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'TipoBEP/'+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            loading("end");
        },
        async eliminarTipo(item){
            if(!await confirmar("Seguro deseas eliminar Tipo ?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrlT+'TipoBEP/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.TipoBepEstado = false;
            
            fetch(baseUrlT+'TipoBEP/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Tipo eliminado correctamente!"); loading("end");
                this.listaTipos();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Tipo !"); loading("end");
            });
        }
    }
}