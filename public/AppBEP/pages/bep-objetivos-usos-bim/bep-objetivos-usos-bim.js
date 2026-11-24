function usosBim() {
    return {
        data: [], usosBim: [], usosBimUncheck: [], tabCrear: false, listaAgregarUsoBim: [], checkAll: true,
        automatico(){
            this.listaUsosBimBep(); 
            this.listaUsosBim();
        },
        listaUsosBimBep(){
            loading("init");
            fetch(baseUrl+'APIBEP/GetListaObjetivosBEP?opcion=usosBimBEP&RevBepId='+RevBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.data = response.SDTListaObjetivosBEP; loading("end");
                    this.$nextTick(() => readOnlyBEP("usosBim"));
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Usos Bim Bep !"); loading("end");
                });
        },
        listaUsosBim(){
            fetch(baseUrl+'APIBEP/GetListaObjetivosBEP?opcion=usosBim&RevBepId='+RevBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.usosBim = response.SDTListaObjetivosBEP;
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Usos Bim !");
                });
        },
        seleccionarTodo(){
            this.checkAll = false;
            this.usosBimUncheck.forEach(item => {
                $("#uB_"+item.id).prop("checked", true);
                this.checkUsoBim(item);
            });
        },
        desmarcarTodo(){
            this.checkAll = true;
            this.usosBimUncheck.forEach(item => {
                $("#uB_"+item.id).prop("checked", false);
                this.checkUsoBim(item);
            });
        },
        getUsosBimUncheck(){
            this.usosBimUncheck = this.usosBim.filter(uso => 
                !this.data.some(d => d.idUsoBim === uso.id)
            );
        },
        agregarUsosBim(){
            this.getUsosBimUncheck();
            this.listaAgregarUsoBim = [];
            $("#UsoBimBepNombre").val("");
            $("#modalUsosBim").modal("show");
        },
        checkUsoBim(item) {
            const index = this.listaAgregarUsoBim.findIndex(uso => uso.idUsoBim === item.id);
            if (index !== -1) {
                this.listaAgregarUsoBim.splice(index, 1);
            } else {
                this.listaAgregarUsoBim.push({
                    idUsoBim: item.id,
                    nombreUsoBim: item.nombre,
                    descripcionUsoBim: item.descripcion,
                    idRevision: RevBepId,
                    idUsuario: usuarioId
                });
            }
            if (this.listaAgregarUsoBim.length == 0) {
                this.checkAll = true;
            }
        },
        guardarUsoBim(){
            if (this.tabCrear && $("#UsoBimBepNombre").val().trim() == "") {
                notifyError(null, "Ingrese el nombre del Uso Bim"); return;
            }
            if ($("#UsoBimBepNombre").val().trim() !== "") {
                this.listaAgregarUsoBim.push({
                    idUsoBim: 0,
                    nombreUsoBim: $("#UsoBimBepNombre").val(),
                    descripcionUsoBim: "",
                    idRevision: RevBepId,
                    idUsuario: usuarioId
                });
            }
            if (this.listaAgregarUsoBim.length == 0) {
                notifyError(null, "Por favor, seleccione un uso BIM para guardar."); return;
            }
            loading("init");
            fetch(baseUrl+'APIBEP/PostAgregarUsoBimBEP', {
                method: 'POST',
                body: JSON.stringify({SDTAgregarUsoBimBEP: this.listaAgregarUsoBim}),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Usos BIM agregados correctamente"); loading("end");
                this.desmarcarTodo();
                this.listaUsosBimBep();
                $("#modalUsosBim").modal("hide");
            }).catch(function(error) {
                notifyError(error, "Error guardar Usos BIM !"); loading("end");
            });
        },
        itemEditar(item){
            item.editar = true;
            item.nombreBackup = item.nombre;
        },
        cancelarEditar(item){
            item.editar = false;
            item.nombre = item.nombreBackup;
        },
        async actualizarUsoBimBep(item, editar = true){
            if(editar == false){
                if(!await confirmar("Seguro deseas eliminar Uso BIM")) return;
            }else{
                if (item.nombre.trim() == "") {
                    notifyError(null, "Ingrese el Uso BIM"); return;
                }
            }
            loading("init");
            const consultaItem = await fetch(baseUrlT+'UsoBIMBEP/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.UsoBimBepEstado = editar == true ? true : false;
            responseItem.UsoBimBepNombre = item.nombre;
            responseItem.UsoBimBepFechaAct = obtenerFechaActual(true);
            responseItem.UsoBimBepUsuarioId = usuarioId;

            fetch(baseUrlT+'UsoBIMBEP/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                if(editar == false){
                    notifySuccess("Uso Bim eliminado correctamente!"); loading("end");
                    this.listaUsosBimBep();
                }else{
                    notifySuccess("Uso Bim editado correctamente!"); loading("end");
                    item.editar = false;
                }
            }).catch(function(error) {
                if(editar == false){
                    notifyError(error, "Error al eliminar Uso Bim !"); loading("end");
                }else{
                    notifyError(error, "Error al editar Uso Bim !"); loading("end");
                }
            });
        },
    }
}