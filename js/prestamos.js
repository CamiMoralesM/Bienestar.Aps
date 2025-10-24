// prestamos-handler.js
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

// Configuración de Firebase (usar la misma configuración del proyecto)
const firebaseConfig = {
    // Aquí va tu configuración de Firebase
    // apiKey: "...",
    // authDomain: "...",
    // projectId: "...",
    // etc.
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

class PrestamosHandler {
    constructor() {
        this.initializeEventListeners();
        this.formularios = {
            'medico': '/assets/formularios/formulario-prestamo-medico.pdf',
            'emergencia': '/assets/formularios/formulario-prestamo-emergencia.pdf',
            'libre-disposicion': '/assets/formularios/formulario-prestamo-libre-disposicion.pdf',
            'fondo-solidario': '/assets/formularios/formulario-fondo-solidario.pdf'
        };
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
        // Verificar si el generador de PDF está disponible
        if (typeof window.PDFGenerator !== 'undefined') {
            const pdfGenerator = new window.PDFGenerator();
            
            switch(tipo) {
                case 'medico':
                    pdfGenerator.generarFormularioMedico();
                    break;
                case 'emergencia':
                    pdfGenerator.generarFormularioEmergencia();
                    break;
                case 'libre-disposicion':
                    pdfGenerator.generarFormularioLibreDisposicion();
                    break;
                case 'fondo-solidario':
                    pdfGenerator.generarFormularioFondoSolidario();
                    break;
                default:
                    console.error('Tipo de formulario no encontrado:', tipo);
                    this.mostrarMensaje('Error: Tipo de formulario no encontrado', 'error');
                    return;
            }
            
            this.mostrarMensaje('Formulario descargado exitosamente', 'success');
        } else {
            // Fallback a generación simple si PDF Generator no está disponible
            this.generarFormularioSimple(tipo);
        }
    }

    generarFormularioSimple(tipo) {
        const formularios = {
            'medico': this.generarFormularioMedico(),
            'emergencia': this.generarFormularioEmergencia(),
            'libre-disposicion': this.generarFormularioLibreDisposicion(),
            'fondo-solidario': this.generarFormularioFondoSolidario()
        };

        if (formularios[tipo]) {
            formularios[tipo]();
        } else {
            console.error('Tipo de formulario no encontrado:', tipo);
            this.mostrarMensaje('Error: Tipo de formulario no encontrado', 'error');
        }
    }

    generarFormularioMedico() {
        // Crear PDF para préstamo médico
        this.crearPDFFormulario('Formulario de Préstamo Médico', {
            titulo: 'SOLICITUD DE PRÉSTAMO MÉDICO',
            subtitulo: 'Servicio de Bienestar APS - Corporación Municipal de Puente Alto',
            campos: [
                'DATOS DEL SOLICITANTE',
                'Nombre completo: ____________________________________',
                'RUT: ____________________',
                'Teléfono: ____________________',
                'Correo electrónico: ____________________________________',
                'Dirección: ____________________________________',
                '',
                'DATOS DEL PRÉSTAMO',
                'Monto solicitado: $____________________',
                'Número de cuotas solicitadas (máx. 12): ____________________',
                'Motivo médico: ____________________________________',
                '________________________________________________',
                '________________________________________________',
                '',
                'DOCUMENTOS ADJUNTOS (marcar con X)',
                '☐ Fotocopia de cédula de identidad',
                '☐ Últimas 3 liquidaciones de sueldo',
                '☐ Informes médicos',
                '☐ Cotizaciones de medicamentos/tratamientos',
                '☐ Otros: ____________________________________',
                '',
                'DECLARACIÓN',
                'Declaro que la información proporcionada es verdadera y me comprometo',
                'a cumplir con las condiciones del préstamo aprobado.',
                '',
                'Fecha: ____________________',
                '',
                'Firma del solicitante: ____________________________________',
                '',
                'PARA USO EXCLUSIVO DEL SERVICIO DE BIENESTAR',
                'Evaluado por: ____________________________________',
                'Fecha de evaluación: ____________________',
                'Aprobado: ☐ Sí  ☐ No',
                'Observaciones: ____________________________________',
                '________________________________________________'
            ]
        });
    }

    generarFormularioEmergencia() {
        this.crearPDFFormulario('Formulario de Préstamo de Emergencia', {
            titulo: 'SOLICITUD DE PRÉSTAMO DE EMERGENCIA',
            subtitulo: 'Servicio de Bienestar APS - Corporación Municipal de Puente Alto',
            campos: [
                'DATOS DEL SOLICITANTE',
                'Nombre completo: ____________________________________',
                'RUT: ____________________',
                'Teléfono: ____________________',
                'Correo electrónico: ____________________________________',
                'Dirección: ____________________________________',
                '',
                'DATOS DEL PRÉSTAMO DE EMERGENCIA',
                'Monto solicitado: $____________________',
                'Descripción de la emergencia: ____________________________________',
                '________________________________________________',
                '________________________________________________',
                '________________________________________________',
                '',
                'DOCUMENTOS ADJUNTOS (marcar con X)',
                '☐ Fotocopia de cédula de identidad',
                '☐ Últimas 3 liquidaciones de sueldo',
                '☐ Documentos que respalden la emergencia',
                '☐ Otros: ____________________________________',
                '',
                'DECLARACIÓN',
                'Declaro que la situación descrita constituye una emergencia real',
                'y me comprometo a cumplir con las condiciones del préstamo.',
                'El monto será descontado de mi liquidación de sueldo según',
                'las condiciones contractuales establecidas.',
                '',
                'Fecha: ____________________',
                '',
                'Firma del solicitante: ____________________________________',
                '',
                'PARA USO EXCLUSIVO DEL SERVICIO DE BIENESTAR',
                'Evaluado por: ____________________________________',
                'Fecha de evaluación: ____________________',
                'Aprobado: ☐ Sí  ☐ No',
                'Observaciones: ____________________________________',
                '________________________________________________'
            ]
        });
    }

    generarFormularioLibreDisposicion() {
        this.crearPDFFormulario('Formulario de Préstamo de Libre Disposición', {
            titulo: 'SOLICITUD DE PRÉSTAMO DE LIBRE DISPOSICIÓN',
            subtitulo: 'Servicio de Bienestar APS - Corporación Municipal de Puente Alto',
            campos: [
                'DATOS DEL SOLICITANTE',
                'Nombre completo: ____________________________________',
                'RUT: ____________________',
                'Teléfono: ____________________',
                'Correo electrónico: ____________________________________',
                'Dirección: ____________________________________',
                '',
                'DATOS DEL PRÉSTAMO',
                'Monto solicitado (máx. $300.000): $____________________',
                'Número de cuotas solicitadas (máx. 6): ____________________',
                'Propósito del préstamo: ____________________________________',
                '________________________________________________',
                '',
                'DOCUMENTOS ADJUNTOS (marcar con X)',
                '☐ Fotocopia de cédula de identidad',
                '☐ Últimas 3 liquidaciones de sueldo',
                '☐ Formulario de préstamo de libre disposición',
                '',
                'REQUISITOS',
                '✓ Tener al menos 3 descuentos del Servicio de Bienestar APS',
                '✓ Presentar las últimas 3 liquidaciones',
                '✓ Fotocopia de cédula de identidad vigente',
                '',
                'DECLARACIÓN',
                'Declaro que cumplo con todos los requisitos y me comprometo',
                'a cumplir con las condiciones del préstamo aprobado.',
                '',
                'Fecha: ____________________',
                '',
                'Firma del solicitante: ____________________________________',
                '',
                'PARA USO EXCLUSIVO DEL SERVICIO DE BIENESTAR',
                'Evaluado por: ____________________________________',
                'Fecha de evaluación: ____________________',
                'Aprobado: ☐ Sí  ☐ No',
                'Observaciones: ____________________________________',
                '________________________________________________'
            ]
        });
    }

    generarFormularioFondoSolidario() {
        this.crearPDFFormulario('Formulario de Fondo Solidario', {
            titulo: 'SOLICITUD DE FONDO SOLIDARIO',
            subtitulo: 'Servicio de Bienestar APS - Corporación Municipal de Puente Alto',
            campos: [
                'DATOS DEL SOLICITANTE',
                'Nombre completo: ____________________________________',
                'RUT: ____________________',
                'Teléfono: ____________________',
                'Correo electrónico: ____________________________________',
                'Dirección: ____________________________________',
                '',
                'DATOS DE LA SOLICITUD',
                'Monto solicitado: $____________________',
                'Tipo de emergencia/situación:',
                '☐ Emergencia de salud',
                '☐ Situación familiar compleja',
                '☐ Otro: ____________________________________',
                '',
                'Descripción detallada de la situación:',
                '________________________________________________',
                '________________________________________________',
                '________________________________________________',
                '________________________________________________',
                '',
                'DOCUMENTOS ADJUNTOS (marcar con X)',
                '☐ Fotocopia de cédula de identidad',
                '☐ Últimas 3 liquidaciones de sueldo',
                '☐ Documentos que respalden la situación',
                '☐ Informes médicos (si aplica)',
                '☐ Otros: ____________________________________',
                '',
                'DECLARACIÓN',
                'Declaro que la información proporcionada es verdadera',
                'y que la situación descrita requiere apoyo solidario.',
                'Entiendo que esta ayuda no tiene retorno y será evaluada',
                'por el Trabajador/a Social en conjunto con el Comité',
                'del Servicio de Bienestar APS.',
                '',
                'Fecha: ____________________',
                '',
                'Firma del solicitante: ____________________________________',
                '',
                'PARA USO EXCLUSIVO DEL SERVICIO DE BIENESTAR',
                'Evaluado por: ____________________________________',
                'Fecha de evaluación: ____________________',
                'Aprobado por Comité: ☐ Sí  ☐ No',
                'Observaciones: ____________________________________',
                '________________________________________________'
            ]
        });
    }

    crearPDFFormulario(nombreArchivo, contenido) {
        // Simular descarga de PDF
        // En una implementación real, aquí usarías una librería como jsPDF
        const element = document.createElement('a');
        const contenidoTexto = [
            contenido.titulo,
            contenido.subtitulo,
            '',
            ...contenido.campos
        ].join('\n');
        
        const file = new Blob([contenidoTexto], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `${nombreArchivo}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        
        // Mostrar mensaje de éxito
        this.mostrarMensaje('Formulario descargado exitosamente', 'success');
    }

    manejarCambioTipo(event) {
        const tipo = event.target.value;
        const documentosAdicionales = document.getElementById('documentosAdicionales');
        const documentosExtrasInfo = document.getElementById('documentosExtrasInfo');
        const montoInput = document.getElementById('montoSolicitado');
        
        // Limpiar monto al cambiar tipo
        montoInput.value = '';
        
        // Configurar límites de monto según tipo
        switch(tipo) {
            case 'prestamo-medico':
            case 'prestamo-emergencia':
                montoInput.max = 500000;
                montoInput.placeholder = 'Máximo $500.000';
                documentosAdicionales.style.display = 'block';
                documentosExtrasInfo.textContent = tipo === 'prestamo-medico' 
                    ? 'Informes médicos, cotizaciones de medicamentos o tratamientos'
                    : 'Documentos que respalden la emergencia (facturas, informes, etc.)';
                break;
            case 'prestamo-libre-disposicion':
                montoInput.max = 300000;
                montoInput.placeholder = 'Máximo $300.000';
                documentosAdicionales.style.display = 'none';
                break;
            case 'fondo-solidario':
                montoInput.max = 1000000; // Sin límite específico, pero ponemos uno alto
                montoInput.placeholder = 'Monto según necesidad';
                documentosAdicionales.style.display = 'block';
                documentosExtrasInfo.textContent = 'Documentos que respalden la situación de emergencia familiar';
                break;
            default:
                documentosAdicionales.style.display = 'none';
                montoInput.max = '';
                montoInput.placeholder = 'Ingrese monto';
        }
    }

    validarMonto(event) {
        const monto = parseInt(event.target.value);
        const tipo = document.getElementById('tipoSolicitud').value;
        const maximos = {
            'prestamo-medico': 500000,
            'prestamo-emergencia': 500000,
            'prestamo-libre-disposicion': 300000
        };

        if (tipo && maximos[tipo] && monto > maximos[tipo]) {
            this.mostrarMensaje(`El monto máximo para ${tipo} es $${maximos[tipo].toLocaleString()}`, 'warning');
            event.target.value = maximos[tipo];
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
            
            // Subir archivos
            const archivos = await this.subirArchivos(formData);
            solicitudData.archivos = archivos;
            
            // Guardar en Firestore
            const docRef = await addDoc(collection(db, 'solicitudes-prestamos'), solicitudData);
            
            // Limpiar formulario
            event.target.reset();
            
            // Mostrar mensaje de éxito
            this.ocultarLoading();
            this.mostrarMensaje('Solicitud enviada exitosamente. Recibirá una respuesta pronto.', 'success');
            
            console.log('Solicitud guardada con ID:', docRef.id);
            
        } catch (error) {
            console.error('Error al enviar solicitud:', error);
            this.ocultarLoading();
            this.mostrarMensaje('Error al enviar la solicitud. Inténtelo nuevamente.', 'error');
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
                    const timestamp = Date.now();
                    const fileName = `prestamos/${timestamp}_${file.name}`;
                    const storageRef = ref(storage, fileName);
                    
                    const snapshot = await uploadBytes(storageRef, file);
                    const downloadURL = await getDownloadURL(snapshot.ref);
                    
                    archivos[campo].push({
                        nombre: file.name,
                        url: downloadURL,
                        fecha: new Date().toISOString()
                    });
                }
            }
        }
        
        return archivos;
    }

    async cargarSolicitudesUsuario(rutUsuario) {
        try {
            const q = query(
                collection(db, 'solicitudes-prestamos'),
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
