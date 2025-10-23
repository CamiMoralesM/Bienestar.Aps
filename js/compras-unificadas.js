// ========================================
// SISTEMA UNIFICADO DE COMPRAS
// Gas, Cine, Jumper Trampoline Park y Gimnasio
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
// CONSTANTES UNIFICADAS
// ========================================

// Límites mensuales por tipo de compra
const LIMITES_MENSUALES = {
    // Gas (por temporada)
    gas_temporada_normal: 4,
    gas_temporada_alta: 6,
    
    // Entretenimiento
    cine: 4,
    jumper: 6,
    gimnasio: 4
};

// Precios por tipo
const PRECIOS = {
    cine: 7000,        // $7.000 entrada + combo
    jumper: 6500,      // $6.500 entrada + combo  
    gimnasio: 18000    // $18.000 ticket mensual
};

// Colecciones de Firebase
const COLECCIONES = {
    gas: 'comprasGas',
    cine: 'comprasCine',
    jumper: 'comprasJumper',
    gimnasio: 'comprasGimnasio'
};

// Nombres descriptivos
const NOMBRES_TIPOS = {
    gas: 'Compra de Gas',
    cine: 'Cine',
    jumper: 'Jumper Trampoline Park',
    gimnasio: 'Gimnasio Energy'
};

// ========================================
// FUNCIONES DE TEMPORADA (GAS)
// ========================================

function esTemporadaAlta() {
    const fecha = new Date();
    const mes = fecha.getMonth() + 1;
    return mes >= 6 && mes <= 9;
}

function obtenerLimiteMaximoGas() {
    return esTemporadaAlta() ? LIMITES_MENSUALES.gas_temporada_alta : LIMITES_MENSUALES.gas_temporada_normal;
}

// ========================================
// FUNCIONES DE RANGO DE FECHAS
// ========================================

function obtenerRangoMesActual() {
    const ahora = new Date();
    const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
    
    return {
        inicio: Timestamp.fromDate(primerDia),
        fin: Timestamp.fromDate(ultimoDia)
    };
}

// ========================================
// VALIDACIÓN DE CUPO UNIFICADA
// ========================================

/**
 * Obtiene las compras del mes actual para cualquier tipo
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
 * Calcula el total usado según el tipo de compra
 */
function calcularTotalUsado(compras, tipoCompra) {
    if (tipoCompra === 'gas') {
        // Para gas, sumar todas las cargas
        let total = 0;
        compras.forEach(compra => {
            if (compra.cargas_lipigas) {
                total += (compra.cargas_lipigas.kg5 || 0);
                total += (compra.cargas_lipigas.kg11 || 0);
                total += (compra.cargas_lipigas.kg15 || 0);
                total += (compra.cargas_lipigas.kg45 || 0);
            }
            if (compra.cargas_abastible) {
                total += (compra.cargas_abastible.kg5 || 0);
                total += (compra.cargas_abastible.kg11 || 0);
                total += (compra.cargas_abastible.kg15 || 0);
                total += (compra.cargas_abastible.kg45 || 0);
            }
        });
        return total;
    } else {
        // Para entretenimiento, sumar cantidades
        return compras.reduce((total, compra) => total + (compra.cantidad || 0), 0);
    }
}

/**
 * Valida cupo disponible para cualquier tipo de compra
 */
export async function validarCupoDisponible(rut, tipoCompra) {
    try {
        const comprasMes = await obtenerComprasMesActual(rut, tipoCompra);
        const totalUsado = calcularTotalUsado(comprasMes, tipoCompra);
        
        let limiteMaximo;
        if (tipoCompra === 'gas') {
            limiteMaximo = obtenerLimiteMaximoGas();
        } else {
            limiteMaximo = LIMITES_MENSUALES[tipoCompra];
        }
        
        const cupoDisponible = limiteMaximo - totalUsado;
        
        return {
            success: true,
            puedeComprar: cupoDisponible > 0,
            totalUsado: totalUsado,
            limiteMaximo: limiteMaximo,
            cupoDisponible: cupoDisponible,
            comprasPrevias: comprasMes.length,
            tipoCompra: tipoCompra,
            temporada: tipoCompra === 'gas' ? (esTemporadaAlta() ? 'alta' : 'normal') : null,
            mensaje: cupoDisponible > 0 
                ? `Tiene ${cupoDisponible} ${tipoCompra === 'gas' ? 'cargas' : 'entradas'} disponibles este mes` 
                : `Ha alcanzado el límite mensual de ${limiteMaximo} ${tipoCompra === 'gas' ? 'cargas' : 'entradas'}`
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
// GUARDADO UNIFICADO EN FIREBASE
// ========================================

/**
 * Guarda compra de gas en Firebase
 */
async function guardarCompraGas(formData, comprobanteFile) {
    console.log('💾 Guardando compra de gas...');
    
    try {
        const compraLipigasValue = formData.get('compraLipigas') === 'si';
        const compraAbastibleValue = formData.get('compraAbastible') === 'si';

        // Subir comprobante si existe
        let comprobanteUrl = null;
        if (comprobanteFile) {
            const storage = getStorage();
            const storageRef = ref(storage, `comprobantesGas/${Date.now()}_${comprobanteFile.name}`);
            await uploadBytes(storageRef, comprobanteFile);
            comprobanteUrl = await getDownloadURL(storageRef);
        }

        const compraData = {
            uid: auth.currentUser.uid,
            email: formData.get('emailGas'),
            rut: formData.get('rutGas').replace(/\./g, '').replace(/-/g, ''),
            nombre: formData.get('nombreGas'),
            telefono: formData.get('telefonoGas'),
            fechaCompra: formData.get('fechaCompraGas'),
            
            compraLipigas: compraLipigasValue,
            cargas_lipigas: compraLipigasValue ? {
                kg5: parseInt(formData.get('lipigas5')) || 0,
                kg11: parseInt(formData.get('lipigas11')) || 0,
                kg15: parseInt(formData.get('lipigas15')) || 0,
                kg45: parseInt(formData.get('lipigas45')) || 0
            } : null,
            
            compraAbastible: compraAbastibleValue,
            cargas_abastible: compraAbastibleValue ? {
                kg5: parseInt(formData.get('abastible5')) || 0,
                kg11: parseInt(formData.get('abastible11')) || 0,
                kg15: parseInt(formData.get('abastible15')) || 0,
                kg45: parseInt(formData.get('abastible45')) || 0
            } : null,
            
            saldoFavor: formData.get('saldoFavor') || null,
            comprobanteUrl: comprobanteUrl,
            comprobanteNombre: comprobanteFile ? comprobanteFile.name : null,
            
            estado: 'pendiente',
            tipoCompra: 'gas',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        const docRef = await addDoc(collection(db, COLECCIONES.gas), compraData);
        
        return {
            success: true,
            id: docRef.id,
            coleccion: COLECCIONES.gas,
            message: 'Compra de gas registrada exitosamente'
        };

    } catch (error) {
        console.error('❌ Error al guardar compra de gas:', error);
        throw error;
    }
}

/**
 * Guarda compra de entretenimiento en Firebase
 */
async function guardarCompraEntretenimiento(tipoCompra, formData, comprobanteFile) {
    console.log(`💾 Guardando compra de ${tipoCompra}...`);
    
    try {
        // Subir comprobante si existe
        let comprobanteUrl = null;
        if (comprobanteFile) {
            const storage = getStorage();
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
            tipoEntretenimiento: tipoCompra,
            tipoCompra: 'entretenimiento',
            comprobanteUrl: comprobanteUrl,
            comprobanteNombre: comprobanteFile ? comprobanteFile.name : null,
            estado: 'pendiente',
            montoTotal: calcularMontoTotal(tipoCompra, parseInt(formData.get(`cantidad${tipoCapitalizado}`)) || 0),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        
        const docRef = await addDoc(collection(db, COLECCIONES[tipoCompra]), compraData);
        
        console.log(`✅ Compra guardada en colección: ${COLECCIONES[tipoCompra]} con ID: ${docRef.id}`);
        
        return {
            success: true,
            id: docRef.id,
            coleccion: COLECCIONES[tipoCompra],
            message: `Compra de ${NOMBRES_TIPOS[tipoCompra]} registrada exitosamente`
        };
        
    } catch (error) {
        console.error('❌ Error al guardar compra de entretenimiento:', error);
        throw error;
    }
}

/**
 * Función unificada para guardar cualquier tipo de compra
 */
export async function guardarCompra(tipoCompra, formData, comprobanteFile) {
    if (tipoCompra === 'gas') {
        return await guardarCompraGas(formData, comprobanteFile);
    } else {
        return await guardarCompraEntretenimiento(tipoCompra, formData, comprobanteFile);
    }
}

// ========================================
// FUNCIONES AUXILIARES
// ========================================

/**
 * Calcula el monto total para entretenimiento
 */
function calcularMontoTotal(tipoCompra, cantidad) {
    if (tipoCompra === 'gas') return 0; // Gas no tiene monto fijo
    return (PRECIOS[tipoCompra] || 0) * cantidad;
}

/**
 * Obtiene el nombre descriptivo del tipo
 */
function getTipoNombre(tipoCompra) {
    return NOMBRES_TIPOS[tipoCompra] || tipoCompra;
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
            rechazadas: compras.filter(c => c.estado === 'rechazado').length
        };
        
        if (tipoCompra === 'gas') {
            estadisticas.cargasTotales = compras.reduce((total, c) => {
                let cargas = 0;
                if (c.cargas_lipigas) {
                    cargas += (c.cargas_lipigas.kg5 || 0) + (c.cargas_lipigas.kg11 || 0) + 
                             (c.cargas_lipigas.kg15 || 0) + (c.cargas_lipigas.kg45 || 0);
                }
                if (c.cargas_abastible) {
                    cargas += (c.cargas_abastible.kg5 || 0) + (c.cargas_abastible.kg11 || 0) + 
                             (c.cargas_abastible.kg15 || 0) + (c.cargas_abastible.kg45 || 0);
                }
                return total + cargas;
            }, 0);
        } else {
            estadisticas.montoTotal = compras.reduce((total, c) => total + (c.montoTotal || 0), 0);
            estadisticas.entradasTotales = compras.reduce((total, c) => total + (c.cantidad || 0), 0);
        }
        
        return estadisticas;
    } catch (error) {
        console.error(`Error al obtener estadísticas de ${tipoCompra}:`, error);
        return null;
    }
}

// ========================================
// INICIALIZACIÓN DE FORMULARIOS
// ========================================

/**
 * Inicializa cualquier formulario de compra
 */
function inicializarFormulario(tipoCompra) {
    if (tipoCompra === 'gas') {
        inicializarFormularioGas();
    } else {
        inicializarFormularioEntretenimiento(tipoCompra);
    }
}

/**
 * Inicializa formulario de gas
 */
function inicializarFormularioGas() {
    const form = document.getElementById('formCompraGas');
    if (!form) return;
    
    // Inicializar fecha
    const fechaInput = document.getElementById('fechaCompraGas');
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.value = today;
        fechaInput.max = today;
    }
    
    // Validación de cupo al cambiar RUT
    const rutInput = document.getElementById('rutGas');
    if (rutInput) {
        rutInput.addEventListener('blur', async () => {
            const rut = rutInput.value.trim();
            if (rut) {
                await verificarCupoUsuario(rut, 'gas');
            }
        });
    }
    
    // Manejar submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleFormSubmit(e, 'gas');
    });
}

/**
 * Inicializa formulario de entretenimiento
 */
function inicializarFormularioEntretenimiento(tipoCompra) {
    const formId = `formCompra${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`;
    const form = document.getElementById(formId);
    
    if (!form) return;
    
    // Inicializar fecha
    const tipoCapitalizado = tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1);
    const fechaInput = document.getElementById(`fechaCompra${tipoCapitalizado}`);
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.value = today;
        fechaInput.max = today;
    }
    
    // Validación de cupo al cambiar RUT
    const rutInput = document.getElementById(`rut${tipoCapitalizado}`);
    if (rutInput) {
        rutInput.addEventListener('blur', async () => {
            const rut = rutInput.value.trim();
            if (rut) {
                await verificarCupoUsuario(rut, tipoCompra);
            }
        });
    }
    
    // Manejar submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleFormSubmit(e, tipoCompra);
    });
}

/**
 * Verifica el cupo disponible del usuario
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
            if (tipoCompra !== 'gas') {
                actualizarOpcionesSelect(tipoCompra, validacion.cupoDisponible);
            }
        }
    } catch (error) {
        console.error('Error al verificar cupo:', error);
    }
}

/**
 * Muestra información del cupo disponible
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
        
        // Insertar después del campo RUT
        let rutInput;
        if (tipoCompra === 'gas') {
            rutInput = document.getElementById('rutGas');
        } else {
            const tipoCapitalizado = tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1);
            rutInput = document.getElementById(`rut${tipoCapitalizado}`);
        }
        
        const rutGroup = rutInput?.closest('.form-group');
        if (rutGroup) {
            rutGroup.parentNode.insertBefore(infoContainer, rutGroup.nextSibling);
        }
    }
    
    const tipoNombre = getTipoNombre(tipoCompra);
    const emoji = validacion.puedeComprar ? '✅' : '❌';
    const unidad = tipoCompra === 'gas' ? 'cargas' : 'entradas';
    
    if (validacion.puedeComprar) {
        infoContainer.style.background = '#d4edda';
        infoContainer.style.borderLeft = '4px solid #28a745';
        infoContainer.style.color = '#155724';
        
        let mensajeTemporada = '';
        if (tipoCompra === 'gas' && validacion.temporada) {
            mensajeTemporada = `<br>Temporada ${validacion.temporada === 'alta' ? 'Alta' : 'Normal'}`;
        }
        
        infoContainer.innerHTML = `
            <strong>${emoji} Cupo Disponible</strong>${mensajeTemporada}<br>
            ${tipoNombre}: Ha usado ${validacion.totalUsado} de ${validacion.limiteMaximo} ${unidad} mensuales<br>
            <strong>Tiene ${validacion.cupoDisponible} ${unidad} disponibles este mes</strong>
        `;
    } else {
        infoContainer.style.background = '#f8d7da';
        infoContainer.style.borderLeft = '4px solid #dc3545';
        infoContainer.style.color = '#721c24';
        
        infoContainer.innerHTML = `
            <strong>${emoji} Sin Cupo Disponible</strong><br>
            ${tipoNombre}: Ha usado ${validacion.totalUsado} de ${validacion.limiteMaximo} ${unidad} mensuales<br>
            <strong>Ha alcanzado el límite mensual.</strong>
        `;
    }
}

/**
 * Actualiza las opciones del select para entretenimiento
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
    let formId, btnSubmit;
    
    if (tipoCompra === 'gas') {
        formId = 'formCompraGas';
    } else {
        formId = `formCompra${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`;
    }
    
    const form = document.getElementById(formId);
    if (!form) return;
    
    btnSubmit = form.querySelector('button[type="submit"]');
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
    let formId, btnSubmit;
    
    if (tipoCompra === 'gas') {
        formId = 'formCompraGas';
    } else {
        formId = `formCompra${tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1)}`;
    }
    
    const form = document.getElementById(formId);
    if (!form) return;
    
    btnSubmit = form.querySelector('button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.disabled = false;
        const tipoNombre = getTipoNombre(tipoCompra);
        btnSubmit.textContent = `Enviar Compra ${tipoNombre}`;
        btnSubmit.style.opacity = '1';
    }
}

/**
 * Maneja el envío de cualquier formulario
 */
async function handleFormSubmit(e, tipoCompra) {
    e.preventDefault();
    console.log(`🔍 Iniciando envío del formulario de ${tipoCompra}`);
    
    try {
        const form = e.target;
        const formData = new FormData(form);
        
        // Validaciones específicas según el tipo
        if (tipoCompra === 'gas') {
            return await handleSubmitGas(form, formData);
        } else {
            return await handleSubmitEntretenimiento(form, formData, tipoCompra);
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert(`❌ Error: ${error.message}`);
    }
}

/**
 * Maneja envío específico de gas
 */
async function handleSubmitGas(form, formData) {
    // Lógica específica para gas (ya implementada en el archivo original)
    // Aquí iría toda la validación de gas con Lipigas/Abastible
    
    const comprandoLipigas = formData.get('compraLipigas') === 'si';
    const comprandoAbastible = formData.get('compraAbastible') === 'si';
    
    if (!comprandoLipigas && !comprandoAbastible) {
        alert('⚠️ Debe seleccionar al menos una empresa');
        return false;
    }
    
    // Validar cupo
    const rut = formData.get('rutGas');
    const validacion = await validarCupoDisponible(rut, 'gas');
    
    if (!validacion.success || !validacion.puedeComprar) {
        alert(`❌ ${validacion.mensaje}`);
        return false;
    }
    
    const comprobanteFile = document.getElementById('comprobanteGas').files[0];
    if (!comprobanteFile) {
        alert('⚠️ Debe adjuntar el comprobante');
        return false;
    }
    
    // Guardar
    const resultado = await guardarCompra('gas', formData, comprobanteFile);
    
    if (resultado.success) {
        alert(`✅ ${resultado.message}\n\nID: ${resultado.id}`);
        form.reset();
        setTimeout(() => window.location.reload(), 2000);
    }
}

/**
 * Maneja envío específico de entretenimiento
 */
async function handleSubmitEntretenimiento(form, formData, tipoCompra) {
    const tipoCapitalizado = tipoCompra.charAt(0).toUpperCase() + tipoCompra.slice(1);
    const cantidad = parseInt(formData.get(`cantidad${tipoCapitalizado}`)) || 0;
    
    if (cantidad === 0) {
        alert('⚠️ Debe seleccionar al menos una entrada');
        return false;
    }
    
    const comprobanteFile = document.getElementById(`comprobante${tipoCapitalizado}`).files[0];
    if (!comprobanteFile) {
        alert('⚠️ Debe adjuntar el comprobante de transferencia');
        return false;
    }
    
    // Validar cupo
    const rut = formData.get(`rut${tipoCapitalizado}`);
    const validacion = await validarCupoDisponible(rut, tipoCompra);
    
    if (!validacion.success || !validacion.puedeComprar) {
        alert(`❌ ${validacion.mensaje}`);
        return false;
    }
    
    if (cantidad > validacion.cupoDisponible) {
        alert(`❌ La compra excede su cupo disponible.\n\nDisponible: ${validacion.cupoDisponible} entradas\nIntenta comprar: ${cantidad} entradas`);
        return false;
    }
    
    // Guardar
    const resultado = await guardarCompra(tipoCompra, formData, comprobanteFile);
    
    if (resultado.success) {
        const tipoNombre = getTipoNombre(tipoCompra);
        const montoTotal = calcularMontoTotal(tipoCompra, cantidad);
        
        alert(`✅ ${resultado.message}\n\nID: ${resultado.id}\nCantidad: ${cantidad} entradas\nMonto Total: $${montoTotal.toLocaleString('es-CL')}`);
        
        form.reset();
        
        // Limpiar información de cupo
        const infoContainer = document.getElementById(`info-cupo-${tipoCompra}`);
        if (infoContainer) {
            infoContainer.remove();
        }
        
        setTimeout(() => window.location.reload(), 2000);
    }
}

// ========================================
// EXPORTAR FUNCIONES PRINCIPALES
// ========================================
export {
    // Constantes
    LIMITES_MENSUALES,
    PRECIOS,
    COLECCIONES,
    NOMBRES_TIPOS,
    
    // Funciones de temporada
    esTemporadaAlta,
    obtenerLimiteMaximoGas,
    
    // Funciones principales
    obtenerComprasMesActual,
    calcularTotalUsado,
    guardarCompraGas,
    guardarCompraEntretenimiento,
    
    // Administración
    obtenerComprasPorTipo,
    obtenerEstadisticasCompras,
    
    // Inicialización
    inicializarFormulario
};
