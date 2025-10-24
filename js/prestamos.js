// Gestor de descarga de formularios - CONFIGURADO PARA TU ESTRUCTURA
class FormulariosDownloadManager {
    constructor() {
        // CONFIGURACIÓN ESPECÍFICA PARA TU ESTRUCTURA DE ARCHIVOS
        this.formularios = {
            'medico': {
                url: './assets/formulario/formulario-prestamos.pdf', // El que está en la carpeta "formulario"
                nombre: 'Formulario_Prestamo_Medico.pdf',
                titulo: 'Préstamos Médicos'
            },
            'emergencia': {
                url: './assets/formulario/formulario-prestamos.pdf', // Mismo archivo para emergencia
                nombre: 'Formulario_Prestamo_Emergencia.pdf',
                titulo: 'Préstamos de Emergencia'
            },
            'libre-disposicion': {
                url: './assets/formularios/formulario-prestamos-libre-disposicion.pdf',
                nombre: 'Formulario_Prestamo_Libre_Disposicion.pdf',
                titulo: 'Préstamos de Libre Disposición'
            },
            'fondo-solidario': {
                // Si no tienes este archivo específico, usa el general
                url: './assets/formulario/formulario-prestamos.pdf',
                nombre: 'Formulario_Fondo_Solidario.pdf',
                titulo: 'Fondo Solidario'
            }
        };
        
        this.initializeEventListeners();
        this.debugMode = true; // Para ver qué está pasando en la consola
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

        if (this.debugMode) {
            console.log('🔍 Intentando descargar:', formulario.url);
        }

        try {
            this.mostrarMensaje(`Descargando formulario de ${formulario.titulo}...`, 'info');
            
            // Intentar descarga directa (método más compatible)
            this.iniciarDescarga(formulario.url, formulario.nombre);
            
            // Mensaje de éxito después de un momento
            setTimeout(() => {
                this.mostrarMensaje(`✅ Formulario de ${formulario.titulo} descargado`, 'success');
            }, 500);
            
            if (this.debugMode) {
                console.log('✅ Descarga iniciada para:', formulario.titulo);
            }
            
        } catch (error) {
            console.error('❌ Error al descargar formulario:', error);
            this.mostrarMensaje(
                `❌ Error al descargar ${formulario.titulo}. Intente nuevamente.`, 
                'error'
            );
        }
    }

    iniciarDescarga(url, nombreArchivo) {
        try {
            if (this.debugMode) {
                console.log('🚀 Iniciando descarga:', { url, nombreArchivo });
            }

            // Método 1: Crear enlace de descarga
            const link = document.createElement('a');
            link.href = url;
            link.download = nombreArchivo;
            link.style.display = 'none';
            
            // Agregar al DOM
            document.body.appendChild(link);
            
            // Simular click
            link.click();
            
            // Limpiar después de un momento
            setTimeout(() => {
                if (document.body.contains(link)) {
                    document.body.removeChild(link);
                }
            }, 100);
            
            if (this.debugMode) {
                console.log('✅ Link de descarga creado y ejecutado');
            }
            
        } catch (error) {
            console.error('❌ Error en método de descarga principal:', error);
            
            // Método de respaldo: abrir en nueva pestaña
            try {
                window.open(url, '_blank');
                this.mostrarMensaje('Abriendo archivo en nueva pestaña...', 'info');
                
                if (this.debugMode) {
                    console.log('🔄 Usando método de respaldo: nueva pestaña');
                }
            } catch (error2) {
                console.error('❌ Error en método de respaldo:', error2);
                this.mostrarMensaje('Error al abrir archivo. Verifique la ruta.', 'error');
            }
        }
    }

    // Método para probar todas las rutas
    async probarRutas() {
        console.log('🔍 Probando todas las rutas de formularios...');
        
        for (const [tipo, formulario] of Object.entries(this.formularios)) {
            try {
                const response = await fetch(formulario.url, { method: 'HEAD' });
                const status = response.ok ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO';
                console.log(`${tipo}: ${status} (${response.status}) - ${formulario.url}`);
            } catch (error) {
                console.log(`${tipo}: ❌ ERROR DE RED - ${formulario.url}`, error.message);
            }
        }
        
        console.log('\n📝 Si algún archivo muestra "NO ENCONTRADO", verifica:');
        console.log('1. Que el archivo existe en esa ruta');
        console.log('2. Que el nombre del archivo sea exacto (case-sensitive)');
        console.log('3. Que la ruta relativa sea correcta desde tu HTML');
    }

    mostrarMensaje(mensaje, tipo = 'info') {
        // Remover mensajes anteriores
        const mensajesAnteriores = document.querySelectorAll('.formulario-mensaje');
        mensajesAnteriores.forEach(msg => msg.remove());
        
        // Crear elemento de mensaje
        const mensajeDiv = document.createElement('div');
        mensajeDiv.className = `alert alert-${tipo} formulario-mensaje`;
        
        // Estilos base
        const estilosBase = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 9999;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            animation: slideInRight 0.3s ease-out;
        `;
        
        // Estilos por tipo
        const estilosTipo = {
            success: 'background: #d4edda; color: #155724; border-left: 4px solid #28a745;',
            error: 'background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545;',
            warning: 'background: #fff3cd; color: #856404; border-left: 4px solid #ffc107;',
            info: 'background: #d1ecf1; color: #0c5460; border-left: 4px solid #17a2b8;'
        };
        
        mensajeDiv.style.cssText = estilosBase + estilosTipo[tipo];
        
        // Contenido del mensaje con botón de cerrar
        mensajeDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <span style="flex-grow: 1;">${mensaje}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; font-size: 18px; cursor: pointer; 
                               opacity: 0.7; color: inherit; padding: 0; line-height: 1;">×</button>
            </div>
        `;
        
        // Agregar CSS de animación si no existe
        if (!document.getElementById('toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from { 
                        transform: translateX(100%); 
                        opacity: 0; 
                    }
                    to { 
                        transform: translateX(0); 
                        opacity: 1; 
                    }
                }
                @keyframes slideOutRight {
                    from { 
                        transform: translateX(0); 
                        opacity: 1; 
                    }
                    to { 
                        transform: translateX(100%); 
                        opacity: 0; 
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(mensajeDiv);
        
        // Auto-remover después de 4 segundos
        setTimeout(() => {
            if (mensajeDiv.parentNode) {
                mensajeDiv.style.animation = 'slideOutRight 0.3s ease-in forwards';
                setTimeout(() => {
                    if (mensajeDiv.parentNode) {
                        mensajeDiv.remove();
                    }
                }, 300);
            }
        }, 4000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.formulariosManager = new FormulariosDownloadManager();
    console.log('✅ Gestor de formularios inicializado para tu estructura de archivos');
    
    // Probar rutas automáticamente en modo debug
    setTimeout(() => {
        window.formulariosManager.probarRutas();
    }, 1000);
});

// Funciones globales para compatibilidad y debugging
window.descargarFormulario = function(tipo) {
    if (window.formulariosManager) {
        window.formulariosManager.descargarFormulario(tipo);
    } else {
        console.error('❌ Gestor de formularios no inicializado');
        alert('Error: Sistema de formularios no disponible. Recargue la página.');
    }
};

window.probarRutasFormularios = function() {
    if (window.formulariosManager) {
        window.formulariosManager.probarRutas();
    }
};

// Función para debug manual
window.debugFormularios = function() {
    console.log('📋 Configuración actual de formularios:');
    console.table(window.formulariosManager.formularios);
};
