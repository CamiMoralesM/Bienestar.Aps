// Filtro de beneficios actualizado
document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const beneficioCards = document.querySelectorAll('.beneficio-card');

    // Función para animar la entrada de tarjetas
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

    // Función para animar la salida de tarjetas
    function animateCardOut(card) {
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.display = 'none';
        }, 300);
    }

    // Event listeners para los botones de filtro
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remover clase active de todos los botones
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Agregar clase active al botón clickeado
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

    // Función para búsqueda (opcional)
    function addSearchFunctionality() {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Buscar beneficio...';
        searchInput.className = 'search-input';
        
        const filtersSection = document.querySelector('.filters-section .container');
        if (filtersSection) {
            filtersSection.appendChild(searchInput);
        }

        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            
            beneficioCards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                const description = card.querySelector('.beneficio-descripcion').textContent.toLowerCase();
                
                if (title.includes(searchTerm) || description.includes(searchTerm)) {
                    animateCardIn(card);
                } else {
                    animateCardOut(card);
                }
            });
        });
    }

    // Función para mostrar detalles de beneficio
    function showBeneficioDetails(beneficioData) {
        // Crear modal para mostrar información detallada
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${beneficioData.title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="beneficio-monto-large">${beneficioData.monto}</div>
                    <p>${beneficioData.descripcion}</p>
                    <div class="requisitos-detallados">
                        <h4>Requisitos y Procedimiento:</h4>
                        <ul>
                            ${beneficioData.requisitos.map(req => `<li>${req}</li>`).join('')}
                        </ul>
                    </div>
                    ${beneficioData.documentos ? `
                        <div class="documentos-necesarios">
                            <h4>Documentos Necesarios:</h4>
                            <ul>
                                ${beneficioData.documentos.map(doc => `<li>${doc}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary modal-close">Entendido</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners para cerrar modal
        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });

        // Cerrar modal al hacer click fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // Contador de beneficios visibles
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
});

// Función para toggle de detalles (mantener compatibilidad)
function toggleDetail(button) {
    const card = button.closest('.beneficio-card');
    const title = card.querySelector('h3').textContent;
    const monto = card.querySelector('.beneficio-monto').textContent;
    const descripcion = card.querySelector('.beneficio-descripcion').textContent;
    const requisitos = Array.from(card.querySelectorAll('.beneficio-requisitos li')).map(li => li.textContent);

    // Datos específicos por beneficio (se pueden expandir)
    const beneficiosData = {
        'Asignación por Natalidad': {
            documentos: [
                'Certificado de nacimiento del recién nacido',
                'Fotocopia de cédula de identidad del afiliado',
                'Formulario de solicitud del beneficio'
            ]
        },
        'Asignación por Matrimonio': {
            documentos: [
                'Certificado de matrimonio o unión civil',
                'Fotocopia de cédula de identidad del afiliado',
                'Formulario de solicitud del beneficio'
            ]
        },
        'Préstamos Médicos': {
            documentos: [
                'Presupuesto médico o facturas',
                'Informe médico que justifique el gasto',
                'Últimas 3 liquidaciones de sueldo',
                'Formulario de solicitud de préstamo'
            ]
        }
        // Se pueden agregar más beneficios específicos aquí
    };

    const beneficioData = {
        title,
        monto,
        descripcion,
        requisitos,
        documentos: beneficiosData[title]?.documentos || null
    };

    // Función definida anteriormente para mostrar detalles
    if (typeof showBeneficioDetails === 'function') {
        showBeneficioDetails(beneficioData);
    } else {
        // Fallback simple
        alert(`${title}\n\nMonto: ${monto}\n\nDescripción: ${descripcion}\n\nRequisitos:\n${requisitos.join('\n')}`);
    }
}

