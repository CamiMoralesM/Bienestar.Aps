// Script simplificado para conversión de formularios locales
class SimplePDFConverter {
    constructor() {
        this.formularios = {
            'medico': {
                imagen: './images/formulario-prestamos.png',
                nombre: 'Formulario_Prestamo_Medico.pdf',
                titulo: 'Préstamos Médicos'
            },
            'emergencia': {
                imagen: './images/formulario-prestamos.png',
                nombre: 'Formulario_Prestamo_Emergencia.pdf',
                titulo: 'Préstamos de Emergencia'
            },
            'libre-disposicion': {
                imagen: './images/formulario-prestamos-libre-disposicion.png',
                nombre: 'Formulario_Prestamo_Libre_Disposicion.pdf',
                titulo: 'Préstamos de Libre Disposición'
            },
            'fondo-solidario': {
                imagen: './images/formulario-prestamos.png',
                nombre: 'Formulario_Fondo_Solidario.pdf',
                titulo: 'Fondo Solidario'
            }
        };
        
        this.cargarjsPDF();
        this.inicializar();
    }

    async cargarjsPDF() {
        if (window.jsPDF) {
            console.log('✅ jsPDF ya disponible');
            return true;
        }

        try {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            
            return new Promise((resolve) => {
                script.onload = () => {
                    console.log('✅ jsPDF cargado exitosamente');
                    resolve(true);
                };
                script.onerror = () => {
                    console.error('❌ Error cargando jsPDF');
                    resolve(false);
                };
                document.head.appendChild(script);
            });
        } catch (error) {
            console.error('❌ Error:', error);
            return false;
        }
    }

    inicializar() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-download-form')) {
                e.preventDefault();
                const tipo = e.target.getAttribute('data-tipo');
                this.convertir(tipo);
            }
        });
        console.log('🚀 Conversor PDF inicializado');
    }

    async convertir(tipo) {
        const formulario = this.formularios[tipo];
        if (!formulario) {
            this.mensaje('Tipo de formulario no válido', 'error');
            return;
        }

        // Verificar jsPDF
        if (!window.jspdf) {
            this.mensaje('Cargando jsPDF...', 'info');
            await this.cargarjsPDF();
            if (!window.jspdf) {
                this.mensaje('Error cargando jsPDF', 'error');
                return;
            }
        }

        this.mensaje(`Procesando ${formulario.titulo}...`, 'info');

        try {
            await this.imagenAPDF(formulario.imagen, formulario.nombre);
            this.mensaje(`✅ ${formulario.titulo} descargado`, 'success');
        } catch (error) {
            console.error('Error:', error);
            this.crearPDFBasico(formulario);
        }
    }

    async imagenAPDF(rutaImagen, nombrePDF) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    const { jsPDF } = window.jspdf;
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    
                    // Dimensiones A4: 210 x 297 mm
                    const pageWidth = 210;
                    const pageHeight = 297;
                    
                    // Calcular escala manteniendo proporción
                    const imgRatio = img.width / img.height;
                    const pageRatio = pageWidth / pageHeight;
                    
                    let finalWidth, finalHeight, x, y;
                    
                    if (imgRatio > pageRatio) {
                        // Imagen más ancha, ajustar al ancho
                        finalWidth = pageWidth - 20; // margen 10mm cada lado
                        finalHeight = finalWidth / imgRatio;
                        x = 10;
                        y = (pageHeight - finalHeight) / 2;
                    } else {
                        // Imagen más alta, ajustar a la altura
                        finalHeight = pageHeight - 20; // margen 10mm arriba y abajo
                        finalWidth = finalHeight * imgRatio;
                        x = (pageWidth - finalWidth) / 2;
                        y = 10;
                    }
                    
                    pdf.addImage(img, 'PNG', x, y, finalWidth, finalHeight);
                    pdf.save(nombrePDF);
                    
                    console.log(`✅ PDF creado: ${nombrePDF}`);
                    resolve();
                } catch (error) {
                    console.error('Error creando PDF:', error);
                    reject(error);
                }
            };
            
            img.onerror = () => {
                console.error(`❌ No se pudo cargar: ${rutaImagen}`);
                reject(new Error('Imagen no encontrada'));
            };
            
            img.src = rutaImagen;
        });
    }

    crearPDFBasico(formulario) {
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            
            // Contenido básico
            pdf.setFontSize(16);
            pdf.text(`FORMULARIO - ${formulario.titulo.toUpperCase()}`, 20, 30);
            
            pdf.setFontSize(12);
            pdf.text('Servicio Bienestar APS', 20, 50);
            pdf.text('Corporación Municipal de Puente Alto', 20, 60);
            
            // Línea separadora
            pdf.line(20, 70, 190, 70);
            
            // Campos
            const campos = [
                '', 'DATOS PERSONALES',
                'Nombre: ________________________________',
                'RUT: ___________________________________',
                'Teléfono: ______________________________',
                'Email: _________________________________',
                '', 'DATOS DE LA SOLICITUD',
                'Monto: $ _______________________________',
                'Motivo: ________________________________',
                '_______________________________________',
                '_______________________________________',
                '', 'FIRMA',
                'Fecha: ____________  Firma: ____________'
            ];
            
            let y = 80;
            campos.forEach(campo => {
                if (campo === '') {
                    y += 10;
                } else if (campo.includes('DATOS') || campo.includes('FIRMA')) {
                    pdf.setFontSize(14);
                    pdf.text(campo, 20, y);
                    pdf.setFontSize(12);
                    y += 15;
                } else {
                    pdf.text(campo, 20, y);
                    y += 12;
                }
            });
            
            pdf.save(formulario.nombre);
            this.mensaje(`📄 PDF básico generado: ${formulario.titulo}`, 'warning');
            
        } catch (error) {
            console.error('Error creando PDF básico:', error);
            this.mensaje('Error generando PDF', 'error');
        }
    }

    mensaje(texto, tipo) {
        const colores = {
            success: { bg: '#d4edda', color: '#155724', icon: '✅' },
            error: { bg: '#f8d7da', color: '#721c24', icon: '❌' },
            warning: { bg: '#fff3cd', color: '#856404', icon: '⚠️' },
            info: { bg: '#d1ecf1', color: '#0c5460', icon: 'ℹ️' }
        };
        
        const estilo = colores[tipo] || colores.info;
        
        // Remover mensajes anteriores
        document.querySelectorAll('.mensaje-temp').forEach(m => m.remove());
        
        const div = document.createElement('div');
        div.className = 'mensaje-temp';
        div.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            background: ${estilo.bg}; color: ${estilo.color};
            padding: 15px 20px; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-family: system-ui, sans-serif; font-size: 14px;
            max-width: 300px; word-wrap: break-word;
        `;
        
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                ${estilo.icon} ${texto}
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="margin-left: auto; background: none; border: none; 
                               font-size: 16px; cursor: pointer;">×</button>
            </div>
        `;
        
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 4000);
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.conversorPDF = new SimplePDFConverter();
    });
} else {
    window.conversorPDF = new SimplePDFConverter();
}

// Funciones globales
window.descargarFormulario = function(tipo) {
    if (window.conversorPDF) {
        window.conversorPDF.convertir(tipo);
    } else {
        alert('Sistema no inicializado');
    }
};

window.probarConversion = function() {
    console.log('🧪 Probando conversión...');
    if (window.conversorPDF) {
        window.conversorPDF.convertir('medico');
    }
};

window.verificarSistema = function() {
    console.log('🔍 Estado del sistema:');
    console.log('- jsPDF:', !!window.jspdf);
    console.log('- Conversor:', !!window.conversorPDF);
    console.log('- Formularios:', window.conversorPDF?.formularios || 'No disponible');
};
