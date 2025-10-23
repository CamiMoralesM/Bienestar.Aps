// ========================================
// COMPRAS UNIFICADAS - VERSIÓN CORS-SAFE
// ========================================

import { db, auth, storage } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    Timestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { subirComprobante } from './storage-handler-fixed.js';

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
// FUNCIONES AUXILIARES
// ========================================

export function esTemporadaAlta() {
    const fecha = new Date();
    const mes = fecha.getMonth() + 1;
    return mes >= 6 && mes <= 9;
}

export function obtenerLimiteMaximoGas() {
    return esTemporadaAlta() ? LIMITES_MENSUALES.gas_temporada_alta : LIMITES_MENSUALES.gas_temporada_normal;
}

function obtenerRangoMesActual() {
    const ahora = new Date();
    const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
    
    return {
        inicio: Timestamp.fromDate(primerDia),
        fin: Timestamp.fromDate(ultimoDia)
    };
}

// ========================================
// VALIDACIÓN DE CUPO CON MANEJO DE ERRORES
// ========================================

async function obtenerComprasMesActualSeguro(rut, tipoCompra) {
    try {
        const rango = obtenerRangoMesActual();
        const rutNormalizado = rut.replace(/\./g, '').replace(/-/g, '');
        
        if (!COLECCIONES[tipoCompra]) {
            throw new Error(`Tipo de compra no válido: ${tipoCompra}`);
        }
        
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
        
        // Si es error de red, devolver array vacío para permitir continuar
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('network') ||
            error.code === 'unavailable') {
            console.warn('⚠️ Error de red, asumiendo sin compras previas');
            return [];
        }
        
        throw error;
    }
}

function calcularTotalUsadoSeguro(compras, tipoCompra) {
    try {
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
    } catch (error) {
        console.error('Error al calcular total usado:', error);
        return 0;
    }
}

export async function validarCupoDisponible(rut, tipoCompra) {
    try {
        console.log(`🔍 Validando cupo para ${tipoCompra} - RUT: ${rut}`);
        
        const comprasMes = await obtenerComprasMesActualSeguro(rut, tipoCompra);
        const totalUsado = calcularTotalUsadoSeguro(comprasMes, tipoCompra);
        
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
        
        // En caso de error, asumir que puede comprar pero advertir
        return {
            success: false,
            puedeComprar: true, // Permitir compra pero con advertencia
            error: error.message,
            mensaje: 'No se pudo verificar el cupo. Puede continuar, pero verifique manualmente.',
            advertencia: true
        };
    }
}

// ========================================
// GUARDADO SEGURO EN FIREBASE
// ========================================

async function guardarCompraGasSeguro(formData, comprobanteFile) {
    console.log('💾 Guardando compra de gas de forma segura...');
    
    try {
        // Verificar usuario autenticado
        if (!auth.currentUser) {
            throw new Error('Usuario no autenticado');
        }

        const compraLipigasValue = formData.get('compraLipigas') === 'si';
        const compraAbastibleValue = formData.get('compraAbastible') === 'si';

        // Validar que se seleccionó al menos una empresa
        if (!compraLipigasValue && !compraAbastibleValue) {
            throw new Error('Debe seleccionar al menos una empresa (Lipigas o Abastible)');
        }

        // Subir comprobante de forma segura
        let comprobanteData = null;
        if (comprobanteFile) {
            try {
                console.log('📤 Subiendo comprobante...');
                comprobanteData = await subirComprobante(comprobanteFile, 'gas');
                console.log('✅ Comprobante subido:', comprobanteData.url);
            } catch (uploadError) {
                console.error('❌ Error al subir comprobante:', uploadError);
                // No fallar toda la operación por error de upload
                // Guardar información del archivo para procesamiento posterior
                comprobanteData = {
                    success: false,
                    error: uploadError.message,
                    originalName: comprobanteFile.name,
                    size: comprobanteFile.size,
                    type: comprobanteFile.type,
                    needsManualUpload: true
                };
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
            
            // Información del comprobante
            comprobanteUrl: comprobanteData?.url || null,
            comprobanteNombre: comprobanteFile?.name || null,
            comprobanteSize: comprobanteFile?.size || null,
            comprobanteType: comprobanteFile?.type || null,
            comprobanteStatus: comprobanteData?.success ? 'uploaded' : 'pending',
            comprobanteError: comprobanteData?.error || null,
            
            estado: comprobanteData?.success ? 'pendiente' : 'pendiente_comprobante',
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

        // Guardar en Firestore
        const docRef = await addDoc(collection(db, COLECCIONES.gas), compraData);
        
        console.log(`✅ Compra de gas guardada con ID: ${docRef.id}`);
        
        let mensaje = 'Compra de gas registrada exitosamente';
        if (!comprobanteData?.success) {
            mensaje += '\n⚠️ Nota: El comprobante se procesará manualmente debido a problemas técnicos.';
        }
        
        return {
            success: true,
            id: docRef.id,
            coleccion: COLECCIONES.gas,
            totalCargas: totalCargas,
            comprobanteStatus: comprobanteData?.success ? 'uploaded' : 'pending',
            message: mensaje
        };

    } catch (error) {
        console.error('❌ Error al guardar compra de gas:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function guardarCompraEntretenimientoSeguro(tipoCompra, formData, comprobanteFile) {
    console.log(`💾 Guardando compra de ${tipoCompra} de forma segura...`);
    
    try {
        // Verificar usuario autenticado
        if (!auth.currentUser) {
            throw new Error('Usuario no autenticado');
        }

        // Subir comprobante de forma segura
        let comprobanteData = null;
        if (comprobanteFile) {
            try {
                console.log('📤 Subiendo comprobante...');
                comprobanteData = await subirComprobante(comprobanteFile, tipoCompra);
                console.log('✅ Comprobante subido:', comprobanteData.url);
            } catch (uploadError) {
                console.error('❌ Error al subir comprobante:', uploadError);
                comprobanteData = {
                    success: false,
                    error: uploadError.message,
                    originalName: comprobanteFile.name,
                    size: comprobanteFile.size,
                    type: comprobanteFile.type,
                    needsManualUpload: true
                };
            }
        }
        
        const tipoCapitalizado = tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1);
        const cantidad = parseInt(formData.get(`cantidad${tipoCapitalizado}`)) || 0;
        
        if (cantidad === 0) {
            throw new Error('Debe seleccionar al menos una entrada');
        }
        
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
            
            // Información del comprobante
            comprobanteUrl: comprobanteData?.url || null,
            comprobanteNombre: comprobanteFile?.name || null,
            comprobanteSize: comprobanteFile?.size || null,
            comprobanteType: comprobanteFile?.type || null,
            comprobanteStatus: comprobanteData?.success ? 'uploaded' : 'pending',
            comprobanteError: comprobanteData?.error || null,
            
            estado: comprobanteData?.success ? 'pendiente' : 'pendiente_comprobante',
            montoTotal: (PRECIOS[tipoCompra] || 0) * cantidad,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        
        const docRef = await addDoc(collection(db, COLECCIONES[tipoCompra]), compraData);
        
        console.log(`✅ Compra de ${tipoCompra} guardada con ID: ${docRef.id} en colección: ${COLECCIONES[tipoCompra]}`);
        
        let mensaje = `Compra de ${tipoCompra} registrada exitosamente`;
        if (!comprobanteData?.success) {
            mensaje += '\n⚠️ Nota: El comprobante se procesará manualmente debido a problemas técnicos.';
        }
        
        return {
            success: true,
            id: docRef.id,
            coleccion: COLECCIONES[tipoCompra],
            cantidad: cantidad,
            montoTotal: compraData.montoTotal,
            comprobanteStatus: comprobanteData?.success ? 'uploaded' : 'pending',
            message: mensaje
        };
        
    } catch (error) {
        console.error(`❌ Error al guardar compra de ${tipoCompra}:`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

export async function guardarCompra(tipoCompra, formData, comprobanteFile) {
    try {
        console.log(`🔄 Iniciando guardado seguro para: ${tipoCompra}`);
        
        if (tipoCompra === 'gas') {
            return await guardarCompraGasSeguro(formData, comprobanteFile);
        } else {
            return await guardarCompraEntretenimientoSeguro(tipoCompra, formData, comprobanteFile);
        }
        
    } catch (error) {
        console.error('❌ Error en guardado:', error);
        return {
            success: false,
            error: error.message,
            tipoCompra: tipoCompra
        };
    }
}

// ========================================
// EXPORTAR FUNCIONES PRINCIPALES
// ========================================
export {
    validarCupoDisponible,
    guardarCompra,
    obtenerLimiteMaximoGas,
    esTemporadaAlta
};
