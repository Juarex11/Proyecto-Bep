function raci() {
    return {
        data: [], organizaciones: [], leyendaRACI: [], matrizRACI: [], actividades: [], actividadesUncheck: [], listaAgregarMatrizRACI: [], leyendaRaciDetalle: [], listaAgregarDetalleRACI: [], checkAll: true, matrizRaciActivo: {},
        automatico(){
            this.listaMatrizRaci();
            this.listaOrganizaciones();
            this.listaLeyendaRACI();
            this.listaActividadSubActividad();
        },
        listaMatrizRaci(){
            loading("init");
            fetch(baseUrl+'APIBEP/GetListaMatrizRACI?RevBepId='+RevBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.data = response.SDTListaMatrizRACI; loading("end");
                    this.$nextTick(() => readOnlyBEP("raci"));
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Matriz RACI !"); loading("end");
                });
        },
        listaOrganizaciones(){
            fetch(baseUrl+'APIBEP/GetListaMatriz?opcion=organizaciones&RevBepId='+RevBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.organizaciones = response.SDTListaMatriz;
                    this.$nextTick(() => readOnlyBEP("raci"));
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista de Organizaciones !");
                });
        },
        listaLeyendaRACI(){
            fetch(baseUrl+'APIBEP/GetListaMatriz?opcion=leyendaRACI&RevBepId=0', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.leyendaRACI = response.SDTListaMatriz;
                    this.leyendaRaciDetalle = this.leyendaRACI;
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Leyenda RACI !");
                });
        },
        listaActividadSubActividad(){
            fetch(baseUrl+'APIBEP/GetListaMatriz?opcion=subActividades&RevBepId=0', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.actividades = response.SDTListaMatriz;
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Actividades y SubActividades !");
                });
        },
        totalRolRaci(detalle, orgId){
            if (detalle){
                return detalle.filter(item => item.idOrgBep == orgId).length;
            }
            return 0;
        },
        getRolRaci(detalle, orgId){
            if (detalle){
                //return detalle.filter(item => item.idOrgBep == orgId);
                return detalle
                    .filter(item => item.idOrgBep === orgId)
                    .sort((a, b) => a.idLeyRACI - b.idLeyRACI);
            }
            return [];
        },
        totalSubActividades(id){
            return this.data.filter(item => item.idActividad === id).length;
        },
        getActividadesUncheck(){
            const subActividadesRegistradas = new Set(this.data.map(item => item.idSubActividad));
            this.actividadesUncheck = this.actividades
                .map(actividad => {
                    const subactividades = actividad.subactividades || [];
                    const nuevasSubactividades = subactividades.filter(sub => !subActividadesRegistradas.has(sub.id));
                    return {
                        ...actividad,
                        subactividades: nuevasSubactividades
                    };
                })
                .filter(actividad => actividad.subactividades.length > 0);
        },
        agregarSubActividades(){
            this.desmarcarSubActividades();
            this.getActividadesUncheck();
            this.listaAgregarMatrizRACI = [];
            $("#modalSubActividades").modal("show");
        },
        desmarcarSubActividades(){
            this.actividadesUncheck.forEach(item => {
                item.subactividades.forEach(elemento => {
                    $("#sub_" + elemento.id).prop("checked", false);
                });
                $("#act_" + item.id).prop("checked", false);
            });
        },
        checkActividad(item){
            if ($("#act_" + item.id).is(":checked")) {
                item.show = true;
                item.subactividades.forEach(subActividad => {
                    $("#sub_" + subActividad.id).prop("checked", true);
                    this.listaAgregarMatrizRACI.push({
                        idSubActividad: subActividad.id,
                        idActividad: item.id,
                        idRevBep: RevBepId,
                        idUsuario: usuarioId
                    });
                });
            } else {
                item.subactividades.forEach(subActividad => {
                    $("#sub_" + subActividad.id).prop("checked", false);
                    const index = this.listaAgregarMatrizRACI.findIndex(sub => sub.idSubActividad === subActividad.id);
                    if (index >= 0) {
                        this.listaAgregarMatrizRACI.splice(index, 1);
                    }
                });
            }
        },
        checkSubActividad(item, i){
            if ($("#sub_" + i.id).is(":checked")) {
                this.listaAgregarMatrizRACI.push({
                    idSubActividad: i.id,
                    idActividad: item.id,
                    idRevBep: RevBepId,
                    idUsuario: usuarioId
                });
            } else {
                const index = this.listaAgregarMatrizRACI.findIndex(sub => sub.idSubActividad === i.id);
                if (index >= 0) {
                    this.listaAgregarMatrizRACI.splice(index, 1);
                }
            }
            const totalSeleccionados = this.listaAgregarMatrizRACI.filter(sub => sub.idActividad === item.id).length;
            $("#act_" + item.id).prop("checked", totalSeleccionados === item.subactividades.length);
        },
        agregarMatrizRACI(){
            if (this.listaAgregarMatrizRACI.length == 0) {
                notifyError(null, "Por favor, seleccione al menos un proceso."); return;
            }
            loading("init");
            fetch(baseUrl+'APIBEP/PostAgregarMatrizRACI', {
                method: 'POST',
                body: JSON.stringify({SDTAgregarMatrizRACI: this.listaAgregarMatrizRACI}),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Procesos agregados correctamente"); loading("end");
                this.listaMatrizRaci();
                $("#modalSubActividades").modal("hide");
            }).catch(function(error) {
                notifyError(error, "Error guardar Procesos !"); loading("end");
            });
        },
        async eliminarMatrizRACI(id){
            if(!await confirmar("Seguro deseas eliminar Proceso?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrlT+'MatrizRACI/'+id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.MatEstado = false;
            responseItem.MatFechaAct = obtenerFechaActual(true);
            responseItem.MatUsuarioId = usuarioId;

            fetch(baseUrlT+'MatrizRACI/'+id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Proceso eliminado correctamente!"); loading("end");
                this.listaMatrizRaci();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Proceso !"); loading("end");
            });
        },
        agregarDetalleRaci(idMatrizRaci, idOrg, detalle){
            this.matrizRaciActivo = {idMatrizRaci: idMatrizRaci, idOrg: idOrg};
            this.listaAgregarDetalleRACI = [];
            this.desmarcarTodo();
            let rolesSeleccionados = this.getRolRaci(detalle, idOrg);
            rolesSeleccionados.forEach(item => {
                $("#leyRaci_"+item.idLeyRACI).prop("checked", true);
                this.checkLeyRaciDetalle(item.idLeyRACI);
            });
            $("#modalDetalleRaci").modal("show");
        },
        seleccionarTodo(){
            this.checkAll = false;
            this.leyendaRaciDetalle.forEach(item => {
                $("#leyRaci_"+item.id).prop("checked", true);
                this.checkLeyRaciDetalle(item.id);
            });
        },
        desmarcarTodo(){
            this.checkAll = true;
            this.leyendaRaciDetalle.forEach(item => {
                $("#leyRaci_"+item.id).prop("checked", false);
                this.checkLeyRaciDetalle(item.id);
            });
        },
        checkLeyRaciDetalle(idLeyRaci){
            if ($("#leyRaci_" + idLeyRaci).is(":checked")) {
                this.listaAgregarDetalleRACI.push({
                    idMatrizRaci: this.matrizRaciActivo.idMatrizRaci,
                    idLeyRaci: idLeyRaci,
                    idOrgBep: this.matrizRaciActivo.idOrg,
                    idUsuario: usuarioId
                });
            } else {
                const index = this.listaAgregarDetalleRACI.findIndex(det => det.idLeyRaci === idLeyRaci);
                if (index >= 0) {
                    this.listaAgregarDetalleRACI.splice(index, 1);
                }
            }
            if (this.listaAgregarDetalleRACI.length == this.leyendaRaciDetalle.length) {
                this.checkAll = false;
            }else {
                this.checkAll = true;
            }
        },
        guardarLeyRaciDetalle(){
            loading("init");
            fetch(baseUrl+'APIBEP/PostGuardarDetalleRACI', {
                method: 'POST',
                body: JSON.stringify({SDTGuardarDetalleRACI: this.listaAgregarDetalleRACI, MatRaciId: this.matrizRaciActivo.idMatrizRaci, OrgBepId: this.matrizRaciActivo.idOrg}),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Roles agregados correctamente"); loading("end");
                this.listaMatrizRaci();
                $("#modalDetalleRaci").modal("hide");
            }).catch(function(error) {
                notifyError(error, "Error guardar Roles !"); loading("end");
            });
        }

    }
}