// Dashboard del Afiliado con Sistema de Notificaciones de Compras

import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    obtenerFuncionario,
    obtenerSolicitudesFuncionario,
    obtenerBeneficiosFuncionario,
    calcularTotalBeneficios,
    crearSolicitud
} from './firestore-operations.js';
import { cerrarSesion } from './auth.js';
import { inicializarNotificaciones } from './notificaciones-compras.js';

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
        
        // Inicializar notificaciones de compras de gas
        await inicializarNotificaciones(user.uid);
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
        document.querySelector('.user-name').textContent = `👤 ${funcionario.nombre}`;
        document.querySelector('.user-rut').textContent = `RUT: ${funcionario.rut}`;
        document.getElementById('bienvenida-usuario').textContent = funcionario.genero === 'F' ? `¡Bienvenida, ${funcionario.nombre.split(" ")[0]}!` : `¡Bienvenido, ${funcionario.nombre.split(" ")[0]}!`;

        // Cargar estadísticas
        await cargarEstadisticas(uid, funcionario.fechaAfiliacion);
        
        // Cargar beneficios
        await cargarBeneficios(uid);
        
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
        const beneficios = await obtenerBeneficiosFuncionario(uid);
        const solicitudes = await obtenerSolicitudesFuncionario(uid);
        
        const totalBeneficios2025 = await calcularTotalBeneficios(uid, 2025);
        const solicitudesPendientes = solicitudes.filter(s => 
            s.estado === 'pendiente' || s.estado === 'en_revision'
        ).length;

        // Actualizar cards de estadísticas
        document.getElementById('beneficios-recibidos').textContent = `$${totalBeneficios2025.toLocaleString('es-CL')}`;
        document.getElementById('solicitudes-pendientes').textContent = solicitudesPendientes;
        document.getElementById('convenios-disponibles').textContent = "12"; // Si tienes convenios dinámicos, cámbialo aquí

        // Tiempo de afiliación
        if (fechaAfiliacion && fechaAfiliacion.toDate) {
            const fecha = fechaAfiliacion.toDate();
            const hoy = new Date();
            const msPorMes = 1000 * 60 * 60 * 24 * 30.44;
            const meses = Math.floor((hoy - fecha) / msPorMes);
            document.getElementById('tiempo-afiliacion').textContent = meses + (meses === 1 ? " mes" : " meses");
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// Cargar tabla de beneficios
async function cargarBeneficios(uid) {
    try {
        const beneficios = await obtenerBeneficiosFuncionario(uid);
        const tbody = document.querySelector('#tab-beneficios tbody');
        
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        beneficios.forEach(beneficio => {
            const fecha = beneficio.createdAt?.toDate().toLocaleDateString('es-CL') || 'N/A';
            const estadoBadge = beneficio.estado === 'pagado' 
                ? '<span class="badge success">Pagado</span>'
                : '<span class="badge warning">Pendiente</span>';
            
            const row = `
                <tr>
                    <td>${fecha}</td>
                    <td>${beneficio.nombre}</td>
                    <td>$${beneficio.monto.toLocaleString('es-CL')}</td>
                    <td>${estadoBadge}</td>
                    <td><button class="btn-small" onclick="verComprobante('${beneficio.id}')">📄 Ver</button></td>
                </tr>
            `;
            
            tbody.innerHTML += row;
        });
        
        // Calcular total
        const total = beneficios
            .filter(b => b.estado === 'pagado')
            .reduce((sum, b) => sum + b.monto, 0);
        
        const totalElement = document.querySelector('.total-benefits .highlight');
        if (totalElement) {
            totalElement.textContent = `$${total.toLocaleString('es-CL')}`;
        }
        
    } catch (error) {
        console.error('Error al cargar beneficios:', error);
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
        const nombreInput = document.querySelector('#tab-perfil input[type="text"]');
        if (nombreInput) {
            nombreInput.value = funcionario.nombre || '';
            document.querySelectorAll('#tab-perfil input[type="text"]')[1].value = funcionario.rut || '';
            document.querySelector('#tab-perfil input[type="email"]').value = funcionario.email || '';
            document.querySelector('#tab-perfil input[type="tel"]').value = funcionario.telefono || '';
        }
        
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
                top: document.querySelector('.dashboard-content').offsetTop - 100,
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
window.verComprobante = function(beneficioId) {
    alert(`Ver comprobante del beneficio: ${beneficioId}`);
}

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
