function handleCheckboxChange(checkbox) {
    const equiposSeleccionados = document.getElementById('equiposSeleccionados');
    const checkboxValue = checkbox.value;

    if (checkbox.checked) {
        // Si el checkbox se marca, agregar el valor a la cadena
        equiposSeleccionados.value += (equiposSeleccionados.value ? ',' : '') + checkboxValue;
    } else {
        // Si el checkbox se desmarca, quitar el valor de la cadena
        equiposSeleccionados.value = equiposSeleccionados.value.replace(checkboxValue, '');
    }
}