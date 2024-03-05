function handleCheckboxChange(checkbox) {
    const listaEquiposCheck = document.getElementById('listaEquiposCheck');
    const checkboxValue = checkbox.value;

    if (checkbox.checked) {
        // Si el checkbox se marca, agregar el valor a la cadena
        if (checkbox.id === 'otro2') {
            const otroInputId = checkbox.dataset.inputId;
            const otroInput = document.getElementById(otroInputId);
            listaEquiposCheck.value += (listaEquiposCheck.value ? ',' : '') + checkboxValue + (otroInput.value ? ': ' + otroInput.value : '');
        } else {
            listaEquiposCheck.value += (listaEquiposCheck.value ? ',' : '') + checkboxValue;
        }
    } else {
        // Si el checkbox se desmarca, quitar el valor de la cadena
        listaEquiposCheck.value = listaEquiposCheck.value.replace(checkboxValue, '');
    }
}
function checboxListado(checkbox) {
    const equiposSeleccionados = document.getElementById('equiposSeleccionados');
    const checkboxValue = checkbox.value;

    if (checkbox.checked) {
        // Si el checkbox se marca, agregar el valor a la cadena
        if (checkbox.id === 'otro') {
            const otroInputId = checkbox.dataset.inputId;
            const otroInput = document.getElementById(otroInputId);
            equiposSeleccionados.value += (equiposSeleccionados.value ? ',' : '') + checkboxValue + (otroInput.value ? ': ' + otroInput.value : '');
        } else {
            equiposSeleccionados.value += (equiposSeleccionados.value ? ',' : '') + checkboxValue;
        }
    } else {
        // Si el checkbox se desmarca, quitar el valor de la cadena
        equiposSeleccionados.value = equiposSeleccionados.value.replace(checkboxValue, '');
    }
}