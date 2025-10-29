// ========================================
// SISTEMA UNIFICADO DE PRECIOS Y FORMULARIOS
// Maneja el cálculo de precios en tiempo real para todos los tipos de compra
// ========================================

// Importar funciones de Firebase
import { guardarCompraUnificada, PRECIOS_ENTRETENIMIENTO, PRECIOS_GAS } from './compras-gas-firebase.js';

// ========================================
// CONSTANTES DE PRECIOS (SINCRONIZADAS CON FIREBASE)
// ========================================

const PRECIOS_LOCALES = {
    gas: {
        lipigas: {
            kg5: 7000,
            kg11: 12000,
            kg15: 16000,
            kg45: 54000
        },
        abastible: {
            kg5: 8000,
            kg11: 15000,
            kg15: 18000,
            kg45: 52000
        }
    },
    entretenimiento: {
        cine: 7000,
        jumper: 6500,
        gimnasio: 18000
    }
};

// ========================================
// FUNCIONES DE CÁLCULO DE PRECIOS
// ========================================

/**
 * Calcula el precio total de gas en tiempo real
 */
function calcularPrecioGas() {
    let total = 0;
    
    // Calcular Lipigas
    if (document.getElementById('compraLipigas')?.value === 'si') {
        total += (parseInt(document.getElementById('lipigas5')?.value) || 0) * PRECIOS_LOCALES.gas.lipigas.kg5;
        total += (parseInt(document.getElementById('lipigas11')?.value) || 0) * PRECIOS_LOCALES.gas.lipigas.kg11;
        total += (parseInt(document.getElementById('lipigas15')?.value) || 0) * PRECIOS_LOCALES.gas.lipigas.kg15;
        total += (parseInt(document.getElementById('lipigas45')?.value) || 0) * PRECIOS_LOCALES.gas.lipigas.kg45;
    }
    
    // Calcular Abastible
    if (document.getElementById('compraAbastible')?.value === 'si') {
        total += (parseInt(document.getElementById('abastible5')?.value) || 0) * PRECIOS_LOCALES.gas.abastible.kg5;
        total += (parseInt(document.getElementById('abastible11')?.value) || 0) * PRECIOS_LOCALES.gas.abastible.kg11;
        total += (parseInt(document.getElementById('abastible15')?.value) || 0) * PRECIOS_LOCALES.gas.abastible.kg15;
        total += (parseInt(document.getElementById('abastible45')?.value) || 0) * PRECIOS_LOCALES.gas.abastible.kg45;
    }
    
    return total;
}

/**
 * Calcula el precio total para entretenimiento
 */
function calcularPrecioEntretenimiento(tipo) {
    const cantidadElement = document.getElementById(`cantidad${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    const cantidad = parseInt(cantidadElement?.value) || 0;
    const precioUnitario = PRECIOS_LOCALES.entretenimiento[tipo] || 0;
    
    return cantidad * precioUnitario;
}

/**
 * Actualiza el display del precio total en la interfaz
 */
function actualizarDisplayPrecio(precio, elementoId = 'precio-total-valor') {
    const precioDisplay = document.getElementById(elementoId);
    if (precioDisplay) {
        const precioFormateado = `$${precio.toLocaleString('es-CL')}`;
        precioDisplay.textContent = precioFormateado;
        
        // Animar el cambio
        precioDisplay.style.transform = 'scale(1.1)';
        precioDisplay.style.color = precio > 0 ? '#fff' : '#ccc';
        
        setTimeout(() => {
            precioDisplay.style.transform = 'scale(1)';
        }, 200);
    }
    
    return precio;
}

// ========================================
// INICIALIZACIÓN DE EVENT LISTENERS
// ========================================

/**
 * Configura los event listeners para el formulario de gas
 */
function configurarFormularioGas() {
    // Event listeners para selectores de Lipigas
    ['lipigas5', 'lipigas11', 'lipigas15', 'lipigas45'].forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.addEventListener('change', () => {
                const precio = calcularPrecioGas();
                actualizarDisplayPrecio(precio);
                actualizarContadorCargas('lipigas');
                validarLimitesGas();
            });
        }
    });
    
    // Event listeners para selectores de Abastible
    ['abastible5', 'abastible11', 'abastible15', 'abastible45'].forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.addEventListener('change', () => {
                const precio = calcularPrecioGas();
                actualizarDisplayPrecio(precio);
                actualizarContadorCargas('abastible');
                validarLimitesGas();
            });
        }
    });
    
    // Event listeners para los toggles principales
    const compraLipigas = document.getElementById('compraLipigas');
    if (compraLipigas) {
        compraLipigas.addEventListener('change', function() {
            const opciones = document.getElementById('lipigasOpciones');
            if (opciones) {
                opciones.style.display = this.value === 'si' ? 'block' : 'none';
                
                // Resetear valores si se deshabilita
                if (this.value === 'no') {
                    ['lipigas5', 'lipigas11', 'lipigas15', 'lipigas45'].forEach(id => {
                        const elem = document.getElementById(id);
                        if (elem) elem.value = '0';
                    });
                }
            }
            
            // Recalcular precio
            const precio = calcularPrecioGas();
            actualizarDisplayPrecio(precio);
            actualizarContadorCargas('lipigas');
            validarLimitesGas();
        });
    }
    
    const compraAbastible = document.getElementById('compraAbastible');
    if (compraAbastible) {
        compraAbastible.addEventListener('change', function() {
            const opciones = document.getElementById('abastibleOpciones');
            if (opciones) {
                opciones.style.display = this.value === 'si' ? 'block' : 'none';
                
                // Resetear valores si se deshabilita
                if (this.value === 'no') {
                    ['abastible5', 'abastible11', 'abastible15', 'abastible45'].forEach(id => {
                        const elem = document.getElementById(id);
                        if (elem) elem.value = '0';
                    });
                }
            }
            
            // Recalcular precio
            const precio = calcularPrecioGas();
            actualizarDisplayPrecio(precio);
            actualizarContadorCargas('abastible');
            validarLimitesGas();
        });
    }
    
    // Llenar opciones de cantidad dinámicamente
    llenarOpcionesGas();
}

/**
 * Configura los event listeners para formularios de entretenimiento
 */
function configurarFormulariosEntretenimiento() {
    ['cine', 'jumper', 'gimnasio'].forEach(tipo => {
        const selectElement = document.getElementById(`cantidad${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
        if (selectElement) {
            // Actualizar opciones con precios
            actualizarOpcionesEntretenimiento(tipo);
            
            // Event listener para cambios
            selectElement.addEventListener('change', function() {
                const precio = calcularPrecioEntretenimiento(tipo);
                console.log(`💰 Precio ${tipo}: $${precio.toLocaleString('es-CL')}`);
            });
        }
    });
}

// ========================================
// FUNCIONES AUXILIARES
// ========================================

/**
 * Llena las opciones de cantidad para gas dinámicamente
 */
function llenarOpcionesGas() {
    const tiposGas = ['lipigas5', 'lipigas11', 'lipigas15', 'lipigas45', 'abastible5', 'abastible11', 'abastible15', 'abastible45'];
    
    tiposGas.forEach(id => {
        const select = document.getElementById(id);
        if (select && select.children.length <= 1) { // Solo si no se han agregado opciones
            for (let i = 1; i <= 6; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                select.appendChild(option);
            }
        }
    });
}

/**
 * Actualiza las opciones de entretenimiento con precios incluidos
 */
function actualizarOpcionesEntretenimiento(tipo) {
    const selectElement = document.getElementById(`cantidad${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    const precioUnitario = PRECIOS_LOCALES.entretenimiento[tipo];
    
    if (selectElement && precioUnitario) {
        // Limpiar opciones existentes (excepto la primera)
        while (selectElement.children.length > 1) {
            selectElement.removeChild(selectElement.lastChild);
        }
        
        // Determinar cantidad máxima según tipo
        let maxCantidad = 4;
        if (tipo === 'jumper') maxCantidad = 6;
        
        // Agregar opciones con precios
        for (let i = 1; i <= maxCantidad; i++) {
            const option = document.createElement('option');
            const precioTotal = i * precioUnitario;
            option.value = i;
            option.textContent = `${i} - $${precioTotal.toLocaleString('es-CL')}`;
            selectElement.appendChild(option);
        }
    }
}

/**
 * Actualiza el contador de cargas para gas
 */
function actualizarContadorCargas(marca) {
    const prefijos = marca === 'lipigas' ? ['lipigas5', 'lipigas11', 'lipigas15', 'lipigas45'] : ['abastible5', 'abastible11', 'abastible15', 'abastible45'];
    
    let totalCargas = 0;
    prefijos.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            totalCargas += parseInt(element.value) || 0;
        }
    });
    
    // Buscar el contenedor correcto
    const opciones = document.getElementById(marca === 'lipigas' ? 'lipigasOpciones' : 'abastibleOpciones');
    if (opciones) {
        const contador = opciones.querySelector('.total-count');
        if (contador) {
            contador.textContent = totalCargas;
            
            // Animar si hay cambios
            contador.style.fontWeight = 'bold';
            contador.style.color = totalCargas > 0 ? '#28a745' : '#6c757d';
        }
    }
}

/**
 * Valida los límites de gas según temporada y por tipo, bloqueando selects según reglas.
 * Aplica las siguientes reglas:
 * - Temporada normal (Oct-May): Máximo 4 cargas mensuales, máximo 2 por tipo (sumando Lipigas y Abastible).
 * - Temporada alta (Jun-Sep): Máximo 6 cargas mensuales, máximo 3 por tipo, máximo 2 de 45kg.
 * Si eliges 2 de un tipo en una marca, bloquea el otro. Si eliges 1 y 1, permite.
 */
function validarLimitesGas() {
    const mes = new Date().getMonth() + 1; // 1-12
    const esTemporadaAlta = mes >= 6 && mes <= 9; // Jun-Sep

    const maxCargas = esTemporadaAlta ? 6 : 4;
    const maxPorTipo = esTemporadaAlta ? 3 : 2;
    const max45kg = 2; // Siempre 2

    // Obtener cantidades seleccionadas
    const lipigas5 = parseInt(document.getElementById('lipigas5')?.value) || 0;
    const lipigas11 = parseInt(document.getElementById('lipigas11')?.value) || 0;
    const lipigas15 = parseInt(document.getElementById('lipigas15')?.value) || 0;
    const lipigas45 = parseInt(document.getElementById('lipigas45')?.value) || 0;
    const abastible5 = parseInt(document.getElementById('abastible5')?.value) || 0;
    const abastible11 = parseInt(document.getElementById('abastible11')?.value) || 0;
    const abastible15 = parseInt(document.getElementById('abastible15')?.value) || 0;
    const abastible45 = parseInt(document.getElementById('abastible45')?.value) || 0;

    // Suma por tipo (ambas marcas)
    const sum5 = lipigas5 + abastible5;
    const sum11 = lipigas11 + abastible11;
    const sum15 = lipigas15 + abastible15;
    const sum45 = lipigas45 + abastible45;

    // Total cargas
    const totalCargas = sum5 + sum11 + sum15 + sum45;

    // Validación de errores
    const errores = [];
    if (totalCargas > maxCargas) {
        errores.push(`Máximo ${maxCargas} cargas por mes (temporada ${esTemporadaAlta ? 'alta' : 'normal'})`);
    }
    if (sum45 > max45kg) {
        errores.push(`Máximo ${max45kg} cargas de 45kg entre Lipigas y Abastible`);
    }
    if (sum5 > maxPorTipo) {
        errores.push(`Máximo ${maxPorTipo} cargas de 5kg entre Lipigas y Abastible`);
    }
    if (sum11 > maxPorTipo) {
        errores.push(`Máximo ${maxPorTipo} cargas de 11kg entre Lipigas y Abastible`);
    }
    if (sum15 > maxPorTipo) {
        errores.push(`Máximo ${maxPorTipo} cargas de 15kg entre Lipigas y Abastible`);
    }

    // Bloqueo dinámico de selects según límites por tipo
    [
        { tipo: '5', lipigas: lipigas5, abastible: abastible5, suma: sum5, max: maxPorTipo },
        { tipo: '11', lipigas: lipigas11, abastible: abastible11, suma: sum11, max: maxPorTipo },
        { tipo: '15', lipigas: lipigas15, abastible: abastible15, suma: sum15, max: maxPorTipo },
        { tipo: '45', lipigas: lipigas45, abastible: abastible45, suma: sum45, max: max45kg }
    ].forEach(({ tipo, lipigas, abastible, suma, max }) => {
        const lipigasSelect = document.getElementById('lipigas' + tipo);
        const abastibleSelect = document.getElementById('abastible' + tipo);

        // Si ya se seleccionó el máximo en una marca, la otra debe ser 0 y deshabilitada
        if (lipigas >= max) {
            if (abastibleSelect) {
                abastibleSelect.value = "0";
                abastibleSelect.disabled = true;
            }
        } else {
            if (abastibleSelect) abastibleSelect.disabled = false;
            if (abastibleSelect && abastible > (max - lipigas)) abastibleSelect.value = (max - lipigas);
        }
        if (abastible >= max) {
            if (lipigasSelect) {
                lipigasSelect.value = "0";
                lipigasSelect.disabled = true;
            }
        } else {
            if (lipigasSelect) lipigasSelect.disabled = false;
            if (lipigasSelect && lipigas > (max - abastible)) lipigasSelect.value = (max - abastible);
        }

        // Además, limitar las opciones visuales para no permitir más de lo permitido
        [lipigasSelect, abastibleSelect].forEach(select => {
            if (select) {
                Array.from(select.options).forEach(opt => {
                    if (parseInt(opt.value) > (max - (select === lipigasSelect ? abastible : lipigas))) {
                        opt.disabled = true;
                    } else {
                        opt.disabled = false;
                    }
                });
            }
        });
    });

    // Mostrar errores si es necesario
    const form = document.getElementById('formCompraGas');
    let errorBox = form ? form.querySelector('.limite-error') : null;
    if (!errorBox && form) {
        errorBox = document.createElement('div');
        errorBox.className = 'limite-error';
        errorBox.style.cssText = "color: #dc3545; margin-bottom: 10px; font-weight: bold;";
        form.insertBefore(errorBox, form.firstChild);
    }
    if (errorBox) {
        if (errores.length > 0) {
            errorBox.innerHTML = errores.join('<br>');
        } else {
            errorBox.innerHTML = '';
        }
    }

    return {
        valido: errores.length === 0,
        errores,
        limites: {
            maxCargas, maxPorTipo, max45kg, esTemporadaAlta
        }
    };
}

// ========================================
// INICIALIZACIÓN PRINCIPAL
// ========================================

/**
 * Inicializa todos los sistemas de precios
 */
function inicializarSistemaPrecios() {
    console.log('🚀 Inicializando sistema de precios...');
    
    // Configurar formularios
    configurarFormularioGas();
    configurarFormulariosEntretenimiento();
    
    // Cálculo inicial
    const precioInicial = calcularPrecioGas();
    actualizarDisplayPrecio(precioInicial);

    // Validación inicial de límites
    validarLimitesGas();
    
    console.log('✅ Sistema de precios inicializado');
}

// ========================================
// MANEJO DE ENVÍO DE FORMULARIOS
// ========================================

/**
 * Maneja el envío del formulario de gas
 */
async function manejarEnvioGas(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('.btn-enviar-gas');
    
    try {
        // Validar límites
        const validacion = validarLimitesGas();
        if (!validacion.valido) {
            alert('Error de validación:\n' + validacion.errores.join('\n'));
            return;
        }
        
        // Deshabilitar botón
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';
        
        // Recopilar datos
        const formData = new FormData(form);
        const datosCompra = Object.fromEntries(formData.entries());
        
        // Agregar UID si está disponible
        if (window.auth?.currentUser) {
            datosCompra.uid = window.auth.currentUser.uid;
        }
        
        // Obtener archivo
        const comprobanteFile = form.querySelector('#comprobanteGas').files[0];
        
        // Enviar a Firebase
        const resultado = await guardarCompraUnificada('gas', datosCompra, comprobanteFile);
        
        if (resultado.success) {
            alert(`✅ Compra de gas registrada exitosamente!\nID: ${resultado.id}\nTotal cargas: ${resultado.totalCargas}\nPrecio total: $${(resultado.precioTotal || 0).toLocaleString('es-CL')}`);
            form.reset();
            actualizarDisplayPrecio(0);
            validarLimitesGas();
        } else {
            throw new Error(resultado.error || 'Error desconocido');
        }
        
    } catch (error) {
        console.error('❌ Error al enviar compra de gas:', error);
        alert('Error al registrar la compra: ' + error.message);
    } finally {
        // Rehabilitar botón
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Compra Gas';
    }
}

// ========================================
// EXPORTAR FUNCIONES PRINCIPALES
// ========================================

// Hacer funciones disponibles globalmente para el HTML
window.calcularPrecioGas = calcularPrecioGas;
window.calcularPrecioEntretenimiento = calcularPrecioEntretenimiento;
window.actualizarDisplayPrecio = actualizarDisplayPrecio;
window.validarLimitesGas = validarLimitesGas;
window.inicializarSistemaPrecios = inicializarSistemaPrecios;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarSistemaPrecios);
} else {
    inicializarSistemaPrecios();
}

// Agregar event listener para el formulario de gas
document.addEventListener('DOMContentLoaded', function() {
    const formGas = document.getElementById('formCompraGas');
    if (formGas) {
        formGas.addEventListener('submit', manejarEnvioGas);
    }
});

// Exportar para uso en módulos
export {
    calcularPrecioGas,
    calcularPrecioEntretenimiento,
    actualizarDisplayPrecio,
    validarLimitesGas,
    inicializarSistemaPrecios,
    PRECIOS_LOCALES
};
