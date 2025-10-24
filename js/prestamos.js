// ========================================
// SISTEMA DE PRÉSTAMOS Y DESCARGAS - CORREGIDO
// Manejo completo de formularios PDF y solicitudes
// ========================================

import { db, storage } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    serverTimestamp,
    query,
    where,
    orderBy,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// ========================================
// CONFIGURACIÓN DE FORMULARIOS
// ========================================

// IMPORTANTE: Reemplaza estas rutas con las ubicaciones reales de tus PDFs
const FORMULARIOS_CONFIG = {
    'medico': {
        url: '/assets/formularios/formulario-prestamo-medico.pdf',
        nombre: 'Formulario_Prestamo_Medico.pdf',
        descripcion: 'Préstamos Médicos'
    },
    'emergencia': {
        url: '/assets/formularios/formulario-prestamo-emergencia.pdf',
        nombre: 'Formulario_Prestamo_Emergencia.pdf',
        descripcion: 'Préstamos de Emergencia'
    },
    'libre-disposicion': {
        url: '/assets/formularios/formulario-prestamo-libre-disposicion.pdf',
        nombre: 'Formulario_Prestamo_Libre_Disposicion.pdf',
        descripcion: 'Préstamos de Libre Disposición'
    },
    'fondo-solidario': {
        url: '/assets/formularios/formulario-fondo-solidario.pdf',
        nombre: 'Formulario_Fondo_Solidario.pdf',
        descripcion: 'Fondo Solidario'
    }
};

// Límites de préstamos
const LIMITES_PRESTAMOS = {
    'prestamo-medico': {
        montoMaximo: 500000,
        cuotasMaximas: 12
    },
    'prestamo-emergencia': {
        montoMaximo: 500000,
        cuotasMaximas: null
    },
    'prestamo-libre-disposicion': {
        montoMaximo: 300000,
        cuotasMaximas: 6
    },
    'fondo-solidario': {
        montoMaximo: null,
        cuotasMaximas: null
    }
};

// ========================================
// CLASE PRINCIPAL DE PRÉSTAMOS
// ========================================

class PrestamosHandler {
    constructor() {
        this.inicializarEventListeners();
        this.configurarValidaciones();
    }

    inicializarEventListeners() {
        console.log('🔄 Inicializando sistema de préstamos...');

        // Event listeners para descarga de formularios
        document.querySelectorAll('.btn-download-form').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tipo = e.target.getAttribute('data-tipo');
                this.descargarFormulario(tipo);
            });
        });

        // Event listener para envío de solicitud
        const form = document.getElementById('formSolicitudPrestamo');
        if (form) {
            form.addEventListener('submit', (e) => this.enviarSolicitudPrestamo(e));
        }

        // Event listener para cambio de tipo de solicitud
        const tipoSelect = document.getElementById('tipoSolicitud');
        if (tipoSelect) {
            tipoSelect.addEventListener('change', (e) => this.manejarCambioTipo(e));
        }

        // Event listener para validación de monto según tipo
        const montoInput = document.getElementById('montoSolicitado');
        if (montoInput) {
            montoInput.addEventListener('input', (e) => this.validarMonto(e));
        }

        console.log('✅ Event listeners inicializados');
    }

    configurarValidaciones() {
        // Formateo automático del RUT
        const rutInput = document.getElementById('rutPrestamo');
        if (rutInput) {
            rutInput.addEventListener('input', function(e) {
                e.target.value = formatearRUT(e.target.value);
            });
        }
    }

    // ========================================
    // FUNCIONES DE DESCARGA DE FORMULARIOS
    // ========================================

    async descargarFormulario(tipo) {
        try {
            console.log(`📄 Iniciando descarga de formulario: ${tipo}`);
            
            const config = FORMULARIOS_CONFIG[tipo];
            if (!config) {
                throw new Error(`Tipo de formulario no encontrado: ${tipo}`);
            }

            this.mostrarMensaje(`Descargando formulario de ${config.descripcion}...`, 'info');

            // Método 1: Intentar descarga directa
            const success = await this.descargarArchivo(config.url, config.nombre);
            
            if (success) {
                this.mostrarMensaje(`✅ Formulario de ${config.descripcion} descargado exitosamente`, 'success');
            } else {
                // Método 2: Fallback - abrir en nueva pestaña
                this.abrirFormularioEnNuevaPestana(config.url, tipo);
            }

        } catch (error) {
            console.error('❌ Error al descargar formulario:', error);
            this.mostrarMensaje(`Error al descargar formulario: ${error.message}`, 'error');
            
            // Fallback final: mostrar instrucciones manuales
            this.mostrarInstruccionesDescargaManual(tipo);
        }
    }

    async descargarArchivo(url, nombreArchivo) {
        try {
            // Verificar si el archivo existe
            const response = await fetch(url, { method: 'HEAD' });
            
            if (!response.ok) {
                console.warn(`Archivo no encontrado en: ${url}`);
                return false;
            }

            // Descargar el archivo
            const downloadResponse = await fetch(url);
            if (!downloadResponse.ok) {
                throw new Error(`Error al descargar: ${downloadResponse.status}`);
            }

            const blob = await downloadResponse.blob();
            
            // Crear URL temporal para descarga
            const downloadUrl = window.URL.createObjectURL(blob);
            
            // Crear elemento de descarga
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = nombreArchivo;
            link.style.display = 'none';
            
            // Agregar al DOM, hacer clic y remover
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Limpiar URL temporal
            window.URL.revokeObjectURL(downloadUrl);
            
            return true;

        } catch (error) {
            console.error('Error en descarga directa:', error);
            return false;
        }
    }

    abrirFormularioEnNuevaPestana(url, tipo) {
        try {
            const config = FORMULARIOS_CONFIG[tipo];
            
            // Abrir en nueva pestaña
            const nuevaPestana = window.open(url, '_blank');
            
            if (nuevaPestana) {
                this.mostrarMensaje(
                    `Formulario de ${config.descripcion} abierto en nueva pestaña. Use Ctrl+S para guardarlo.`,
                    'info'
                );
            } else {
                // Si no se puede abrir nueva pestaña (bloqueador de popups)
                this.mostrarDialogoDescargaManual(url, tipo);
            }

        } catch (error) {
            console.error('Error al abrir en nueva pestaña:', error);
            this.mostrarInstruccionesDescargaManual(tipo);
        }
    }

    mostrarDialogoDescargaManual(url, tipo) {
        const config = FORMULARIOS_CONFIG[tipo];
        
        const modal = document.createElement('div');
        modal.className = 'modal-descarga-manual';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 10px;
                max-width: 500px;
                width: 90%;
                text-align: center;
            ">
                <h3 style="color: #2c5aa0; margin-bottom: 20px;">
                    📄 Descargar Formulario
                </h3>
                <p style="margin-bottom: 20px;">
                    Para descargar el formulario de <strong>${config.descripcion}</strong>, 
                    haga clic en el enlace siguiente:
                </p>
                <a href="${url}" target="_blank" download="${config.nombre}" 
                   style="
                       display: inline-block;
                       background: #2c5aa0;
                       color: white;
                       padding: 12px 25px;
                       text-decoration: none;
                       border-radius: 5px;
                       margin: 10px;
                   ">
                    📄 Descargar ${config.descripcion}
                </a>
                <br>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            margin-top: 15px;
                            cursor: pointer;
                        ">
                    Cerrar
                </button>
                <p style="font-size: 0.9em; color: #666; margin-top: 15px;">
                    Si el enlace no funciona, contacte al administrador del sistema.
                </p>
            </div>
        `;

        document.body.appendChild(modal);

        // Cerrar modal al hacer clic fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    mostrarInstruccionesDescargaManual(tipo) {
        const config = FORMULARIOS_CONFIG[tipo];
        
        this.mostrarMensaje(
            `❌ No se pudo descargar automáticamente el formulario de ${config.descripcion}. ` +
            `Por favor, contacte al administrador del sistema para obtener el formulario.`,
            'error'
        );
    }

    // ========================================
    // MANEJO DEL FORMULARIO DE SOLICITUD
    // ========================================

    manejarCambioTipo(event) {
        const tipo = event.target.value;
        const documentosAdicionales = document.getElementById('documentosAdicionales');
        const documentosExtrasInfo = document.getElementById('documentosExtrasInfo');
        const montoInput = document.getElementById('montoSolicitado');
        
        // Limpiar monto al cambiar tipo
        montoInput.value = '';
        
        // Configurar límites de monto según tipo
        const limites = LIMITES_PRESTAMOS[tipo];
        if (limites && limites.montoMaximo) {
            montoInput.max = limites.montoMaximo;
            montoInput.placeholder = `Máximo $${limites.montoMaximo.toLocaleString('es-CL')}`;
        } else {
            montoInput.max = '';
            montoInput.placeholder = 'Monto según necesidad';
        }
        
        // Configurar documentos adicionales
        switch(tipo) {
            case 'prestamo-medico':
                documentosAdicionales.style.display = 'block';
                documentosExtrasInfo.textContent = 'Informes médicos, cotizaciones de medicamentos o tratamientos';
                break;
            case 'prestamo-emergencia':
                documentosAdicionales.style.display = 'block';
                documentosExtrasInfo.textContent = 'Documentos que respalden la emergencia (facturas, informes, etc.)';
                break;
            case 'prestamo-libre-disposicion':
                documentosAdicionales.style.display = 'none';
                break;
            case 'fondo-solidario':
                documentosAdicionales.style.display = 'block';
                documentosExtrasInfo.textContent = 'Documentos que respalden la situación de emergencia familiar';
                break;
            default:
                documentosAdicionales.style.display = 'none';
        }
    }

    validarMonto(event) {
        const monto = parseInt(event.target.value);
        const tipo = document.getElementById('tipoSolicitud').value;
        
        if (tipo && LIMITES_PRESTAMOS[tipo]) {
            const limites = LIMITES_PRESTAMOS[tipo];
            
            if (limites.montoMaximo && monto > limites.montoMaximo) {
                this.mostrarMensaje(
                    `El monto máximo para ${this.obtenerNombreTipo(tipo)} es $${limites.montoMaximo.toLocaleString('es-CL')}`, 
                    'warning'
                );
                event.target.value = limites.montoMaximo;
            }
        }
    }

    obtenerNombreTipo(tipo) {
        const nombres = {
            'prestamo-medico': 'Préstamos Médicos',
            'prestamo-emergencia': 'Préstamos de Emergencia',
            'prestamo-libre-disposicion': 'Préstamos de Libre Disposición',
            'fondo-solidario': 'Fondo Solidario'
        };
        return nombres[tipo] || tipo;
    }

    async enviarSolicitudPrestamo(event) {
        event.preventDefault();
        
        try {
            console.log('📤 Enviando solicitud de préstamo...');
            
            // Mostrar loading
            this.mostrarLoading('Enviando solicitud...');
            
            const formData = new FormData(event.target);
            const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
            
            // Validar que el usuario esté logueado
            if (!userData.rut) {
                throw new Error('Usuario no autenticado');
            }
            
            // Recopilar datos del formulario
            const solicitudData = {
                rut: formData.get('rutPrestamo'),
                nombre: formData.get('nombrePrestamo'),
                email: formData.get('emailPrestamo'),
                telefono: formData.get('telefonoPrestamo'),
                tipoSolicitud: formData.get('tipoSolicitud'),
                montoSolicitado: parseInt(formData.get('montoSolicitado')),
                descripcion: formData.get('descripcionSolicitud'),
                fechaSolicitud: serverTimestamp(),
                estado: 'pendiente',
                usuarioSolicitante: userData.rut
            };
            
            // Validar datos antes de enviar
            this.validarDatosSolicitud(solicitudData);
            
            // Subir archivos
            const archivos = await this.subirArchivos(formData);
            solicitudData.archivos = archivos;
            
            // Guardar en Firestore
            const docRef = await addDoc(collection(db, 'solicitudes-prestamos'), solicitudData);
            
            // Limpiar formulario
            event.target.reset();
            
            // Ocultar loading y mostrar éxito
            this.ocultarLoading();
            this.mostrarMensaje(
                '✅ Solicitud enviada exitosamente. Recibirá una respuesta pronto.', 
                'success'
            );
            
            console.log('✅ Solicitud guardada con ID:', docRef.id);
            
        } catch (error) {
            console.error('❌ Error al enviar solicitud:', error);
            this.ocultarLoading();
            this.mostrarMensaje(
                `Error al enviar la solicitud: ${error.message}`, 
                'error'
            );
        }
    }

    validarDatosSolicitud(datos) {
        // Validar campos requeridos
        if (!datos.rut || !datos.nombre || !datos.email || !datos.telefono) {
            throw new Error('Todos los campos obligatorios deben estar completos');
        }
        
        // Validar monto
        if (!datos.montoSolicitado || datos.montoSolicitado <= 0) {
            throw new Error('El monto solicitado debe ser mayor a 0');
        }
        
        // Validar límites según tipo
        const limites = LIMITES_PRESTAMOS[datos.tipoSolicitud];
        if (limites && limites.montoMaximo && datos.montoSolicitado > limites.montoMaximo) {
            throw new Error(`El monto excede el límite máximo de $${limites.montoMaximo.toLocaleString('es-CL')}`);
        }
    }

    async subirArchivos(formData) {
        const archivos = {};
        const archivosASubir = [
            'formularioCompleto',
            'cedulaIdentidad', 
            'liquidacionesSueldo',
            'documentosExtras'
        ];
        
        for (const campo of archivosASubir) {
            const files = formData.getAll(campo);
            if (files && files.length > 0 && files[0].size > 0) {
                archivos[campo] = [];
                
                for (const file of files) {
                    // Validar archivo
                    this.validarArchivo(file);
                    
                    const timestamp = Date.now();
                    const fileName = `prestamos/${timestamp}_${file.name}`;
                    const storageRef = ref(storage, fileName);
                    
                    const snapshot = await uploadBytes(storageRef, file);
                    const downloadURL = await getDownloadURL(snapshot.ref);
                    
                    archivos[campo].push({
                        nombre: file.name,
                        url: downloadURL,
                        fecha: new Date().toISOString(),
                        tamaño: file.size
                    });
                }
            }
        }
        
        return archivos;
    }

    validarArchivo(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/webp'
        ];

        // Validar tamaño
        if (file.size > maxSize) {
            throw new Error(`El archivo ${file.name} excede el tamaño máximo permitido (10MB)`);
        }
        
        // Validar tipo
        if (!allowedTypes.includes(file.type)) {
            throw new Error(`El archivo ${file.name} no tiene un formato permitido`);
        }
    }

    // ========================================
    // FUNCIONES DE UI
    // ========================================

    mostrarMensaje(mensaje, tipo = 'info') {
        // Remover mensajes anteriores
        const mensajesAnteriores = document.querySelectorAll('.alert-prestamos');
        mensajesAnteriores.forEach(msg => msg.remove());

        // Crear elemento de mensaje
        const mensajeDiv = document.createElement('div');
        mensajeDiv.className = `alert-prestamos alert-${tipo}`;
        mensajeDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 9999;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-weight: 500;
        `;
        
        // Estilos según tipo
        const estilos = {
            success: 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;',
            error: 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;',
            warning: 'background: #fff3cd; color: #856404; border: 1px solid #ffeaa7;',
            info: 'background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;'
        };
        
        mensajeDiv.style.cssText += estilos[tipo];
        mensajeDiv.innerHTML = mensaje;
        
        document.body.appendChild(mensajeDiv);
        
        // Remover después de 5 segundos
        setTimeout(() => {
            if (mensajeDiv.parentNode) {
                mensajeDiv.parentNode.removeChild(mensajeDiv);
            }
        }, 5000);
    }

    mostrarLoading(mensaje = 'Cargando...') {
        // Remover loading anterior si existe
        this.ocultarLoading();

        const loading = document.createElement('div');
        loading.id = 'loading-prestamos';
        loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        loading.innerHTML = `
            <div style="
                background: white; 
                padding: 30px; 
                border-radius: 10px; 
                text-align: center;
                min-width: 200px;
            ">
                <div style="
                    width: 40px; 
                    height: 40px; 
                    border: 4px solid #f3f3f3; 
                    border-top: 4px solid #3498db; 
                    border-radius: 50%; 
                    animation: spin 1s linear infinite; 
                    margin: 0 auto 20px;
                "></div>
                <p style="margin: 0; font-weight: 600; color: #333;">${mensaje}</p>
            </div>
        `;
        
        // Agregar animación CSS si no existe
        if (!document.getElementById('spinner-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-style';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(loading);
    }

    ocultarLoading() {
        const loading = document.getElementById('loading-prestamos');
        if (loading) {
            loading.remove();
        }
    }
}

// ========================================
// FUNCIONES AUXILIARES
// ========================================

function formatearRUT(rut) {
    rut = rut.replace(/[^0-9kK]/g, '');
    if (rut.length <= 1) return rut;
    
    const cuerpo = rut.slice(0, -1);
    const dv = rut.slice(-1);
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${cuerpoFormateado}-${dv}`;
}

// ========================================
// INICIALIZACIÓN
// ========================================

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando sistema de préstamos...');
    window.prestamosHandler = new PrestamosHandler();
    console.log('✅ Sistema de préstamos inicializado');
});

// Exportar para uso en otros módulos
export default PrestamosHandler;
export { FORMULARIOS_CONFIG, LIMITES_PRESTAMOS, formatearRUT };
