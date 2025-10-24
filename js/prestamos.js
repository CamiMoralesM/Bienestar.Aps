// Gestor de descarga DIRECTO - Sin validaciones, solo descarga
class FormulariosDownloadManager {
    constructor() {
        // Detectar entorno
        const isGitHubPages = window.location.hostname.includes('github.io');
        
        // Configurar rutas según entorno
        let basePath = '';
        if (isGitHubPages) {
            basePath = '/Bienestar-Aps/';
        } else {
            basePath = './';
        }
        
        // Configuración de formularios
        this.formularios = {
            'medico': {
                url: basePath + 'assets/formulario/formulario-prestamos.pdf',
                nombre: 'Formulario_Prestamo_Medico.pdf',
                titulo: 'Préstamos Médicos'
            },
            'emergencia': {
                url: basePath + 'assets/formulario/formulario-prestamos.pdf',
                nombre: 'Formulario_Prestamo_Emergencia.pdf',
                titulo: 'Préstamos de Emergencia'
            },
            'libre-disposicion': {
                url: basePath + 'assets/formularios/formulario-prestamos-libre-disposicion.pdf',
                nombre: 'Formulario_Prestamo_Libre_Disposicion.pdf',
                titulo: 'Préstamos de Libre Disposición'
            },
            'fondo-solidario': {
                url: basePath + 'assets/formulario/formulario-prestamos.pdf',
                nombre: 'Formulario_Fondo_Solidario.pdf',
                titulo: 'Fondo Solidario'
            }
        };
        
        console.log('🚀 Descargador directo inicializado');
        console.log('🌐 Entorno:', isGitHubPages ? 'GitHub Pages' : 'Local');
        console.log('📁 Base path:', basePath);
        
        this.initializeEventListeners();
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

    descargarFormulario(tipo) {
        const formulario = this.formularios[tipo];
        
        if (!formulario) {
            this.mostrarMensaje('Error: Tipo de formulario no encontrado', 'error');
            return;
        }

        console.log(`🎯 Descarga directa: ${formulario.titulo}`);
        console.log(`📄 URL: ${formulario.url}`);
        
        // Mostrar mensaje de inicio
        this.mostrarMensaje(`Descargando ${formulario.titulo}...`, 'info');
        
        // DESCARGA DIRECTA - Múltiples métodos
        this.descargarArchivoDirecto(formulario.url, formulario.nombre, formulario.titulo);
    }

    descargarArchivoDirecto(url, nombreArchivo, titulo) {
        // Método 1: Enlace de descarga tradicional
        try {
            const link = document.createElement('a');
            link.href = url;
            link.download = nombreArchivo;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ Método 1 ejecutado: Enlace de descarga');
            this.mostrarMensaje(`✅ Iniciando descarga de ${titulo}`, 'success');
            
            return; // Si llegamos aquí, el método funcionó
            
        } catch (error) {
            console.log('❌ Método 1 falló:', error);
        }
        
        // Método 2: Abrir en nueva pestaña (fallback)
        try {
            window.open(url, '_blank');
            console.log('✅ Método 2 ejecutado: Nueva pestaña');
            this.mostrarMensaje(`🔗 Abriendo ${titulo} en nueva pestaña`, 'info');
            
        } catch (error) {
            console.log('❌ Método 2 falló:', error);
            this.mostrarMensaje('❌ Error al abrir archivo', 'error');
        }
    }

    // Método alternativo usando fetch y blob (para casos extremos)
    async descargarViaBlob(url, nombreArchivo, titulo) {
        try {
            this.mostrarMensaje(`🔄 Descargando ${titulo} vía blob...`, 'info');
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = nombreArchivo;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Limpiar el blob URL
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
            
            this.mostrarMensaje(`✅ ${titulo} descargado exitosamente`, 'success');
            console.log('✅ Descarga vía blob completada');
            
        } catch (error) {
            console.log('❌ Descarga vía blob falló:', error);
            this.mostrarMensaje(`❌ Error al descargar ${titulo}`, 'error');
        }
    }

    mostrarMensaje(mensaje, tipo = 'info') {
        // Remover mensajes anteriores
        const mensajesAnteriores = document.querySelectorAll('.formulario-mensaje');
        mensajesAnteriores.forEach(msg => msg.remove());
        
        const mensajeDiv = document.createElement('div');
        mensajeDiv.className = `formulario-mensaje mensaje-${tipo}`;
        
        // Estilos
        const estilos = {
            success: 'background: #d4edda; color: #155724; border-left: 4px solid #28a745;',
            error: 'background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545;',
            warning: 'background: #fff3cd; color: #856404; border-left: 4px solid #ffc107;',
            info: 'background: #d1ecf1; color: #0c5460; border-left: 4px solid #17a2b8;'
        };
        
        mensajeDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 9999;
            max-width: 350px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            ${estilos[tipo]}
        `;
        
        mensajeDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${mensaje}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; font-size: 16px; cursor: pointer; 
                               margin-left: 10px; opacity: 0.7; color: inherit;">×</button>
            </div>
        `;
        
        document.body.appendChild(mensajeDiv);
        
        // Auto-remover después de 3 segundos
        setTimeout(() => {
            if (mensajeDiv.parentNode) {
                mensajeDiv.remove();
            }
        }, 3000);
    }

    // Método para testing manual
    probarDescarga(tipo) {
        console.log(`🧪 Test de descarga para: ${tipo}`);
        this.descargarFormulario(tipo);
    }

    // Mostrar configuración actual
    mostrarConfiguracion() {
        console.log('📋 CONFIGURACIÓN ACTUAL:');
        console.table(this.formularios);
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    window.formulariosManager = new FormulariosDownloadManager();
    console.log('✅ Descargador directo listo');
});

// Funciones globales
window.descargarFormulario = function(tipo) {
    if (window.formulariosManager) {
        window.formulariosManager.descargarFormulario(tipo);
    } else {
        console.error('❌ Gestor no inicializado');
    }
};

// Función para probar descargas manualmente
window.probarDescarga = function(tipo) {
    if (window.formulariosManager) {
        window.formulariosManager.probarDescarga(tipo);
    }
};

// Función para ver configuración
window.verConfiguracion = function() {
    if (window.formulariosManager) {
        window.formulariosManager.mostrarConfiguracion();
    }
};
    
    if (urls[tipo]) {
        const link = document.createElement('a');
        link.href = urls[tipo];
        link.download = `Formulario_${tipo}.pdf`;
        link.click();
        console.log('🚀 Descarga de emergencia ejecutada para:', tipo);
    }
};
