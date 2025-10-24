// Gestor de descarga SIMPLE - Rutas correctas
class FormulariosDownloadManager {
    constructor() {
        // RUTAS SIMPLES Y CORRECTAS
        this.formularios = {
            'medico': {
                url: 'assets/formulario/formulario-prestamos.pdf',
                nombre: 'Formulario_Prestamo_Medico.pdf',
                titulo: 'Préstamos Médicos'
            },
            'emergencia': {
                url: 'assets/formulario/formulario-prestamos.pdf',
                nombre: 'Formulario_Prestamo_Emergencia.pdf',
                titulo: 'Préstamos de Emergencia'
            },
            'libre-disposicion': {
                url: 'assets/formularios/formulario-prestamos-libre-disposicion.pdf',
                nombre: 'Formulario_Prestamo_Libre_Disposicion.pdf',
                titulo: 'Préstamos de Libre Disposición'
            },
            'fondo-solidario': {
                url: 'assets/formulario/formulario-prestamos.pdf',
                nombre: 'Formulario_Fondo_Solidario.pdf',
                titulo: 'Fondo Solidario'
            }
        };
        
        console.log('🚀 Descargador simple inicializado');
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-download-form')) {
                e.preventDefault();
                const tipo = e.target.getAttribute('data-tipo');
                this.descargarFormulario(tipo);
            }
        });
    }

    descargarFormulario(tipo) {
        const formulario = this.formularios[tipo];
        
        if (!formulario) {
            console.error('❌ Tipo no encontrado:', tipo);
            return;
        }

        console.log(`🎯 Descargando: ${formulario.titulo}`);
        console.log(`📄 Archivo: ${formulario.url}`);
        
        // DESCARGA DIRECTA SIN COMPLICACIONES
        this.descargar(formulario.url, formulario.nombre);
        this.mostrarMensaje(`Descargando ${formulario.titulo}...`, 'success');
    }

    descargar(url, nombre) {
        const link = document.createElement('a');
        link.href = url;
        link.download = nombre;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ Descarga ejecutada');
    }

    mostrarMensaje(mensaje, tipo) {
        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px;
            background: #d4edda;
            color: #155724;
            border-radius: 5px;
            z-index: 9999;
            font-family: Arial, sans-serif;
        `;
        div.innerHTML = `${mensaje} <button onclick="this.parentElement.remove()" style="margin-left:10px; background:none; border:none; cursor:pointer;">×</button>`;
        
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    window.formulariosManager = new FormulariosDownloadManager();
    console.log('✅ Listo para descargar');
});

// Función global
window.descargarFormulario = function(tipo) {
    if (window.formulariosManager) {
        window.formulariosManager.descargarFormulario(tipo);
    }
};

// MÉTODO DE EMERGENCIA CORREGIDO
window.descargarDirecto = function(tipo) {
    const urls = {
        'medico': 'assets/formulario/formulario-prestamos.pdf',
        'emergencia': 'assets/formulario/formulario-prestamos.pdf',
        'libre-disposicion': 'assets/formularios/formulario-prestamos-libre-disposicion.pdf',
        'fondo-solidario': 'assets/formulario/formulario-prestamos.pdf'
    };
    
    if (urls[tipo]) {
        const link = document.createElement('a');
        link.href = urls[tipo];
        link.download = `Formulario_${tipo}.pdf`;
        link.click();
        console.log('🚀 Descarga directa:', tipo);
    }
};
