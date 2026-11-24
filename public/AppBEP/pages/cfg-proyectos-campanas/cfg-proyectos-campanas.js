function campanas() {
    const vacio = () => ({campanaId: '', companiaId: '', clienteId: '', nombre: '', fechaInicio: '', fechaFin: '', estado: true});
    return {
        data: [], showNew: false, campos: vacio(), pag: {buscar: "", estado: true},
        automatico(){ this.lista(); },
        lista(){
            loading("init");
            fetch(baseUrl+'APIConfigBEP/GetListaCampanas?buscar='+encodeURIComponent(this.pag.buscar)+'&estado='+this.pag.estado, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => { this.data = response.data || []; loading("end"); })
                .catch(function(error) { notifyError(error, "Error al cargar la lista de Proyectos !"); loading("end"); });
        },
        guardar(){
            loading("init");
            fetch(baseUrl+'APIConfigBEP/PostCampanaGuardar', {
                method: 'POST', body: JSON.stringify({...this.campos, estado: this.campos.estado === true || this.campos.estado === 'true'}),
                headers:{'Content-Type': 'application/json'}, redirect: "follow"
            })
            .then(response => response.json())
            .then((response) => {
                loading("end");
                if (!/correctamente/.test(response.mensaje || '')) { notifyError(null, response.mensaje || "No se pudo guardar"); return; }
                notifySuccess("Proyecto guardado correctamente !");
                this.cancelar(); this.lista();
            }).catch(function(error) { notifyError(error); loading("end"); });
        },
        cancelar(){ this.showNew = false; this.campos = vacio(); },
        editar(item){ this.showNew = true; this.campos = {...item}; },
        async eliminar(item){
            if(!await confirmar("Seguro deseas desactivar el Proyecto ?")) return;
            this.campos = {...item, estado: false}; this.guardar();
        }
    }
}
