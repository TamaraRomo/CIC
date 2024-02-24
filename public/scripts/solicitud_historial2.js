function confirmarEliminacion() {
    if (confirm("Estás seguro que deseas eliminar este elemento?")) {
        
        alert("Elemento eliminado exitosamente");
    }
}

function resaltarFila(row) {
    var rows = document.querySelectorAll(".historialTabla tr");
    rows.forEach(function(row) {
        row.classList.remove("selected");
    });
    row.classList.add("selected");
}