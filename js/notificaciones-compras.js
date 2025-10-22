// ========================================
// MÓDULO: Notificaciones de Compras de Gas
// ========================================

import { db, auth } from './firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    limit,
    Timestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Obtiene las últimas compras de gas del usuario para mostrar como notificaciones
 * @param {string} uid - ID del usuario
 * @param {number} limite - Número máximo de notificaciones a obtener
 * @returns {Promise<Array>} Array de notificaciones
 */
export async function obtenerNotificacionesCompras(uid, limite = 5) {
    try {
        // Obtener datos del usuario
        const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
        const rutUsuario = userData.rut?.replace(/\./g, '').replace(/-/g, '');
        
        if (!rutUsuario) {
            console.warn('No se pudo obtener el RUT del usuario');
            return [];
        }

        // Consultar compras del usuario
        const comprasRef = collection(db, "comprasGas");
        const q = query(
            comprasRef,
            where("rut", "==", rutUsuario),
            orderBy("createdAt", "desc"),
            limit(limite)
        );
        
        const querySnapshot = await getDocs(q);
        const notificaciones = [];
        
        querySnapshot.forEach((doc) => {
            const compra = doc.data();
            notificaciones.push(formatearNotificacionCompra(compra, doc.id));
        });
        
        return notificaciones;
        
    } catch (error) {
        console.error("Error al obtener notificaciones de compras:", error);
        return [];
    }
}

/**
 * Formatea los datos de una compra en un objeto de notificación
 * @param {Object} compra - Datos de la compra
 * @param {string} id - ID del documento
 * @returns {Object} Notificación formateada
 */
function formatearNotificacionCompra(compra, id) {
    const fecha = compra.createdAt?.toDate() || new Date();
    const fechaFormateada = fecha.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    // Construir descripción de la compra
    let descripcion = [];
    let totalCargas = 0;
    
    // Lipigas
    if (compra.compraLipigas && compra.cargas_lipigas) {
        const lipigas = compra.cargas_lipigas;
        const items = [];
        
        if (lipigas.kg5 > 0) {
            items.push(`${lipigas.kg5} x 5kg`);
            totalCargas += lipigas.kg5;
        }
        if (lipigas.kg11 > 0) {
            items.push(`${lipigas.kg11} x 11kg`);
            totalCargas += lipigas.kg11;
        }
        if (lipigas.kg15 > 0) {
            items.push(`${lipigas.kg15} x 15kg`);
            totalCargas += lipigas.kg15;
        }
        if (lipigas.kg45 > 0) {
            items.push(`${lipigas.kg45} x 45kg`);
            totalCargas += lipigas.kg45;
        }
        
        if (items.length > 0) {
            descripcion.push(`Lipigas: ${items.join(', ')}`);
        }
    }
    
    // Abastible
    if (compra.compraAbastible && compra.cargas_abastible) {
        const abastible = compra.cargas_abastible;
        const items = [];
        
        if (abastible.kg5 > 0) {
            items.push(`${abastible.kg5} x 5kg`);
            totalCargas += abastible.kg5;
        }
        if (abastible.kg11 > 0) {
            items.push(`${abastible.kg11} x 11kg`);
            totalCargas += abastible.kg11;
        }
        if (abastible.kg15 > 0) {
            items.push(`${abastible.kg15} x 15kg`);
            totalCargas += abastible.kg15;
        }
        if (abastible.kg45 > 0) {
            items.push(`${abastible.kg45} x 45kg`);
            totalCargas += abastible.kg45;
        }
        
        if (items.length > 0) {
            descripcion.push(`Abastible: ${items.join(', ')}`);
        }
    }
    
    // Determinar estado
    let estado = 'procesando';
    let estadoTexto = 'En procesamiento';
    let estadoClase = 'warning';
    
    if (compra.estado === 'pendiente_comprobante') {
        estado = 'pendiente';
        estadoTexto = 'Pendiente de comprobante';
        estadoClase = 'warning';
    } else if (compra.estado === 'aprobado') {
        estado = 'aprobado';
        estadoTexto = 'Aprobado';
        estadoClase = 'success';
    } else if (compra.estado === 'rechazado') {
        estado = 'rechazado';
        estadoTexto = 'Rechazado';
        estadoClase = 'danger';
    }
    
    return {
        id: id,
        tipo: 'compra_gas',
        fecha: fechaFormateada,
        fechaTimestamp: fecha,
        titulo: `Compra de Gas - ${totalCargas} carga${totalCargas !== 1 ? 's' : ''}`,
        descripcion: descripcion.join(' | '),
        estado: estado,
        estadoTexto: estadoTexto,
        estadoClase: estadoClase,
        icono: '🛒',
        detalles: {
            totalCargas: totalCargas,
            lipigas: compra.compraLipigas,
            abastible: compra.compraAbastible,
            saldoFavor: compra.saldoFavor || null
        }
    };
}

/**
 * Renderiza las notificaciones en el contenedor especificado
 * @param {string} containerId - ID del contenedor donde renderizar
 * @param {Array} notificaciones - Array de notificaciones a renderizar
 */
export function renderizarNotificaciones(containerId, notificaciones) {
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.warn(`Contenedor ${containerId} no encontrado`);
        return;
    }
    
    if (notificaciones.length === 0) {
        container.innerHTML = `
            <div class="notification empty">
                <p>📭 No hay notificaciones recientes</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    notificaciones.forEach(notif => {
        const notifElement = document.createElement('div');
        notifElement.className = `notification notification-${notif.estadoClase}`;
        
        notifElement.innerHTML = `
            <div class="notification-icon">${notif.icono}</div>
            <div class="notification-content">
                <div class="notification-header">
                    <h4>${notif.titulo}</h4>
                    <span class="notification-date">${notif.fecha}</span>
                </div>
                <p class="notification-description">${notif.descripcion}</p>
                <div class="notification-footer">
                    <span class="badge badge-${notif.estadoClase}">${notif.estadoTexto}</span>
                    <button class="btn-link" onclick="verDetalleCompra('${notif.id}')">
                        Ver detalles →
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(notifElement);
    });
}

/**
 * Función auxiliar para calcular el tiempo transcurrido
 * @param {Date} fecha - Fecha de la notificación
 * @returns {string} Tiempo transcurrido en formato legible
 */
function calcularTiempoTranscurrido(fecha) {
    const ahora = new Date();
    const diferencia = ahora - fecha;
    
    const minutos = Math.floor(diferencia / 60000);
    const horas = Math.floor(diferencia / 3600000);
    const dias = Math.floor(diferencia / 86400000);
    
    if (minutos < 60) {
        return minutos === 1 ? 'Hace 1 minuto' : `Hace ${minutos} minutos`;
    } else if (horas < 24) {
        return horas === 1 ? 'Hace 1 hora' : `Hace ${horas} horas`;
    } else {
        return dias === 1 ? 'Hace 1 día' : `Hace ${dias} días`;
    }
}

/**
 * Inicializa el sistema de notificaciones
 * @param {string} uid - ID del usuario
 */
export async function inicializarNotificaciones(uid) {
    try {
        console.log('🔔 Inicializando sistema de notificaciones...');
        
        // Obtener notificaciones
        const notificaciones = await obtenerNotificacionesCompras(uid);
        
        console.log(`✅ ${notificaciones.length} notificaciones obtenidas`);
        
        // Renderizar en el dashboard
        renderizarNotificaciones('notificaciones-recientes', notificaciones);
        
        // Actualizar contador si existe
        const contador = document.querySelector('.notification-count');
        if (contador && notificaciones.length > 0) {
            contador.textContent = notificaciones.length;
            contador.style.display = 'inline-block';
        }
        
        return notificaciones;
        
    } catch (error) {
        console.error('Error al inicializar notificaciones:', error);
        return [];
    }
}

/**
 * Función global para ver detalle de una compra (se puede mejorar con un modal)
 */
window.verDetalleCompra = function(compraId) {
    // Por ahora, redirige a la pestaña de compras de gas
    const tabCompras = document.querySelector('[data-tab="compras-gas"]');
    if (tabCompras) {
        tabCompras.click();
        
        // Scroll suave hacia el formulario
        setTimeout(() => {
            const formCompras = document.getElementById('formCompraGas');
            if (formCompras) {
                formCompras.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 300);
    }
    
    // TODO: Implementar modal con detalles completos de la compra
    console.log('Ver detalle de compra:', compraId);
};

// Exportar funciones
export {
    formatearNotificacionCompra,
    calcularTiempoTranscurrido
};
