function fTrabajo() {
    return {
        data: [], showNew: false, archivos: [], newFiles: [], recursoId: 0,
        campos: {RecId: 0, RevBepId: RevBepId, RecNombre: "", RecDescripcion: "", RecUrl: "", RecTipo: "URL", RecPersonalId: personalId, RecFecha: obtenerFechaActual(true), RecFechaAct: obtenerFechaActual(true), RecEstado: true, RecUsuarioId: usuarioId},
        automatico(){
            this.listaFTrabajo();
        },
        listaFTrabajo(){
            loading("init");
            fetch(baseUrl+'APIBEP/GetListaRecursos?RevBepId='+RevBepId, { cache: 'no-store' })
                .then(response => response.json())
                .then((response) => {
                    this.data = response.SDTListaRecursos; loading("end");
                    this.$nextTick(() => readOnlyBEP("fTrabajo"));
                }).catch(function(error) {
                    notifyError(error, "Error cargar lista recursos !"); loading("end");
                });
        },
        guardarFTrabajo(){
            loading("init");
            this.campos.RecFechaAct = obtenerFechaActual(true);
            fetch(baseUrlT+'Recurso/'+this.campos.RecId, {
                method: this.campos.RecId == 0 ? 'POST' : 'PUT',
                body: JSON.stringify(this.campos),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            })
            .then(response => {
                if (response.status > 300) { throw new Error("Error al guardar flujo de trabajo");}
                return response.json();
            })
            .then((response) => {
                this.campos.gx_md5_hash = response.gx_md5_hash;
                this.subirArchivos(response.RecId);
            }).catch(function(error) {
                notifyError(error); loading("end");
            });
        },
        cancelarFTrabajo(){
            this.showNew = false;
            this.campos.RecNombre = "";
            this.campos.RecUrl = "";
            $("#file").val("");
        },
        async actualizarFTrabajo(item, editar = true){
            if(editar == false){
                if(!await confirmar("Seguro deseas eliminar flujo de trabajo")) return;
            }else{
                if (item.nombre.trim() == "" || item.url == "") {
                    notifyError(null, "Ingrese los campos del flujo de trabajo"); return;
                }
            }
            loading("init");
            const consultaItem = await fetch(baseUrlT+'Recurso/'+item.id, { method: 'GET' });
            const responseItem = await consultaItem.json();
            responseItem.RecEstado = editar == true ? true : false;
            responseItem.RecNombre = item.nombre;
            responseItem.RecUrl = item.url;
            responseItem.RecFechaAct = obtenerFechaActual(true);
            responseItem.RecUsuarioId = usuarioId;

            fetch(baseUrlT+'Recurso/'+item.id, {
                method: 'PUT',
                body: JSON.stringify(responseItem),
                headers:{'Content-Type': 'application/json'},
                redirect: "follow"
            }).then(response => response.json())
            .then((response) => {
                if(editar == false){
                    notifySuccess("Flujo de trabajo eliminado correctamente!"); loading("end");
                    this.listaFTrabajo();
                }else{
                    notifySuccess("Flujo de trabajo editado correctamente!"); loading("end");
                    item.editar = false;
                }
            }).catch(function(error) {
                if(editar == false){
                    notifyError(error, "Error al eliminar Flujo de trabajo !"); loading("end");
                }else{
                    notifyError(error, "Error al editar Flujo de trabajo !"); loading("end");
                }
            });
        },
        itemShow(item){
            item.show = !item.show;
        },
        itemEditar(item){
            item.show = true; item.editar = true;
            item.nombreBackup = item.nombre;
            item.urlBackup = item.url;
        },
        cancelarEditar(item){
            item.editar = false;
            item.nombre = item.nombreBackup;
            item.url = item.urlBackup;
        },
        subirArchivos(recursoId){
            const input = document.getElementById("file");
            const archivos = input.files;

            const promesas = [];
            for (let i = 0; i < archivos.length; i++) {
                const file = archivos[i];

                promesas.push(new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const base64String = event.target.result.split(",")[1];
                        const tipo = file.type ? file.type : file.name.split('.').pop();
                        const kb = file.size / 1024;
                        const pesoKB = kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;

                        resolve({
                            id: 0,
                            idRecurso: recursoId,
                            idRevision: RevBepId,
                            nombre: recursoId+"_"+file.name,
                            tipo: tipo,
                            peso: pesoKB,
                            fileBlob: base64String,
                            usuarioId: usuarioId
                        });
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                }));
            }

            Promise.all(promesas)
                .then(SDTSubirArchivo => {
                    return fetch(baseUrl + 'APIBEP/PostSubirArchivo', {
                        method: 'POST',
                        body: JSON.stringify({ SDTSubirArchivo: SDTSubirArchivo, RecursoId: 0 }),
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
                .then(response => response.json())
                .then(response => {
                    notifySuccess("Flujo de trabajo guardado correctamente !"); loading("end");
                    this.listaFTrabajo();
                    this.cancelarFTrabajo();
                })
                .catch(error => {
                    notifyError(error, "Error al subir archivos!"); loading("end");
                });
        },
        subirArchivo(){
            const input = document.getElementById("file");
            const file = input.files[0];

            const reader = new FileReader();
            reader.onload = function(event) {
                const base64String = event.target.result.split(",")[1];
                const body = {archivo: file.name, fileBlob: base64String};
                
                fetch(baseUrl+'APIBEP/PostSubirArchivo', {
                    method: 'POST',
                    body: JSON.stringify(body),
                    headers:{'Content-Type': 'application/json'},
                }).then(response => response.json())
                .then((response) => {
                    notifySuccess("Archivo subido correctamente!"); loading("end");
                }).catch(function(error) {
                    notifyError(error, "Error al subir archivo!"); loading("end");
                });
            };
            reader.readAsDataURL(file);
        },
        verArchivos(item){
            this.recursoId = item.id;
            this.archivos = []; this.newFiles = [];
            if (item.archivos){
                this.archivos = [...item.archivos];
            }
            this.$nextTick(() => readOnlyBEP("fTrabajo"));
            $("#modalArchivos").modal("show");
        },
        quitarArchivo(index) {
            this.archivos.splice(index, 1);
        },
        handleFiles(event) {
            const selectedFiles = Array.from(event.target.files);

            selectedFiles.forEach(file => {
                const exists = this.newFiles.some(existingFile =>
                    existingFile.name === file.name && existingFile.size === file.size
                );

                if (!exists) {
                    const reader = new FileReader();

                    reader.onload = (e) => {
                        const base64String = e.target.result.split(",")[1];

                        this.newFiles.push({
                            file: file,
                            base64: base64String
                        });
                    };

                    reader.readAsDataURL(file);
                }
            });
            event.target.value = '';
        },
        removeFile(index) {
            this.newFiles.splice(index, 1);
        },
        formatSize(size) {
            const kb = size / 1024;
            if (kb < 1024) return `${kb.toFixed(1)} KB`;
            return `${(kb / 1024).toFixed(1)} MB`;
        },
        getFileURL(file) {
            return URL.createObjectURL(file);
        },
        actualizarArchivos(){
            let SDTArchivos = [];
            this.archivos.forEach(item => {
                SDTArchivos.push(
                    {
                        id: item.id,
                        idRecurso: this.recursoId,
                        idRevision: RevBepId,
                        nombre: item.nombre,
                        tipo: item.tipo,
                        peso: item.peso,
                        fileBlob: "",
                        usuarioId: usuarioId
                    }
                );
            });
            this.newFiles.forEach(item => {
                SDTArchivos.push(
                    {
                        id: 0,
                        idRecurso: this.recursoId,
                        idRevision: RevBepId,
                        nombre: this.recursoId+"_"+item.file.name,
                        tipo: item.file.type,
                        peso: this.formatSize(item.file.size),
                        fileBlob: item.base64,
                        usuarioId: usuarioId
                    }
                );
            });
            loading("init");
            fetch(baseUrl + 'APIBEP/PostSubirArchivo', {
                method: 'POST',
                body: JSON.stringify({ SDTSubirArchivo: SDTArchivos, RecursoId: this.recursoId }),
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => response.json())
            .then((response) => {
                notifySuccess("Archivos actualizados correctamente!"); loading("end");
                $("#modalArchivos").modal("hide");
                this.listaFTrabajo();
            }).catch(function(error) {
                notifyError(error, "Error al actualizar archivos !"); loading("end");
            });
        }
    }
}