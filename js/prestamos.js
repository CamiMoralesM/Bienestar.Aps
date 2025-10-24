// ========================================
// SISTEMA DE PRÉSTAMOS - SOLO DESCARGA DIRECTA
// Sin ventanas nuevas, solo descarga de archivos
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

const FORMULARIOS_CONFIG = {
    'medico': {
        url: '/assets/formulario-prestamo.pdf',
        nombre: 'Formulario_Prestamo_Medico.pdf',
        descripcion: 'Préstamos Médicos'
    },
    'emergencia': {
        url: '/assets/formulario-prestamo.pdf',
        nombre: 'Formulario_Prestamo_Emergencia.pdf',
        descripcion: 'Préstamos de Emergencia'
    },
    'libre-disposicion': {
        url: '/assets/formulario-Prestamo-libre-ddisposicion.pdf',
        nombre: 'Formulario_Prestamo_Libre_Disposicion.pdf',
        descripcion: 'Préstamos de Libre Disposición'
    },
    'fondo-solidario': {
        url: '/assets/formularios/formulario-fondo-solidario.pdf',
        nombre: 'Formulario_Fondo_Solidario.pdf',
        descripcion: 'Fondo Solidario'
    }
};

const LIMITES_PRESTAMOS = {
    'prestamo-medico': { montoMaximo: 500000, cuotasMaximas: 12 },
    'prestamo-emergencia': { montoMaximo: 500000, cuotasMaximas: null },
    'prestamo-libre-disposicion': { montoMaximo: 300000, cuotasMaximas: 6 },
    'fondo-solidario': { montoMaximo: null, cuotasMaximas: null }
};

// ========================================
// CLASE PRINCIPAL
// ========================================

class PrestamosHandler {
    constructor() {
        this.inicializarEventListeners();
        this.configurarValidaciones();
    }

    inicializarEventListeners() {
        console.log('🔄 Inicializando sistema de préstamos (solo descarga)...');

        // Event listeners para descarga de formularios
        document.querySelectorAll('.btn-download-form').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tipo = e.target.getAttribute('data-tipo');
                this.descargarFormularioDirecto(tipo);
            });
        });

        // Resto de event listeners
        const form = document.getElementById('formSolicitudPrestamo');
        if (form) {
            form.addEventListener('submit', (e) => this.enviarSolicitudPrestamo(e));
        }

        const tipoSelect = document.getElementById('tipoSolicitud');
        if (tipoSelect) {
            tipoSelect.addEventListener('change', (e) => this.manejarCambioTipo(e));
        }

        const montoInput = document.getElementById('montoSolicitado');
        if (montoInput) {
            montoInput.addEventListener('input', (e) => this.validarMonto(e));
        }

        console.log('✅ Event listeners inicializados');
    }

    configurarValidaciones() {
        const rutInput = document.getElementById('rutPrestamo');
        if (rutInput) {
            rutInput.addEventListener('input', function(e) {
                e.target.value = formatearRUT(e.target.value);
            });
        }
    }

    // ========================================
    // DESCARGA DIRECTA ÚNICAMENTE
    // ========================================

    async descargarFormularioDirecto(tipo) {
        try {
            console.log(`📄 Descargando formulario: ${tipo}`);
            
            const config = FORMULARIOS_CONFIG[tipo];
            if (!config) {
                this.mostrarMensaje(`❌ Tipo de formulario no encontrado: ${tipo}`, 'error');
                return;
            }

            // Mostrar mensaje de inicio
            this.mostrarMensaje(`⬇️ Descargando ${config.descripcion}...`, 'info');

            // Intentar descarga directa
            const exito = await this.ejecutarDescargaDirecta(config.url, config.nombre);
            
            if (exito) {
                this.mostrarMensaje(`✅ ${config.descripcion} descargado exitosamente`, 'success');
            } else {
                this.mostrarMensaje(`❌ No se pudo descargar ${config.descripcion}. Verifique que el archivo existe.`, 'error');
            }

        } catch (error) {
            console.error('❌ Error en descarga:', error);
            this.mostrarMensaje(`❌ Error al descargar: ${error.message}`, 'error');
        }
    }

    async ejecutarDescargaDirecta(url, nombreArchivo) {
        try {
            console.log(`🔍 Verificando archivo: ${url}`);
            
            // Verificar si el archivo existe (sin mostrar el archivo)
            const checkResponse = await fetch(url, { method: 'HEAD' });
            if (!checkResponse.ok) {
                console.error(`❌ Archivo no encontrado: ${checkResponse.status}`);
                return false;
            }

            console.log(`📥 Descargando archivo...`);
            
            // Descargar el archivo
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`❌ Error al descargar: ${response.status}`);
                return false;
            }

            // Convertir a blob
            const blob = await response.blob();
            console.log(`📊 Archivo descargado: ${(blob.size / 1024).toFixed(2)} KB`);

            // Crear enlace de descarga temporal
            const urlTemporal = window.URL.createObjectURL(blob);
            const enlaceDescarga = document.createElement('a');
            
            // Configurar enlace para descarga forzada
            enlaceDescarga.href = urlTemporal;
            enlaceDescarga.download = nombreArchivo;
            enlaceDescarga.style.display = 'none';
            
            // Agregar al DOM, hacer clic y remover inmediatamente
            document.body.appendChild(enlaceDescarga);
            enlaceDescarga.click();
            document.body.removeChild(enlaceDescarga);
            
            // Limpiar URL temporal después de un momento
            setTimeout(() => {
                window.URL.revokeObjectURL(urlTemporal);
            }, 1000);

            console.log(`✅ Descarga completada: ${nombreArchivo}`);
            return true;

        } catch (error) {
            console.error('❌ Error en ejecutarDescargaDirecta:', error);
            return false;
        }
    }

    // ========================================
    // MANEJO DEL FORMULARIO DE SOLICITUD
    // ========================================

    manejarCambioTipo(event) {
        const tipo = event.target.value;
        const documentosAdicionales = document.getElementById('documentosAdicionales');
        const documentosExtrasInfo = document.getElementById('documentosExtrasInfo');
        const montoInput = document.getElementById('montoSolicitado');
        
        // Limpiar monto
        montoInput.value = '';
        
        // Configurar límites
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
            
            this.mostrarLoading('Enviando solicitud...');
            
            const formData = new FormData(event.target);
            const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
            
            if (!userData.rut) {
                throw new Error('Usuario no autenticado');
            }
            
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
            
            this.validarDatosSolicitud(solicitudData);
            
            const archivos = await this.subirArchivos(formData);
            solicitudData.archivos = archivos;
            
            const docRef = await addDoc(collection(db, 'solicitudes-prestamos'), solicitudData);
            
            event.target.reset();
            
            this.ocultarLoading();
            this.mostrarMensaje('✅ Solicitud enviada exitosamente. Recibirá una respuesta pronto.', 'success');
            
            console.log('✅ Solicitud guardada con ID:', docRef.id);
            
        } catch (error) {
            console.error('❌ Error al enviar solicitud:', error);
            this.ocultarLoading();
            this.mostrarMensaje(`Error al enviar la solicitud: ${error.message}`, 'error');
        }
    }

    validarDatosSolicitud(datos) {
        if (!datos.rut || !datos.nombre || !datos.email || !datos.telefono) {
            throw new Error('Todos los campos obligatorios deben estar completos');
        }
        
        if (!datos.montoSolicitado || datos.montoSolicitado <= 0) {
            throw new Error('El monto solicitado debe ser mayor a 0');
        }
        
        const limites = LIMITES_PRESTAMOS[datos.tipoSolicitud];
        if (limites && limites.montoMaximo && datos.montoSolicitado > limites.montoMaximo) {
            throw new Error(`El monto excede el límite máximo de $${limites.montoMaximo.toLocaleString('es-CL')}`);
        }
    }

    async subirArchivos(formData) {
        const archivos = {};
        const archivosASubir = ['formularioCompleto', 'cedulaIdentidad', 'liquidacionesSueldo', 'documentosExtras'];
        
        for (const campo of archivosASubir) {
            const files = formData.getAll(campo);
            if (files && files.length > 0 && files[0].size > 0) {
                archivos[campo] = [];
                
                for (const file of files) {
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
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

        if (file.size > maxSize) {
            throw new Error(`El archivo ${file.name} excede el tamaño máximo permitido (10MB)`);
        }
        
        if (!allowedTypes.includes(file.type)) {
            throw new Error(`El archivo ${file.name} no tiene un formato permitido`);
        }
    }

    // ========================================
    // UI - SOLO MENSAJES SIMPLES
    // ========================================

    mostrarMensaje(mensaje, tipo = 'info') {
        // Remover mensajes anteriores
        const mensajesAnteriores = document.querySelectorAll('.alert-prestamos');
        mensajesAnteriores.forEach(msg => msg.remove());

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
        
        const estilos = {
            success: 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;',
            error: 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;',
            warning: 'background: #fff3cd; color: #856404; border: 1px solid #ffeaa7;',
            info: 'background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;'
        };
        
        mensajeDiv.style.cssText += estilos[tipo];
        mensajeDiv.innerHTML = mensaje;
        
        document.body.appendChild(mensajeDiv);
        
        setTimeout(() => {
            if (mensajeDiv.parentNode) {
                mensajeDiv.parentNode.removeChild(mensajeDiv);
            }
        }, 4000);
    }

    mostrarLoading(mensaje = 'Cargando...') {
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
            <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
                <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <p style="margin: 0; font-weight: 600; color: #333;">${mensaje}</p>
            </div>
        `;
        
        if (!document.getElementById('spinner-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-style';
            style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
        
        document.body.appendChild(loading);
    }

    ocultarLoading() {
        const loading = document.getElementById('loading-prestamos');
        if (loading) loading.remove();
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

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando sistema de préstamos (solo descarga directa)...');
    window.prestamosHandler = new PrestamosHandler();
    console.log('✅ Sistema listo');
});

export default PrestamosHandler;
export { FORMULARIOS_CONFIG, LIMITES_PRESTAMOS, formatearRUT };
