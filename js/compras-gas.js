// ========================================
// SISTEMA DE COMPRAS DE GAS - VERSIÓN COMPLETA
// Versión: 3.1 Final
// Fecha: Octubre 2025
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
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ========================================
// VARIABLES GLOBALES
// ========================================
let compraLipigas, compraAbastible, lipigasOpciones, abastibleOpciones, rutInput, formCompraGas;

// ========================================
// INICIALIZACIÓN
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Inicializando sistema de compras de gas...');
    
    // Obtener referencias a los elementos del DOM
    compraLipigas = document.getElementById('compraLipigas');
    compraAbastible = document.getElementById('compraAbastible');
    lipigasOpciones = document.getElementById('lipigasOpciones');
    abastibleOpciones = document.getElementById('abastibleOpciones');
    rutInput = document.getElementById('rutGas');
    formCompraGas = document.getElementById('formCompraGas');

    if (!formCompraGas) {
        console.error('❌ No se encontró el formulario #formCompraGas');
        return;
    }

    // Inicializar componentes
    inicializarEventListeners();
    inicializarFecha();
    inicializarValidacionCupo();
    
    console.log('✅ Sistema inicializado correctamente');
});

// ========================================
// FUNCIONES DE TEMPORADA
// ========================================

/**
 * Determina si estamos en temporada alta (Junio-Septiembre)
 */
function esTemporadaAlta() {
    const fecha = new Date();
    const mes = fecha.getMonth() + 1; // 1-12
    return mes >= 6 && mes <= 9;
}

/**
 * Obtiene el límite máximo de cargas según la temporada
 */
function obtenerLimiteMaximo() {
    return esTemporadaAlta() ? 6 : 4;
}

// ========================================
// FUNCIONES DE OPCIONES DE GAS
// ========================================

/**
 * Genera las opciones de cantidad según el tipo de carga y temporada
 */
function generarOpcionesPorCarga(tipoCarga, selectElement) {
    const temporadaAlta = esTemporadaAlta();
    let maxOpciones;

    if (temporadaAlta) {
        maxOpciones = (tipoCarga === '45') ? 2 : 3;
    } else {
        maxOpciones = 2;
    }

    selectElement.innerHTML = '<option value="0">0</option>';
    
    for (let i = 1; i <= maxOpciones; i++) {
        selectElement.innerHTML += `<option value="${i}">${i}</option>`;
    }
}

/**
 * Actualiza las opciones de gas para una empresa
 */
function actualizarOpcionesGas(contenedor, empresa) {
    if (!contenedor) return;

    const temporadaAlta = esTemporadaAlta();
    const limiteTotal = obtenerLimiteMaximo();
    
    const temporadaMsg = temporadaAlta ? 
        '🔥 Temporada Alta (Junio-Septiembre): Máximo 3 por carga (2 para 45kg). TOTAL MENSUAL ENTRE AMBAS MARCAS: 6 cargas' :
        '❄️ Temporada Normal (Octubre-Mayo): Máximo 2 por carga. TOTAL MENSUAL ENTRE AMBAS MARCAS: 4 cargas';

    // Crear o actualizar mensaje de límites
    let limiteInfo = contenedor.querySelector('.limites-info');
    if (!limiteInfo) {
        limiteInfo = document.createElement('div');
        limiteInfo.className = 'limites-info';
        limiteInfo.style.cssText = `
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 12px 15px;
            margin-bottom: 20px;
            border-radius: 4px;
            font-size: 14px;
            color: #1976d2;
            font-weight: 500;
        `;
        contenedor.insertBefore(limiteInfo, contenedor.firstChild);
    }
    limiteInfo.textContent = temporadaMsg;

    // Actualizar opciones de cada select
    const select5kg = contenedor.querySelector(`#${empresa}5`);
    const select11kg = contenedor.querySelector(`#${empresa}11`);
    const select15kg = contenedor.querySelector(`#${empresa}15`);
    const select45kg = contenedor.querySelector(`#${empresa}45`);

    if (select5kg) generarOpcionesPorCarga('5', select5kg);
    if (select11kg) generarOpcionesPorCarga('11', select11kg);
    if (select15kg) generarOpcionesPorCarga('15', select15kg);
    if (select45kg) generarOpcionesPorCarga('45', select45kg);

    contenedor.style.display = 'block';
}

// ========================================
// FUNCIONES DE CÁLCULO
// ========================================

/**
 * Calcula el total global de cargas (Lipigas + Abastible)
 */
function calcularTotalGlobal() {
    let totalGlobal = 0;
    
    // Sumar cargas de Lipigas
    if (lipigasOpciones && lipigasOpciones.style.display !== 'none') {
        const selectsLipigas = lipigasOpciones.querySelectorAll('.gas-select');
        selectsLipigas.forEach(select => {
            totalGlobal += parseInt(select.value) || 0;
        });
    }
    
    // Sumar cargas de Abastible
    if (abastibleOpciones && abastibleOpciones.style.display !== 'none') {
        const selectsAbastible = abastibleOpciones.querySelectorAll('.gas-select');
        selectsAbastible.forEach(select => {
            totalGlobal += parseInt(select.value) || 0;
        });
    }
    
    return totalGlobal;
}

/**
 * Actualiza el contador de total de cargas
 */
function actualizarTotal(contenedor) {
    if (!contenedor) return;

    const selects = contenedor.querySelectorAll('.gas-select');
    let totalLocal = 0;
    
    selects.forEach(select => {
        totalLocal += parseInt(select.value) || 0;
    });
    
    // Actualizar contador local del contenedor
    const totalElement = contenedor.querySelector('.total-count');
    if (totalElement) {
        totalElement.textContent = totalLocal;
    }
    
    // Validar límite GLOBAL (Lipigas + Abastible)
    const totalGlobal = calcularTotalGlobal();
    const limiteTotal = obtenerLimiteMaximo();
    const temporadaAlta = esTemporadaAlta();
    
    if (totalGlobal > limiteTotal) {
        alert(`⚠️ El total de cargas entre LIPIGAS y ABASTIBLE no puede superar ${limiteTotal} en este período.\n\n${temporadaAlta ? 'Temporada Alta: Máximo 6 cargas mensuales (sumando ambas marcas)' : 'Temporada Normal: Máximo 4 cargas mensuales (sumando ambas marcas)'}\n\nTotal actual: ${totalGlobal} cargas`);
        
        // Resetear el último select que causó el exceso
        const lastChanged = Array.from(selects).reverse().find(s => parseInt(s.value) > 0);
        if (lastChanged) {
            lastChanged.value = '0';
            actualizarTotal(contenedor);
        }
    }
}

// ========================================
// VALIDACIÓN DE CUPO MENSUAL
// ========================================

/**
 * Obtiene el rango de fechas del mes actual
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
 * Obtiene las compras del mes actual para un usuario
 */
async function obtenerComprasMesActual(rut) {
    try {
        const rango = obtenerRangoMesActual();
        const rutNormalizado = rut.replace(/\./g, '').replace(/-/g, '');
        
        const comprasRef = collection(db, "comprasGas");
        const q = query(
            comprasRef,
            where("rut", "==", rutNormalizado),
            where("createdAt", ">=", rango.inicio),
            where("createdAt", "<=", rango.fin)
        );
        
        const querySnapshot = await getDocs(q);
        const compras = [];
        
        querySnapshot.forEach((doc) => {
            compras.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return compras;
    } catch (error) {
        console.error("Error al obtener compras:", error);
        return [];
    }
}

/**
 * Calcula el total de cargas de un array de compras
 */
function calcularTotalCargasMes(compras) {
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
}

/**
 * Valida si el usuario tiene cupo disponible
 */
async function validarCupoDisponible(rut) {
    try {
        const comprasMes = await obtenerComprasMesActual(rut);
        const totalUsado = calcularTotalCargasMes(comprasMes);
        const limiteMaximo = obtenerLimiteMaximo();
        const cupoDisponible = limiteMaximo - totalUsado;
        const temporada = esTemporadaAlta() ? 'alta' : 'normal';
        
        return {
            success: true,
            puedeComprar: cupoDisponible > 0,
            totalUsado: totalUsado,
            limiteMaximo: limiteMaximo,
            cupoDisponible: cupoDisponible,
            temporada: temporada,
            comprasPrevias: comprasMes.length,
            mensaje: cupoDisponible > 0 
                ? `Tiene ${cupoDisponible} cargas disponibles este mes` 
                : `Ha alcanzado el límite mensual de ${limiteMaximo} cargas`
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

/**
 * Muestra información del cupo al usuario
 */
function mostrarInfoCupo(validacion) {
    let infoContainer = document.getElementById('info-cupo-mensual');
    
    if (!infoContainer) {
        infoContainer = document.createElement('div');
        infoContainer.id = 'info-cupo-mensual';
        infoContainer.style.cssText = `
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 8px;
            font-weight: 500;
        `;
        
        const rutGroup = rutInput.closest('.form-group');
        if (rutGroup) {
            rutGroup.parentNode.insertBefore(infoContainer, rutGroup.nextSibling);
        }
    }

    const temporadaNombre = validacion.temporada === 'alta' ? 'Temporada Alta' : 'Temporada Normal';
    const emoji = validacion.puedeComprar ? '✅' : '❌';
    
    if (validacion.puedeComprar) {
        infoContainer.style.background = '#d4edda';
        infoContainer.style.borderLeft = '4px solid #28a745';
        infoContainer.style.color = '#155724';
        
        infoContainer.innerHTML = `
            <strong>${emoji} Cupo Disponible</strong><br>
            ${temporadaNombre}: Ha usado ${validacion.totalUsado} de ${validacion.limiteMaximo} cargas mensuales<br>
            <strong>Tiene ${validacion.cupoDisponible} cargas disponibles este mes</strong>
        `;
    } else {
        infoContainer.style.background = '#f8d7da';
        infoContainer.style.borderLeft = '4px solid #dc3545';
        infoContainer.style.color = '#721c24';
        
        infoContainer.innerHTML = `
            <strong>${emoji} Sin Cupo Disponible</strong><br>
            ${temporadaNombre}: Ha usado ${validacion.totalUsado} de ${validacion.limiteMaximo} cargas mensuales<br>
            <strong>Ha alcanzado el límite mensual. No puede realizar más compras este mes.</strong>
        `;
    }
}

/**
 * Deshabilita el formulario cuando no hay cupo
 */
function deshabilitarFormulario() {
    if (compraLipigas) compraLipigas.disabled = true;
    if (compraAbastible) compraAbastible.disabled = true;

    const btnSubmit = formCompraGas.querySelector('button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = '❌ Sin Cupo Disponible';
        btnSubmit.style.opacity = '0.5';
        btnSubmit.style.cursor = 'not-allowed';
    }

    if (lipigasOpciones) lipigasOpciones.style.display = 'none';
    if (abastibleOpciones) abastibleOpciones.style.display = 'none';
}

/**
 * Habilita el formulario cuando hay cupo
 */
function habilitarFormulario() {
    if (compraLipigas) compraLipigas.disabled = false;
    if (compraAbastible) compraAbastible.disabled = false;

    const btnSubmit = formCompraGas.querySelector('button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Enviar Compra';
        btnSubmit.style.opacity = '1';
        btnSubmit.style.cursor = 'pointer';
    }
}

/**
 * Verifica el cupo cuando el usuario ingresa su RUT
 */
async function verificarCupoUsuario() {
    const rut = rutInput.value.trim();
    
    if (!rut) return;

    try {
        const validacion = await validarCupoDisponible(rut);
        
        if (!validacion.success) {
            console.error('Error en validación:', validacion.error);
            return;
        }

        mostrarInfoCupo(validacion);

        if (!validacion.puedeComprar) {
            deshabilitarFormulario();
        } else {
            habilitarFormulario();
        }

    } catch (error) {
        console.error('Error al verificar cupo:', error);
    }
}

// ========================================
// FUNCIÓN DE GUARDADO EN FIREBASE
// ========================================

/**
 * Guarda la compra en Firebase (Firestore + Storage)
 */
async function guardarCompraEnFirebase(formData, comprobanteFile) {
    console.log('💾 Iniciando guardado en Firebase...');
    
    try {
        let comprobanteUrl = "";

        // 1. Subir comprobante a Storage
        if (comprobanteFile) {
            console.log('📤 Subiendo comprobante a Storage...');
            const storage = getStorage();
            const fileName = `${Date.now()}_${comprobanteFile.name}`;
            const storageRef = ref(storage, `comprobantesGas/${fileName}`);
            
            await uploadBytes(storageRef, comprobanteFile);
            comprobanteUrl = await getDownloadURL(storageRef);
            console.log('✅ Comprobante subido:', comprobanteUrl);
        }

        // 2. Preparar datos de la compra
        const compraLipigasValue = formData.get('compraLipigas') === 'si';
        const compraAbastibleValue = formData.get('compraAbastible') === 'si';

        const compraData = {
            // Datos del usuario
            uid: auth.currentUser.uid,
            email: formData.get('emailGas'),
            rut: formData.get('rutGas').replace(/\./g, '').replace(/-/g, ''), // Normalizado
            nombre: formData.get('nombreGas'),
            telefono: formData.get('telefonoGas'),
            fechaCompra: formData.get('fechaCompraGas'),
            
            // Datos de compra Lipigas
            compraLipigas: compraLipigasValue,
            cargas_lipigas: compraLipigasValue ? {
                kg5: parseInt(formData.get('lipigas5')) || 0,
                kg11: parseInt(formData.get('lipigas11')) || 0,
                kg15: parseInt(formData.get('lipigas15')) || 0,
                kg45: parseInt(formData.get('lipigas45')) || 0
            } : null,
            
            // Datos de compra Abastible
            compraAbastible: compraAbastibleValue,
            cargas_abastible: compraAbastibleValue ? {
                kg5: parseInt(formData.get('abastible5')) || 0,
                kg11: parseInt(formData.get('abastible11')) || 0,
                kg15: parseInt(formData.get('abastible15')) || 0,
                kg45: parseInt(formData.get('abastible45')) || 0
            } : null,
            
            // Saldo a favor (opcional)
            saldoFavor: formData.get('saldoFavor') || null,
            
            // Comprobante
            comprobanteUrl: comprobanteUrl,
            
            // Metadatos
            estado: 'pendiente',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        console.log('📊 Datos preparados:', compraData);

        // 3. Guardar en Firestore
        console.log('💾 Guardando en Firestore...');
        const docRef = await addDoc(collection(db, "comprasGas"), compraData);
        console.log('✅ Documento guardado con ID:', docRef.id);

        return {
            success: true,
            id: docRef.id,
            message: 'Compra registrada exitosamente'
        };

    } catch (error) {
        console.error('❌ Error al guardar:', error);
        throw error;
    }
}

// ========================================
// EVENT LISTENERS
// ========================================

/**
 * Inicializa todos los event listeners
 */
function inicializarEventListeners() {
    // Selector de Lipigas
    if (compraLipigas) {
        compraLipigas.addEventListener('change', function() {
            if (this.value === 'si') {
                actualizarOpcionesGas(lipigasOpciones, 'lipigas');
            } else {
                if (lipigasOpciones) {
                    lipigasOpciones.style.display = 'none';
                    lipigasOpciones.querySelectorAll('select').forEach(select => {
                        select.value = '0';
                    });
                    actualizarTotal(lipigasOpciones);
                }
            }
        });
    }

    // Selector de Abastible
    if (compraAbastible) {
        compraAbastible.addEventListener('change', function() {
            if (this.value === 'si') {
                actualizarOpcionesGas(abastibleOpciones, 'abastible');
            } else {
                if (abastibleOpciones) {
                    abastibleOpciones.style.display = 'none';
                    abastibleOpciones.querySelectorAll('select').forEach(select => {
                        select.value = '0';
                    });
                    actualizarTotal(abastibleOpciones);
                }
            }
        });
    }

    // Listeners para actualizar totales en Lipigas
    if (lipigasOpciones) {
        const selectsLipigas = lipigasOpciones.querySelectorAll('.gas-select');
        selectsLipigas.forEach(select => {
            select.addEventListener('change', () => actualizarTotal(lipigasOpciones));
        });
    }

    // Listeners para actualizar totales en Abastible
    if (abastibleOpciones) {
        const selectsAbastible = abastibleOpciones.querySelectorAll('.gas-select');
        selectsAbastible.forEach(select => {
            select.addEventListener('change', () => actualizarTotal(abastibleOpciones));
        });
    }

    // Verificar cupo al perder foco del RUT
    if (rutInput) {
        rutInput.addEventListener('blur', verificarCupoUsuario);
    }

    // Submit del formulario
    if (formCompraGas) {
        formCompraGas.addEventListener('submit', handleFormSubmit);
    }
}

/**
 * Inicializa el campo de fecha
 */
function inicializarFecha() {
    const fechaInput = document.getElementById('fechaCompraGas');
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.value = today;
        fechaInput.max = today;
    }
}

/**
 * Inicializa la validación de cupo
 */
function inicializarValidacionCupo() {
    // Si el RUT ya tiene valor al cargar, verificar cupo
    if (rutInput && rutInput.value.trim()) {
        verificarCupoUsuario();
    }
}

// ========================================
// MANEJADOR DEL SUBMIT
// ========================================

/**
 * Maneja el envío del formulario
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    console.log('🔍 Iniciando envío del formulario');

    try {
        // ===== VALIDACIONES BÁSICAS =====
        const comprandoLipigas = compraLipigas.value === 'si';
        const comprandoAbastible = compraAbastible.value === 'si';

        if (!comprandoLipigas && !comprandoAbastible) {
            alert('⚠️ Debe seleccionar al menos una empresa (Lipigas o Abastible)');
            return false;
        }

        const totalCargas = calcularTotalGlobal();

        if (totalCargas === 0) {
            alert('⚠️ Debe seleccionar al menos una carga de gas');
            return false;
        }

        // Validar límite global
        const limiteTotal = obtenerLimiteMaximo();

        if (totalCargas > limiteTotal) {
            alert(`⚠️ El total de cargas (Lipigas + Abastible) no puede superar ${limiteTotal} en este período.\n\nTotal seleccionado: ${totalCargas} cargas\nLímite permitido: ${limiteTotal} cargas`);
            return false;
        }

        // ===== VALIDACIÓN DE CUPO MENSUAL =====
        const rut = rutInput.value.trim();

        if (!rut) {
            alert('⚠️ Debe ingresar su RUT');
            return false;
        }

        // Preparar cargas solicitadas
        const cargasSolicitadas = { lipigas: {}, abastible: {} };

        if (comprandoLipigas) {
            cargasSolicitadas.lipigas = {
                kg5: parseInt(document.getElementById('lipigas5').value) || 0,
                kg11: parseInt(document.getElementById('lipigas11').value) || 0,
                kg15: parseInt(document.getElementById('lipigas15').value) || 0,
                kg45: parseInt(document.getElementById('lipigas45').value) || 0
            };
        }

        if (comprandoAbastible) {
            cargasSolicitadas.abastible = {
                kg5: parseInt(document.getElementById('abastible5').value) || 0,
                kg11: parseInt(document.getElementById('abastible11').value) || 0,
                kg15: parseInt(document.getElementById('abastible15').value) || 0,
                kg45: parseInt(document.getElementById('abastible45').value) || 0
            };
        }

        // Validar cupo disponible
        const validacion = await validarCupoDisponible(rut);

        if (!validacion.success) {
            alert('❌ Error al validar cupo: ' + validacion.error);
            return false;
        }

        if (!validacion.puedeComprar) {
            alert(`❌ ${validacion.mensaje}\n\nNo puede realizar más compras este mes.`);
            return false;
        }

        // Verificar que las cargas solicitadas no excedan el cupo disponible
        if (totalCargas > validacion.cupoDisponible) {
            alert(`❌ La compra excede su cupo disponible.\n\nTiene: ${validacion.cupoDisponible} cargas disponibles\nIntenta comprar: ${totalCargas} cargas`);
            return false;
        }

        // ===== VALIDAR COMPROBANTE =====
        const formData = new FormData(formCompraGas);
        const comprobanteFile = document.getElementById('comprobanteGas').files[0];

        if (!comprobanteFile) {
            alert('⚠️ Debe adjuntar el comprobante de transferencia');
            return false;
        }

        // ===== DESHABILITAR BOTÓN =====
        const btnSubmit = formCompraGas.querySelector('button[type="submit"]');
        const textoOriginal = btnSubmit ? btnSubmit.textContent : '';
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = '⏳ Guardando...';
        }

        // ===== GUARDAR EN FIREBASE =====
        const resultado = await guardarCompraEnFirebase(formData, comprobanteFile);

        if (resultado.success) {
            alert(`✅ ${resultado.message}\n\nID de compra: ${resultado.id}\n\nSu compra ha sido registrada y será procesada a la brevedad.`);
            
            // Limpiar formulario
            formCompraGas.reset();
            if (lipigasOpciones) lipigasOpciones.style.display = 'none';
            if (abastibleOpciones) abastibleOpciones.style.display = 'none';
            
            // Recargar página
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }

    } catch (error) {
        console.error('❌ Error al procesar:', error);
        alert(`❌ Error al guardar la compra: ${error.message}\n\nPor favor, intente nuevamente o contacte al administrador.`);
    } finally {
        // Rehabilitar botón
        const btnSubmit = formCompraGas.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Enviar Compra';
        }
    }
}

// ========================================
// EXPORTAR FUNCIONES (si se necesita usar en otros módulos)
// ========================================
export {
    esTemporadaAlta,
    obtenerLimiteMaximo,
    calcularTotalGlobal,
    validarCupoDisponible,
    guardarCompraEnFirebase
};
