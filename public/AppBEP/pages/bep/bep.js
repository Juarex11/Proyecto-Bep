function bep() {
    return {
        revisiones: [], etapas: [], existeBep: ProBepId == 0 ? false : true, inputRevision: false, openDropdown: null,
        campos: {ProBepId: ProBepId, RevProId: RevProId, RevBepId: "", RevBepNombre: "", RevProNombre: ""},
        revision: {ProBepId: ProBepId, RevProIdPadre: 0, RevProNombre: "", RevProFecha: obtenerFechaActual(true), RevProUsuarioId: usuarioId, Etapas: []},
        etapa: {ProBepId: ProBepId, RevBepId: 0, RevBepNombre: "", RevProId: 0, Revision: "", Etapa: ""},
        pdf: {NombreBep: "", ObjetivosProyecto: [], UsosBim: [], Especialides: [], ContactosClave: [], MatrizRaci: [], LeyendaRaci: [], OrganizacionesRaci: [], HitosConstruccion: [], HitosEntregaInformacion: [], FlujoTrabajo: [], EntornoComunDatos: [], EstrategiaReuniones: [], CanalesComunicacion: []},
        automatico(){
            if (this.existeBep) {
                this.getRevisiones();
            }else{
                routeTab('descripcion');
            }
        },
        getRevisiones(){
            fetch(baseUrl+'APIBEP/GetListaRevisionesBEP?ProBepId='+ProBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.revisiones = response.SDTListaRevisionesBEP;
                    this.$nextTick(() => {
                        this.campos.RevProId = parseInt(RevProId);
                        this.getEtapas(); loading("end");
                    });
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Revisiones BEP !");
                });
        },
        crearRevision(){
            this.revision.RevProIdPadre = this.campos.RevProId;
            this.revision.RevProNombre = "";
            this.etapas.forEach(item => {
                $("#etapa_" + item.id).prop("checked", true);
            });
            this.revision.Revision = $('select[name="RevProId"] option:selected').text();
            $("#modalRevision").modal("show");
        },
        guardarRevision(){
            if (this.revision.RevProNombre.trim() == "") {
                notifyError(null, "Ingresar nombre de la Revisión !"); return;
            }
            this.revision.Etapas = [];
            this.etapas.forEach(item => {
                if ($("#etapa_" + item.id).prop("checked")) {
                    this.revision.Etapas.push({ RevBepId: $("#etapa_" + item.id).val(), RevBepNombre: item.nombre });
                }
            });
            if(this.revision.Etapas.length == 0){
                notifyError(null, "Seleccionar al menos una etapa para continuar !"); return;
            }
            
            loading("init");
            fetch(baseUrl+'APIBEP/PostCrearRevision', {
                method: 'POST',
                body: JSON.stringify({SDTCrearRevision: this.revision}),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => response.json())
            .then((response) => {
                let dataRpta = response.mensaje.split("#");
                if(dataRpta.length > 0){
                    RevProId = dataRpta[1];
                }
                notifySuccess("Revisión creada correctamente!");
                $("#modalRevision").modal("hide");
                this.getRevisiones(); loading("end");
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        editarRevision(){
            this.inputRevision = true;
            this.campos.RevProNombre = $('select[name="RevProId"] option:selected').text();
        },
        desactivarEditarRevision(){
            this.inputRevision = false;
        },
        async guardarEditarRevision(){
            if (this.campos.RevProNombre.trim() == "") {
                notifyError(null, "Ingresar nombre de la Revisión !"); return;
            }
            const consultaItem = await fetch(baseUrlT+'RevisionProyecto/'+this.campos.RevProId, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.RevProNombre = this.campos.RevProNombre;
            responseItem.RevProFechaAct = obtenerFechaActual(true);

            loading("init");
            fetch(baseUrlT+'RevisionProyecto/'+this.campos.RevProId, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Revisión actualizada correctamente!");
                this.getRevisiones();
                this.desactivarEditarRevision();
            }).catch(function(error) {
                notifyError(error, "Error al actualizar Revisión !"); loading("end");
            });
        },
        crearEtapa(item){
            this.etapa.RevBepId = item.id;
            this.etapa.RevProId = this.campos.RevProId;
            this.etapa.RevBepNombre = "";
            this.etapa.Etapa = item.nombre;
            this.etapa.Revision = $('select[name="RevProId"] option:selected').text();

            $("#modalEtapa").modal("show");
        },
        getEtapas() {
            this.desactivarEditarRevision();
            const revision = this.revisiones.find(item => item.id == this.campos.RevProId);
            this.etapas = revision?.etapas ?? [];

            if (this.etapas.length === 0) {
                RevBepId = 0; return;
            }
            const etapaExistente = this.etapas.find(item => item.id == RevBepIdBase);
            RevBepId = etapaExistente ? RevBepIdBase : this.etapas[this.etapas.length - 1].id;
            this.$nextTick(() => {
                this.verEtapa(RevBepId);
            });
        },
        verEtapa(id){
            $(".nav-etapa-link").removeClass("active"); $("#tab_etapa_"+id).addClass("active");
            RevBepId = id; RevProId = this.campos.RevProId;
            routeTab('descripcion');
        },
        guardarEtapa(){
            if (this.etapa.RevBepNombre.trim() == "") {
                notifyError(null, "Ingresar nombre de la Nueva Etapa !"); return;
            }

            loading("init");
            fetch(baseUrl+'APIBEP/PostCrearEtapa', {
                method: 'POST',
                body: JSON.stringify(this.etapa),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al crear etapa");}
                return response.json();
            })
            .then((response) => {
                RevBepId = parseInt(response.NewRevBepId); RevBepIdBase = RevBepId;
                notifySuccess("Etapa creada correctamente!"); loading("end");
                $("#modalEtapa").modal("hide"); this.getRevisiones();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        editarEtapa(item){
            this.campos.RevBepId = item.id;
            this.campos.RevBepNombre = item.nombre;
            $("#modalEtapaEditar").modal("show");
        },
        async guardarEditarEtapa(){
            if (this.campos.RevBepNombre.trim() == "") {
                notifyError(null, "Ingresar nombre de la Etapa !"); return;
            }

            loading("init");
            const consultaItem = await fetch(baseUrlT+'RevisionBEP/'+this.campos.RevBepId, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.RevBepNombre = this.campos.RevBepNombre;
            responseItem.RevBepFechaAct = obtenerFechaActual(true);

            fetch(baseUrlT+'RevisionBEP/'+this.campos.RevBepId, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Etapa actualizada correctamente!"); loading("end");
                $("#modalEtapaEditar").modal("hide"); this.getRevisiones();
            }).catch(function(error) {
                notifyError(error, "Error al actualizada Etapa !"); loading("end");
            });
        },
        async eliminarEtapa(item){
            if(await confirmar("¿Seguro eliminar Etapa "+item.nombre+" ?")){
                const consultaItem = await fetch(baseUrlT+'RevisionBEP/'+item.id, { method: 'GET' });
                const responseItem = await consultaItem.json();
                responseItem.RevBepFechaAct = obtenerFechaActual(true);
                responseItem.RevBepEstado = false;

                loading("init");
                fetch(baseUrlT+'RevisionBEP/'+item.id, {
                    method: 'PUT',
                    body: JSON.stringify(responseItem),
                    headers:{'Content-Type': 'application/json'},
                    redirect: "follow"
                }).then(response => response.json())
                .then((response) => {
                    notifySuccess("Etapa eliminada correctamente!"); loading("end");
                    this.getRevisiones();
                }).catch(function(error) {
                    notifyError(error, "Error al eliminar Etapa !"); loading("end");
                });
            }
        },
        imprimirRevision(){
            loading("init");
            fetch('./pages/reporte/reporte.html')
                .then(response => response.text())
                .then(data => {
                    document.getElementById("contentPDF").innerHTML = data;
                    fetch(baseUrl+'APIBEP/GetReporteBEP?&ProBepId='+ProBepId+'&RevBepId='+RevBepId, { cache: 'no-store' })
                        .then(response => response.json())
                        .then((response) => {
                            this.pdf = response;
                            this.$nextTick(() => this.generarPDF());
                            loading("end");
                        }).catch(function(error) {
                            notifyError(error, "Error al generar PDF !"); loading("end");
                        });
                });
        },
        generarPDF() {
            const content = document.getElementById('contentPDF').innerHTML;
            let iframe = document.getElementById('iframePDF');
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.style.cssText = 'position:absolute;width:0;height:0;border:0';
                iframe.id = 'iframePDF';
                document.body.appendChild(iframe);
            }
            const doc = iframe.contentWindow.document;

            doc.open();
            doc.write(`
                <html>
                    <head>
                        <title>Imprimir Bep</title>
                        <link rel="stylesheet" href="./css/bootstrap.min.css">
                        <link rel="stylesheet" href="./css/style.css">
                        <style>
                            @media print {
                                @page { size: A4; margin: 10mm; }
                                body { -webkit-print-color-adjust: exact; margin: 0; }
                            }
                        </style>
                    </head>
                    <body>${content}</body>
                </html>
            `);
            doc.close();

            iframe.onload = () => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            };
        },
        totalElementos(detalleLOD, id){
            return detalleLOD.filter(item => item.CatEleId === id).length;
        },
        totalSubActividades(id){
            return this.pdf.MatrizRaci.filter(item => item.ActId === id).length;
        },
        getRolRaci(detalle, orgId){
            if (detalle){
                return detalle
                    .filter(item => item.OrgId === orgId)
                    .sort((a, b) => a.LeyRaciId - b.LeyRaciId);
            }
            return [];
        },
        getInvolucrados(involucrados){
            if (involucrados != "") {
                let ids = JSON.parse(involucrados);
                return this.pdf.OrganizacionesRaci
                    .filter(item => ids.includes(item.Id))
                    .map(item => item.Nombre)
                    .join(", ");
            }
            return "";
        }
    }
}

iniciarMenuLateral();

document.addEventListener('show.bs.dropdown', function (event) {
    document.querySelectorAll('.dropdown-menu.show').forEach(function (menu) {
        let btn = menu.parentElement.querySelector('[data-bs-toggle="dropdown"]');

        if (btn && btn !== event.relatedTarget) {
            let instance = bootstrap.Dropdown.getInstance(btn);
            if (instance) {
                instance.hide();
            }
        }
    });
});