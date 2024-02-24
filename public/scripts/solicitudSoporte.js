document.getElementById("fechaSolicitud").textContent = obtenerFechaActual();
                // Función para obtener la fecha actual en formato DD/MM/YYYY
                function obtenerFechaActual() {
                    const fecha = new Date();
                    const dia = String(fecha.getDate()).padStart(2, '0');
                    const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // Los meses comienzan desde 0
                    const año = fecha.getFullYear();
                    return `${dia}/${mes}/${año}`;
                }

                // Agregar para campo para especificar otro equipo
                var otroCheckbox = document.getElementById("otro");
                var otroInput = document.getElementById("otroInput");
                otroCheckbox.addEventListener("change", function () {
                    otroInput.disabled = !otroCheckbox.checked;
                    // Restaurar el valor original del checkbox 'otro' cuando no está marcado
                    if (!otroCheckbox.checked) {
                        otroCheckbox.value = "";
                        otroInput.value = "";
                    }
                });
                otroInput.addEventListener("input", function () {
                    otroCheckbox.value = "Otro " + otroInput.value;
                });