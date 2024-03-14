document.addEventListener('DOMContentLoaded', () => {
    // Leer el valor del estado seleccionado del select al cargar la página
    const selectElements = document.querySelectorAll('.form-select');
    let estadoSeleccionado;

    selectElements.forEach(selectElement => {
        estadoSeleccionado = selectElement.value;
    });

    // Guardar el estado seleccionado en el almacenamiento local
    localStorage.setItem('estadoSeleccionado', estadoSeleccionado);
    
    // Evento de clic para guardar cambios
    const guardarCambiosButton = document.getElementById('guardarCambios');
    guardarCambiosButton.addEventListener('click', () => {
        const selectElements = document.querySelectorAll('.form-select');

        selectElements.forEach(selectElement => {
            const nuevoEstado = selectElement.value;
            const folioSolicitud = selectElement.dataset.folio;

            fetch('/actualizarEstadoSolicitud', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    folioSolicitud: folioSolicitud,
                    nuevoEstado: nuevoEstado
                })
            })
            .then(response => {
                if (response.ok) {
                    // Si la respuesta es exitosa, mostrar el AlertSweet
                    return response.text();
                } else {
                    throw new Error('Error al actualizar el estado de la solicitud');
                }
            })
            .then(message => {
                // Mostrar el AlertSweet con el mensaje recibido
                Swal.fire({
                    title: 'Estado de la solicitud',
                    text: '¡Cambio de estado realizado exitosamente!',
                    icon: 'success',
                    showConfirmButton: false,
                    timer: 2000
                });
            })
            .catch(error => {
                console.error('Error al enviar la solicitud:', error);
                // Mostrar un mensaje de error en caso de problemas con la solicitud
                Swal.fire({
                    title: 'Error',
                    text: 'Hubo un problema al actualizar el estado de la solicitud',
                    icon: 'error',
                    showConfirmButton: false,
                    timer: 2000
                });
            });
        });
    });
});
