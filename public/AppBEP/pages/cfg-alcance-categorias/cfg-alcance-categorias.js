function categorias() {
    return {
        data: [], showNew: false, especialidades: [], especialidadesForm: [], tiposBEP: [],
        campos: {CatEleId: 0, EspId: 0, CatEleNombre: "", CatEleFecha: obtenerFechaActual(true), CatEleEstado: true}, 
        TipoBepId: 0,
        pag: {buscar: "", tipoBep: 0, espId: 0, estado: true, anterior: 0, siguiente: 0, inicio:0},
        automatico(){
            this.listaCategorias();
            this.listaTiposBEP();
        },
        listaCategorias(inicio = 0){
            this.pag.inicio = inicio < 9 ? 0 : inicio;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetListaCategorias?buscar='+this.pag.buscar+'&tipoBep='+this.pag.tipoBep+'&espId='+this.pag.espId+'&estado='+this.pag.estado+'&inicio='+this.pag.inicio+'&todos=1', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.pag.siguiente = response.siguiente;
                    this.pag.anterior = response.anterior;
                    this.data = response.data; loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista de Categorías del proyecto !"); loading("end");
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
        listaEspecialidades(){
            this.especialidades = [];
            if (this.pag.tipoBep == 0) return;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetSelectConfigBEP?opcion=especialidad&parametro='+this.pag.tipoBep, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.especialidades = response.SDTSelectConfigBEP; loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Especialidades !"); loading("end");
                });
        },
        listaEspecialidadesForm(espRef = 0){
            this.especialidadesForm = [];
            if (this.TipoBepId == 0) return;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetSelectConfigBEP?opcion=especialidad&parametro='+this.TipoBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.especialidadesForm = response.SDTSelectConfigBEP; loading("end");
                    if(espRef > 0){
                        this.$nextTick(() => {
                            this.campos.EspId = parseInt(espRef);
                        });
                    }
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Especialidades !"); loading("end");
                });
        },
        guardarCategoria(){
            loading("init");
            fetch(baseUrlT+'CategoriaElemento/'+this.campos.CatEleId, {
                method: this.campos.CatEleId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar Categoría");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                if (this.campos.CatEleId == 0) {
                    notifySuccess("Categoría guardada correctamente !"); loading("end");
                    this.listaCategorias();
                }else{
                    notifySuccess("Categoría editada correctamente !"); loading("end");
                    this.listaCategorias(this.pag.inicio);
                }
                this.cancelarCategoria();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarCategoria(){
            this.showNew = false;
            this.campos = {CatEleId: 0, EspId: 0, CatEleNombre: "", CatEleFecha: obtenerFechaActual(true), CatEleEstado: true};
        },
        async editarCategoria(item){
            this.showNew = true;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'CategoriaElemento/'+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            this.TipoBepId = this.campos.TipoBepId;
            this.listaEspecialidadesForm(this.campos.EspId);
            loading("end");
        },
        async eliminarCategoria(item){
            if(!await confirmar("Seguro deseas eliminar Categoría ?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrlT+'CategoriaElemento/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.CatEleEstado = false;
            
            fetch(baseUrlT+'CategoriaElemento/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Categoría eliminada correctamente!"); loading("end");
                this.listaCategorias();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Categoría !"); loading("end");
            });
        }
    }
}