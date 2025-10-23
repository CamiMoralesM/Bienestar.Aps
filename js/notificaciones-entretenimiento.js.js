// ========================================
// MÓDULO: Notificaciones de Compras de Entretenimiento
// Cine, Jumper Trampoline Park y Gimnasio
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
 * Obtiene las últimas compras de entretenimiento del usuario
 */
export async function obtenerNotificacionesEntretenimiento(uid, limite = 10) {
    try {
        const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
        const rutUsuario = userData.rut?.replace(/\./g, '').replace(/-/g, '');
        
        if (!rutUsuario) {
            console.warn('No se pudo obtener el RUT del usuario');
            return [];
        }

        const notificaciones = [];
        
        // Tipos de compras a consultar
        const tiposCompra = [
            { nombre: 'Cine', coleccion: 'comprasCine', icono: '🎬' },
            { nombre: 'Jumper', coleccion: 'comprasJumper', icono: '🤸' },
            { nombre: 'Gimnasio', coleccion: 'comprasGimnasio', icono: '💪' }
        ];
        
        // Consultar cada tipo de compra
        for (const tipo of tiposCompra) {
            try {
                const comprasRef = collection(db, tipo.coleccion);
                const q = query(
                    comprasRef,
                    where("rut", "==", rutUsuario),
                    orderBy("createdAt", "desc"),
                    limit(3)
                );
                
                const querySnapshot = await getDocs(q);
                
                querySnapshot.forEach((doc) => {
                    const compra = doc.data();
                    notificaciones.push(formatearNotificacion(compra, doc.id, tipo));
                });
            } catch (error) {
                console.error(`Error al obtener compras de ${tipo.nombre}:`, error);
            }
        }
        
        // Ordenar por fecha descendente
        notificaciones.sort((a, b) => b.fechaTimestamp - a.fechaTimestamp);
        
        // Limitar al número solicitado
        return notificaciones.slice(0, limite);
        
    } catch (error) {
        console.error("Error al obtener notificaciones de entretenimiento:", error);
        return [];
    }
}

/**
 * Formatea una compra en notificación
 */
function formatearNotificacion(compra, id, tipo) {
    const fecha = compra.createdAt?.toDate() || new Date();
    const fechaFormateada = fecha.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    // Determinar estado
    let estado = 'procesando';
    let estadoTexto = 'En procesamiento';
    let estadoClase = 'warning';
    
    if (compra.estado === 'pendiente') {
        estado = 'pendiente';
        estadoTexto = 'Pendiente de revisión';
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
    
    const cantidad = compra.cantidad || 0;
    const textoEntrada = cantidad === 1 ? 'entrada' : 'entradas';
    
    return {
        id: id,
        tipo: tipo.coleccion,
        fecha: fechaFormateada,
        fechaTimestamp: fecha,
        titulo: `${tipo.nombre} - ${cantidad} ${textoEntrada}`,
        descripcion: `Compra realizada el ${fechaFormateada}`,
        estado: estado,
        estadoTexto: estadoTexto,
        estadoClase: estadoClase,
        icono: tipo.icono,
        detalles: {
            cantidad: cantidad,
            tipoCompra: tipo.nombre
        }
    };
}

/**
 * Renderiza las notificaciones de entretenimiento
 */
export function renderizarNotificacionesEntretenimiento(containerId, notificaciones) {
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.warn(`Contenedor ${containerId} no encontrado`);
        return;
    }
    
    if (notificaciones.length === 0) {
        return; // No agregar nada si no hay notificaciones
    }
    
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
                </div>
            </div>
        `;
        
        container.appendChild(notifElement);
    });
}

/**
 * Inicializa el sistema de notificaciones de entretenimiento
 */
export async function inicializarNotificacionesEntretenimiento(uid) {
    try {
        console.log('🎭 Inicializando notificaciones de entretenimiento...');
        
        const notificaciones = await obtenerNotificacionesEntretenimiento(uid);
        
        console.log(`✅ ${notificaciones.length} notificaciones de entretenimiento obtenidas`);
        
        // Renderizar en el dashboard
        renderizarNotificacionesEntretenimiento('notificaciones-recientes', notificaciones);
        
        return notificaciones;
        
    } catch (error) {
        console.error('Error al inicializar notificaciones de entretenimiento:', error);
        return [];
    }
}

export {
    formatearNotificacion
};
