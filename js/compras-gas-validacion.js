// ========================================
// COMPRAS GAS CON VALIDACIÓN DE CUPO MENSUAL
// ========================================

import { validarCupoDisponible, validarCargasSolicitadas, obtenerDetalleComprasMes } from './validacion-cupo-mensual.js';

document.addEventListener('DOMContentLoaded', async function() {
    // Obtener referencias a los elementos
    const compraLipigas = document.getElementById('compraLipigas');
    const compraAbastible = document.getElementById('compraAbastible');
    const lipigasOpciones = document.getElementById('lipigasOpciones');
    const abastibleOpciones = document.getElementById('abastibleOpciones');
    const rutInput = document.getElementById('rutGas');
    const formCompraGas = document.getElementById('formCompraGas');

    // Función para determinar si estamos en temporada alta
    function esTemporadaAlta() {
        const fecha = new Date();
        const mes = fecha.getMonth() + 1;
        return mes >= 6 && mes <= 9;
    }

    // Función para generar opciones según el mes
    function generarOpcionesPorCarga(tipoCarga, selectElement) {
        const temporadaAlta = esTemporadaAlta();
        let maxOpciones;

        if (temporadaAlta) {
            if (tipoCarga === '45') {
                maxOpciones = 2;
            } else {
                maxOpciones = 3;
            }
        } else {
            maxOpciones = 2;
        }

        selectElement.innerHTML = '<option value="0">0</option>';
        
        for (let i = 1; i <= maxOpciones; i++) {
            selectElement.innerHTML += `<option value="${i}">${i}</option>`;
        }
    }

    // Función para calcular el total GLOBAL (Lipigas + Abastible)
    function calcularTotalGlobal() {
        let totalGlobal = 0;
        
        if (lipigasOpciones && lipigasOpciones.style.display !== 'none') {
            const selectsLipigas = lipigasOpciones.querySelectorAll('.gas-select');
            selectsLipigas.forEach(select => {
                totalGlobal += parseInt(select.value) || 0;
            });
        }
        
        if (abastibleOpciones && abastibleOpciones.style.display !== 'none') {
            const selectsAbastible = abastibleOpciones.querySelectorAll('.gas-select');
            selectsAbastible.forEach(select => {
                totalGlobal += parseInt(select.value) || 0;
            });
        }
        
        return totalGlobal;
    }

    // Función para actualizar los límites y mostrar las opciones
    function actualizarOpcionesGas(contenedor, empresa) {
        const temporadaAlta = esTemporadaAlta();
        const limiteTotal = temporadaAlta ? 6 : 4;
        
        const temporadaMsg = temporadaAlta ? 
            '🔥 Temporada Alta (Junio-Septiembre): Máximo 3 por carga (2 para 45kg). TOTAL MENSUAL ENTRE AMBAS MARCAS: 6 cargas' :
            '❄️ Temporada Normal (Octubre-Mayo): Máximo 2 por carga. TOTAL MENSUAL ENTRE AMBAS MARCAS: 4 cargas';

        let limiteInfo = contenedor.querySelector('.limites-info');
        if (!limiteInfo) {
            limiteInfo = document.createElement('div');
            limiteInfo.className = 'limites-info';
            limiteInfo.style.cssText = `
                background: #e3f2fd;
                border-left: 4px solid #2196f3;
                padding: 12px 15px;
                margin-bottom: 20px;
                border-radius: 4px;
                font-size: 14px;
                color: #1976d2;
                font-weight: 500;
            `;
            contenedor.insertBefore(limiteInfo, contenedor.firstChild);
        }
        limiteInfo.textContent = temporadaMsg;

        const select5kg = contenedor.querySelector(`#${empresa}5`);
        const select11kg = contenedor.querySelector(`#${empresa}11`);
        const select15kg = contenedor.querySelector(`#${empresa}15`);
        const select45kg = contenedor.querySelector(`#${empresa}45`);

        if (select5kg) generarOpcionesPorCarga('5', select5kg);
        if (select11kg) generarOpcionesPorCarga('11', select11kg);
        if (select15kg) generarOpcionesPorCarga('15', select15kg);
        if (select45kg) generarOpcionesPorCarga('45', select45kg);

        contenedor.style.display = 'block';
    }

    // Event listeners para los selectores principales
    if (compraLipigas) {
        compraLipigas.addEventListener('change', function() {
            if (this.value === 'si') {
                actualizarOpcionesGas(lipigasOpciones, 'lipigas');
            } else {
                lipigasOpciones.style.display = 'none';
                lipigasOpciones.querySelectorAll('select').forEach(select => {
                    select.value = '0';
                });
                actualizarTotal(lipigasOpciones);
            }
        });
    }

    if (compraAbastible) {
        compraAbastible.addEventListener('change', function() {
            if (this.value === 'si') {
                actualizarOpcionesGas(abastibleOpciones, 'abastible');
            } else {
                abastibleOpciones.style.display = 'none';
                abastibleOpciones.querySelectorAll('select').forEach(select => {
                    select.value = '0';
                });
                actualizarTotal(abastibleOpciones);
            }
        });
    }

    // Función para actualizar totales
    function actualizarTotal(contenedor) {
        const selects = contenedor.querySelectorAll('.gas-select');
        let totalLocal = 0;
        
        selects.forEach(select => {
            totalLocal += parseInt(select.value) || 0;
        });
        
        const totalElement = contenedor.querySelector('.total-count');
        if (totalElement) {
            totalElement.textContent = totalLocal;
        }
        
        const totalGlobal = calcularTotalGlobal();
        const temporadaAlta = esTemporadaAlta();
        const limiteTotal = temporadaAlta ? 6 : 4;
        
        if (totalGlobal > limiteTotal) {
            alert(`⚠️ El total de cargas entre LIPIGAS y ABASTIBLE no puede superar ${limiteTotal} en este período.\n\n${temporadaAlta ? 'Temporada Alta: Máximo 6 cargas mensuales (sumando ambas marcas)' : 'Temporada Normal: Máximo 4 cargas mensuales (sumando ambas marcas)'}\n\nTotal actual: ${totalGlobal} cargas`);
            const lastChanged = Array.from(selects).reverse().find(s => parseInt(s.value) > 0);
            if (lastChanged) {
                lastChanged.value = '0';
                actualizarTotal(contenedor);
            }
        }
    }

    // Agregar listeners para actualizar totales
    if (lipigasOpciones) {
        const selectsLipigas = lipigasOpciones.querySelectorAll('.gas-select');
        selectsLipigas.forEach(select => {
            select.addEventListener('change', () => actualizarTotal(lipigasOpciones));
        });
    }

    if (abastibleOpciones) {
        const selectsAbastible = abastibleOpciones.querySelectorAll('.gas-select');
        selectsAbastible.forEach(select => {
            select.addEventListener('change', () => actualizarTotal(abastibleOpciones));
        });
    }

    // Inicializar fecha
    const fechaInput = document.getElementById('fechaCompraGas');
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.value = today;
        fechaInput.max = today;
    }

    // ========================================
    // NUEVA FUNCIÓN: Verificar cupo al cargar
    // ========================================
    async function verificarCupoUsuario() {
        const rut = rutInput.value.trim();
        
        if (!rut) return;

        try {
            // Mostrar indicador de carga
            mostrarIndicadorCarga('Verificando cupo disponible...');

            const validacion = await validarCupoDisponible(rut);
            
            ocultarIndicadorCarga();

            if (!validacion.success) {
                console.error('Error en validación:', validacion.error);
                return;
            }

            // Mostrar información del cupo
            mostrarInfoCupo(validacion);

            // Si no tiene cupo, deshabilitar formulario
            if (!validacion.puedeComprar) {
                deshabilitarFormulario(validacion);
            } else {
                habilitarFormulario();
            }

        } catch (error) {
            console.error('Error al verificar cupo:', error);
            ocultarIndicadorCarga();
        }
    }

    // ========================================
    // FUNCIÓN: Mostrar información del cupo
    // ========================================
    function mostrarInfoCupo(validacion) {
        // Buscar o crear contenedor de información
        let infoContainer = document.getElementById('info-cupo-mensual');
        
        if (!infoContainer) {
            infoContainer = document.createElement('div');
            infoContainer.id = 'info-cupo-mensual';
            infoContainer.style.cssText = `
                padding: 15px 20px;
                margin: 20px 0;
                border-radius: 8px;
                font-weight: 500;
            `;
            
            // Insertar después del campo RUT
            const rutGroup = rutInput.closest('.form-group');
            rutGroup.parentNode.insertBefore(infoContainer, rutGroup.nextSibling);
        }

        const temporadaNombre = validacion.temporada === 'alta' ? 'Temporada Alta' : 'Temporada Normal';
        const emoji = validacion.puedeComprar ? '✅' : '❌';
        
        if (validacion.puedeComprar) {
            infoContainer.style.background = '#d4edda';
            infoContainer.style.borderLeft = '4px solid #28a745';
            infoContainer.style.color = '#155724';
            
            infoContainer.innerHTML = `
                <strong>${emoji} Cupo Disponible</strong><br>
                ${temporadaNombre}: Ha usado ${validacion.totalUsado} de ${validacion.limiteMaximo} cargas mensuales<br>
                <strong>Tiene ${validacion.cupoDisponible} cargas disponibles este mes</strong>
            `;
        } else {
            infoContainer.style.background = '#f8d7da';
            infoContainer.style.borderLeft = '4px solid #dc3545';
            infoContainer.style.color = '#721c24';
            
            infoContainer.innerHTML = `
                <strong>${emoji} Sin Cupo Disponible</strong><br>
                ${temporadaNombre}: Ha usado ${validacion.totalUsado} de ${validacion.limiteMaximo} cargas mensuales<br>
                <strong>Ha alcanzado el límite mensual. No puede realizar más compras este mes.</strong>
            `;
        }
    }

    // ========================================
    // FUNCIÓN: Deshabilitar formulario
    // ========================================
    function deshabilitarFormulario(validacion) {
        // Deshabilitar selectores de empresa
        if (compraLipigas) compraLipigas.disabled = true;
        if (compraAbastible) compraAbastible.disabled = true;

        // Deshabilitar botón de envío
        const btnSubmit = formCompraGas.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = '❌ Sin Cupo Disponible';
            btnSubmit.style.opacity = '0.5';
            btnSubmit.style.cursor = 'not-allowed';
        }

        // Ocultar opciones si están visibles
        if (lipigasOpciones) lipigasOpciones.style.display = 'none';
        if (abastibleOpciones) abastibleOpciones.style.display = 'none';
    }

    // ========================================
    // FUNCIÓN: Habilitar formulario
    // ========================================
    function habilitarFormulario() {
        // Habilitar selectores
        if (compraLipigas) compraLipigas.disabled = false;
        if (compraAbastible) compraAbastible.disabled = false;

        // Habilitar botón
        const btnSubmit = formCompraGas.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Enviar Compra';
            btnSubmit.style.opacity = '1';
            btnSubmit.style.cursor = 'pointer';
        }
    }

    // ========================================
    // FUNCIONES DE UI
    // ========================================
    function mostrarIndicadorCarga(mensaje) {
        let indicator = document.getElementById('loading-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'loading-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 20px 40px;
                border-radius: 8px;
                z-index: 10000;
                font-weight: 500;
            `;
            document.body.appendChild(indicator);
        }
        
        indicator.textContent = mensaje;
        indicator.style.display = 'block';
    }

    function ocultarIndicadorCarga() {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // ========================================
    // EVENT LISTENER: Verificar cupo al perder foco del RUT
    // ========================================
    if (rutInput) {
        rutInput.addEventListener('blur', verificarCupoUsuario);
    }

    // ========================================
    // VALIDACIÓN MEJORADA DEL FORMULARIO
    // ========================================
    if (formCompraGas) {
        formCompraGas.addEventListener('submit', async function(e) {
            e.preventDefault();

            const comprandoLipigas = compraLipigas.value === 'si';
            const comprandoAbastible = compraAbastible.value === 'si';

            if (!comprandoLipigas && !comprandoAbastible) {
                alert('⚠️ Debe seleccionar al menos una empresa (Lipigas o Abastible)');
                return false;
            }

            const totalCargas = calcularTotalGlobal();

            if (totalCargas === 0) {
                alert('⚠️ Debe seleccionar al menos una carga de gas');
                return false;
            }

            // VALIDACIÓN DE CUPO CON FIREBASE
            const rut = rutInput.value.trim();

            if (!rut) {
                alert('⚠️ Debe ingresar su RUT');
                return false;
            }

            try {
                mostrarIndicadorCarga('Validando cupo disponible...');

                // Preparar objeto de cargas solicitadas
                const cargasSolicitadas = {};

                if (comprandoLipigas) {
                    cargasSolicitadas.lipigas = {
                        kg5: parseInt(document.getElementById('lipigas5').value) || 0,
                        kg11: parseInt(document.getElementById('lipigas11').value) || 0,
                        kg15: parseInt(document.getElementById('lipigas15').value) || 0,
                        kg45: parseInt(document.getElementById('lipigas45').value) || 0
                    };
                }

                if (comprandoAbastible) {
                    cargasSolicitadas.abastible = {
                        kg5: parseInt(document.getElementById('abastible5').value) || 0,
                        kg11: parseInt(document.getElementById('abastible11').value) || 0,
                        kg15: parseInt(document.getElementById('abastible15').value) || 0,
                        kg45: parseInt(document.getElementById('abastible45').value) || 0
                    };
                }

                // Validar con Firebase
                const validacion = await validarCargasSolicitadas(rut, cargasSolicitadas);

                ocultarIndicadorCarga();

                if (!validacion.success) {
                    alert('❌ Error al validar: ' + validacion.error);
                    return false;
                }

                if (!validacion.puedeComprar) {
                    alert(`❌ ${validacion.mensaje}\n\nTotal usado: ${validacion.totalUsado} cargas\nSolicita: ${validacion.totalSolicitado} cargas\nDisponible: ${validacion.cupoDisponible} cargas`);
                    return false;
                }

                // Si pasó todas las validaciones, enviar formulario
                console.log('✅ Validación exitosa, enviando formulario...');
                console.log('Detalle:', validacion);

                // Aquí continúa el proceso normal de envío a Firebase
                // this.submit(); // Descomentar cuando esté listo para enviar
                
                alert(`✅ Compra válida!\n\n${validacion.mensaje}\n\nProcesor: Envío a Firebase...`);

            } catch (error) {
                ocultarIndicadorCarga();
                console.error('Error en validación:', error);
                alert('❌ Error al procesar la solicitud. Intente nuevamente.');
                return false;
            }
        });
    }

    // ========================================
    // FUNCIÓN AUXILIAR: Mostrar información de temporada
    // ========================================
    function mostrarInfoTemporada() {
        const temporadaAlta = esTemporadaAlta();
        console.log(temporadaAlta ? 
            '🔥 Temporada Alta Activa (Junio-Septiembre)' : 
            '❄️ Temporada Normal Activa (Octubre-Mayo)'
        );
    }

    mostrarInfoTemporada();
});
