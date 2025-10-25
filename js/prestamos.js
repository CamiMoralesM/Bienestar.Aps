class FormulariosDownloadManager {
    constructor() {
        // Mapeo de formularios y sus rutas
        this.formularios = {
            'medico': {
                imagen: 'formulario-prestamos.png',
                nombrePDF: 'Formulario_Prestamo_Medico.pdf',
                titulo: 'Préstamos Médicos'
            },
            'emergencia': {
                imagen: 'formulario-prestamos.png', 
                nombrePDF: 'Formulario_Prestamo_Emergencia.pdf',
                titulo: 'Préstamos de Emergencia'
            },
            'libre-disposicion': {
                imagen: 'formulario-prestamos-libre-disposicion.png',
                nombrePDF: 'Formulario_Prestamo_Libre_Disposicion.pdf',
                titulo: 'Préstamos de Libre Disposición'
            },
            'fondo-solidario': {
                imagen: 'formulario-prestamos.png',
                nombrePDF: 'Formulario_Fondo_Solidario.pdf',
                titulo: 'Fondo Solidario'
            }
        };

        // Cargar jsPDF
        this.loadJsPDF();

        // Inicializar event listeners
        this.initializeEventListeners();
    }

    loadJsPDF() {
        if (window.jspdf) {
            this.jsPDFReady = true;
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.async = true;
        
        script.onload = () => {
            this.jsPDFReady = true;
            console.log('✅ jsPDF cargado exitosamente');
        };
        
        script.onerror = () => {
            console.error('❌ Error al cargar jsPDF');
            this.jsPDFReady = false;
        };

        document.head.appendChild(script);
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

    async descargarFormulario(tipo) {
        const formulario = this.formularios[tipo];
        
        if (!formulario) {
            this.mostrarMensaje('Tipo de formulario no encontrado', 'error');
            return;
        }

        // Verificar que jsPDF esté cargado
        if (!this.jsPDFReady) {
            this.mostrarMensaje('Cargando herramienta PDF...', 'info');
            setTimeout(() => this.descargarFormulario(tipo), 1000);
            return;
        }

        try {
            this.mostrarMensaje(`Preparando formulario: ${formulario.titulo}...`, 'info');

            // Cargar imagen
            const img = await this.cargarImagen(`/assets/formularios/${formulario.imagen}`);
            
            // Crear PDF
            await this.crearPDF(img, formulario.nombrePDF, formulario.titulo);
            
            this.mostrarMensaje('✅ Formulario descargado exitosamente', 'success');

        } catch (error) {
            console.error('Error al procesar formulario:', error);
            this.mostrarMensaje('Error al generar el PDF. Intentando descarga directa...', 'warning');
            
            // Plan B: Descargar imagen directamente
            this.descargarImagenDirecta(`/assets/formularios/${formulario.imagen}`, formulario.nombrePDF);
        }
    }

    cargarImagen(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Error al cargar la imagen'));
            img.src = src;
        });
    }

    async crearPDF(img, nombreArchivo, titulo) {
        try {
            const { jsPDF } = window.jspdf;

            // Calcular dimensiones
            const imgWidth = img.width;
            const imgHeight = img.height;
            
            // Configurar página A4
            const pageWidth = 210;
            const pageHeight = 297;
            
            // Calcular escala para ajustar a A4
            const scale = Math.min(
                pageWidth / imgWidth,
                pageHeight / imgHeight
            ) * 0.95; // 95% del tamaño para márgenes

            const finalWidth = imgWidth * scale;
            const finalHeight = imgHeight * scale;

            // Centrar en la página
            const x = (pageWidth - finalWidth) / 2;
            const y = (pageHeight - finalHeight) / 2;

            // Crear PDF
            const pdf = new jsPDF({
                orientation: finalHeight > finalWidth ? 'portrait' : 'landscape',
                unit: 'mm'
            });

            // Agregar título
            pdf.setFontSize(16);
            pdf.text(titulo, pageWidth/2, 15, { align: 'center' });

            // Agregar imagen
            pdf.addImage(
                img, 
                'PNG', 
                x, 
                y + 20, // Desplazar abajo del título
                finalWidth, 
                finalHeight
            );

            // Agregar pie de página
            pdf.setFontSize(8);
            pdf.text(
                '© Servicio Bienestar APS - Corporación Municipal de Puente Alto', 
                pageWidth/2, 
                pageHeight - 10, 
                { align: 'center' }
            );

            // Guardar PDF
            pdf.save(nombreArchivo);

        } catch (error) {
            throw new Error('Error al crear PDF: ' + error.message);
        }
    }

    descargarImagenDirecta(src, nombreArchivo) {
        const link = document.createElement('a');
        link.href = src;
        link.download = nombreArchivo.replace('.pdf', '.png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
            animation: slideIn 0.3s ease;
            font-family: Arial, sans-serif;
        `;

        div.textContent = mensaje;
        document.body.appendChild(div);

        setTimeout(() => {
            div.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => div.remove(), 300);
        }, 3000);
    }
}

// Estilos para animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.formulariosManager = new FormulariosDownloadManager();
});

// Función global para descargar
window.descargarFormulario = function(tipo) {
    if (window.formulariosManager) {
        window.formulariosManager.descargarFormulario(tipo);
    }
};
