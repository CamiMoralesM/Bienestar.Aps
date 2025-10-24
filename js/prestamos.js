// prestamos-handler-simple.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    serverTimestamp,
    query,
    where,
    orderBy,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

// Importar configuración (ajustar la ruta según sea necesario)
import { firebaseConfig, prestamosConfig } from './firebase-config-prestamos.js';

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

class PrestamosHandler {
    constructor() {
        this.initializeEventListeners();
        // Usar formularios de la configuración
        this.formularios = prestamosConfig.formulariosPDF;
        this.nombresFormularios = prestamosConfig.nombresFormularios;
    }

    initializeEventListeners() {
        // Event listeners para descarga de formularios
        document.querySelectorAll('.btn-download-form').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tipo = e.target.getAttribute('data-tipo');
                this.descargarFormulario(tipo);
            });
        });

        // Event listener para envío de solicitud de préstamo
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
    }

    descargarFormulario(tipo) {
        // Obtener la URL del formulario desde la configuración
        const urlFormulario = this.formularios[tipo];
        
        if (!urlFormulario) {
            console.error('Tipo de formulario no encontrado:', tipo);
            this.mostrarMensaje('Error: Tipo de formulario no encontrado', 'error');
            return;
        }

        // Verificar si el archivo existe antes de descargarlo
        this.verificarYDescargarFormulario(urlFormulario, tipo);
    }

    async verificarYDescargarFormulario(url, tipo) {
        try {
            // Intentar acceder al archivo
            const response = await fetch(url, { method: 'HEAD' });
            
            if (response.ok) {
                // El archivo existe, proceder con la descarga
                this.iniciarDescarga(url, tipo);
                this.mostrarMensaje(`Descargando formulario de ${this.obtenerNombreTipo(tipo)}`, 'success');
            } else {
                // El archivo no existe
                console.error('Formulario no encontrado en:', url);
                this.mostrarMensaje('Error: El formulario no está disponible. Contacte al administrador.', 'error');
            }
        } catch (error) {
            // Error de red o archivo no accesible
            console.error('Error al verificar formulario:', error);
            // Intentar descarga directa como fallback
            this.iniciarDescarga(url, tipo);
            this.mostrarMensaje(`Intentando descargar formulario de ${this.obtenerNombreTipo(tipo)}...`, 'info');
        }
    }

    iniciarDescarga(url, tipo) {
        // Crear enlace de descarga
        const link = document.createElement('a');
        link.href = url;
        link.download = this.nombresFormularios[tipo] || `formulario-${tipo}.pdf`;
        link.target = '_blank'; // Abrir en nueva pestaña como backup
        
        // Agregar al DOM temporalmente
        document.body.appendChild(link);
        
        // Trigger de descarga
        link.click();
        
        // Remover del DOM
        document.body.removeChild(link);
    }

    obtenerNombreTipo(tipo) {
        const nombres = {
            'medico': 'Préstamos Médicos',
            'emergencia': 'Préstamos de Emergencia',
            'libre-disposicion': 'Préstamos de Libre Disposición',
            'fondo-solidario': 'Fondo Solidario'
        };
        return nombres[tipo] || tipo;
    }

    manejarCambioTipo(event) {
        const tipo = event.target.value;
        const documentosAdicionales = document.getElementById('documentosAdicionales');
        const documentosExtrasInfo = document.getElementById('documentosExtrasInfo');
        const montoInput = document.getElementById('montoSolicitado');
        
        // Limpiar monto al cambiar tipo
        montoInput.value = '';
        
        // Obtener límites desde la configuración
        const limites = prestamosConfig.limitesPrestamos[tipo];
        
        if (limites) {
            // Configurar límites de monto según tipo
            if (limites.montoMaximo) {
                montoInput.max = limites.montoMaximo;
                montoInput.placeholder = `Máximo $${limites.montoMaximo.toLocaleString()}`;
            } else {
                montoInput.max = '';
                montoInput.placeholder = 'Monto según necesidad';
            }
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
        
        if (tipo && prestamosConfig.limitesPrestamos[tipo]) {
            const limites = prestamosConfig.limitesPrestamos[tipo];
            
            if (limites.montoMaximo && monto > limites.montoMaximo) {
                this.mostrarMensaje(
                    `El monto máximo para ${this.obtenerNombreTipo(tipo)} es $${limites.montoMaximo.toLocaleString()}`, 
                    'warning'
                );
                event.target.value = limites.montoMaximo;
            }
        }
    }

    async enviarSolicitudPrestamo(event) {
        event.preventDefault();
        
        try {
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
            const docRef = await addDoc(
                collection(db, prestamosConfig.coleccionSolicitudes), 
                solicitudData
            );
            
            // Limpiar formulario
            event.target.reset();
            
            // Mostrar mensaje de éxito
            this.ocultarLoading();
            this.mostrarMensaje(
                'Solicitud enviada exitosamente. Recibirá una respuesta pronto.', 
                'success'
            );
            
            console.log('Solicitud guardada con ID:', docRef.id);
            
        } catch (error) {
            console.error('Error al enviar solicitud:', error);
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
        const limites = prestamosConfig.limitesPrestamos[datos.tipoSolicitud];
        if (limites && limites.montoMaximo && datos.montoSolicitado > limites.montoMaximo) {
            throw new Error(`El monto excede el límite máximo de $${limites.montoMaximo.toLocaleString()}`);
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
                    const fileName = `${prestamosConfig.carpetaStorage}/${timestamp}_${file.name}`;
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
        // Validar tamaño
        if (file.size > prestamosConfig.maxFileSize) {
            throw new Error(`El archivo ${file.name} excede el tamaño máximo permitido`);
        }
        
        // Validar tipo
        if (!prestamosConfig.allowedFileTypes.includes(file.type)) {
            throw new Error(`El archivo ${file.name} no tiene un formato permitido`);
        }
    }

    async cargarSolicitudesUsuario(rutUsuario) {
        try {
            const q = query(
                collection(db, prestamosConfig.coleccionSolicitudes),
                where('usuarioSolicitante', '==', rutUsuario),
                orderBy('fechaSolicitud', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            const solicitudes = [];
            
            querySnapshot.forEach((doc) => {
                solicitudes.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return solicitudes;
            
        } catch (error) {
            console.error('Error al cargar solicitudes:', error);
            return [];
        }
    }

    mostrarMensaje(mensaje, tipo = 'info') {
        // Crear elemento de mensaje
        const mensajeDiv = document.createElement('div');
        mensajeDiv.className = `alert alert-${tipo}`;
        mensajeDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 9999;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        // Estilos según tipo
        const estilos = {
            success: 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;',
            error: 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;',
            warning: 'background: #fff3cd; color: #856404; border: 1px solid #ffeaa7;',
            info: 'background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;'
        };
        
        mensajeDiv.style.cssText += estilos[tipo];
        mensajeDiv.textContent = mensaje;
        
        document.body.appendChild(mensajeDiv);
        
        // Remover después de 5 segundos
        setTimeout(() => {
            if (mensajeDiv.parentNode) {
                mensajeDiv.parentNode.removeChild(mensajeDiv);
            }
        }, 5000);
    }

    mostrarLoading(mensaje = 'Cargando...') {
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
                <p style="margin: 0; font-weight: 600;">${mensaje}</p>
            </div>
        `;
        
        // Agregar animación CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(loading);
    }

    ocultarLoading() {
        const loading = document.getElementById('loading-prestamos');
        if (loading) {
            loading.remove();
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.prestamosHandler = new PrestamosHandler();
});

// Exportar para uso en otros módulos
export default PrestamosHandler;
