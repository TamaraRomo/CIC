// Capturamos todos los elementos .persona
const personas = document.querySelectorAll('.persona');

// Mostramos todos los elementos .persona al cargar la página
personas.forEach((persona, index) => {
  // Añadimos la clase 'visible' para que no vuelva a aparecer
  persona.classList.add('visible');
  // Definimos un retraso para cada elemento basado en su índice
  setTimeout(() => {
    // Mostramos el elemento
    persona.style.opacity = '1';
    persona.style.transform = 'translateY(0)';
  }, index * 900); // Ajusta el retraso según lo deseado
});
