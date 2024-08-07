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
        'Proceso': '#007BFF', //Azul
        'Asignada': '#FFC107', //Amarillo
        'Espera': '#87CEEB', //Azul claro
        'Abierto': '#FF0000', //Rojo
        'Cerrado': '#28A745' //Verde
      };
      // Llama al callback con el color correspondiente al estado
      callback(colores[estado] || ''); // Si el estado no tiene un color asignado, usa una cadena vacía
    }
  });