// ========================================
// SISTEMA DE COMPRAS DE GAS - VERSIÓN 3.2 FINAL
// Con validación de límite por tipo de carga
// ========================================

import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    Timestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ========================================
// VARIABLES GLOBALES
// ========================================
let compraLipigas, compraAbastible, lipigasOpciones, abastibleOpciones, rutInput, formCompraGas;

// ========================================
// INICIALIZACIÓN
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Inicializando sistema de compras de gas...');
    
    compraLipigas = document.getElementById('compraLipigas');
    compraAbastible = document.getElementById('compraAbastible');
    lipigasOpciones = document.getElementById('lipigasOpciones');
    abastibleOpciones = document.getElementById('abastibleOpciones');
    rutInput = document.getElementById('rutGas');
    formCompraGas = document.getElementById('formCompraGas');

    if (!formCompraGas) {
        console.error('❌ No se encontró el formulario #formCompraGas');
        return;
    }

    inicializarEventListeners();
    inicializarFecha();
    inicializarValidacionCupo();
    
    console.log('✅ Sistema inicializado correctamente');
});

// ========================================
// FUNCIONES DE TEMPORADA
// ========================================

function esTemporadaAlta() {
    const fecha = new Date();
    const mes = fecha.getMonth() + 1;
    return mes >= 6 && mes <= 9;
}

function obtenerLimiteMaximo() {
    return esTemporadaAlta() ? 6 : 4;
}

// ========================================
// FUNCIONES DE OPCIONES DE GAS
// ========================================

/**
 * Genera las opciones según tipo de carga y temporada
 * MEJORADO: Limita correctamente cada tipo
 */
function generarOpcionesPorCarga(tipoCarga, selectElement) {
    const temporadaAlta = esTemporadaAlta();
    let maxOpciones;

    if (temporadaAlta) {
        maxOpciones = (tipoCarga === '45') ? 2 : 3;
    } else {
        maxOpciones = 2;
    }

    selectElement.innerHTML = '<option value="0">0</option>';
    
    for (let i = 1; i <= maxOpciones; i++) {
        selectElement.innerHTML += `<option value="${i}">${i}</option>`;
    }
    
    // Asegurar que el valor actual no exceda
    const valorActual = parseInt(selectElement.value) || 0;
    if (valorActual > maxOpciones) {
        selectElement.value = maxOpciones.toString();
    }
}

function actualizarOpcionesGas(contenedor, empresa) {
    if (!contenedor) return;

    const temporadaAlta = esTemporadaAlta();
    const limiteTotal = obtenerLimiteMaximo();
    
    const temporadaMsg = temporadaAlta ? 
        '🔥 Temporada Alta (Junio-Septiembre): Máximo 3 por tipo (2 para 45kg). TOTAL MENSUAL: 6 cargas' :
        '❄️ Temporada Normal (Octubre-Mayo): Máximo 2 por tipo. TOTAL MENSUAL: 4 cargas';

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

// ========================================
// FUNCIONES DE CÁLCULO Y VALIDACIÓN
// ========================================

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

/**
 * FUNCIÓN MEJORADA: Valida límite por tipo Y total global
 */
function actualizarTotal(contenedor) {
    if (!contenedor) return;

    const selects = contenedor.querySelectorAll('.gas-select');
    let totalLocal = 0;
    
    selects.forEach(select => {
        totalLocal += parseInt(select.value) || 0;
    });
    
    const totalElement = contenedor.querySelector('.total-count');
    if (totalElement) {
        totalElement.textContent = totalLocal;
    }
    
    // VALIDACIÓN 1: Límite por tipo de carga
    const temporadaAlta = esTemporadaAlta();
    let excesoEncontrado = false;
    
    selects.forEach(select => {
        const valor = parseInt(select.value) || 0;
        const esGrande = select.id.includes('45');
        const maxPermitido = temporadaAlta ? (esGrande ? 2 : 3) : 2;
        
        if (valor > maxPermitido) {
            const nombreCarga = select.id.replace('lipigas', '').replace('abastible', '') + 'kg';
            const marca = select.id.includes('lipigas') ? 'Lipigas' : 'Abastible';
            
            alert(`⚠️ Límite por tipo excedido\n\n${marca} ${nombreCarga}: Máximo ${maxPermitido} cargas\nIntentó seleccionar: ${valor} cargas\n\nEl valor se ajustará automáticamente.`);
            
            select.value = maxPermitido.toString();
            excesoEncontrado = true;
        }
    });
    
    if (excesoEncontrado) {
        actualizarTotal(contenedor);
        return;
    }
    
    // VALIDACIÓN 2: Límite global
    const totalGlobal = calcularTotalGlobal();
    const limiteTotal = obtenerLimiteMaximo();
    
    if (totalGlobal > limiteTotal) {
        alert(`⚠️ Total de cargas excedido\n\nLímite total (Lipigas + Abastible): ${limiteTotal} cargas\nTotal actual: ${totalGlobal} cargas\n\n${temporadaAlta ? 'Temporada Alta: Máximo 6 cargas mensuales' : 'Temporada Normal: Máximo 4 cargas mensuales'}\n\nEl valor se ajustará automáticamente.`);
        
        const lastChanged = Array.from(selects).reverse().find(s => parseInt(s.value) > 0);
        if (lastChanged) {
            lastChanged.value = '0';
            actualizarTotal(contenedor);
        }
    }
}

/**
 * NUEVA FUNCIÓN: Valida todos los límites antes de enviar
 */
function validarLimitesFormulario() {
    const temporadaAlta = esTemporadaAlta();
    const limiteTotal = obtenerLimiteMaximo();
    const maxPorTipo = temporadaAlta ? 3 : 2;
    const max45kg = 2;
    
    let errores = [];
    
    // Validar Lipigas
    if (lipigasOpciones && lipigasOpciones.style.display !== 'none') {
        const l5 = parseInt(document.getElementById('lipigas5')?.value || 0);
        const l11 = parseInt(document.getElementById('lipigas11')?.value || 0);
        const l15 = parseInt(document.getElementById('lipigas15')?.value || 0);
        const l45 = parseInt(document.getElementById('lipigas45')?.value || 0);
        
        if (l5 > maxPorTipo) errores.push(`❌ Lipigas 5kg: ${l5} cargas (máximo ${maxPorTipo})`);
        if (l11 > maxPorTipo) errores.push(`❌ Lipigas 11kg: ${l11} cargas (máximo ${maxPorTipo})`);
        if (l15 > maxPorTipo) errores.push(`❌ Lipigas 15kg: ${l15} cargas (máximo ${maxPorTipo})`);
        if (l45 > max45kg) errores.push(`❌ Lipigas 45kg: ${l45} cargas (máximo ${max45kg})`);
    }
    
    // Validar Abastible
    if (abastibleOpciones && abastibleOpciones.style.display !== 'none') {
        const a5 = parseInt(document.getElementById('abastible5')?.value || 0);
        const a11 = parseInt(document.getElementById('abastible11')?.value || 0);
        const a15 = parseInt(document.getElementById('abastible15')?.value || 0);
        const a45 = parseInt(document.getElementById('abastible45')?.value || 0);
        
        if (a5 > maxPorTipo) errores.push(`❌ Abastible 5kg: ${a5} cargas (máximo ${maxPorTipo})`);
        if (a11 > maxPorTipo) errores.push(`❌ Abastible 11kg: ${a11} cargas (máximo ${maxPorTipo})`);
        if (a15 > maxPorTipo) errores.push(`❌ Abastible 15kg: ${a15} cargas (máximo ${maxPorTipo})`);
        if (a45 > max45kg) errores.push(`❌ Abastible 45kg: ${a45} cargas (máximo ${max45kg})`);
    }
    
    // Validar total global
    const totalGlobal = calcularTotalGlobal();
    if (totalGlobal > limiteTotal) {
        errores.push(`❌ Total: ${totalGlobal} cargas (máximo ${limiteTotal})`);
    }
    
    if (errores.length > 0) {
        const mensaje = `⚠️ LÍMITES EXCEDIDOS\n\n${errores.join('\n')}\n\n📋 Límites ${temporadaAlta ? 'Temporada Alta' : 'Temporada Normal'}:\n• Por tipo: ${maxPorTipo} cargas (45kg: ${max45kg})\n• Total global: ${limiteTotal} cargas\n\nPor favor, ajuste las cantidades.`;
        alert(mensaje);
        return false;
    }
    
    return true;
}

// ========================================
// VALIDACIÓN DE CUPO MENSUAL
// ========================================

function obtenerRangoMesActual() {
    const ahora = new Date();
    const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
    
    return {
        inicio: Timestamp.fromDate(primerDia),
        fin: Timestamp.fromDate(ultimoDia)
    };
}

async function obtenerComprasMesActual(rut) {
    try {
        const rango = obtenerRangoMesActual();
        const rutNormalizado = rut.replace(/\./g, '').replace(/-/g, '');
        
        const comprasRef = collection(db, "comprasGas");
        const q = query(
            comprasRef,
            where("rut", "==", rutNormalizado),
            where("createdAt", ">=", rango.inicio),
            where("createdAt", "<=", rango.fin)
        );
        
        const querySnapshot = await getDocs(q);
        const compras = [];
        
        querySnapshot.forEach((doc) => {
            compras.push({ id: doc.id, ...doc.data() });
        });
        
        return compras;
    } catch (error) {
        console.error("Error al obtener compras:", error);
        return [];
    }
}

function calcularTotalCargasMes(compras) {
    let total = 0;
    
    compras.forEach(compra => {
        if (compra.cargas_lipigas) {
            total += (compra.cargas_lipigas.kg5 || 0);
            total += (compra.cargas_lipigas.kg11 || 0);
            total += (compra.cargas_lipigas.kg15 || 0);
            total += (compra.cargas_lipigas.kg45 || 0);
        }
        
        if (compra.cargas_abastible) {
            total += (compra.cargas_abastible.kg5 || 0);
            total += (compra.cargas_abastible.kg11 || 0);
            total += (compra.cargas_abastible.kg15 || 0);
            total += (compra.cargas_abastible.kg45 || 0);
        }
    });
    
    return total;
}

async function validarCupoDisponible(rut) {
    try {
        const comprasMes = await obtenerComprasMesActual(rut);
        const totalUsado = calcularTotalCargasMes(comprasMes);
        const limiteMaximo = obtenerLimiteMaximo();
        const cupoDisponible = limiteMaximo - totalUsado;
        const temporada = esTemporadaAlta() ? 'alta' : 'normal';
        
        return {
            success: true,
            puedeComprar: cupoDisponible > 0,
            totalUsado: totalUsado,
            limiteMaximo: limiteMaximo,
            cupoDisponible: cupoDisponible,
            temporada: temporada,
            comprasPrevias: comprasMes.length,
            mensaje: cupoDisponible > 0 
                ? `Tiene ${cupoDisponible} cargas disponibles este mes` 
                : `Ha alcanzado el límite mensual de ${limiteMaximo} cargas`
        };
    } catch (error) {
        console.error("Error en validación de cupo:", error);
        return { success: false, error: error.message, puedeComprar: false };
    }
}

function mostrarInfoCupo(validacion) {
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
        
        const rutGroup = rutInput.closest('.form-group');
        if (rutGroup) {
            rutGroup.parentNode.insertBefore(infoContainer, rutGroup.nextSibling);
        }
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
            <strong>Ha alcanzado el límite mensual.</strong>
        `;
    }
}

function deshabilitarFormulario() {
    if (compraLipigas) compraLipigas.disabled = true;
    if (compraAbastible) compraAbastible.disabled = true;

    const btnSubmit = formCompraGas.querySelector('button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = '❌ Sin Cupo Disponible';
        btnSubmit.style.opacity = '0.5';
    }

    if (lipigasOpciones) lipigasOpciones.style.display = 'none';
    if (abastibleOpciones) abastibleOpciones.style.display = 'none';
}

function habilitarFormulario() {
    if (compraLipigas) compraLipigas.disabled = false;
    if (compraAbastible) compraAbastible.disabled = false;

    const btnSubmit = formCompraGas.querySelector('button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Enviar Compra';
        btnSubmit.style.opacity = '1';
    }
}

async function verificarCupoUsuario() {
    const rut = rutInput.value.trim();
    if (!rut) return;

    try {
        const validacion = await validarCupoDisponible(rut);
        
        if (!validacion.success) {
            console.error('Error en validación:', validacion.error);
            return;
        }

        mostrarInfoCupo(validacion);

        if (!validacion.puedeComprar) {
            deshabilitarFormulario();
        } else {
            habilitarFormulario();
        }
    } catch (error) {
        console.error('Error al verificar cupo:', error);
    }
}

// ========================================
// FUNCIÓN DE GUARDADO (SIN STORAGE)
// ========================================

async function guardarCompraEnFirebase(formData, comprobanteFile) {
    console.log('💾 Guardando en Firebase (sin subir archivo físico)...');
    
    try {
        const compraLipigasValue = formData.get('compraLipigas') === 'si';
        const compraAbastibleValue = formData.get('compraAbastible') === 'si';

        const compraData = {
            uid: auth.currentUser.uid,
            email: formData.get('emailGas'),
            rut: formData.get('rutGas').replace(/\./g, '').replace(/-/g, ''),
            nombre: formData.get('nombreGas'),
            telefono: formData.get('telefonoGas'),
            fechaCompra: formData.get('fechaCompraGas'),
            
            compraLipigas: compraLipigasValue,
            cargas_lipigas: compraLipigasValue ? {
                kg5: parseInt(formData.get('lipigas5')) || 0,
                kg11: parseInt(formData.get('lipigas11')) || 0,
                kg15: parseInt(formData.get('lipigas15')) || 0,
                kg45: parseInt(formData.get('lipigas45')) || 0
            } : null,
            
            compraAbastible: compraAbastibleValue,
            cargas_abastible: compraAbastibleValue ? {
                kg5: parseInt(formData.get('abastible5')) || 0,
                kg11: parseInt(formData.get('abastible11')) || 0,
                kg15: parseInt(formData.get('abastible15')) || 0,
                kg45: parseInt(formData.get('abastible45')) || 0
            } : null,
            
            saldoFavor: formData.get('saldoFavor') || null,
            comprobanteNombre: comprobanteFile ? comprobanteFile.name : null,
            comprobanteTamaño: comprobanteFile ? comprobanteFile.size : null,
            comprobanteNota: 'Usuario debe enviar por email',
            
            estado: 'pendiente_comprobante',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        const docRef = await addDoc(collection(db, "comprasGas"), compraData);
        
        return {
            success: true,
            id: docRef.id,
            message: 'Compra registrada. Envíe el comprobante por email con el ID de su compra'
        };

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

// ========================================
// EVENT LISTENERS
// ========================================

function inicializarEventListeners() {
    if (compraLipigas) {
        compraLipigas.addEventListener('change', function() {
            if (this.value === 'si') {
                actualizarOpcionesGas(lipigasOpciones, 'lipigas');
            } else {
                if (lipigasOpciones) {
                    lipigasOpciones.style.display = 'none';
                    lipigasOpciones.querySelectorAll('select').forEach(s => s.value = '0');
                    actualizarTotal(lipigasOpciones);
                }
            }
        });
    }

    if (compraAbastible) {
        compraAbastible.addEventListener('change', function() {
            if (this.value === 'si') {
                actualizarOpcionesGas(abastibleOpciones, 'abastible');
            } else {
                if (abastibleOpciones) {
                    abastibleOpciones.style.display = 'none';
                    abastibleOpciones.querySelectorAll('select').forEach(s => s.value = '0');
                    actualizarTotal(abastibleOpciones);
                }
            }
        });
    }

    if (lipigasOpciones) {
        lipigasOpciones.querySelectorAll('.gas-select').forEach(select => {
            select.addEventListener('change', () => actualizarTotal(lipigasOpciones));
        });
    }

    if (abastibleOpciones) {
        abastibleOpciones.querySelectorAll('.gas-select').forEach(select => {
            select.addEventListener('change', () => actualizarTotal(abastibleOpciones));
        });
    }

    if (rutInput) {
        rutInput.addEventListener('blur', verificarCupoUsuario);
    }

    if (formCompraGas) {
        formCompraGas.addEventListener('submit', handleFormSubmit);
    }
}

function inicializarFecha() {
    const fechaInput = document.getElementById('fechaCompraGas');
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.value = today;
        fechaInput.max = today;
    }
}

function inicializarValidacionCupo() {
    if (rutInput && rutInput.value.trim()) {
        verificarCupoUsuario();
    }
}

// ========================================
// MANEJADOR DEL SUBMIT
// ========================================

async function handleFormSubmit(e) {
    e.preventDefault();
    console.log('🔍 Iniciando envío del formulario');

    try {
        const comprandoLipigas = compraLipigas.value === 'si';
        const comprandoAbastible = compraAbastible.value === 'si';

        if (!comprandoLipigas && !comprandoAbastible) {
            alert('⚠️ Debe seleccionar al menos una empresa');
            return false;
        }

        const totalCargas = calcularTotalGlobal();

        if (totalCargas === 0) {
            alert('⚠️ Debe seleccionar al menos una carga');
            return false;
        }

        // VALIDACIÓN MEJORADA: Por tipo y total
        if (!validarLimitesFormulario()) {
            return false;
        }

        // Validación de cupo mensual
        const rut = rutInput.value.trim();
        if (!rut) {
            alert('⚠️ Debe ingresar su RUT');
            return false;
        }

        const validacion = await validarCupoDisponible(rut);

        if (!validacion.success || !validacion.puedeComprar) {
            alert(`❌ ${validacion.mensaje}\n\nNo puede realizar más compras este mes.`);
            return false;
        }

        if (totalCargas > validacion.cupoDisponible) {
            alert(`❌ La compra excede su cupo disponible.\n\nDisponible: ${validacion.cupoDisponible} cargas\nIntenta comprar: ${totalCargas} cargas`);
            return false;
        }

        const formData = new FormData(formCompraGas);
        const comprobanteFile = document.getElementById('comprobanteGas').files[0];

        if (!comprobanteFile) {
            alert('⚠️ Debe adjuntar el comprobante');
            return false;
        }

        const btnSubmit = formCompraGas.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = '⏳ Guardando...';
        }

        const resultado = await guardarCompraEnFirebase(formData, comprobanteFile);

        if (resultado.success) {
            alert(`✅ ${resultado.message}\n\nID: ${resultado.id}\n\n⚠️ Envíe el comprobante por email mencionando este ID.`);
            
            formCompraGas.reset();
            if (lipigasOpciones) lipigasOpciones.style.display = 'none';
            if (abastibleOpciones) abastibleOpciones.style.display = 'none';
            
            setTimeout(() => window.location.reload(), 2000);
        }

    } catch (error) {
        console.error('❌ Error:', error);
        alert(`❌ Error: ${error.message}`);
    } finally {
        const btnSubmit = formCompraGas.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Enviar Compra';
        }
    }
}

// ========================================
// EXPORTAR
// ========================================
export {
    esTemporadaAlta,
    obtenerLimiteMaximo,
    calcularTotalGlobal,
    validarCupoDisponible,
    guardarCompraEnFirebase,
    validarLimitesFormulario
};
