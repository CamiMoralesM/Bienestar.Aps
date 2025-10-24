// Configuración unificada de Firebase y Préstamos
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Configuración de Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyA9nXi619VOgT6mUYmYfu2jja8TRAj9QJE",
  authDomain: "bienestaraps-c87f0.firebaseapp.com",
  projectId: "bienestaraps-c87f0",
  storageBucket: "bienestaraps-c87f0.firebasestorage.app",
  messagingSenderId: "471175424877",
  appId: "1:471175424877:web:7e1a44f77362d13f78c864",
  measurementId: "G-G1MGN967WT"
};
// firebase-config-prestamos.js
// Configuración de Firebase para el módulo de préstamos

// IMPORTANTE: Reemplaza estos valores con tu configuración real de Firebase
export const firebaseConfig = {
    apiKey: "tu-api-key-aqui",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "tu-app-id"
};

// Configuración específica para préstamos
export const prestamosConfig = {
    // Colección principal para solicitudes de préstamos
    coleccionSolicitudes: 'solicitudes-prestamos',
    
    // Subcarpeta en Storage para archivos de préstamos
    carpetaStorage: 'prestamos',
    
    // Rutas de los formularios PDF reales
    // IMPORTANTE: Actualizar estas rutas con la ubicación real de sus formularios
    formulariosPDF: {
        'medico': '/assets/formulario/formulario-prestamos.pdf',
        'emergencia': '/assets/formulario/formulario-prestamos.pdf',
        'libre-disposicion': '/assets/formularios/formulario-prestamo-libre-disposicion.pdf',
        'fondo-solidario': '/assets/formularios/formulario-fondo-solidario.pdf'
    },
    
    // Nombres de descarga para los formularios
    nombresFormularios: {
        'medico': 'Formulario_Prestamo_Medico.pdf',
        'emergencia': 'Formulario_Prestamo_Emergencia.pdf', 
        'libre-disposicion': 'Formulario_Prestamo_Libre_Disposicion.pdf',
        'fondo-solidario': 'Formulario_Fondo_Solidario.pdf'
    },
    
    // Límites de archivos
    maxFileSize: 10 * 1024 * 1024, // 10MB en bytes
    allowedFileTypes: [
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/webp'
    ],
    
    // Límites de préstamos por tipo
    limitesPrestamos: {
        'prestamo-medico': {
            montoMaximo: 500000,
            cuotasMaximas: 12
        },
        'prestamo-emergencia': {
            montoMaximo: 500000,
            cuotasMaximas: null // Según condiciones contractuales
        },
        'prestamo-libre-disposicion': {
            montoMaximo: 300000,
            cuotasMaximas: 6
        },
        'fondo-solidario': {
            montoMaximo: null, // Sin límite específico
            cuotasMaximas: null // No aplica
        }
    },
    
    // Estados posibles de las solicitudes
    estadosSolicitud: [
        'pendiente',
        'en-revision',
        'aprobado',
        'rechazado',
        'completado'
    ],
    
    // Campos requeridos por tipo de préstamo
    documentosRequeridos: {
        'prestamo-medico': [
            'formularioCompleto',
            'cedulaIdentidad',
            'liquidacionesSueldo',
            'informesMedicos'
        ],
        'prestamo-emergencia': [
            'formularioCompleto',
            'cedulaIdentidad',
            'liquidacionesSueldo',
            'documentosEmergencia'
        ],
        'prestamo-libre-disposicion': [
            'formularioCompleto',
            'cedulaIdentidad',
            'liquidacionesSueldo'
        ],
        'fondo-solidario': [
            'formularioCompleto',
            'cedulaIdentidad',
            'liquidacionesSueldo',
            'documentosSituacion'
        ]
    },
    
    // Configuración de notificaciones
    notificaciones: {
        emailAdmin: 'admin@bienestaraps.cl',
        emailTemplate: {
            confirmacion: 'Su solicitud ha sido recibida correctamente',
            aprobacion: 'Su solicitud ha sido aprobada',
            rechazo: 'Su solicitud ha sido rechazada'
        }
    }
};

// Reglas de validación
export const validacionPrestamos = {
    rut: {
        required: true,
        pattern: /^[\d]{1,2}\.?[\d]{3}\.?[\d]{3}[-]?[\dkK]$/
    },
    email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    telefono: {
        required: true,
        pattern: /^(\+?56)?[0-9]{8,9}$/
    },
    monto: {
        required: true,
        min: 1,
        validateAgainstType: true
    }
};

// Mensajes de error personalizados
export const mensajesError = {
    campoRequerido: 'Este campo es obligatorio',
    formatoInvalido: 'El formato ingresado no es válido',
    montoExcedido: 'El monto excede el límite permitido para este tipo de préstamo',
    archivoMuyGrande: 'El archivo excede el tamaño máximo permitido (10MB)',
    formatoArchivoInvalido: 'Formato de archivo no permitido',
    errorConexion: 'Error de conexión. Por favor intente nuevamente',
    errorGeneral: 'Ha ocurrido un error inesperado'
};

// Configuración de interfaz
export const uiConfig = {
    colores: {
        prestamo_medico: '#ff6b6b',
        prestamo_emergencia: '#ff9500',
        prestamo_libre_disposicion: '#4facfe',
        fondo_solidario: '#56ab2f'
    },
    iconos: {
        prestamo_medico: '🏥',
        prestamo_emergencia: '🚨',
        prestamo_libre_disposicion: '💳',
        fondo_solidario: '🤝'
    }
};
