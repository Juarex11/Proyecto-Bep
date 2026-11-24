/* Utilidades de fechas */

function obtenerFechaActual(hora = false) {
    let today = new Date();
    let year = today.getFullYear();
    let month = String(today.getMonth() + 1).padStart(2, '0');
    let day = String(today.getDate()).padStart(2, '0');
    let fechaActual = year + '-' + month + '-' + day;
    if(hora){
        fechaActual = fechaActual + " " + today.getHours()+":"+today.getMinutes()+":"+today.getSeconds();
    }
    return fechaActual;
}

function obtenerHoraActual(fecha = null) {
    let today = new Date();
    if(fecha !== null){
        today = new Date(fecha);
    }

    let hours = today.getHours();
    let minutes = today.getMinutes();
    let seconds = today.getSeconds();

    let period = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12;

    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    return hours + ":" + minutes + " " + period;
}

function obtenerFechaAmericana(fecha, ShowHora = true) {
    let d = fecha.split("T");
    if (d.length > 1) {
        let date = d[0].split("-");
        let time = d[1].split(":");
        if (date.length > 0) {
            if(ShowHora){
                return `${date[2]}/${date[1]}/${date[0]} ${time[0]}:${time[1]}`;
            }
            return `${date[2]}/${date[1]}/${date[0]}`;
        }
    }else{
        let date = fecha.split("-");
        return `${date[2]}/${date[1]}/${date[0]}`;
    }
    return "00/00/0000";
}

function validarFecha(fecha) {
    if (!fecha || typeof fecha !== 'string') return false;
    const date = new Date(fecha);
    return !isNaN(date.getTime()) && date.getFullYear() > 1000;
}
