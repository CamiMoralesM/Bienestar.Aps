// ========================================
// SISTEMA DE VALIDACIÓN DE CUPOS MENSUALES
// Gas, Cine, Jumper Trampoline Park y Gimnasio
// ========================================

import { db, auth } from './firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    Timestamp,
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ========================================
// CONSTANTES DE VALIDACIÓN
// ========================================

// Límites mensuales por tipo de compra
export const LIMITES_CUPOS = {
    // Gas (por temporada)
    gas: {
        temporada_normal: 4,    // Oct-May
        temporada_alta: 6       // Jun-Sep
    },
    
    // Entretenimiento
    cine: 4,           // 4 entradas mensuales
    jumper: 6,         // 6 entradas mensuales  
    gimnasio: 4        // 4 tickets mensuales
};

// Colecciones de Firebase
export const COLECCIONES_CUPOS = {
    gas: 'comprasGas',
    cine: 'comprasCine',
    jumper: 'comprasJumper',
    gimnasio: 'comprasGimnasio'
};

// Tipos de compra para mensajes
export const TIPOS_COMPRA = {
    gas: 'cargas de gas',
    cine: 'entradas de cine',
    jumper: 'entradas de Jumper Park',
    gimnasio: 'tickets de gimnasio'
};

// ========================================
// FUNCIONES DE TEMPORADA (SOLO PARA GAS)
// ========================================

/**
 * Determina si estamos en temporada alta de gas
 * @returns {boolean} True si es temporada alta (Jun-Sep)
 */
export function esTemporadaAltaGas() {
    const fecha = new Date();
    const mes = fecha.getMonth() + 1;
    return mes >= 6 && mes <= 9;
}

/**
 * Obtiene el límite máximo de gas según la temporada
 * @returns {number} Límite de cargas de gas
 */
export function obtenerLimiteGas() {
    return esTemporadaAltaGas() ? 
        LIMITES_CUPOS.gas.temporada_alta : 
        LIMITES_CUPOS.gas.temporada_normal;
}

/**
 * Obtiene el límite para cualquier tipo de compra
 * @param {string} tipo - Tipo de compra (gas, cine, jumper, gimnasio)
 * @returns {number} Límite mensual
 */
export function obtenerLimitePorTipo(tipo) {
    if (tipo === 'gas') {
        return obtenerLimiteGas();
    }
    return LIMITES_CUPOS[tipo] || 0;
}

// ========================================
// FUNCIONES DE VALIDACIÓN DE CUPOS
// ========================================

/**
 * Valida el cupo disponible para un usuario y tipo de compra específico
 * @param {string} rut - RUT del usuario (se limpiará automáticamente)
 * @param {string} tipo - Tipo de compra (gas, cine, jumper, gimnasio)
 * @returns {Promise<Object>} Resultado de la validación
 */
export async function validarCupoMensual(rut, tipo) {
    try {
        console.log(`🔍 Validando cupo mensual de ${tipo} para RUT:`, rut);
        
        // Limpiar RUT
        const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '').toLowerCase();
        
        if (!rutLimpio || rutLimpio.length < 8) {
            return {
                success: false,
                error: 'RUT_INVALIDO',
                mensaje: 'RUT inválido. Debe tener al menos 8 caracteres.'
            };
        }

        // Validar tipo
        if (!COLECCIONES_CUPOS[tipo]) {
            return {
                success: false,
                error: 'TIPO_INVALIDO',
                mensaje: `Tipo de compra '${tipo}' no válido.`
            };
        }

        // Obtener fechas del mes actual
        const { inicioMes, finMes } = obtenerRangoMesActual();
        
        // Consultar compras del mes
        const comprasDelMes = await consultarComprasDelMes(rutLimpio, tipo, inicioMes, finMes);
        
        // Calcular totales según el tipo
        const totalComprasDelMes = calcularTotalCompras(comprasDelMes, tipo);
        
        // Obtener límite
        const limiteMaximo = obtenerLimitePorTipo(tipo);
        const cupoDisponible = Math.max(0, limiteMaximo - totalComprasDelMes);
        const puedeComprar = cupoDisponible > 0;
        
        // Información de temporada para gas
        const infoTemporada = tipo === 'gas' ? {
            esTemporadaAlta: esTemporadaAltaGas(),
            periodoTemporada: esTemporadaAltaGas() ? 'Junio-Septiembre' : 'Octubre-Mayo'
        } : null;

        console.log(`📊 Cupo ${tipo}: ${totalComprasDelMes}/${limiteMaximo} (Disponible: ${cupoDisponible})`);
        
        return {
            success: true,
            tipo,
            totalComprasDelMes,
            limiteMaximo,
            cupoDisponible,
            puedeComprar,
            comprasDetalle: comprasDelMes,
            infoTemporada,
            mensaje: puedeComprar ? 
                `Tiene ${cupoDisponible} ${TIPOS_COMPRA[tipo]} disponibles este mes` :
                `Ha alcanzado el límite mensual de ${limiteMaximo} ${TIPOS_COMPRA[tipo]}`,
            mensajeDetallado: generarMensajeDetallado(tipo, totalComprasDelMes, limiteMaximo, cupoDisponible, infoTemporada)
        };
        
    } catch (error) {
        console.error(`❌ Error al validar cupo de ${tipo}:`, error);
        return {
            success: false,
            error: 'ERROR_CONSULTA',
            mensaje: `Error al verificar el cupo de ${tipo}. Inténtelo nuevamente.`,
            detalleError: error.message
        };
    }
}

/**
 * Valida cupos para múltiples tipos de compra
 * @param {string} rut - RUT del usuario
 * @param {Array<string>} tipos - Array de tipos a validar
 * @returns {Promise<Object>} Resultado con todos los cupos
 */
export async function validarMultiplesCupos(rut, tipos = ['gas', 'cine', 'jumper', 'gimnasio']) {
    try {
        const resultados = {};
        const promesas = tipos.map(async (tipo) => {
            const resultado = await validarCupoMensual(rut, tipo);
            resultados[tipo] = resultado;
            return resultado;
        });

        await Promise.all(promesas);

        const algunError = Object.values(resultados).some(r => !r.success);
        const todosBloqueados = Object.values(resultados).every(r => r.success && !r.puedeComprar);

        return {
            success: !algunError,
            resultados,
            resumen: {
                todosBloqueados,
                algunDisponible: Object.values(resultados).some(r => r.success && r.puedeComprar),
                totalConsultas: tipos.length,
                exitosas: Object.values(resultados).filter(r => r.success).length
            }
        };

    } catch (error) {
        console.error('❌ Error en validación múltiple:', error);
        return {
            success: false,
            error: 'ERROR_MULTIPLE',
            mensaje: 'Error al validar múltiples cupos'
        };
    }
}

/**
 * Valida si una cantidad específica puede ser comprada
 * @param {string} rut - RUT del usuario
 * @param {string} tipo - Tipo de compra
 * @param {number} cantidadDeseada - Cantidad que se quiere comprar
 * @returns {Promise<Object>} Resultado de la validación
 */
export async function validarCantidadDisponible(rut, tipo, cantidadDeseada) {
    try {
        const validacionCupo = await validarCupoMensual(rut, tipo);
        
        if (!validacionCupo.success) {
            return validacionCupo;
        }

        const puedeComprarCantidad = cantidadDeseada <= validacionCupo.cupoDisponible;

        return {
            ...validacionCupo,
            cantidadDeseada,
            puedeComprarCantidad,
            mensaje: puedeComprarCantidad ?
                `Puede comprar ${cantidadDeseada} ${TIPOS_COMPRA[tipo]}` :
                `No puede comprar ${cantidadDeseada} ${TIPOS_COMPRA[tipo]}. Solo tiene ${validacionCupo.cupoDisponible} disponibles.`
        };

    } catch (error) {
        console.error('❌ Error al validar cantidad:', error);
        return {
            success: false,
            error: 'ERROR_CANTIDAD',
            mensaje: 'Error al validar la cantidad deseada'
        };
    }
}

// ========================================
// FUNCIONES AUXILIARES PRIVADAS
// ========================================

/**
 * Obtiene el rango de fechas del mes actual
 * @returns {Object} Objeto con inicioMes y finMes como Timestamps
 */
function obtenerRangoMesActual() {
    const ahora = new Date();
    const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return {
        inicioMes: Timestamp.fromDate(primerDia),
        finMes: Timestamp.fromDate(ultimoDia)
    };
}

/**
 * Consulta las compras del mes para un usuario y tipo específico
 * @param {string} rutLimpio - RUT limpio del usuario
 * @param {string} tipo - Tipo de compra
 * @param {Timestamp} inicioMes - Inicio del mes
 * @param {Timestamp} finMes - Fin del mes
 * @returns {Promise<Array>} Array de documentos de compras
 */
async function consultarComprasDelMes(rutLimpio, tipo, inicioMes, finMes) {
    const coleccion = COLECCIONES_CUPOS[tipo];
    
    const q = query(
        collection(db, coleccion),
        where("rut", "==", rutLimpio),
        where("createdAt", ">=", inicioMes),
        where("createdAt", "<=", finMes),
        orderBy("createdAt", "desc")
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
}

/**
 * Calcula el total de compras según el tipo
 * @param {Array} compras - Array de compras
 * @param {string} tipo - Tipo de compra
 * @returns {number} Total de compras/cargas
 */
function calcularTotalCompras(compras, tipo) {
    let total = 0;
    
    compras.forEach(compra => {
        if (tipo === 'gas') {
            // Para gas, sumar todas las cargas
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
        } else {
            // Para entretenimiento, sumar cantidad directamente
            total += (compra.cantidad || 0);
        }
    });
    
    return total;
}

/**
 * Genera un mensaje detallado sobre el estado del cupo
 * @param {string} tipo - Tipo de compra
 * @param {number} usado - Cantidad usada
 * @param {number} limite - Límite máximo
 * @param {number} disponible - Cupo disponible
 * @param {Object} infoTemporada - Información de temporada (solo gas)
 * @returns {string} Mensaje detallado
 */
function generarMensajeDetallado(tipo, usado, limite, disponible, infoTemporada) {
    let mensaje = `📊 Estado del cupo de ${TIPOS_COMPRA[tipo]}:\n`;
    mensaje += `• Usado este mes: ${usado}\n`;
    mensaje += `• Límite mensual: ${limite}\n`;
    mensaje += `• Disponible: ${disponible}\n`;
    
    if (infoTemporada && tipo === 'gas') {
        mensaje += `• Temporada: ${infoTemporada.esTemporadaAlta ? '🔥 Alta' : '❄️ Normal'} (${infoTemporada.periodoTemporada})\n`;
    }
    
    if (disponible === 0) {
        mensaje += `\n❌ Ha alcanzado el límite mensual de ${TIPOS_COMPRA[tipo]}.`;
    } else {
        mensaje += `\n✅ Puede realizar ${disponible} compras más este mes.`;
    }
    
    return mensaje;
}

// ========================================
// FUNCIONES DE UTILIDAD PARA UI
// ========================================

/**
 * Genera un resumen visual del estado de cupos para mostrar en UI
 * @param {Object} resultados - Resultados de validarMultiplesCupos
 * @returns {Object} Objeto con información para UI
 */
export function generarResumenVisual(resultados) {
    if (!resultados.success) {
        return {
            html: '<div class="error">❌ Error al consultar cupos</div>',
            clase: 'error'
        };
    }

    let html = '<div class="resumen-cupos">';
    
    Object.entries(resultados.resultados).forEach(([tipo, resultado]) => {
        if (resultado.success) {
            const porcentajeUsado = (resultado.totalComprasDelMes / resultado.limiteMaximo) * 100;
            const claseEstado = resultado.puedeComprar ? 'disponible' : 'agotado';
            const icono = resultado.puedeComprar ? '✅' : '❌';
            
            html += `
                <div class="cupo-item ${claseEstado}">
                    <h4>${icono} ${tipo.toUpperCase()}</h4>
                    <div class="progreso">
                        <div class="barra" style="width: ${porcentajeUsado}%"></div>
                    </div>
                    <p>${resultado.totalComprasDelMes}/${resultado.limiteMaximo} usados</p>
                    <small>${resultado.cupoDisponible} disponibles</small>
                </div>
            `;
        }
    });
    
    html += '</div>';
    
    return {
        html,
        clase: 'resumen-cupos',
        todosAgotados: resultados.resumen.todosBloqueados
    };
}

/**
 * Bloquea un formulario cuando no hay cupo disponible
 * @param {HTMLElement} formulario - Elemento del formulario
 * @param {string} tipo - Tipo de compra
 * @param {string} mensaje - Mensaje a mostrar
 */
export function bloquearFormularioPorCupo(formulario, tipo, mensaje) {
    if (!formulario) return;
    
    // Deshabilitar todos los inputs y selects
    const elementos = formulario.querySelectorAll('input, select, button');
    elementos.forEach(el => {
        if (el.type !== 'submit') {
            el.disabled = true;
        }
    });
    
    // Cambiar el botón de envío
    const btnSubmit = formulario.querySelector('button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = '❌ Cupo Agotado';
        btnSubmit.style.cssText = 'background: #dc3545 !important; color: white;';
    }
    
    // Mostrar mensaje de advertencia
    mostrarAdvertenciaCupo(formulario, mensaje);
}

/**
 * Habilita un formulario cuando hay cupo disponible
 * @param {HTMLElement} formulario - Elemento del formulario
 * @param {string} tipo - Tipo de compra
 */
export function habilitarFormularioPorCupo(formulario, tipo) {
    if (!formulario) return;
    
    // Habilitar todos los elementos
    const elementos = formulario.querySelectorAll('input, select, button');
    elementos.forEach(el => el.disabled = false);
    
    // Restaurar el botón de envío
    const btnSubmit = formulario.querySelector('button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.textContent = `Enviar Compra de ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
        btnSubmit.style.cssText = '';
    }
    
    // Quitar mensaje de advertencia
    const advertencia = formulario.querySelector('.advertencia-cupo');
    if (advertencia) {
        advertencia.remove();
    }
}

/**
 * Muestra una advertencia de cupo en el formulario
 * @param {HTMLElement} formulario - Elemento del formulario
 * @param {string} mensaje - Mensaje a mostrar
 */
function mostrarAdvertenciaCupo(formulario, mensaje) {
    // Quitar advertencia anterior si existe
    const advertenciaAnterior = formulario.querySelector('.advertencia-cupo');
    if (advertenciaAnterior) {
        advertenciaAnterior.remove();
    }
    
    // Crear nueva advertencia
    const advertencia = document.createElement('div');
    advertencia.className = 'advertencia-cupo';
    advertencia.style.cssText = `
        background: #f8d7da;
        color: #721c24;
        padding: 12px 15px;
        border: 1px solid #f5c6cb;
        border-radius: 4px;
        margin-bottom: 15px;
        font-weight: 500;
    `;
    advertencia.textContent = mensaje;
    
    // Insertar al inicio del formulario
    formulario.insertBefore(advertencia, formulario.firstChild);
}

// ========================================
// FUNCIÓN DE INICIALIZACIÓN AUTOMÁTICA
// ========================================

/**
 * Inicializa la validación automática de cupos para formularios
 * @param {string} tipo - Tipo de compra a validar
 * @param {string} selectorFormulario - Selector CSS del formulario
 * @param {string} selectorRut - Selector CSS del input RUT
 */
export function inicializarValidacionAutomatica(tipo, selectorFormulario = null, selectorRut = null) {
    document.addEventListener('DOMContentLoaded', function() {
        const formulario = document.querySelector(selectorFormulario || `#formCompra${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
        const inputRut = document.querySelector(selectorRut || `#rut${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
        
        if (!formulario || !inputRut) {
            console.warn(`⚠️ No se encontró formulario o input RUT para ${tipo}`);
            return;
        }
        
        // Validar al salir del campo RUT
        inputRut.addEventListener('blur', async function() {
            const rut = this.value.trim();
            
            if (!rut || rut.length < 8) {
                habilitarFormularioPorCupo(formulario, tipo);
                return;
            }
            
            try {
                const validacion = await validarCupoMensual(rut, tipo);
                
                if (validacion.success && !validacion.puedeComprar) {
                    bloquearFormularioPorCupo(formulario, tipo, validacion.mensaje);
                } else {
                    habilitarFormularioPorCupo(formulario, tipo);
                }
            } catch (error) {
                console.error(`Error al validar cupo de ${tipo}:`, error);
                habilitarFormularioPorCupo(formulario, tipo);
            }
        });
        
        console.log(`✅ Validación automática de cupo inicializada para ${tipo}`);
    });
}

// ========================================
// EXPORTACIONES ESPECIALIZADAS
// ========================================

export default {
    validarCupoMensual,
    validarMultiplesCupos, 
    validarCantidadDisponible,
    generarResumenVisual,
    inicializarValidacionAutomatica,
    bloquearFormularioPorCupo,
    habilitarFormularioPorCupo,
    LIMITES_CUPOS,
    TIPOS_COMPRA
};
