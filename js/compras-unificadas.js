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

function calcularPrecioGas() {
    let total = 0;
    if (document.getElementById('compraLipigas')?.value === 'si') {
        total += (parseInt(document.getElementById('lipigas5')?.value) || 0) * PRECIOS_LOCALES.gas.lipigas.kg5;
        total += (parseInt(document.getElementById('lipigas11')?.value) || 0) * PRECIOS_LOCALES.gas.lipigas.kg11;
        total += (parseInt(document.getElementById('lipigas15')?.value) || 0) * PRECIOS_LOCALES.gas.lipigas.kg15;
        total += (parseInt(document.getElementById('lipigas45')?.value) || 0) * PRECIOS_LOCALES.gas.lipigas.kg45;
    }
    if (document.getElementById('compraAbastible')?.value === 'si') {
        total += (parseInt(document.getElementById('abastible5')?.value) || 0) * PRECIOS_LOCALES.gas.abastible.kg5;
        total += (parseInt(document.getElementById('abastible11')?.value) || 0) * PRECIOS_LOCALES.gas.abastible.kg11;
        total += (parseInt(document.getElementById('abastible15')?.value) || 0) * PRECIOS_LOCALES.gas.abastible.kg15;
        total += (parseInt(document.getElementById('abastible45')?.value) || 0) * PRECIOS_LOCALES.gas.abastible.kg45;
    }
    return total;
}

function calcularPrecioEntretenimiento(tipo) {
    const cantidadElement = document.getElementById(`cantidad${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    const cantidad = parseInt(cantidadElement?.value) || 0;
    const precioUnitario = PRECIOS_LOCALES.entretenimiento[tipo] || 0;
    return cantidad * precioUnitario;
}

function actualizarDisplayPrecio(precio, elementoId = 'precio-total-valor') {
    const precioDisplay = document.getElementById(elementoId);
    if (precioDisplay) {
        const precioFormateado = `$${precio.toLocaleString('es-CL')}`;
        precioDisplay.textContent = precioFormateado;
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

function configurarFormularioGas() {
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
    const compraLipigas = document.getElementById('compraLipigas');
    if (compraLipigas) {
        compraLipigas.addEventListener('change', function() {
            const opciones = document.getElementById('lipigasOpciones');
            if (opciones) {
                opciones.style.display = this.value === 'si' ? 'block' : 'none';
                if (this.value === 'no') {
                    ['lipigas5', 'lipigas11', 'lipigas15', 'lipigas45'].forEach(id => {
                        const elem = document.getElementById(id);
                        if (elem) elem.value = '0';
                    });
                }
            }
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
                if (this.value === 'no') {
                    ['abastible5', 'abastible11', 'abastible15', 'abastible45'].forEach(id => {
                        const elem = document.getElementById(id);
                        if (elem) elem.value = '0';
                    });
                }
            }
            const precio = calcularPrecioGas();
            actualizarDisplayPrecio(precio);
            actualizarContadorCargas('abastible');
            validarLimitesGas();
        });
    }
    llenarOpcionesGas();
}

function configurarFormulariosEntretenimiento() {
    ['cine', 'jumper', 'gimnasio'].forEach(tipo => {
        const selectElement = document.getElementById(`cantidad${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
        if (selectElement) {
            actualizarOpcionesEntretenimiento(tipo);
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

function llenarOpcionesGas() {
    const tiposGas = ['lipigas5', 'lipigas11', 'lipigas15', 'lipigas45', 'abastible5', 'abastible11', 'abastible15', 'abastible45'];
    tiposGas.forEach(id => {
        const select = document.getElementById(id);
        if (select && select.children.length <= 1) {
            for (let i = 1; i <= 6; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                select.appendChild(option);
            }
        }
    });
}

function actualizarOpcionesEntretenimiento(tipo) {
    const selectElement = document.getElementById(`cantidad${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    const precioUnitario = PRECIOS_LOCALES.entretenimiento[tipo];
    if (selectElement && precioUnitario) {
        while (selectElement.children.length > 1) {
            selectElement.removeChild(selectElement.lastChild);
        }
        let maxCantidad = 4;
        if (tipo === 'jumper') maxCantidad = 6;
        for (let i = 1; i <= maxCantidad; i++) {
            const option = document.createElement('option');
            const precioTotal = i * precioUnitario;
            option.value = i;
            option.textContent = `${i} - $${precioTotal.toLocaleString('es-CL')}`;
            selectElement.appendChild(option);
        }
    }
}

function actualizarContadorCargas(marca) {
    const prefijos = marca === 'lipigas' ? ['lipigas5', 'lipigas11', 'lipigas15', 'lipigas45'] : ['abastible5', 'abastible11', 'abastible15', 'abastible45'];
    let totalCargas = 0;
    prefijos.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            totalCargas += parseInt(element.value) || 0;
        }
    });
    const opciones = document.getElementById(marca === 'lipigas' ? 'lipigasOpciones' : 'abastibleOpciones');
    if (opciones) {
        const contador = opciones.querySelector('.total-count');
        if (contador) {
            contador.textContent = totalCargas;
            contador.style.fontWeight = 'bold';
            contador.style.color = totalCargas > 0 ? '#28a745' : '#6c757d';
        }
    }
}

/**
 * Valida límites por tipo, por total mensual y bloquea selects si corresponde.
 */
function validarLimitesGas() {
    const mes = new Date().getMonth() + 1;
    const esTemporadaAlta = mes >= 6 && mes <= 9;
    const maxCargas = esTemporadaAlta ? 6 : 4;
    const maxPorTipo = esTemporadaAlta ? 3 : 2;
    const max45kg = 2;

    const lipigas5 = parseInt(document.getElementById('lipigas5')?.value) || 0;
    const lipigas11 = parseInt(document.getElementById('lipigas11')?.value) || 0;
    const lipigas15 = parseInt(document.getElementById('lipigas15')?.value) || 0;
    const lipigas45 = parseInt(document.getElementById('lipigas45')?.value) || 0;
    const abastible5 = parseInt(document.getElementById('abastible5')?.value) || 0;
    const abastible11 = parseInt(document.getElementById('abastible11')?.value) || 0;
    const abastible15 = parseInt(document.getElementById('abastible15')?.value) || 0;
    const abastible45 = parseInt(document.getElementById('abastible45')?.value) || 0;

    const sum5 = lipigas5 + abastible5;
    const sum11 = lipigas11 + abastible11;
    const sum15 = lipigas15 + abastible15;
    const sum45 = lipigas45 + abastible45;
    const totalCargas = sum5 + sum11 + sum15 + sum45;

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

    [
        { tipo: '5', lipigas: lipigas5, abastible: abastible5, suma: sum5, max: maxPorTipo },
        { tipo: '11', lipigas: lipigas11, abastible: abastible11, suma: sum11, max: maxPorTipo },
        { tipo: '15', lipigas: lipigas15, abastible: abastible15, suma: sum15, max: maxPorTipo },
        { tipo: '45', lipigas: lipigas45, abastible: abastible45, suma: sum45, max: max45kg }
    ].forEach(({ tipo, lipigas, abastible, suma, max }) => {
        const lipigasSelect = document.getElementById('lipigas' + tipo);
        const abastibleSelect = document.getElementById('abastible' + tipo);
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

    // BLOQUEO POR TOTAL MENSUAL: Si llegaste al límite mensual, todos los selects con valor 0 se bloquean
    const tiposGas = [
        'lipigas5', 'lipigas11', 'lipigas15', 'lipigas45',
        'abastible5', 'abastible11', 'abastible15', 'abastible45'
    ];
    if (totalCargas >= maxCargas) {
        tiposGas.forEach(id => {
            const select = document.getElementById(id);
            if (select && parseInt(select.value) === 0) {
                select.disabled = true;
            }
        });
    } else {
        tiposGas.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                // Habilita solo si no está bloqueado por tipo
                const tipo = id.replace(/^(lipigas|abastible)/, '');
                const [otroMarca, otroId] = id.startsWith('lipigas') ? ['abastible', 'abastible'+tipo] : ['lipigas', 'lipigas'+tipo];
                const otroSelect = document.getElementById(otroId);
                const maxTipo = tipo === "45" ? max45kg : maxPorTipo;
                const thisVal = parseInt(select.value)||0;
                const otroVal = parseInt(otroSelect?.value)||0;
                if ((thisVal + otroVal) < maxTipo) {
                    select.disabled = false;
                }
            }
        });
    }

    // Mostrar errores arriba del formulario
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

function inicializarSistemaPrecios() {
    console.log('🚀 Inicializando sistema de precios...');
    configurarFormularioGas();
    configurarFormulariosEntretenimiento();
    const precioInicial = calcularPrecioGas();
    actualizarDisplayPrecio(precioInicial);
    validarLimitesGas();
    console.log('✅ Sistema de precios inicializado');
}

// ========================================
// MANEJO DE ENVÍO DE FORMULARIOS
// ========================================

async function manejarEnvioGas(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('.btn-enviar-gas');
    try {
        const validacion = validarLimitesGas();
        if (!validacion.valido) {
            alert('Error de validación:\n' + validacion.errores.join('\n'));
            return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';
        const formData = new FormData(form);
        const datosCompra = Object.fromEntries(formData.entries());
        if (window.auth?.currentUser) {
            datosCompra.uid = window.auth.currentUser.uid;
        }
        const comprobanteFile = form.querySelector('#comprobanteGas').files[0];
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
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Compra Gas';
    }
}

// ========================================
// EXPORTAR FUNCIONES PRINCIPALES
// ========================================

window.calcularPrecioGas = calcularPrecioGas;
window.calcularPrecioEntretenimiento = calcularPrecioEntretenimiento;
window.actualizarDisplayPrecio = actualizarDisplayPrecio;
window.validarLimitesGas = validarLimitesGas;
window.inicializarSistemaPrecios = inicializarSistemaPrecios;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarSistemaPrecios);
} else {
    inicializarSistemaPrecios();
}

document.addEventListener('DOMContentLoaded', function() {
    const formGas = document.getElementById('formCompraGas');
    if (formGas) {
        formGas.addEventListener('submit', manejarEnvioGas);
    }
});

export {
    calcularPrecioGas,
    calcularPrecioEntretenimiento,
    actualizarDisplayPrecio,
    validarLimitesGas,
    inicializarSistemaPrecios,
    PRECIOS_LOCALES
};
