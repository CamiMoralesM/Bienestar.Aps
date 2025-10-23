// ========================================
// SISTEMA DE COMPRAS SIN CORS - SOLUCIÓN DEFINITIVA
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
// CONSTANTES
// ========================================

export const LIMITES_MENSUALES = {
    gas_temporada_normal: 4,
    gas_temporada_alta: 6,
    cine: 4,
    jumper: 6,
    gimnasio: 4
};

export const PRECIOS = {
    cine: 7000,
    jumper: 6500,
    gimnasio: 18000
};

export const COLECCIONES = {
    gas: 'comprasGas',
    cine: 'comprasCine',
    jumper: 'comprasJumper',
    gimnasio: 'comprasGimnasio'
};

// ========================================
// FUNCIONES DE TEMPORADA
// ========================================

export function esTemporadaAlta() {
    const fecha = new Date();
    const mes = fecha.getMonth() + 1;
    return mes >= 6 && mes <= 9;
}

export function obtenerLimiteMaximoGas() {
    return esTemporadaAlta() ? LIMITES_MENSUALES.gas_temporada_alta : LIMITES_MENSUALES.gas_temporada_normal;
}

// ========================================
// VALIDACIÓN DE CUPO
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

async function obtenerComprasMesActual(rut, tipoCompra) {
    try {
        const rango = obtenerRangoMesActual();
        const rutNormalizado = rut.replace(/\./g, '').replace(/-/g, '');
        
        const comprasRef = collection(db, COLECCIONES[tipoCompra]);
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
        console.error(`Error al obtener compras de ${tipoCompra}:`, error);
        return [];
    }
}

function calcularTotalUsado(compras, tipoCompra) {
    if (tipoCompra === 'gas') {
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
    } else {
        return compras.reduce((total, compra) => total + (compra.cantidad || 0), 0);
    }
}

export async function validarCupoDisponible(rut, tipoCompra) {
    try {
        const comprasMes = await obtenerComprasMesActual(rut, tipoCompra);
        const totalUsado = calcularTotalUsado(comprasMes, tipoCompra);
        
        let limiteMaximo;
        if (tipoCompra === 'gas') {
            limiteMaximo = obtenerLimiteMaximoGas();
        } else {
            limiteMaximo = LIMITES_MENSUALES[tipoCompra];
        }
        
        const cupoDisponible = limiteMaximo - totalUsado;
        
        return {
            success: true,
            puedeComprar: cupoDisponible > 0,
            totalUsado: totalUsado,
            limiteMaximo: limiteMaximo,
            cupoDisponible: cupoDisponible,
            comprasPrevias: comprasMes.length,
            tipoCompra: tipoCompra,
            temporada: tipoCompra === 'gas' ? (esTemporadaAlta() ? 'alta' : 'normal') : null,
            mensaje: cupoDisponible > 0 
                ? `Tiene ${cupoDisponible} ${tipoCompra === 'gas' ? 'cargas' : 'entradas'} disponibles este mes` 
                : `Ha alcanzado el límite mensual de ${limiteMaximo} ${tipoCompra === 'gas' ? 'cargas' : 'entradas'}`
        };
    } catch (error) {
        console.error("Error en validación de cupo:", error);
        return {
            success: false,
            error: error.message,
            puedeComprar: false
        };
    }
}

// ========================================
// FUNCIÓN PARA CONVERTIR ARCHIVO A BASE64 (SOLUCIÓN CORS)
// ========================================

function convertirArchivoABase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// ========================================
// GUARDADO EN FIREBASE SIN STORAGE
// ========================================

async function guardarCompraGasSinStorage(formData, comprobanteFile) {
    console.log('💾 Guardando compra de gas (método sin Storage)...');
    
    try {
        const compraLipigasValue = formData.get('compraLipigas') === 'si';
        const compraAbastibleValue = formData.get('compraAbastible') === 'si';

        // Convertir archivo a Base64 (evita CORS)
        let comprobanteData = null;
        if (comprobanteFile) {
            try {
                const base64String = await convertirArchivoABase64(comprobanteFile);
                comprobanteData = {
                    base64: base64String,
                    nombre: comprobanteFile.name,
                    tipo: comprobanteFile.type,
                    tamaño: comprobanteFile.size
                };
                console.log('✅ Archivo convertido a Base64 exitosamente');
            } catch (error) {
                console.error('❌ Error al convertir archivo:', error);
                throw new Error('Error al procesar el comprobante');
            }
        }

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
            
            // Comprobante como Base64 (evita problemas de CORS)
            comprobante: comprobanteData,
            
            estado: 'pendiente',
            tipoCompra: 'gas',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        // Calcular total de cargas
        let totalCargas = 0;
        if (compraData.cargas_lipigas) {
            totalCargas += Object.values(compraData.cargas_lipigas).reduce((a, b) => a + b, 0);
        }
        if (compraData.cargas_abastible) {
            totalCargas += Object.values(compraData.cargas_abastible).reduce((a, b) => a + b, 0);
        }
        compraData.totalCargas = totalCargas;

        const docRef = await addDoc(collection(db, COLECCIONES.gas), compraData);
        
        return {
            success: true,
            id: docRef.id,
            coleccion: COLECCIONES.gas,
            totalCargas: totalCargas,
            message: 'Compra de gas registrada exitosamente'
        };

    } catch (error) {
        console.error('❌ Error al guardar compra de gas:', error);
        throw error;
    }
}

async function guardarCompraEntretenimientoSinStorage(tipoCompra, formData, comprobanteFile) {
    console.log(`💾 Guardando compra de ${tipoCompra} (método sin Storage)...`);
    
    try {
        // Convertir archivo a Base64
        let comprobanteData = null;
        if (comprobanteFile) {
            try {
                const base64String = await convertirArchivoABase64(comprobanteFile);
                comprobanteData = {
                    base64: base64String,
                    nombre: comprobanteFile.name,
                    tipo: comprobanteFile.type,
                    tamaño: comprobanteFile.size
                };
                console.log('✅ Archivo convertido a Base64 exitosamente');
            } catch (error) {
                console.error('❌ Error al convertir archivo:', error);
                throw new Error('Error al procesar el comprobante');
            }
        }
        
        const tipoCapitalizado = tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1);
        const cantidad = parseInt(formData.get(`cantidad${tipoCapitalizado}`)) || 0;
        
        const compraData = {
            uid: auth.currentUser.uid,
            email: formData.get(`email${tipoCapitalizado}`),
            rut: formData.get(`rut${tipoCapitalizado}`).replace(/\./g, '').replace(/-/g, ''),
            nombre: formData.get(`nombre${tipoCapitalizado}`),
            telefono: formData.get(`telefono${tipoCapitalizado}`),
            fechaCompra: formData.get(`fechaCompra${tipoCapitalizado}`),
            cantidad: cantidad,
            tipoEntretenimiento: tipoCompra,
            tipoCompra: 'entretenimiento',
            
            // Comprobante como Base64
            comprobante: comprobanteData,
            
            estado: 'pendiente',
            montoTotal: (PRECIOS[tipoCompra] || 0) * cantidad,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        
        const docRef = await addDoc(collection(db, COLECCIONES[tipoCompra]), compraData);
        
        console.log(`✅ Compra de ${tipoCompra} guardada con ID: ${docRef.id}`);
        
        return {
            success: true,
            id: docRef.id,
            coleccion: COLECCIONES[tipoCompra],
            cantidad: cantidad,
            montoTotal: compraData.montoTotal,
            message: `Compra de ${tipoCompra} registrada exitosamente`
        };
        
    } catch (error) {
        console.error(`❌ Error al guardar compra de ${tipoCompra}:`, error);
        throw error;
    }
}

export async function guardarCompra(tipoCompra, formData, comprobanteFile) {
    if (tipoCompra === 'gas') {
        return await guardarCompraGasSinStorage(formData, comprobanteFile);
    } else {
        return await guardarCompraEntretenimientoSinStorage(tipoCompra, formData, comprobanteFile);
    }
}

// ========================================
// INICIALIZACIÓN DE FORMULARIOS
// ========================================

export function inicializarFormulario(tipoCompra) {
    console.log(`🔄 Inicializando formulario de ${tipoCompra}...`);
    
    if (tipoCompra === 'gas') {
        inicializarFormularioGas();
    } else {
        inicializarFormularioEntretenimiento(tipoCompra);
    }
}

function inicializarFormularioGas() {
    const form = document.getElementById('formCompraGas');
    if (!form) {
        console.warn('❌ Formulario formCompraGas no encontrado');
        return;
    }
    
    console.log('✅ Inicializando formulario de gas');
    
    // Inicializar fecha
    const fechaInput = document.getElementById('fechaCompraGas');
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.value = today;
        fechaInput.max = today;
    }

    // Inicializar opciones de cantidad
    inicializarOpcionesGas();
    
    // Manejar submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleFormSubmit(e, 'gas');
    });

    // Manejar selección de empresas
    setupGasCompanyToggles();
}

function inicializarFormularioEntretenimiento(tipoCompra) {
    const formId = `formCompra${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`;
    const form = document.getElementById(formId);
    
    if (!form) {
        console.warn(`❌ Formulario ${formId} no encontrado`);
        return;
    }
    
    console.log(`✅ Inicializando formulario de ${tipoCompra}`);
    
    // Inicializar fecha
    const tipoCapitalizado = tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1);
    const fechaInput = document.getElementById(`fechaCompra${tipoCapitalizado}`);
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.value = today;
        fechaInput.max = today;
    }
    
    // Manejar submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleFormSubmit(e, tipoCompra);
    });
}

function inicializarOpcionesGas() {
    // Llenar opciones para Lipigas
    const selectoresLipigas = ['lipigas5', 'lipigas11', 'lipigas15', 'lipigas45'];
    selectoresLipigas.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="0">Seleccionar cantidad</option>';
            for (let i = 1; i <= 6; i++) {
                select.innerHTML += `<option value="${i}">${i}</option>`;
            }
        }
    });

    // Llenar opciones para Abastible
    const selectoresAbastible = ['abastible5', 'abastible11', 'abastible15', 'abastible45'];
    selectoresAbastible.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="0">Seleccionar cantidad</option>';
            for (let i = 1; i <= 6; i++) {
                select.innerHTML += `<option value="${i}">${i}</option>`;
            }
        }
    });
}

function setupGasCompanyToggles() {
    const compraLipigas = document.getElementById('compraLipigas');
    const compraAbastible = document.getElementById('compraAbastible');
    const lipigasOpciones = document.getElementById('lipigasOpciones');
    const abastibleOpciones = document.getElementById('abastibleOpciones');

    if (compraLipigas && lipigasOpciones) {
        compraLipigas.addEventListener('change', function() {
            if (this.value === 'si') {
                lipigasOpciones.style.display = 'block';
            } else {
                lipigasOpciones.style.display = 'none';
                // Resetear selecciones
                const selects = lipigasOpciones.querySelectorAll('select');
                selects.forEach(select => select.value = '0');
            }
        });
    }

    if (compraAbastible && abastibleOpciones) {
        compraAbastible.addEventListener('change', function() {
            if (this.value === 'si') {
                abastibleOpciones.style.display = 'block';
            } else {
                abastibleOpciones.style.display = 'none';
                // Resetear selecciones
                const selects = abastibleOpciones.querySelectorAll('select');
                selects.forEach(select => select.value = '0');
            }
        });
    }
}

async function handleFormSubmit(e, tipoCompra) {
    e.preventDefault();
    console.log(`🔍 Iniciando envío del formulario de ${tipoCompra}`);
    
    try {
        const form = e.target;
        const formData = new FormData(form);
        
        if (tipoCompra === 'gas') {
            return await handleSubmitGas(form, formData);
        } else {
            return await handleSubmitEntretenimiento(form, formData, tipoCompra);
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert(`❌ Error: ${error.message}`);
    }
}

async function handleSubmitGas(form, formData) {
    const comprandoLipigas = formData.get('compraLipigas') === 'si';
    const comprandoAbastible = formData.get('compraAbastible') === 'si';
    
    if (!comprandoLipigas && !comprandoAbastible) {
        alert('⚠️ Debe seleccionar al menos una empresa');
        return false;
    }
    
    const comprobanteFile = document.getElementById('comprobanteGas').files[0];
    if (!comprobanteFile) {
        alert('⚠️ Debe adjuntar el comprobante');
        return false;
    }
    
    // Validar que se seleccionó al menos una carga
    let totalCargas = 0;
    if (comprandoLipigas) {
        totalCargas += parseInt(formData.get('lipigas5') || 0);
        totalCargas += parseInt(formData.get('lipigas11') || 0);
        totalCargas += parseInt(formData.get('lipigas15') || 0);
        totalCargas += parseInt(formData.get('lipigas45') || 0);
    }
    if (comprandoAbastible) {
        totalCargas += parseInt(formData.get('abastible5') || 0);
        totalCargas += parseInt(formData.get('abastible11') || 0);
        totalCargas += parseInt(formData.get('abastible15') || 0);
        totalCargas += parseInt(formData.get('abastible45') || 0);
    }
    
    if (totalCargas === 0) {
        alert('⚠️ Debe seleccionar al menos una carga de gas');
        return false;
    }
    
    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.textContent = 'Enviando...';
    btnSubmit.disabled = true;
    
    try {
        const resultado = await guardarCompra('gas', formData, comprobanteFile);
        
        if (resultado.success) {
            alert(`✅ ${resultado.message}\n\nID: ${resultado.id}\nTotal cargas: ${resultado.totalCargas}`);
            form.reset();
            // Ocultar opciones
            document.getElementById('lipigasOpciones').style.display = 'none';
            document.getElementById('abastibleOpciones').style.display = 'none';
            setTimeout(() => window.location.reload(), 2000);
        }
    } finally {
        btnSubmit.textContent = 'Enviar Compra Gas';
        btnSubmit.disabled = false;
    }
}

async function handleSubmitEntretenimiento(form, formData, tipoCompra) {
    const tipoCapitalizado = tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1);
    const cantidad = parseInt(formData.get(`cantidad${tipoCapitalizado}`)) || 0;
    
    if (cantidad === 0) {
        alert('⚠️ Debe seleccionar al menos una entrada');
        return false;
    }
    
    const comprobanteFile = document.getElementById(`comprobante${tipoCapitalizado}`).files[0];
    if (!comprobanteFile) {
        alert('⚠️ Debe adjuntar el comprobante de transferencia');
        return false;
    }
    
    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.textContent = 'Enviando...';
    btnSubmit.disabled = true;
    
    try {
        const resultado = await guardarCompra(tipoCompra, formData, comprobanteFile);
        
        if (resultado.success) {
            const montoTotal = resultado.montoTotal;
            
            alert(`✅ ${resultado.message}\n\nID: ${resultado.id}\nCantidad: ${cantidad} entradas\nMonto Total: $${montoTotal.toLocaleString('es-CL')}`);
            
            form.reset();
            setTimeout(() => window.location.reload(), 2000);
        }
    } finally {
        btnSubmit.textContent = `Enviar Compra ${tipoCapitalizado}`;
        btnSubmit.disabled = false;
    }
}
