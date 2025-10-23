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
        
        const comprasRef = collection(db, `compras${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`);
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
// FUNCIONES DE GUARDADO
// ========================================

/**
 * Guarda una compra en Firebase
 */
export async function guardarCompra(tipoCompra, formData, comprobanteFile) {
    console.log(`💾 Guardando compra de ${tipoCompra}...`);
    
    try {
        const storage = getStorage();
        let comprobanteUrl = null;
        
        // Subir comprobante si existe
        if (comprobanteFile) {
            const storageRef = ref(storage, `comprobantes${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}/${Date.now()}_${comprobanteFile.name}`);
            await uploadBytes(storageRef, comprobanteFile);
            comprobanteUrl = await getDownloadURL(storageRef);
        }
        
        const compraData = {
            uid: auth.currentUser.uid,
            email: formData.get(`email${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`),
            rut: formData.get(`rut${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`).replace(/\./g, '').replace(/-/g, ''),
            nombre: formData.get(`nombre${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`),
            telefono: formData.get(`telefono${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`),
            fechaCompra: formData.get(`fechaCompra${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`),
            cantidad: parseInt(formData.get(`cantidad${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`)) || 0,
            comprobanteUrl: comprobanteUrl,
            estado: 'pendiente',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        
        const coleccion = `compras${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`;
        const docRef = await addDoc(collection(db, coleccion), compraData);
        
        return {
            success: true,
            id: docRef.id,
            message: `Compra de ${tipoCompra} registrada exitosamente`
        };
        
    } catch (error) {
        console.error('❌ Error:', error);
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
    const fechaInput = document.getElementById(`fechaCompra${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`);
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.value = today;
        fechaInput.max = today;
    }
    
    // Inicializar validación de RUT al cambiar
    const rutInput = document.getElementById(`rut${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`);
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
        
        const rutInput = document.getElementById(`rut${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`);
        const rutGroup = rutInput?.closest('.form-group');
        if (rutGroup) {
            rutGroup.parentNode.insertBefore(infoContainer, rutGroup.nextSibling);
        }
    }
    
    const emoji = validacion.puedeComprar ? '✅' : '❌';
    const tipoNombre = tipoCompra === 'cine' ? 'Cine' : tipoCompra === 'jumper' ? 'Jumper Park' : 'Gimnasio';
    
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
    const selectId = `cantidad${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`;
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
        btnSubmit.textContent = 'Enviar Compra';
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
        const comprobanteInput = document.getElementById(`comprobante${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`);
        const comprobanteFile = comprobanteInput?.files[0];
        
        // Validaciones
        const cantidad = parseInt(formData.get(`cantidad${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`)) || 0;
        
        if (cantidad === 0) {
            alert('⚠️ Debe seleccionar al menos una entrada');
            return;
        }
        
        if (!comprobanteFile) {
            alert('⚠️ Debe adjuntar el comprobante de transferencia');
            return;
        }
        
        // Validar cupo
        const rutInput = document.getElementById(`rut${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`);
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
            const tipoNombre = tipoCompra === 'cine' ? 'Cine' : tipoCompra === 'jumper' ? 'Jumper Park' : 'Gimnasio';
            alert(`✅ ${resultado.message}\n\nID: ${resultado.id}`);
            
            form.reset();
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
            btnSubmit.textContent = 'Enviar Compra';
        }
    }
}

// ========================================
// EXPORTAR
// ========================================
export {
    inicializarFormulario,
    LIMITES_MENSUALES
};
