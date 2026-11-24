function leyRaci() {
    return {
        data: [], showNew: false,
        campos: {LeyRaciId: 0, LeyRaciAbreviacion: "", LeyRaciNombre: "", LeyRaciDescripcion: "", LeyRaciColor: "", LeyRaciBackground: "", LeyRaciFecha: obtenerFechaActual(true), LeyRaciEstado: true},
        pag: {buscar: "", estado: true, anterior: 0, siguiente: 0, inicio:0},
        automatico(){
            this.listaLeyRaci();
        },
        listaLeyRaci(inicio = 0){
            this.pag.inicio = inicio < 9 ? 0 : inicio;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetListaLeyRACI?buscar='+this.pag.buscar+'&estado='+this.pag.estado+'&inicio='+this.pag.inicio+'&todos=1', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.pag.siguiente = response.siguiente;
                    this.pag.anterior = response.anterior;
                    this.data = response.data; loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Leyenda Raci del proyecto !"); loading("end");
                });
        },
        guardarLeyRaci(){
            loading("init");
            fetch(baseUrlT+'LeyendaRACI/'+this.campos.LeyRaciId, {
                method: this.campos.LeyRaciId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar Leyenda Raci");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                if (this.campos.LeyRaciId == 0) {
                    notifySuccess("Leyenda Raci guardado correctamente !"); loading("end");
                    this.listaLeyRaci();
                }else{
                    notifySuccess("Leyenda Raci editado correctamente !"); loading("end");
                    this.listaLeyRaci(this.pag.inicio);
                }
                this.cancelarLeyRaci();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarLeyRaci(){
            this.showNew = false;
            this.campos = {LeyRaciId: 0, LeyRaciAbreviacion: "", LeyRaciNombre: "", LeyRaciDescripcion: "", LeyRaciColor: "", LeyRaciBackground: "", LeyRaciFecha: obtenerFechaActual(true), LeyRaciEstado: true};
        },
        async editarLeyRaci(item){
            this.showNew = true;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'LeyendaRACI/'+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            loading("end");
        },
        async eliminarLeyRaci(item){
            if(!await confirmar("Seguro deseas eliminar Leyenda Raci ?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrlT+'LeyendaRACI/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.LeyRaciEstado = false;
            
            fetch(baseUrlT+'LeyendaRACI/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Leyenda Raci eliminado correctamente!"); loading("end");
                this.listaLeyRaci();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Leyenda Raci !"); loading("end");
            });
        }
    }
}