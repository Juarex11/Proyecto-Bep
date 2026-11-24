function ecomundatos() {
    return {
        data: [], showNew: false,
        plataformasCDE: ["Autodesk BIM 360", "Trimble Connect", "Bentley ProjectWise", "Dalux", "Aconex", "Thinkproject", "Revizto", "Bimsync", "Kairnial", "PlanGrid"],
        campos: {EcdBepId: 0, RevBepId: RevBepId, EcdBepNombre: "", EcdBepUrl: "", EcdBepComentario: "",  EcdBepFecha: obtenerFechaActual(true), EcdBepFechaAct: obtenerFechaActual(true), EcdBepEstado: true, EcdBepUsuarioId: usuarioId},
        automatico(){
            this.listaEComunDatos();
        },
        listaEComunDatos(){
            loading("init");
            fetch(baseUrl+'APIBEP/GetListaEComunicacion?opcion=eComunDatos&RevBepId='+RevBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.data = response.SDTListaEComunicacion; loading("end");
                    this.$nextTick(() => readOnlyBEP("ecomundatos"));
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Entorno Común de Datos !"); loading("end");
                });
        },
        guardarEComunDatos(){
            loading("init");
            this.campos.CanBepFechaAct = obtenerFechaActual(true);
            this.campos.EcdBepUsuarioId = usuarioId;
            fetch(baseUrlT+'EntornoDatosBEP/'+this.campos.EcdBepId, {
                method: this.campos.EcdBepId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar Entorno Común de Datos");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                if (this.campos.EcdBepId == 0) {
                    notifySuccess("Entorno Común de Datos guardado correctamente !"); loading("end");
                }else{
                    notifySuccess("Entorno Común de Datos editado correctamente !"); loading("end");
                }
                this.listaEComunDatos();
                this.cancelarEComunDatos();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarEComunDatos(){
            this.showNew = false;
            this.campos = {EcdBepId: 0, RevBepId: RevBepId, EcdBepNombre: "", EcdBepUrl: "", EcdBepComentario: "",  EcdBepFecha: obtenerFechaActual(true), EcdBepFechaAct: obtenerFechaActual(true), EcdBepEstado: true, EcdBepUsuarioId: usuarioId};
        },
        async editarEComunDatos(item){
            this.showNew = true;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'EntornoDatosBEP/'+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            loading("end");
        },
        async eliminarEComunDatos(item){
            if(!await confirmar("Seguro deseas eliminar Entorno Común de Datos ?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrlT+'EntornoDatosBEP/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.EcdBepFechaAct = obtenerFechaActual(true);
            responseItem.EcdBepEstado = false;
            responseItem.EcdBepUsuarioId = usuarioId;
            
            fetch(baseUrlT+'EntornoDatosBEP/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Entorno Común de Datos eliminado correctamente!"); loading("end");
                this.listaEComunDatos();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Entorno Común de Datos !"); loading("end");
            });
        }
    }
}




