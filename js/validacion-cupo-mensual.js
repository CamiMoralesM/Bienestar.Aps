// ========================================
// VALIDACIÓN DE CUPO MENSUAL UNIFICADA
// Gas y Entretenimiento (Cine, Jumper, Gimnasio)
// ========================================

import { db } from './firebase-config.js';
import { collection, query, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ========================================
// CONSTANTES
// ========================================

// Límites mensuales unificados
const LIMITES_MENSUALES = {
    // Gas (por temporada)
    gas_temporada_normal: 4,
    gas_temporada_alta: 6,
    
    // Entretenimiento
    cine: 4,
    jumper: 6,
    gimnasio: 4
};

// Colecciones de Firebase
const COLECCIONES = {
    gas: 'comprasGas',
    cine: 'comprasCine',
    jumper: 'comprasJumper',
    gimnasio: 'comprasGimnasio'
};

// ========================================
// FUNCIONES DE TEMPORADA Y FECHAS
// ========================================

/**
 * Determina si estamos en temporada alta (para gas)
 */
function esTemporadaAlta() {
    const mes = new Date().getMonth() + 1; // 1-12
    return mes >= 6 && mes <= 9;
}

/**
 * Obtiene el límite máximo según el tipo de compra y temporada
 */
function obtenerLimiteMaximo(tipoCompra) {
    switch(tipoCompra) {
        case 'gas':
            return esTemporadaAlta() ? LIMITES_MENSUALES.gas_temporada_alta : LIMITES_MENSUALES.gas_temporada_normal;
        case 'cine':
            return LIMITES_MENSUALES.cine;
        case 'jumper':
            return LIMITES_MENSUALES.jumper;
        case 'gimnasio':
            return LIMITES_MENSUALES.gimnasio;
        default:
            return 0;
    }
}

/**
 * Obtiene el primer y último día del mes actual
 */
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
// CONSULTAS A FIREBASE
// ========================================

/**
 * Consulta las compras del usuario en el mes actual para cualquier tipo
 * @param {string} rut - RUT del usuario
 * @param {string} tipoCompra - Tipo de compra (gas, cine, jumper, gimnasio)
 * @returns {Promise<Array>} Array de compras del mes
 */
async function obtenerComprasMesActual(rut, tipoCompra) {
    try {
        const rango = obtenerRangoMesActual();
        
        // Normalizar RUT (remover puntos y guión)
        const rutNormalizado = rut.replace(/\./g, '').replace(/-/g, '');
        
        // Validar que el tipo de compra existe
        if (!COLECCIONES[tipoCompra]) {
            throw new Error(`Tipo de compra no válido: ${tipoCompra}`);
        }
        
        // Consultar compras del mes en la colección correspondiente
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
            compras.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`📊 ${tipoCompra}: ${compras.length} compras encontradas en el mes actual`);
        return compras;
        
    } catch (error) {
        console.error(`Error al obtener compras de ${tipoCompra} del mes:`, error);
        throw error;
    }
}

/**
 * Obtiene todas las compras del usuario en el mes (todos los tipos)
 * @param {string} rut - RUT del usuario
 * @returns {Promise<Object>} Objeto con compras por tipo
 */
export async function obtenerTodasLasComprasMes(rut) {
    try {
        const comprasPorTipo = {};
        
        // Consultar cada tipo de compra
        for (const tipo of Object.keys(COLECCIONES)) {
            try {
                comprasPorTipo[tipo] = await obtenerComprasMesActual(rut, tipo);
            } catch (error) {
                console.error(`Error al obtener compras de ${tipo}:`, error);
                comprasPorTipo[tipo] = [];
            }
        }
        
        return comprasPorTipo;
    } catch (error) {
        console.error("Error al obtener todas las compras del mes:", error);
        return {};
    }
}

// ========================================
// CÁLCULOS DE TOTALES
// ========================================

/**
 * Calcula el total usado según el tipo de compra
 * @param {Array} compras - Array de compras
 * @param {string} tipoCompra - Tipo de compra
 * @returns {number} Total usado
 */
function calcularTotalUsado(compras, tipoCompra) {
    if (tipoCompra === 'gas') {
        // Para gas, sumar todas las cargas de ambas marcas
        let total = 0;
        
        compras.forEach(compra => {
            // Sumar cargas de Lipigas
            if (compra.cargas_lipigas) {
                total += (compra.cargas_lipigas.kg5 || 0);
                total += (compra.cargas_lipigas.kg11 || 0);
                total += (compra.cargas_lipigas.kg15 || 0);
                total += (compra.cargas_lipigas.kg45 || 0);
            }
            
            // Sumar cargas de Abastible
            if (compra.cargas_abastible) {
                total += (compra.cargas_abastible.kg5 || 0);
                total += (compra.cargas_abastible.kg11 || 0);
                total += (compra.cargas_abastible.kg15 || 0);
                total += (compra.cargas_abastible.kg45 || 0);
            }
        });
        
        return total;
    } else {
        // Para entretenimiento, sumar las cantidades
        return compras.reduce((total, compra) => total + (compra.cantidad || 0), 0);
    }
}

/**
 * Calcula el detalle de cargas por tipo (solo para gas)
 * @param {Array} compras - Array de compras de gas
 * @returns {Object} Detalle de cargas por marca y tipo
 */
function calcularDetalleCargasGas(compras) {
    const detalle = {
        lipigas: { kg5: 0, kg11: 0, kg15: 0, kg45: 0 },
        abastible: { kg5: 0, kg11: 0, kg15: 0, kg45: 0 },
        total: 0
    };
    
    compras.forEach(compra => {
        // Lipigas
        if (compra.cargas_lipigas) {
            detalle.lipigas.kg5 += (compra.cargas_lipigas.kg5 || 0);
            detalle.lipigas.kg11 += (compra.cargas_lipigas.kg11 || 0);
            detalle.lipigas.kg15 += (compra.cargas_lipigas.kg15 || 0);
            detalle.lipigas.kg45 += (compra.cargas_lipigas.kg45 || 0);
        }
        
        // Abastible
        if (compra.cargas_abastible) {
            detalle.abastible.kg5 += (compra.cargas_abastible.kg5 || 0);
            detalle.abastible.kg11 += (compra.cargas_abastible.kg11 || 0);
            detalle.abastible.kg15 += (compra.cargas_abastible.kg15 || 0);
            detalle.abastible.kg45 += (compra.cargas_abastible.kg45 || 0);
        }
    });
    
    // Calcular total
    detalle.total = Object.values(detalle.lipigas).reduce((a, b) => a + b, 0) +
                   Object.values(detalle.abastible).reduce((a, b) => a + b, 0);
    
    return detalle;
}

// ========================================
// VALIDACIÓN PRINCIPAL
// ========================================

/**
 * Valida si el usuario puede realizar una nueva compra de cualquier tipo
 * @param {string} rut - RUT del usuario
 * @param {string} tipoCompra - Tipo de compra (gas, cine, jumper, gimnasio)
 * @returns {Promise<Object>} Resultado de la validación
 */
export async function validarCupoDisponible(rut, tipoCompra) {
    try {
        console.log(`🔍 Validando cupo para ${tipoCompra} - RUT: ${rut}`);
        
        // Obtener compras del mes actual
        const comprasMes = await obtenerComprasMesActual(rut, tipoCompra);
        
        // Calcular totales
        const totalUsado = calcularTotalUsado(comprasMes, tipoCompra);
        const limiteMaximo = obtenerLimiteMaximo(tipoCompra);
        const cupoDisponible = limiteMaximo - totalUsado;
        
        // Información adicional según el tipo
        let infoAdicional = {};
        
        if (tipoCompra === 'gas') {
            infoAdicional = {
                temporada: esTemporadaAlta() ? 'alta' : 'normal',
                detalleCargasGas: calcularDetalleCargasGas(comprasMes)
            };
        }
        
        const resultado = {
            success: true,
            puedeComprar: cupoDisponible > 0,
            totalUsado: totalUsado,
            limiteMaximo: limiteMaximo,
            cupoDisponible: cupoDisponible,
            comprasPrevias: comprasMes.length,
            tipoCompra: tipoCompra,
            ...infoAdicional,
            mensaje: cupoDisponible > 0 
                ? `Tiene ${cupoDisponible} ${tipoCompra === 'gas' ? 'cargas' : 'entradas'} disponibles este mes` 
                : `Ha alcanzado el límite mensual de ${limiteMaximo} ${tipoCompra === 'gas' ? 'cargas' : 'entradas'}`
        };
        
        console.log(`✅ Validación completada:`, resultado);
        return resultado;
        
    } catch (error) {
        console.error("Error en validación de cupo:", error);
        return {
            success: false,
            error: error.message,
            puedeComprar: false,
            tipoCompra: tipoCompra
        };
    }
}

/**
 * Valida si las cantidades solicitadas exceden el cupo disponible
 * @param {string} rut - RUT del usuario
 * @param {string} tipoCompra - Tipo de compra
 * @param {number|Object} cantidadSolicitada - Cantidad o detalle de lo que quiere comprar
 * @returns {Promise<Object>} Resultado de la validación
 */
export async function validarCantidadSolicitada(rut, tipoCompra, cantidadSolicitada) {
    try {
        const validacion = await validarCupoDisponible(rut, tipoCompra);
        
        if (!validacion.success) {
            return validacion;
        }
        
        let totalSolicitado = 0;
        
        if (tipoCompra === 'gas' && typeof cantidadSolicitada === 'object') {
            // Para gas, calcular total de cargas solicitadas
            if (cantidadSolicitada.lipigas) {
                totalSolicitado += (cantidadSolicitada.lipigas.kg5 || 0);
                totalSolicitado += (cantidadSolicitada.lipigas.kg11 || 0);
                totalSolicitado += (cantidadSolicitada.lipigas.kg15 || 0);
                totalSolicitado += (cantidadSolicitada.lipigas.kg45 || 0);
            }
            
            if (cantidadSolicitada.abastible) {
                totalSolicitado += (cantidadSolicitada.abastible.kg5 || 0);
                totalSolicitado += (cantidadSolicitada.abastible.kg11 || 0);
                totalSolicitado += (cantidadSolicitada.abastible.kg15 || 0);
                totalSolicitado += (cantidadSolicitada.abastible.kg45 || 0);
            }
        } else {
            // Para entretenimiento, usar el número directamente
            totalSolicitado = parseInt(cantidadSolicitada) || 0;
        }
        
        const excedeCupo = totalSolicitado > validacion.cupoDisponible;
        const totalFinal = validacion.totalUsado + totalSolicitado;
        const unidad = tipoCompra === 'gas' ? 'cargas' : 'entradas';
        
        return {
            success: true,
            puedeComprar: !excedeCupo,
            totalUsado: validacion.totalUsado,
            totalSolicitado: totalSolicitado,
            cupoDisponible: validacion.cupoDisponible,
            limiteMaximo: validacion.limiteMaximo,
            totalFinal: totalFinal,
            excedeCupo: excedeCupo,
            tipoCompra: tipoCompra,
            mensaje: excedeCupo 
                ? `La compra excede su cupo disponible. Tiene ${validacion.cupoDisponible} ${unidad} disponibles, pero intenta comprar ${totalSolicitado}` 
                : `Compra válida. Usará ${totalSolicitado} de sus ${validacion.cupoDisponible} ${unidad} disponibles`
        };
        
    } catch (error) {
        console.error("Error en validación de cantidad:", error);
        return {
            success: false,
            error: error.message,
            puedeComprar: false,
            tipoCompra: tipoCompra
        };
    }
}

// ========================================
// OBTENER DETALLES PARA EL USUARIO
// ========================================

/**
 * Obtiene el detalle completo de las compras del mes para mostrar al usuario
 * @param {string} rut - RUT del usuario
 * @param {string} tipoCompra - Tipo específico o 'todos' para ver todas
 * @returns {Promise<Object>} Detalle de las compras
 */
export async function obtenerDetalleComprasMes(rut, tipoCompra = 'todos') {
    try {
        if (tipoCompra !== 'todos') {
            // Detalle de un tipo específico
            const comprasMes = await obtenerComprasMesActual(rut, tipoCompra);
            const validacion = await validarCupoDisponible(rut, tipoCompra);
            
            const detalle = comprasMes.map(compra => {
                let descripcion = '';
                const fecha = compra.fechaCompra || compra.createdAt?.toDate().toLocaleDateString('es-CL');
                
                if (tipoCompra === 'gas') {
                    let items = [];
                    
                    if (compra.cargas_lipigas) {
                        const l = compra.cargas_lipigas;
                        if (l.kg5 > 0) items.push(`${l.kg5} x 5kg Lipigas`);
                        if (l.kg11 > 0) items.push(`${l.kg11} x 11kg Lipigas`);
                        if (l.kg15 > 0) items.push(`${l.kg15} x 15kg Lipigas`);
                        if (l.kg45 > 0) items.push(`${l.kg45} x 45kg Lipigas`);
                    }
                    
                    if (compra.cargas_abastible) {
                        const a = compra.cargas_abastible;
                        if (a.kg5 > 0) items.push(`${a.kg5} x 5kg Abastible`);
                        if (a.kg11 > 0) items.push(`${a.kg11} x 11kg Abastible`);
                        if (a.kg15 > 0) items.push(`${a.kg15} x 15kg Abastible`);
                        if (a.kg45 > 0) items.push(`${a.kg45} x 45kg Abastible`);
                    }
                    
                    descripcion = items.join(', ');
                } else {
                    const cantidad = compra.cantidad || 0;
                    const tipoNombre = tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1);
                    descripcion = `${cantidad} entrada${cantidad !== 1 ? 's' : ''} de ${tipoNombre}`;
                }
                
                return {
                    fecha: fecha,
                    descripcion: descripcion,
                    estado: compra.estado || 'Procesada',
                    id: compra.id
                };
            });
            
            return {
                success: true,
                tipoCompra: tipoCompra,
                compras: detalle,
                resumen: {
                    totalCompras: comprasMes.length,
                    totalUsado: validacion.totalUsado,
                    cupoDisponible: validacion.cupoDisponible,
                    limiteMaximo: validacion.limiteMaximo,
                    temporada: validacion.temporada || null
                }
            };
        } else {
            // Detalle de todos los tipos
            const todasLasCompras = await obtenerTodasLasComprasMes(rut);
            const resumenPorTipo = {};
            
            for (const tipo of Object.keys(COLECCIONES)) {
                const validacion = await validarCupoDisponible(rut, tipo);
                resumenPorTipo[tipo] = {
                    totalCompras: todasLasCompras[tipo]?.length || 0,
                    totalUsado: validacion.totalUsado,
                    cupoDisponible: validacion.cupoDisponible,
                    limiteMaximo: validacion.limiteMaximo,
                    temporada: validacion.temporada || null
                };
            }
            
            return {
                success: true,
                tipoCompra: 'todos',
                comprasPorTipo: todasLasCompras,
                resumenPorTipo: resumenPorTipo
            };
        }
        
    } catch (error) {
        console.error("Error al obtener detalle:", error);
        return {
            success: false,
            error: error.message,
            tipoCompra: tipoCompra
        };
    }
}

/**
 * Función auxiliar para validar múltiples tipos de compra a la vez
 * @param {string} rut - RUT del usuario
 * @param {Array<string>} tiposCompra - Array de tipos a validar
 * @returns {Promise<Object>} Validaciones por tipo
 */
export async function validarMultiplesCupos(rut, tiposCompra = ['gas', 'cine', 'jumper', 'gimnasio']) {
    try {
        const validaciones = {};
        
        for (const tipo of tiposCompra) {
            validaciones[tipo] = await validarCupoDisponible(rut, tipo);
        }
        
        return {
            success: true,
            validaciones: validaciones,
            resumen: {
                tiposDisponibles: Object.keys(validaciones).filter(tipo => validaciones[tipo].puedeComprar),
                tiposSinCupo: Object.keys(validaciones).filter(tipo => !validaciones[tipo].puedeComprar)
            }
        };
    } catch (error) {
        console.error("Error en validaciones múltiples:", error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ========================================
// EXPORTAR FUNCIONES
// ========================================
export {
    // Constantes
    LIMITES_MENSUALES,
    COLECCIONES,
    
    // Funciones de temporada
    esTemporadaAlta,
    obtenerLimiteMaximo,
    
    // Funciones de fechas
    obtenerRangoMesActual,
    
    // Funciones de consulta
    obtenerComprasMesActual,
    calcularTotalUsado,
    calcularDetalleCargasGas,
    
    // Funciones principales (ya exportadas arriba)
    // validarCupoDisponible,
    // validarCantidadSolicitada,
    // obtenerDetalleComprasMes,
    // obtenerTodasLasComprasMes,
    // validarMultiplesCupos
};
