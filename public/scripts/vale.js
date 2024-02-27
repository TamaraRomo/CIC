var otroCheckbox = document.getElementById("otro2");
                var otroInput = document.getElementById("otroInput2");
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