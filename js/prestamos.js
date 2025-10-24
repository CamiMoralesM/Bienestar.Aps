// Gestor de descarga de IMÁGENES convertidas a PDF
class FormulariosDownloadManager {
    constructor() {
        // RUTAS DE IMÁGENES PNG que se convertirán a PDF
        this.formularios = {
            'medico': {
                url: 'assets/formulario-prestamos.png',
                nombre: 'Formulario_Prestamo_Medico.pdf',
                titulo: 'Préstamos Médicos'
            },
            'emergencia': {
                url: 'assets/formulario-prestamos.png',
                nombre: 'Formulario_Prestamo_Emergencia.pdf',
                titulo: 'Préstamos de Emergencia'
            },
            'libre-disposicion': {
                url: 'assets/formulario-prestamos-libre-disposicion.png',
                nombre: 'Formulario_Prestamo_Libre_Disposicion.pdf',
                titulo: 'Préstamos de Libre Disposición'
            },
            'fondo-solidario': {
                url: 'assets/formulario-prestamos.png',
                nombre: 'Formulario_Fondo_Solidario.pdf',
                titulo: 'Fondo Solidario'
            }
        };
        
        console.log('🚀 Descargador de imágenes a PDF inicializado');
        this.loadJsPDF();
        this.initializeEventListeners();
    }

    // Cargar jsPDF dinámicamente
    loadJsPDF() {
        if (window.jsPDF) {
            this.jsPDFReady = true;
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
            this.jsPDFReady = true;
            console.log('✅ jsPDF cargado');
        };
        script.onerror = () => {
            console.error('❌ Error cargando jsPDF');
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
            console.error('❌ Tipo no encontrado:', tipo);
            this.mostrarMensaje('Tipo de formulario no encontrado', 'error');
            return;
        }

        if (!this.jsPDFReady) {
            this.mostrarMensaje('Cargando herramientas PDF...', 'warning');
            setTimeout(() => this.descargarFormulario(tipo), 1000);
            return;
        }

        console.log(`🎯 Descargando: ${formulario.titulo}`);
        console.log(`🖼️ Imagen: ${formulario.url}`);
        
        this.mostrarMensaje(`Convirtiendo a PDF: ${formulario.titulo}...`, 'info');
        
        try {
            await this.convertirImagenAPDF(formulario.url, formulario.nombre);
            this.mostrarMensaje(`✅ PDF descargado: ${formulario.titulo}`, 'success');
        } catch (error) {
            console.error('❌ Error en conversión:', error);
            this.mostrarMensaje('Error al convertir a PDF', 'error');
        }
    }

    async convertirImagenAPDF(urlImagen, nombrePDF) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    // Crear instancia de jsPDF
                    const { jsPDF } = window.jspdf;
                    
                    // Calcular dimensiones para que la imagen ocupe toda la página
                    const imgWidth = img.width;
                    const imgHeight = img.height;
                    
                    // Formato A4: 210 x 297 mm
                    const pageWidth = 210;
                    const pageHeight = 297;
                    
                    // Calcular escala para ajustar a la página
                    const scaleX = pageWidth / imgWidth;
                    const scaleY = pageHeight / imgHeight;
                    const scale = Math.min(scaleX, scaleY);
                    
                    const finalWidth = imgWidth * scale;
                    const finalHeight = imgHeight * scale;
                    
                    // Centrar la imagen
                    const x = (pageWidth - finalWidth) / 2;
                    const y = (pageHeight - finalHeight) / 2;
                    
                    // Crear PDF
                    const pdf = new jsPDF({
                        orientation: finalHeight > finalWidth ? 'portrait' : 'landscape',
                        unit: 'mm',
                        format: 'a4'
                    });
                    
                    // Agregar imagen al PDF
                    pdf.addImage(img, 'PNG', x, y, finalWidth, finalHeight);
                    
                    // Descargar
                    pdf.save(nombrePDF);
                    
                    console.log('✅ PDF creado y descargado');
                    resolve();
                    
                } catch (error) {
                    console.error('❌ Error creando PDF:', error);
                    reject(error);
                }
            };
            
            img.onerror = () => {
                console.error('❌ Error cargando imagen:', urlImagen);
                reject(new Error('Error cargando imagen'));
            };
            
            // Cargar imagen
            img.src = urlImagen;
        });
    }

    mostrarMensaje(mensaje, tipo) {
        const colores = {
            'success': { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },
            'error': { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
            'warning': { bg: '#fff3cd', color: '#856404', border: '#ffeaa7' },
            'info': { bg: '#d1ecf1', color: '#0c5460', border: '#bee5eb' }
        };
        
        const estilo = colores[tipo] || colores['info'];
        
        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${estilo.bg};
            color: ${estilo.color};
            border: 1px solid ${estilo.border};
            border-radius: 8px;
            z-index: 9999;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        div.innerHTML = `
            ${mensaje} 
            <button onclick="this.parentElement.remove()" 
                    style="margin-left:10px; background:none; border:none; cursor:pointer; font-size:16px; font-weight:bold;">×</button>
        `;
        
        document.body.appendChild(div);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (div.parentElement) {
                div.remove();
            }
        }, 5000);
    }

    // Método de respaldo para descarga directa de imagen
    descargarImagenDirecta(tipo) {
        const formulario = this.formularios[tipo];
        if (!formulario) return;
        
        const link = document.createElement('a');
        link.href = formulario.url;
        link.download = formulario.nombre.replace('.pdf', '.png');
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.mostrarMensaje('Imagen descargada como respaldo', 'warning');
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    window.formulariosManager = new FormulariosDownloadManager();
    console.log('✅ Sistema de conversión imagen a PDF listo');
});

// Funciones globales para compatibilidad
window.descargarFormulario = function(tipo) {
    if (window.formulariosManager) {
        window.formulariosManager.descargarFormulario(tipo);
    } else {
        console.error('❌ Manager no inicializado');
    }
};

// Método de emergencia - descarga directa de imagen
window.descargarImagenDirecta = function(tipo) {
    if (window.formulariosManager) {
        window.formulariosManager.descargarImagenDirecta(tipo);
    } else {
        // Fallback básico
        const urls = {
            'medico': 'assets/formulario-prestamos.png',
            'emergencia': 'assets/formulario-prestamos.png',
            'libre-disposicion': 'assets/formulario-prestamos-libre-disposicion.png',
            'fondo-solidario': 'assets/formulario-prestamos.png'
        };
        
        if (urls[tipo]) {
            const link = document.createElement('a');
            link.href = urls[tipo];
            link.download = `Formulario_${tipo}.png`;
            link.click();
        }
    }
};

// Función para testing
window.testConversion = function() {
    console.log('🧪 Probando conversión...');
    if (window.formulariosManager) {
        window.formulariosManager.descargarFormulario('medico');
    }
};
