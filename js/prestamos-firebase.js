// Lógica de subida y guardado en Firebase para solicitudes de préstamos/fondo solidario
import { db, storage, auth } from './firebase-config.js';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

/**
 * Guarda una solicitud de préstamo en Firestore y sube los archivos a Storage.
 * - tipo: 'medico' | 'emergencia' | 'libre_disposicion' | 'fondo_solidario'
 * - datos: { nombre, rut, email, comentario, uid? }
 * - files: Array<File>
 */
export async function guardarSolicitudPrestamo(tipo, datos, files = []) {
  try {
    console.log('🔄 Iniciando guardado de solicitud de préstamo...');
    console.log('Tipo:', tipo);
    console.log('Datos:', datos);
    console.log('Archivos:', files?.length || 0);

    // Verificar autenticación
    if (!auth.currentUser) {
      throw new Error('Usuario no autenticado');
    }

    const uid = auth.currentUser.uid;
    const rutLimpio = (datos.rut || '').replace(/\./g, '').replace(/-/g, '');

    console.log('UID del usuario:', uid);
    console.log('RUT limpio:', rutLimpio);

    // Subir archivos a Storage y obtener URLs
    const archivosSubidos = [];

    console.log('📤 Subiendo archivos a Storage...');
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Subiendo archivo ${i + 1}/${files.length}: ${file.name}`);
      
      const timestamp = Date.now();
      const safeName = (file.name || 'archivo').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      const storagePath = `prestamos/${tipo}/${uid}/${timestamp}_${safeName}`;
      const storageRef = ref(storage, storagePath);

      try {
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        archivosSubidos.push({
          nombre: file.name,
          ruta: storagePath,
          url: url,
          tamaño: file.size,
          tipoMime: file.type
        });

        console.log(`✅ Archivo subido: ${file.name}`);
      } catch (uploadError) {
        console.error(`❌ Error subiendo archivo ${file.name}:`, uploadError);
        throw new Error(`Error al subir archivo: ${file.name}`);
      }
    }

    console.log('📁 Archivos subidos exitosamente:', archivosSubidos.length);

    // Preparar datos del documento para Firestore
    const docData = {
      uid: uid,
      rut: rutLimpio,
      nombre: datos.nombre || '',
      email: datos.email || '',
      tipoPrestamo: tipo,
      comentario: datos.comentario || '',
      archivos: archivosSubidos,
      estado: 'pendiente',
      creadoPor: uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    console.log('💾 Guardando documento en Firestore...');
    console.log('Estructura del documento:', docData);

    // Guardar documento en Firestore
    const docRef = await addDoc(collection(db, 'solicitudesPrestamos'), docData);

    console.log('✅ Documento guardado con ID:', docRef.id);

    return {
      success: true,
      id: docRef.id,
      doc: docData,
      archivosSubidos: archivosSubidos.length
    };
    
  } catch (error) {
    console.error('❌ Error guardando solicitud de prestamo:', error);
    
    // Proporcionar más detalles del error
    let errorMessage = error.message || String(error);
    
    if (error.code) {
      switch (error.code) {
        case 'permission-denied':
          errorMessage = 'No tiene permisos para crear esta solicitud. Verifique que esté autenticado correctamente.';
          break;
        case 'unauthenticated':
          errorMessage = 'Debe iniciar sesión para crear una solicitud.';
          break;
        case 'invalid-argument':
          errorMessage = 'Los datos de la solicitud no son válidos.';
          break;
        default:
          errorMessage = `Error de Firebase: ${error.code} - ${error.message}`;
      }
    }
    
    return {
      success: false,
      error: errorMessage,
      code: error.code || 'unknown',
      details: error
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
    console.error('❌ Error al obtener solicitudesPrestamos:', error);
    return [];
  }
}

/**
 * Función auxiliar para validar archivos antes de subirlos
 */
export function validarArchivos(files) {
  const errores = [];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  
  if (!files || files.length === 0) {
    errores.push('Debe adjuntar al menos un archivo');
    return { valido: false, errores };
  }
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (file.size > MAX_FILE_SIZE) {
      errores.push(`El archivo "${file.name}" es muy grande (máximo 10MB)`);
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      errores.push(`El archivo "${file.name}" no es un tipo válido (solo JPG, PNG, PDF)`);
    }
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

export default {
  guardarSolicitudPrestamo,
  obtenerSolicitudesPrestamosPorUID,
  validarArchivos
};
