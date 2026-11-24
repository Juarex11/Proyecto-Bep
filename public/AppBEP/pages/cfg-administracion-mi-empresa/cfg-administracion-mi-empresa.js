// Mi empresa: nombre y logo de la empresa actual (lo cambia su administrador). El logo se ve en el menu superior.
function miEmpresa() {
    return {
        nombre: empresaNombre, tieneLogo: false, logoUrl: '',
        automatico() { this.refrescar(); },
        refrescar() { this.tieneLogo = !!perfilDatos.logo; this.logoUrl = this.tieneLogo ? URL_LOGO() : ''; },
        async subir(ev) {
            const f = ev.target.files[0]; ev.target.value = '';
            if (f && await cambiarLogoEmpresa(f)) this.refrescar();
        },
        async quitar() {
            if (await confirmar('¿Quitar el logo de la empresa?') && await quitarLogoEmpresa()) this.refrescar();
        }
    }
}
