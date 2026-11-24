function ccomunicacion() {
    return {
        data: [], showNew: false,
        medios: ["Correo electrónico", "Videollamadas", "Mensajería instantánea", "Redes sociales", "Otros"],
        campos: {CanBepId: 0, RevBepId: RevBepId, CanBepNombre: "", CanBepProposito: "", CanBepFecha: obtenerFechaActual(true), CanBepFechaAct: obtenerFechaActual(true), CanBepEstado: true, CanBepUsuarioId: usuarioId},
        automatico(){
            this.listaCComunicacion();
        },
        listaCComunicacion(){
            loading("init");
            fetch(baseUrl+'APIBEP/GetListaEComunicacion?opcion=cComunicacion&RevBepId='+RevBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.data = response.SDTListaEComunicacion; loading("end");
                    this.$nextTick(() => readOnlyBEP("ccomunicacion"));
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista canal de comunicación !"); loading("end");
                });
        },
        guardarCComunicacion(){
            loading("init");
            this.campos.CanBepFechaAct = obtenerFechaActual(true);
            this.campos.CanBepUsuarioId = usuarioId;
            fetch(baseUrlT+'CanalBEP/'+this.campos.CanBepId, {
                method: this.campos.CanBepId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar canal de comunicación");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                if (this.campos.CanBepId == 0) {
                    notifySuccess("Canal de comunicación guardado correctamente !"); loading("end");
                }else{
                    notifySuccess("Canal de comunicación editado correctamente !"); loading("end");
                }
                this.listaCComunicacion();
                this.cancelarCComunicacion();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarCComunicacion(){
            this.showNew = false;
            this.campos = {CanBepId: 0, RevBepId: RevBepId, CanBepNombre: "", CanBepProposito: "", CanBepFecha: obtenerFechaActual(true), CanBepFechaAct: obtenerFechaActual(true), CanBepEstado: true, CanBepUsuarioId: usuarioId};
        },
        async editarCComunicacion(item){
            this.showNew = true;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'CanalBEP/'+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            loading("end");
        },
        async eliminarCComunicacion(item){
            if(!await confirmar("Seguro deseas eliminar Canal de comunicación ?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrlT+'CanalBEP/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.CanBepFechaAct = obtenerFechaActual(true);
            responseItem.CanBepUsuarioId = usuarioId;
            responseItem.CanBepEstado = false;
            
            fetch(baseUrlT+'CanalBEP/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Canal de comunicación eliminado correctamente!"); loading("end");
                this.listaCComunicacion();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Canal de comunicación !"); loading("end");
            });
        }
    }
}


