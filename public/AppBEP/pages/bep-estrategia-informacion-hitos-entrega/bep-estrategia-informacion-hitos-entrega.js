function hentrega() {
    return {
        data: [], showNew: false, organizaciones: [], showGantt: false,
        campos: {EntInfId: 0, RevBepId: RevBepId, OrgBepId: "", EntInfNombre: "", EntInfFechaInicio: "", EntInfFechaEntrega:"", EntInfFecha: obtenerFechaActual(true), EntInfFechaAct: obtenerFechaActual(true), EntInfEstado: true, EntInfUsuarioId: usuarioId},
        fechaInicioGantt: "", fechaFinGantt: "", aniosGantt: [], semanasGantt:[], 
        meses:["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"],
        popover: {show: false, top: 0, left: 0, fechaentrega: "", organizacion:""},
        automatico(){
            this.listaHEntrega();
            this.listaOrganizaciones();
            this.infoProyecto();
        },
        listaHEntrega(){
            loading("init");
            fetch(baseUrl+'APIBEP/GetListaHitos?opcion=hEntrega&RevBepId='+RevBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.data = response.SDTListaHitos; loading("end");
                    this.$nextTick(() => readOnlyBEP("hentrega"));
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista hitos de entrega de información !"); loading("end");
                });
        },
        listaOrganizaciones(){
            fetch(baseUrl+'APIBEP/GetListaHitos?opcion=organizaciones&RevBepId='+RevBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.organizaciones = response.SDTListaHitos;
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista organizaciones !"); 
                });
        },
        infoProyecto(){
            if(usoBep == "soloBEP") return;
            fetch(baseUrl+'APIBEP/GetInfoProyecto?CampanaId='+CampanaId+'&CompaniaId='+CompaniaId+'&ClienteId='+ClienteId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.fechaInicioGantt = response.CampanaFechaInicio;
                    this.fechaFinGantt = response.CampanaFechaFin;
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista organizaciones !"); 
                });
        },
        guardarHEntrega(){
            if(usoBep == "soloBEP") {
                if (this.fechaInicioGantt == "0000-00-00T00:00:00" || this.fechaFinGantt == "0000-00-00T00:00:00") {
                    notifyError(null, "No se ha seleccionado un Proyecto o rango de fechas incorrectas.");
                    return;
                }
                if (this.validarFechaEntrega(this.campos.EntInfFechaEntrega) == false) {
                    notifyError(null, "Error en la fecha: la fecha de entrega está fuera del rango del Proyecto.");
                    return;
                }
            }
            loading("init");
            this.campos.EntInfFechaAct = obtenerFechaActual(true);
            this.campos.EntInfUsuarioId = usuarioId;
            fetch(baseUrlT+'EntregableInformacion/'+this.campos.EntInfId, {
                method: this.campos.EntInfId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar hito de entrega de información");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                notifySuccess("Hito de entrega de información guardado correctamente !"); loading("end");
                this.listaHEntrega();
                this.cancelarHEntrega();
                if (this.showGantt){
                    this.verGantt();
                }
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarHEntrega(){
            this.showNew = false;
            this.campos.EntInfNombre = "";
            this.campos.OrgBepId = ""; 
            this.campos.EntInfFechaEntrega = "";
        },
        async actualizarHEntrega(item, editar = true){
            if(editar == false){
                if(!await confirmar("Seguro deseas eliminar hito de entrega de información")) return;
            }else{
                if (this.fechaInicioGantt == "0000-00-00T00:00:00" || this.fechaFinGantt == "0000-00-00T00:00:00") {
                    notifyError(null, "No se ha seleccionado un Proyecto o rango de fechas incorrectas.");
                    return;
                }

                if (item.nombre.trim() == "" || item.orgId == "" || item.fechaEntrega == "") {
                    notifyError(null, "Ingrese los campos del hito de entrega de información"); return;
                }
                if (this.validarFechaEntrega(item.fechaEntrega) == false) {
                    notifyError(null, "Error en la fecha: la fecha de entrega está fuera del rango del Proyecto.");
                    return;
                }
            }
            loading("init");
            const consultaItem = await fetch(baseUrlT+'EntregableInformacion/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.EntInfEstado = editar == true ? true : false;
            responseItem.EntInfNombre = item.nombre;
            responseItem.OrgBepId = item.orgId;
            responseItem.EntInfFechaEntrega = item.fechaEntrega;
            responseItem.EntInfFechaAct = obtenerFechaActual(true);
            responseItem.EntInfUsuarioId = usuarioId;

            fetch(baseUrlT+'EntregableInformacion/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                if(editar == false){
                    notifySuccess("Hito de entrega de información eliminado correctamente!"); loading("end");
                }else{
                    notifySuccess("Hito de entrega de información editado correctamente!"); loading("end");
                    item.editar = false;
                }
                this.listaHEntrega();
            }).catch(function(error) {
                if(editar == false){
                    notifyError(error, "Error al eliminar Hito de entrega de información !"); loading("end");
                }else{
                    notifyError(error, "Error al editar Hito de entrega de información !"); loading("end");
                }
            });
        },
        validarFechaEntrega(fecha){
            const fechaEntrega = new Date(fecha + "T00:00:00");
            const fechaInicio = new Date(this.fechaInicioGantt);
            const fechaFin = new Date(this.fechaFinGantt);

            fechaEntrega.setHours(0, 0, 0, 0);
            fechaInicio.setHours(0, 0, 0, 0);
            fechaFin.setHours(0, 0, 0, 0);
            if (fechaEntrega < fechaInicio || fechaEntrega > fechaFin) {
                return false;
            }
            return true;
        },
        itemShow(item){
            item.show = !item.show;
        },
        itemEditar(item){
            item.orgId = parseInt(item.orgId);
            item.show = true; item.editar = true;
            item.nombreBackup = item.nombre;
            item.orgIdBackup = item.orgId;
            item.fechaEntregaBackup = item.fechaEntrega;
        },
        cancelarEditar(item){
            item.editar = false;
            item.nombre = item.nombreBackup;
            item.orgId = item.orgIdBackup; 
            item.fechaEntrega = item.fechaEntregaBackup;
        },
        verLista(){
            $(".btn-lista").addClass("btn-active-orange");
            $(".btn-gantt").removeClass("btn-active-orange");
            this.showGantt = false;
            this.$nextTick(() => readOnlyBEP("hentrega"));
        },
        verGantt(){
            $(".btn-lista").removeClass("btn-active-orange");
            $(".btn-gantt").addClass("btn-active-orange");
            this.showGantt = true;
            this.rangoFechasGantt();
        },
        rangoFechasGantt() {
            this.aniosGantt = [];
            let fechaMinima = new Date(this.fechaInicioGantt);
            let fechaMaxima = new Date(this.fechaFinGantt);

            fechaMinima.setHours(0, 0, 0, 0);
            fechaMaxima.setHours(0, 0, 0, 0);

            // Ajuste: fecha mínima al lunes anterior
            const diaSemana = fechaMinima.getDay();
            const diferencia = (diaSemana === 0) ? 6 : diaSemana - 1;
            fechaMinima.setDate(fechaMinima.getDate() - diferencia);

            // Ajuste: fecha máxima al domingo siguiente
            const diaFin = fechaMaxima.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
            const diferenciaFin = (diaFin === 0) ? 0 : 7 - diaFin;
            fechaMaxima.setDate(fechaMaxima.getDate() + diferenciaFin);

            while (fechaMinima <= fechaMaxima) {
                const anio = fechaMinima.getFullYear();

                let anioData = this.aniosGantt.find(a => a.anio === anio);
                if (!anioData) {
                    anioData = { anio, semanas: [] };
                    this.aniosGantt.push(anioData);
                }

                const inicioSemana = new Date(fechaMinima);
                const finSemana = new Date(fechaMinima);
                finSemana.setDate(finSemana.getDate() + 6);

                if (finSemana > fechaMaxima) finSemana.setTime(fechaMaxima.getTime());

                const numeroSemana = anioData.semanas.length + 1;
                const diaInicio = inicioSemana.getDate().toString().padStart(2, '0');
                const mesInicio = this.meses[inicioSemana.getMonth()];
                const diaFin = finSemana.getDate().toString().padStart(2, '0');
                const mesFin = this.meses[finSemana.getMonth()];

                const semana = {
                    semana: `Semana ${numeroSemana}`,
                    inicio: inicioSemana.toISOString().split("T")[0],
                    fin: finSemana.toISOString().split("T")[0],
                    descripcion: `${diaInicio} ${mesInicio} - ${diaFin} ${mesFin}`
                };

                anioData.semanas.push(semana);
                fechaMinima.setDate(fechaMinima.getDate() + 7);
            }
            this.semanasGantt = this.aniosGantt.flatMap(anio => anio.semanas);
        },
        leftGantt(fechainicio) {
            const indexSemana = this.positionWeek(fechainicio);
            if (indexSemana === -1) return 0;
            let left = (indexSemana / this.semanasGantt.length) * 100;
            return left + 2;
        },
        positionWeek(fecha){
            const fechaBuscar = new Date(fecha + "T00:00:00Z");
            return this.semanasGantt.findIndex(semana => {
                const inicio = new Date(semana.inicio);
                const fin = new Date(semana.fin);

                const fechaUTC = Date.UTC(fechaBuscar.getUTCFullYear(), fechaBuscar.getUTCMonth(), fechaBuscar.getUTCDate());
                const inicioUTC = Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate());
                const finUTC = Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), fin.getUTCDate());

                return fechaUTC >= inicioUTC && fechaUTC <= finUTC;
            });
        },
        showPopoverGantt(event, item){
            this.popover.show = true;
            this.popover.left = event.pageX - 50;
            this.popover.top = event.pageY - 65;
            this.popover.fechaentrega = obtenerFechaAmericana(item.fechaEntrega);
            this.popover.organizacion = item.orgNombre;
        }
    }
}