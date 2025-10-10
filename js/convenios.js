// Filtro de convenios actualizado
document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const convenioCards = document.querySelectorAll('.convenio-card');

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

            convenioCards.forEach(card => {
                if (category === 'todos' || card.getAttribute('data-category') === category) {
                    animateCardIn(card);
                } else {
                    animateCardOut(card);
                }
            });

            // Actualizar contador después del filtro
            setTimeout(updateConvenioCount, 350);
        });
    });

    // Función para búsqueda en convenios
    function addSearchFunctionality() {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Buscar convenio o empresa...';
        searchInput.className = 'search-input';
        searchInput.style.cssText = `
            width: 100%;
            max-width: 300px;
            padding: 10px;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        `;
        
        const filtersSection = document.querySelector('.filters-section .container');
        if (filtersSection) {
            filtersSection.appendChild(searchInput);
        }

        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            
            convenioCards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                const description = card.querySelector('.convenio-descripcion').textContent.toLowerCase();
                const info = card.querySelector('.convenio-info') ? 
                    card.querySelector('.convenio-info').textContent.toLowerCase() : '';
                
                if (title.includes(searchTerm) || description.includes(searchTerm) || info.includes(searchTerm)) {
                    animateCardIn(card);
                } else {
                    animateCardOut(card);
                }
            });

            setTimeout(updateConvenioCount, 100);
        });
    }

    // Función para mostrar detalles de convenio
    function showConvenioDetails(convenioData) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                padding: 30px;
                border-radius: 10px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                position: relative;
            ">
                <div class="modal-header" style="border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #2c5aa0;">${convenioData.title}</h3>
                    <button class="modal-close" style="
                        position: absolute;
                        top: 15px;
                        right: 20px;
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #999;
                    ">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="convenio-descuento-large" style="
                        font-size: 24px;
                        font-weight: bold;
                        color: #e74c3c;
                        text-align: center;
                        margin-bottom: 20px;
                        padding: 15px;
                        background: #f8f9fa;
                        border-radius: 8px;
                    ">${convenioData.descuento}</div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #2c5aa0; margin-bottom: 10px;">Descripción:</h4>
                        <p style="line-height: 1.6;">${convenioData.descripcion}</p>
                    </div>

                    ${convenioData.info ? `
                        <div style="margin-bottom: 20px;">
                            <h4 style="color: #2c5aa0; margin-bottom: 10px;">Información de Contacto:</h4>
                            <div style="
                                background: #f8f9fa;
                                padding: 15px;
                                border-radius: 8px;
                                border-left: 4px solid #2c5aa0;
                            ">${convenioData.info}</div>
                        </div>
                    ` : ''}

                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #2c5aa0; margin-bottom: 10px;">Cómo usar este convenio:</h4>
                        <ul style="line-height: 1.8;">
                            <li>Dirígete al establecimiento</li>
                            <li>Indica que eres afiliado/a al Servicio de Bienestar APS</li>
                            <li>No necesitas certificado - el servicio envía nómina mensual</li>
                            <li>Presenta tu cédula de identidad si es solicitada</li>
                        </ul>
                    </div>

                    ${convenioData.extras ? `
                        <div style="margin-bottom: 20px;">
                            <h4 style="color: #2c5aa0; margin-bottom: 10px;">Información Adicional:</h4>
                            <div style="
                                background: #e8f5e8;
                                padding: 15px;
                                border-radius: 8px;
                                border-left: 4px solid #27ae60;
                            ">${convenioData.extras}</div>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer" style="text-align: center; margin-top: 30px;">
                    <button class="btn btn-primary modal-close" style="
                        background: #2c5aa0;
                        color: white;
                        border: none;
                        padding: 12px 30px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 16px;
                    ">Entendido</button>
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

    // Contador de convenios visibles
    function updateConvenioCount() {
        const visibleCards = Array.from(convenioCards).filter(card => 
            card.style.display !== 'none'
        );
        
        const countElement = document.querySelector('.convenios-count');
        if (countElement) {
            countElement.textContent = `${visibleCards.length} convenios disponibles`;
        }
    }

    // Agregar contador si no existe
    const filtersContainer = document.querySelector('.filters-section .container');
    if (filtersContainer && !document.querySelector('.convenios-count')) {
        const countElement = document.createElement('div');
        countElement.className = 'convenios-count';
        countElement.style.cssText = `
            text-align: center;
            margin: 10px 0;
            font-weight: bold;
            color: #666;
        `;
        countElement.textContent = `${convenioCards.length} convenios disponibles`;
        filtersContainer.appendChild(countElement);
    }

    // Inicializar funcionalidades
    addSearchFunctionality();
    updateConvenioCount();

    // Función para obtener información de contacto formateada
    function formatContactInfo(infoElement) {
        if (!infoElement) return '';
        
        const infoText = infoElement.innerHTML;
        return infoText.replace(/<p><strong>/g, '<div><strong>')
                      .replace(/<\/strong>/g, '</strong>')
                      .replace(/<\/p>/g, '</div>');
    }

    // Manejar clicks en tarjetas para mostrar información rápida
    convenioCards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function(e) {
            // No activar si se hace click en el botón de detalles
            if (e.target.classList.contains('btn-detail')) return;
            
            const title = this.querySelector('h3').textContent;
            const descuento = this.querySelector('.convenio-descuento').textContent;
            const descripcion = this.querySelector('.convenio-descripcion').textContent;
            const infoElement = this.querySelector('.convenio-info');
            
            const convenioData = {
                title,
                descuento,
                descripcion,
                info: infoElement ? formatContactInfo(infoElement) : null
            };

            showConvenioDetails(convenioData);
        });
    });

    // Agregar efecto hover a las tarjetas
    convenioCards.forEach(card => {
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

// Función para toggle de detalles (mantener compatibilidad)
function toggleDetail(button) {
    const card = button.closest('.convenio-card');
    const title = card.querySelector('h3').textContent;
    const descuento = card.querySelector('.convenio-descuento').textContent;
    const descripcion = card.querySelector('.convenio-descripcion').textContent;
    const infoElement = card.querySelector('.convenio-info');

    // Datos adicionales específicos por convenio
    const conveniosExtras = {
        'Clínica Dental PSQ': {
            extras: 'Incluye presupuesto-diagnóstico sin costo y una radiografía sin costo para fin diagnóstico.'
        },
        'Salcobrand': {
            extras: 'Descuentos aplicables en todas las sucursales a nivel nacional. Válido para medicamentos de venta libre y con receta médica.'
        },
        'Gimnasios ENERGY': {
            extras: 'El ticket se adquiere mediante transferencia electrónica y se envía por correo. Válido en cualquier sucursal sin restricciones de horario.'
        },
        'Cinépolis': {
            extras: 'Las entradas deben comprarse directamente en el Servicio de Bienestar APS. Incluye películas en estreno y combo completo.'
        },
        'PAWER SPA': {
            extras: 'Disponible para mascotas entre 6 meses y 10 años. No cubre enfermedades preexistentes ni condiciones congénitas.'
        }
    };

    function formatContactInfo(element) {
        if (!element) return '';
        return element.innerHTML.replace(/<p><strong>/g, '<div><strong>')
                               .replace(/<\/strong>/g, '</strong>')
                               .replace(/<\/p>/g, '</div>');
    }

    const convenioData = {
        title,
        descuento,
        descripcion,
        info: infoElement ? formatContactInfo(infoElement) : null,
        extras: conveniosExtras[title]?.extras || null
    };

    // Usar la función de mostrar detalles si está disponible
    if (typeof showConvenioDetails === 'function') {
        showConvenioDetails(convenioData);
    } else {
        // Fallback para compatibilidad
        const infoText = infoElement ? infoElement.textContent : 'Información de contacto no disponible';
        alert(`${title}\n\nDescuento: ${descuento}\n\nDescripción: ${descripcion}\n\nContacto:\n${infoText}`);
    }

    // Prevenir propagación del evento
    event.stopPropagation();
}

// Función para copiar información de contacto al portapapeles
function copyContactInfo(button, text) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = '¡Copiado!';
        button.style.background = '#27ae60';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
    }).catch(() => {
        // Fallback si no funciona clipboard API
        alert(`Información de contacto:\n${text}`);
    });
}
