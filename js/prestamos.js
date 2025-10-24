// Gestor de descarga de formularios - CONFIGURADO PARA GITHUB PAGES
class FormulariosDownloadManager {
    constructor() {
        // Detectar si estamos en GitHub Pages o localhost
        const isGitHubPages = window.location.hostname.includes('github.io');
        const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        // Configurar base path según el entorno
        let basePath = './';
        
        if (isGitHubPages) {
            // Para GitHub Pages, usar la ruta completa del repositorio
            // Ajusta 'Bienestar-Aps' por el nombre real de tu repositorio si es diferente
            basePath = '/Bienestar-Aps/';
        }
        
        console.log('🌐 Entorno detectado:', {
            isGitHubPages,
            isLocalHost,
            hostname: window.location.hostname,
            basePath: basePath
        });
        
        // CONFIGURACIÓN ESPECÍFICA PARA TU ESTRUCTURA DE ARCHIVOS
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
        
        this.initializeEventListeners();
        this.debugMode = true;
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
            this.mostrarMensaje('Error: Tipo de formulario no encontrado', 'error');
            console.error('❌ Tipo de formulario no encontrado:', tipo);
            return;
        }

        console.log('🔍 Intentando descargar:', formulario.url);

        try {
            this.mostrarMensaje(`Verificando formulario de ${formulario.titulo}...`, 'info');
            
            // Verificar si el archivo existe
            const response = await fetch(formulario.url, { method: 'HEAD' });
            
            console.log('📡 Respuesta del servidor:', {
                url: formulario.url,
                status: response.status,
                ok: response.ok,
                statusText: response.statusText
            });
            
            if (response.ok) {
                // El archivo existe, proceder con la descarga
                this.iniciarDescarga(formulario.url, formulario.nombre);
                this.mostrarMensaje(`✅ Descargando formulario de ${formulario.titulo}`, 'success');
                console.log('✅ Archivo encontrado y descarga iniciada');
            } else {
                // Archivo no encontrado
                console.error('❌ Archivo no encontrado:', {
                    url: formulario.url,
                    status: response.status
                });
                
                this.mostrarMensaje(
                    `❌ El formulario de ${formulario.titulo} no está disponible (Error ${response.status})`, 
                    'error'
                );
                
                // Intentar con diferentes rutas como fallback
                this.intentarRutasAlternativas(tipo, formulario);
            }
            
        } catch (error) {
            console.error('❌ Error de red:', error);
            this.mostrarMensaje(
                `⚠️ Error de conexión. Intentando descarga directa...`, 
                'warning'
            );
            
            // Intentar descarga directa como último recurso
            this.iniciarDescarga(formulario.url, formulario.nombre);
        }
    }

    async intentarRutasAlternativas(tipo, formularioOriginal) {
        const rutasAlternativas = [
            // Rutas sin el prefijo del repositorio
            `./assets/formulario/formulario-prestamos.pdf`,
            `assets/formulario/formulario-prestamos.pdf`,
            `/assets/formulario/formulario-prestamos.pdf`,
            
            // Para libre disposición
            `./assets/formularios/formulario-prestamos-libre-disposicion.pdf`,
            `assets/formularios/formulario-prestamos-libre-disposicion.pdf`,
            `/assets/formularios/formulario-prestamos-libre-disposicion.pdf`
        ];
        
        console.log('🔄 Probando rutas alternativas...');
        
        for (const ruta of rutasAlternativas) {
            try {
                const response = await fetch(ruta, { method: 'HEAD' });
                if (response.ok) {
                    console.log('✅ Ruta alternativa encontrada:', ruta);
                    this.iniciarDescarga(ruta, formularioOriginal.nombre);
                    this.mostrarMensaje(`✅ Formulario encontrado en ruta alternativa`, 'success');
                    return;
                }
            } catch (error) {
                // Continuar con la siguiente ruta
            }
        }
        
        console.log('❌ No se encontró el archivo en ninguna ruta alternativa');
        this.mostrarMensaje(
            `❌ No se pudo encontrar el archivo. Contacte al administrador.`, 
            'error'
        );
    }

    iniciarDescarga(url, nombreArchivo) {
        try {
            console.log('🚀 Iniciando descarga:', { url, nombreArchivo });

            // Método principal: Crear enlace de descarga
            const link = document.createElement('a');
            link.href = url;
            link.download = nombreArchivo;
            link.style.display = 'none';
            
            // Agregar al DOM
            document.body.appendChild(link);
            
            // Simular click
            link.click();
            
            // Limpiar
            setTimeout(() => {
                if (document.body.contains(link)) {
                    document.body.removeChild(link);
                }
            }, 100);
            
            console.log('✅ Descarga iniciada correctamente');
            
        } catch (error) {
            console.error('❌ Error en descarga:', error);
            
            // Método alternativo: abrir en nueva pestaña
            try {
                window.open(url, '_blank');
                this.mostrarMensaje('Abriendo archivo en nueva pestaña...', 'info');
            } catch (error2) {
                console.error('❌ Error al abrir en nueva pestaña:', error2);
                this.mostrarMensaje('Error al descargar archivo.', 'error');
            }
        }
    }

    async probarRutas() {
        console.log('🔍 DIAGNÓSTICO COMPLETO DE RUTAS');
        console.log('='.repeat(50));
        console.log('🌐 URL actual:', window.location.href);
        console.log('🏠 Hostname:', window.location.hostname);
        console.log('📁 Pathname:', window.location.pathname);
        console.log('='.repeat(50));
        
        for (const [tipo, formulario] of Object.entries(this.formularios)) {
            try {
                console.log(`\n📄 Probando ${tipo}:`);
                console.log(`   URL: ${formulario.url}`);
                
                const response = await fetch(formulario.url, { method: 'HEAD' });
                const status = response.ok ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO';
                console.log(`   Resultado: ${status} (${response.status})`);
                
                if (!response.ok) {
                    console.log(`   Error: ${response.statusText}`);
                }
                
            } catch (error) {
                console.log(`   ❌ ERROR DE RED: ${error.message}`);
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('💡 SUGERENCIAS:');
        console.log('1. Verifica que los archivos estén en el repositorio');
        console.log('2. Asegúrate de que el nombre del repositorio sea correcto');
        console.log('3. Los archivos deben estar en la rama principal (main/master)');
        console.log('4. GitHub Pages puede tardar unos minutos en actualizar');
    }

    mostrarMensaje(mensaje, tipo = 'info') {
        // Remover mensajes anteriores
        const mensajesAnteriores = document.querySelectorAll('.formulario-mensaje');
        mensajesAnteriores.forEach(msg => msg.remove());
        
        const mensajeDiv = document.createElement('div');
        mensajeDiv.className = `alert alert-${tipo} formulario-mensaje`;
        
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
        
        const estilosTipo = {
            success: 'background: #d4edda; color: #155724; border-left: 4px solid #28a745;',
            error: 'background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545;',
            warning: 'background: #fff3cd; color: #856404; border-left: 4px solid #ffc107;',
            info: 'background: #d1ecf1; color: #0c5460; border-left: 4px solid #17a2b8;'
        };
        
        mensajeDiv.style.cssText = estilosBase + estilosTipo[tipo];
        mensajeDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <span style="flex-grow: 1;">${mensaje}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; font-size: 18px; cursor: pointer; 
                               opacity: 0.7; color: inherit; padding: 0; line-height: 1;">×</button>
            </div>
        `;
        
        if (!document.getElementById('toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(mensajeDiv);
        
        setTimeout(() => {
            if (mensajeDiv.parentNode) {
                mensajeDiv.remove();
            }
        }, 5000);
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    window.formulariosManager = new FormulariosDownloadManager();
    console.log('✅ Gestor de formularios inicializado para GitHub Pages');
    
    // Diagnóstico automático
    setTimeout(() => {
        window.formulariosManager.probarRutas();
    }, 1000);
});

// Funciones globales
window.descargarFormulario = function(tipo) {
    if (window.formulariosManager) {
        window.formulariosManager.descargarFormulario(tipo);
    }
};

window.probarRutasFormularios = function() {
    if (window.formulariosManager) {
        window.formulariosManager.probarRutas();
    }
};
