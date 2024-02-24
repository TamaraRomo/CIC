function addRow() {
    const table = document.getElementById('solicitudesTable');
    const newRow = table.insertRow(-1);

    const fechaCell = newRow.insertCell(0);
    const fechaInput = document.createElement('input');
    fechaInput.type = 'text';
    fechaCell.appendChild(fechaInput);

    const horaCell = newRow.insertCell(1);
    const horaInput = document.createElement('input');
    horaInput.type = 'text';
    horaCell.appendChild(horaInput);

    const folioCell = newRow.insertCell(2);
    const folioInput = document.createElement('input');
    folioInput.type = 'text';
    folioCell.appendChild(folioInput);

    const nombreCell = newRow.insertCell(3);
    const nombreInput = document.createElement('input');
    nombreInput.type = 'text';
    nombreCell.appendChild(nombreInput);

    const estatusCell = newRow.insertCell(5);
    const estatusInput = document.createElement('input');
    estatusInput.type = 'text';
    estatusCell.appendChild(estatusInput);

    const observacionCell = newRow.insertCell(6);
    const observacionInput = document.createElement('input');
    observacionInput.type = 'text';
    observacionCell.appendChild(observacionInput);

    const fechaHoraCell = newRow.insertCell(7);
    const fechaHoraInput = document.createElement('input');
    fechaHoraInput.type = 'text';
    fechaHoraCell.appendChild(fechaHoraInput);
}