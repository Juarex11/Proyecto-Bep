function proyecto() {
    return {
        data: [], showNew: false,
        campos: {ObjBepId: 0, RevBepId: RevBepId, ObjBepNombre: "", ObjBepDescripcion: "", ObjBepTipo: "P", ObjBepFecha: obtenerFechaActual(true), ObjBepFechaAct: obtenerFechaActual(true), ObjBepEstado: true, ObjBepUsuarioId: usuarioId},
        automatico(){
            this.listaObjetivosP();
        },
        listaObjetivosP(){
            loading("init");
            fetch(baseUrl+'APIBEP/GetListaObjetivosBEP?opcion=objProyecto&RevBepId='+RevBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.data = response.SDTListaObjetivosBEP; loading("end");
                    this.$nextTick(() => readOnlyBEP("proyecto"));
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista objetivos del proyecto !"); loading("end");
                });
        },
        guardarObjProyecto(){
            if (this.campos.ObjBepNombre.trim() == "") {
                notifyError(null, "Ingrese el nombre del objetivo"); return;
            }
            
            loading("init");
            this.campos.ObjBepFechaAct = obtenerFechaActual(true);
            this.campos.ObjBepUsuarioId = usuarioId;
            fetch(baseUrlT+'ObjetivoBEP/'+this.campos.ObjBepId, {
                method: this.campos.ObjBepId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar Objetivo");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                notifySuccess("Objetivo guardado correctamente !"); loading("end");
                this.listaObjetivosP();
                this.cancelarObjProyecto();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarObjProyecto(){
            this.showNew = false;
            this.campos.ObjBepNombre = "";
            this.campos.ObjBepDescripcion = "";
        },
        async actualizarObjProyecto(item, editar = true){
            if(editar == false){
                if(!await confirmar("Seguro deseas eliminar Objetivo")) return;
            }else{
                if (item.nombre.trim() == "") {
                    notifyError(null, "Ingrese el nombre del objetivo"); return;
                }
            }
            loading("init");
            const consultaItem = await fetch(baseUrlT+'ObjetivoBEP/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.ObjBepEstado = editar == true ? true : false;
            responseItem.ObjBepNombre = item.nombre;
            responseItem.ObjBepDescripcion = item.descripcion;
            responseItem.ObjBepFechaAct = obtenerFechaActual(true);
            responseItem.ObjBepUsuarioId = usuarioId;

            fetch(baseUrlT+'ObjetivoBEP/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                if(editar == false){
                    notifySuccess("Objetivo eliminado correctamente!"); loading("end");
                    this.listaObjetivosP();
                }else{
                    notifySuccess("Objetivo editado correctamente!"); loading("end");
                    item.editar = false;
                }
            }).catch(function(error) {
                if(editar == false){
                    notifyError(error, "Error al eliminar Objetivo !"); loading("end");
                }else{
                    notifyError(error, "Error al editar Objetivo !"); loading("end");
                }
            });
        },
        itemShow(item){
            item.show = !item.show;
        },
        itemEditar(item){
            item.show = true; item.editar = true;
            item.nombreBackup = item.nombre;
            item.descripcionBackup = item.descripcion;
        },
        cancelarEditar(item){
            item.editar = false;
            item.nombre = item.nombreBackup;
            item.descripcion = item.descripcionBackup;
        }
    }
}