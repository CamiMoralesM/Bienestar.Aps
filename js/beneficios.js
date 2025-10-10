// Filtro de beneficios actualizado (con contador igual que convenios, sin botón de detalles)
document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const beneficioCards = document.querySelectorAll('.beneficio-card');

    // Animar entrada de tarjetas
    function animateCardIn(card) {
        card.style.display = 'block';
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 10);
    }

    // Animar salida de tarjetas
    function animateCardOut(card) {
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.display = 'none';
        }, 300);
    }

    // Filtro por botones con animación
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const category = this.getAttribute('data-category');

            beneficioCards.forEach(card => {
                if (category === 'todos' || card.getAttribute('data-category') === category) {
                    animateCardIn(card);
                } else {
                    animateCardOut(card);
                }
            });
        });
    });

    // Contador de beneficios visibles (igual a convenios)
    function updateBeneficioCount() {
        const visibleCards = Array.from(beneficioCards).filter(card =>
            card.style.display !== 'none'
        );
        const countElement = document.querySelector('.beneficios-count');
        if (countElement) {
            countElement.textContent = `${visibleCards.length} beneficios disponibles`;
        }
    }

    // Agregar contador si no existe
    const filtersContainer = document.querySelector('.filters-section .container');
    if (filtersContainer && !document.querySelector('.beneficios-count')) {
        const countElement = document.createElement('div');
        countElement.className = 'beneficios-count';
        countElement.style.cssText = `
            text-align: center;
            margin: 10px 0;
            font-weight: bold;
            color: #666;
        `;
        countElement.textContent = `${beneficioCards.length} beneficios disponibles`;
        filtersContainer.appendChild(countElement);
    }

    // Actualizar contador después de cada filtro
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            setTimeout(updateBeneficioCount, 350);
        });
    });

    // Inicializar contador
    updateBeneficioCount();

    // Agregar efecto hover a las tarjetas
    beneficioCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
            this.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        });
    });
});
