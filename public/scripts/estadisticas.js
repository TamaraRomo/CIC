
document.getElementById("generarEstadisticasBtn").addEventListener("click", function() {
    // Obtener los datos de las fechas y el tipo de solicitud
    const tipo = document.getElementById("input_tipo").value;
    const desdeFecha = document.getElementById("input_desde").value;
    const hastaFecha = document.getElementById("input_hasta").value;

    // Enviar los datos al servidor
    fetch('/generarEstadisticas', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tipo, desdeFecha, hastaFecha })
    })
    .then(response => {
        if (response.ok) {
            // Redirigir a la nueva vista de estadísticas
            window.location.href = '/estadisticas';
        } else {
            console.error('Error al generar estadísticas');
        }
    })
    .catch(error => console.error('Error:', error));
});