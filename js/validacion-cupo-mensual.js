// ========================================
// SISTEMA MEJORADO DE VALIDACIÓN DE CUPOS MENSUALES
// Con manejo flexible de formato de RUT
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
    gas: {
        temporada_normal: 4,  // Oct-May
        temporada_alta: 6     // Jun-Sep
    },
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
    jumper: 'Jumper Park',
    gimnasio: 'Gimnasio'
};

// ========================================
// FUNCIONES DE MANEJO DE RUT
// ========================================

/**
 * Limpia el RUT eliminando TODOS los formatos posibles
 * Acepta: 12.345.678-9, 12345678-9, 123456789
 * Retorna: 123456789 (sin puntos ni guión)
 */
function limpiarRUT(rut) {
    if (!rut) return '';
    // Eliminar todos los puntos, guiones y espacios
    return rut.replace(/[\.\-\s]/g, '').toUpperCase().trim();
}

/**
 * Formatea el RUT para mostrar (agrega puntos y guión)
 */
export function formatearRUT(rut) {
    if (!rut) return '';
    const rutLimpio = limpiarRUT(rut);
    if (rutLimpio.length < 2) return rutLimpio;
    
    const dv = rutLimpio.slice(-1);
    let cuerpo = rutLimpio.slice(0, -1);
    
    // Agregar puntos cada 3 dígitos desde la derecha
    cuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    return `${cuerpo}-${dv}`;
}

/**
 * Valida que el RUT tenga el formato correcto
 */
export function validarFormatoRUT(rut) {
    const rutLimpio = limpiarRUT(rut);
    // RUT debe tener entre 8 y 9 caracteres
    if (rutLimpio.length < 8 || rutLimpio.length > 9) {
        return false;
    }
    // Verificar que los primeros caracteres sean números
    const cuerpo = rutLimpio.slice(0, -1);
    if (!/^\d+$/.test(cuerpo)) {
        return false;
    }
    // Verificar que el dígito verificador sea válido
    const dv = rutLimpio.slice(-1);
    if (!/^[0-9K]$/.test(dv)) {
        return false;
    }
    return true;
}

// ========================================
// FUNCIONES DE TEMPORADA
// ========================================

function esTemporadaAlta() {
    const fecha = new Date();
    const mes = fecha.getMonth() + 1; // 1-12
    return mes >= 6 && mes <= 9; // Junio a Septiembre
}

function obtenerLimiteCupo(tipoServicio) {
    if (tipoServicio === 'gas') {
        return esTemporadaAlta() ? LIMITES_CUPOS.gas.temporada_alta : LIMITES_CUPOS.gas.temporada_normal;
    }
    return LIMITES_CUPOS[tipoServicio] || 0;
}

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

// ========================================
// FUNCIÓN PRINCIPAL DE VALIDACIÓN DE CUPO
// ========================================

/**
 * Valida el cupo disponible para un usuario
 * @param {string} rut - RUT en cualquier formato
 * @param {string} tipoServicio - 'gas', 'cine', 'jumper', 'gimnasio'
 * @param {number} cantidadSolicitada - Cantidad que quiere comprar
 * @returns {Promise<Object>} Resultado de la validación
 */
export async function validarCupoMensual(rut, tipoServicio, cantidadSolicitada = 0) {
    try {
        console.log(`🔍 [CUPO] Validando ${tipoServicio} para RUT original: ${rut}`);
        
        // Limpiar RUT
        const rutLimpio = limpiarRUT(rut);
        console.log(`🔍 [CUPO] RUT limpio: ${rutLimpio}`);
        
        // Validar formato
        if (!validarFormatoRUT(rut)) {
            throw new Error('Formato de RUT inválido');
        }
        
        if (!COLECCIONES_FIREBASE[tipoServicio]) {
            throw new Error(`Tipo de servicio no válido: ${tipoServicio}`);
        }
        
        const limiteCupo = obtenerLimiteCupo(tipoServicio);
        const rangoMes = obtenerRangoMesActual();
        const coleccion = COLECCIONES_FIREBASE[tipoServicio];
        
        console.log(`📊 [CUPO] Consultando ${coleccion} para RUT ${rutLimpio}`);
        console.log(`📊 [CUPO] Límite: ${limiteCupo} ${tipoServicio === 'gas' ? 'cargas' : 'entradas'}`);
        
        // Consultar compras del mes
        const consultaCompras = query(
            collection(db, coleccion),
            where("rut", "==", rutLimpio),
            where("createdAt", ">=", rangoMes.inicio),
            where("createdAt", "<=", rangoMes.fin)
        );
        
        const snapshot = await getDocs(consultaCompras);
        
        // Calcular uso actual
        let usoActual = 0;
        const comprasDelMes = [];
        
        snapshot.forEach(doc => {
            const compra = doc.data();
            comprasDelMes.push({
                id: doc.id,
                fecha: compra.createdAt?.toDate() || new Date(),
                estado: compra.estado || 'desconocido',
                ...compra
            });
            
            // Contar según el tipo
            if (tipoServicio === 'gas') {
                // Sumar todas las cargas
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
                // Para entretenimiento
                usoActual += parseInt(compra.cantidad || 1);
            }
        });
        
        const disponible = limiteCupo - usoActual;
        const puedeComprar = disponible > 0;
        const puedeComprarCantidad = cantidadSolicitada <= disponible;
        
        // Determinar estado del cupo
        let estadoCupo = 'disponible';
        if (usoActual >= limiteCupo) {
            estadoCupo = 'agotado';
        } else if (disponible <= 1) {
            estadoCupo = 'critico';
        } else if (disponible <= Math.ceil(limiteCupo * 0.25)) {
            estadoCupo = 'medio';
        }
        
        const resultado = {
            success: true,
            timestamp: new Date().toISOString(),
            
            // Información básica
            tipoServicio,
            nombreServicio: NOMBRES_SERVICIOS[tipoServicio],
            rutOriginal: rut,
            rutLimpio: rutLimpio,
            rutFormateado: formatearRUT(rut),
            
            // Información del cupo
            limiteCupo,
            usoActual,
            disponible,
            porcentajeUso: Math.round((usoActual / limiteCupo) * 100),
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
            
            // Mensaje para mostrar
            mensaje: generarMensajeEstado(tipoServicio, usoActual, limiteCupo, disponible, estadoCupo),
            
            // Datos para UI
            colorEstado: obtenerColorEstado(estadoCupo),
            iconoEstado: obtenerIconoEstado(estadoCupo)
        };
        
        console.log(`✅ [CUPO] Validación completada: ${usoActual}/${limiteCupo} (${estadoCupo})`);
        return resultado;
        
    } catch (error) {
        console.error(`❌ [CUPO] Error en validación:`, error);
        return {
            success: false,
            error: error.message,
            tipoServicio,
            rutConsultado: limpiarRUT(rut),
            mensaje: `Error al verificar el cupo: ${error.message}`,
            puedeComprar: false,
            estadoCupo: 'error',
            colorEstado: '#dc3545',
            iconoEstado: '❌'
        };
    }
}

// ========================================
// FUNCIONES DE MENSAJES Y UI
// ========================================

function generarMensajeEstado(tipoServicio, usoActual, limiteCupo, disponible, estadoCupo) {
    const nombreServicio = NOMBRES_SERVICIOS[tipoServicio];
    const unidad = tipoServicio === 'gas' ? 'cargas' : 'entradas';
    
    switch (estadoCupo) {
        case 'agotado':
            return `❌ Cupo agotado: Ya utilizó ${usoActual} de ${limiteCupo} ${unidad} este mes`;
        case 'critico':
            return `⚠️ Cupo crítico: Solo ${disponible} ${unidad} disponibles`;
        case 'medio':
            return `🟡 Quedan ${disponible} ${unidad} de ${limiteCupo}`;
        case 'disponible':
            return `✅ ${disponible} ${unidad} disponibles de ${limiteCupo}`;
        default:
            return `Estado: ${disponible} ${unidad} disponibles`;
    }
}

function obtenerColorEstado(estadoCupo) {
    const colores = {
        'disponible': '#28a745',
        'medio': '#ffc107',
        'critico': '#fd7e14',
        'agotado': '#dc3545',
        'error': '#6c757d'
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
// FUNCIONES DE INTEGRACIÓN CON FORMULARIOS
// ========================================

/**
 * Muestra el estado del cupo en el formulario
 */
export function mostrarEstadoCupo(formId, validacion) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    // Buscar o crear elemento de mensaje
    let mensajeCupo = form.querySelector('.mensaje-cupo-estado');
    if (!mensajeCupo) {
        mensajeCupo = document.createElement('div');
        mensajeCupo.className = 'mensaje-cupo-estado';
        form.insertBefore(mensajeCupo, form.firstElementChild);
    }
    
    // Aplicar estilos según estado
    mensajeCupo.style.cssText = `
        padding: 15px;
        margin-bottom: 20px;
        border-radius: 8px;
        font-weight: 500;
        border: 2px solid ${validacion.colorEstado};
        background-color: ${validacion.colorEstado}20;
        color: ${validacion.colorEstado};
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
    `;
    
    // Contenido del mensaje
    mensajeCupo.innerHTML = `
        <span style="font-size: 1.5em;">${validacion.iconoEstado}</span>
        <div>
            <strong>${validacion.mensaje}</strong>
            ${validacion.estadoCupo === 'agotado' ? 
                '<br><small>Podrá realizar nuevas compras el próximo mes</small>' : ''}
        </div>
    `;
    
    // Bloquear/habilitar formulario según estado
    const elementos = form.querySelectorAll('input:not([readonly]), select, textarea');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (validacion.estadoCupo === 'agotado') {
        elementos.forEach(el => {
            if (el.id !== form.querySelector('[id*="rut"]')?.id) {
                el.disabled = true;
                el.style.backgroundColor = '#f8f9fa';
            }
        });
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '❌ Cupo Agotado';
            submitBtn.style.opacity = '0.6';
            submitBtn.style.cursor = 'not-allowed';
        }
    } else {
        elementos.forEach(el => {
            el.disabled = false;
            el.style.backgroundColor = '';
        });
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '';
            submitBtn.style.cursor = 'pointer';
        }
    }
}

/**
 * Valida el cupo cuando se ingresa el RUT
 */
export async function validarCupoEnRUT(rutInputId, formId, tipoServicio) {
    const rutInput = document.getElementById(rutInputId);
    if (!rutInput) return null;
    
    const rut = rutInput.value.trim();
    
    if (!rut || rut.length < 8) {
        // RUT incompleto
        const form = document.getElementById(formId);
        const mensajeCupo = form?.querySelector('.mensaje-cupo-estado');
        if (mensajeCupo) {
            mensajeCupo.remove();
        }
        return null;
    }
    
    // Mostrar indicador de carga
    const form = document.getElementById(formId);
    if (form) {
        let loader = form.querySelector('.cupo-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'cupo-loader';
            loader.style.cssText = `
                padding: 10px;
                text-align: center;
                color: #6c757d;
                font-size: 14px;
                background: #f8f9fa;
                border-radius: 5px;
                margin-bottom: 15px;
            `;
            form.insertBefore(loader, form.firstElementChild);
        }
        loader.innerHTML = '⏳ Verificando cupo disponible...';
    }
    
    try {
        // Calcular cantidad solicitada si es gas
        let cantidadSolicitada = 0;
        if (tipoServicio === 'gas') {
            // Sumar todas las selecciones actuales
            if (document.getElementById('compraLipigas')?.value === 'si') {
                cantidadSolicitada += parseInt(document.getElementById('lipigas5')?.value || 0);
                cantidadSolicitada += parseInt(document.getElementById('lipigas11')?.value || 0);
                cantidadSolicitada += parseInt(document.getElementById('lipigas15')?.value || 0);
                cantidadSolicitada += parseInt(document.getElementById('lipigas45')?.value || 0);
            }
            if (document.getElementById('compraAbastible')?.value === 'si') {
                cantidadSolicitada += parseInt(document.getElementById('abastible5')?.value || 0);
                cantidadSolicitada += parseInt(document.getElementById('abastible11')?.value || 0);
                cantidadSolicitada += parseInt(document.getElementById('abastible15')?.value || 0);
                cantidadSolicitada += parseInt(document.getElementById('abastible45')?.value || 0);
            }
        } else {
            // Para entretenimiento
            const cantidadInput = document.getElementById(`cantidad${tipoServicio.charAt(0).toUpperCase() + tipoServicio.slice(1)}`);
            cantidadSolicitada = parseInt(cantidadInput?.value || 0);
        }
        
        const validacion = await validarCupoMensual(rut, tipoServicio, cantidadSolicitada);
        
        // Remover loader
        const loader = form?.querySelector('.cupo-loader');
        if (loader) loader.remove();
        
        if (validacion.success) {
            mostrarEstadoCupo(formId, validacion);
        }
        
        return validacion;
        
    } catch (error) {
        console.error(`❌ [UI] Error al validar cupo:`, error);
        
        // Remover loader
        const loader = form?.querySelector('.cupo-loader');
        if (loader) loader.remove();
        
        mostrarEstadoCupo(formId, {
            mensaje: 'Error al verificar cupo. Intente nuevamente.',
            estadoCupo: 'error',
            colorEstado: '#dc3545',
            iconoEstado: '⚠️'
        });
        
        return null;
    }
}

/**
 * Inicializa la validación automática para un formulario
 */
export function inicializarValidacionAutomatica(rutInputId, formId, tipoServicio) {
    const rutInput = document.getElementById(rutInputId);
    if (!rutInput) {
        console.warn(`Input ${rutInputId} no encontrado`);
        return;
    }
    
    console.log(`🎯 Inicializando validación automática para ${tipoServicio}`);
    
    let timeoutId;
    
    // Validar al escribir (con delay)
    rutInput.addEventListener('input', function() {
        clearTimeout(timeoutId);
        
        // Formatear RUT mientras escribe
        const valorFormateado = formatearRUT(this.value);
        if (this.value !== valorFormateado) {
            this.value = valorFormateado;
        }
        
        // Validar después de un delay
        timeoutId = setTimeout(() => {
            validarCupoEnRUT(rutInputId, formId, tipoServicio);
        }, 1000);
    });
    
    // Validar al perder el foco
    rutInput.addEventListener('blur', function() {
        clearTimeout(timeoutId);
        validarCupoEnRUT(rutInputId, formId, tipoServicio);
    });
    
    // También validar cuando cambian las cantidades (solo para gas)
    if (tipoServicio === 'gas') {
        const selectores = [
            'lipigas5', 'lipigas11', 'lipigas15', 'lipigas45',
            'abastible5', 'abastible11', 'abastible15', 'abastible45',
            'compraLipigas', 'compraAbastible'
        ];
        
        selectores.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.addEventListener('change', () => {
                    if (rutInput.value.trim().length >= 8) {
                        validarCupoEnRUT(rutInputId, formId, tipoServicio);
                    }
                });
            }
        });
    } else {
        // Para entretenimiento
        const cantidadSelect = document.getElementById(`cantidad${tipoServicio.charAt(0).toUpperCase() + tipoServicio.slice(1)}`);
        if (cantidadSelect) {
            cantidadSelect.addEventListener('change', () => {
                if (rutInput.value.trim().length >= 8) {
                    validarCupoEnRUT(rutInputId, formId, tipoServicio);
                }
            });
        }
    }
    
    // Validar si ya hay un valor
    if (rutInput.value.trim().length >= 8) {
        validarCupoEnRUT(rutInputId, formId, tipoServicio);
    }
}

// ========================================
// INICIALIZACIÓN GLOBAL
// ========================================

/**
 * Inicializa el sistema de validación de cupos para todos los formularios
 */
export function inicializarSistemaValidacionCupos() {
    console.log('🚀 Inicializando sistema de validación de cupos...');
    
    // Agregar estilos CSS para animaciones
    if (!document.getElementById('cupos-styles')) {
        const style = document.createElement('style');
        style.id = 'cupos-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateY(-10px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            .mensaje-cupo-estado {
                transition: all 0.3s ease;
            }
            
            .cupo-loader {
                animation: pulse 1.5s ease infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Inicializar validación para cada formulario
    const configuraciones = [
        { rutId: 'rutGas', formId: 'formCompraGas', tipo: 'gas' },
        { rutId: 'rutCine', formId: 'formCompraCine', tipo: 'cine' },
        { rutId: 'rutJumper', formId: 'formCompraJumper', tipo: 'jumper' },
        { rutId: 'rutGimnasio', formId: 'formCompraGimnasio', tipo: 'gimnasio' }
    ];
    
    configuraciones.forEach(config => {
        if (document.getElementById(config.rutId) && document.getElementById(config.formId)) {
            inicializarValidacionAutomatica(config.rutId, config.formId, config.tipo);
            console.log(`✅ Validación iniciada para ${config.tipo}`);
        }
    });
    
    console.log('✅ Sistema de validación de cupos inicializado');
}

// Inicializar automáticamente cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarSistemaValidacionCupos);
} else {
    inicializarSistemaValidacionCupos();
}

// ========================================
// EXPORTACIONES
// ========================================
export {
    LIMITES_CUPOS,
    COLECCIONES_FIREBASE,
    NOMBRES_SERVICIOS,
    esTemporadaAlta,
    obtenerLimiteCupo,
    limpiarRUT
};

export default {
    validarCupoMensual,
    inicializarValidacionAutomatica,
    inicializarSistemaValidacionCupos,
    formatearRUT,
    validarFormatoRUT
};
