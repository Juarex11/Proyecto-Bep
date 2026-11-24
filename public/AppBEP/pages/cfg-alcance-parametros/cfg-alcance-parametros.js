function parametros() {
    return {
        data: [], showNew: false,
        campos: {ParLoiId: 0, ParLoiNombre: "", ParLoiDescripcion: "", ParLoiFecha: obtenerFechaActual(true), ParLoiFechaAct: obtenerFechaActual(true), ParLoiEstado: true, ParLoiUsuarioId: usuarioId}, 
        pag: {buscar: "", estado: true, anterior: 0, siguiente: 0, inicio:0},
        automatico(){
            this.listaParametros();
        },
        listaParametros(inicio = 0){
            this.pag.inicio = inicio < 9 ? 0 : inicio;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetListaParametros?buscar='+this.pag.buscar+'&estado='+this.pag.estado+'&inicio='+this.pag.inicio+'&todos=1', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.pag.siguiente = response.siguiente;
                    this.pag.anterior = response.anterior;
                    this.data = response.data; loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista de Parámetros del proyecto !"); loading("end");
                });
        },
        guardarParametro(){
            loading("init");
            fetch(baseUrlT+'ParametroLOI/'+this.campos.ParLoiId, {
                method: this.campos.ParLoiId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar Parámetro");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                if (this.campos.ParLoiId == 0) {
                    notifySuccess("Parámetro guardado correctamente !"); loading("end");
                    this.listaParametros();
                }else{
                    notifySuccess("Parámetro editado correctamente !"); loading("end");
                    this.listaParametros(this.pag.inicio);
                }
                this.cancelarParametro();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarParametro(){
            this.showNew = false;
            this.campos = {ParLoiId: 0, ParLoiNombre: "", ParLoiDescripcion: "", ParLoiFecha: obtenerFechaActual(true), ParLoiFechaAct: obtenerFechaActual(true), ParLoiEstado: true, ParLoiUsuarioId: usuarioId};
        },
        async editarParametro(item){
            this.showNew = true;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'ParametroLOI/'+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            loading("end");
        },
        async eliminarParametro(item){
            if(!await confirmar("Seguro deseas eliminar Parámetro ?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrlT+'ParametroLOI/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.ParLoiEstado = false;
            
            fetch(baseUrlT+'ParametroLOI/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Parámetro eliminada correctamente!"); loading("end");
                this.listaParametros();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Parámetro !"); loading("end");
            });
        }
    }
}