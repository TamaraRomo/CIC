function buscarFolio() {
    // Obtén el folio ingresado por el usuario
    console.log('Función buscarFolio llamada.');
    var folioSolicitud = document.getElementById('folioSolicitudDictamen').value;

    // Realiza una solicitud AJAX al servidor para obtener la información del folio
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/obtener-informacion-folio/' + folioSolicitud, true);

    xhr.onload = function () {
        if (xhr.status === 200) {
            console.log('Respuesta del servidor recibida:');
        console.log(xhr.responseText);
            // Procesa la respuesta del servidor
            var data = JSON.parse(xhr.responseText);

            // Rellena los campos con la información obtenida
            document.getElementById('identificadorVale').value = data.idVale;
            document.getElementById('marcaEquipo').value = data.MarcaEquipo;
            document.getElementById('modeloEquipo').value = data.ModeloEquipo;
            document.getElementById('noSerieEquipo').value = data.NoSerieEquipo;
            // Puedes seguir rellenando otros campos según tu estructura de datos
        } else {
            // Maneja posibles errores
            console.error('Error al obtener la información del folio');
        }
    };
    console.log('Enviando solicitud para el folio: ' + folioSolicitud);
    xhr.send();
}