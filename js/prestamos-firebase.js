 // Lógica simplificada para solicitudes de préstamos (SIN Firebase Storage para evitar CORS)
import { db, auth } from './firebase-config.js';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Guarda una solicitud de préstamo en Firestore SIN subir archivos (evita CORS)
 * Los archivos se enviarán por email separadamente
 */
export async function guardarSolicitudPrestamo(tipo, datos, files = []) {
  try {
    console.log('🔄 Guardando solicitud de préstamo (sin archivos)...');
    console.log('Tipo:', tipo);
    console.log('Datos:', datos);

    // Verificar autenticación
    if (!auth.currentUser) {
      throw new Error('Usuario no autenticado');
    }

    const uid = auth.currentUser.uid;
    const rutLimpio = (datos.rut || '').replace(/\./g, '').replace(/-/g, '');

    console.log('UID del usuario:', uid);
    console.log('RUT limpio:', rutLimpio);

    // Crear lista de archivos SIN subirlos (solo metadatos)
    const archivosInfo = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      archivosInfo.push({
        nombre: file.name,
        tamaño: file.size,
        tipoMime: file.type,
        estado: 'pendiente_email', // Indica que debe enviarse por email
        url: null, // No hay URL porque no se sube
        ruta: null
      });
    }

    // Preparar datos del documento para Firestore
    const docData = {
      uid: uid,
      rut: rutLimpio,
      nombre: datos.nombre || '',
      email: datos.email || '',
      tipoPrestamo: tipo,
      comentario: datos.comentario || '',
      archivos: archivosInfo, // Solo metadatos de archivos
      estado: 'pendiente',
      requiereArchivos: files.length > 0,
      totalArchivos: files.length,
      instrucciones: 'Enviar documentos por email a bienestar@aps.cl mencionando el ID de esta solicitud',
      creadoPor: uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    console.log('💾 Guardando documento en Firestore...');

    // Guardar documento en Firestore
    const docRef = await addDoc(collection(db, 'solicitudesPrestamos'), docData);

    console.log('✅ Solicitud guardada con ID:', docRef.id);

    return {
      success: true,
      id: docRef.id,
      doc: docData,
      totalArchivos: files.length,
      mensaje: `Solicitud creada exitosamente. ID: ${docRef.id}. Envíe los documentos por email a bienestar@aps.cl mencionando este ID.`
    };
    
  } catch (error) {
    console.error('❌ Error guardando solicitud:', error);
    
    let errorMessage = error.message || String(error);
    
    if (error.code) {
      switch (error.code) {
        case 'permission-denied':
          errorMessage = 'No tiene permisos para crear esta solicitud. Verifique que esté autenticado.';
          break;
        case 'unauthenticated':
          errorMessage = 'Debe iniciar sesión para crear una solicitud.';
          break;
        case 'invalid-argument':
          errorMessage = 'Los datos de la solicitud no son válidos.';
          break;
        default:
          errorMessage = `Error: ${error.code} - ${error.message}`;
      }
    }
    
    return {
      success: false,
      error: errorMessage,
      code: error.code || 'unknown'
    };
  }
}

/**
 * Obtiene las solicitudes del usuario por UID
 */
export async function obtenerSolicitudesPrestamosPorUID(uid) {
  try {
    if (!uid) return [];
    
    console.log('🔍 Obteniendo solicitudes para UID:', uid);
    
    const q = query(collection(db, 'solicitudesPrestamos'), where('uid', '==', uid));
    const snapshot = await getDocs(q);
    const resultados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    console.log('📋 Solicitudes encontradas:', resultados.length);
    
    return resultados;
  } catch (error) {
    console.error('❌ Error al obtener solicitudes:', error);
    return [];
  }
}

/**
 * Función auxiliar para validar datos (sin archivos)
 */
export function validarDatosSolicitud(datos) {
  const errores = [];
  
  if (!datos.nombre || datos.nombre.trim().length < 3) {
    errores.push('El nombre debe tener al menos 3 caracteres');
  }
  
  if (!datos.rut || datos.rut.trim().length < 8) {
    errores.push('El RUT es requerido y debe ser válido');
  }
  
  if (!datos.email || !datos.email.includes('@')) {
    errores.push('El email es requerido y debe ser válido');
  }
  
  if (!datos.comentario || datos.comentario.trim().length < 10) {
    errores.push('La descripción debe tener al menos 10 caracteres');
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Función para generar instrucciones de envío de documentos
 */
export function generarInstruccionesEmail(solicitudId, tipoSolicitud, nombreSolicitante) {
  const tiposMap = {
    'medico': 'Préstamo Médico',
    'emergencia': 'Préstamo de Emergencia', 
    'libre_disposicion': 'Préstamo de Libre Disposición',
    'fondo_solidario': 'Fondo Solidario'
  };
  
  const tipoNombre = tiposMap[tipoSolicitud] || tipoSolicitud;
  
  return {
    para: 'bienestar@aps.cl',
    asunto: `Documentos ${tipoNombre} - ID: ${solicitudId} - ${nombreSolicitante}`,
    cuerpo: `Estimados,

Adjunto los documentos requeridos para mi solicitud de ${tipoNombre}.

Datos de la solicitud:
- ID de Solicitud: ${solicitudId}
- Nombre: ${nombreSolicitante}
- Tipo: ${tipoNombre}
- Fecha: ${new Date().toLocaleDateString('es-CL')}

Documentos adjuntos:
- Formulario completo y firmado
- Fotocopia de cédula de identidad
- Últimas 3 liquidaciones de sueldo
- Otros documentos según corresponda

Quedo atento a cualquier consulta.

Saludos cordiales,
${nombreSolicitante}`
  };
}

export default {
  guardarSolicitudPrestamo,
  obtenerSolicitudesPrestamosPorUID,
  validarDatosSolicitud,
  generarInstruccionesEmail
};
