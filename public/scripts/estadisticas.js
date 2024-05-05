
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

document.getElementById("generarReportesBtn").addEventListener("click", function() {
    // Obtener los datos de las fechas y el tipo de solicitud
    const tipo = document.getElementById("input_tipo").value;
    const desdeFecha = document.getElementById("input_desde").value;
    const hastaFecha = document.getElementById("input_hasta").value;
    const titulo = document.getElementById("input_titulo").value;
    const nombre = document.getElementById("input_nombre").value;
    const oficio = document.getElementById("input_oficio").value;
    const exp = document.getElementById("input_expediente").value;
    const area = document.getElementById("input_area").value;

    // Enviar los datos al servidor
    fetch('/generarReportes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tipo, desdeFecha, hastaFecha, titulo, nombre, oficio, exp, area })
    })
    .then(response => {
        if (response.ok) {
            // Redirigir a la nueva vista de estadísticas
            window.location.href = '/reportes';
        } else {
            console.error('Error al generar reportes');
        }
    })
    .catch(error => console.error('Error:', error));
});