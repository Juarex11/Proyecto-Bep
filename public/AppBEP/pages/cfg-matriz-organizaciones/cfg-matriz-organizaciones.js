function organizaciones() {
    return {
        data: [], showNew: false,
        campos: {OrgBepId: 0, OrgBepNombre: "", OrgBepTipo: "", OrgBepFecha: obtenerFechaActual(true), OrgBepFechaAct: obtenerFechaActual(true), OrgBepEstado: true, OrgBepUsuarioId: usuarioId}, 
        pag: {buscar: "", tipoOrg: 0, estado: true, anterior: 0, siguiente: 0, inicio:0},
        tiposOrganizaciones: [
            {id: 1, nombre: "Propietario/Desarrollador"},
            {id: 2, nombre: "Contratista General"},
            {id: 3, nombre: "Subcontratista/Proveedor"},
            {id: 4, nombre: "Estudio de Arquitectura"},
            {id: 5, nombre: "Proyectista de Estructuras"},
            {id: 6, nombre: "Proyectista MEP"},
            {id: 7, nombre: "Otro"}
        ],
        automatico(){
            this.listaOrganizaciones();
        },
        listaOrganizaciones(inicio = 0){
            this.pag.inicio = inicio < 9 ? 0 : inicio;
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetListaOrganizaciones?buscar='+this.pag.buscar+'&tipoOrg='+this.pag.tipoOrg+'&estado='+this.pag.estado+'&inicio='+this.pag.inicio+'&todos=1', { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.pag.siguiente = response.siguiente;
                    this.pag.anterior = response.anterior;
                    this.data = response.data; loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista de Organizaciones del proyecto !"); loading("end");
                });
        },
        guardarOrganizacion(){
            loading("init");
            fetch(baseUrlT+'OrganizacionBEP/'+this.campos.OrgBepId, {
                method: this.campos.OrgBepId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar Organización");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                if (this.campos.OrgBepId == 0) {
                    notifySuccess("Organización guardada correctamente !"); loading("end");
                    this.listaOrganizaciones();
                }else{
                    notifySuccess("Organización editada correctamente !"); loading("end");
                    this.listaOrganizaciones(this.pag.inicio);
                }
                this.cancelarOrganizacion();
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarOrganizacion(){
            this.showNew = false;
            this.campos = {OrgBepId: 0, OrgBepNombre: "", OrgBepTipo: "", OrgBepFecha: obtenerFechaActual(true), OrgBepFechaAct: obtenerFechaActual(true), OrgBepEstado: true, OrgBepUsuarioId: usuarioId};
        },
        async editarOrganizacion(item){
            this.showNew = true;
            loading("init");
            const consultaItem = await fetch(baseUrlT+'OrganizacionBEP/'+item.id, { method: 'GET' });
            this.campos = await consultaItem.json();
            loading("end");
        },
        async eliminarOrganizacion(item){
            if(!await confirmar("Seguro deseas eliminar Organización ?")) return;

            loading("init");
            const consultaItem = await fetch(baseUrlT+'OrganizacionBEP/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.OrgBepEstado = false;
            
            fetch(baseUrlT+'OrganizacionBEP/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                notifySuccess("Organización eliminada correctamente!"); loading("end");
                this.listaOrganizaciones();
            }).catch(function(error) {
                notifyError(error, "Error al eliminar Organización !"); loading("end");
            });
        },
        getTipoOrganizacion(idTipoOrg){
            const tipo = this.tiposOrganizaciones.find(e => e.id == idTipoOrg);
            return tipo ? tipo.nombre : "-";
        }
    }
}