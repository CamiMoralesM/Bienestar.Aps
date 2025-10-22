// ========================================
// MÓDULO: Validación de Cupo Mensual
// ========================================
// Este archivo valida si el usuario tiene cupo disponible
// antes de permitir realizar una nueva compra de gas

import { db } from './firebase-config.js';
import { collection, query, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

/**
 * Determina si estamos en temporada alta
 */
function esTemporadaAlta() {
    const mes = new Date().getMonth() + 1; // 1-12
    return mes >= 6 && mes <= 9;
}

/**
 * Obtiene el límite máximo según la temporada
 */
function obtenerLimiteMaximo() {
    return esTemporadaAlta() ? 6 : 4;
}

/**
 * Consulta las compras del usuario en el mes actual
 * @param {string} rut - RUT del usuario
 * @returns {Promise<Array>} Array de compras del mes
 */
async function obtenerComprasMesActual(rut) {
    try {
        const rango = obtenerRangoMesActual();
        
        // Normalizar RUT (remover puntos y guión)
        const rutNormalizado = rut.replace(/\./g, '').replace(/-/g, '');
        
        // Consultar compras del mes
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
            compras.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return compras;
        
    } catch (error) {
        console.error("Error al obtener compras del mes:", error);
        throw error;
    }
}

/**
 * Calcula el total de cargas del mes
 * @param {Array} compras - Array de compras
 * @returns {number} Total de cargas
 */
function calcularTotalCargasMes(compras) {
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
}

/**
 * Valida si el usuario puede realizar una nueva compra
 * @param {string} rut - RUT del usuario
 * @returns {Promise<Object>} Resultado de la validación
 */
export async function validarCupoDisponible(rut) {
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
        return {
            success: false,
            error: error.message,
            puedeComprar: false
        };
    }
}

/**
 * Valida si las cargas solicitadas exceden el cupo disponible
 * @param {string} rut - RUT del usuario
 * @param {Object} cargasSolicitadas - Objeto con las cargas que quiere comprar
 * @returns {Promise<Object>} Resultado de la validación
 */
export async function validarCargasSolicitadas(rut, cargasSolicitadas) {
    try {
        const validacion = await validarCupoDisponible(rut);
        
        if (!validacion.success) {
            return validacion;
        }
        
        // Calcular total de cargas solicitadas
        let totalSolicitado = 0;
        
        if (cargasSolicitadas.lipigas) {
            totalSolicitado += (cargasSolicitadas.lipigas.kg5 || 0);
            totalSolicitado += (cargasSolicitadas.lipigas.kg11 || 0);
            totalSolicitado += (cargasSolicitadas.lipigas.kg15 || 0);
            totalSolicitado += (cargasSolicitadas.lipigas.kg45 || 0);
        }
        
        if (cargasSolicitadas.abastible) {
            totalSolicitado += (cargasSolicitadas.abastible.kg5 || 0);
            totalSolicitado += (cargasSolicitadas.abastible.kg11 || 0);
            totalSolicitado += (cargasSolicitadas.abastible.kg15 || 0);
            totalSolicitado += (cargasSolicitadas.abastible.kg45 || 0);
        }
        
        const excedeCupo = totalSolicitado > validacion.cupoDisponible;
        const totalFinal = validacion.totalUsado + totalSolicitado;
        
        return {
            success: true,
            puedeComprar: !excedeCupo,
            totalUsado: validacion.totalUsado,
            totalSolicitado: totalSolicitado,
            cupoDisponible: validacion.cupoDisponible,
            limiteMaximo: validacion.limiteMaximo,
            totalFinal: totalFinal,
            excedeCupo: excedeCupo,
            mensaje: excedeCupo 
                ? `La compra excede su cupo disponible. Tiene ${validacion.cupoDisponible} cargas disponibles, pero intenta comprar ${totalSolicitado}` 
                : `Compra válida. Usará ${totalSolicitado} de sus ${validacion.cupoDisponible} cargas disponibles`
        };
        
    } catch (error) {
        console.error("Error en validación de cargas:", error);
        return {
            success: false,
            error: error.message,
            puedeComprar: false
        };
    }
}

/**
 * Obtiene el detalle de las compras del mes para mostrar al usuario
 * @param {string} rut - RUT del usuario
 * @returns {Promise<Object>} Detalle de las compras
 */
export async function obtenerDetalleComprasMes(rut) {
    try {
        const comprasMes = await obtenerComprasMesActual(rut);
        const validacion = await validarCupoDisponible(rut);
        
        const detalle = comprasMes.map(compra => {
            let descripcion = [];
            
            if (compra.cargas_lipigas) {
                const lipigas = compra.cargas_lipigas;
                if (lipigas.kg5 > 0) descripcion.push(`${lipigas.kg5} x 5kg Lipigas`);
                if (lipigas.kg11 > 0) descripcion.push(`${lipigas.kg11} x 11kg Lipigas`);
                if (lipigas.kg15 > 0) descripcion.push(`${lipigas.kg15} x 15kg Lipigas`);
                if (lipigas.kg45 > 0) descripcion.push(`${lipigas.kg45} x 45kg Lipigas`);
            }
            
            if (compra.cargas_abastible) {
                const abastible = compra.cargas_abastible;
                if (abastible.kg5 > 0) descripcion.push(`${abastible.kg5} x 5kg Abastible`);
                if (abastible.kg11 > 0) descripcion.push(`${abastible.kg11} x 11kg Abastible`);
                if (abastible.kg15 > 0) descripcion.push(`${abastible.kg15} x 15kg Abastible`);
                if (abastible.kg45 > 0) descripcion.push(`${abastible.kg45} x 45kg Abastible`);
            }
            
            return {
                fecha: compra.fechaCompra || compra.createdAt?.toDate().toLocaleDateString('es-CL'),
                descripcion: descripcion.join(', '),
                estado: compra.estado || 'Procesada'
            };
        });
        
        return {
            success: true,
            compras: detalle,
            resumen: {
                totalCompras: comprasMes.length,
                totalCargas: validacion.totalUsado,
                cupoDisponible: validacion.cupoDisponible,
                limiteMaximo: validacion.limiteMaximo,
                temporada: validacion.temporada
            }
        };
        
    } catch (error) {
        console.error("Error al obtener detalle:", error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Exportar también funciones auxiliares
export { obtenerLimiteMaximo, esTemporadaAlta };
