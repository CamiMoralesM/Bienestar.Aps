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
import { cerrarSesion, registrarFuncionario } from './auth.js';

// Variables globales para filtros
let funcionariosData = [];
let filtroEstadoActual = '';
let filtroCentroActual = '';

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

// Cargar tabla de afiliados con filtros
async function cargarAfiliados(filtroEstado = '', filtroCentro = '') {
    try {
        const funcionarios = await obtenerFuncionarios();
        funcionariosData = funcionarios; // Guardar para filtros
        
        // Aplicar filtros
        let funcionariosFiltrados = funcionarios;
        
        if (filtroEstado && filtroEstado !== 'todos') {
            funcionariosFiltrados = funcionariosFiltrados.filter(func => func.estado === filtroEstado);
        }
        
        if (filtroCentro && filtroCentro !== 'todos') {
            funcionariosFiltrados = funcionariosFiltrados.filter(func => func.centroSalud === filtroCentro);
        }
        
        const tbody = document.querySelector('#tab-afiliados tbody');
        
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        funcionariosFiltrados.forEach(func => {
            const fecha = func.fechaAfiliacion?.toDate().toLocaleDateString('es-CL') || 'N/A';
            
            let estadoBadge = '';
            let accionesEspeciales = '';
            
            if (func.estado === 'activo') {
                estadoBadge = '<span class="badge success">Activo</span>';
            } else if (func.estado === 'pendiente') {
                estadoBadge = '<span class="badge warning">Pendiente</span>';
                accionesEspeciales = `<button class="btn-icon success" title="Aprobar Afiliado" onclick="aprobarAfiliado('${func.id}')">✓</button>`;
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
                        ${accionesEspeciales}
                        <button class="btn-icon" title="Ver perfil" onclick="verPerfilFuncionario('${func.id}')">👁️</button>
                        <button class="btn-icon" title="Editar" onclick="editarFuncionario('${func.id}')">✏️</button>
                        <button class="btn-icon danger" title="Desactivar" onclick="desactivarFuncionario('${func.id}')">🚫</button>
                    </td>
                </tr>
            `;
            
            tbody.innerHTML += row;
        });
        
        // Actualizar contador
        actualizarContadorAfiliados(funcionariosFiltrados.length, funcionarios.length);
        
    } catch (error) {
        console.error('Error al cargar afiliados:', error);
    }
}

// Actualizar contador de afiliados
function actualizarContadorAfiliados(mostrados, total) {
    const contador = document.querySelector('.afiliados-counter');
    if (contador) {
        contador.textContent = `Mostrando ${mostrados} de ${total} afiliados`;
    }
}

// Aprobar nuevo afiliado
window.aprobarAfiliado = async function(funcionarioId) {
    if (!confirm('¿Está seguro de que desea aprobar este afiliado?')) return;
    
    try {
        const resultado = await actualizarFuncionario(funcionarioId, { estado: 'activo' });
        
        if (resultado.success) {
            alert('✓ Afiliado aprobado exitosamente');
            await cargarAfiliados(filtroEstadoActual, filtroCentroActual);
            await cargarEstadisticasGenerales();
        } else {
            alert('Error al aprobar afiliado: ' + resultado.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al procesar la solicitud');
    }
}

// Exportar a Excel - VERSIÓN CORREGIDA
window.exportarAfiliados = function() {
    try {
        // Obtener datos filtrados actuales
        let datosExportar = funcionariosData;
        
        if (filtroEstadoActual && filtroEstadoActual !== 'todos') {
            datosExportar = datosExportar.filter(func => func.estado === filtroEstadoActual);
        }
        
        if (filtroCentroActual && filtroCentroActual !== 'todos') {
            datosExportar = datosExportar.filter(func => func.centroSalud === filtroCentroActual);
        }
        
        // Crear archivo Excel usando SheetJS
        const workbook = XLSX.utils.book_new();
        
        // Preparar datos para Excel
        const excelData = datosExportar.map(func => {
            const fecha = func.fechaAfiliacion?.toDate().toLocaleDateString('es-CL') || 'N/A';
            
            return {
                'RUT': func.rut || 'N/A',
                'Nombre': func.nombre || 'N/A',
                'Fecha Afiliación': fecha,
                'Lugar de Trabajo': func.centroSalud || 'N/A',
                'Estado Civil': func.estadoCivil || 'No especificado',
                'Correo Electrónico': func.email || 'N/A',
                'Número de Teléfono': func.telefono || 'N/A',
                'Estado': func.estado || 'N/A',
                'Cargo': func.cargo || 'N/A'
            };
        });
        
        // Crear hoja de cálculo
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        
        // Ajustar ancho de columnas
        const columnWidths = [
            { wch: 15 }, // RUT
            { wch: 30 }, // Nombre
            { wch: 15 }, // Fecha Afiliación
            { wch: 35 }, // Lugar de Trabajo
            { wch: 15 }, // Estado Civil
            { wch: 30 }, // Correo Electrónico
            { wch: 18 }, // Número de Teléfono
            { wch: 12 }, // Estado
            { wch: 20 }  // Cargo
        ];
        
        worksheet['!cols'] = columnWidths;
        
        // Agregar hoja al libro
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Afiliados');
        
        // Generar nombre de archivo con fecha
        const fechaActual = new Date().toISOString().split('T')[0];
        const nombreArchivo = `afiliados_bienestar_aps_${fechaActual}.xlsx`;
        
        // Descargar archivo
        XLSX.writeFile(workbook, nombreArchivo);
        
        alert(`✓ Archivo Excel exportado exitosamente: ${nombreArchivo}\n\nSe exportaron ${excelData.length} registros.`);
        
    } catch (error) {
        console.error('Error al exportar:', error);
        
        // Fallback a CSV si falla Excel
        console.log('Intentando exportar como CSV...');
        exportarCSV();
    }
}

// Función de respaldo para CSV
function exportarCSV() {
    try {
        // Obtener datos filtrados actuales
        let datosExportar = funcionariosData;
        
        if (filtroEstadoActual && filtroEstadoActual !== 'todos') {
            datosExportar = datosExportar.filter(func => func.estado === filtroEstadoActual);
        }
        
        if (filtroCentroActual && filtroCentroActual !== 'todos') {
            datosExportar = datosExportar.filter(func => func.centroSalud === filtroCentroActual);
        }
        
        // Headers sin comillas para CSV
        const headers = [
            'RUT',
            'Nombre',
            'Fecha Afiliación',
            'Lugar de Trabajo',
            'Estado Civil',
            'Correo Electrónico',
            'Número de Teléfono',
            'Estado',
            'Cargo'
        ];
        
        // Crear contenido CSV
        let csvContent = '\uFEFF'; // BOM para UTF-8
        csvContent += headers.join(',') + '\n';
        
        datosExportar.forEach(func => {
            const fecha = func.fechaAfiliacion?.toDate().toLocaleDateString('es-CL') || 'N/A';
            
            const row = [
                escaparCSV(func.rut || 'N/A'),
                escaparCSV(func.nombre || 'N/A'),
                escaparCSV(fecha),
                escaparCSV(func.centroSalud || 'N/A'),
                escaparCSV(func.estadoCivil || 'No especificado'),
                escaparCSV(func.email || 'N/A'),
                escaparCSV(func.telefono || 'N/A'),
                escaparCSV(func.estado || 'N/A'),
                escaparCSV(func.cargo || 'N/A')
            ];
            
            csvContent += row.join(',') + '\n';
        });
        
        // Descargar archivo CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `afiliados_bienestar_aps_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert('✓ Archivo CSV exportado exitosamente (formato de respaldo)');
        
    } catch (error) {
        console.error('Error al exportar CSV:', error);
        alert('Error al exportar archivo. Intente nuevamente.');
    }
}

// Función para escapar valores CSV
function escaparCSV(valor) {
    if (typeof valor !== 'string') {
        valor = String(valor);
    }
    
    // Si contiene coma, comilla o salto de línea, envolver en comillas
    if (valor.includes(',') || valor.includes('"') || valor.includes('\n')) {
        // Escapar comillas duplicándolas
        valor = valor.replace(/"/g, '""');
        return `"${valor}"`;
    }
    
    return valor;
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

// Modal para nuevo afiliado
window.nuevoAfiliado = function() {
    const modal = document.getElementById('modalNuevoAfiliado');
    if (modal) {
        modal.style.display = 'block';
        // Limpiar formulario
        document.getElementById('formNuevoAfiliado').reset();
    }
}

// Cerrar modal
window.cerrarModal = function() {
    const modal = document.getElementById('modalNuevoAfiliado');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Crear nuevo afiliado desde modal
window.crearNuevoAfiliado = async function(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const datos = {
        nombre: formData.get('nombre'),
        rut: formData.get('rut'),
        email: formData.get('email'),
        telefono: formData.get('telefono'),
        centroSalud: formData.get('centroSalud'),
        cargo: formData.get('cargo'),
        estadoCivil: formData.get('estadoCivil'),
        password: formData.get('password')
    };
    
    // Validaciones básicas
    if (!datos.nombre || !datos.rut || !datos.email || !datos.password) {
        alert('Todos los campos marcados con * son obligatorios');
        return;
    }
    
    try {
        const btnCrear = document.querySelector('#formNuevoAfiliado button[type="submit"]');
        btnCrear.textContent = 'Creando...';
        btnCrear.disabled = true;
        
        const resultado = await registrarFuncionario(datos);
        
        if (resultado.success) {
            alert('✓ Afiliado creado exitosamente');
            cerrarModal();
            await cargarAfiliados(filtroEstadoActual, filtroCentroActual);
            await cargarEstadisticasGenerales();
        } else {
            alert('Error al crear afiliado: ' + resultado.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al procesar la solicitud');
    } finally {
        const btnCrear = document.querySelector('#formNuevoAfiliado button[type="submit"]');
        btnCrear.textContent = 'Crear Afiliado';
        btnCrear.disabled = false;
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
            await cargarAfiliados(filtroEstadoActual, filtroCentroActual);
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

// Inicializar filtros
function initFilters() {
    // Filtro de estado
    const estadoSelect = document.querySelector('#filtroEstado');
    if (estadoSelect) {
        estadoSelect.addEventListener('change', async function() {
            filtroEstadoActual = this.value;
            await cargarAfiliados(filtroEstadoActual, filtroCentroActual);
        });
    }
    
    // Filtro de centro
    const centroSelect = document.querySelector('#filtroCentro');
    if (centroSelect) {
        centroSelect.addEventListener('change', async function() {
            filtroCentroActual = this.value;
            await cargarAfiliados(filtroEstadoActual, filtroCentroActual);
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
    
    // Inicializar funcionalidades
    initSearch();
    initFilters();

    // Ejemplo básico de almacenamiento en localStorage (adáptalo a Firebase en producción)
function guardarCompraGas(compra) {
    const fechaHoy = new Date().toISOString().slice(0, 10);
    let compras = JSON.parse(localStorage.getItem('comprasGas_' + fechaHoy)) || [];
    compras.push(compra);
    localStorage.setItem('comprasGas_' + fechaHoy, JSON.stringify(compras));
}

// Al enviar el formulario
document.getElementById('formCompraGas').addEventListener('submit', function(e) {
    e.preventDefault();
    // Obtén todos los datos del formulario
    // ...
    // Llama a guardarCompraGas(compra)
    // ...
    alert('Compra registrada correctamente');
});

// Para exportar Lipigas, Abastible, General, usa la librería XLSX y las funciones que te di antes.
// Ejemplo:
function exportarLipigasExcel() {
    // Filtra las compras de Lipigas y genera el Excel con el formato especial
}
function exportarAbastibleExcel() {
    // Filtra las compras de Abastible y genera el Excel con el formato especial
}
function exportarGeneralExcel() {
    // Junta todas las compras y exporta el respaldo
}
    // Cerrar modal al hacer click fuera
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modalNuevoAfiliado');
        if (event.target === modal) {
            cerrarModal();
        }
    });
});
