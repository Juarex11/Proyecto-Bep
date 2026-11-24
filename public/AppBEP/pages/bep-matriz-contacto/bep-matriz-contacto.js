function contacto() {
    return {
        data: [], roles: [], showNew: false,
        campos: {ConBepId: 0, RevBepId: RevBepId, RolBepId: 0, OrgBepId: 0, RolBepNombre: "", OrgBepNombre: "", ConBepPersonalId: "", ConBepPermiso: 0, ConBepFecha: obtenerFechaActual(true), ConBepFechaAct: obtenerFechaActual(true), ConBepEstado: true, ConBepUsuarioId: usuarioId, nombres: "", apellidos: "", correo: "", telefono: "", OrgBepTipo: 7},
        automatico(){
            this.listaContactosBep();
            this.listaRolesBep();
            this.buscarPersonal();
            this.buscarOrganizacion();
        },
        listaContactosBep(){
            loading("init");
            fetch(baseUrl+'APIBEP/GetListaContactosBEP?opcion=contactoBEP&RevBepId='+RevBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.data = response.SDTListaContactosBEP; loading("end");
                    this.$nextTick(() => readOnlyBEP("contacto"));
                }).catch(function(error) {
                    notifyError(error, "Error al cargar contactos clave !"); loading("end");
                });
        },
        listaRolesBep(){
            fetch(baseUrl+'APIBEP/GetListaContactosBEP?opcion=rolBEP&RevBepId=0', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.roles = response.SDTListaContactosBEP;
                }).catch(function(error) {
                    notifyError(error, "Error al cargar roles !");
                });
        },
        buscarPersonal() { 
            $("#correo").select2({
                tags: true,
                ajax: {
                    url: baseUrl + 'APIBEP/GetInfoPersonal',
                    dataType: 'json',
                    delay: 250,
                    data: function (params) {
                        return {
                            opcion: 'listaCorreo',
                            parametro: params.term
                        };
                    },
                    processResults: function (data) {
                        return {
                            results: data.SDTInfoPersonal.map(item => ({
                                id: item.id,
                                text: item.correo,
                                nombres: item.nombres,
                                apellidos: item.apellidos,
                                telefono: item.telefono
                            }))
                        };
                    },
                    cache: true
                },
                minimumInputLength: 0
            })
            .on('select2:select', (e) => {
                //console.log(e.params.data);
                this.campos.correo = e.params.data.text;
                $("#correo").val(this.campos.correo);
                if (e.params.data.id == e.params.data.text) {
                    this.campos.ConBepPersonalId = "";
                    this.campos.nombres = "";
                    this.campos.apellidos = "";
                    this.campos.telefono = "";
                }else{
                    this.campos.ConBepPersonalId = e.params.data.id;
                    this.campos.nombres = e.params.data.nombres;
                    this.campos.apellidos = e.params.data.apellidos;
                    this.campos.telefono = e.params.data.telefono;
                }
            });
        },
        buscarOrganizacion() {
            $("#OrgBepId").select2({
                tags: true,
                ajax: {
                    url: baseUrl + 'APIBEP/GetListaContactosBEP',
                    dataType: 'json',
                    delay: 250,
                    data: function (params) {
                        return {
                            opcion: 'organizacionBEP',
                            RevBepId: 0,
                            parametro: params.term
                        };
                    },
                    processResults: function (data) {
                        return {
                            results: data.SDTListaContactosBEP.map(item => ({
                                id: item.id,
                                text: item.descripcion
                            }))
                        };
                    },
                    cache: true
                },
                minimumInputLength: 0
            })
            .on('select2:select', (e) => {
                this.campos.OrgBepId = e.params.data.id;
                this.campos.OrgBepNombre = e.params.data.text;
                $("#OrgBepId").val(this.campos.OrgBepId);
                if (e.params.data.id == e.params.data.text) {
                    this.campos.OrgBepId = "0"; 
                    $("#OrgBepId").val("0");
                }
            });
        },
        buscarOrganizacionEditar(id) {
            $("#OrgBepId_"+id).select2({
                tags: true,
                ajax: {
                    url: baseUrl + 'APIBEP/GetListaContactosBEP',
                    dataType: 'json',
                    delay: 250,
                    data: function (params) {
                        return {
                            opcion: 'organizacionBEP',
                            RevBepId: 0,
                            parametro: params.term
                        };
                    },
                    processResults: function (data) {
                        return {
                            results: data.SDTListaContactosBEP.map(item => ({
                                id: item.id,
                                text: item.descripcion
                            }))
                        };
                    },
                    cache: true
                },
                minimumInputLength: 0
            })
            .on('select2:select', (e) => {
                $("#orgId_"+id).val(e.params.data.id);
                $("#orgNombre_"+id).val(e.params.data.text);
                if (e.params.data.id == e.params.data.text) {
                    $("#orgId_"+id).val("0");
                }
            });
        },
        guardarContactoBep(){
            const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!regexCorreo.test(this.campos.correo)) {
                notifyError(null, "Por favor, ingrese un correo válido !"); return false;
            }
            
            loading("init");
            this.campos.ConBepFechaAct = obtenerFechaActual(true);
            this.campos.ConBepUsuarioId = usuarioId;
            fetch(baseUrl+'APIBEP/PostAgregarContactoBEP', {
                method: 'POST',
                body: JSON.stringify({SDTAgregarContactoBEP: this.campos}),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => response.json())
            .then((response) => {
                if (response.mensaje == "Existe"){
                    notifyError(null, "El contacto ya existe !"); loading("end");
                }else{
                    notifySuccess("Contacto guardado correctamente!");
                    this.cancelarContacto(); this.listaContactosBep();
                }
            }).catch(function(error) {
                notifyError(error, "Error al guardar contacto clave !"); loading("end");
            });
        },
        itemEditar(item){
            this.buscarOrganizacionEditar(item.id);
            item.editar = true;
            item.rolId = parseInt(item.rolId);
            item.nombresBackup = item.nombres;
            item.apellidosBackup = item.apellidos;
            item.rolIdBackup = item.rolId;
            item.permisoBackup = item.permiso;
            item.telefonoBackup = item.telefono;
        },
        cancelarEditar(item){
            $("#OrgBepId_"+item.id).append(new Option(item.orgNombre, item.orgId, true, true)).trigger("change");
            $("#OrgBepId_"+item.id).select2('destroy');
            item.editar = false;
            item.nombres = item.nombresBackup;
            item.apellidos = item.apellidosBackup;
            item.rolId = item.rolIdBackup;
            item.permiso = item.permisoBackup;
            item.telefono = item.telefonoBackup;
        },
        cancelarContacto(){
            this.showNew = false;
            $('#correo').val('').trigger('change');
            $('#OrgBepId').val('').trigger('change');
            this.campos = {ConBepId: 0, RevBepId: RevBepId, RolBepId: 0, OrgBepId: 0, RolBepNombre: "", OrgBepNombre: "", ConBepPersonalId: "", ConBepPermiso: 0, ConBepFecha: obtenerFechaActual(true), ConBepFechaAct: obtenerFechaActual(true), ConBepEstado: true, ConBepUsuarioId: usuarioId, nombres: "", apellidos: "", correo: "", telefono: "", OrgBepTipo: 7};
        },
        actualizarContacto(item){
            let camposAct = {ConBepId: item.id, RevBepId: RevBepId, RolBepId: item.rolId, OrgBepId: $("#orgId_"+item.id).val(), RolBepNombre: item.rolNombre, OrgBepNombre: $("#orgNombre_"+item.id).val(), ConBepPersonalId: item.refId, ConBepPermiso: item.permiso, ConBepFecha: obtenerFechaActual(true), ConBepFechaAct: obtenerFechaActual(true), ConBepEstado: true, ConBepUsuarioId: usuarioId, nombres: item.nombres, apellidos: item.apellidos, correo: item.correo, telefono: item.telefono};
            if (item.nombres == "" || item.apellidos == "") {
                notifyError(null, "Por favor, ingresar nombres y apellidos"); return;
            }
            loading("init");
            fetch(baseUrl+'APIBEP/PostAgregarContactoBEP', {
                method: 'POST',
                body: JSON.stringify({SDTAgregarContactoBEP: camposAct}),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => response.json())
            .then((response) => {
                if (response.mensaje == "Existe"){
                    notifyError(null, "El contacto ya existe !"); loading("end");
                }else{
                    $("#OrgBepId_" + item.id).select2('destroy');
                    notifySuccess("Contacto actualizado correctamente!");
                    this.cancelarContacto(); this.listaContactosBep();
                }                
            }).catch(function(error) {
                notifyError(error, "Error al actualizar contacto clave !"); loading("end");
            });
        },
        async eliminarContacto(item){
            if(!await confirmar("Seguro deseas eliminar contacto clave ?")) return;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'ContactoBEP/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.ConBepEstado = false;
            responseItem.ConBepUsuarioId = usuarioId;
            responseItem.ConBepFechaAct = obtenerFechaActual(true);

            fetch(baseUrlT+'ContactoBEP/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Contacto eliminado correctamente!"); loading("end");
                this.listaContactosBep();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar contacto clave !"); loading("end");
            });
        }
    }
}
