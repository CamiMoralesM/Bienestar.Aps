// Dashboard del Afiliado - Versión Corregida Sin Notificaciones
// Modificado para mostrar todas las compras y préstamos en la pestaña "Mis Solicitudes"

import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    obtenerFuncionario,
    obtenerSolicitudesFuncionario
} from './firestore-operations.js';
import { cerrarSesion } from './auth.js';

// Nuevas importaciones para obtener compras y préstamos
import { obtenerComprasPorRUT } from './compras-gas-firebase.js';
import { obtenerSolicitudesPrestamosPorUID } from './prestamos-firebase.js';

// Verificar autenticación al cargar
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userType = sessionStorage.getItem('userType');
        
        if (userType !== 'funcionario') {
            window.location.href = 'login.html';
            return;
        }
        
        // Cargar datos del usuario
        await cargarDatosUsuario(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

// Cargar datos del usuario
async function cargarDatosUsuario(uid) {
    try {
        const funcionario = await obtenerFuncionario(uid);
        
        if (!funcionario) {
            alert('Error al cargar datos del usuario');
            return;
        }
        
        // Actualizar información en la UI
        const userNameEl = document.querySelector('.user-name');
        const userRutEl = document.querySelector('.user-rut');
        const bienvenidaEl = document.getElementById('bienvenida-usuario');
        
        if (userNameEl) userNameEl.textContent = `👤 ${funcionario.nombre}`;
        if (userRutEl) userRutEl.textContent = `RUT: ${funcionario.rut}`;
        if (bienvenidaEl) {
            const primerNombre = funcionario.nombre.split(" ")[0];
            bienvenidaEl.textContent = funcionario.genero === 'F' ? `¡Bienvenida, ${primerNombre}!` : `¡Bienvenido, ${primerNombre}!`;
        }

        // Cargar estadísticas
        await cargarEstadisticas(uid, funcionario.fechaAfiliacion);
        
        // Cargar solicitudes (ahora incluye compras y préstamos). Pasamos el RUT.
        await cargarSolicitudes(uid, funcionario.rut);
        
        // Cargar perfil
        await cargarPerfil(funcionario);
        
    } catch (error) {
        console.error('Error al cargar datos:', error);
    }
}

// Cargar estadísticas del dashboard
async function cargarEstadisticas(uid, fechaAfiliacion) {
    try {
        const solicitudes = await obtenerSolicitudesFuncionario(uid);
        
        const solicitudesPendientes = solicitudes.filter(s => 
            s.estado === 'pendiente' || s.estado === 'en_revision'
        ).length;

        // Actualizar cards de estadísticas
        const beneficiosEl = document.getElementById('beneficios-recibidos');
        const solicitudesEl = document.getElementById('solicitudes-pendientes');
        const conveniosEl = document.getElementById('convenios-disponibles');
        const tiempoEl = document.getElementById('tiempo-afiliacion');
        
        if (beneficiosEl) beneficiosEl.textContent = '$0';
        if (solicitudesEl) solicitudesEl.textContent = solicitudesPendientes;
        if (conveniosEl) conveniosEl.textContent = "24";

        // Tiempo de afiliación
        if (fechaAfiliacion && fechaAfiliacion.toDate && tiempoEl) {
            const fecha = fechaAfiliacion.toDate();
            const hoy = new Date();
            const msPorMes = 1000 * 60 * 60 * 24 * 30.44;
            const meses = Math.floor((hoy - fecha) / msPorMes);
            tiempoEl.textContent = meses + (meses === 1 ? " mes" : " meses");
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// Cargar solicitudes (ahora combina: solicitudes, compras y préstamos)
async function cargarSolicitudes(uid, rut) {
    try {
        // Contenedores
        const container = document.getElementById('listaSolicitudes');
        if (!container) return;
        container.innerHTML = '<p>Cargando solicitudes y compras...</p>';

        // 1) Solicitudes tradicionales (beneficios)
        const solicitudes = await obtenerSolicitudesFuncionario(uid);

        // 2) Compras (gas + entretenimiento) por RUT
        let comprasPorRUT = { success: false, comprasPorTipo: {} };
        try {
            comprasPorRUT = await obtenerComprasPorRUT(rut);
        } catch (err) {
            console.error('Error al obtener compras por RUT:', err);
        }

        // 3) Solicitudes de préstamos por UID
        let prestamos = [];
        try {
            prestamos = await obtenerSolicitudesPrestamosPorUID(uid);
        } catch (err) {
            console.error('Error al obtener solicitudes de préstamos:', err);
        }

        // Normalizar y combinar todos los ítems en una sola lista
        const items = [];

        // Mapear solicitudes (beneficios)
        if (Array.isArray(solicitudes)) {
            solicitudes.forEach(s => {
                const fecha = s.createdAt?.toDate?.() || new Date();
                const fechaAprob = s.fechaRespuesta?.toDate?.() || s.updatedAt?.toDate?.();
                items.push({
                    id: s.id,
                    fuente: 'solicitud_beneficio',
                    titulo: s.tipoBeneficio ? s.tipoBeneficio.replace(/_/g, ' ') : 'Solicitud de Beneficio',
                    descripcion: s.motivo || s.descripcion || '',
                    fechaSolicitud: fecha,
                    estado: s.estado || 'pendiente',
                    fechaAprobacion: (s.estado === 'aprobada' ? fechaAprob : null),
                    raw: s
                });
            });
        }

        // Mapear compras (comprasPorTipo: {gas: [...], cine: [...], ...})
        if (comprasPorRUT && comprasPorRUT.success && comprasPorRUT.comprasPorTipo) {
            const comprasObj = comprasPorRUT.comprasPorTipo;
            for (const [tipo, compras] of Object.entries(comprasObj)) {
                if (!Array.isArray(compras)) continue;
                compras.forEach(c => {
                    const fecha = c.createdAt?.toDate?.() || new Date();
                    // tratar fecha de aprobación si existe (fechaRespuesta o updatedAt)
                    const fechaAprob = c.fechaRespuesta?.toDate?.() || c.updatedAt?.toDate?.();
                    let titulo = '';
                    let descripcion = '';

                    if (tipo === 'gas') {
                        // calcular total de cargas si no está
                        const total = c.totalCargas ?? (
                            (c.cargas_lipigas ? Object.values(c.cargas_lipigas).reduce((a,b)=>a+(b||0),0):0) +
                            (c.cargas_abastible ? Object.values(c.cargas_abastible).reduce((a,b)=>a+(b||0),0):0)
                        );
                        titulo = `Compra de Gas (${total} carga${total !== 1 ? 's' : ''})`;
                        descripcion = `Lipigas: ${c.compraLipigas ? 'Sí' : 'No'} • Abastible: ${c.compraAbastible ? 'Sí' : 'No'}`;
                    } else {
                        // entretenimiento: cine, jumper, gimnasio
                        const nombreTipo = tipo.charAt(0).toUpperCase() + tipo.slice(1);
                        const cantidad = c.cantidad || c.cantidadEntradas || 0;
                        titulo = `${nombreTipo} - ${cantidad} ${cantidad === 1 ? 'entrada' : 'entradas'}`;
                        descripcion = `Precio total: ${c.montoTotal ? '$' + c.montoTotal.toLocaleString('es-CL') : 'N/A'}`;
                    }

                    items.push({
                        id: c.id,
                        fuente: `compra_${tipo}`,
                        tipoCompra: tipo,
                        titulo,
                        descripcion,
                        fechaSolicitud: fecha,
                        estado: c.estado || 'pendiente',
                        fechaAprobacion: (c.estado === 'aprobado' ? fechaAprob : null),
                        raw: c
                    });
                });
            }
        } else {
            // Si no devolvió success puede que la función devuelva directamente arrays (compatibilidad)
            if (comprasPorRUT && comprasPorRUT.comprasPorTipo) {
                // ya cubierto arriba; si estructura distinta, ignoramos silenciosamente
            }
        }

        // Mapear préstamos
        if (Array.isArray(prestamos)) {
            prestamos.forEach(p => {
                const fecha = p.createdAt?.toDate?.() || new Date();
                const fechaAprob = p.updatedAt?.toDate?.(); // en prestamos-firebase usamos updatedAt
                items.push({
                    id: p.id,
                    fuente: 'prestamo',
                    titulo: `Préstamo - ${p.tipoPrestamo || p.tipo || ''}`,
                    descripcion: p.comentario || '',
                    fechaSolicitud: fecha,
                    estado: p.estado || 'pendiente',
                    fechaAprobacion: (p.estado !== 'pendiente' ? fechaAprob : null),
                    raw: p
                });
            });
        }

        // Ordenar items por fechaSolicitud descendente
        items.sort((a, b) => b.fechaSolicitud - a.fechaSolicitud);

        // Renderizar
        renderMisSolicitudes(container, items);

    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
    }
}

// Renderiza la lista unificada de solicitudes/compras/prestamos
function renderMisSolicitudes(container, items) {
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = '<p>No tienes solicitudes ni compras registradas.</p>';
        return;
    }

    container.innerHTML = '';

    items.forEach(item => {
        const fechaReq = formatDate(item.fechaSolicitud);
        const fechaAprob = item.fechaAprobacion ? formatDate(item.fechaAprobacion) : null;

        const estadoClass = estadoToClass(item.estado);

        const card = document.createElement('div');
        card.className = 'solicitud-item';
        card.style.cssText = `
            display: flex;
            gap: 12px;
            align-items: flex-start;
            background: #fff;
            padding: 14px;
            border-radius: 8px;
            margin-bottom: 12px;
            box-shadow: 0 6px 18px rgba(0,0,0,0.03);
        `;

        const iconDiv = document.createElement('div');
        iconDiv.style.cssText = 'font-size: 26px; width:48px; text-align:center;';

        // icono según fuente
        switch (true) {
            case item.fuente.startsWith('compra_gas'):
                iconDiv.textContent = '🛒';
                break;
            case item.fuente.startsWith('compra_cine'):
            case item.fuente.startsWith('compra_jumper'):
            case item.fuente.startsWith('compra_gimnasio'):
                iconDiv.textContent = '🎟️';
                break;
            case item.fuente === 'prestamo':
                iconDiv.textContent = '💰';
                break;
            default:
                iconDiv.textContent = '📄';
        }

        const content = document.createElement('div');
        content.style.flex = '1';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '6px';

        const title = document.createElement('div');
        title.innerHTML = `<strong style="color:#2c5aa0;">${escapeHtml(item.titulo)}</strong><div style="font-size:13px;color:#6c757d;">${escapeHtml(item.descripcion || '')}</div>`;

        const badge = document.createElement('div');
        badge.innerHTML = `<span class="badge ${estadoClass}" style="padding:6px 10px; border-radius:999px; font-weight:600;">${capitalize(item.estado)}</span>`;

        header.appendChild(title);
        header.appendChild(badge);

        const meta = document.createElement('div');
        meta.style.fontSize = '13px';
        meta.style.color = '#6c757d';
        meta.style.marginTop = '8px';
        meta.innerHTML = `Fecha solicitud: <strong>${fechaReq}</strong>`;
        if (fechaAprob) {
            meta.innerHTML += ` &nbsp; | &nbsp; Fecha aprobación: <strong>${fechaAprob}</strong>`;
        }

        // botón ver detalles (por ahora muestra console.log)
        const actions = document.createElement('div');
        actions.style.marginTop = '10px';
        const btn = document.createElement('button');
        btn.className = 'btn btn-small';
        btn.textContent = 'Ver detalles';
        btn.onclick = () => {
            // por ahora mostramos el object raw en consola; se puede abrir modal con más info
            console.log('Detalle item:', item);
            alert(`Detalle: ${item.titulo}\nEstado: ${item.estado}\nFecha solicitud: ${fechaReq}${fechaAprob ? '\nFecha aprobación: ' + fechaAprob : ''}`);
        };
        actions.appendChild(btn);

        content.appendChild(header);
        content.appendChild(meta);
        content.appendChild(actions);

        card.appendChild(iconDiv);
        card.appendChild(content);

        container.appendChild(card);
    });
}

// Utils
function formatDate(d) {
    if (!d) return 'N/A';
    const date = (d instanceof Date) ? d : (d.toDate ? d.toDate() : new Date(d));
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
           ' ' +
           date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function estadoToClass(estado) {
    if (!estado) return 'badge-secondary';
    switch (estado.toLowerCase()) {
        case 'pendiente':
        case 'pendiente':
        case 'en_revision':
            return 'badge-warning';
        case 'aprobada':
        case 'aprobado':
        case 'aprobado':
            return 'badge-success';
        case 'rechazada':
        case 'rechazado':
            return 'badge-danger';
        default:
            return 'badge-secondary';
    }
}

function capitalize(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Cargar datos del perfil
async function cargarPerfil(funcionario) {
    try {
        // Llenar formulario de información personal
        const inputs = document.querySelectorAll('#tab-perfil input[type="text"]');
        if (inputs[0]) inputs[0].value = funcionario.nombre || '';
        if (inputs[1]) inputs[1].value = funcionario.rut || '';
        
        const emailInput = document.querySelector('#tab-perfil input[type="email"]');
        if (emailInput) emailInput.value = funcionario.email || '';
        
        const telInput = document.querySelector('#tab-perfil input[type="tel"]');
        if (telInput) telInput.value = funcionario.telefono || '';
        
        // Información de cuenta
        const infoItems = document.querySelectorAll('.info-item .info-value');
        if (infoItems.length >= 3) {
            const fecha = funcionario.fechaAfiliacion?.toDate().toLocaleDateString('es-CL') || 'N/A';
            infoItems[0].textContent = fecha;
            infoItems[1].textContent = funcionario.centroSalud || 'N/A';
            infoItems[2].textContent = funcionario.cargasFamiliares?.length || '0';
        }
        
        const estadoBadge = document.querySelector('.info-item .badge.success');
        if (estadoBadge) {
            estadoBadge.textContent = funcionario.estado || '';
        }
    } catch (error) {
        console.error('Error al cargar perfil:', error);
    }
}

// Manejo de tabs (el resto del archivo se mantiene)
document.addEventListener('DOMContentLoaded', function() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            navTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            this.classList.add('active');

            const tabId = this.getAttribute('data-tab');
            const targetContent = document.getElementById(`tab-${tabId}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            window.scrollTo({
                top: document.querySelector('.dashboard-content')?.offsetTop - 100 || 0,
                behavior: 'smooth'
            });
        });
    });
});

// Función de logout
window.logout = async function() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        await cerrarSesion();
    }
}

// Función para nueva solicitud
window.nuevaSolicitud = function() {
    alert('Función de nueva solicitud en desarrollo.\nPróximamente podrás crear solicitudes desde aquí.');
}

// Funciones auxiliares
window.verDetalleSolicitud = function(solicitudId) {
    alert(`Ver detalle de solicitud: ${solicitudId}`);
}

// Animación de entrada para las estadísticas
function animateStats() {
    const statCards = document.querySelectorAll('.stat-card');
    
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

window.addEventListener('load', animateStats);
