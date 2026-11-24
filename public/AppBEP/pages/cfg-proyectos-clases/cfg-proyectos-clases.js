function categorias() {
    return {
        data: [], showNew: false, tiposBEP: [],
        campos: {CatBepId: 0, TipoBepId: "", CatBepNombre: "", CatBepFecha: obtenerFechaActual(true), CatBepEstado: true},
        pag: {buscar: "", tipoBep: 0, estado: true, anterior: 0, siguiente: 0, inicio:0},
        automatico(){
            this.listaCategorias();
            this.listaTiposBEP();
        },
        listaCategorias(inicio = 0){
            this.pag.inicio = inicio < 9 ? 0 : inicio;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetListaCategoriasBEP?buscar='+this.pag.buscar+'&tipoBep='+this.pag.tipoBep+'&estado='+this.pag.estado+'&inicio='+this.pag.inicio+'&todos=1', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.pag.siguiente = response.siguiente;
                    this.pag.anterior = response.anterior;
                    this.data = response.data; loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Clases del proyecto !"); loading("end");
                });
        },
        listaTiposBEP(){
            fetch(baseUrl+'APIConfigBEP/GetSelectConfigBEP?opcion=tipoBEP', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.tiposBEP = response.SDTSelectConfigBEP; 
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Tipos BEP !");
                });
        },
        guardarCategoria(){
            loading("init");
            fetch(baseUrlT+'CategoriaBEP/'+this.campos.CatBepId, {
                method: this.campos.CatBepId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar Clase");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                if (this.campos.CatBepId == 0) {
                    notifySuccess("Clase guardada correctamente !"); loading("end");
                    this.listaCategorias();
                }else{
                    notifySuccess("Clase editada correctamente !"); loading("end");
                    this.listaCategorias(this.pag.inicio);
                }
                this.cancelarCategoria();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarCategoria(){
            this.showNew = false;
            this.campos = {CatBepId: 0, TipoBepId: "", CatBepNombre: "", CatBepFecha: obtenerFechaActual(true), CatBepEstado: true};
        },
        async editarCategoria(item){
            this.showNew = true;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'CategoriaBEP/'+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            loading("end");
        },
        async eliminarCategoria(item){
            if(!await confirmar("Seguro deseas eliminar Clase ?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrlT+'CategoriaBEP/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.CatBepEstado = false;
            
            fetch(baseUrlT+'CategoriaBEP/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Clase eliminada correctamente!"); loading("end");
                this.listaCategorias();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Clase !"); loading("end");
            });
        }
    }
}