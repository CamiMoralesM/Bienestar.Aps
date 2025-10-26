// ========================================
// SISTEMA UNIFICADO DE COMPRAS - COMPLETO
// Gas, Cine, Jumper Trampoline Park y Gimnasio
// CON VALIDACIÓN AUTOMÁTICA DE CUPOS MENSUALES
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
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// IMPORTAR FUNCIONES DE VALIDACIÓN DE CUPOS
import { 
    validarCupoMensual,
    validarCupoGas,
    validarCupoCine,
    validarCupoJumper,
    validarCupoGimnasio,
    inicializarValidacionCupoAutomatica,
    bloquearFormularioPorCupo,
    habilitarFormularioPorCupo,
    validarCupoEnRUT
} from './validacion-cupo-mensual.js';

// ========================================
// CONSTANTES UNIFICADAS
// ========================================

// Límites mensuales por tipo de compra
const LIMITES_MENSUALES = {
    // Gas (por temporada)
    gas_temporada_normal: 4,
    gas_temporada_alta: 6,
    
    // Entretenimiento
    cine: 4,
    jumper: 6,
    gimnasio: 4
};

// Precios por tipo
const PRECIOS = {
    cine: 7000,        // $7.000 entrada + combo
    jumper: 6500,      // $6.500 entrada + combo  
    gimnasio: 18000    // $18.000 ticket mensual
};

// Colecciones de Firebase
const COLECCIONES = {
    gas: 'comprasGas',
    cine: 'comprasCine',
    jumper: 'comprasJumper',
    gimnasio: 'comprasGimnasio'
};

// Nombres descriptivos
const NOMBRES_TIPOS = {
    gas: 'Compra de Gas',
    cine: 'Cine',
    jumper: 'Jumper Trampoline Park',
    gimnasio: 'Gimnasio Energy'
};

// ========================================
// VARIABLES GLOBALES UNIFICADAS
// ========================================
let compraLipigas, compraAbastible, lipigasOpciones, abastibleOpciones, rutInput, formCompraGas;

// Variables para entretenimiento
let formCompraCine, formCompraJumper, formCompraGimnasio;
let selectCantidadCine, selectCantidadJumper, selectCantidadGimnasio;

// Variables para inputs de RUT de entretenimiento
let rutInputCine, rutInputJumper, rutInputGimnasio;

// ========================================
// INICIALIZACIÓN UNIFICADA
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Inicializando sistema unificado de compras...');
    
    // Elementos de gas
    compraLipigas = document.getElementById('compraLipigas');
    compraAbastible = document.getElementById('compraAbastible');
    lipigasOpciones = document.getElementById('lipigasOpciones');
    abastibleOpciones = document.getElementById('abastibleOpciones');
    rutInput = document.getElementById('rutGas');
    formCompraGas = document.getElementById('formCompraGas');

    // Elementos de entretenimiento
    formCompraCine = document.getElementById('formCompraCine');
    formCompraJumper = document.getElementById('formCompraJumper');
    formCompraGimnasio = document.getElementById('formCompraGimnasio');
    
    selectCantidadCine = document.getElementById('cantidadCine');
    selectCantidadJumper = document.getElementById('cantidadJumper');
    selectCantidadGimnasio = document.getElementById('cantidadGimnasio');

    // Inputs de RUT para entretenimiento
    rutInputCine = document.getElementById('rutCine');
    rutInputJumper = document.getElementById('rutJumper');
    rutInputGimnasio = document.getElementById('rutGimnasio');

    // Inicializar según qué elementos estén presentes
    if (formCompraGas) {
        inicializarSistemaGas();
    }
    
    if (formCompraCine) {
        inicializarSistemaEntretenimiento('cine');
    }
    
    if (formCompraJumper) {
        inicializarSistemaEntretenimiento('jumper');
    }
    
    if (formCompraGimnasio) {
        inicializarSistemaEntretenimiento('gimnasio');
    }
    
    console.log('✅ Sistema unificado inicializado correctamente');
});

// ========================================
// FUNCIONES DE TEMPORADA (GAS)
// ========================================

function esTemporadaAlta() {
    const fecha = new Date();
    const mes = fecha.getMonth() + 1;
    return mes >= 6 && mes <= 9;
}

function obtenerLimiteMaximoGas() {
    return esTemporadaAlta() ? LIMITES_MENSUALES.gas_temporada_alta : LIMITES_MENSUALES.gas_temporada_normal;
}

// ========================================
// FUNCIONES DE LÍMITES DE ENTRETENIMIENTO
// ========================================

function obtenerLimiteEntretenimiento(tipo) {
    return LIMITES_MENSUALES[tipo] || 4;
}

function obtenerPrecioEntretenimiento(tipo) {
    return PRECIOS[tipo] || 0;
}

// ========================================
// FUNCIONES DE OPCIONES DE GAS
// ========================================

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
    
    const valorActual = parseInt(selectElement.value) || 0;
    if (valorActual > maxOpciones) {
        selectElement.value = maxOpciones.toString();
    }
}

function actualizarOpcionesGas(contenedor, empresa) {
    if (!contenedor) return;

    const temporadaAlta = esTemporadaAlta();
    const limiteTotal = obtenerLimiteMaximoGas();
    
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
// FUNCIONES DE OPCIONES DE ENTRETENIMIENTO
// ========================================

function generarOpcionesEntretenimiento(tipo, selectElement) {
    const limite = obtenerLimiteEntretenimiento(tipo);
    
    selectElement.innerHTML = '<option value="0">Seleccionar cantidad</option>';
    
    for (let i = 1; i <= limite; i++) {
        selectElement.innerHTML += `<option value="${i}">${i}</option>`;
    }
}

function actualizarPrecioTotal(tipo, cantidad) {
    const precio = obtenerPrecioEntretenimiento(tipo);
    const total = precio * cantidad;
    
    const elementoTotal = document.getElementById(`total${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    if (elementoTotal) {
        elementoTotal.textContent = `$${total.toLocaleString('es-CL')}`;
    }
}

// ========================================
// FUNCIONES DE VALIDACIÓN ESPECÍFICAS PARA ENTRETENIMIENTO
// ========================================

/**
 * Valida el cupo disponible y las cantidades seleccionadas en entretenimiento
 */
async function validarCompraEntretenimiento(rut, tipo, cantidad) {
    try {
        console.log(`🔍 Validando compra de ${tipo}: ${cantidad} entradas para RUT ${rut}`);
        
        // Validar cupo mensual
        const validacionCupo = await validarCupoMensual(rut, tipo, cantidad);
        
        if (!validacionCupo.success) {
            throw new Error(validacionCupo.error || `Error al validar cupo de ${tipo}`);
        }
        
        if (!validacionCupo.puedeComprar) {
            throw new Error(`❌ Cupo mensual de ${NOMBRES_TIPOS[tipo]} agotado (${validacionCupo.usoActual}/${validacionCupo.limiteCupo})`);
        }
        
        if (!validacionCupo.puedeComprarCantidad) {
            throw new Error(`❌ La cantidad solicitada (${cantidad}) excede su cupo disponible.\n\n` +
                          `Disponible: ${validacionCupo.disponible} entradas\n` +
                          `Límite mensual: ${validacionCupo.limiteCupo} entradas\n` +
                          `Ya usado: ${validacionCupo.usoActual} entradas`);
        }
        
        return {
            success: true,
            validacionCupo,
            mensaje: `✅ Compra autorizada: ${cantidad} entradas de ${NOMBRES_TIPOS[tipo]}`
        };
        
    } catch (error) {
        console.error(`❌ Error en validación de ${tipo}:`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Actualiza las opciones del select de cantidad según el cupo disponible
 */
function actualizarOpcionesSegunCupo(tipo, cupoDisponible) {
    const selectCantidad = document.getElementById(`cantidad${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    if (!selectCantidad) return;
    
    const limiteMaximo = obtenerLimiteEntretenimiento(tipo);
    const maxSeleccionable = Math.min(cupoDisponible, limiteMaximo);
    
    console.log(`📊 Actualizando opciones ${tipo}: cupo disponible=${cupoDisponible}, máximo=${maxSeleccionable}`);
    
    // Limpiar opciones existentes
    selectCantidad.innerHTML = '<option value="0">Seleccionar cantidad</option>';
    
    // Agregar opciones según cupo disponible
    for (let i = 1; i <= maxSeleccionable; i++) {
        selectCantidad.innerHTML += `<option value="${i}">${i}</option>`;
    }
    
    // Si no hay cupo, mostrar mensaje
    if (cupoDisponible === 0) {
        selectCantidad.innerHTML = '<option value="0">❌ Sin cupo disponible</option>';
        selectCantidad.disabled = true;
    } else {
        selectCantidad.disabled = false;
    }
}

// ========================================
// FUNCIONES DE CÁLCULO Y VALIDACIÓN (GAS)
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
    
    const totalGlobal = calcularTotalGlobal();
    const limiteTotal = obtenerLimiteMaximoGas();
    
    if (totalGlobal > limiteTotal) {
        alert(`⚠️ Total de cargas excedido\n\nLímite total (Lipigas + Abastible): ${limiteTotal} cargas\nTotal actual: ${totalGlobal} cargas\n\n${temporadaAlta ? 'Temporada Alta: Máximo 6 cargas mensuales' : 'Temporada Normal: Máximo 4 cargas mensuales'}\n\nEl valor se ajustará automáticamente.`);
        
        const lastChanged = Array.from(selects).reverse().find(s => parseInt(s.value) > 0);
        if (lastChanged) {
            lastChanged.value = '0';
            actualizarTotal(contenedor);
        }
    }
}

function validarLimitesFormulario() {
    const temporadaAlta = esTemporadaAlta();
    const limiteTotal = obtenerLimiteMaximoGas();
    const maxPorTipo = temporadaAlta ? 3 : 2;
    const max45kg = 2;
    
    let errores = [];
    
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
    
    const totalCargas = calcularTotalGlobal();
    if (totalCargas > limiteTotal) {
        errores.push(`❌ Total de cargas: ${totalCargas} (máximo ${limiteTotal})`);
    }
    
    if (errores.length > 0) {
        const temporadaInfo = temporadaAlta ? 
            'Temporada Alta (Jun-Sep): Máximo 3 por tipo (2 para 45kg), total 6 cargas' :
            'Temporada Normal (Oct-May): Máximo 2 por tipo, total 4 cargas';
        
        alert(`❌ Errores en las cantidades:\n\n${errores.join('\n')}\n\n📋 ${temporadaInfo}\n\nCorreija los valores antes de continuar.`);
        return false;
    }
    
    return true;
}

// ========================================
// FUNCIONES DE VALIDACIÓN DE CUPO UNIFICADO
// ========================================

async function validarCupoDisponible(rut, tipo = 'gas') {
    try {
        console.log(`🔍 Validando cupo ${tipo} para RUT:`, rut);
        
        const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '');
        
        const ahora = new Date();
        const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
        
        const inicioMes = Timestamp.fromDate(primerDia);
        const finMes = Timestamp.fromDate(ultimoDia);
        
        const coleccion = COLECCIONES[tipo];
        const q = query(
            collection(db, coleccion),
            where("rut", "==", rutLimpio),
            where("createdAt", ">=", inicioMes),
            where("createdAt", "<=", finMes)
        );
        
        const querySnapshot = await getDocs(q);
        
        let totalComprasDelMes = 0;
        
        querySnapshot.forEach(doc => {
            const data = doc.data();
            
            if (tipo === 'gas') {
                // Sumar cargas de gas
                if (data.cargas_lipigas) {
                    totalComprasDelMes += (data.cargas_lipigas.kg5 || 0);
                    totalComprasDelMes += (data.cargas_lipigas.kg11 || 0);
                    totalComprasDelMes += (data.cargas_lipigas.kg15 || 0);
                    totalComprasDelMes += (data.cargas_lipigas.kg45 || 0);
                }
                
                if (data.cargas_abastible) {
                    totalComprasDelMes += (data.cargas_abastible.kg5 || 0);
                    totalComprasDelMes += (data.cargas_abastible.kg11 || 0);
                    totalComprasDelMes += (data.cargas_abastible.kg15 || 0);
                    totalComprasDelMes += (data.cargas_abastible.kg45 || 0);
                }
            } else {
                // Para entretenimiento, contar cantidad
                totalComprasDelMes += (data.cantidad || 0);
            }
        });
        
        const limiteMaximo = tipo === 'gas' ? obtenerLimiteMaximoGas() : obtenerLimiteEntretenimiento(tipo);
        const cupoDisponible = limiteMaximo - totalComprasDelMes;
        const puedeComprar = cupoDisponible > 0;
        
        console.log(`📊 Cupo ${tipo} del usuario: ${totalComprasDelMes}/${limiteMaximo}`);
        
        return {
            success: true,
            totalComprasDelMes,
            limiteMaximo,
            cupoDisponible,
            puedeComprar,
            mensaje: puedeComprar ? 
                `Tiene ${cupoDisponible} ${tipo === 'gas' ? 'cargas' : 'entradas'} disponibles este mes` :
                `Ha alcanzado el límite mensual de ${limiteMaximo} ${tipo === 'gas' ? 'cargas' : 'entradas'}`
        };
        
    } catch (error) {
        console.error(`❌ Error al validar cupo ${tipo}:`, error);
        return {
            success: false,
            mensaje: `Error al verificar el cupo disponible de ${tipo}`
        };
    }
}

// ========================================
// FUNCIONES DE GUARDADO UNIFICADO
// ========================================

async function guardarCompraEnFirebase(formData, comprobanteFile, tipo = 'gas') {
    console.log(`💾 Guardando compra de ${tipo} en Firebase...`);
    
    try {
        const coleccion = COLECCIONES[tipo];
        let compraData = {
            uid: auth.currentUser.uid,
            email: formData.get(`email${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`),
            rut: formData.get(`rut${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`).replace(/\./g, '').replace(/-/g, ''),
            nombre: formData.get(`nombre${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`),
            telefono: formData.get(`telefono${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`),
            fechaCompra: formData.get(`fechaCompra${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`),
            comprobanteNombre: comprobanteFile ? comprobanteFile.name : null,
            comprobanteTamaño: comprobanteFile ? comprobanteFile.size : null,
            comprobanteNota: 'Usuario debe enviar por email',
            estado: 'pendiente',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        if (tipo === 'gas') {
            const compraLipigasValue = formData.get('compraLipigas') === 'si';
            const compraAbastibleValue = formData.get('compraAbastible') === 'si';

            compraData.compraLipigas = compraLipigasValue;
            compraData.cargas_lipigas = compraLipigasValue ? {
                kg5: parseInt(formData.get('lipigas5')) || 0,
                kg11: parseInt(formData.get('lipigas11')) || 0,
                kg15: parseInt(formData.get('lipigas15')) || 0,
                kg45: parseInt(formData.get('lipigas45')) || 0
            } : null;
            
            compraData.compraAbastible = compraAbastibleValue;
            compraData.cargas_abastible = compraAbastibleValue ? {
                kg5: parseInt(formData.get('abastible5')) || 0,
                kg11: parseInt(formData.get('abastible11')) || 0,
                kg15: parseInt(formData.get('abastible15')) || 0,
                kg45: parseInt(formData.get('abastible45')) || 0
            } : null;
            
            compraData.saldoFavor = formData.get('saldoFavor') || null;
        } else {
            // Para entretenimiento
            const cantidad = parseInt(formData.get(`cantidad${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`)) || 0;
            const precio = obtenerPrecioEntretenimiento(tipo);
            
            compraData.tipo = tipo;
            compraData.cantidad = cantidad;
            compraData.precioUnitario = precio;
            compraData.precioTotal = precio * cantidad;
        }

        const docRef = await addDoc(collection(db, coleccion), compraData);
        
        return {
            success: true,
            id: docRef.id,
            message: `Compra de ${NOMBRES_TIPOS[tipo]} registrada. Envíe el comprobante por email con el ID de su compra`
        };

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

// ========================================
// FUNCIONES DE INICIALIZACIÓN
// ========================================

function inicializarSistemaGas() {
    if (!formCompraGas) return;
    
    inicializarEventListenersGas();
    inicializarFecha('fechaCompraGas');
    
    // Inicializar validación automática de cupo para gas
    if (rutInput) {
        inicializarValidacionCupoAutomatica('rutGas', 'formCompraGas', 'gas');
    }
}

function inicializarSistemaEntretenimiento(tipo) {
    const form = document.getElementById(`formCompra${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    if (!form) return;
    
    const selectCantidad = document.getElementById(`cantidad${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    const rutInputElement = document.getElementById(`rut${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    
    if (selectCantidad) {
        generarOpcionesEntretenimiento(tipo, selectCantidad);
        
        selectCantidad.addEventListener('change', function() {
            const cantidad = parseInt(this.value) || 0;
            actualizarPrecioTotal(tipo, cantidad);
        });
    }
    
    inicializarFecha(`fechaCompra${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    
    // Inicializar validación automática de cupo para entretenimiento
    if (rutInputElement) {
        console.log(`🎯 Inicializando validación automática para ${tipo}`);
        
        // Evento blur para validar cuando pierde el foco
        rutInputElement.addEventListener('blur', async () => {
            await validarCupoEntretenimiento(rutInputElement, form, tipo, selectCantidad);
        });
        
        // Evento input con delay para validar mientras escribe
        let timeoutId;
        rutInputElement.addEventListener('input', () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(async () => {
                await validarCupoEntretenimiento(rutInputElement, form, tipo, selectCantidad);
            }, 1500);
        });
        
        // Validar inmediatamente si ya hay un valor
        if (rutInputElement.value.trim()) {
            validarCupoEntretenimiento(rutInputElement, form, tipo, selectCantidad);
        }
    }
    
    form.addEventListener('submit', (e) => handleFormSubmitEntretenimiento(e, tipo));
}

/**
 * Valida el cupo para entretenimiento y actualiza la UI
 */
async function validarCupoEntretenimiento(rutInputElement, form, tipo, selectCantidad) {
    const rut = rutInputElement.value.trim();
    
    if (!rut || rut.length < 8) {
        // RUT incompleto, habilitar formulario
        habilitarFormularioEntretenimiento(form, tipo, selectCantidad, {
            mensaje: 'Ingrese su RUT para verificar el cupo disponible',
            cupoDisponible: obtenerLimiteEntretenimiento(tipo)
        });
        return null;
    }
    
    try {
        console.log(`🔍 [${tipo.toUpperCase()}] Validando cupo para RUT: ${rut}`);
        
        // Mostrar indicador de carga
        mostrarIndicadorCarga(form, `Verificando cupo de ${NOMBRES_TIPOS[tipo]}...`);
        
        // Validar cupo usando la función del módulo de validación
        const validacion = await validarCupoMensual(rut, tipo);
        
        // Remover indicador de carga
        removerIndicadorCarga(form);
        
        if (validacion.success) {
            if (validacion.puedeComprar) {
                habilitarFormularioEntretenimiento(form, tipo, selectCantidad, validacion);
                
                // Actualizar opciones del select según cupo disponible
                if (selectCantidad) {
                    actualizarOpcionesSegunCupo(tipo, validacion.disponible);
                }
            } else {
                bloquearFormularioEntretenimiento(form, tipo, selectCantidad, validacion);
            }
        } else {
            // Error en la validación
            habilitarFormularioEntretenimiento(form, tipo, selectCantidad, {
                mensaje: 'Error al verificar cupo. Inténtelo nuevamente.',
                error: true
            });
        }
        
        return validacion;
        
    } catch (error) {
        console.error(`❌ [${tipo.toUpperCase()}] Error al validar cupo:`, error);
        
        removerIndicadorCarga(form);
        
        habilitarFormularioEntretenimiento(form, tipo, selectCantidad, {
            mensaje: 'Error al verificar cupo. Inténtelo nuevamente.',
            error: true
        });
        
        return null;
    }
}

function inicializarEventListenersGas() {
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

    if (formCompraGas) {
        formCompraGas.addEventListener('submit', handleFormSubmitGas);
    }
}

function inicializarFecha(inputId) {
    const fechaInput = document.getElementById(inputId);
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.value = today;
        fechaInput.max = today;
    }
}

// ========================================
// FUNCIONES DE HABILITACIÓN/DESHABILITACIÓN PARA ENTRETENIMIENTO
// ========================================

function bloquearFormularioEntretenimiento(form, tipo, selectCantidad, validacion) {
    if (!form) return;
    
    console.log(`🔒 [${tipo.toUpperCase()}] Bloqueando formulario por cupo agotado`);
    
    // Deshabilitar elementos del formulario
    const elementos = form.querySelectorAll('input:not([type="submit"]), select, textarea');
    elementos.forEach(el => {
        if (el.id !== `rut${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`) { // Mantener RUT habilitado
            el.disabled = true;
            el.style.backgroundColor = '#f8f9fa';
            el.style.color = '#6c757d';
        }
    });
    
    // Deshabilitar select de cantidad específicamente
    if (selectCantidad) {
        selectCantidad.innerHTML = '<option value="0">❌ Sin cupo disponible</option>';
        selectCantidad.disabled = true;
    }
    
    // Modificar botón de envío
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = `❌ Cupo ${NOMBRES_TIPOS[tipo]} Agotado`;
        submitBtn.style.backgroundColor = '#dc3545';
        submitBtn.style.color = 'white';
        submitBtn.style.border = '1px solid #dc3545';
        submitBtn.style.cursor = 'not-allowed';
    }
    
    // Mostrar mensaje de estado
    mostrarMensajeCupoEnFormulario(form, validacion, 'agotado', tipo);
}

function habilitarFormularioEntretenimiento(form, tipo, selectCantidad, validacion) {
    if (!form) return;
    
    console.log(`🔓 [${tipo.toUpperCase()}] Habilitando formulario`);
    
    // Habilitar elementos del formulario
    const elementos = form.querySelectorAll('input, select, textarea, button');
    elementos.forEach(el => {
        el.disabled = false;
        el.style.backgroundColor = '';
        el.style.color = '';
    });
    
    // Restaurar select de cantidad
    if (selectCantidad && validacion.cupoDisponible !== undefined) {
        generarOpcionesEntretenimiento(tipo, selectCantidad);
        actualizarOpcionesSegunCupo(tipo, validacion.cupoDisponible);
    }
    
    // Restaurar botón de envío
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = `Enviar Compra de ${NOMBRES_TIPOS[tipo]}`;
        submitBtn.style.backgroundColor = '';
        submitBtn.style.color = '';
        submitBtn.style.border = '';
        submitBtn.style.cursor = 'pointer';
    }
    
    // Mostrar mensaje de estado
    const estado = validacion.error ? 'error' : (validacion.estadoCupo || 'disponible');
    mostrarMensajeCupoEnFormulario(form, validacion, estado, tipo);
}

function mostrarMensajeCupoEnFormulario(form, validacion, estado, tipo) {
    if (!form) return;
    
    let mensajeCupo = form.querySelector('.mensaje-cupo-estado');
    if (!mensajeCupo) {
        mensajeCupo = document.createElement('div');
        mensajeCupo.className = 'mensaje-cupo-estado';
        form.insertBefore(mensajeCupo, form.firstElementChild);
    }
    
    let color, icono, titulo, contenido;
    
    switch (estado) {
        case 'agotado':
            color = '#dc3545';
            icono = '❌';
            titulo = 'Cupo Mensual Agotado';
            contenido = `
                <strong>${titulo}</strong><br>
                <small>${validacion.mensaje || `Ha agotado su cupo mensual de ${NOMBRES_TIPOS[tipo]}`}</small><br>
                <small style="opacity: 0.8;">Podrá realizar nuevas compras el próximo mes.</small>
            `;
            break;
            
        case 'critico':
            color = '#fd7e14';
            icono = '⚠️';
            titulo = 'Cupo Crítico';
            contenido = `
                <strong>${titulo}</strong><br>
                <small>${validacion.mensaje || 'Quedan pocas entradas disponibles'}</small>
            `;
            break;
            
        case 'error':
            color = '#dc3545';
            icono = '⚠️';
            titulo = 'Error de Verificación';
            contenido = `
                <strong>${titulo}</strong><br>
                <small>${validacion.mensaje || 'Error al verificar cupo disponible'}</small>
            `;
            break;
            
        default: // disponible
            color = '#28a745';
            icono = '✅';
            titulo = 'Cupo Disponible';
            contenido = `
                <strong>${titulo}</strong><br>
                <small>${validacion.mensaje || `Cupo disponible para ${NOMBRES_TIPOS[tipo]}`}</small>
            `;
    }
    
    mensajeCupo.style.cssText = `
        padding: 12px 16px;
        margin-bottom: 20px;
        border-radius: 8px;
        font-weight: 500;
        font-size: 14px;
        border: 2px solid ${color};
        background-color: ${color}15;
        color: ${color};
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    
    mensajeCupo.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">${icono}</span>
            <div>${contenido}</div>
        </div>
    `;
}

function mostrarIndicadorCarga(form, mensaje) {
    let loader = form.querySelector('.cupo-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.className = 'cupo-loader';
        loader.style.cssText = `
            padding: 8px 16px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
            background-color: #f8f9fa;
            border-radius: 4px;
            margin-bottom: 10px;
        `;
        form.insertBefore(loader, form.firstElementChild);
    }
    loader.innerHTML = `⏳ ${mensaje}`;
}

function removerIndicadorCarga(form) {
    const loader = form?.querySelector('.cupo-loader');
    if (loader) loader.remove();
}

// ========================================
// FUNCIONES DE HABILITACIÓN/DESHABILITACIÓN (HEREDADAS)
// ========================================

function bloquearFormulario(tipo = 'gas') {
    const form = tipo === 'gas' ? formCompraGas : document.getElementById(`formCompra${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    if (!form) return;
    
    const elements = form.querySelectorAll('input, select, button');
    elements.forEach(el => {
        if (el.type !== 'submit') {
            el.disabled = true;
        }
    });
    
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '❌ Cupo Agotado';
        submitBtn.style.background = '#dc3545';
    }
}

function habilitarFormulario(tipo = 'gas') {
    const form = tipo === 'gas' ? formCompraGas : document.getElementById(`formCompra${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    if (!form) return;
    
    const elements = form.querySelectorAll('input, select, button');
    elements.forEach(el => el.disabled = false);
    
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = `Enviar Compra de ${NOMBRES_TIPOS[tipo]}`;
        submitBtn.style.background = '';
    }
}

async function verificarCupoUsuario(tipo = 'gas') {
    const rutInputElement = tipo === 'gas' ? rutInput : document.getElementById(`rut${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    if (!rutInputElement) return;
    
    const rut = rutInputElement.value.trim();
    
    if (!rut || rut.length < 8) {
        habilitarFormulario(tipo);
        return;
    }
    
    try {
        const validacion = await validarCupoDisponible(rut, tipo);
        
        if (validacion.success && !validacion.puedeComprar) {
            alert(`❌ ${validacion.mensaje}\n\nNo puede realizar más compras este mes.`);
            bloquearFormulario(tipo);
        } else {
            habilitarFormulario(tipo);
        }
    } catch (error) {
        console.error(`Error al verificar cupo ${tipo}:`, error);
    }
}

// ========================================
// MANEJADORES DE SUBMIT
// ========================================

async function handleFormSubmitGas(e) {
    e.preventDefault();
    console.log('🔍 Iniciando envío del formulario de gas');

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

        if (!validarLimitesFormulario()) {
            return false;
        }

        const rut = rutInput.value.trim();
        if (!rut) {
            alert('⚠️ Debe ingresar su RUT');
            return false;
        }

        // Usar la nueva función de validación
        const validacion = await validarCupoGas(rut, totalCargas);

        if (!validacion.success || !validacion.puedeComprar) {
            alert(`❌ ${validacion.mensaje}\n\nNo puede realizar más compras este mes.`);
            return false;
        }

        if (!validacion.puedeComprarCantidad) {
            alert(`❌ La compra excede su cupo disponible.\n\n` +
                  `Disponible: ${validacion.disponible} cargas\n` +
                  `Intenta comprar: ${totalCargas} cargas\n` +
                  `Límite mensual: ${validacion.limiteCupo} cargas`);
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

        const resultado = await guardarCompraEnFirebase(formData, comprobanteFile, 'gas');

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

async function handleFormSubmitEntretenimiento(e, tipo) {
    e.preventDefault();
    console.log(`🔍 Iniciando envío del formulario de ${tipo}`);

    try {
        const form = e.target;
        const cantidad = parseInt(document.getElementById(`cantidad${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`).value) || 0;

        if (cantidad === 0) {
            alert(`⚠️ Debe seleccionar al menos una entrada de ${NOMBRES_TIPOS[tipo]}`);
            return false;
        }

        const rutInputElement = document.getElementById(`rut${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
        const rut = rutInputElement.value.trim();
        
        if (!rut) {
            alert('⚠️ Debe ingresar su RUT');
            return false;
        }

        // VALIDACIÓN ESPECÍFICA PARA ENTRETENIMIENTO CON LA NUEVA FUNCIÓN
        const validacionCompra = await validarCompraEntretenimiento(rut, tipo, cantidad);

        if (!validacionCompra.success) {
            alert(validacionCompra.error);
            return false;
        }

        const formData = new FormData(form);
        const comprobanteFile = document.getElementById(`comprobante${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`).files[0];

        if (!comprobanteFile) {
            alert('⚠️ Debe adjuntar el comprobante');
            return false;
        }

        const btnSubmit = form.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = '⏳ Guardando...';
        }

        const resultado = await guardarCompraEnFirebase(formData, comprobanteFile, tipo);

        if (resultado.success) {
            const detalleCompra = `\n\n📋 DETALLES DE LA COMPRA:\n` +
                                `Tipo: ${NOMBRES_TIPOS[tipo]}\n` +
                                `Cantidad: ${cantidad} entradas\n` +
                                `Precio: $${(cantidad * obtenerPrecioEntretenimiento(tipo)).toLocaleString('es-CL')}\n` +
                                `Cupo restante: ${validacionCompra.validacionCupo.disponible - cantidad} entradas`;
            
            alert(`✅ ${resultado.message}${detalleCompra}\n\nID: ${resultado.id}\n\n⚠️ Envíe el comprobante por email mencionando este ID.`);
            
            form.reset();
            actualizarPrecioTotal(tipo, 0);
            
            setTimeout(() => window.location.reload(), 2000);
        }

    } catch (error) {
        console.error('❌ Error:', error);
        alert(`❌ Error: ${error.message}`);
    } finally {
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = `Enviar Compra de ${NOMBRES_TIPOS[tipo]}`;
        }
    }
}

// ========================================
// EXPORTAR FUNCIONES PÚBLICAS
// ========================================
export {
    // Constantes
    LIMITES_MENSUALES,
    PRECIOS,
    COLECCIONES,
    NOMBRES_TIPOS,
    
    // Funciones de temporada y límites
    esTemporadaAlta,
    obtenerLimiteMaximoGas,
    obtenerLimiteEntretenimiento,
    obtenerPrecioEntretenimiento,
    
    // Funciones de cálculo
    calcularTotalGlobal,
    actualizarPrecioTotal,
    
    // Funciones de validación
    validarCupoDisponible,
    validarLimitesFormulario,
    validarCompraEntretenimiento,
    
    // Funciones de guardado
    guardarCompraEnFirebase,
    
    // Funciones de inicialización
    inicializarSistemaGas,
    inicializarSistemaEntretenimiento,
    
    // Funciones de UI para entretenimiento
    bloquearFormularioEntretenimiento,
    habilitarFormularioEntretenimiento,
    validarCupoEntretenimiento,
    actualizarOpcionesSegunCupo
};
