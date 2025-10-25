// Gestor de descarga de IMÁGENES convertidas a PDF - VERSIÓN CORREGIDA
class FormulariosDownloadManager {
    constructor() {
        // RUTAS CORREGIDAS - usando rutas relativas simples
        this.formularios = {
            'medico': {
                archivos: [
                    './assets/images/formulario-prestamos.png',
                    'assets/images/formulario-prestamos.png',
                    'formulario-prestamos.png',
                    './formulario-prestamos.png'
                ],
                nombre: 'Formulario_Prestamo_Medico.pdf',
                titulo: 'Préstamos Médicos'
            },
            'emergencia': {
                archivos: [
                    './assets/images/formulario-prestamos.png',
                    'assets/images/formulario-prestamos.png',
                    'formulario-prestamos.png',
                    './formulario-prestamos.png'
                ],
                nombre: 'Formulario_Prestamo_Emergencia.pdf',
                titulo: 'Préstamos de Emergencia'
            },
            'libre-disposicion': {
                archivos: [
                    './assets/images/formulario-prestamos-libre-disposicion.png',
                    'assets/images/formulario-prestamos-libre-disposicion.png',
                    'formulario-prestamos-libre-disposicion.png',
                    './formulario-prestamos-libre-disposicion.png'
                ],
                nombre: 'Formulario_Prestamo_Libre_Disposicion.pdf',
                titulo: 'Préstamos de Libre Disposición'
            },
            'fondo-solidario': {
                archivos: [
                    './assets/images/formulario-prestamos.png',
                    'assets/images/formulario-prestamos.png',
                    'formulario-prestamos.png',
                    './formulario-prestamos.png'
                ],
                nombre: 'Formulario_Fondo_Solidario.pdf',
                titulo: 'Fondo Solidario'
            }
        };
        
        console.log('🚀 Descargador de imágenes a PDF inicializado');
        this.jsPDFReady = false;
        this.loadJsPDF();
        this.initializeEventListeners();
    }

    // Cargar jsPDF dinámicamente
    async loadJsPDF() {
        if (window.jsPDF) {
            this.jsPDFReady = true;
            console.log('✅ jsPDF ya estaba cargado');
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                this.jsPDFReady = true;
                console.log('✅ jsPDF cargado correctamente');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Error cargando jsPDF');
                this.jsPDFReady = false;
                reject(new Error('Error cargando jsPDF'));
            };
            document.head.appendChild(script);
        });
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

    // MÉTODO BUSCARARCHIVO IMPLEMENTADO
    async buscarArchivo(rutas) {
        console.log('🔍 Buscando archivo en rutas:', rutas);
        
        for (const ruta of rutas) {
            try {
                console.log(`🔍 Probando ruta: ${ruta}`);
                
                // Crear una promesa para verificar si la imagen se puede cargar
                const archivoExiste = await this.verificarArchivo(ruta);
                
                if (archivoExiste) {
                    console.log(`✅ Archivo encontrado en: ${ruta}`);
                    return ruta;
                }
            } catch (error) {
                console.log(`❌ No se encontró en: ${ruta}`);
                continue;
            }
        }
        
        console.error('❌ No se encontró el archivo en ninguna ruta');
        return null;
    }

    // Método auxiliar para verificar si un archivo existe
    verificarArchivo(ruta) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                resolve(true);
            };
            
            img.onerror = () => {
                reject(false);
            };
            
            // Timeout de 5 segundos para evitar esperas infinitas
            setTimeout(() => {
                reject(false);
            }, 5000);
            
            img.src = ruta;
        });
    }

    async descargarFormulario(tipo) {
        const formulario = this.formularios[tipo];
        
        if (!formulario) {
            console.error('❌ Tipo no encontrado:', tipo);
            this.mostrarMensaje('Tipo de formulario no encontrado', 'error');
            return;
        }

        // Asegurarse de que jsPDF esté cargado
        if (!this.jsPDFReady) {
            this.mostrarMensaje('Cargando herramientas PDF...', 'warning');
            try {
                await this.loadJsPDF();
            } catch (error) {
                this.mostrarMensaje('Error cargando herramientas PDF', 'error');
                return;
            }
        }

        console.log(`🎯 Descargando: ${formulario.titulo}`);
        this.mostrarMensaje(`Buscando imagen: ${formulario.titulo}...`, 'info');
        
        try {
            // Buscar la imagen en múltiples ubicaciones
            const archivoEncontrado = await this.buscarArchivo(formulario.archivos);
            
            if (!archivoEncontrado) {
                this.mostrarMensaje('❌ No se encontró la imagen del formulario', 'error');
                console.error('❌ Ninguna imagen encontrada en las rutas:', formulario.archivos);
                
                // Ofrecer descarga de respaldo
                this.mostrarMensaje('Intentando descarga alternativa...', 'warning');
                await this.descargarImagenDirecta(tipo);
                return;
            }
            
            console.log(`✅ Imagen encontrada: ${archivoEncontrado}`);
            this.mostrarMensaje(`Convirtiendo a PDF: ${formulario.titulo}...`, 'info');
            
            await this.convertirImagenAPDF(archivoEncontrado, formulario.nombre);
            this.mostrarMensaje(`✅ PDF descargado: ${formulario.titulo}`, 'success');
            
        } catch (error) {
            console.error('❌ Error en conversión:', error);
            this.mostrarMensaje('Error al convertir a PDF', 'error');
            
            // Intentar descarga directa de imagen como respaldo
            this.mostrarMensaje('Intentando descarga de imagen directa...', 'warning');
            await this.descargarImagenDirecta(tipo);
        }
    }

    async convertirImagenAPDF(nombreArchivo, nombrePDF) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    // Verificar que jsPDF esté disponible
                    if (!window.jspdf || !window.jspdf.jsPDF) {
                        throw new Error('jsPDF no está disponible');
                    }
                    
                    // Crear instancia de jsPDF
                    const { jsPDF } = window.jspdf;
                    
                    // Calcular dimensiones para que la imagen ocupe toda la página
                    const imgWidth = img.naturalWidth || img.width;
                    const imgHeight = img.naturalHeight || img.height;
                    
                    console.log(`📐 Dimensiones imagen: ${imgWidth}x${imgHeight}`);
                    
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
                    
                    console.log(`📄 Creando PDF con dimensiones: ${finalWidth}x${finalHeight}`);
                    
                    // Crear PDF
                    const pdf = new jsPDF({
                        orientation: finalHeight > finalWidth ? 'portrait' : 'landscape',
                        unit: 'mm',
                        format: 'a4'
                    });
                    
                    // Agregar imagen al PDF
                    pdf.addImage(img, 'PNG', x, y, finalWidth, finalHeight, undefined, 'FAST');
                    
                    // Descargar
                    pdf.save(nombrePDF);
                    
                    console.log('✅ PDF creado y descargado');
                    resolve();
                    
                } catch (error) {
                    console.error('❌ Error creando PDF:', error);
                    reject(error);
                }
            };
            
            img.onerror = (error) => {
                console.error('❌ Error cargando imagen:', nombreArchivo, error);
                reject(new Error(`Error cargando imagen: ${nombreArchivo}`));
            };
            
            // Configurar CORS si es necesario
            img.crossOrigin = 'anonymous';
            
            // Cargar imagen
            console.log(`🖼️ Cargando imagen: ${nombreArchivo}`);
            img.src = nombreArchivo;
        });
    }

    mostrarMensaje(mensaje, tipo) {
        // Remover mensajes anteriores
        const mensajesAnteriores = document.querySelectorAll('.mensaje-temporal');
        mensajesAnteriores.forEach(msg => msg.remove());
        
        const colores = {
            'success': { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },
            'error': { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
            'warning': { bg: '#fff3cd', color: '#856404', border: '#ffeaa7' },
            'info': { bg: '#d1ecf1', color: '#0c5460', border: '#bee5eb' }
        };
        
        const estilo = colores[tipo] || colores['info'];
        
        const div = document.createElement('div');
        div.className = 'mensaje-temporal';
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
            animation: slideIn 0.3s ease-out;
        `;
        
        // Agregar animación CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        div.innerHTML = `
            ${mensaje} 
            <button onclick="this.parentElement.remove()" 
                    style="margin-left:10px; background:none; border:none; cursor:pointer; font-size:16px; font-weight:bold; color:${estilo.color};">×</button>
        `;
        
        document.body.appendChild(div);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (div.parentElement) {
                div.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => div.remove(), 300);
            }
        }, 5000);
        
        // Agregar animación de salida
        if (!document.getElementById('slideOut-animation')) {
            const slideOutStyle = document.createElement('style');
            slideOutStyle.id = 'slideOut-animation';
            slideOutStyle.textContent = `
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(slideOutStyle);
        }
    }

    // Método de respaldo para descarga directa de imagen
    async descargarImagenDirecta(tipo) {
        const formulario = this.formularios[tipo];
        if (!formulario) {
            console.error('❌ Formulario no encontrado para tipo:', tipo);
            return;
        }
        
        // Buscar la imagen en múltiples ubicaciones
        const archivoEncontrado = await this.buscarArchivo(formulario.archivos);
        
        if (!archivoEncontrado) {
            this.mostrarMensaje('❌ No se encontró la imagen para descarga directa', 'error');
            console.error('❌ No se pudo encontrar archivo para descarga directa');
            return;
        }
        
        try {
            // Crear enlace de descarga
            const link = document.createElement('a');
            link.href = archivoEncontrado;
            link.download = formulario.nombre.replace('.pdf', '.png');
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.mostrarMensaje('✅ Imagen descargada como respaldo', 'warning');
            console.log('✅ Descarga directa de imagen completada');
            
        } catch (error) {
            console.error('❌ Error en descarga directa:', error);
            this.mostrarMensaje('❌ Error en descarga directa', 'error');
        }
    }

    // Método para testing y diagnóstico
    async diagnosticar() {
        console.log('🔍 Iniciando diagnóstico...');
        
        // Verificar jsPDF
        console.log('📋 Estado jsPDF:', this.jsPDFReady);
        if (window.jspdf) {
            console.log('✅ jsPDF disponible en window.jspdf');
        } else {
            console.log('❌ jsPDF NO disponible');
        }
        
        // Verificar rutas de archivos
        for (const [tipo, config] of Object.entries(this.formularios)) {
            console.log(`🔍 Verificando archivos para tipo: ${tipo}`);
            for (const ruta of config.archivos) {
                try {
                    const existe = await this.verificarArchivo(ruta);
                    console.log(`  ${existe ? '✅' : '❌'} ${ruta}`);
                } catch (error) {
                    console.log(`  ❌ ${ruta} - Error: ${error}`);
                }
            }
        }
    }
}

// Inicialización mejorada
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.formulariosManager = new FormulariosDownloadManager();
        console.log('✅ Sistema de conversión imagen a PDF listo');
        
        // Diagnóstico opcional (puedes comentar esta línea en producción)
        // await window.formulariosManager.diagnosticar();
        
    } catch (error) {
        console.error('❌ Error inicializando FormulariosDownloadManager:', error);
    }
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
        console.error('❌ Manager no inicializado para descarga directa');
        
        // Fallback básico
        const archivos = {
            'medico': 'formulario-prestamos.png',
            'emergencia': 'formulario-prestamos.png',
            'libre-disposicion': 'formulario-prestamos-libre-disposicion.png',
            'fondo-solidario': 'formulario-prestamos.png'
        };
        
        if (archivos[tipo]) {
            const link = document.createElement('a');
            link.href = archivos[tipo];
            link.download = `Formulario_${tipo}.png`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
};

// Función para testing y diagnóstico
window.testConversion = function() {
    console.log('🧪 Probando conversión...');
    if (window.formulariosManager) {
        window.formulariosManager.descargarFormulario('medico');
    } else {
        console.error('❌ Manager no disponible para test');
    }
};

// Función de diagnóstico
window.diagnosticarFormularios = async function() {
    if (window.formulariosManager) {
        await window.formulariosManager.diagnosticar();
    } else {
        console.error('❌ Manager no disponible para diagnóstico');
    }
};

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormulariosDownloadManager;
}
