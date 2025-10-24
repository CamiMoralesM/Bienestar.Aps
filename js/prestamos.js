// Manejador de Préstamos con descarga de formularios corregida
import { 
    db, 
    storage, 
    prestamosConfig, 
    mensajesError 
} from './firebase-config-prestamos.js';

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

class PrestamosHandler {
    constructor() {
        this.initializeEventListeners();
        console.log('✅ PrestamosHandler inicializado');
    }

    initializeEventListeners() {
        // Event listeners para descarga de formularios
        document.querySelectorAll('.btn-download-form').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
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

    async descargarFormulario(tipo) {
        try {
            this.mostrarMensaje(`Preparando descarga del formulario de ${this.obtenerNombreTipo(tipo)}...`, 'info');
            
            // Crear formulario temporal como fallback
            const formContent = this.generarFormularioTemporalPDF(tipo);
            
            // Crear blob con el contenido del formulario
            const blob = new Blob([formContent], { type: 'text/html' });
            
            // Crear URL temporal
            const url = window.URL.createObjectURL(blob);
            
            // Crear enlace de descarga
            const link = document.createElement('a');
            link.href = url;
            link.download = prestamosConfig.nombresFormularios[tipo] || `formulario-${tipo}.html`;
            
            // Agregar al DOM temporalmente
            document.body.appendChild(link);
            
            // Trigger de descarga
            link.click();
            
            // Limpiar
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            this.mostrarMensaje(`Formulario de ${this.obtenerNombreTipo(tipo)} descargado correctamente`, 'success');
            
        } catch (error) {
            console.error('Error al descargar formulario:', error);
            this.mostrarMensaje('Error al descargar el formulario. Por favor contacte al administrador.', 'error');
        }
    }

    generarFormularioTemporalPDF(tipo) {
        const fecha = new Date().toLocaleDateString('es-CL');
        const nombreTipo = this.obtenerNombreTipo(tipo);
        
        let contenidoEspecifico = '';
        
        switch(tipo) {
            case 'medico':
                contenidoEspecifico = `
                    <h3>Información Médica</h3>
                    <p><strong>Diagnóstico médico:</strong> _________________________________</p>
                    <p><strong>Médico tratante:</strong> _________________________________</p>
                    <p><strong>Centro de salud:</strong> _________________________________</p>
                    <p><strong>Tratamiento requerido:</strong> _________________________________</p>
                    <p><strong>Costo estimado del tratamiento:</strong> $_______________________</p>
                `;
                break;
            case 'emergencia':
                contenidoEspecifico = `
                    <h3>Información de Emergencia</h3>
                    <p><strong>Tipo de emergencia:</strong> _________________________________</p>
                    <p><strong>Fecha de la emergencia:</strong> _________________________________</p>
                    <p><strong>Descripción detallada:</strong> _________________________________</p>
                    <p><strong>Documentos de respaldo:</strong> _________________________________</p>
                    <p><strong>Monto total requerido:</strong> $_______________________</p>
                `;
                break;
            case 'libre-disposicion':
                contenidoEspecifico = `
                    <h3>Préstamo de Libre Disposición</h3>
                    <p><strong>Destino del préstamo:</strong> _________________________________</p>
                    <p><strong>Monto solicitado:</strong> $_______________________</p>
                    <p><strong>Plazo de pago preferido:</strong> _______ cuotas (máx. 6)</p>
                `;
                break;
            case 'fondo-solidario':
                contenidoEspecifico = `
                    <h3>Solicitud de Fondo Solidario</h3>
                    <p><strong>Situación que motiva la solicitud:</strong> _________________________________</p>
                    <p><strong>Personas afectadas:</strong> _________________________________</p>
                    <p><strong>Ayuda económica solicitada:</strong> $_______________________</p>
                    <p><strong>Otros apoyos recibidos:</strong> _________________________________</p>
                `;
                break;
        }
        
        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formulario - ${nombreTipo}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #007bff; }
        .form-section { margin-bottom: 30px; }
        .form-section h3 { background-color: #f8f9fa; padding: 10px; border-left: 4px solid #007bff; }
        .form-row { display: flex; margin-bottom: 15px; }
        .form-field { flex: 1; margin-right: 20px; }
        .form-field:last-child { margin-right: 0; }
        p { margin-bottom: 15px; }
        .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
        .signature-box { text-align: center; width: 200px; }
        .signature-line { border-bottom: 1px solid #333; margin-bottom: 5px; height: 50px; }
        .checkbox { margin-right: 10px; }
        .instructions { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">SERVICIO BIENESTAR APS</div>
        <h2>FORMULARIO DE SOLICITUD</h2>
        <h3>${nombreTipo.toUpperCase()}</h3>
        <p>Fecha: ${fecha}</p>
    </div>

    <div class="instructions">
        <h4>📋 INSTRUCCIONES:</h4>
        <ul>
            <li>Complete todos los campos requeridos con letra clara</li>
            <li>Adjunte toda la documentación solicitada</li>
            <li>Firme el formulario en los espacios indicados</li>
            <li>Entregue en oficinas del Servicio Bienestar APS</li>
        </ul>
    </div>

    <div class="form-section">
        <h3>Datos del Solicitante</h3>
        <div class="form-row">
            <div class="form-field">
                <p><strong>Nombre completo:</strong> _________________________________</p>
            </div>
        </div>
        <div class="form-row">
            <div class="form-field">
                <p><strong>RUT:</strong> _____________________</p>
            </div>
            <div class="form-field">
                <p><strong>Fecha de nacimiento:</strong> _____________________</p>
            </div>
        </div>
        <div class="form-row">
            <div class="form-field">
                <p><strong>Dirección:</strong> _________________________________</p>
            </div>
        </div>
        <div class="form-row">
            <div class="form-field">
                <p><strong>Teléfono:</strong> _____________________</p>
            </div>
            <div class="form-field">
                <p><strong>Email:</strong> _____________________</p>
            </div>
        </div>
        <div class="form-row">
            <div class="form-field">
                <p><strong>Centro de Salud:</strong> _________________________________</p>
            </div>
        </div>
        <div class="form-row">
            <div class="form-field">
                <p><strong>Fecha de afiliación APS:</strong> _____________________</p>
            </div>
        </div>
    </div>

    <div class="form-section">
        ${contenidoEspecifico}
    </div>

    <div class="form-section">
        <h3>Documentos Adjuntos</h3>
        <p><input type="checkbox" class="checkbox"> Formulario completo y firmado</p>
        <p><input type="checkbox" class="checkbox"> Fotocopia de cédula de identidad (ambas caras)</p>
        <p><input type="checkbox" class="checkbox"> Últimas 3 liquidaciones de sueldo</p>
        <p><input type="checkbox" class="checkbox"> Documentos adicionales según tipo de solicitud</p>
    </div>

    <div class="form-section">
        <h3>Declaración y Compromiso</h3>
        <p>Declaro bajo juramento que la información proporcionada es veraz y completa. Me comprometo a proporcionar cualquier documentación adicional que sea requerida y acepto las condiciones establecidas por el Servicio Bienestar APS.</p>
        <p><input type="checkbox" class="checkbox"> Acepto los términos y condiciones</p>
        <p><input type="checkbox" class="checkbox"> Autorizo la verificación de la información proporcionada</p>
    </div>

    <div class="signature-section">
        <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Firma del Solicitante</strong></p>
            <p>Fecha: ___________</p>
        </div>
        <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Firma Trabajador/a Social</strong></p>
            <p>Fecha: ___________</p>
        </div>
    </div>

    <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
        <p>Servicio Bienestar APS - Corporación Municipal de Puente Alto</p>
        <p>Para uso exclusivo del funcionario: Este formulario debe ser entregado junto con toda la documentación requerida</p>
    </div>
</body>
</html>`;
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
        if (montoInput) {
            montoInput.value = '';
        }
        
        // Obtener límites desde la configuración
        const limites = prestamosConfig.limitesPrestamos[tipo];
        
        if (limites && montoInput) {
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
        if (documentosAdicionales && documentosExtrasInfo) {
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
    }

    validarMonto(event) {
        const monto = parseInt(event.target.value);
        const tipoSelect = document.getElementById('tipoSolicitud');
        
        if (!tipoSelect) return;
        
        const tipo = tipoSelect.value;
        
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
            throw new Error(mensajesError.campoRequerido);
        }
        
        // Validar monto
        if (!datos.montoSolicitado || datos.montoSolicitado <= 0) {
            throw new Error('El monto solicitado debe ser mayor a 0');
        }
        
        // Validar límites según tipo
        const limites = prestamosConfig.limitesPrestamos[datos.tipoSolicitud];
        if (limites && limites.montoMaximo && datos.montoSolicitado > limites.montoMaximo) {
            throw new Error(mensajesError.montoExcedido);
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
            throw new Error(mensajesError.archivoMuyGrande);
        }
        
        // Validar tipo
        if (!prestamosConfig.allowedFileTypes.includes(file.type)) {
            throw new Error(mensajesError.formatoArchivoInvalido);
        }
    }

    mostrarMensaje(mensaje, tipo = 'info') {
        // Remover mensajes anteriores
        const mensajeAnterior = document.querySelector('.alert-message');
        if (mensajeAnterior) {
            mensajeAnterior.remove();
        }
        
        // Crear elemento de mensaje
        const mensajeDiv = document.createElement('div');
        mensajeDiv.className = `alert alert-${tipo} alert-message`;
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
            <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <p style="margin: 0; font-weight: 600; color: #333;">${mensaje}</p>
            </div>
        `;
        
        // Agregar animación CSS si no existe
        if (!document.querySelector('#loading-animation-style')) {
            const style = document.createElement('style');
            style.id = 'loading-animation-style';
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

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.prestamosHandler = new PrestamosHandler();
        console.log('✅ PrestamosHandler inicializado correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar PrestamosHandler:', error);
    }
});

// Exportar para uso en otros módulos
export default PrestamosHandler;
