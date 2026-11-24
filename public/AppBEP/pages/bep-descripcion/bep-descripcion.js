//Se está utilizando los camposEtapa
function descripcion() {
    return {
        campos: {ProBepId: 0, RevProId: 0, RevBepId: 0, ProBepNombre: "", RevProNombre: "Versión Base", RevBepNombre: "Pre BEP", RevProOrganizacionId: 0, RevProCampanaId: 0, RevProCompaniaId: 0, RevProClienteId: 0, RevProTipoId: 0, RevProCategoriaId: 0, RevProUbicacion: "", RevProPlantillaId: 0, RevProDescripcion: "", FechaCreacion: obtenerFechaActual(true), FechaActualizacion: obtenerFechaActual(true), PersonalId: personalId, UsuarioId: usuarioId},
        camposGen: {RevProTipoIdAnt: 0, RevProPlantillaIdAnt: 0, AplicaRegistroDefault: true},
        camposDefault: {ProBepId: 0, RevProId: 0, RevBepId: 0, TipoBepId: 0, PlaBepId: 0, UsuarioId: usuarioId, BepNuevo: true, FormaRegistro: "", Fecha: obtenerFechaActual(true)},
        infoBEP: {campanas:[], tipos:[], organizaciones:[]}, categorias: [], plantillas: [], proyectos: [],
        automatico(){
            this.informacion();
            this.buscarProyectos();
            readOnlyBEP("descripcion");
        },
        informacion(){
            loading("init");
            fetch(baseUrl+'APIBEP/GetInfoBEP?opcion=datos', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.infoBEP = response;
                    ProBepId != 0 ? this.getInfoBep() : loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar información BEP !"); loading("end");
                });
        },
        buscarProyectos() {
            $("#campana").select2({
                placeholder: "Seleccionar",
                allowClear: true,
                ajax: {
                    url: baseUrl + 'APIBEP/GetInfoBEP',
                    dataType: 'json',
                    delay: 250,
                    data: function (params) {
                        return {
                            opcion: 'proyectos',
                            buscar: params.term
                        };
                    },
                    processResults: function (data) {
                        let resultados = [];
                        if (data && Array.isArray(data.campanas)) {
                            resultados = data.campanas.map(item => ({
                                id: item.campanaId + '#' + item.companiaId + '#' + item.clienteId,
                                text: item.campanaNombre
                            }));
                        }
                        return {
                            results: resultados
                        };
                    }
                }
            });
        },
        getInfoBep(){
            fetch(baseUrl+'APIBEP/GetInformacionBEP?ProBepId='+ProBepId+'&RevProId='+RevProId+'&RevBepId='+RevBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.campos = response; loading("end");

                    CampanaId = response.RevProCampanaId; 
                    CompaniaId = response.RevProCompaniaId; 
                    ClienteId = response.RevProClienteId;
                    let campana = response.RevProCampanaId + '#' + response.RevProCompaniaId + '#' + response.RevProClienteId;
                    if(campana == "##"){
                        $("#campana").val(null).trigger("change");
                    }else{
                        $('#campana').append('<option value="'+campana+'">'+response.CampanaNombre+'</option>').val(campana).trigger('change');
                    }
                    this.camposGen.RevProTipoIdAnt = response.RevProTipoId;
                    this.camposGen.RevProPlantillaIdAnt = response.RevProPlantillaId;

                    this.getCategoriasPlantillas(true);
                    // las opciones de Clase y Plantilla se dibujan despues de cargar la lista y Alpine no vuelve a marcar el valor ya guardado:
                    // se espera a que existan las opciones y se vuelve a fijar el valor (pasando por vacio para que el select se actualice)
                    const cat = parseInt(this.campos.RevProCategoriaId), pla = parseInt(this.campos.RevProPlantillaId);
                    this.campos.RevProCategoriaId = ''; this.campos.RevProPlantillaId = '';
                    this.$nextTick(() => this.$nextTick(() => {
                        this.campos.RevProCategoriaId = cat;
                        this.campos.RevProPlantillaId = pla;
                    }));
                    $("[name='RevProTipoId']").prop("disabled", true);
                    $("[name='RevProCategoriaId']").prop("disabled", true);
                    $("[name='RevProPlantillaId']").prop("disabled", true);
                }).catch(function(error) {
                    notifyError(error, "Error cargar información BEP !"); loading("end");
                });
        },
        getCategoriasPlantillas(edit = false){
            this.categorias = [];
            this.plantillas = [];
            if (!edit) {
                this.campos.RevProCategoriaId = 0;
                this.campos.RevProPlantillaId = 0;
            }
            if (this.infoBEP.tipos){
                let tipo = this.infoBEP.tipos.filter(item => item.id == this.campos.RevProTipoId);
                if (tipo.length > 0) {
                    this.categorias = tipo[0].categorias;
                    this.plantillas = tipo[0].plantillas;
                }
            }
        },
        async guardarBEP() {
            if (RevBepId == 0) {
                this.camposDefault.BepNuevo = true;
                this.camposGen.AplicaRegistroDefault = true;
            }else{
                this.camposDefault.BepNuevo = false;
                this.camposGen.AplicaRegistroDefault = false;
                if (this.campos.RevProTipoId != this.camposGen.RevProTipoIdAnt) {
                    if(!await confirmar("Seguro deseas cambiar el Tipo?")) return;
                    this.camposGen.AplicaRegistroDefault = true;
                }else if (this.campos.RevProPlantillaId != this.camposGen.RevProPlantillaIdAnt) {
                    if(!await confirmar("Seguro deseas cambiar la Plantilla?")) return;
                    this.camposGen.AplicaRegistroDefault = true;
                }
            }
            let campana = $("#campana").val().split("#");
            if (campana.length > 0) {
                CampanaId = campana[0]; CompaniaId = campana[1]; ClienteId = campana[2];
                this.campos.RevProCampanaId = CampanaId;
                this.campos.RevProCompaniaId = CompaniaId;
                this.campos.RevProClienteId = ClienteId;
                CampanaNombre = $("#campana option:selected").text();
            }

            loading("init");
            this.campos.FechaActualizacion = obtenerFechaActual(true);
            this.campos.UsuarioId = usuarioId;
            fetch(baseUrl+'APIBEP/PostGuardarBEP', {
                method: 'POST',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar BEP");}
                return response.json();
            })
            .then((response) => {
                let datosBep = response.mensaje.split("#");
                ProBepId = datosBep[0]; RevProId = datosBep[1]; RevBepId = datosBep[2]; TipoBepId = this.campos.RevProTipoId;
                
                if (this.camposGen.AplicaRegistroDefault == true) {
                    this.guardarDefault();
                }else{
                    notifySuccess("BEP Guardado correctamente"); loading("end");
                    if(this.camposDefault.BepNuevo == true){
                        irA('bep');
                    }
                }
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        guardarDefault(){
            this.camposDefault.ProBepId = ProBepId;
            this.camposDefault.RevProId = RevProId;
            this.camposDefault.RevBepId = RevBepId;
            this.camposDefault.TipoBepId = TipoBepId;
            this.camposDefault.PlaBepId = this.campos.RevProPlantillaId;
            this.camposDefault.FormaRegistro = "Plantilla";
            if (this.campos.RevProPlantillaId == 0) {
                this.camposDefault.FormaRegistro = "TipoBep";
            }
            this.camposDefault.Fecha = obtenerFechaActual(true);
            fetch(baseUrl+'APIBEP/PostRegistroDefaultBEP', {
                method: 'POST',
                body: JSON.stringify({SDTRegistroDefaultBEP: this.camposDefault}),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => response.json())
            .then((response) => {
                notifySuccess("BEP Guardado correctamente"); loading("end");
                irA('bep');
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        }
    }
}

