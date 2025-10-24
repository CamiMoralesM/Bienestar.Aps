import { db } from './firebase-config.js';
export const prestamosConfig = {
    // Colección principal para solicitudes de préstamos
    coleccionSolicitudes: 'solicitudes-prestamos',
    
    // Subcarpeta en Storage para archivos de préstamos
    carpetaStorage: 'prestamos',
    
    // Rutas de los formularios PDF reales
    // IMPORTANTE: Actualizar estas rutas con la ubicación real de sus formularios
    formulariosPDF: {
        'medico': '/assets/formularios/formulario-prestamo-medico.pdf',
        'emergencia': '/assets/formularios/formulario-prestamo-emergencia.pdf',
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
