function especialidades() {
    return {
        data: [], showNew: false, tiposBEP: [],
        campos: {EspId: 0, TipoBepId: "", EspNombre: "", EspDefault: true, EspFecha: obtenerFechaActual(true), EspEstado: true}, 
        pag: {buscar: "", tipoBep: 0, estado: true, anterior: 0, siguiente: 0, inicio:0},
        automatico(){
            this.listaEspecialidades();
            this.listaTiposBEP();
        },
        listaEspecialidades(inicio = 0){
            this.pag.inicio = inicio < 9 ? 0 : inicio;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetListaEspecialidades?buscar='+this.pag.buscar+'&tipoBep='+this.pag.tipoBep+'&estado='+this.pag.estado+'&inicio='+this.pag.inicio+'&todos=1', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.pag.siguiente = response.siguiente;
                    this.pag.anterior = response.anterior;
                    this.data = response.data; loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista de Especialidades del proyecto !"); loading("end");
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
        guardarEspecialidad(){
            loading("init");
            fetch(baseUrlT+'Especialidad/'+this.campos.EspId, {
                method: this.campos.EspId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar Especialidad");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                if (this.campos.EspId == 0) {
                    notifySuccess("Especialidad guardada correctamente !"); loading("end");
                    this.listaEspecialidades();
                }else{
                    notifySuccess("Especialidad editada correctamente !"); loading("end");
                    this.listaEspecialidades(this.pag.inicio);
                }
                this.cancelarEspecialidad();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarEspecialidad(){
            this.showNew = false;
            this.campos = {EspId: 0, TipoBepId: "", EspNombre: "", EspDefault: true, EspFecha: obtenerFechaActual(true), EspEstado: true};
        },
        async editarEspecialidad(item){
            this.showNew = true;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'Especialidad/'+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            loading("end");
        },
        async eliminarEspecialidad(item){
            if(!await confirmar("Seguro deseas eliminar Especialidad ?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrlT+'Especialidad/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.EspEstado = false;
            
            fetch(baseUrlT+'Especialidad/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Especialidad eliminada correctamente!"); loading("end");
                this.listaEspecialidades();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Especialidad !"); loading("end");
            });
        }
    }
}