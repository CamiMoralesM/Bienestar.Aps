// ========================================
// SISTEMA UNIFICADO DE COMPRAS - COMPLETO
// Gas, Cine, Jumper Trampoline Park y Gimnasio
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
            estado: 'pendiente_comprobante',
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
    inicializarValidacionCupo();
}

function inicializarSistemaEntretenimiento(tipo) {
    const form = document.getElementById(`formCompra${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    if (!form) return;
    
    const selectCantidad = document.getElementById(`cantidad${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    if (selectCantidad) {
        generarOpcionesEntretenimiento(tipo, selectCantidad);
        
        selectCantidad.addEventListener('change', function() {
            const cantidad = parseInt(this.value) || 0;
            actualizarPrecioTotal(tipo, cantidad);
        });
    }
    
    inicializarFecha(`fechaCompra${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    
    form.addEventListener('submit', (e) => handleFormSubmitEntretenimiento(e, tipo));
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

    if (rutInput) {
        rutInput.addEventListener('blur', () => verificarCupoUsuario('gas'));
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

function inicializarValidacionCupo() {
    if (rutInput && rutInput.value.trim()) {
        verificarCupoUsuario('gas');
    }
}

// ========================================
// FUNCIONES DE HABILITACIÓN/DESHABILITACIÓN
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

        const validacion = await validarCupoDisponible(rut, 'gas');

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

        const validacion = await validarCupoDisponible(rut, tipo);

        if (!validacion.success || !validacion.puedeComprar) {
            alert(`❌ ${validacion.mensaje}\n\nNo puede realizar más compras este mes.`);
            return false;
        }

        if (cantidad > validacion.cupoDisponible) {
            alert(`❌ La compra excede su cupo disponible.\n\nDisponible: ${validacion.cupoDisponible} entradas\nIntenta comprar: ${cantidad} entradas`);
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
            alert(`✅ ${resultado.message}\n\nID: ${resultado.id}\n\n⚠️ Envíe el comprobante por email mencionando este ID.`);
            
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
    
    // Funciones de guardado
    guardarCompraEnFirebase,
    
    // Funciones de inicialización
    inicializarSistemaGas,
    inicializarSistemaEntretenimiento
};
