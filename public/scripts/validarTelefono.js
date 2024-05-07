function validarFormulario() {
    const telefonoInput = document.getElementById('telefono');
    const telefonoError = document.getElementById('telefonoError');
    const telefono = telefonoInput.value.trim();

    // Expresión regular para verificar que solo contiene números
    const numerosRegex = /^\d+$/;

    if (telefono.length !== 10 || !numerosRegex.test(telefono)) {
        telefonoError.textContent = 'El número de teléfono debe tener 10 dígitos y contener solo números.';
        telefonoError.classList.add('alert', 'alert-warning','sm'); // Agrega las clases CSS al div de error
        telefonoError.setAttribute('role', 'alert'); // Agrega el atributo role al div de error
        return false; // Evita que se envíe el formulario
    } else {
        telefonoError.textContent = '';
        telefonoError.classList.remove('alert', 'alert-warning'); // Remueve las clases CSS del div de error
        telefonoError.removeAttribute('role'); // Remueve el atributo role del div de error
        return true; // Permite que se envíe el formulario
    }
}