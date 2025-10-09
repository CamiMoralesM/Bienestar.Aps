import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    obtenerFuncionarios,
    obtenerTodasSolicitudes,
    obtenerEstadisticasGenerales,
    aprobarSolicitud,
    rechazarSolicitud,
    actualizarFuncionario,
    obtenerConvenios
} from './firestore-operations.js';
import { cerrarSesion } from './auth.js';

// Verificar autenticación al cargar
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userType = sessionStorage.getItem('userType');
        
        if (userType !== 'administrador') {
            window.location.href = 'login.html';
            return;
        }
        
        // Cargar datos del dashboard
        await cargarDashboardAdmin();
    } else {
        window.location.href = 'login.html';
    }
});

// Cargar dashboard administrativo
async function cargarDashboardAdmin() {
    try {
        // Cargar estadísticas generales
        await cargarEstadisticasGenerales();
        
        // Cargar afiliados
        await cargarAfiliados();
        
        // Cargar solicitudes
        await cargarSolicitudesAdmin();
        
        // Cargar convenios
        await cargarConveniosAdmin();
        
    } catch (error) {
        console.error('Error al cargar dashboard admin:', error);
    }
}

// Cargar estadísticas generales
async function cargarEstadisticasGenerales() {
    try {
        const stats = await obtenerEstadisticasGenerales();
        
        const statCards = document.querySelectorAll('.admin-stat-card');
        if (statCards.length >= 4) {
            statCards[0].querySelector('h3').textContent = stats.totalFuncionarios.toLocaleString('es-CL');
            statCards[1].querySelector('h3').textContent = `$${(stats.totalBeneficios / 1000000).toFixed(1)}M`;
            statCards[2].querySelector('h3').textContent = stats.solicitudesPendientes;
            statCards[3].querySelector('h3').textContent = stats.conveniosActivos;
        }
        
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// Cargar tabla de afiliados
async function cargarAfiliados() {
    try {
        const funcionarios = await obtenerFuncionarios();
        const tbody = document.querySelector('#tab-afiliados tbody');
        
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        funcionarios.forEach(func => {
            const fecha = func.fechaAfiliacion?.toDate().toLocaleDateString('es-CL') || 'N/A';
            
            let estadoBadge = '';
            if (func.estado === 'activo') {
                estadoBadge = '<span class="badge success">Activo</span>';
            } else if (func.estado === 'pendiente') {
                estadoBadge = '<span class="badge warning">Pendiente</span>';
            } else {
                estadoBadge = '<span class="badge">Inactivo</span>';
            }
            
            const row = `
                <tr>
                    <td>${func.rut}</td>
                    <td>${func.nombre}</td>
                    <td>${func.centroSalud}</td>
                    <td>${fecha}</td>
                    <td>${estadoBadge}</td>
                    <td>
                        <button class="btn-icon" title="Ver perfil" onclick="verPerfilFuncionario('${func.id}')">👁️</button>
                        <button class="btn-icon" title="Editar" onclick="editarFuncionario('${func.id}')">✏️</button>
                        <button class="btn-icon danger" title="Desactivar" onclick="desactivarFuncionario('${func.id}')">🚫</button>
                    </td>
                </tr>
            `;
            
            tbody.innerHTML += row;
        });
        
    } catch (error) {
        console.error('Error al cargar afiliados:', error);
    }
}

// Cargar solicitudes para admin
async function cargarSolicitudesAdmin() {
    try {
        const solicitudes = await obtenerTodasSolicitudes();
        const container = document.querySelector('.admin-solicitudes');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        if (solicitudes.length === 0) {
            container.innerHTML = '<p>No hay solicitudes pendientes.</p>';
            return;
        }
        
        solicitudes.forEach(solicitud => {
            const fecha = solicitud.createdAt?.toDate().toLocaleDateString('es-CL') || 'N/A';
            
            let estadoBadge = '';
            let prioridadClass = 'priority-normal';
            
            if (solicitud.estado === 'pendiente') {
                estadoBadge = '<span class="badge warning">Pendiente Evaluación</span>';
            } else if (solicitud.estado === 'en_revision') {
                estadoBadge = '<span class="badge info">En Revisión</span>';
            } else if (solicitud.estado === 'aprobada') {
                estadoBadge = '<span class="badge success">Aprobada</span>';
            }
            
            if (solicitud.prioridad === 'alta') {
                prioridadClass = 'priority-high';
            }
            
            const solicitudHTML = `
                <div class="solicitud-admin-card ${prioridadClass}">
                    <div class="solicitud-admin-header">
                        <div class="solicitud-info">
                            <h3>${solicitud.tipoBeneficio.replace(/_/g, ' ')}</h3>
                            <p class="solicitud-afiliado">👤 ${solicitud.funcionarioNombre} (${solicitud.funcionarioRut})</p>
                        </div>
                        ${estadoBadge}
                    </div>
                    <div class="solicitud-admin-body">
                        <div class="solicitud-details">
                            <p><strong>Monto solicitado:</strong> $${solicitud.monto.toLocaleString('es-CL')}</p>
                            <p><strong>Fecha solicitud:</strong> ${fecha}</p>
                            <p><strong>Prioridad:</strong> <span class="priority-badge ${solicitud.prioridad}">${solicitud.prioridad}</span></p>
                        </div>
                        <div class="solicitud-admin-actions">
                            <button class="btn btn-success" onclick="aprobarSolicitudAdmin('${solicitud.id}')">✓ Aprobar</button>
                            <button class="btn btn-danger" onclick="rechazarSolicitudAdmin('${solicitud.id}')">✗ Rechazar</button>
                            <button class="btn btn-secondary" onclick="verDocumentosSolicitud('${solicitud.id}')">👁️ Ver Documentos</button>
                        </div>
                    </div>
                </div>
            `;
            
            container.innerHTML += solicitudHTML;
        });
        
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
    }
}

// Cargar convenios para admin
async function cargarConveniosAdmin() {
    try {
        const convenios = await obtenerConvenios({ estado: '' }); // Todos los convenios
        const container = document.querySelector('.convenios-admin-list');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        convenios.forEach(convenio => {
            let estadoBadge = '';
            if (convenio.estado === 'activo') {
                estadoBadge = '<span class="badge success">Activo</span>';
            } else if (convenio.estado === 'por_renovar') {
                estadoBadge = '<span class="badge warning">Por Renovar</span>';
            } else {
                estadoBadge = '<span class="badge">Inactivo</span>';
            }
            
            const convenioHTML = `
                <div class="convenio-admin-item">
                    <div class="convenio-admin-header">
                        <div>
                            <h3>${convenio.nombre}</h3>
                            <p>Categoría: ${convenio.categoria}</p>
                        </div>
                        ${estadoBadge}
                    </div>
                    <div class="convenio-admin-body">
                        <p><strong>Descuento:</strong> ${convenio.descuento}</p>
                        <p><strong>Dirección:</strong> ${convenio.direccion}</p>
                        <p><strong>Contacto:</strong> ${convenio.telefono}</p>
                        <p><strong>Uso este mes:</strong> ${convenio.usosMensual || 0} afiliados</p>
                    </div>
                    <div class="convenio-admin-actions">
                        <button class="btn btn-small" onclick="editarConvenio('${convenio.id}')">Editar</button>
                        <button class="btn btn-small" onclick="verEstadisticasConvenio('${convenio.id}')">Ver Estadísticas</button>
                        ${convenio.estado === 'por_renovar' ? 
                            `<button class="btn btn-small btn-primary" onclick="renovarConvenio('${convenio.id}')">Renovar Ahora</button>` :
                            `<button class="btn btn-small btn-warning" onclick="marcarRenovacion('${convenio.id}')">Marcar Renovación</button>`
                        }
                    </div>
                </div>
            `;
            
            container.innerHTML += convenioHTML;
        });
        
    } catch (error) {
        console.error('Error al cargar convenios:', error);
    }
}

// Funciones de administración de solicitudes
window.aprobarSolicitudAdmin = async function(solicitudId) {
    if (!confirm('¿Está seguro de que desea aprobar esta solicitud?')) return;
    
    try {
        const resultado = await aprobarSolicitud(solicitudId);
        
        if (resultado.success) {
            alert('✓ Solicitud aprobada exitosamente');
            await cargarSolicitudesAdmin();
            await cargarEstadisticasGenerales();
        } else {
            alert('Error al aprobar solicitud: ' + resultado.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al procesar la solicitud');
    }
}

window.rechazarSolicitudAdmin = async function(solicitudId) {
    const motivo = prompt('Ingrese el motivo del rechazo:');
    
    if (!motivo) {
        alert('Debe ingresar un motivo para rechazar');
        return;
    }
    
    try {
        const resultado = await rechazarSolicitud(solicitudId, motivo);
        
        if (resultado.success) {
            alert('Solicitud rechazada');
            await cargarSolicitudesAdmin();
        } else {
            alert('Error al rechazar solicitud: ' + resultado.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al procesar la solicitud');
    }
}

// Funciones de administración de funcionarios
window.verPerfilFuncionario = function(funcionarioId) {
    alert(`Ver perfil del funcionario: ${funcionarioId}\n(Función en desarrollo)`);
}

window.editarFuncionario = function(funcionarioId) {
    alert(`Editar funcionario: ${funcionarioId}\n(Función en desarrollo)`);
}

window.desactivarFuncionario = async function(funcionarioId) {
    if (!confirm('¿Está seguro de que desea desactivar este funcionario?')) return;
    
    try {
        const resultado = await actualizarFuncionario(funcionarioId, { estado: 'inactivo' });
        
        if (resultado.success) {
            alert('Funcionario desactivado');
            await cargarAfiliados();
        } else {
            alert('Error al desactivar funcionario');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al procesar la solicitud');
    }
}

// Funciones de convenios
window.editarConvenio = function(convenioId) {
    alert(`Editar convenio: ${convenioId}\n(Función en desarrollo)`);
}

window.verEstadisticasConvenio = function(convenioId) {
    alert(`Ver estadísticas del convenio: ${convenioId}\n(Función en desarrollo)`);
}

window.renovarConvenio = function(convenioId) {
    alert(`Renovar convenio: ${convenioId}\n(Función en desarrollo)`);
}

window.marcarRenovacion = function(convenioId) {
    alert(`Marcar para renovación: ${convenioId}\n(Función en desarrollo)`);
}

window.verDocumentosSolicitud = function(solicitudId) {
    alert(`Ver documentos de solicitud: ${solicitudId}\n(Función en desarrollo)`);
}

// Función de logout
window.logout = async function() {
    if (confirm('¿Está seguro de que desea cerrar sesión?')) {
        await cerrarSesion();
    }
}

// Función para nuevo afiliado
window.nuevoAfiliado = function() {
    alert('Función para crear nuevo afiliado en desarrollo');
}

// Sistema de búsqueda en tiempo real
function initSearch() {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const tableRows = document.querySelectorAll('.admin-table tbody tr');
            
            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
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
    
    // Inicializar búsqueda
    initSearch();
});
