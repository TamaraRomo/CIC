function obtenerCambios() {
    const cambios = [];
    document.querySelectorAll('.cambiarEstado').forEach(select => {
        const nuevoEstado = select.value;
        const folio = select.dataset.folio;
        // Agrega la información al array de cambios solo si el estado ha cambiado
        if (nuevoEstado !== select.dataset.estadoOriginal) {
            cambios.push({
                folio: folio,
                nuevoEstado: nuevoEstado
            });
        }
    });

    return cambios;
}
document.getElementById('guardarCambios').addEventListener('click', function () {
    var cambios = obtenerCambios();
    var totalCambios = cambios.length;

    cambios.forEach(cambio => {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/actualizar-estado', true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.onload = function () {
            if (xhr.status === 200) {
                var response = JSON.parse(xhr.responseText);
                if (response.success) {
                    totalCambios--;

                    // Actualiza el estado en el DOM
                    actualizarEstadoEnDOM(cambio.folio, cambio.nuevoEstado);

                    if (totalCambios === 0) {
                        // Muestra la alerta solo cuando se hayan procesado todas las solicitudes
                        alert('Estado actualizado con éxito');
                        window.location.reload();
                    }
                } else {
                    console.error('Error al actualizar el estado en el servidor');
                }
            } else {
                console.error('Error al enviar la solicitud al servidor');
            }
        };

        xhr.send(JSON.stringify(cambio));
    });

    function actualizarEstadoEnDOM(folio, nuevoEstado) {
        // Actualiza el estado en el DOM en el mismo instante
        var selectElement = document.querySelector(`[data-folio="${folio}"]`);
        selectElement.dataset.estadoOriginal = nuevoEstado;
        // También puedes ajustar otros elementos según sea necesario
    }
});
