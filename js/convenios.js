// Filtro de convenios
document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const convenioCards = document.querySelectorAll('.convenio-card');

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remover clase active de todos los botones
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Agregar clase active al botón clickeado
            this.classList.add('active');

            const category = this.getAttribute('data-category');

            convenioCards.forEach(card => {
                if (category === 'todos' || card.getAttribute('data-category') === category) {
                    card.style.display = 'block';
                    // Animación de entrada
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 10);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 300);
                }
            });
        });
    });
});

// Función para toggle de detalles
function toggleDetail(button) {
    const card = button.closest('.convenio-card');
    
    // Aquí puedes agregar lógica para mostrar un modal o expandir la tarjeta
    alert('Función de detalles en desarrollo. Aquí se mostrará información completa del convenio.');
}
