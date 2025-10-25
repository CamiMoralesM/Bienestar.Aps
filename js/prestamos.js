// Gestor de descarga SIN RUTAS - Para evitar problemas con GitHub Pages
class FormulariosDownloadManager {
    constructor() {
        // SIN RUTAS - Solo nombres de archivo
        this.formularios = {
            'medico': {
                archivo: './assets/formularios/formulario-prestamos.png',  // Sin rutas, solo nombre
                nombre: 'Formulario_Prestamo_Medico.pdf',
                titulo: 'Préstamos Médicos'
            },
            'emergencia': {
                archivo: './assets/formularios/formulario-prestamos.png',  // Sin rutas, solo nombre
                nombre: 'Formulario_Prestamo_Emergencia.pdf',
                titulo: 'Préstamos de Emergencia'
            },
            'libre-disposicion': {
                archivo: './assets/formularios/formulario-prestamos-libre-disposicion.png',  // Sin rutas, solo nombre
                nombre: 'Formulario_Prestamo_Libre_Disposicion.pdf',
                titulo: 'Préstamos de Libre Disposición'
            },
            'fondo-solidario': {
                archivo: './assets/formularios/formulario-prestamos.png',  // Sin rutas, solo nombre
                nombre: 'Formulario_Fondo_Solidario.pdf',
                titulo: 'Fondo Solidario'
            }
        };
        
        console.log('🚀 Sistema PDF sin rutas iniciado');
        this.loadJsPDF();
        this.initializeEventListeners();
    }

    // Cargar jsPDF
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
            this.mostrarMensaje('Cargando PDF...', 'warning');
            setTimeout(() => this.descargarFormulario(tipo), 1000);
            return;
        }

        console.log(`🎯 Descargando: ${formulario.titulo}`);
        this.mostrarMensaje(`Creando PDF: ${formulario.titulo}...`, 'info');
        
        try {
            // Crear PDF directamente desde el archivo
            await this.convertirImagenAPDF(formulario.archivo, formulario.nombre);
            this.mostrarMensaje(`✅ PDF descargado: ${formulario.titulo}`, 'success');
            
        } catch (error) {
            console.error('❌ Error en conversión:', error);
            this.mostrarMensaje('Error al crear PDF', 'error');
            
            // Método de respaldo: descargar imagen directamente
            this.descargarImagenDirecta(formulario.archivo, formulario.nombre);
        }
    }

    async convertirImagenAPDF(nombreArchivo, nombrePDF) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    // Crear PDF con jsPDF
                    const { jsPDF } = window.jspdf;
                    
                    // Dimensiones de la imagen
                    const imgWidth = img.width;
                    const imgHeight = img.height;
                    
                    // Página A4: 210 x 297 mm
                    const pageWidth = 210;
                    const pageHeight = 297;
                    
                    // Calcular escala para ajustar
                    const scaleX = pageWidth / imgWidth;
                    const scaleY = pageHeight / imgHeight;
                    const scale = Math.min(scaleX, scaleY);
                    
                    const finalWidth = imgWidth * scale;
                    const finalHeight = imgHeight * scale;
                    
                    // Centrar en la página
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
                    
                    // DESCARGAR COMO PDF
                    pdf.save(nombrePDF);
                    
                    console.log('✅ PDF creado:', nombrePDF);
                    resolve();
                    
                } catch (error) {
                    console.error('❌ Error creando PDF:', error);
                    reject(error);
                }
            };
            
            img.onerror = () => {
                console.error('❌ No se pudo cargar:', nombreArchivo);
                reject(new Error('Error cargando imagen'));
            };
            
            // Cargar imagen SIN ruta, solo nombre de archivo
            img.src = nombreArchivo;
        });
    }

    // Método de respaldo: descargar imagen directamente
    descargarImagenDirecta(nombreArchivo, nombrePDF) {
        const link = document.createElement('a');
        link.href = nombreArchivo;
        link.download = nombrePDF.replace('.pdf', '.png');
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.mostrarMensaje('Imagen descargada como respaldo', 'warning');
    }

    mostrarMensaje(mensaje, tipo) {
        const colores = {
            'success': { bg: '#d4edda', color: '#155724' },
            'error': { bg: '#f8d7da', color: '#721c24' },
            'warning': { bg: '#fff3cd', color: '#856404' },
            'info': { bg: '#d1ecf1', color: '#0c5460' }
        };
        
        const estilo = colores[tipo] || colores['info'];
        
        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            background: ${estilo.bg};
            color: ${estilo.color};
            border-radius: 6px;
            z-index: 9999;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-width: 280px;
        `;
        
        div.innerHTML = `
            ${mensaje}
            <button onclick="this.parentElement.remove()" 
                    style="margin-left:8px; background:none; border:none; cursor:pointer; font-size:14px;">×</button>
        `;
        
        document.body.appendChild(div);
        
        // Auto-remover
        setTimeout(() => {
            if (div.parentElement) {
                div.remove();
            }
        }, 4000);
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    window.formulariosManager = new FormulariosDownloadManager();
    console.log('✅ Sistema sin rutas listo');
});

// Función principal
window.descargarFormulario = function(tipo) {
    if (window.formulariosManager) {
        window.formulariosManager.descargarFormulario(tipo);
    } else {
        console.error('❌ Sistema no iniciado');
    }
};

// Función de prueba
window.testSinRutas = function() {
    console.log('🧪 Probando sin rutas...');
    if (window.formulariosManager) {
        window.formulariosManager.descargarFormulario('medico');
    }
};
