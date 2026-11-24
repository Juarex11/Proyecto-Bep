function ereunion() {
    return {
        data: [], organizaciones: [], showNew: false,
        frecuencias: ["Diaria", "Semanal", "Quincenal", "Mensual"],
        plataformas: ["Microsoft Teams", "Zoom", "Google Meet", "Cisco Webex", "Slack", "Otros"],
        duraciones: [{ minuto: 15, descripcion: "15 min" }, { minuto: 30, descripcion: "30 min" }, { minuto: 45, descripcion: "45 min" }, { minuto: 60, descripcion: "1 hora" }, { minuto: 90, descripcion: "1 hora 30 min" }, { minuto: 120, descripcion: "2 horas" }, { minuto: 150, descripcion: "2 horas 30 min" }, { minuto: 180, descripcion: "3 horas" }, { minuto: 240, descripcion: "4 horas" }, { minuto: 300, descripcion: "5 horas" }, { minuto: 360, descripcion: "6 horas" }, { minuto: 480, descripcion: "8 horas" }, { minuto: 720, descripcion: "12 horas" }, { minuto: 1440, descripcion: "24 horas (1 día)" }],
        dias: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
        campos: {ReuBepId: 0, RevBepId: RevBepId, ReuBepNombre: "", ReuBepDescripcion: "", ReuBepPlataforma: "", ReuBepUbicacion: "", ReuBepResponsable: "", ReuBepFrecuencia: "", ReuBepDias: "", ReuBepHora: "", ReuBepMinuto: "", ReuBepDuracion: "", ReuBepInvolucrados: "", ReuBepFecha: obtenerFechaActual(true), ReuBepFechaAct: obtenerFechaActual(true), ReuBepEstado: true, ReuBepUsuarioId: usuarioId},
        automatico(){
            this.listaOrganizaciones();
        },
        listaEReunion(){
            loading("init");
            fetch(baseUrl+'APIBEP/GetListaEComunicacion?opcion=eReunion&RevBepId='+RevBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.data = response.SDTListaEComunicacion; loading("end");
                    this.$nextTick(() => readOnlyBEP("ereunion"));
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista estrategia de reunión !"); loading("end");
                });
        },
        listaOrganizaciones(){
            loading("init");
            fetch(baseUrl+'APIBEP/GetListaMatriz?opcion=organizaciones&RevBepId='+RevBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.organizaciones = response.SDTListaMatriz;
                    this.listaEReunion();
                    this.$nextTick(() => {
                        $("#involucrados").select2({placeholder: "Seleccione"});
                    });
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista de Organizaciones !"); loading("end");
                });
        },
        getInvolucrados(involucrados){
            if (involucrados != "") {
                let ids = JSON.parse(involucrados);
                return this.organizaciones
                    .filter(item => ids.includes(item.id))
                    .map(item => item.nombre)
                    .join(", ");
            }
            return "";
        },
        setInvolucrados(){
            let listaInvolucrados = [];
            let involucrados = $('#involucrados').select2('data');
            involucrados.forEach(item => {
                if (item.id && item.id > 0) {
                    listaInvolucrados.push(item.id);
                }
            });
            return JSON.stringify(listaInvolucrados);
        },
        guardarEReunion(){
            this.campos.ReuBepInvolucrados = this.setInvolucrados();
            let horaMinuto = $("#horaMinuto").val().split(":");
            this.campos.ReuBepHora = horaMinuto[0];
            this.campos.ReuBepMinuto = horaMinuto[1];
            this.campos.ReuBepDias = "";
            this.dias.forEach(item => {
                if ($("#dia_" + item).is(":checked")) {
                    this.campos.ReuBepDias += item+"-"; 
                }
            });
            if (this.campos.ReuBepDias == ""){
                notifyError(null, "Seleccione al menos un día"); return;
            }

            loading("init");
            this.campos.ReuBepFechaAct = obtenerFechaActual(true);
            this.campos.ReuBepUsuarioId = usuarioId;
            fetch(baseUrlT+'ReunionBEP/'+this.campos.ReuBepId, {
                method: this.campos.ReuBepId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar estrategia de reunión");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                if (this.campos.ReuBepId == 0) {
                    notifySuccess("Estrategia de reunión guardada correctamente !"); loading("end");
                }else{
                    notifySuccess("Estrategia de reunión editada correctamente !"); loading("end");
                }
                this.listaEReunion();
                this.cancelarEReunion();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarEReunion(){
            this.showNew = false;
            this.campos = {ReuBepId: 0, RevBepId: RevBepId, ReuBepNombre: "", ReuBepDescripcion: "", ReuBepPlataforma: "", ReuBepUbicacion: "", ReuBepResponsable: "", ReuBepFrecuencia: "", ReuBepDias: "", ReuBepHora: "", ReuBepMinuto: "", ReuBepDuracion: "", ReuBepInvolucrados: "", ReuBepFecha: obtenerFechaActual(true), ReuBepFechaAct: obtenerFechaActual(true), ReuBepEstado: true, ReuBepUsuarioId: usuarioId};
            $("#horaMinuto").val("");
            this.dias.forEach(item => {
               $("#dia_"+item).prop("checked", false); 
            });
            $('#involucrados').val("").trigger('change');
        },
        async editarEReunion(item){
            this.showNew = true;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'ReunionBep/'+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            
            $("#horaMinuto").val(this.campos.ReuBepHora+":"+this.campos.ReuBepMinuto);
            let diasCheck = this.campos.ReuBepDias.split("-");
            diasCheck.forEach(item => {
               $("#dia_"+item).prop("checked", true); 
            });
            if(this.campos.ReuBepInvolucrados !== ""){
                let involucrados = JSON.parse(this.campos.ReuBepInvolucrados);
                $('#involucrados').val(involucrados).trigger('change');
            }
            loading("end");
        },
        async eliminarEReunion(item){
            if(!await confirmar("Seguro deseas eliminar estrategia de reunión ?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrlT+'ReunionBep/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.ReuBepFechaAct = obtenerFechaActual(true);
            responseItem.ReuBepUsuarioId = usuarioId;
            responseItem.ReuBepEstado = false;
            
            fetch(baseUrlT+'ReunionBep/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Estrategia de reunión eliminada correctamente!"); loading("end");
                this.listaEReunion();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar estrategia de reunión !"); loading("end");
            });
        }
    }
}
