// JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Obtén todas las celdas con la clase 'estado-celda'
    var celdas = document.querySelectorAll('.estado-celda');
  
    // Itera sobre cada celda
    celdas.forEach(function(celda) {
      // Obtiene el valor del estado desde el atributo 'data-estado'
      var estado = celda.getAttribute('data-estado');
  
      obtenerColorEstado(estado, function(color) {
        // Agrega la clase de estilo correspondiente al color obtenido
        celda.style.backgroundColor = color;
      });
    });
  
    // Función para obtener el color correspondiente al estado
    function obtenerColorEstado(estado, callback) {
      var colores = {
        'Pendiente': '#FFDA6A', 
        'Abierto': '#3AE261', 
        'Cerrado': '#F53D4F'    // Rojo
      };
      // Llama al callback con el color correspondiente al estado
      callback(colores[estado] || ''); // Si el estado no tiene un color asignado, usa una cadena vacía
    }
  });