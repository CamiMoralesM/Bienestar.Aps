// ========================================
// SISTEMA DE COMPRAS DE ENTRETENIMIENTO
// Cine, Jumper Trampoline Park y Gimnasio
// ========================================

import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    Timestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ========================================
// CONSTANTES
// ========================================
const LIMITES_MENSUALES = {
    cine: 4,
    jumper: 6,
    gimnasio: 4
};

const PRECIOS = {
    cine: 7000,        // $7.000 entrada + combo
    jumper: 6500,      // $6.500 entrada + combo  
    gimnasio: 18000    // $18.000 ticket mensual
};

const COLECCIONES = {
    cine: 'comprasCine',
    jumper: 'comprasJumper', 
    gimnasio: 'comprasGimnasio'
};

const NOMBRES_TIPOS = {
    cine: 'Cine',
    jumper: 'Jumper Trampoline Park',
    gimnasio: 'Gimnasio Energy'
};

// ========================================
// FUNCIONES DE VALIDACIÓN DE CUPO
// ========================================

/**
 * Obtiene el rango del mes actual
 */
function obtenerRangoMesActual() {
    const ahora = new Date();
    const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
    
    return {
        inicio: Timestamp.fromDate(primerDia),
        fin: Timestamp.fromDate(ultimoDia)
    };
}

/**
 * Obtiene las compras del mes actual para un tipo específico
 */
async function obtenerComprasMesActual(rut, tipoCompra) {
    try {
        const rango = obtenerRangoMesActual();
        const rutNormalizado = rut.replace(/\./g, '').replace(/-/g, '');
        
        const comprasRef = collection(db, COLECCIONES[tipoCompra]);
        const q = query(
            comprasRef,
            where("rut", "==", rutNormalizado),
            where("createdAt", ">=", rango.inicio),
            where("createdAt", "<=", rango.fin)
        );
        
        const querySnapshot = await getDocs(q);
        const compras = [];
        
        querySnapshot.forEach((doc) => {
            compras.push({ id: doc.id, ...doc.data() });
        });
        
        return compras;
    } catch (error) {
        console.error(`Error al obtener compras de ${tipoCompra}:`, error);
        return [];
    }
}

/**
 * Calcula el total de entradas compradas en el mes
 */
function calcularTotalEntradasMes(compras) {
    return compras.reduce((total, compra) => total + (compra.cantidad || 0), 0);
}

/**
 * Valida si el usuario puede realizar una nueva compra
 */
export async function validarCupoDisponible(rut, tipoCompra) {
    try {
        const comprasMes = await obtenerComprasMesActual(rut, tipoCompra);
        const totalUsado = calcularTotalEntradasMes(comprasMes);
        const limiteMaximo = LIMITES_MENSUALES[tipoCompra];
        const cupoDisponible = limiteMaximo - totalUsado;
        
        return {
            success: true,
            puedeComprar: cupoDisponible > 0,
            totalUsado: totalUsado,
            limiteMaximo: limiteMaximo,
            cupoDisponible: cupoDisponible,
            comprasPrevias: comprasMes.length,
            mensaje: cupoDisponible > 0 
                ? `Tiene ${cupoDisponible} entradas disponibles este mes` 
                : `Ha alcanzado el límite mensual de ${limiteMaximo} entradas`
        };
    } catch (error) {
        console.error("Error en validación de cupo:", error);
        return {
            success: false,
            error: error.message,
            puedeComprar: false
        };
    }
}

// ========================================
// FUNCIONES DE GUARDADO EN FIREBASE
// ========================================

/**
 * Calcula el monto total según el tipo y cantidad
 */
function calcularMontoTotal(tipoCompra, cantidad) {
    return (PRECIOS[tipoCompra] || 0) * cantidad;
}

/**
 * Obtiene el nombre descriptivo del tipo
 */
function getTipoNombre(tipoCompra) {
    return NOMBRES_TIPOS[tipoCompra] || tipoCompra;
}

/**
 * Guarda una compra en Firebase con colección específica
 */
export async function guardarCompra(tipoCompra, formData, comprobanteFile) {
    console.log(`💾 Guardando compra de ${tipoCompra}...`);
    
    try {
        const storage = getStorage();
        let comprobanteUrl = null;
        
        // Subir comprobante si existe
        if (comprobanteFile) {
            const carpetaStorage = {
                'cine': 'comprobantesCine',
                'jumper': 'comprobantesJumper', 
                'gimnasio': 'comprobantesGimnasio'
            };
            
            const storageRef = ref(storage, `${carpetaStorage[tipoCompra]}/${Date.now()}_${comprobanteFile.name}`);
            await uploadBytes(storageRef, comprobanteFile);
            comprobanteUrl = await getDownloadURL(storageRef);
        }
        
        // Mapear nombres de campos según el tipo
        const tipoCapitalizado = tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1);
        
        const compraData = {
            uid: auth.currentUser.uid,
            email: formData.get(`email${tipoCapitalizado}`),
            rut: formData.get(`rut${tipoCapitalizado}`).replace(/\./g, '').replace(/-/g, ''),
            nombre: formData.get(`nombre${tipoCapitalizado}`),
            telefono: formData.get(`telefono${tipoCapitalizado}`),
            fechaCompra: formData.get(`fechaCompra${tipoCapitalizado}`),
            cantidad: parseInt(formData.get(`cantidad${tipoCapitalizado}`)) || 0,
            tipoEntretenimiento: tipoCompra, // Campo para identificar el tipo
            comprobanteUrl: comprobanteUrl,
            comprobanteNombre: comprobanteFile ? comprobanteFile.name : null,
            estado: 'pendiente',
            montoTotal: calcularMontoTotal(tipoCompra, parseInt(formData.get(`cantidad${tipoCapitalizado}`)) || 0),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        
        // Guardar en la colección específica
        const nombreColeccion = COLECCIONES[tipoCompra];
        const docRef = await addDoc(collection(db, nombreColeccion), compraData);
        
        console.log(`✅ Compra guardada en colección: ${nombreColeccion} con ID: ${docRef.id}`);
        
        return {
            success: true,
            id: docRef.id,
            coleccion: nombreColeccion,
            message: `Compra de ${getTipoNombre(tipoCompra)} registrada exitosamente`
        };
        
    } catch (error) {
        console.error('❌ Error al guardar compra:', error);
        throw error;
    }
}

// ========================================
// INICIALIZACIÓN DE FORMULARIOS
// ========================================

/**
 * Inicializa un formulario de compra
 */
export function inicializarFormulario(tipoCompra) {
    const formId = `formCompra${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`;
    const form = document.getElementById(formId);
    
    if (!form) {
        console.error(`Formulario ${formId} no encontrado`);
        return;
    }
    
    // Inicializar fecha
    const tipoCapitalizado = tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1);
    const fechaInput = document.getElementById(`fechaCompra${tipoCapitalizado}`);
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.value = today;
        fechaInput.max = today;
    }
    
    // Inicializar validación de RUT al cambiar
    const rutInput = document.getElementById(`rut${tipoCapitalizado}`);
    if (rutInput) {
        rutInput.addEventListener('blur', async () => {
            const rut = rutInput.value.trim();
            if (rut) {
                await verificarCupoUsuario(rut, tipoCompra);
            }
        });
    }
    
    // Manejar submit del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleFormSubmit(e, tipoCompra);
    });
    
    console.log(`✅ Formulario de ${tipoCompra} inicializado`);
}

/**
 * Verifica el cupo disponible del usuario y muestra la información
 */
async function verificarCupoUsuario(rut, tipoCompra) {
    try {
        const validacion = await validarCupoDisponible(rut, tipoCompra);
        
        if (!validacion.success) {
            console.error('Error en validación:', validacion.error);
            return;
        }
        
        mostrarInfoCupo(validacion, tipoCompra);
        
        if (!validacion.puedeComprar) {
            deshabilitarFormulario(tipoCompra);
        } else {
            habilitarFormulario(tipoCompra);
            actualizarOpcionesSelect(tipoCompra, validacion.cupoDisponible);
        }
    } catch (error) {
        console.error('Error al verificar cupo:', error);
    }
}

/**
 * Muestra la información del cupo disponible
 */
function mostrarInfoCupo(validacion, tipoCompra) {
    let infoContainer = document.getElementById(`info-cupo-${tipoCompra}`);
    
    if (!infoContainer) {
        infoContainer = document.createElement('div');
        infoContainer.id = `info-cupo-${tipoCompra}`;
        infoContainer.style.cssText = `
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 8px;
            font-weight: 500;
        `;
        
        const tipoCapitalizado = tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1);
        const rutInput = document.getElementById(`rut${tipoCapitalizado}`);
        const rutGroup = rutInput?.closest('.form-group');
        if (rutGroup) {
            rutGroup.parentNode.insertBefore(infoContainer, rutGroup.nextSibling);
        }
    }
    
    const emoji = validacion.puedeComprar ? '✅' : '❌';
    const tipoNombre = getTipoNombre(tipoCompra);
    
    if (validacion.puedeComprar) {
        infoContainer.style.background = '#d4edda';
        infoContainer.style.borderLeft = '4px solid #28a745';
        infoContainer.style.color = '#155724';
        
        infoContainer.innerHTML = `
            <strong>${emoji} Cupo Disponible</strong><br>
            ${tipoNombre}: Ha usado ${validacion.totalUsado} de ${validacion.limiteMaximo} entradas mensuales<br>
            <strong>Tiene ${validacion.cupoDisponible} entradas disponibles este mes</strong>
        `;
    } else {
        infoContainer.style.background = '#f8d7da';
        infoContainer.style.borderLeft = '4px solid #dc3545';
        infoContainer.style.color = '#721c24';
        
        infoContainer.innerHTML = `
            <strong>${emoji} Sin Cupo Disponible</strong><br>
            ${tipoNombre}: Ha usado ${validacion.totalUsado} de ${validacion.limiteMaximo} entradas mensuales<br>
            <strong>Ha alcanzado el límite mensual.</strong>
        `;
    }
}

/**
 * Actualiza las opciones del select según el cupo disponible
 */
function actualizarOpcionesSelect(tipoCompra, cupoDisponible) {
    const tipoCapitalizado = tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1);
    const selectId = `cantidad${tipoCapitalizado}`;
    const select = document.getElementById(selectId);
    
    if (!select) return;
    
    select.innerHTML = '<option value="0">Seleccione cantidad</option>';
    
    const maxOpciones = Math.min(cupoDisponible, LIMITES_MENSUALES[tipoCompra]);
    
    for (let i = 1; i <= maxOpciones; i++) {
        select.innerHTML += `<option value="${i}">${i}</option>`;
    }
}

/**
 * Deshabilita el formulario cuando no hay cupo
 */
function deshabilitarFormulario(tipoCompra) {
    const formId = `formCompra${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`;
    const form = document.getElementById(formId);
    
    if (!form) return;
    
    const btnSubmit = form.querySelector('button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = '❌ Sin Cupo Disponible';
        btnSubmit.style.opacity = '0.5';
    }
}

/**
 * Habilita el formulario cuando hay cupo
 */
function habilitarFormulario(tipoCompra) {
    const formId = `formCompra${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`;
    const form = document.getElementById(formId);
    
    if (!form) return;
    
    const btnSubmit = form.querySelector('button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = `Enviar Compra ${getTipoNombre(tipoCompra)}`;
        btnSubmit.style.opacity = '1';
    }
}

/**
 * Maneja el envío del formulario
 */
async function handleFormSubmit(e, tipoCompra) {
    e.preventDefault();
    console.log(`🔍 Iniciando envío del formulario de ${tipoCompra}`);
    
    try {
        const form = e.target;
        const formData = new FormData(form);
        const tipoCapitalizado = tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1);
        const comprobanteInput = document.getElementById(`comprobante${tipoCapitalizado}`);
        const comprobanteFile = comprobanteInput?.files[0];
        
        // Validaciones
        const cantidad = parseInt(formData.get(`cantidad${tipoCapitalizado}`)) || 0;
        
        if (cantidad === 0) {
            alert('⚠️ Debe seleccionar al menos una entrada');
            return;
        }
        
        if (!comprobanteFile) {
            alert('⚠️ Debe adjuntar el comprobante de transferencia');
            return;
        }
        
        // Validar cupo
        const rutInput = document.getElementById(`rut${tipoCapitalizado}`);
        const rut = rutInput?.value.trim();
        
        if (!rut) {
            alert('⚠️ Debe ingresar su RUT');
            return;
        }
        
        const validacion = await validarCupoDisponible(rut, tipoCompra);
        
        if (!validacion.success || !validacion.puedeComprar) {
            alert(`❌ ${validacion.mensaje}\n\nNo puede realizar más compras este mes.`);
            return;
        }
        
        if (cantidad > validacion.cupoDisponible) {
            alert(`❌ La compra excede su cupo disponible.\n\nDisponible: ${validacion.cupoDisponible} entradas\nIntenta comprar: ${cantidad} entradas`);
            return;
        }
        
        // Deshabilitar botón
        const btnSubmit = form.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = '⏳ Guardando...';
        }
        
        // Guardar compra
        const resultado = await guardarCompra(tipoCompra, formData, comprobanteFile);
        
        if (resultado.success) {
            const tipoNombre = getTipoNombre(tipoCompra);
            const montoTotal = calcularMontoTotal(tipoCompra, cantidad);
            
            alert(`✅ ${resultado.message}\n\nID: ${resultado.id}\nColección: ${resultado.coleccion}\nCantidad: ${cantidad} entradas\nMonto Total: $${montoTotal.toLocaleString('es-CL')}`);
            
            form.reset();
            
            // Limpiar información de cupo
            const infoContainer = document.getElementById(`info-cupo-${tipoCompra}`);
            if (infoContainer) {
                infoContainer.remove();
            }
            
            setTimeout(() => window.location.reload(), 2000);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert(`❌ Error: ${error.message}`);
    } finally {
        const form = e.target;
        const btnSubmit = form.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            const tipoNombre = getTipoNombre(tipoCompra);
            btnSubmit.textContent = `Enviar Compra ${tipoNombre}`;
        }
    }
}

// ========================================
// FUNCIONES DE ADMINISTRACIÓN
// ========================================

/**
 * Obtiene todas las compras de un tipo específico (para admin)
 */
export async function obtenerComprasPorTipo(tipoCompra, filtros = {}) {
    try {
        const coleccionRef = collection(db, COLECCIONES[tipoCompra]);
        let q = coleccionRef;
        
        // Aplicar filtros si existen
        if (filtros.fecha) {
            const fecha = new Date(filtros.fecha);
            const inicioDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
            const finDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59);
            
            q = query(q, 
                where("createdAt", ">=", Timestamp.fromDate(inicioDia)),
                where("createdAt", "<=", Timestamp.fromDate(finDia))
            );
        }
        
        if (filtros.estado) {
            q = query(q, where("estado", "==", filtros.estado));
        }
        
        const querySnapshot = await getDocs(q);
        const compras = [];
        
        querySnapshot.forEach((doc) => {
            compras.push({
                id: doc.id,
                ...doc.data(),
                tipoCompra: tipoCompra
            });
        });
        
        return compras;
    } catch (error) {
        console.error(`Error al obtener compras de ${tipoCompra}:`, error);
        return [];
    }
}

/**
 * Obtiene estadísticas de compras por tipo
 */
export async function obtenerEstadisticasCompras(tipoCompra) {
    try {
        const compras = await obtenerComprasPorTipo(tipoCompra);
        
        const estadisticas = {
            total: compras.length,
            pendientes: compras.filter(c => c.estado === 'pendiente').length,
            aprobadas: compras.filter(c => c.estado === 'aprobado').length,
            rechazadas: compras.filter(c => c.estado === 'rechazado').length,
            montoTotal: compras.reduce((total, c) => total + (c.montoTotal || 0), 0),
            entradasTotales: compras.reduce((total, c) => total + (c.cantidad || 0), 0)
        };
        
        return estadisticas;
    } catch (error) {
        console.error(`Error al obtener estadísticas de ${tipoCompra}:`, error);
        return null;
    }
}

// ========================================
// EXPORTAR
// ========================================
export {
    inicializarFormulario,
    LIMITES_MENSUALES,
    PRECIOS,
    COLECCIONES,
    NOMBRES_TIPOS
};
