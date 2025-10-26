// Lógica de subida y guardado en Firebase para solicitudes de préstamos/fondo solidario
import { db, storage, auth } from './firebase-config.js';
import { collection, addDoc, Timestamp, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

/**
 * Guarda una solicitud de préstamo en Firestore y sube los archivos a Storage.
 * - tipo: 'medico' | 'emergencia' | 'libre_disposicion' | 'fondo_solidario'
 * - datos: { nombre, rut, email, comentario }
 * - files: FileList o Array de File
 */
export async function guardarSolicitudPrestamo(tipo, datos, files = []) {
    try {
        const uid = auth && auth.currentUser ? auth.currentUser.uid : (datos.uid || '');
        const rutLimpio = (datos.rut || '').replace(/\./g, '').replace(/-/g, '');

        // Subir archivos a Storage y obtener URLs
        const archivosSubidos = [];

        for (const file of files) {
            const timestamp = Date.now();
            const safeName = file.name.replace(/\s+/g, '_');
            const storagePath = `prestamos/${tipo}/${timestamp}_${safeName}`;
            const storageRef = ref(storage, storagePath);

            // uploadBytes devuelve metadata
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            archivosSubidos.push({
                nombre: file.name,
                ruta: storagePath,
                url: url,
                tamaño: file.size,
                tipoMime: file.type
            });
        }

        // Guardar documento en Firestore (colección: solicitudesPrestamos)
        const docData = {
            uid: uid,
            rut: rutLimpio,
            nombre: datos.nombre || '',
            email: datos.email || '',
            tipoPrestamo: tipo,
            comentario: datos.comentario || '',
            archivos: archivosSubidos,
            estado: 'pendiente',
            creadoPor: uid || 'anonimo',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        const docRef = await addDoc(collection(db, 'solicitudesPrestamos'), docData);

        return {
            success: true,
            id: docRef.id,
            doc: docData
        };

    } catch (error) {
        console.error('Error guardando solicitud de prestamo:', error);
        return {
            success: false,
            error: error.message || String(error)
        };
    }
}

/**
 * Obtiene las solicitudes del usuario actual (para listarlas)
 */
export async function obtenerSolicitudesPrestamosPorUID(uid) {
    try {
        if (!uid) return [];

        // Query en el servidor para obtener solo los documentos del uid
        const q = query(collection(db, 'solicitudesPrestamos'), where('uid', '==', uid));
        const snapshot = await getDocs(q);
        const resultados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        return resultados;
    } catch (error) {
        console.error('Error al obtener solicitudesPrestamos:', error);
        return [];
    }
}

// Nota: exporto funciones principales
export default {
    guardarSolicitudPrestamo,
    obtenerSolicitudesPrestamosPorUID
};
