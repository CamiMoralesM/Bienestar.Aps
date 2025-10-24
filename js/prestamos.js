// Gestor de descarga de formularios
class FormulariosDownloadManager {
    constructor() {
        this.formularios = {
            'medico': {
                url: './assets/formularios/formulario-prestamo-medico.pdf',
                nombre: 'Formulario_Prestamo_Medico.pdf',
                titulo: 'Préstamos Médicos'
            },
            'emergencia': {
                url: './assets/formularios/formulario-prestamo-emergencia.pdf',
                nombre: 'Formulario_Prestamo_Emergencia.pdf',
                titulo: 'Préstamos de Emergencia'
            },
            'libre-disposicion': {
                url: './assets/formularios/formulario-prestamo-libre-disposicion.pdf',
                nombre: 'Formulario_Prestamo_Libre_Disposicion.pdf',
                titulo: 'Préstamos de Libre Disposición'
            },
            'fondo-solidario': {
                url: './assets/formularios/formulario-fondo-solidario.pdf',
                nombre: 'Formulario_Fondo_Solidario.pdf',
                titulo: 'Fondo Solidario'
            }
        };
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Agregar event listeners a todos los botones de descarga
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
            this.mostrarMensaje('Error: Tipo de formulario no encontrado', 'error');
            console.error('Tipo de formulario no encontrado:', tipo);
            return;
        }

        try {
            this.mostrarMensaje(`Iniciando descarga de ${formulario.titulo}...`, 'info');
            
            // Verificar si el archivo existe
            const response = await fetch(formulario.url, { method: 'HEAD' });
            
            if (response.ok) {
                // El archivo existe, proceder con la descarga
                this.iniciarDescarga(formulario.url, formulario.nombre);
                this.mostrarMensaje(`Descargando formulario de ${formulario.titulo}`, 'success');
            } else {
                // Archivo no encontrado - crear un formulario genérico como fallback
                console.warn('Formulario no encontrado en:', formulario.url);
                this.crearFormularioGenerico(tipo, formulario.titulo);
            }
            
        } catch (error) {
            console.error('Error al verificar formulario:', error);
            // En caso de error de red, intentar descarga directa
            this.iniciarDescarga(formulario.url, formulario.nombre);
            this.mostrarMensaje(`Intentando descargar formulario de ${formulario.titulo}...`, 'warning');
        }
    }

    iniciarDescarga(url, nombreArchivo) {
        try {
            // Método 1: Crear enlace de descarga
            const link = document.createElement('a');
            link.href = url;
            link.download = nombreArchivo;
            link.target = '_blank'; // Abrir en nueva pestaña como backup
            
            // Agregar al DOM temporalmente
            document.body.appendChild(link);
            
            // Trigger de descarga
            link.click();
            
            // Remover del DOM
            document.body.removeChild(link);
            
        } catch (error) {
            console.error('Error en descarga directa:', error);
            // Método alternativo: abrir en nueva pestaña
            window.open(url, '_blank');
        }
    }

    crearFormularioGenerico(tipo, titulo) {
        // Crear un PDF básico o redirigir a una página de información
        this.mostrarMensaje(
            `El formulario específico de ${titulo} no está disponible. Contacte al administrador para obtenerlo.`, 
            'warning'
        );
        
        // Opción alternativa: crear un documento con instrucciones
        this.generarInstruccionesFormulario(tipo, titulo);
    }

    generarInstruccionesFormulario(tipo, titulo) {
        const instrucciones = this.getInstruccionesFormulario(tipo);
        
        // Crear un blob con las instrucciones
        const contenido = `
FORMULARIO DE SOLICITUD - ${titulo.toUpperCase()}
Servicio de Bienestar APS

${instrucciones}

Para obtener el formulario oficial, contacte:
- Teléfono: [Número de contacto]
- Email: admin@bienestaraps.cl
- Oficina: [Dirección de oficina]

Fecha de generación: ${new Date().toLocaleString()}
        `.trim();

        const blob = new Blob([contenido], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `Instrucciones_${tipo}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        this.mostrarMensaje('Se ha descargado un archivo con instrucciones temporales', 'info');
    }

    getInstruccionesFormulario(tipo) {
        const instrucciones = {
            'medico': `
DOCUMENTOS REQUERIDOS:
- Formulario de solicitud completo y firmado
- Fotocopia de cédula de identidad (ambas caras)
- Últimas 3 liquidaciones de sueldo
- Informes médicos que justifiquen la solicitud
- Cotizaciones de medicamentos o tratamientos

LÍMITES:
- Monto máximo: $500.000
- Plazo máximo: 12 cuotas
- Sujeto a evaluación del Trabajador Social
            `,
            'emergencia': `
DOCUMENTOS REQUERIDOS:
- Formulario de solicitud completo y firmado
- Fotocopia de cédula de identidad (ambas caras)
- Últimas 3 liquidaciones de sueldo
- Documentos que respalden la emergencia

LÍMITES:
- Monto máximo: $500.000
- Cuotas según condiciones contractuales
- Sujeto a evaluación del Trabajador Social
            `,
            'libre-disposicion': `
DOCUMENTOS REQUERIDOS:
- Formulario de solicitud completo y firmado
- Fotocopia de cédula de identidad (ambas caras)
- Últimas 3 liquidaciones de sueldo

LÍMITES:
- Monto máximo: $300.000
- Plazo máximo: 6 cuotas
            `,
            'fondo-solidario': `
DOCUMENTOS REQUERIDOS:
- Formulario de solicitud completo y firmado
- Fotocopia de cédula de identidad (ambas caras)
- Últimas 3 liquidaciones de sueldo
- Documentos que respalden la situación familiar

CARACTERÍSTICAS:
- Ayudas sin retorno
- Para emergencias de salud y situaciones familiares complejas
- Evaluación por Trabajador Social y Comité del Servicio
            `
        };
        
        return instrucciones[tipo] || 'Consulte los requisitos con el administrador.';
    }

    mostrarMensaje(mensaje, tipo = 'info') {
        // Crear elemento de mensaje
        const mensajeDiv = document.createElement('div');
        mensajeDiv.className = `alert alert-${tipo} formulario-mensaje`;
        mensajeDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 9999;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.4;
        `;
        
        // Estilos según tipo
        const estilos = {
            success: 'background: #d4edda; color: #155724; border: 2px solid #c3e6cb;',
            error: 'background: #f8d7da; color: #721c24; border: 2px solid #f5c6cb;',
            warning: 'background: #fff3cd; color: #856404; border: 2px solid #ffeaa7;',
            info: 'background: #d1ecf1; color: #0c5460; border: 2px solid #bee5eb;'
        };
        
        mensajeDiv.style.cssText += estilos[tipo];
        mensajeDiv.textContent = mensaje;
        
        // Agregar botón de cerrar
        const btnCerrar = document.createElement('button');
        btnCerrar.innerHTML = '×';
        btnCerrar.style.cssText = `
            position: absolute;
            top: 5px;
            right: 10px;
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: inherit;
            opacity: 0.7;
        `;
        btnCerrar.onclick = () => mensajeDiv.remove();
        
        mensajeDiv.appendChild(btnCerrar);
        document.body.appendChild(mensajeDiv);
        
        // Remover después de 5 segundos
        setTimeout(() => {
            if (mensajeDiv.parentNode) {
                mensajeDiv.parentNode.removeChild(mensajeDiv);
            }
        }, 5000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.formulariosManager = new FormulariosDownloadManager();
    console.log('Gestor de formularios inicializado correctamente');
});

// Función global para compatibilidad
window.descargarFormulario = function(tipo) {
    if (window.formulariosManager) {
        window.formulariosManager.descargarFormulario(tipo);
    } else {
        console.error('Gestor de formularios no inicializado');
        alert('Error: Sistema de formularios no disponible. Recargue la página.');
    }
};

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormulariosDownloadManager;
}
