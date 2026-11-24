function home() {
    return {
        data: [], buscar: "", cargado: false, revisiones: [], etapas: [],
        pdf: {NombreBep: "", Cliente: "", Proyecto: "", Tipo: "", Categoria: "", Ubicacion: "", Descripcion: "", Revision: "", Etapas: []},
        // ObjetivosProyecto: [], UsosBim: [], Especialides: [], ContactosClave: [], MatrizRaci: [], LeyendaRaci: [], OrganizacionesRaci: [], HitosConstruccion: [], HitosEntregaInformacion: [], FlujoTrabajo: [], EntornoComunDatos: [], EstrategiaReuniones: [], CanalesComunicacion: []
        automatico(){
            this.listaBEP();
        },
        /** Columnas de la tabla (DataTables, ver js/ui/tablas.js) */
        cols(){
            const fecha = (nombre, f) => bepEsc(nombre) + '<span class="d-block text-body-secondary small">' + bepEsc(obtenerFechaAmericana(f)) + '</span>';
            const cols = [{t: 'BEP', c: 'nombre', cls: 'fw-semibold text-bep'}];
            if (usoBep != 'soloBEP') cols.push({t: 'Proyecto', c: 'proyecto', prioridad: 300});
            cols.push(
                {t: 'Cliente', c: 'cliente', prioridad: 301},
                {t: 'Revisión', c: 'revision', cls: 'text-nowrap', prioridad: 200},
                {t: 'Etapa', prioridad: 150, render: (x) => '<span class="badge rounded-pill bg-primary-subtle text-primary-emphasis fw-medium px-3 py-2">' + bepEsc(x.etapa) + '</span>'},
                {t: 'Creado', prioridad: 400, render: (x) => fecha(x.personal, x.fechaCreada)},
                {t: 'Actualizado', prioridad: 401, render: (x) => fecha(x.usuario, x.fechaActualizada)}
            );
            return cols;
        },
        listaBEP(){
            loading("init");
            ProBepId = 0; RevBepId = 0;
            fetch(baseUrl+'APIBEP/GetListaBEP?buscar='+this.buscar, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.data = response.SDTListaBEP || []; this.cargado = true; loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista BEP !"); this.cargado = true; loading("end");
                });
        },
        verBep(item){
            ProBepId = item.id; RevProId = item.idRevision; RevBepId = item.idEtapa; 
            RevBepIdBase = item.idEtapa; TipoBepId = item.idTipoBep; CampanaNombre = item.proyecto; edicionBep = false;
            irA('bep');
        },
        editarBep(item){
            ProBepId = item.id; RevProId = item.idRevision; RevBepId = item.idEtapa; 
            RevBepIdBase = item.idEtapa; TipoBepId = item.idTipoBep; CampanaNombre = item.proyecto; edicionBep = true;
            irA('bep');
        },
        async eliminarBep(id){
            if(await confirmar("Seguro deseas eliminar BEP")){
                const consultaItem = await fetch(baseUrlT+'ProyectoBEP/'+id, { method: 'GET' });
                const responseItem = await consultaItem.json();
                responseItem.ProBepEstado = false;

                loading("init");
                fetch(baseUrlT+'ProyectoBEP/'+id, {
                    method: 'PUT',
                    body: JSON.stringify(responseItem),
                    headers:{'Content-Type': 'application/json'},
                    redirect: "follow"
                }).then(response => response.json())
                .then((response) => {
                    notifySuccess("BEP eliminado correctamente!"); loading("end");
                    this.listaBEP();
                }).catch(function(error) {
                    notifyError(error, "Error al eliminar BEP !"); loading("end");
                });
            }
        },
        getEtapas(){
            const revision = this.revisiones.find(item => item.id == $("#RevProId").val());
            this.etapas = revision?.etapas ?? [];
        },
        imprimirBep(BepId, nombre){
            loading("init"); ProBepId = BepId;
            fetch(baseUrl+'APIBEP/GetListaRevisionesBEP?ProBepId='+ProBepId+'&ShowFechas=1', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.revisiones = response.SDTListaRevisionesBEP;
                    this.$nextTick(() => this.getEtapas());
                    $("#bepText").text(nombre);
                    $("#modalRevisiones").modal("show"); loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Revisiones BEP !");
                });
        },
        imprimirRevisionEtapa(RevId = null){
            let etapasIds = [];
            if(RevId == null){
                this.etapas.forEach(item => {
                    etapasIds.push(item.id);
                });
            }else{
                etapasIds.push(RevId);
            }

            loading("init");
            fetch('./pages/reporte/reporte.html')
                .then(response => response.text())
                .then(data => {
                    document.getElementById("contentPDF").innerHTML = data;

                    fetch(baseUrl+'APIBEP/PostReporteBEP', {
                        method: 'POST',
                        body: JSON.stringify({ProBepId: ProBepId, RevProId: $("#RevProId").val(), RevBepIds: etapasIds}),
                        headers:{'Content-Type': 'application/json'},
                        redirect: "follow"
                    })
                    .then(response => response.json())
                    .then((response) => {
                        this.pdf = response;
                        this.$nextTick(() => this.generarPDF());
                        //this.$nextTick(() => this.generarHTML2PDF());
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
        generarHTML2PDF() {
            const element = $("#contentPDF");
            element.css({ display: "block" });
            
            let removedXAttrs = [];
            element.find("*").each(function() {
                const el = $(this);
                $.each(this.attributes, function() {
                    if (this.name.startsWith("x-")) {
                        removedXAttrs.push({
                            element: el,
                            name: this.name,
                            value: this.value
                        });

                        el.removeAttr(this.name);
                    }
                });
            });

            html2pdf().set({
                margin: 10,
                filename: this.pdf.NombreBep+'.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, logging: true, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).from(element[0]).outputPdf('datauristring').then(pdfDataUri => {
                //element.css({ display: "none" });

                const pdfWindow = $(window.open('', '_blank'));
                $(pdfWindow[0].document.body).css({ margin: 0, padding: 0, overflow: 'hidden', height: '100vh'});

                const $iframe = $("<iframe>", {
                    src: pdfDataUri, width: '100%', height: '100%', frameborder: 0, css: { border: 'none' }
                });

                $(pdfWindow[0].document.body).append($iframe);
                pdfWindow[0].document.title = this.pdf.NombreBep;

                removedXAttrs.forEach(attr => {
                    attr.element.attr(attr.name, attr.value);
                });
            });
            // .from(element[0]).save(); Descargar PDF
        },
        totalElementos(detalleLOD, id){
            return detalleLOD.filter(item => item.CatEleId === id).length;
        },
        totalSubActividades(etapa, id){
            return etapa.MatrizRaci.filter(item => item.ActId === id).length;
        },
        getRolRaci(detalle, orgId){
            if (detalle){
                return detalle
                    .filter(item => item.OrgId === orgId)
                    .sort((a, b) => a.LeyRaciId - b.LeyRaciId);
            }
            return [];
        },
        getInvolucrados(etapa, involucrados){
            if (involucrados != "") {
                let ids = JSON.parse(involucrados);
                return etapa.OrganizacionesRaci
                    .filter(item => ids.includes(item.Id))
                    .map(item => item.Nombre)
                    .join(", ");
            }
            return "";
        }
    }
}