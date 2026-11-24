function usosBim() {
    return {
        data: [], showNew: false,
        campos: {UsoBimId: 0, UsoBimNombre: "", UsoBimDescripcion: "", UsoBimDefault: true, UsoBimFecha: obtenerFechaActual(true), UsoBimEstado: true},
        pag: {buscar: "", estado: true, anterior: 0, siguiente: 0, inicio:0},
        automatico(){
            this.listaUsosBim();
        },
        listaUsosBim(inicio = 0){
            this.pag.inicio = inicio < 9 ? 0 : inicio;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetListaUsosBim?buscar='+this.pag.buscar+'&estado='+this.pag.estado+'&inicio='+this.pag.inicio+'&todos=1', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.pag.siguiente = response.siguiente;
                    this.pag.anterior = response.anterior;
                    this.data = response.data; loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Usos BIM del proyecto !"); loading("end");
                });
        },
        guardarUsoBim(){
            loading("init");
            fetch(baseUrlT+'UsoBIM/'+this.campos.UsoBimId, {
                method: this.campos.UsoBimId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar Uso Bim");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                if (this.campos.UsoBimId == 0) {
                    notifySuccess("Uso Bim guardado correctamente !"); loading("end");
                    this.listaUsosBim();
                }else{
                    notifySuccess("Uso Bim editado correctamente !"); loading("end");
                    this.listaUsosBim(this.pag.inicio);
                }
                this.cancelarUsoBim();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarUsoBim(){
            this.showNew = false;
            this.campos = {UsoBimId: 0, UsoBimNombre: "", UsoBimDescripcion: "", UsoBimDefault: true, UsoBimFecha: obtenerFechaActual(true), UsoBimEstado: true};
        },
        async editarUsoBim(item){
            this.showNew = true;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'UsoBIM/'+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            loading("end");
        },
        async eliminarUsoBim(item){
            if(!await confirmar("Seguro deseas eliminar Uso Bim ?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrlT+'UsoBIM/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.UsoBimEstado = false;
            
            fetch(baseUrlT+'UsoBIM/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Uso Bim eliminada correctamente!"); loading("end");
                this.listaUsosBim();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Uso Bim !"); loading("end");
            });
        }
    }
}