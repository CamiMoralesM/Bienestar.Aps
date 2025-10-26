// ========================================
// FIREBASE OPERATIONS UNIFICADAS
// Gas y Entretenimiento (Cine, Jumper, Gimnasio)
// ========================================

import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ========================================
// CONSTANTES
// ========================================

// Colecciones de Firebase
const COLECCIONES = {
    gas: 'comprasGas',
    cine: 'comprasCine',
    jumper: 'comprasJumper',
    gimnasio: 'comprasGimnasio'
};

// Carpetas de Storage para comprobantes
const STORAGE_FOLDERS = {
    gas: 'comprobantesGas',
    cine: 'comprobantesCine',
    jumper: 'comprobantesJumper',
    gimnasio: 'comprobantesGimnasios'
};

// Precios para entretenimiento
const PRECIOS_ENTRETENIMIENTO = {
    cine: 7000,
    jumper: 6500,
    gimnasio: 18000
};

// ========================================
// FUNCIONES DE STORAGE (COMPROBANTES)
// ========================================

/**
 * Sube un comprobante a Firebase Storage
 * @param {File} file - Archivo a subir
 * @param {string} tipoCompra - Tipo de compra (gas, cine, jumper, gimnasio)
 * @returns {Promise<string>} URL del archivo subido
 */
async function subirComprobante(file, tipoCompra) {
    try {
        if (!file) return null;
        
        const storage = getStorage();
        const folder = STORAGE_FOLDERS[tipoCompra] || 'comprobantesGeneral';
        const fileName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `${folder}/${fileName}`);
        
        console.log(`📁 Subiendo comprobante a: ${folder}/${fileName}`);
        
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        
        console.log(`✅ Comprobante subido exitosamente: ${downloadURL}`);
        return downloadURL;
        
    } catch (error) {
        console.error('❌ Error al subir comprobante:', error);
        throw new Error(`Error al subir comprobante: ${error.message}`);
    }
}

// ========================================
// FUNCIONES DE GUARDADO - GAS
// ========================================

/**
 * Guarda una compra de gas en Firestore
 * @param {Object} datosCompra - Datos del formulario
 * @param {File} comprobanteFile - Archivo de comprobante
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function guardarCompraGas(datosCompra, comprobanteFile) {
    try {
        console.log('💾 Guardando compra de gas en Firebase...');
        
        // Subir comprobante
        const comprobanteUrl = await subirComprobante(comprobanteFile, 'gas');
        
        // Determinar qué marcas se están comprando
        const compraLipigas = datosCompra.compraLipigas === 'si';
        const compraAbastible = datosCompra.compraAbastible === 'si';
        
        // Construir objeto de compra
        const compraData = {
            // Datos del usuario
            uid: datosCompra.uid || '',
            email: datosCompra.emailGas || '',
            rut: (datosCompra.rutGas || '').replace(/\./g, '').replace(/-/g, ''),
            nombre: datosCompra.nombreGas || '',
            telefono: datosCompra.telefonoGas || '',
            fechaCompra: datosCompra.fechaCompraGas || '',
            
            // Datos de Lipigas
            compraLipigas: compraLipigas,
            cargas_lipigas: compraLipigas ? {
                kg5: parseInt(datosCompra.lipigas5) || 0,
                kg11: parseInt(datosCompra.lipigas11) || 0,
                kg15: parseInt(datosCompra.lipigas15) || 0,
                kg45: parseInt(datosCompra.lipigas45) || 0
            } : null,
            
            // Datos de Abastible
            compraAbastible: compraAbastible,
            cargas_abastible: compraAbastible ? {
                kg5: parseInt(datosCompra.abastible5) || 0,
                kg11: parseInt(datosCompra.abastible11) || 0,
                kg15: parseInt(datosCompra.abastible15) || 0,
                kg45: parseInt(datosCompra.abastible45) || 0
            } : null,
            
            // Otros datos
            saldoFavor: datosCompra.saldoFavor || null,
            
            // Comprobante
            comprobanteUrl: comprobanteUrl,
            comprobanteNombre: comprobanteFile ? comprobanteFile.name : null,
            comprobanteTamaño: comprobanteFile ? comprobanteFile.size : null,
            
            // Metadatos
            tipoCompra: 'gas',
            estado: 'pendiente',
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
        
        return {
            success: true,
            id: docRef.id,
            coleccion: COLECCIONES.gas,
            totalCargas: totalCargas,
            message: 'Compra de gas registrada exitosamente'
        };
        
    } catch (error) {
        console.error('❌ Error al guardar compra de gas:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ========================================
// FUNCIONES DE GUARDADO - ENTRETENIMIENTO
// ========================================

/**
 * Guarda una compra de entretenimiento en Firestore
 * @param {string} tipoEntretenimiento - Tipo (cine, jumper, gimnasio)
 * @param {Object} datosCompra - Datos del formulario
 * @param {File} comprobanteFile - Archivo de comprobante
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function guardarCompraEntretenimiento(tipoEntretenimiento, datosCompra, comprobanteFile) {
    try {
        console.log(`💾 Guardando compra de ${tipoEntretenimiento} en Firebase...`);
        
        // Validar tipo
        if (!COLECCIONES[tipoEntretenimiento]) {
            throw new Error(`Tipo de entretenimiento no válido: ${tipoEntretenimiento}`);
        }
        
        // Subir comprobante
        const comprobanteUrl = await subirComprobante(comprobanteFile, tipoEntretenimiento);
        
        // Capitalizar tipo para campos del formulario
        const tipoCapitalizado = tipoEntretenimiento.charAt(0).toUpperCase() + tipoEntretenimiento.slice(1);
        
        // Obtener cantidad y calcular monto
        const cantidad = parseInt(datosCompra[`cantidad${tipoCapitalizado}`]) || 0;
        const precioUnitario = PRECIOS_ENTRETENIMIENTO[tipoEntretenimiento] || 0;
        const montoTotal = cantidad * precioUnitario;
        
        // Construir objeto de compra
        const compraData = {
            // Datos del usuario
            uid: datosCompra.uid || '',
            email: datosCompra[`email${tipoCapitalizado}`] || '',
            rut: (datosCompra[`rut${tipoCapitalizado}`] || '').replace(/\./g, '').replace(/-/g, ''),
            nombre: datosCompra[`nombre${tipoCapitalizado}`] || '',
            telefono: datosCompra[`telefono${tipoCapitalizado}`] || '',
            fechaCompra: datosCompra[`fechaCompra${tipoCapitalizado}`] || '',
            
            // Datos de la compra
            cantidad: cantidad,
            precioUnitario: precioUnitario,
            montoTotal: montoTotal,
            tipoEntretenimiento: tipoEntretenimiento,
            
            // Comprobante
            comprobanteUrl: comprobanteUrl,
            comprobanteNombre: comprobanteFile ? comprobanteFile.name : null,
            comprobanteTamaño: comprobanteFile ? comprobanteFile.size : null,
            
            // Metadatos
            tipoCompra: 'entretenimiento',
            estado: 'pendiente',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        
        // Guardar en la colección específica
        const coleccion = COLECCIONES[tipoEntretenimiento];
        const docRef = await addDoc(collection(db, coleccion), compraData);
        
        console.log(`✅ Compra de ${tipoEntretenimiento} guardada con ID: ${docRef.id} en colección: ${coleccion}`);
        
        return {
            success: true,
            id: docRef.id,
            coleccion: coleccion,
            tipoEntretenimiento: tipoEntretenimiento,
            cantidad: cantidad,
            montoTotal: montoTotal,
            message: `Compra de ${tipoEntretenimiento} registrada exitosamente`
        };
        
    } catch (error) {
        console.error(`❌ Error al guardar compra de ${tipoEntretenimiento}:`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ========================================
// FUNCIÓN UNIFICADA DE GUARDADO
// ========================================

/**
 * Función unificada para guardar cualquier tipo de compra
 * @param {string} tipoCompra - Tipo de compra (gas, cine, jumper, gimnasio)
 * @param {Object} datosCompra - Datos del formulario
 * @param {File} comprobanteFile - Archivo de comprobante
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function guardarCompraUnificada(tipoCompra, datosCompra, comprobanteFile) {
    try {
        console.log(`🔄 Iniciando guardado unificado para: ${tipoCompra}`);
        
        if (tipoCompra === 'gas') {
            return await guardarCompraGas(datosCompra, comprobanteFile);
        } else if (['cine', 'jumper', 'gimnasio'].includes(tipoCompra)) {
            return await guardarCompraEntretenimiento(tipoCompra, datosCompra, comprobanteFile);
        } else {
            throw new Error(`Tipo de compra no reconocido: ${tipoCompra}`);
        }
        
    } catch (error) {
        console.error('❌ Error en guardado unificado:', error);
        return {
            success: false,
            error: error.message,
            tipoCompra: tipoCompra
        };
    }
}

// ========================================
// FUNCIONES DE CONSULTA
// ========================================

/**
 * Obtiene todas las compras de un tipo específico
 * @param {string} tipoCompra - Tipo de compra
 * @param {Object} filtros - Filtros opcionales
 * @returns {Promise<Array>} Array de compras
 */
export async function obtenerComprasPorTipo(tipoCompra, filtros = {}) {
    try {
        if (!COLECCIONES[tipoCompra]) {
            throw new Error(`Tipo de compra no válido: ${tipoCompra}`);
        }
        
        const coleccionRef = collection(db, COLECCIONES[tipoCompra]);
        let q = coleccionRef;
        
        // Aplicar filtros
        const condiciones = [];
        
        if (filtros.rut) {
            const rutLimpio = filtros.rut.replace(/\./g, '').replace(/-/g, '');
            condiciones.push(where("rut", "==", rutLimpio));
        }
        
        if (filtros.estado) {
            condiciones.push(where("estado", "==", filtros.estado));
        }
        
        if (filtros.fechaInicio || filtros.fechaFin) {
            if (filtros.fechaInicio) {
                const fechaInicio = new Date(filtros.fechaInicio);
                condiciones.push(where("createdAt", ">=", Timestamp.fromDate(fechaInicio)));
            }
            if (filtros.fechaFin) {
                const fechaFin = new Date(filtros.fechaFin);
                fechaFin.setHours(23, 59, 59); // Final del día
                condiciones.push(where("createdAt", "<=", Timestamp.fromDate(fechaFin)));
            }
        }
        
        // Construir query
        if (condiciones.length > 0) {
            q = query(q, ...condiciones, orderBy("createdAt", "desc"));
        } else {
            q = query(q, orderBy("createdAt", "desc"));
        }
        
        const querySnapshot = await getDocs(q);
        const compras = [];
        
        querySnapshot.forEach((doc) => {
            compras.push({
                id: doc.id,
                ...doc.data(),
                tipoCompra: tipoCompra
            });
        });
        
        console.log(`📊 ${tipoCompra}: ${compras.length} compras obtenidas`);
        return compras;
        
    } catch (error) {
        console.error(`Error al obtener compras de ${tipoCompra}:`, error);
        return [];
    }
}

/**
 * Obtiene compras por RUT (todos los tipos)
 * @param {string} rut - RUT del usuario
 * @param {Object} filtros - Filtros adicionales
 * @returns {Promise<Object>} Compras organizadas por tipo
 */
export async function obtenerComprasPorRUT(rut, filtros = {}) {
    try {
        const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '');
        const comprasPorTipo = {};
        
        // Obtener compras de cada tipo
        for (const [tipo, coleccion] of Object.entries(COLECCIONES)) {
            try {
                const filtrosConRUT = { ...filtros, rut: rutLimpio };
                comprasPorTipo[tipo] = await obtenerComprasPorTipo(tipo, filtrosConRUT);
            } catch (error) {
                console.error(`Error al obtener compras de ${tipo}:`, error);
                comprasPorTipo[tipo] = [];
            }
        }
        
        return {
            success: true,
            rut: rut,
            comprasPorTipo: comprasPorTipo,
            totalCompras: Object.values(comprasPorTipo).reduce((total, compras) => total + compras.length, 0)
        };
        
    } catch (error) {
        console.error('Error al obtener compras por RUT:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Obtiene compras recientes (para notificaciones)
 * @param {string} rut - RUT del usuario
 * @param {number} limite - Número máximo de compras a obtener
 * @returns {Promise<Array>} Array de compras recientes
 */
export async function obtenerComprasRecientes(rut, limite = 10) {
    try {
        const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '');
        const todasLasCompras = [];
        
        // Obtener compras recientes de cada tipo
        for (const [tipo, coleccion] of Object.entries(COLECCIONES)) {
            try {
                const comprasRef = collection(db, coleccion);
                const q = query(
                    comprasRef,
                    where("rut", "==", rutLimpio),
                    orderBy("createdAt", "desc"),
                    limit(5) // 5 por tipo
                );
                
                const querySnapshot = await getDocs(q);
                
                querySnapshot.forEach((doc) => {
                    todasLasCompras.push({
                        id: doc.id,
                        ...doc.data(),
                        tipoCompra: tipo
                    });
                });
            } catch (error) {
                console.error(`Error al obtener compras recientes de ${tipo}:`, error);
            }
        }
        
        // Ordenar por fecha y limitar
        todasLasCompras.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
        
        return todasLasCompras.slice(0, limite);
        
    } catch (error) {
        console.error('Error al obtener compras recientes:', error);
        return [];
    }
}

// ========================================
// FUNCIONES DE ESTADÍSTICAS
// ========================================

/**
 * Obtiene estadísticas generales de compras
 * @param {Object} filtros - Filtros opcionales
 * @returns {Promise<Object>} Estadísticas por tipo
 */
export async function obtenerEstadisticasCompras(filtros = {}) {
    try {
        const estadisticas = {};
        
        for (const [tipo, coleccion] of Object.entries(COLECCIONES)) {
            try {
                const compras = await obtenerComprasPorTipo(tipo, filtros);
                
                const stats = {
                    total: compras.length,
                    pendientes: compras.filter(c => c.estado === 'pendiente').length,
                    aprobadas: compras.filter(c => c.estado === 'aprobado').length,
                    rechazadas: compras.filter(c => c.estado === 'rechazado').length
                };
                
                // Estadísticas específicas por tipo
                if (tipo === 'gas') {
                    stats.totalCargas = compras.reduce((total, c) => {
                        let cargas = 0;
                        if (c.cargas_lipigas) {
                            cargas += Object.values(c.cargas_lipigas).reduce((a, b) => a + b, 0);
                        }
                        if (c.cargas_abastible) {
                            cargas += Object.values(c.cargas_abastible).reduce((a, b) => a + b, 0);
                        }
                        return total + cargas;
                    }, 0);
                } else {
                    stats.totalEntradas = compras.reduce((total, c) => total + (c.cantidad || 0), 0);
                    stats.montoTotal = compras.reduce((total, c) => total + (c.montoTotal || 0), 0);
                }
                
                estadisticas[tipo] = stats;
                
            } catch (error) {
                console.error(`Error al obtener estadísticas de ${tipo}:`, error);
                estadisticas[tipo] = { error: error.message };
            }
        }
        
        return {
            success: true,
            estadisticas: estadisticas,
            fechaConsulta: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ========================================
// FUNCIONES DE EXPORTACIÓN PARA ADMIN
// (Renombradas para evitar conflicto con otros módulos)
// ========================================

/**
 * Exporta compras de gas en formato para Excel (Lipigas) - versión admin renombrada
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {Promise<Array>} Datos formateados para Excel
 */
export async function exportarLipigasExcelAdmin(fecha = null) {
    try {
        const fechaFiltro = fecha || new Date().toISOString().split('T')[0];
        
        const compras = await obtenerComprasPorTipo('gas', {
            fechaInicio: fechaFiltro,
            fechaFin: fechaFiltro
        });
        
        // Filtrar solo compras de Lipigas
        const comprasLipigas = compras.filter(c => c.compraLipigas && c.cargas_lipigas);
        
        // Agrupar por usuario
        const usuarios = {};
        
        comprasLipigas.forEach(compra => {
            const key = compra.email;
            if (!usuarios[key]) {
                usuarios[key] = {
                    nombre: compra.nombre,
                    email: compra.email,
                    "5 kg (1105)": 0,
                    "11 kg (1111)": 0,
                    "15 kg (1115)": 0,
                    "45 kg (1145)": 0
                };
            }
            
            const cargas = compra.cargas_lipigas;
            usuarios[key]["5 kg (1105)"] += cargas.kg5 || 0;
            usuarios[key]["11 kg (1111)"] += cargas.kg11 || 0;
            usuarios[key]["15 kg (1115)"] += cargas.kg15 || 0;
            usuarios[key]["45 kg (1145)"] += cargas.kg45 || 0;
        });
        
        return Object.values(usuarios);
        
    } catch (error) {
        console.error('Error al exportar Lipigas:', error);
        return [];
    }
}

/**
 * Exporta compras de gas en formato para Excel (Abastible) - versión admin renombrada
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {Promise<Array>} Datos formateados para Excel
 */
export async function exportarAbastibleExcelAdmin(fecha = null) {
    try {
        const fechaFiltro = fecha || new Date().toISOString().split('T')[0];
        
        const compras = await obtenerComprasPorTipo('gas', {
            fechaInicio: fechaFiltro,
            fechaFin: fechaFiltro
        });
        
        // Filtrar solo compras de Abastible
        const comprasAbastible = compras.filter(c => c.compraAbastible && c.cargas_abastible);
        
        const resultado = [];
        
        comprasAbastible.forEach(compra => {
            const cargas = compra.cargas_abastible;
            const totalCargas = Object.values(cargas).reduce((a, b) => a + b, 0);
            
            // Una fila por cada cupón
            for (let i = 0; i < totalCargas; i++) {
                resultado.push({
                    "Rut Benef.": compra.rut,
                    "Nombre": compra.nombre,
                    "Email": compra.email,
                    "Teléfono": compra.telefono
                });
            }
        });
        
        return resultado;
        
    } catch (error) {
        console.error('Error al exportar Abastible:', error);
        return [];
    }
}

/**
 * Exporta compras de gas en formato general (versión admin renombrada)
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {Promise<Array>} Datos formateados para Excel
 */
export async function exportarGeneralExcelAdmin(fecha = null) {
    try {
        const fechaFiltro = fecha || new Date().toISOString().split('T')[0];
        const compras = await obtenerComprasPorTipo('gas', {
            fechaInicio: fechaFiltro,
            fechaFin: fechaFiltro
        });
        
        const comprasFormateadas = compras.map(data => {
            const compraFecha = data.fechaCompra?.slice?.(0,10) || data.fechaCompra || '';
            return {
                Fecha: compraFecha,
                Nombre: `${data.nombre} ${data.apellido || ''}`.trim(),
                Rut: data.rut,
                Teléfono: data.telefono,
                Correo: data.email,
                "Tipo de carga": `${data.tipoCarga || ''} kg`,
                Cantidad: data.cantidad || data.totalCargas || 0,
                Empresa: data.empresa || '',
                "Comprobante URL": data.comprobanteUrl || ''
            };
        });
        
        return comprasFormateadas;
        
    } catch (error) {
        console.error('Error al exportar General:', error);
        return [];
    }
}

// PARA COMPATIBILIDAD CON EL ADMIN (mantener llamadas onclick existentes en HTML)
if (typeof window !== 'undefined') {
    window.exportarLipigasExcel = exportarLipigasExcelAdmin;
    window.exportarAbastibleExcel = exportarAbastibleExcelAdmin;
    window.exportarGeneralExcel = exportarGeneralExcelAdmin;
}

// ========================================
// EXPORTAR FUNCIONES PRINCIPALES
// ========================================
export {
    // Constantes
    COLECCIONES,
    STORAGE_FOLDERS,
    PRECIOS_ENTRETENIMIENTO,
    
    // Funciones de guardado
    guardarCompraGas,
    guardarCompraEntretenimiento,
    guardarCompraUnificada,
    
    // Funciones de consulta
    obtenerComprasPorTipo,
    obtenerComprasPorRUT,
    obtenerComprasRecientes,
    
    // Funciones de estadísticas
    obtenerEstadisticasCompras,
    
    // Funciones de exportación (se exportan con nombres nuevos para evitar colisiones)
    exportarLipigasExcelAdmin,
    exportarAbastibleExcelAdmin,
    exportarGeneralExcelAdmin,
    
    // Función auxiliar
    subirComprobante
};
