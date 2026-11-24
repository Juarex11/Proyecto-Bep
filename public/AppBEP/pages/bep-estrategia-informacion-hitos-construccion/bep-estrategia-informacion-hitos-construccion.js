function hconstruccion() {
    return {
        data: [], showNew: false,
        campos: {HitConId: 0, RevBepId: RevBepId, HitConNombre: "", HitConFechaInicio: "", HitConFechaFin:"", HitConFecha: obtenerFechaActual(true), HitConFechaAct: obtenerFechaActual(true), HitConEstado: true, HitConUsuarioId: usuarioId},
        automatico(){
            this.listaHConstruccion();
        },
        listaHConstruccion(){
            loading("init");
            fetch(baseUrl+'APIBEP/GetListaHitos?opcion=hConstruccion&RevBepId='+RevBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.data = response.SDTListaHitos; loading("end");
                    this.$nextTick(() => readOnlyBEP("hconstruccion"));
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista hitos de construcción !"); loading("end");
                });
        },
        guardarHConstruccion(){
            loading("init");
            this.campos.HitConFechaAct = obtenerFechaActual(true);
            this.campos.HitConUsuarioId = usuarioId;
            fetch(baseUrlT+'HitoConstruccion/'+this.campos.HitConId, {
                method: this.campos.HitConId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar hito de construcción");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                notifySuccess("Hito de construcción guardado correctamente !"); loading("end");
                this.listaHConstruccion();
                this.cancelarHConstruccion();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarHConstruccion(){
            this.showNew = false;
            this.campos.HitConNombre = "";
            this.campos.HitConFechaInicio = "";
            this.campos.HitConFechaFin = "";
        },
        async actualizarHConstruccion(item, editar = true){
            if(editar == false){
                if(!await confirmar("Seguro deseas eliminar hito de construcción")) return;
            }else{
                if (item.nombre.trim() == "" || item.fechaInicio == "" || item.fechaFin == "") {
                    notifyError(null, "Ingrese los campos del hito de construcción"); return;
                }
            }
            loading("init");
            const consultaItem = await fetch(baseUrlT+'HitoConstruccion/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.HitConEstado = editar == true ? true : false;
            responseItem.HitConNombre = item.nombre;
            responseItem.HitConFechaInicio = item.fechaInicio;
            responseItem.HitConFechaFin = item.fechaFin;
            responseItem.HitConFechaAct = obtenerFechaActual(true);
            responseItem.HitConUsuarioId = usuarioId;

            fetch(baseUrlT+'HitoConstruccion/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                if(editar == false){
                    notifySuccess("Hito de construcción eliminado correctamente!"); loading("end");
                    this.listaHConstruccion();
                }else{
                    notifySuccess("Hito de construcción editado correctamente!"); loading("end");
                    item.editar = false;
                }
            }).catch(function(error) {
                if(editar == false){
                    notifyError(error, "Error al eliminar Hito de construcción !"); loading("end");
                }else{
                    notifyError(error, "Error al editar Hito de construcción !"); loading("end");
                }
            });
        },
        itemShow(item){
            item.show = !item.show;
        },
        itemEditar(item){
            item.show = true; item.editar = true;
            item.nombreBackup = item.nombre;
            item.fechaInicioBackup = item.fechaInicio;
            item.fechaFinBackup = item.fechaFin;
        },
        cancelarEditar(item){
            item.editar = false;
            item.nombre = item.nombreBackup;
            item.fechaInicio = item.fechaInicioBackup;
            item.fechaFin = item.fechaFinBackup;
        }
    }
}