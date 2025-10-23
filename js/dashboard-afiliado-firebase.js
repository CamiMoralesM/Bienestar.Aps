// Dashboard del Afiliado - Versión Corregida Sin Notificaciones

import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    obtenerFuncionario,
    obtenerSolicitudesFuncionario
} from './firestore-operations.js';
import { cerrarSesion } from './auth.js';

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
        
        // Cargar solicitudes
        await cargarSolicitudes(uid);
        
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

// Cargar solicitudes
async function cargarSolicitudes(uid) {
    try {
        const solicitudes = await obtenerSolicitudesFuncionario(uid);
        const container = document.querySelector('.solicitudes-list');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        if (solicitudes.length === 0) {
            container.innerHTML = '<p>No tienes solicitudes registradas.</p>';
            return;
        }
        
        solicitudes.forEach(solicitud => {
            const fecha = solicitud.createdAt?.toDate().toLocaleDateString('es-CL') || 'N/A';
            
            let estadoBadge = '';
            if (solicitud.estado === 'pendiente') {
                estadoBadge = '<span class="badge warning">Pendiente</span>';
            } else if (solicitud.estado === 'en_revision') {
                estadoBadge = '<span class="badge info">En Revisión</span>';
            } else if (solicitud.estado === 'aprobada') {
                estadoBadge = '<span class="badge success">Aprobada</span>';
            } else {
                estadoBadge = '<span class="badge">Rechazada</span>';
            }
            
            const solicitudHTML = `
                <div class="solicitud-item">
                    <div class="solicitud-header">
                        <h3>${solicitud.tipoBeneficio.replace(/_/g, ' ')}</h3>
                        ${estadoBadge}
                    </div>
                    <div class="solicitud-body">
                        <p><strong>Fecha de solicitud:</strong> ${fecha}</p>
                        <p><strong>Monto:</strong> $${solicitud.monto.toLocaleString('es-CL')}</p>
                        <p><strong>Estado:</strong> ${solicitud.estado}</p>
                        ${solicitud.motivoRechazo ? `<p><strong>Motivo:</strong> ${solicitud.motivoRechazo}</p>` : ''}
                    </div>
                    <div class="solicitud-footer">
                        <button class="btn-small" onclick="verDetalleSolicitud('${solicitud.id}')">Ver Detalles</button>
                    </div>
                </div>
            `;
            
            container.innerHTML += solicitudHTML;
        });
        
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
    }
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

// Manejo de tabs
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
