class FormulariosDownloadManager {
    constructor() {
        // Rutas absolutas usando GitHub
        const repoBase = 'https://github.com/CamiMoralesM/Bienestar.Aps/raw/main';
        
        this.formularios = {
            'medico': {
                imagen: `${repoBase}/assets/formularios/formulario-prestamos.png`,
                nombrePDF: 'Formulario_Prestamo_Medico.pdf',
                titulo: 'Préstamos Médicos'
            },
            'emergencia': {
                imagen: `${repoBase}/assets/formularios/formulario-prestamos.png`,
                nombrePDF: 'Formulario_Prestamo_Emergencia.pdf',
                titulo: 'Préstamos de Emergencia'
            },
            'libre-disposicion': {
                imagen: `${repoBase}/assets/formularios/formulario-prestamos-libre-disposicion.png`,
                nombrePDF: 'Formulario_Prestamo_Libre_Disposicion.pdf',
                titulo: 'Préstamos de Libre Disposición'
            },
            'fondo-solidario': {
                imagen: `${repoBase}/assets/formularios/formulario-prestamos.png`,
                nombrePDF: 'Formulario_Fondo_Solidario.pdf',
                titulo: 'Fondo Solidario'
            }
        };

        // Inicializar event listeners
        this.initializeEventListeners();
        console.log('🚀 Gestor de formularios iniciado');
    }

    initializeEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-download-form')) {
                e.preventDefault();
                const tipo = e.target.getAttribute('data-tipo');
                console.log('🖱️ Clic detectado en botón:', tipo);
                this.descargarFormulario(tipo);
            }
        });
    }

    async descargarFormulario(tipo) {
        console.log('📥 Iniciando descarga de formulario:', tipo);
        
        const formulario = this.formularios[tipo];
        if (!formulario) {
            console.error('❌ Tipo de formulario no válido:', tipo);
            this.mostrarMensaje('Tipo de formulario no encontrado', 'error');
            return;
        }

        try {
            this.mostrarMensaje(`Descargando formulario: ${formulario.titulo}...`, 'info');
            
            // Descargar directamente la imagen
            const link = document.createElement('a');
            link.href = formulario.imagen;
            link.target = '_blank'; // Abrir en nueva pestaña
            link.download = formulario.nombrePDF.replace('.pdf', '.png');
            
            console.log('🔗 URL de descarga:', link.href);
            
            // Agregar al DOM temporalmente
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.mostrarMensaje('✅ Descarga iniciada', 'success');
            
        } catch (error) {
            console.error('❌ Error en la descarga:', error);
            this.mostrarMensaje('Error al descargar el formulario', 'error');
        }
    }

    mostrarMensaje(mensaje, tipo = 'info') {
        const colores = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };

        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${colores[tipo]};
            color: white;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 9999;
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;

        div.innerHTML = `
            ${mensaje}
            <button onclick="this.parentElement.remove()" 
                    style="margin-left:8px; background:none; border:none; color:white; cursor:pointer;">×</button>
        `;

        document.body.appendChild(div);

        setTimeout(() => {
            if (div.parentElement) {
                div.remove();
            }
        }, 4000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.formulariosManager = new FormulariosDownloadManager();
    console.log('✅ Gestor de formularios listo para usar');
});

// Función global para descargar
window.descargarFormulario = function(tipo) {
    console.log('🎯 Llamada a descargarFormulario:', tipo);
    if (window.formulariosManager) {
        window.formulariosManager.descargarFormulario(tipo);
    } else {
        console.error('❌ Gestor de formularios no inicializado');
    }
};

// Agregar estilos para los botones
const style = document.createElement('style');
style.textContent = `
    .btn-download-form {
        display: inline-flex;
        align-items: center;
        padding: 8px 16px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.3s ease;
    }

    .btn-download-form:hover {
        background: #0056b3;
    }

    .btn-download-form:active {
        background: #004085;
    }

    .btn-download-form:before {
        content: "📄";
        margin-right: 8px;
    }
`;
document.head.appendChild(style);
