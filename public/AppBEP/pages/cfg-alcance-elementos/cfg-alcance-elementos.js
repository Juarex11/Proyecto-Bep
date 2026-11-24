function elementos() {
    return {
        data: [], showNew: false, especialidades: [], especialidadesForm: [], categorias: [], categoriasForm: [], tiposBEP: [],
        campos: {EleId: 0, CatEleId: 0, EleNombre:"", EleObservacion: "", EleDefault: true, EleFecha: obtenerFechaActual(true), EleEstado: true}, TipoBepId: 0, EspId: 0,
        pag: {buscar: "", tipoBep: 0, espId: 0, catId: 0, estado: true, anterior: 0, siguiente: 0, inicio:0},
        automatico(){
            this.listaElementos();
            this.listaTiposBEP();
        },
        listaElementos(inicio = 0){
            this.pag.inicio = inicio < 9 ? 0 : inicio;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetListaElementos?buscar='+this.pag.buscar+'&tipoBep='+this.pag.tipoBep+'&espId='+this.pag.espId+'&catId='+this.pag.catId+'&estado='+this.pag.estado+'&inicio='+this.pag.inicio+'&todos=1', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.pag.siguiente = response.siguiente;
                    this.pag.anterior = response.anterior;
                    this.data = response.data; loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista de Elementos del proyecto !"); loading("end");
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
            this.especialidades = []; this.categorias = [];
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
            this.especialidadesForm = []; this.categoriasForm = [];
            if (this.TipoBepId == 0) return;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetSelectConfigBEP?opcion=especialidad&parametro='+this.TipoBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.especialidadesForm = response.SDTSelectConfigBEP; loading("end");
                    if(espRef > 0){
                        this.$nextTick(() => {
                            this.EspId = espRef.toString();
                        });
                    }
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Especialidades !"); loading("end");
                });
        },
        listaCategorias(){
            this.categorias = [];
            if (this.pag.espId == 0) return;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetSelectConfigBEP?opcion=categoria&parametro='+this.pag.espId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.categorias = response.SDTSelectConfigBEP; loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Categorías !"); loading("end");
                });
        },
        listaCategoriasForm(catEleRef = 0){
            this.categoriasForm = [];
            if (this.EspId == 0) return;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetSelectConfigBEP?opcion=categoria&parametro='+this.EspId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.categoriasForm = response.SDTSelectConfigBEP; loading("end");
                    if(catEleRef > 0){
                        this.$nextTick(() => {
                            this.campos.CatEleId = parseInt(catEleRef);
                        });
                    }
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Categorías !"); loading("end");
                });
        },
        guardarElemento(){
            loading("init");
            fetch(baseUrlT+'Elemento/'+this.campos.EleId, {
                method: this.campos.EleId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar Elemento");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                if (this.campos.EleId == 0) {
                    notifySuccess("Elemento guardado correctamente !"); loading("end");
                    this.listaElementos();
                }else{
                    notifySuccess("Elemento editado correctamente !"); loading("end");
                    this.listaElementos(this.pag.inicio);
                }
                this.cancelarElemento();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarElemento(){
            this.showNew = false;
            this.campos = {EleId: 0, CatEleId: 0, EleNombre:"", EleObservacion: "", EleDefault: true, EleFecha: obtenerFechaActual(true), EleEstado: true};
            this.EspId = 0;
        },
        async editarElemento(item){
            this.showNew = true;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'Elemento/'+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            this.TipoBepId = parseInt(this.campos.TipoBepId);
            this.EspId = parseInt(this.campos.EspId);
            this.listaEspecialidadesForm(this.campos.EspId);
            this.listaCategoriasForm(this.campos.CatEleId);
            loading("end");
        },
        async eliminarElemento(item){
            if(!await confirmar("Seguro deseas eliminar Elemento ?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrlT+'Elemento/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.EleEstado = false;
            
            fetch(baseUrlT+'Elemento/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Elemento eliminado correctamente!"); loading("end");
                this.listaElementos();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Elemento !"); loading("end");
            });
        }
    }
}