function alcance() {
    return {
        data: [], especialidades: [], especialidadesUncheck: [], listaAgregarEspecialidad: [], leyendaLOD: [], detalleLOD: [], categorias: [], categoriasUncheck: [], listaAgregarDetalleLOD: [], checkAll: true, listaAgregarDetalleLOI: [],
        EspBepIdActivo: 0, EspIdActivo: 0, DetLodIdActivo: 0,
        Plantilla: {PlaBepId: 0, PlaBepNombre: "", TipoBepId: TipoBepId, PlaBepFecha: obtenerFechaActual(true), PlaBepFechaAct: obtenerFechaActual(true), PlaBepEstado: true, PlaBepUsuarioId: usuarioId, RevBepId: RevBepId, ProBepId: ProBepId},
        automatico(){
            this.listaEspecialidadesBep(); 
            this.listaEspecialidades();
            this.listaLeyendaLOD();
        },
        listaEspecialidadesBep(){
            loading("init");
            fetch(baseUrl+'APIBEP/GetListaAlcanceBEP?opcion=especialidadesBEP&RevBepId='+RevBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.data = response.SDTListaAlcanceBEP; loading("end");
                    if (this.data.length > 0) {
                        this.EspBepIdActivo = this.data[0].id;
                        this.EspIdActivo = this.data[0].idEspecialidad;
                        this.$nextTick(() => {
                            this.listaAlcanceLOD(this.EspBepIdActivo, this.EspIdActivo);
                        });
                    }else {
                        this.EspBepIdActivo = 0;
                        this.EspIdActivo = 0;
                        this.detalleLOD = [];
                    }
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Especialidades Bep !"); loading("end");
                });
        },
        listaEspecialidades(){
            fetch(baseUrl+'APIBEP/GetListaAlcanceBEP?opcion=especialidades&RevBepId=0&parametro='+TipoBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.especialidades = response.SDTListaAlcanceBEP;
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Especialidades !");
                });
        },
        listaLeyendaLOD(){
            fetch(baseUrl+'APIBEP/GetListaAlcanceBEP?opcion=leyendaLOD&RevBepId=0', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.leyendaLOD = response.SDTListaAlcanceBEP;
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Leyenda LOD !");
                });
        },
        listaAlcanceLOD(id, espId){
            $(".card-bep").removeClass("card-activo");
            $("#esPCard_"+id).addClass("card-activo");
            this.EspBepIdActivo = id;
            this.EspIdActivo = espId;
            this.detalleLOD = [];
            loading("init");
            fetch(baseUrl+'APIBEP/GetListaAlcanceLOD?EspBepId='+id, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.detalleLOD = response.SDTListaAlcanceLOD;
                    this.$nextTick(() => readOnlyBEP("alcance")); loading("end");

                    /*
                    this.$nextTick(() => {
                        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                        tooltipTriggerList.forEach(el => new bootstrap.Tooltip(el));
                    });*/
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Detalle LOD !");
                });
        },
        totalElementos(id){
            return this.detalleLOD.filter(item => item.idCategoria === id).length;
        },
        seleccionarTodo(){
            this.checkAll = false;
            this.especialidadesUncheck.forEach(item => {
                $("#esP_"+item.id).prop("checked", true);
                this.checkEspecialidad(item);
            });
        },
        desmarcarTodo(){
            this.checkAll = true;
            this.especialidadesUncheck.forEach(item => {
                $("#esP_"+item.id).prop("checked", false);
                this.checkEspecialidad(item);
            });
        },
        getEspecialidadesUncheck(){
            this.especialidadesUncheck = this.especialidades.filter(uso => 
                !this.data.some(d => d.idEspecialidad === uso.id)
            );
        },
        agregarEspecialidades(){
            this.getEspecialidadesUncheck();
            this.listaAgregarEspecialidad = [];
            $("#modalEspecialidades").modal("show");
        },
        cerrarEspecialidades(){
            this.desmarcarTodo();
            $("#modalEspecialidades").modal("hide");
        },
        checkEspecialidad(item) {
            const index = this.listaAgregarEspecialidad.findIndex(uso => uso.idEspecialidad === item.id);
            if (index !== -1) {
                this.listaAgregarEspecialidad.splice(index, 1);
            } else {
                this.listaAgregarEspecialidad.push({
                    idEspecialidad: item.id,
                    idRevision: RevBepId,
                    idUsuario: usuarioId
                });
            }
            if (this.listaAgregarEspecialidad.length == 0) {
                this.checkAll = true;
            }
        },
        guardarEspecialidadesBEP(){
            if (this.listaAgregarEspecialidad.length == 0) {
                notifyError(null, "Por favor, seleccione una especialidad para guardar."); return;
            }
            loading("init");
            fetch(baseUrl+'APIBEP/PostAgregarEspecialidadBEP', {
                method: 'POST',
                body: JSON.stringify({SDTAgregarEspecialidadBEP: this.listaAgregarEspecialidad}),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Especialidades agregados correctamente"); loading("end");
                this.desmarcarTodo();
                this.listaEspecialidadesBep();
                $("#modalEspecialidades").modal("hide");
            }).catch(function(error) {
                notifyError(error, "Error guardar Especialidades !"); loading("end");
            });
        },
        async eliminarEspecialidadBep(item){
            if(!await confirmar("Seguro deseas eliminar Especialidad")) return;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'EspecialidadBEP/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.EspBepEstado = false;
            responseItem.EspBepFechaAct = obtenerFechaActual(true);
            responseItem.EspBepUsuarioId = usuarioId;

            fetch(baseUrlT+'EspecialidadBEP/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Especialidad eliminada correctamente!"); loading("end");
                this.listaEspecialidadesBep();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Especialidad !"); loading("end");
            });
        },
        getCategoriasUncheck() {
            const elementosRegistrados = new Set(
                this.detalleLOD.map(item => item.idElemento)
            );
            
            this.categoriasUncheck = this.categorias
                .map(categoria => {
                    const elementos = categoria.elementos || [];
                    const nuevosElementos = elementos.filter(
                        el => !elementosRegistrados.has(el.id)
                    );

                    return {
                        ...categoria,
                        elementos: nuevosElementos
                    };
                })
                .filter(categoria => categoria.elementos.length > 0);
        },
        /*

        getCategoriasUncheck(){
            const elementosRegistrados = new Set(this.detalleLOD.map(item => item.idElemento));
            this.categoriasUncheck = this.categorias
                .map(categoria => {
                    const nuevosElementos = categoria.elementos.filter(el => !elementosRegistrados.has(el.id));
                    return {
                        ...categoria,
                        elementos: nuevosElementos
                    };
                })
                .filter(categoria => categoria.elementos.length > 0);
        },*/
        agregarElementos(){
            loading("init"); this.categorias = [];
            fetch(baseUrl+'APIBEP/GetListaAlcanceBEP?opcion=categoriaElementos&RevBepId=0&EspId='+this.EspIdActivo, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.categorias = response.SDTListaAlcanceBEP;

                    this.desmarcarElementos();
                    this.getCategoriasUncheck();
                    this.listaAgregarDetalleLOD = [];
                    $("#modalElementos").modal("show"); loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista Categorías y Elementos !"); loading("end");
                });
        },
        desmarcarElementos(){
            this.categoriasUncheck.forEach(item => {
                item.elementos.forEach(elemento => {
                    $("#ele_" + elemento.id).prop("checked", false);
                });
                $("#cat_" + item.id).prop("checked", false);
            });
        },
        checkCategoria(item){
            if ($("#cat_" + item.id).is(":checked")) {
                item.show = true;
                item.elementos.forEach(elemento => {
                    $("#ele_" + elemento.id).prop("checked", true);
                    this.listaAgregarDetalleLOD.push({
                        idElemento: elemento.id,
                        idCategoria: item.id,
                        idEspBep: this.EspBepIdActivo,
                        idUsuario: usuarioId
                    });
                });
            } else {
                item.elementos.forEach(elemento => {
                    $("#ele_" + elemento.id).prop("checked", false);
                    const index = this.listaAgregarDetalleLOD.findIndex(ele => ele.idElemento === elemento.id);
                    if (index >= 0) {
                        this.listaAgregarDetalleLOD.splice(index, 1);
                    }
                });
            }
        },
        checkElemento(item, i){
            if ($("#ele_" + i.id).is(":checked")) {
                this.listaAgregarDetalleLOD.push({
                    idElemento: i.id,
                    idCategoria: item.id,
                    idEspBep: this.EspBepIdActivo,
                    idUsuario: usuarioId
                });
            } else {
                const index = this.listaAgregarDetalleLOD.findIndex(ele => ele.idElemento === i.id);
                if (index >= 0) {
                    this.listaAgregarDetalleLOD.splice(index, 1);
                }
            }
            const totalSeleccionados = this.listaAgregarDetalleLOD.filter(ele => ele.idCategoria === item.id).length;
            $("#cat_" + item.id).prop("checked", totalSeleccionados === item.elementos.length);
        },
        checkLOD(item){
            const valorLOD = $('input[name="lod-'+item.idDetLod+'"]:checked').val();
            if (item.idLOD == valorLOD) {
                $('input[name="lod-'+item.idDetLod+'"]:checked').prop("checked", false);
                item.idLOD = 0;
            }else{
                item.idLOD = valorLOD;
            }
        },
        agregarDetalleLOD(){
            if (this.listaAgregarDetalleLOD.length == 0) {
                notifyError(null, "Por favor, seleccione al menos un elemento."); return;
            }
            loading("init");
            fetch(baseUrl+'APIBEP/PostAgregarDetalleLOD', {
                method: 'POST',
                body: JSON.stringify({SDTAgregarDetalleLOD: this.listaAgregarDetalleLOD}),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Elementos agregados correctamente"); loading("end");
                this.listaAlcanceLOD(this.EspBepIdActivo, this.EspIdActivo);
                $("#modalElementos").modal("hide");
            }).catch(function(error) {
                notifyError(error, "Error guardar Elementos !"); loading("end");
            });
        },
        guardarDetalleLOD(){
            this.detalleLOD.forEach(item =>{
                item.idUsuario = usuarioId;
            });
            loading("init");
            fetch(baseUrl+'APIBEP/PostGuardarDetalleLOD', {
                method: 'POST',
                body: JSON.stringify({SDTListaAlcanceLOD: this.detalleLOD}),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Alcance guardado correctamente"); loading("end");
                this.listaAlcanceLOD(this.EspBepIdActivo, this.EspIdActivo);
            }).catch(function(error) {
                notifyError(error, "Error guardar Alcance !"); loading("end");
            });
        },
        async eliminarDetalleLOD(id, index){
            if(!await confirmar("Seguro deseas eliminar Elemento?")) return;

            loading("init");            
            fetch(baseUrl+'APIBEP/PostActualizarDetalleLOD', {
                method: 'POST',
                body: JSON.stringify({DetLodId: id, UsuarioId: usuarioId}),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Elemento eliminado correctamente!"); loading("end");
                this.detalleLOD.splice(index, 1); 
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Elemento !"); loading("end");
            });
        },
        buscarParametroLOI(){
            $("#parametros").select2({
                dropdownParent: $("#modalDetalleLOI"),
                placeholder: "Seleccione o agregue nuevos parámetros",
                tags: true,
                ajax: {
                    url: baseUrl + 'APIBEP/GetListaAlcanceBEP',
                    dataType: 'json',
                    delay: 250,
                    data: function (params) {
                        return {
                            opcion: 'parametroLOI',
                            parametro: params.term
                        };
                    },
                    processResults: function (data) {
                        return {
                            results: data.SDTListaAlcanceBEP.map(item => ({
                                id: item.id,
                                text: item.nombre
                            }))
                        };
                    },
                    cache: false
                }
            });
        },
        agregarDetalleLOI(item){
            this.DetLodIdActivo = item.idDetLod;
            $("#parametros").empty();
            if(item.parametrosLOI){
                item.parametrosLOI.forEach(param => {
                    const option = new Option(param.nombreParLoi, param.idParLoi, true, true);
                    $("#parametros").append(option);
                });
            }
            this.buscarParametroLOI();
            $("#modalDetalleLOI").modal("show");
        },
        guardarDetalleLOI(){
            this.listaAgregarDetalleLOI = [];
            let datosSeleccionados = $('#parametros').select2('data');
            /*
            if (datosSeleccionados.length == 0) {
                notifyError(null, "Seleccione al menos un parámetro !"); return;
            }*/
            datosSeleccionados.forEach(item => {
                this.listaAgregarDetalleLOI.push(
                    {
                        ParLoiId: item.id == item.text ? 0 : item.id,
                        ParLoiNombre: item.text,
                        DetLodId: this.DetLodIdActivo,
                        RevBepId: RevBepId,
                        UsuarioId: usuarioId
                    }
                )
            });

            loading("init");
            fetch(baseUrl+'APIBEP/PostAgregarDetalleLOI', {
                method: 'POST',
                body: JSON.stringify({SDTAgregarDetalleLOI: this.listaAgregarDetalleLOI, DetLodId: this.DetLodIdActivo}),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Parámetros LOI guardados correctamente"); loading("end");
                $("#modalDetalleLOI").modal("hide");
                this.listaAlcanceLOD(this.EspBepIdActivo, this.EspIdActivo);
            }).catch(function(error) {
                notifyError(error, "Error guardar Parámetros LOI !"); loading("end");
            });
        },
        crearPlantilla(){
            this.Plantilla.PlaBepNombre = "";
            $("#modalPlantilla").modal("show");
        },
        guardarPlantilla(){
            if (this.Plantilla.PlaBepNombre.trim() == "") {
                notifyError(null, "Por favor, ingrese un nombre a la Plantilla."); return;
            }

            loading("init");
            fetch(baseUrl+'APIBEP/PostGuardarPlantilla', {
                method: 'POST',
                body: JSON.stringify({SDTGuardarPlantilla: this.Plantilla}),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Plantilla guardada correctamente"); loading("end");
                $("#modalPlantilla").modal("hide");
            }).catch(function(error) {
                notifyError(error, "Error guardar Plantilla BEP !"); loading("end");
            });
        }
    }
}