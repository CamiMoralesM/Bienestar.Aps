// Sistema para convertir TUS imágenes de formularios existentes a PDF
class ConvertirImagenesAPDF {
    constructor() {
        // Configuración de TUS formularios existentes
        this.formularios = {
            'medico': {
                imagen: '.assets/images/formulario-prestamos.png', // Tu imagen existente
                nombre: 'Formulario_Prestamo_Medico.pdf',
                titulo: 'Préstamos Médicos'
            },
            'emergencia': {
                imagen: '.assets/images/formulario-prestamos.png', // Tu imagen existente
                nombre: 'Formulario_Prestamo_Emergencia.pdf',
                titulo: 'Préstamos de Emergencia'
            },
            'libre-disposicion': {
                imagen: '.assets/images/formulario-prestamos-libre-disposicion.png', // Tu imagen existente
                nombre: 'Formulario_Prestamo_Libre_Disposicion.pdf',
                titulo: 'Préstamos de Libre Disposición'
            },
            'fondo-solidario': {
                imagen: '.assets/images/formulario-prestamos.png', // Tu imagen existente
                nombre: 'Formulario_Fondo_Solidario.pdf',
                titulo: 'Fondo Solidario'
            }
        };
        
        // Rutas adicionales donde pueden estar TUS imágenes
        this.rutasAlternativas = [
            './',
            './images/',
            './assets/',
            './assets/images/',
            '../images/',
            '../assets/images/'
        ];
        
        this.cargarjsPDF();
        this.inicializar();
    }

    async cargarjsPDF() {
        if (window.jsPDF) {
            console.log('✅ jsPDF ya disponible');
            return true;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        
        return new Promise((resolve) => {
            script.onload = () => {
                console.log('✅ jsPDF cargado');
                resolve(true);
            };
            script.onerror = () => {
                console.error('❌ Error cargando jsPDF');
                resolve(false);
            };
            document.head.appendChild(script);
        });
    }

    inicializar() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-download-form')) {
                e.preventDefault();
                const tipo = e.target.getAttribute('data-tipo');
                this.convertirTuImagen(tipo);
            }
        });
        console.log('🚀 Conversor de TUS imágenes inicializado');
    }

    // Buscar TU imagen en diferentes ubicaciones
    async buscarTuImagen(nombreImagen) {
        // Primero probar la ruta directa
        try {
            const response = await fetch(nombreImagen, { method: 'HEAD' });
            if (response.ok) {
                console.log(`✅ Tu imagen encontrada: ${nombreImagen}`);
                return nombreImagen;
            }
        } catch (e) {
            console.log(`❌ No en ruta directa: ${nombreImagen}`);
        }

        // Probar en rutas alternativas
        for (const ruta of this.rutasAlternativas) {
            const rutaCompleta = ruta + nombreImagen;
            try {
                const response = await fetch(rutaCompleta, { method: 'HEAD' });
                if (response.ok) {
                    console.log(`✅ Tu imagen encontrada en: ${rutaCompleta}`);
                    return rutaCompleta;
                }
            } catch (e) {
                console.log(`❌ No encontrada en: ${rutaCompleta}`);
            }
        }

        return null;
    }

    async convertirTuImagen(tipo) {
        const formulario = this.formularios[tipo];
        if (!formulario) {
            this.mostrarMensaje('Tipo de formulario no válido', 'error');
            return;
        }

        // Verificar jsPDF
        if (!window.jspdf) {
            this.mostrarMensaje('Cargando jsPDF...', 'info');
            await this.cargarjsPDF();
            if (!window.jspdf) {
                this.mostrarMensaje('Error: No se pudo cargar jsPDF', 'error');
                return;
            }
        }

        this.mostrarMensaje(`🔍 Buscando tu imagen: ${formulario.titulo}`, 'info');

        // Buscar TU imagen
        const rutaImagen = await this.buscarTuImagen(formulario.imagen.replace('./', ''));
        
        if (!rutaImagen) {
            this.mostrarMensaje(`❌ No se encontró tu imagen: ${formulario.imagen}`, 'error');
            console.error('❌ Tu imagen no se encontró en ninguna ubicación:', formulario.imagen);
            return;
        }

        this.mostrarMensaje(`⚙️ Convirtiendo tu imagen a PDF...`, 'info');

        try {
            await this.imagenAPDF(rutaImagen, formulario.nombre, formulario.titulo);
            this.mostrarMensaje(`✅ PDF generado: ${formulario.titulo}`, 'success');
        } catch (error) {
            console.error('❌ Error convirtiendo tu imagen:', error);
            this.mostrarMensaje(`❌ Error al convertir: ${formulario.titulo}`, 'error');
        }
    }

    async imagenAPDF(rutaImagen, nombrePDF, titulo) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    console.log(`📐 Procesando tu imagen: ${img.width}x${img.height}px`);
                    
                    const { jsPDF } = window.jspdf;
                    
                    // Dimensiones A4 en mm
                    const pageWidth = 210;
                    const pageHeight = 297;
                    const margin = 10;
                    
                    // Área útil
                    const maxWidth = pageWidth - (margin * 2);
                    const maxHeight = pageHeight - (margin * 2);
                    
                    // Calcular escala manteniendo proporción
                    const imgRatio = img.width / img.height;
                    const pageRatio = maxWidth / maxHeight;
                    
                    let finalWidth, finalHeight, x, y;
                    
                    if (imgRatio > pageRatio) {
                        // Imagen más ancha - ajustar al ancho
                        finalWidth = maxWidth;
                        finalHeight = maxWidth / imgRatio;
                        x = margin;
                        y = margin + (maxHeight - finalHeight) / 2;
                    } else {
                        // Imagen más alta - ajustar a la altura
                        finalHeight = maxHeight;
                        finalWidth = maxHeight * imgRatio;
                        x = margin + (maxWidth - finalWidth) / 2;
                        y = margin;
                    }
                    
                    // Crear PDF
                    const pdf = new jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'a4'
                    });
                    
                    // Agregar tu imagen al PDF
                    pdf.addImage(img, 'PNG', x, y, finalWidth, finalHeight, undefined, 'FAST');
                    
                    // Descargar
                    pdf.save(nombrePDF);
                    
                    console.log(`✅ Tu imagen convertida exitosamente: ${nombrePDF}`);
                    resolve();
                    
                } catch (error) {
                    console.error('❌ Error procesando tu imagen:', error);
                    reject(error);
                }
            };
            
            img.onerror = (error) => {
                console.error(`❌ Error cargando tu imagen: ${rutaImagen}`, error);
                reject(new Error(`No se pudo cargar tu imagen: ${rutaImagen}`));
            };
            
            console.log(`📷 Cargando tu imagen: ${rutaImagen}`);
            img.src = rutaImagen;
        });
    }

    mostrarMensaje(texto, tipo) {
        const colores = {
            success: { bg: '#d4edda', color: '#155724', icon: '✅' },
            error: { bg: '#f8d7da', color: '#721c24', icon: '❌' },
            info: { bg: '#d1ecf1', color: '#0c5460', icon: 'ℹ️' }
        };
        
        const estilo = colores[tipo] || colores.info;
        
        // Remover mensajes anteriores
        document.querySelectorAll('.mensaje-conversion').forEach(m => m.remove());
        
        const div = document.createElement('div');
        div.className = 'mensaje-conversion';
        div.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            background: ${estilo.bg}; color: ${estilo.color};
            padding: 15px 20px; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-family: system-ui, sans-serif; font-size: 14px;
            max-width: 350px; word-wrap: break-word;
        `;
        
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                ${estilo.icon} ${texto}
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="margin-left: auto; background: none; border: none; 
                               font-size: 16px; cursor: pointer; opacity: 0.7;">×</button>
            </div>
        `;
        
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 4000);
    }

    // Función para listar dónde busca las imágenes
    mostrarRutasBusqueda() {
        console.log('🔍 El sistema busca TUS imágenes en estas ubicaciones:');
        Object.entries(this.formularios).forEach(([tipo, config]) => {
            console.log(`\n📄 ${config.titulo}:`);
            console.log(`   Archivo: ${config.imagen.replace('./', '')}`);
            console.log('   Ubicaciones de búsqueda:');
            this.rutasAlternativas.forEach(ruta => {
                console.log(`   - ${ruta}${config.imagen.replace('./', '')}`);
            });
        });
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.convertirImagenes = new ConvertirImagenesAPDF();
    });
} else {
    window.convertirImagenes = new ConvertirImagenesAPDF();
}

// Funciones globales para compatibilidad
window.descargarFormulario = function(tipo) {
    if (window.convertirImagenes) {
        window.convertirImagenes.convertirTuImagen(tipo);
    } else {
        alert('Sistema no inicializado');
    }
};

window.probarConversion = function() {
    console.log('🧪 Probando conversión de TUS imágenes...');
    if (window.convertirImagenes) {
        window.convertirImagenes.convertirTuImagen('medico');
    }
};

window.verificarSistema = function() {
    console.log('🔍 Estado del sistema:');
    console.log('- jsPDF:', !!window.jspdf);
    console.log('- Conversor:', !!window.convertirImagenes);
    
    if (window.convertirImagenes) {
        window.convertirImagenes.mostrarRutasBusqueda();
    }
};

window.mostrarDondeBusca = function() {
    if (window.convertirImagenes) {
        window.convertirImagenes.mostrarRutasBusqueda();
    }
};
