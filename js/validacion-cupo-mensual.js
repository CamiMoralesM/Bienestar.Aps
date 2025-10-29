// ========================================
// SISTEMA COMPLETO DE VALIDACIÓN DE CUPOS MENSUALES
// Integrado con Firebase - Gas, Cine, Jumper, Gimnasio
// VERSIÓN MEJORADA CON BLOQUEO AUTOMÁTICO
// ========================================

import { db, auth } from './firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    Timestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ========================================
// CONSTANTES DE LÍMITES MENSUALES
// ========================================

const LIMITES_CUPOS = {
    // Gas - varía por temporada
    gas: {
        temporada_normal: 4,  // Oct-May
        temporada_alta: 6     // Jun-Sep
    },
    // Entretenimiento - fijos
    cine: 4,
    jumper: 6,
    gimnasio: 4
};

const COLECCIONES_FIREBASE = {
    gas: 'comprasGas',
    cine: 'comprasCine',
    jumper: 'comprasJumper',
    gimnasio: 'comprasGimnasio'
};

const NOMBRES_SERVICIOS = {
    gas: 'Gas',
    cine: 'Cine',
    jumper: 'Jumper Trampoline Park',
    gimnasio: 'Gimnasio Energy'
};

const UNIDADES_MEDIDA = {
    gas: 'cargas',
    cine: 'entradas',
    jumper: 'entradas',
    gimnasio: 'tickets'
};

// ========================================
// FUNCIONES AUXILIARES
// ========================================

/**
 * Determina si estamos en temporada alta para gas
 */
function esTemporadaAlta() {
    const fecha = new Date();
    const mes = fecha.getMonth() + 1; // 1-12
    return mes >= 6 && mes <= 9; // Junio a Septiembre
}

/**
 * Obtiene el límite de cupo según el tipo de servicio
 */
function obtenerLimiteCupo(tipoServicio) {
    if (tipoServicio === 'gas') {
        return esTemporadaAlta() ? LIMITES_CUPOS.gas.temporada_alta : LIMITES_CUPOS.gas.temporada_normal;
    }
    return LIMITES_CUPOS[tipoServicio] || 0;
}

/**
 * Obtiene las fechas de inicio y fin del mes actual
 */
function obtenerRangoMesActual() {
    const ahora = new Date();
    const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return {
        inicio: Timestamp.fromDate(primerDia),
        fin: Timestamp.fromDate(ultimoDia),
        fechaActual: ahora
    };
}

/**
 * Limpia y valida el formato del RUT
 */
function limpiarRUT(rut) {
    if (!rut) return '';
    return rut.replace(/\./g, '').replace(/-/g, '').toUpperCase().trim();
}

// ========================================
// FUNCIÓN PRINCIPAL DE VALIDACIÓN
// ========================================

/**
 * Valida el cupo disponible para un usuario en un tipo de servicio específico
 * @param {string} rut - RUT del usuario
 * @param {string} tipoServicio - 'gas', 'cine', 'jumper', 'gimnasio'
 * @param {number} cantidadSolicitada - Cantidad que quiere comprar (opcional)
 * @returns {Promise<Object>} Resultado detallado de la validación
 */
export async function validarCupoMensual(rut, tipoServicio, cantidadSolicitada = 0) {
    try {
        console.log(`🔍 [CUPO] Validando ${tipoServicio.toUpperCase()} para RUT: ${rut}`);
        
        // Validar parámetros de entrada
        if (!rut || !tipoServicio) {
            throw new Error('RUT y tipo de servicio son requeridos');
        }
        
        if (!COLECCIONES_FIREBASE[tipoServicio]) {
            throw new Error(`Tipo de servicio no válido: ${tipoServicio}`);
        }
        
        // Preparar datos
        const rutLimpio = limpiarRUT(rut);
        const limiteCupo = obtenerLimiteCupo(tipoServicio);
        const rangoMes = obtenerRangoMesActual();
        const coleccion = COLECCIONES_FIREBASE[tipoServicio];
        
        console.log(`📊 [CUPO] Límite para ${tipoServicio}: ${limiteCupo}, Consultando: ${coleccion}`);
        
        // Consultar compras del usuario en el mes actual
        const consultaCompras = query(
            collection(db, coleccion),
            where("rut", "==", rutLimpio),
            where("createdAt", ">=", rangoMes.inicio),
            where("createdAt", "<=", rangoMes.fin)
        );
        
        const snapshot = await getDocs(consultaCompras);
        
        // Calcular uso actual del cupo
        let usoActual = 0;
        const comprasDelMes = [];
        
        snapshot.forEach(doc => {
            const compra = doc.data();
            const compraCompleta = {
                id: doc.id,
                fecha: compra.createdAt?.toDate() || new Date(),
                estado: compra.estado || 'desconocido',
                ...compra
            };
            
            comprasDelMes.push(compraCompleta);
            
            // Contar según el tipo de servicio
            if (tipoServicio === 'gas') {
                // Para gas, sumar todas las cargas de ambas empresas
                if (compra.cargas_lipigas) {
                    usoActual += (compra.cargas_lipigas.kg5 || 0);
                    usoActual += (compra.cargas_lipigas.kg11 || 0);
                    usoActual += (compra.cargas_lipigas.kg15 || 0);
                    usoActual += (compra.cargas_lipigas.kg45 || 0);
                }
                if (compra.cargas_abastible) {
                    usoActual += (compra.cargas_abastible.kg5 || 0);
                    usoActual += (compra.cargas_abastible.kg11 || 0);
                    usoActual += (compra.cargas_abastible.kg15 || 0);
                    usoActual += (compra.cargas_abastible.kg45 || 0);
                }
            } else {
                // Para entretenimiento, usar el campo cantidad
                usoActual += parseInt(compra.cantidad || 1);
            }
        });
        
        // Calcular disponibilidad
        const disponible = limiteCupo - usoActual;
        const puedeComprar = disponible > 0;
        const puedeComprarCantidad = cantidadSolicitada <= disponible;
        const porcentajeUso = Math.round((usoActual / limiteCupo) * 100);
        
        // Determinar estado del cupo
        let estadoCupo = 'disponible';
        if (usoActual >= limiteCupo) {
            estadoCupo = 'agotado';
        } else if (porcentajeUso >= 75) {
            estadoCupo = 'critico';
        } else if (porcentajeUso >= 50) {
            estadoCupo = 'medio';
        }
        
        const resultado = {
            // Estado general
            success: true,
            timestamp: new Date().toISOString(),
            
            // Información básica
            tipoServicio,
            nombreServicio: NOMBRES_SERVICIOS[tipoServicio],
            unidadMedida: UNIDADES_MEDIDA[tipoServicio],
            rutConsultado: rutLimpio,
            
            // Información del cupo
            limiteCupo,
            usoActual,
            disponible,
            porcentajeUso,
            estadoCupo,
            
            // Validaciones
            puedeComprar,
            puedeComprarCantidad: cantidadSolicitada > 0 ? puedeComprarCantidad : true,
            cantidadSolicitada,
            cantidadMaximaPermitida: disponible,
            
            // Información temporal
            esTemporadaAlta: tipoServicio === 'gas' ? esTemporadaAlta() : null,
            mesActual: rangoMes.fechaActual.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }),
            
            // Historial
            comprasDelMes,
            totalComprasRealizadas: comprasDelMes.length,
            
            // Mensajes
            mensaje: generarMensajeEstado(tipoServicio, usoActual, limiteCupo, disponible, cantidadSolicitada, estadoCupo),
            mensajeDetallado: generarMensajeDetallado(tipoServicio, usoActual, limiteCupo, disponible, cantidadSolicitada, comprasDelMes, estadoCupo),
            
            // Datos para UI
            colorEstado: obtenerColorEstado(estadoCupo),
            iconoEstado: obtenerIconoEstado(estadoCupo)
        };
        
        console.log(`✅ [CUPO] Validación completada: ${tipoServicio} - ${usoActual}/${limiteCupo} (${estadoCupo})`);
        
        return resultado;
        
    } catch (error) {
        console.error(`❌ [CUPO] Error en validación de ${tipoServicio}:`, error);
        return {
            success: false,
            error: error.message,
            tipoServicio,
            rutConsultado: limpiarRUT(rut),
            mensaje: `Error al verificar el cupo de ${NOMBRES_SERVICIOS[tipoServicio] || tipoServicio}`,
            puedeComprar: false,
            puedeComprarCantidad: false,
            estadoCupo: 'error',
            colorEstado: '#dc3545',
            iconoEstado: '❌'
        };
    }
}

// ========================================
// FUNCIONES DE GENERACIÓN DE MENSAJES
// ========================================

function generarMensajeEstado(tipoServicio, usoActual, limiteCupo, disponible, cantidadSolicitada, estadoCupo) {
    const nombreServicio = NOMBRES_SERVICIOS[tipoServicio];
    const unidad = UNIDADES_MEDIDA[tipoServicio];
    
    switch (estadoCupo) {
        case 'agotado':
            return `❌ Cupo mensual de ${nombreServicio} agotado (${usoActual}/${limiteCupo} ${unidad})`;
        
        case 'critico':
            return `⚠️ Cupo de ${nombreServicio} crítico: ${disponible} ${unidad} restantes`;
        
        case 'medio':
            return `🟡 Cupo de ${nombreServicio}: ${disponible} ${unidad} disponibles de ${limiteCupo}`;
        
        case 'disponible':
            return `✅ Cupo de ${nombreServicio}: ${disponible} ${unidad} disponibles de ${limiteCupo}`;
        
        default:
            return `✅ Estado del cupo: ${disponible} ${unidad} disponibles`;
    }
}

function generarMensajeDetallado(tipoServicio, usoActual, limiteCupo, disponible, cantidadSolicitada, comprasDelMes, estadoCupo) {
    const nombreServicio = NOMBRES_SERVICIOS[tipoServicio];
    const unidad = UNIDADES_MEDIDA[tipoServicio];
    const temporadaInfo = tipoServicio === 'gas' && esTemporadaAlta() ? ' (Temporada Alta)' : '';
    
    let mensaje = `📊 ESTADO DEL CUPO DE ${nombreServicio.toUpperCase()}${temporadaInfo}\n`;
    mensaje += `${'='.repeat(50)}\n\n`;
    
    // Información básica del cupo
    mensaje += `💳 Límite mensual: ${limiteCupo} ${unidad}\n`;
    mensaje += `📈 Usado este mes: ${usoActual} ${unidad}\n`;
    mensaje += `🎯 Disponible: ${disponible} ${unidad}\n`;
    mensaje += `📊 Porcentaje de uso: ${Math.round((usoActual / limiteCupo) * 100)}%\n`;
    mensaje += `🛒 Compras realizadas: ${comprasDelMes.length}\n\n`;
    
    // Estado actual
    const iconoEstado = obtenerIconoEstado(estadoCupo);
    mensaje += `${iconoEstado} Estado: ${estadoCupo.toUpperCase()}\n\n`;
    
    // Información de compra actual
    if (cantidadSolicitada > 0) {
        mensaje += `🛍️ COMPRA ACTUAL\n`;
        mensaje += `${'-'.repeat(20)}\n`;
        mensaje += `Cantidad solicitada: ${cantidadSolicitada} ${unidad}\n`;
        
        if (cantidadSolicitada > disponible) {
            mensaje += `❌ COMPRA NO AUTORIZADA\n`;
            mensaje += `💡 Máximo permitido: ${disponible} ${unidad}\n`;
        } else {
            mensaje += `✅ COMPRA AUTORIZADA\n`;
            mensaje += `📈 Después de comprar: ${usoActual + cantidadSolicitada}/${limiteCupo} ${unidad}\n`;
            mensaje += `🎯 Restante después: ${disponible - cantidadSolicitada} ${unidad}\n`;
        }
        mensaje += `\n`;
    }
    
    // Historial del mes
    if (comprasDelMes.length > 0) {
        mensaje += `📋 HISTORIAL DEL MES\n`;
        mensaje += `${'-'.repeat(20)}\n`;
        
        comprasDelMes.forEach((compra, index) => {
            const fecha = compra.fecha.toLocaleDateString('es-CL');
            const hora = compra.fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
            let cantidad = 0;
            
            if (tipoServicio === 'gas') {
                if (compra.cargas_lipigas) {
                    cantidad += (compra.cargas_lipigas.kg5 || 0) + (compra.cargas_lipigas.kg11 || 0) + 
                               (compra.cargas_lipigas.kg15 || 0) + (compra.cargas_lipigas.kg45 || 0);
                }
                if (compra.cargas_abastible) {
                    cantidad += (compra.cargas_abastible.kg5 || 0) + (compra.cargas_abastible.kg11 || 0) + 
                               (compra.cargas_abastible.kg15 || 0) + (compra.cargas_abastible.kg45 || 0);
                }
            } else {
                cantidad = compra.cantidad || 1;
            }
            
            const estadoCompra = compra.estado === 'pendiente' ? '⏳' : 
                               compra.estado === 'aprobada' ? '✅' : 
                               compra.estado === 'rechazada' ? '❌' : '❓';
            
            mensaje += `  ${index + 1}. ${fecha} ${hora}: ${cantidad} ${unidad} ${estadoCompra}\n`;
        });
        
        mensaje += `\n`;
    }
    
    // Información adicional según el estado
    if (estadoCupo === 'agotado') {
        const proximoMes = new Date();
        proximoMes.setMonth(proximoMes.getMonth() + 1);
        mensaje += `🗓️ Próximo cupo disponible: ${proximoMes.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}\n`;
    } else if (estadoCupo === 'critico') {
        mensaje += `⚠️ ATENCIÓN: Está cerca de agotar su cupo mensual\n`;
    }
    
    return mensaje;
}

function obtenerColorEstado(estadoCupo) {
    const colores = {
        'disponible': '#28a745',  // Verde
        'medio': '#ffc107',       // Amarillo
        'critico': '#fd7e14',     // Naranja
        'agotado': '#dc3545',     // Rojo
        'error': '#6c757d'        // Gris
    };
    return colores[estadoCupo] || '#6c757d';
}

function obtenerIconoEstado(estadoCupo) {
    const iconos = {
        'disponible': '✅',
        'medio': '🟡',
        'critico': '⚠️',
        'agotado': '❌',
        'error': '⚠️'
    };
    return iconos[estadoCupo] || '❓';
}

// ========================================
// FUNCIONES DE VALIDACIÓN ESPECÍFICAS
// ========================================

/**
 * Valida específicamente el cupo de gas
 */
export async function validarCupoGas(rut, totalCargas = 0) {
    return await validarCupoMensual(rut, 'gas', totalCargas);
}

/**
 * Valida específicamente el cupo de cine
 */
export async function validarCupoCine(rut, cantidadEntradas = 0) {
    return await validarCupoMensual(rut, 'cine', cantidadEntradas);
}

/**
 * Valida específicamente el cupo de jumper
 */
export async function validarCupoJumper(rut, cantidadEntradas = 0) {
    return await validarCupoMensual(rut, 'jumper', cantidadEntradas);
}

/**
 * Valida específicamente el cupo de gimnasio
 */
export async function validarCupoGimnasio(rut, cantidadTickets = 0) {
    return await validarCupoMensual(rut, 'gimnasio', cantidadTickets);
}

// ========================================
// FUNCIÓN DE VALIDACIÓN MÚLTIPLE
// ========================================

/**
 * Valida los cupos de todos los servicios para un usuario
 */
export async function validarTodosLosCupos(rut) {
    try {
        console.log(`🔍 [CUPO] Validando todos los servicios para RUT: ${rut}`);
        
        const validaciones = await Promise.all([
            validarCupoGas(rut),
            validarCupoCine(rut),
            validarCupoJumper(rut),
            validarCupoGimnasio(rut)
        ]);
        
        const [gas, cine, jumper, gimnasio] = validaciones;
        
        const resultado = {
            success: true,
            timestamp: new Date().toISOString(),
            rut: limpiarRUT(rut),
            cupos: { gas, cine, jumper, gimnasio },
            resumen: {
                totalServicios: 4,
                serviciosDisponibles: validaciones.filter(v => v.puedeComprar).length,
                serviciosAgotados: validaciones.filter(v => !v.puedeComprar).length,
                serviciosCriticos: validaciones.filter(v => v.estadoCupo === 'critico').length,
                usoTotal: validaciones.reduce((total, v) => total + (v.usoActual || 0), 0),
                limitesTotal: validaciones.reduce((total, v) => total + (v.limiteCupo || 0), 0)
            }
        };
        
        console.log(`✅ [CUPO] Validación completa: ${resultado.resumen.serviciosDisponibles}/4 servicios disponibles`);
        return resultado;
        
    } catch (error) {
        console.error('❌ [CUPO] Error en validación múltiple:', error);
        return {
            success: false,
            error: error.message,
            mensaje: 'Error al verificar los cupos de servicios'
        };
    }
}

// ========================================
// FUNCIONES PARA CONTROL DE UI
// ========================================

/**
 * Bloquea un formulario cuando el cupo está agotado
 */
export function bloquearFormularioPorCupo(formId, tipoServicio, validacion) {
    const form = document.getElementById(formId);
    if (!form) {
        console.warn(`Formulario ${formId} no encontrado para bloqueo`);
        return;
    }
    
    console.log(`🔒 [UI] Bloqueando formulario ${formId} por cupo agotado`);
    
    // Deshabilitar elementos del formulario
    const elementos = form.querySelectorAll('input:not([type="submit"]), select, textarea');
    elementos.forEach(el => {
        el.disabled = true;
        el.style.backgroundColor = '#f8f9fa';
        el.style.color = '#6c757d';
    });
    
    // Modificar botón de envío
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = `❌ Cupo ${NOMBRES_SERVICIOS[tipoServicio]} Agotado`;
        submitBtn.style.backgroundColor = '#dc3545';
        submitBtn.style.color = 'white';
        submitBtn.style.border = '1px solid #dc3545';
        submitBtn.style.cursor = 'not-allowed';
    }
    
    // Mostrar mensaje de estado
    mostrarMensajeCupoEnFormulario(formId, validacion, 'agotado');
}

/**
 * Habilita un formulario cuando hay cupo disponible
 */
export function habilitarFormularioPorCupo(formId, tipoServicio, validacion) {
    const form = document.getElementById(formId);
    if (!form) {
        console.warn(`Formulario ${formId} no encontrado para habilitación`);
        return;
    }
    
    console.log(`🔓 [UI] Habilitando formulario ${formId} por cupo disponible`);
    
    // Habilitar elementos del formulario
    const elementos = form.querySelectorAll('input, select, textarea, button');
    elementos.forEach(el => {
        el.disabled = false;
        el.style.backgroundColor = '';
        el.style.color = '';
    });
    
    // Restaurar botón de envío
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = `Enviar Compra de ${NOMBRES_SERVICIOS[tipoServicio]}`;
        submitBtn.style.backgroundColor = '';
        submitBtn.style.color = '';
        submitBtn.style.border = '';
        submitBtn.style.cursor = 'pointer';
    }
    
    // Mostrar mensaje de estado
    mostrarMensajeCupoEnFormulario(formId, validacion, validacion.estadoCupo || 'disponible');
}

/**
 * Muestra mensaje de estado del cupo en el formulario
 */
function mostrarMensajeCupoEnFormulario(formId, validacion, estado) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    let mensajeCupo = form.querySelector('.mensaje-cupo-estado');
    if (!mensajeCupo) {
        mensajeCupo = document.createElement('div');
        mensajeCupo.className = 'mensaje-cupo-estado';
        // Insertar al inicio del formulario
        form.insertBefore(mensajeCupo, form.firstElementChild);
    }
    
    const color = validacion.colorEstado || obtenerColorEstado(estado);
    const icono = validacion.iconoEstado || obtenerIconoEstado(estado);
    
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
    
    let contenidoMensaje = '';
    
    if (estado === 'agotado') {
        contenidoMensaje = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">${icono}</span>
                <div>
                    <strong>Cupo Mensual Agotado</strong><br>
                    <small>${validacion.mensaje}</small><br>
                    <small style="opacity: 0.8;">Podrá realizar nuevas compras el próximo mes.</small>
                </div>
            </div>
        `;
    } else if (estado === 'critico') {
        contenidoMensaje = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">${icono}</span>
                <div>
                    <strong>Cupo Crítico</strong><br>
                    <small>${validacion.mensaje}</small>
                </div>
            </div>
        `;
    } else {
        contenidoMensaje = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">${icono}</span>
                <div>
                    <strong>Cupo Disponible</strong><br>
                    <small>${validacion.mensaje}</small>
                </div>
            </div>
        `;
    }
    
    mensajeCupo.innerHTML = contenidoMensaje;
}

/**
 * Valida automáticamente el cupo cuando el usuario ingresa su RUT
 */
export async function validarCupoEnRUT(rutInputId, formId, tipoServicio) {
    const rutInput = document.getElementById(rutInputId);
    if (!rutInput) {
        console.warn(`Input de RUT ${rutInputId} no encontrado`);
        return null;
    }
    
    const rut = rutInput.value.trim();
    
    if (!rut || rut.length < 8) {
        // RUT incompleto, habilitar formulario pero mostrar mensaje informativo
        habilitarFormularioPorCupo(formId, tipoServicio, { 
            mensaje: 'Ingrese su RUT para verificar el cupo disponible',
            estadoCupo: 'disponible',
            colorEstado: '#6c757d',
            iconoEstado: 'ℹ️'
        });
        return null;
    }
    
    try {
        console.log(`🔍 [UI] Validando cupo en RUT para ${tipoServicio}: ${rut}`);
        
        // Mostrar indicador de carga
        const form = document.getElementById(formId);
        if (form) {
            let loader = form.querySelector('.cupo-loader');
            if (!loader) {
                loader = document.createElement('div');
                loader.className = 'cupo-loader';
                loader.style.cssText = `
                    padding: 8px 16px;
                    text-align: center;
                    color: #6c757d;
                    font-size: 14px;
                `;
                form.insertBefore(loader, form.firstElementChild);
            }
            loader.innerHTML = '⏳ Verificando cupo disponible...';
        }
        
        const validacion = await validarCupoMensual(rut, tipoServicio);
        
        // Remover indicador de carga
        const loader = form?.querySelector('.cupo-loader');
        if (loader) loader.remove();
        
        if (validacion.success) {
            if (validacion.puedeComprar) {
                habilitarFormularioPorCupo(formId, tipoServicio, validacion);
            } else {
                bloquearFormularioPorCupo(formId, tipoServicio, validacion);
            }
        } else {
            // Error en la validación, habilitar formulario pero mostrar error
            habilitarFormularioPorCupo(formId, tipoServicio, {
                mensaje: 'Error al verificar cupo. Inténtelo nuevamente.',
                estadoCupo: 'error',
                colorEstado: '#dc3545',
                iconoEstado: '⚠️'
            });
        }
        
        return validacion;
        
    } catch (error) {
        console.error(`❌ [UI] Error al validar cupo en RUT:`, error);
        
        // Remover indicador de carga en caso de error
        const loader = document.getElementById(formId)?.querySelector('.cupo-loader');
        if (loader) loader.remove();
        
        habilitarFormularioPorCupo(formId, tipoServicio, {
            mensaje: 'Error al verificar cupo. Inténtelo nuevamente.',
            estadoCupo: 'error',
            colorEstado: '#dc3545',
            iconoEstado: '⚠️'
        });
        
        return null;
    }
}

/**
 * Inicializa la validación automática de cupo para un formulario
 */
export function inicializarValidacionCupoAutomatica(rutInputId, formId, tipoServicio) {
    const rutInput = document.getElementById(rutInputId);
    if (!rutInput) {
        console.warn(`No se pudo inicializar validación automática: input ${rutInputId} no encontrado`);
        return;
    }
    
    console.log(`🎯 [UI] Inicializando validación automática para ${tipoServicio}`);
    
    // Validar al perder el foco (blur)
    rutInput.addEventListener('blur', () => {
        validarCupoEnRUT(rutInputId, formId, tipoServicio);
    });
    
    // Validar al cambiar el valor (después de un pequeño delay)
    let timeoutId;
    rutInput.addEventListener('input', () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            validarCupoEnRUT(rutInputId, formId, tipoServicio);
        }, 1500); // Esperar 1.5 segundos después de dejar de escribir
    });
    
    // Validar inmediatamente si ya hay un valor
    if (rutInput.value.trim()) {
        validarCupoEnRUT(rutInputId, formId, tipoServicio);
    }
}

// ========================================
// EXPORTAR CONSTANTES Y UTILIDADES
// ========================================
export {
    LIMITES_CUPOS,
    COLECCIONES_FIREBASE,
    NOMBRES_SERVICIOS,
    UNIDADES_MEDIDA,
    esTemporadaAlta,
    obtenerLimiteCupo,
    limpiarRUT
};
