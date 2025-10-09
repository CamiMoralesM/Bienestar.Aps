import { db } from './firebase-config.js';
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    addDoc,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==================== FUNCIONARIOS ====================

// Obtener todos los funcionarios
async function obtenerFuncionarios(filtros = {}) {
    try {
        let q = collection(db, 'funcionarios');
        
        // Aplicar filtros
        if (filtros.estado) {
            q = query(q, where('estado', '==', filtros.estado));
        }
        if (filtros.centroSalud) {
            q = query(q, where('centroSalud', '==', filtros.centroSalud));
        }
        
        const querySnapshot = await getDocs(q);
        const funcionarios = [];
        
        querySnapshot.forEach((doc) => {
            funcionarios.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return funcionarios;
    } catch (error) {
        console.error('Error al obtener funcionarios:', error);
        return [];
    }
}

// Obtener funcionario por ID
async function obtenerFuncionario(id) {
    try {
        const docRef = doc(db, 'funcionarios', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        }
        return null;
    } catch (error) {
        console.error('Error al obtener funcionario:', error);
        return null;
    }
}

// Actualizar funcionario
async function actualizarFuncionario(id, datos) {
    try {
        const docRef = doc(db, 'funcionarios', id);
        await updateDoc(docRef, {
            ...datos,
            updatedAt: Timestamp.now()
        });
        return { success: true };
    } catch (error) {
        console.error('Error al actualizar funcionario:', error);
        return { success: false, error: error.message };
    }
}

// ==================== SOLICITUDES ====================

// Crear nueva solicitud
async function crearSolicitud(datosSolicitud) {
    try {
        const solicitudRef = await addDoc(collection(db, 'solicitudes'), {
            ...datosSolicitud,
            estado: 'pendiente',
            prioridad: 'normal',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        
        return { 
            success: true, 
            id: solicitudRef.id 
        };
    } catch (error) {
        console.error('Error al crear solicitud:', error);
        return { success: false, error: error.message };
    }
}

// Obtener solicitudes por funcionario
async function obtenerSolicitudesFuncionario(funcionarioId) {
    try {
        const q = query(
            collection(db, 'solicitudes'),
            where('funcionarioId', '==', funcionarioId),
            orderBy('createdAt', 'desc')
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
        console.error('Error al obtener solicitudes:', error);
        return [];
    }
}

// Obtener todas las solicitudes (Admin)
async function obtenerTodasSolicitudes(filtros = {}) {
    try {
        let q = collection(db, 'solicitudes');
        const conditions = [];
        
        if (filtros.estado) {
            conditions.push(where('estado', '==', filtros.estado));
        }
        if (filtros.prioridad) {
            conditions.push(where('prioridad', '==', filtros.prioridad));
        }
        
        if (conditions.length > 0) {
            q = query(q, ...conditions, orderBy('createdAt', 'desc'));
        } else {
            q = query(q, orderBy('createdAt', 'desc'));
        }
        
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
        console.error('Error al obtener solicitudes:', error);
        return [];
    }
}

// Actualizar estado de solicitud
async function actualizarSolicitud(solicitudId, datos) {
    try {
        const docRef = doc(db, 'solicitudes', solicitudId);
        await updateDoc(docRef, {
            ...datos,
            updatedAt: Timestamp.now()
        });
        return { success: true };
    } catch (error) {
        console.error('Error al actualizar solicitud:', error);
        return { success: false, error: error.message };
    }
}

// Aprobar solicitud
async function aprobarSolicitud(solicitudId, comentario = '') {
    try {
        const docRef = doc(db, 'solicitudes', solicitudId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error('Solicitud no encontrada');
        }
        
        const solicitud = docSnap.data();
        
        // Actualizar solicitud
        await updateDoc(docRef, {
            estado: 'aprobada',
            fechaRespuesta: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        
        // Crear registro de beneficio
        await addDoc(collection(db, 'beneficios'), {
            funcionarioId: solicitud.funcionarioId,
            tipo: solicitud.tipoBeneficio,
            nombre: solicitud.tipoBeneficio.replace(/_/g, ' ').toUpperCase(),
            monto: solicitud.monto,
            estado: 'pendiente',
            solicitudId: solicitudId,
            createdAt: Timestamp.now()
        });
        
        return { success: true, message: 'Solicitud aprobada exitosamente' };
    } catch (error) {
        console.error('Error al aprobar solicitud:', error);
        return { success: false, error: error.message };
    }
}

// Rechazar solicitud
async function rechazarSolicitud(solicitudId, motivo) {
    try {
        const docRef = doc(db, 'solicitudes', solicitudId);
        await updateDoc(docRef, {
            estado: 'rechazada',
            motivoRechazo: motivo,
            fechaRespuesta: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        
        return { success: true, message: 'Solicitud rechazada' };
    } catch (error) {
        console.error('Error al rechazar solicitud:', error);
        return { success: false, error: error.message };
    }
}

// ==================== BENEFICIOS ====================

// Obtener beneficios por funcionario
async function obtenerBeneficiosFuncionario(funcionarioId) {
    try {
        const q = query(
            collection(db, 'beneficios'),
            where('funcionarioId', '==', funcionarioId),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const beneficios = [];
        
        querySnapshot.forEach((doc) => {
            beneficios.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return beneficios;
    } catch (error) {
        console.error('Error al obtener beneficios:', error);
        return [];
    }
}

// Calcular total de beneficios por año
async function calcularTotalBeneficios(funcionarioId, año) {
    try {
        const beneficios = await obtenerBeneficiosFuncionario(funcionarioId);
        
        const total = beneficios
            .filter(b => {
                const fecha = b.createdAt.toDate();
                return fecha.getFullYear() === año && b.estado === 'pagado';
            })
            .reduce((sum, b) => sum + (b.monto || 0), 0);
        
        return total;
    } catch (error) {
        console.error('Error al calcular total:', error);
        return 0;
    }
}

// ==================== CONVENIOS ====================

// Obtener todos los convenios activos
async function obtenerConvenios(filtros = {}) {
    try {
        let q = collection(db, 'convenios');
        
        if (filtros.categoria) {
            q = query(q, where('categoria', '==', filtros.categoria));
        }
        if (filtros.estado) {
            q = query(q, where('estado', '==', filtros.estado));
        } else {
            q = query(q, where('estado', '==', 'activo'));
        }
        
        const querySnapshot = await getDocs(q);
        const convenios = [];
        
        querySnapshot.forEach((doc) => {
            convenios.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return convenios;
    } catch (error) {
        console.error('Error al obtener convenios:', error);
        return [];
    }
}

// Crear nuevo convenio
async function crearConvenio(datosConvenio) {
    try {
        const convenioRef = await addDoc(collection(db, 'convenios'), {
            ...datosConvenio,
            estado: 'activo',
            usosMensual: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        
        return { 
            success: true, 
            id: convenioRef.id 
        };
    } catch (error) {
        console.error('Error al crear convenio:', error);
        return { success: false, error: error.message };
    }
}

// Actualizar convenio
async function actualizarConvenio(convenioId, datos) {
    try {
        const docRef = doc(db, 'convenios', convenioId);
        await updateDoc(docRef, {
            ...datos,
            updatedAt: Timestamp.now()
        });
        return { success: true };
    } catch (error) {
        console.error('Error al actualizar convenio:', error);
        return { success: false, error: error.message };
    }
}

// ==================== ESTADÍSTICAS ====================

// Obtener estadísticas generales para admin
async function obtenerEstadisticasGenerales() {
    try {
        // Contar funcionarios activos
        const funcionariosQuery = query(
            collection(db, 'funcionarios'),
            where('estado', '==', 'activo')
        );
        const funcionariosSnap = await getDocs(funcionariosQuery);
        const totalFuncionarios = funcionariosSnap.size;
        
        // Contar solicitudes pendientes
        const solicitudesQuery = query(
            collection(db, 'solicitudes'),
            where('estado', '==', 'pendiente')
        );
        const solicitudesSnap = await getDocs(solicitudesQuery);
        const solicitudesPendientes = solicitudesSnap.size;
        
        // Contar convenios activos
        const conveniosQuery = query(
            collection(db, 'convenios'),
            where('estado', '==', 'activo')
        );
        const conveniosSnap = await getDocs(conveniosQuery);
        const conveniosActivos = conveniosSnap.size;
        
        // Calcular total de beneficios entregados
        const beneficiosQuery = query(
            collection(db, 'beneficios'),
            where('estado', '==', 'pagado')
        );
        const beneficiosSnap = await getDocs(beneficiosQuery);
        
        let totalBeneficios = 0;
        beneficiosSnap.forEach((doc) => {
            totalBeneficios += doc.data().monto || 0;
        });
        
        return {
            totalFuncionarios,
            solicitudesPendientes,
            conveniosActivos,
            totalBeneficios
        };
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return {
            totalFuncionarios: 0,
            solicitudesPendientes: 0,
            conveniosActivos: 0,
            totalBeneficios: 0
        };
    }
}

// Exportar funciones
export {
    // Funcionarios
    obtenerFuncionarios,
    obtenerFuncionario,
    actualizarFuncionario,
    
    // Solicitudes
    crearSolicitud,
    obtenerSolicitudesFuncionario,
    obtenerTodasSolicitudes,
    actualizarSolicitud,
    aprobarSolicitud,
    rechazarSolicitud,
    
    // Beneficios
    obtenerBeneficiosFuncionario,
    calcularTotalBeneficios,
    
    // Convenios
    obtenerConvenios,
    crearConvenio,
    actualizarConvenio,
    
    // Estadísticas
    obtenerEstadisticasGenerales
};
