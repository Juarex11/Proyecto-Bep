function configuracion() {
    return {
        automatico(){
            // "Empresas" solo lo ve el superadmin (los demas ni siquiera lo tienen en el menu)
            if (esSuperadmin) document.getElementById('opcion_administracion_empresas').classList.remove('d-none');
            routeTabConfig('proyectos_tipos');
        }
    }
}

iniciarMenuLateral();