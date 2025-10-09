// Funcionalidades específicas del panel administrativo

document.addEventListener('DOMContentLoaded', function() {
    console.log('Panel administrativo cargado');
    
    // Inicializar funcionalidades
    initFilters();
    initSearch();
    initModals();
});

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

// Filtros dinámicos
function initFilters() {
    const filterSelects = document.querySelectorAll('.filter-select');
    filterSelects.forEach(select => {
        select.addEventListener('change', function() {
            // Aquí iría la lógica de filtrado
            console.log('Filtro aplicado:', this.value);
        });
    });
}

// Modales para acciones
function initModals() {
    // Se implementarían modales para ver detalles, editar, etc.
}

// Función para nuevo afiliado
function nuevoAfiliado() {
    alert('Modal para crear nuevo afiliado (en desarrollo)');
}

// Aprobar solicitud
function aprobarSolicitud(id) {
    if (confirm('¿Confirma que desea aprobar esta solicitud?')) {
        // Lógica para aprobar
        alert('Solicitud aprobada exitosamente');
    }
}

// Rechazar solicitud
function rechazarSolicitud(id) {
    const motivo = prompt('Ingrese el motivo del rechazo:');
    if (motivo) {
        // Lógica para rechazar
        alert('Solicitud rechazada');
    }
}

// Exportar a Excel
function exportarExcel() {
    alert('Función de exportación en desarrollo');
}

// Generar reporte
function generarReporte(tipo) {
    alert(`Generando reporte de ${tipo}...`);
}
