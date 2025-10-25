// Gestor de descarga de IMÁGENES convertidas a PDF - VERSIÓN ARREGLADA
class FormulariosDownloadManager {
    constructor() {
        // SOLO LAS RUTAS QUE QUIERES - SIN ERRORES
        this.formularios = {
            'medico': {
                archivos: [
                    './assets/formularios/formulario-prestamos.png',
                    'assets/formulario-prestamos.png',
                    'formulario-prestamos.png'
                ],
                nombre: 'Formulario_Prestamo_Medico.pdf',
                titulo: 'Préstamos Médicos'
            },
            'emergencia': {
                archivos: [
                    './assets/formularios/formulario-prestamos.png',
                    'assets/formulario-prestamos.png',
                    'formulario-prestamos.png'
                ],
                nombre: 'Formulario_Prestamo_Emergencia.pdf',
                titulo: 'Préstamos de Emergencia'
            },
            'libre-disposicion': {
                archivos: [
                    './assets/formularios/formulario-prestamos-libre-disposicion.png',
                    'assets/formulario-prestamos-libre-disposicion.png',
                    'formulario-prestamos-libre-disposicion.png'
                ],
                nombre: 'Formulario_Prestamo_Libre_Disposicion.pdf',
                titulo: 'Préstamos de Libre Disposición'
            },
            'fondo-solidario': {
                archivos: [
                    './assets/formularios/formulario-prestamos.png',
                    'assets/formulario-prestamos.png',
                    'formulario-prestamos.png'
                ],
                nombre: 'Formulario_Fondo_Solidario.pdf',
                titulo: 'Fondo Solidario'
            }
        };
        
        console.log('🚀 Sistema de descarga PDF inicializado');
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
            console.log('✅ jsPDF listo');
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
        this.mostrarMensaje(`Preparando PDF: ${formulario.titulo}...`, 'info');
        
        try {
            // Buscar la imagen SILENCIOSAMENTE
            const archivoEncontrado = await this.buscarArchivoSilencioso(formulario.archivos);
            
            if (!archivoEncontrado) {
                this.mostrarMensaje('❌ No se encontró la imagen', 'error');
                return;
            }
            
            console.log(`✅ Imagen encontrada: ${archivoEncontrado}`);
            this.mostrarMensaje(`Convirtiendo a PDF...`, 'info');
            
            await this.convertirImagenAPDF(archivoEncontrado, formulario.nombre);
            this.mostrarMensaje(`✅ PDF descargado: ${formulario.titulo}`, 'success');
            
        } catch (error) {
            console.error('❌ Error en conversión:', error);
            this.mostrarMensaje('Error al crear PDF', 'error');
        }
    }

    // Buscar archivo SIN mostrar errores en consola
    async buscarArchivoSilencioso(rutasPosibles) {
        for (const ruta of rutasPosibles) {
            try {
                const existe = await this.verificarImagenSilenciosa(ruta);
                if (existe) {
                    return ruta;
                }
            } catch (error) {
                // No mostrar errores, solo continuar
                continue;
            }
        }
        return null;
    }

    // Verificar imagen SIN errores en consola
    verificarImagenSilenciosa(ruta) {
        return new Promise((resolve) => {
            const img = new Image();
            
            // NO mostrar errores en consola
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            
            // Timeout corto para no esperar mucho
            setTimeout(() => resolve(false), 1000);
            
            img.src = ruta;
        });
    }

    async convertirImagenAPDF(rutaImagen, nombrePDF) {
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
                    
                    console.log('✅ PDF descargado:', nombrePDF);
                    resolve();
                    
                } catch (error) {
                    console.error('❌ Error creando PDF:', error);
                    reject(error);
                }
            };
            
            img.onerror = () => {
                reject(new Error('Error cargando imagen'));
            };
            
            img.src = rutaImagen;
        });
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
    console.log('✅ Sistema PDF listo');
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
window.testPDF = function() {
    console.log('🧪 Probando descarga PDF...');
    if (window.formulariosManager) {
        window.formulariosManager.descargarFormulario('medico');
    }
};
