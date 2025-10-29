// Copia y pega TODO el archivo, reemplazando el tuyo

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    Timestamp,
    doc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    obtenerFuncionario,
    obtenerSolicitudesFuncionario,
    actualizarFuncionario
} from './firestore-operations.js';
import { cerrarSesion } from './auth.js';
import { obtenerComprasPorRUT, guardarCompraUnificada } from './compras-gas-firebase.js';
import { obtenerSolicitudesPrestamosPorUID } from './prestamos-firebase.js';
import { updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ========================================
// SISTEMA DE VALIDACIÓN DE CUPOS
// ========================================

const LIMITES_CUPOS = {
    gas: {
        temporada_normal: 4,  // Oct-May
        temporada_alta: 6     // Jun-Sep
    },
    cine: 4,
    jumper: 6,
    gimnasio: 4
};

const COLECCIONES_FIREBASE = {
    gas: 'comprasGas',
    cine: 'comprasCine',
    jumper: 'comprasJumper',
    gimnasio: 'comprasGimnasio'
};

// ========== FUNCIONES DE VALIDACIÓN DE CUPOS ==============

function limpiarRUT(rut) {
    if (!rut) return '';
    // Eliminar todos los puntos, guiones y espacios
    return rut.replace(/[\.\-\s]/g, '').toUpperCase().trim();
}

function formatearRUT(rut) {
    if (!rut) return '';
    const rutLimpio = limpiarRUT(rut);
    if (rutLimpio.length < 2) return rutLimpio;
    
    const dv = rutLimpio.slice(-1);
    let cuerpo = rutLimpio.slice(0, -1);
    
    // Agregar puntos cada 3 dígitos desde la derecha
    cuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    return `${cuerpo}-${dv}`;
}

function validarFormatoRUT(rut) {
    const rutLimpio = limpiarRUT(rut);
    // RUT debe tener entre 8 y 9 caracteres
    if (rutLimpio.length < 8 || rutLimpio.length > 9) {
        return false;
    }
    // Verificar que los primeros caracteres sean números
    const cuerpo = rutLimpio.slice(0, -1);
    if (!/^\d+$/.test(cuerpo)) {
        return false;
    }
    // Verificar que el dígito verificador sea válido
    const dv = rutLimpio.slice(-1);
    if (!/^[0-9K]$/.test(dv)) {
        return false;
    }
    return true;
}

function esTemporadaAlta() {
    const fecha = new Date();
    const mes = fecha.getMonth() + 1; // 1-12
    return mes >= 6 && mes <= 9; // Junio a Septiembre
}

function obtenerLimiteCupo(tipoServicio) {
    if (tipoServicio === 'gas') {
        return esTemporadaAlta() ? LIMITES_CUPOS.gas.temporada_alta : LIMITES_CUPOS.gas.temporada_normal;
    }
    return LIMITES_CUPOS[tipoServicio] || 0;
}

function obtenerRangoMesActual() {
    const ahora = new Date();
    const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return {
        inicio: Timestamp.fromDate(primerDia),
        fin: Timestamp.fromDate(ultimoDia),
        fechaActual: ahora
    };
}

// Función principal de validación de cupo
async function validarCupoMensual(rut, tipoServicio, cantidadSolicitada = 0) {
    try {
        console.log(`🔍 [CUPO] Validando ${tipoServicio} para RUT: ${rut}`);
        
        // Limpiar RUT
        const rutLimpio = limpiarRUT(rut);
        console.log(`🔍 [CUPO] RUT limpio: ${rutLimpio}`);
        
        // Validar formato
        if (!validarFormatoRUT(rut)) {
            throw new Error('Formato de RUT inválido');
        }
        
        if (!COLECCIONES_FIREBASE[tipoServicio]) {
            throw new Error(`Tipo de servicio no válido: ${tipoServicio}`);
        }
        
        const limiteCupo = obtenerLimiteCupo(tipoServicio);
        const rangoMes = obtenerRangoMesActual();
        const coleccion = COLECCIONES_FIREBASE[tipoServicio];
        
        console.log(`📊 [CUPO] Consultando ${coleccion} para RUT ${rutLimpio}`);
        console.log(`📊 [CUPO] Límite: ${limiteCupo}`);
        
        // Consultar compras del mes
        const consultaCompras = query(
            collection(db, coleccion),
            where("rut", "==", rutLimpio),
            where("createdAt", ">=", rangoMes.inicio),
            where("createdAt", "<=", rangoMes.fin)
        );
        
        const snapshot = await getDocs(consultaCompras);
        
        // Calcular uso actual
        let usoActual = 0;
        const comprasDelMes = [];
        
        snapshot.forEach(doc => {
            const compra = doc.data();
            comprasDelMes.push({
                id: doc.id,
                fecha: compra.createdAt?.toDate() || new Date(),
                estado: compra.estado || 'desconocido',
                ...compra
            });
            
            // Contar según el tipo
            if (tipoServicio === 'gas') {
                // Sumar todas las cargas
                if (compra.cargas_lipigas) {
                    usoActual += (compra.cargas_lipigas.kg5 || 0);
                    usoActual += (compra.cargas_lipigas.kg11 || 0);
                    usoActual += (compra.cargas_lipigas.kg15 || 0);
                    usoActual += (compra.cargas_lipigas.kg45 || 0);
                }
                if (compra.cargas_abastible) {
                    usoActual += (compra.cargas_abastible.kg5 || 0);
                    usoActual += (compra.cargas_abastible.kg11 || 0);
                    usoActual += (compra.cargas_abastible.kg15 || 0);
                    usoActual += (compra.cargas_abastible.kg45 || 0);
                }
            } else {
                // Para entretenimiento
                usoActual += parseInt(compra.cantidad || 1);
            }
        });
        
        const disponible = limiteCupo - usoActual;
        const puedeComprar = disponible > 0;
        const puedeComprarCantidad = cantidadSolicitada <= disponible;
        
        // Determinar estado del cupo
        let estadoCupo = 'disponible';
        if (usoActual >= limiteCupo) {
            estadoCupo = 'agotado';
        } else if (disponible <= 1) {
            estadoCupo = 'critico';
        } else if (disponible <= Math.ceil(limiteCupo * 0.25)) {
            estadoCupo = 'medio';
        }
        
        const resultado = {
            success: true,
            tipoServicio,
            rutLimpio: rutLimpio,
            limiteCupo,
            usoActual,
            disponible,
            estadoCupo,
            puedeComprar,
            puedeComprarCantidad: cantidadSolicitada > 0 ? puedeComprarCantidad : true,
            cantidadSolicitada,
            cantidadMaximaPermitida: disponible,
            comprasDelMes,
            mensaje: generarMensajeEstado(tipoServicio, usoActual, limiteCupo, disponible, estadoCupo),
            colorEstado: obtenerColorEstado(estadoCupo),
            iconoEstado: obtenerIconoEstado(estadoCupo)
        };
        
        console.log(`✅ [CUPO] Validación completada: ${usoActual}/${limiteCupo} (${estadoCupo})`);
        return resultado;
        
    } catch (error) {
        console.error(`❌ [CUPO] Error en validación:`, error);
        return {
            success: false,
            error: error.message,
            puedeComprar: false,
            estadoCupo: 'error'
        };
    }
}

function generarMensajeEstado(tipoServicio, usoActual, limiteCupo, disponible, estadoCupo) {
    const unidad = tipoServicio === 'gas' ? 'cargas' : 'entradas';
    
    switch (estadoCupo) {
        case 'agotado':
            return `❌ Cupo agotado: Ya utilizó ${usoActual} de ${limiteCupo} ${unidad} este mes`;
        case 'critico':
            return `⚠️ Cupo crítico: Solo ${disponible} ${unidad} disponibles`;
        case 'medio':
            return `🟡 Quedan ${disponible} ${unidad} de ${limiteCupo}`;
        case 'disponible':
            return `✅ ${disponible} ${unidad} disponibles de ${limiteCupo}`;
        default:
            return `Estado: ${disponible} ${unidad} disponibles`;
    }
}

function obtenerColorEstado(estadoCupo) {
    const colores = {
        'disponible': '#28a745',
        'medio': '#ffc107',
        'critico': '#fd7e14',
        'agotado': '#dc3545',
        'error': '#6c757d'
    };
    return colores[estadoCupo] || '#6c757d';
}

function obtenerIconoEstado(estadoCupo) {
    const iconos = {
        'disponible': '✅',
        'medio': '🟡',
        'critico': '⚠️',
        'agotado': '❌',
        'error': '⚠️'
    };
    return iconos[estadoCupo] || '❓';
}

function mostrarEstadoCupo(formId, validacion) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    // Buscar o crear elemento de mensaje
    let mensajeCupo = form.querySelector('.mensaje-cupo-estado');
    if (!mensajeCupo) {
        mensajeCupo = document.createElement('div');
        mensajeCupo.className = 'mensaje-cupo-estado';
        form.insertBefore(mensajeCupo, form.firstElementChild);
    }
    
    // Aplicar estilos según estado
    mensajeCupo.style.cssText = `
        padding: 15px;
        margin-bottom: 20px;
        border-radius: 8px;
        font-weight: 500;
        border: 2px solid ${validacion.colorEstado};
        background-color: ${validacion.colorEstado}20;
        color: ${validacion.colorEstado};
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
    `;
    
    // Contenido del mensaje
    mensajeCupo.innerHTML = `
        <span style="font-size: 1.5em;">${validacion.iconoEstado}</span>
        <div>
            <strong>${validacion.mensaje}</strong>
            ${validacion.estadoCupo === 'agotado' ? 
                '<br><small>Podrá realizar nuevas compras el próximo mes</small>' : ''}
        </div>
    `;
    
    // Bloquear/habilitar formulario según estado
    const elementos = form.querySelectorAll('input:not([readonly]), select, textarea');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (validacion.estadoCupo === 'agotado') {
        elementos.forEach(el => {
            if (el.id !== form.querySelector('[id*="rut"]')?.id) {
                el.disabled = true;
                el.style.backgroundColor = '#f8f9fa';
            }
        });
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '❌ Cupo Agotado';
            submitBtn.style.opacity = '0.6';
            submitBtn.style.cursor = 'not-allowed';
        }
    } else {
        elementos.forEach(el => {
            el.disabled = false;
            el.style.backgroundColor = '';
        });
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '';
            submitBtn.style.cursor = 'pointer';
        }
    }
}

async function validarCupoEnRUT(rutInputId, formId, tipoServicio) {
    const rutInput = document.getElementById(rutInputId);
    if (!rutInput) return null;
    
    const rut = rutInput.value.trim();
    
    if (!rut || rut.length < 8) {
        const form = document.getElementById(formId);
        const mensajeCupo = form?.querySelector('.mensaje-cupo-estado');
        if (mensajeCupo) {
            mensajeCupo.remove();
        }
        return null;
    }
    
    // Mostrar indicador de carga
    const form = document.getElementById(formId);
    if (form) {
        let loader = form.querySelector('.cupo-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'cupo-loader';
            loader.style.cssText = `
                padding: 10px;
                text-align: center;
                color: #6c757d;
                font-size: 14px;
                background: #f8f9fa;
                border-radius: 5px;
                margin-bottom: 15px;
            `;
            form.insertBefore(loader, form.firstElementChild);
        }
        loader.innerHTML = '⏳ Verificando cupo disponible...';
    }
    
    try {
        // Calcular cantidad solicitada
        let cantidadSolicitada = 0;
        if (tipoServicio === 'gas') {
            if (document.getElementById('compraLipigas')?.value === 'si') {
                cantidadSolicitada += parseInt(document.getElementById('lipigas5')?.value || 0);
                cantidadSolicitada += parseInt(document.getElementById('lipigas11')?.value || 0);
                cantidadSolicitada += parseInt(document.getElementById('lipigas15')?.value || 0);
                cantidadSolicitada += parseInt(document.getElementById('lipigas45')?.value || 0);
            }
            if (document.getElementById('compraAbastible')?.value === 'si') {
                cantidadSolicitada += parseInt(document.getElementById('abastible5')?.value || 0);
                cantidadSolicitada += parseInt(document.getElementById('abastible11')?.value || 0);
                cantidadSolicitada += parseInt(document.getElementById('abastible15')?.value || 0);
                cantidadSolicitada += parseInt(document.getElementById('abastible45')?.value || 0);
            }
        } else {
            const cantidadInput = document.getElementById(`cantidad${tipoServicio.charAt(0).toUpperCase() + tipoServicio.slice(1)}`);
            cantidadSolicitada = parseInt(cantidadInput?.value || 0);
        }
        
        const validacion = await validarCupoMensual(rut, tipoServicio, cantidadSolicitada);
        
        // Remover loader
        const loader = form?.querySelector('.cupo-loader');
        if (loader) loader.remove();
        
        if (validacion.success) {
            mostrarEstadoCupo(formId, validacion);
        }
        
        return validacion;
        
    } catch (error) {
        console.error(`❌ [UI] Error al validar cupo:`, error);
        const loader = form?.querySelector('.cupo-loader');
        if (loader) loader.remove();
        
        mostrarEstadoCupo(formId, {
            mensaje: 'Error al verificar cupo. Intente nuevamente.',
            estadoCupo: 'error',
            colorEstado: '#dc3545',
            iconoEstado: '⚠️'
        });
        
        return null;
    }
}

function inicializarValidacionAutomatica(rutInputId, formId, tipoServicio) {
    const rutInput = document.getElementById(rutInputId);
    if (!rutInput) {
        console.warn(`Input ${rutInputId} no encontrado`);
        return;
    }
    
    console.log(`🎯 Inicializando validación automática para ${tipoServicio}`);
    
    let timeoutId;
    
    // Validar al escribir (con delay)
    rutInput.addEventListener('input', function() {
        clearTimeout(timeoutId);
        
        // Formatear RUT mientras escribe
        const valorFormateado = formatearRUT(this.value);
        if (this.value !== valorFormateado) {
            this.value = valorFormateado;
        }
        
        // Validar después de un delay
        timeoutId = setTimeout(() => {
            validarCupoEnRUT(rutInputId, formId, tipoServicio);
        }, 1000);
    });
    
    // Validar al perder el foco
    rutInput.addEventListener('blur', function() {
        clearTimeout(timeoutId);
        validarCupoEnRUT(rutInputId, formId, tipoServicio);
    });
    
    // También validar cuando cambian las cantidades
    if (tipoServicio === 'gas') {
        const selectores = [
            'lipigas5', 'lipigas11', 'lipigas15', 'lipigas45',
            'abastible5', 'abastible11', 'abastible15', 'abastible45',
            'compraLipigas', 'compraAbastible'
        ];
        
        selectores.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.addEventListener('change', () => {
                    if (rutInput.value.trim().length >= 8) {
                        validarCupoEnRUT(rutInputId, formId, tipoServicio);
                    }
                });
            }
        });
    } else {
        const cantidadSelect = document.getElementById(`cantidad${tipoServicio.charAt(0).toUpperCase() + tipoServicio.slice(1)}`);
        if (cantidadSelect) {
            cantidadSelect.addEventListener('change', () => {
                if (rutInput.value.trim().length >= 8) {
                    validarCupoEnRUT(rutInputId, formId, tipoServicio);
                }
            });
        }
    }
    
    // Validar si ya hay un valor
    if (rutInput.value.trim().length >= 8) {
        validarCupoEnRUT(rutInputId, formId, tipoServicio);
    }
}

// Variable global para almacenar todas las solicitudes (para filtrado)
let todasLasSolicitudes = [];

// ================================
// FUNCIÓN: CARGAR PENDIENTES EN RESUMEN
// ================================
async function cargarPendientesResumen(uid, rut) {
    let pendientesBeneficio = 0;
    try {
        const solicitudes = await obtenerSolicitudesFuncionario(uid);
        pendientesBeneficio = solicitudes.filter(s =>
            (s.estado === 'pendiente' || s.estado === 'en_revision')
        ).length;
    } catch (e) {}

    let pendientesCompras = 0;
    try {
        const comprasPorRUT = await obtenerComprasPorRUT(rut);
        if (comprasPorRUT && comprasPorRUT.success && comprasPorRUT.comprasPorTipo) {
            Object.values(comprasPorRUT.comprasPorTipo).forEach(lista => {
                pendientesCompras += (lista || []).filter(c =>
                    c.estado === 'pendiente' || c.estado === 'en_revision'
                ).length;
            });
        }
    } catch (e) {}

    let pendientesPrestamos = 0;
    try {
        const prestamos = await obtenerSolicitudesPrestamosPorUID(uid);
        pendientesPrestamos = (prestamos || []).filter(p =>
            p.estado === 'pendiente' || p.estado === 'en_revision'
        ).length;
    } catch (e) {}

    const totalPendientes = pendientesBeneficio + pendientesCompras + pendientesPrestamos;
    const solicitudesEl = document.getElementById('solicitudes-pendientes');
    if (solicitudesEl) solicitudesEl.textContent = totalPendientes;
}

// ================================
// Cargar datos del usuario y estadísticas
// ================================
async function cargarDatosUsuario(uid) {
    try {
        const funcionario = await obtenerFuncionario(uid);
        if (!funcionario) {
            alert('Error al cargar datos del usuario');
            return;
        }
        const userNameEl = document.querySelector('.user-name');
        const userRutEl = document.querySelector('.user-rut');
        const bienvenidaEl = document.getElementById('bienvenida-usuario');
        if (userNameEl) userNameEl.textContent = `👤 ${funcionario.nombre}`;
        if (userRutEl) userRutEl.textContent = `RUT: ${formatearRUT(funcionario.rut)}`;
        if (bienvenidaEl) {
            const primerNombre = funcionario.nombre.split(" ")[0];
            bienvenidaEl.textContent = funcionario.genero === 'F' ? `¡Bienvenida, ${primerNombre}!` : `¡Bienvenido, ${primerNombre}!`;
        }
        await cargarPendientesResumen(uid, funcionario.rut);
        await cargarEstadisticas(uid, funcionario.fechaAfiliacion);
        await cargarSolicitudes(uid, funcionario.rut);
        await cargarPerfil(funcionario);
        
        // INICIALIZAR VALIDACIÓN DE CUPOS
        inicializarSistemaValidacionCupos();
        
    } catch (error) {
        console.error('Error al cargar datos:', error);
    }
}

// ================================
// INICIALIZACIÓN DE VALIDACIÓN DE CUPOS EN FORMULARIOS
// ================================
function inicializarSistemaValidacionCupos() {
    console.log('🚀 Inicializando sistema de validación de cupos...');
    
    // Agregar estilos CSS para animaciones
    if (!document.getElementById('cupos-styles')) {
        const style = document.createElement('style');
        style.id = 'cupos-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateY(-10px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            .mensaje-cupo-estado {
                transition: all 0.3s ease;
            }
            
            .cupo-loader {
                animation: pulse 1.5s ease infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Inicializar validación para cada formulario
    const configuraciones = [
        { rutId: 'rutGas', formId: 'formCompraGas', tipo: 'gas' },
        { rutId: 'rutCine', formId: 'formCompraCine', tipo: 'cine' },
        { rutId: 'rutJumper', formId: 'formCompraJumper', tipo: 'jumper' },
        { rutId: 'rutGimnasio', formId: 'formCompraGimnasio', tipo: 'gimnasio' }
    ];
    
    configuraciones.forEach(config => {
        if (document.getElementById(config.rutId) && document.getElementById(config.formId)) {
            inicializarValidacionAutomatica(config.rutId, config.formId, config.tipo);
            
            // Interceptar envío del formulario
            const form = document.getElementById(config.formId);
            if (form) {
                form.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    await manejarEnvioFormulario(config.formId, config.tipo);
                });
            }
            
            console.log(`✅ Validación iniciada para ${config.tipo}`);
        }
    });
    
    console.log('✅ Sistema de validación de cupos inicializado');
}

// Manejar envío de formulario con validación de cupo
async function manejarEnvioFormulario(formId, tipoServicio) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    // Obtener RUT y cantidad
    const rutInput = form.querySelector('[id*="rut"]');
    const rut = rutInput?.value.trim();
    
    let cantidadSolicitada = 0;
    if (tipoServicio === 'gas') {
        // Calcular total de cargas
        if (document.getElementById('compraLipigas')?.value === 'si') {
            cantidadSolicitada += parseInt(document.getElementById('lipigas5')?.value || 0);
            cantidadSolicitada += parseInt(document.getElementById('lipigas11')?.value || 0);
            cantidadSolicitada += parseInt(document.getElementById('lipigas15')?.value || 0);
            cantidadSolicitada += parseInt(document.getElementById('lipigas45')?.value || 0);
        }
        if (document.getElementById('compraAbastible')?.value === 'si') {
            cantidadSolicitada += parseInt(document.getElementById('abastible5')?.value || 0);
            cantidadSolicitada += parseInt(document.getElementById('abastible11')?.value || 0);
            cantidadSolicitada += parseInt(document.getElementById('abastible15')?.value || 0);
            cantidadSolicitada += parseInt(document.getElementById('abastible45')?.value || 0);
        }
    } else {
        const cantidadInput = document.getElementById(`cantidad${tipoServicio.charAt(0).toUpperCase() + tipoServicio.slice(1)}`);
        cantidadSolicitada = parseInt(cantidadInput?.value || 0);
    }
    
    // Validar cupo antes de enviar
    const validacion = await validarCupoMensual(rut, tipoServicio, cantidadSolicitada);
    
    if (!validacion.success) {
        alert(`❌ Error al validar cupo: ${validacion.error}`);
        return;
    }
    
    if (!validacion.puedeComprarCantidad) {
        const unidad = tipoServicio === 'gas' ? 'cargas' : 'entradas';
        alert(`❌ No puede comprar ${cantidadSolicitada} ${unidad}.\n\n${validacion.mensaje}\n\nMáximo permitido: ${validacion.cantidadMaximaPermitida} ${unidad}`);
        return;
    }
    
    // Si todo está bien, proceder con el envío
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    
    try {
        const formData = new FormData(form);
        const datosCompra = Object.fromEntries(formData.entries());
        const comprobanteInput = form.querySelector('input[type="file"]');
        const comprobanteFile = comprobanteInput?.files[0];
        
        const resultado = await guardarCompraUnificada(tipoServicio, datosCompra, comprobanteFile);
        
        if (resultado.success) {
            const mensaje = tipoServicio === 'gas' 
                ? `✅ Compra registrada exitosamente!\n\nID: ${resultado.id}\nTotal: ${resultado.totalCargas} cargas\nPrecio: $${(resultado.precioTotal || 0).toLocaleString('es-CL')}`
                : `✅ Compra registrada exitosamente!\n\nID: ${resultado.id}\nCantidad: ${resultado.cantidad} ${tipoServicio === 'gimnasio' ? 'tickets' : 'entradas'}\nTotal: $${(resultado.montoTotal || 0).toLocaleString('es-CL')}`;
            
            alert(mensaje);
            form.reset();
            
            // Actualizar validación de cupo
            await validarCupoEnRUT(rutInput.id, formId, tipoServicio);
        } else {
            throw new Error(resultado.error || 'Error desconocido');
        }
    } catch (error) {
        alert(`❌ Error al registrar la compra: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.getAttribute('data-original-text') || 'Enviar';
    }
}

// ================================
// Autenticación
// ================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userType = sessionStorage.getItem('userType');
        if (userType !== 'funcionario') {
            window.location.href = 'login.html';
            return;
        }
        await cargarDatosUsuario(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

// [RESTO DEL CÓDIGO ORIGINAL CONTINÚA SIN CAMBIOS DESDE AQUÍ...]

// ================================
// Estadísticas adicionales (NO sobreescribe pendientes)
// ================================
async function cargarEstadisticas(uid, fechaAfiliacion) {
    try {
        const tiempoEl = document.getElementById('tiempo-afiliacion');
        if (tiempoEl && fechaAfiliacion && fechaAfiliacion.toDate) {
            const fecha = fechaAfiliacion.toDate();
            const hoy = new Date();
            const msPorMes = 1000 * 60 * 60 * 24 * 30.44;
            const meses = Math.floor((hoy - fecha) / msPorMes);
            tiempoEl.textContent = meses + (meses === 1 ? " mes" : " meses");
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// ================================
// SISTEMA DE FILTROS PARA SOLICITUDES
// ================================
function crearFiltrosSolicitudes() {
    const container = document.getElementById('listaSolicitudes');
    if (!container) return;
    let filtrosContainer = document.getElementById('filtros-solicitudes');
    if (filtrosContainer) return;
    filtrosContainer = document.createElement('div');
    filtrosContainer.id = 'filtros-solicitudes';
    filtrosContainer.className = 'filtros-container';
    filtrosContainer.style.cssText = `
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        border: 1px solid #e9ecef;
    `;
    filtrosContainer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px;">
            <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label for="filtro-estado" style="font-weight: 600; color: #495057;">Filtrar por estado:</label>
                    <select id="filtro-estado" style="
                        padding: 6px 12px;
                        border: 1px solid #ced4da;
                        border-radius: 4px;
                        background: white;
                        min-width: 120px;
                    ">
                        <option value="todas">Todas</option>
                        <option value="pendiente">Pendientes</option>
                        <option value="aprobado">Aprobadas</option>
                        <option value="rechazado">Rechazadas</option>
                    </select>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label for="filtro-tipo" style="font-weight: 600; color: #495057;">Filtrar por tipo:</label>
                    <select id="filtro-tipo" style="
                        padding: 6px 12px;
                        border: 1px solid #ced4da;
                        border-radius: 4px;
                        background: white;
                        min-width: 140px;
                    ">
                        <option value="todos">Todos los tipos</option>
                        <option value="compra_gas">Compras Gas</option>
                        <option value="compra_cine">Cine</option>
                        <option value="compra_jumper">Jumper</option>
                        <option value="compra_gimnasio">Gimnasio</option>
                        <option value="prestamo">Préstamos</option>
                    </select>
                </div>
                <button id="limpiar-filtros" style="
                    padding: 6px 12px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                ">
                    🔄 Limpiar filtros
                </button>
            </div>
            <div id="contador-solicitudes" style="
                font-weight: 600;
                color: #495057;
                background: white;
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px solid #dee2e6;
            ">
                Mostrando 0 de 0 solicitudes
            </div>
        </div>
    `;
    container.parentNode.insertBefore(filtrosContainer, container);
    document.getElementById('filtro-estado').addEventListener('change', aplicarFiltros);
    document.getElementById('filtro-tipo').addEventListener('change', aplicarFiltros);
    document.getElementById('limpiar-filtros').addEventListener('click', limpiarFiltros);
}

function aplicarFiltros() {
    const filtroEstado = document.getElementById('filtro-estado')?.value || 'todas';
    const filtroTipo = document.getElementById('filtro-tipo')?.value || 'todos';
    let solicitudesFiltradas = [...todasLasSolicitudes];
    if (filtroEstado !== 'todas') {
        solicitudesFiltradas = solicitudesFiltradas.filter(solicitud => {
            const estado = (solicitud.estado || '').toLowerCase();
            const filtro = filtroEstado.toLowerCase();
            if (filtro === 'aprobada' || filtro === 'aprobado') {
                return estado === 'aprobada' || estado === 'aprobado';
            }
            if (filtro === 'rechazada' || filtro === 'rechazado') {
                return estado === 'rechazada' || estado === 'rechazado';
            }
            return estado === filtro;
        });
    }
    if (filtroTipo !== 'todos') {
        solicitudesFiltradas = solicitudesFiltradas.filter(solicitud => {
            if (filtroTipo === 'solicitud_beneficio') return solicitud.fuente === 'solicitud_beneficio';
            if (filtroTipo === 'prestamo') return solicitud.fuente === 'prestamo';
            if (filtroTipo.startsWith('compra_')) return solicitud.fuente === filtroTipo;
            return true;
        });
    }
    const container = document.getElementById('listaSolicitudes');
    renderMisSolicitudes(container, solicitudesFiltradas);
    actualizarContadorSolicitudes(solicitudesFiltradas.length, todasLasSolicitudes.length);
}

function limpiarFiltros() {
    document.getElementById('filtro-estado').value = 'todas';
    document.getElementById('filtro-tipo').value = 'todos';
    const container = document.getElementById('listaSolicitudes');
    renderMisSolicitudes(container, todasLasSolicitudes);
    actualizarContadorSolicitudes(todasLasSolicitudes.length, todasLasSolicitudes.length);
}

function actualizarContadorSolicitudes(mostradas, total) {
    const contador = document.getElementById('contador-solicitudes');
    if (contador) {
        contador.textContent = `Mostrando ${mostradas} de ${total} solicitudes`;
        if (mostradas === total) {
            contador.style.backgroundColor = 'white';
            contador.style.color = '#495057';
        } else {
            contador.style.backgroundColor = '#e3f2fd';
            contador.style.color = '#1976d2';
            contador.style.fontWeight = 'bold';
        }
    }
}

async function cargarSolicitudes(uid, rut) {
    try {
        const container = document.getElementById('listaSolicitudes');
        if (!container) return;
        container.innerHTML = '<p>Cargando solicitudes y compras...</p>';
        const solicitudes = await obtenerSolicitudesFuncionario(uid);
        let comprasPorRUT = { success: false, comprasPorTipo: {} };
        try { comprasPorRUT = await obtenerComprasPorRUT(rut); } catch (err) {}
        let prestamos = [];
        try { prestamos = await obtenerSolicitudesPrestamosPorUID(uid); } catch (err) {}
        const items = [];
        if (Array.isArray(solicitudes)) {
            solicitudes.forEach(s => {
                const fecha = s.createdAt?.toDate?.() || new Date();
                const fechaAprob = s.fechaRespuesta?.toDate?.() || s.updatedAt?.toDate?.();
                items.push({
                    id: s.id,
                    fuente: 'solicitud_beneficio',
                    titulo: s.tipoBeneficio ? s.tipoBeneficio.replace(/_/g, ' ') : 'Solicitud de Beneficio',
                    descripcion: s.motivo || s.descripcion || '',
                    fechaSolicitud: fecha,
                    estado: s.estado || 'pendiente',
                    fechaAprobacion: (s.estado === 'aprobada' ? fechaAprob : null),
                    raw: s
                });
            });
        }
        if (comprasPorRUT && comprasPorRUT.success && comprasPorRUT.comprasPorTipo) {
            const comprasObj = comprasPorRUT.comprasPorTipo;
            for (const [tipo, compras] of Object.entries(comprasObj)) {
                if (!Array.isArray(compras)) continue;
                compras.forEach(c => {
                    const fecha = c.createdAt?.toDate?.() || new Date();
                    const fechaAprob = c.fechaRespuesta?.toDate?.() || c.updatedAt?.toDate?.();
                    let titulo = '';
                    let descripcion = '';
                    if (tipo === 'gas') {
                        const total = c.totalCargas ?? (
                            (c.cargas_lipigas ? Object.values(c.cargas_lipigas).reduce((a, b) => a + (b || 0), 0) : 0) +
                            (c.cargas_abastible ? Object.values(c.cargas_abastible).reduce((a, b) => a + (b || 0), 0) : 0)
                        );
                        const precioTotal = c.precioTotal || c.montoTotal || 0;
                        titulo = `Compra de Gas - ${total} carga${total !== 1 ? 's' : ''} - $${precioTotal.toLocaleString('es-CL')}`;
                        const descripcionParts = [];
                        if (precioTotal > 0) descripcionParts.push(`💰 Compra por $${precioTotal.toLocaleString('es-CL')}`);
                        let detallesCargas = [];
                        if (c.compraLipigas && c.cargas_lipigas) {
                            if (c.cargas_lipigas.kg5 > 0) detallesCargas.push(`${c.cargas_lipigas.kg5}×5kg Lipigas`);
                            if (c.cargas_lipigas.kg11 > 0) detallesCargas.push(`${c.cargas_lipigas.kg11}×11kg Lipigas`);
                            if (c.cargas_lipigas.kg15 > 0) detallesCargas.push(`${c.cargas_lipigas.kg15}×15kg Lipigas`);
                            if (c.cargas_lipigas.kg45 > 0) detallesCargas.push(`${c.cargas_lipigas.kg45}×45kg Lipigas`);
                        }
                        if (c.compraAbastible && c.cargas_abastible) {
                            if (c.cargas_abastible.kg5 > 0) detallesCargas.push(`${c.cargas_abastible.kg5}×5kg Abastible`);
                            if (c.cargas_abastible.kg11 > 0) detallesCargas.push(`${c.cargas_abastible.kg11}×11kg Abastible`);
                            if (c.cargas_abastible.kg15 > 0) detallesCargas.push(`${c.cargas_abastible.kg15}×15kg Abastible`);
                            if (c.cargas_abastible.kg45 > 0) detallesCargas.push(`${c.cargas_abastible.kg45}×45kg Abastible`);
                        }
                        if (detallesCargas.length > 0) descripcionParts.push(`⛽ Incluye: ${detallesCargas.join(', ')}`);
                        if (c.fechaCompra) {
                            let fechaCompra = c.fechaCompra;
                            if (/^\d{4}-\d{2}-\d{2}$/.test(fechaCompra)) {
                                const [a, m, d] = fechaCompra.split('-');
                                fechaCompra = `${d}/${m}/${a}`;
                            }
                            descripcionParts.push(`📅 Realizada el ${fechaCompra}`);
                        }
                        if (c.saldoFavor) descripcionParts.push(`💎 Saldo a favor: ${c.saldoFavor}`);
                        descripcion = descripcionParts.join(' • ');
                    } else {
                        const nombreTipo = tipo.charAt(0).toUpperCase() + tipo.slice(1);
                        const cantidad = c.cantidad || c.cantidadEntradas || 0;
                        const precioTotal = c.precioTotal || c.montoTotal || 0;
                        titulo = `${nombreTipo} - ${cantidad} ${cantidad === 1 ? 'entrada' : 'entradas'} - $${precioTotal.toLocaleString('es-CL')}`;
                        const descripcionParts = [];
                        if (precioTotal > 0) descripcionParts.push(`💰 Compra por $${precioTotal.toLocaleString('es-CL')}`);
                        if (c.precioUnitario) descripcionParts.push(`🎫 Precio unitario: $${c.precioUnitario.toLocaleString('es-CL')}`);
                        if (c.fechaCompra) {
                            let fechaCompra = c.fechaCompra;
                            if (/^\d{4}-\d{2}-\d{2}$/.test(fechaCompra)) {
                                const [a, m, d] = fechaCompra.split('-');
                                fechaCompra = `${d}/${m}/${a}`;
                            }
                            descripcionParts.push(`📅 Realizada el ${fechaCompra}`);
                        }
                        descripcion = descripcionParts.join(' • ');
                    }
                    items.push({
                        id: c.id,
                        fuente: `compra_${tipo}`,
                        tipoCompra: tipo,
                        titulo,
                        descripcion,
                        fechaSolicitud: fecha,
                        estado: c.estado || 'pendiente',
                        fechaAprobacion: (c.estado === 'aprobado' ? fechaAprob : null),
                        raw: c
                    });
                });
            }
        }
        if (Array.isArray(prestamos)) {
            prestamos.forEach(p => {
                const fecha = p.createdAt?.toDate?.() || new Date();
                const fechaAprob = p.updatedAt?.toDate?.();
                items.push({
                    id: p.id,
                    fuente: 'prestamo',
                    titulo: `Préstamo - ${p.tipoPrestamo || p.tipo || ''}`,
                    descripcion: p.comentario || '',
                    fechaSolicitud: fecha,
                    estado: p.estado || 'pendiente',
                    fechaAprobacion: (p.estado !== 'pendiente' ? fechaAprob : null),
                    raw: p
                });
            });
        }
        items.sort((a, b) => b.fechaSolicitud - a.fechaSolicitud);
        todasLasSolicitudes = items;
        crearFiltrosSolicitudes();
        renderMisSolicitudes(container, items);
        actualizarContadorSolicitudes(items.length, items.length);
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
    }
}

function renderMisSolicitudes(container, items) {
    if (!container) return;
    if (!items || items.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                <h3 style="margin-bottom: 8px;">No hay solicitudes que mostrar</h3>
                <p>No se encontraron solicitudes con los filtros aplicados.</p>
            </div>
        `;
        return;
    }
    container.innerHTML = '';
    items.forEach(item => {
        const fechaReq = formatDate(item.fechaSolicitud);
        const fechaAprob = item.fechaAprobacion ? formatDate(item.fechaAprobacion) : null;
        const estadoClass = estadoToClass(item.estado);
        const card = document.createElement('div');
        card.className = 'solicitud-item';
        card.style.cssText = `
            display: flex;
            gap: 12px;
            align-items: flex-start;
            background: #fff;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            border: 1px solid #e9ecef;
            transition: all 0.2s ease;
            position: relative;
        `;
        card.addEventListener('mouseenter', () => {
            card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            card.style.transform = 'translateY(-1px)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
            card.style.transform = 'translateY(0)';
        });
        const iconDiv = document.createElement('div');
        iconDiv.style.cssText = 'font-size: 32px; width:60px; text-align:center; margin-top: 4px; flex-shrink: 0;';
        switch (true) {
            case item.fuente.startsWith('compra_gas'):
                iconDiv.textContent = '🛒'; break;
            case item.fuente.startsWith('compra_cine'):
                iconDiv.textContent = '🎬'; break;
            case item.fuente.startsWith('compra_jumper'):
                iconDiv.textContent = '🤸'; break;
            case item.fuente.startsWith('compra_gimnasio'):
                iconDiv.textContent = '💪'; break;
            case item.fuente === 'prestamo':
                iconDiv.textContent = '💰'; break;
            default:
                iconDiv.textContent = '📄';
        }
        const content = document.createElement('div');
        content.style.flex = '1';
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'flex-start';
        header.style.marginBottom = '12px';
        header.style.gap = '12px';
        const titleDiv = document.createElement('div');
        titleDiv.style.flex = '1';
        const title = document.createElement('h4');
        title.style.cssText = 'margin: 0 0 8px 0; color: #2c5aa0; font-size: 18px; font-weight: 600; line-height: 1.3;';
        title.textContent = escapeHtml(item.titulo);
        const description = document.createElement('div');
        description.style.cssText = 'margin: 0; font-size: 14px; color: #495057; line-height: 1.5;';
        description.textContent = escapeHtml(item.descripcion || '');
        titleDiv.appendChild(title);
        if (item.descripcion) { titleDiv.appendChild(description); }
        const badge = document.createElement('div');
        badge.innerHTML = `<span class="badge ${estadoClass}" style="
            padding: 8px 16px; 
            border-radius: 20px; 
            font-weight: 600; 
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            white-space: nowrap;
        ">${capitalize(item.estado)}</span>`;
        header.appendChild(titleDiv);
        header.appendChild(badge);
        const meta = document.createElement('div');
        meta.style.fontSize = '13px';
        meta.style.color = '#6c757d';
        meta.style.marginTop = '16px';
        meta.style.paddingTop = '12px';
        meta.style.borderTop = '1px solid #f1f3f4';
        meta.style.display = 'grid';
        meta.style.gridTemplateColumns = 'auto auto auto';
        meta.style.gap = '12px';
        meta.style.alignItems = 'center';
        let metaHTML = `<div>📅 <strong>Solicitud:</strong> ${fechaReq}</div>`;
        if (fechaAprob) metaHTML += `<div>✅ <strong>Respuesta:</strong> ${fechaAprob}</div>`;
        else metaHTML += `<div>⏳ <strong>Estado:</strong> En proceso</div>`;
        const tipoFuente = getTipoFuenteLabel(item.fuente);
        metaHTML += `<div>🏷️ <strong>Tipo:</strong> ${tipoFuente}</div>`;
        meta.innerHTML = metaHTML;
        content.appendChild(header);
        content.appendChild(meta);
        card.appendChild(iconDiv);
        card.appendChild(content);
        container.appendChild(card);
    });
}

function getTipoFuenteLabel(fuente) {
    const labels = {
        'solicitud_beneficio': 'Beneficio',
        'compra_gas': 'Gas',
        'compra_cine': 'Cine',
        'compra_jumper': 'Jumper',
        'compra_gimnasio': 'Gimnasio',
        'prestamo': 'Préstamo'
    };
    return labels[fuente] || fuente;
}

function formatDate(d) {
    if (!d) return 'N/A';
    const date = (d instanceof Date) ? d : (d.toDate ? d.toDate() : new Date(d));
    const pad = (n) => n.toString().padStart(2, '0');
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hour = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${day}/${month}/${year} ${hour}:${min}`;
}

function estadoToClass(estado) {
    if (!estado) return 'badge-secondary';
    switch (estado.toLowerCase()) {
        case 'pendiente':
        case 'pendiente_comprobante':
        case 'en_revision': return 'badge-warning';
        case 'aprobada':
        case 'aprobado': return 'badge-success';
        case 'rechazada':
        case 'rechazado': return 'badge-danger';
        default: return 'badge-secondary';
    }
}

function capitalize(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ================================
// PERFIL: CARGA Y ACTUALIZACIÓN
// ================================
async function cargarPerfil(funcionario) {
    try {
        const formPerfil = document.querySelectorAll('.profile-card form.profile-form')[0];
        if (formPerfil) {
            const inputs = formPerfil.querySelectorAll('input');
            if (inputs[0]) inputs[0].value = funcionario.nombre || '';
            if (inputs[1]) inputs[1].value = formatearRUT(funcionario.rut) || '';
            if (inputs[2]) inputs[2].value = funcionario.email || '';
            if (inputs[3]) inputs[3].value = funcionario.telefono || '';
        }
        const infoItems = document.querySelectorAll('.info-item .info-value');
        if (infoItems.length >= 3) {
            const fecha = funcionario.fechaAfiliacion?.toDate().toLocaleDateString('es-CL') || 'N/A';
            infoItems[0].textContent = fecha;
            infoItems[1].textContent = funcionario.centroSalud || 'N/A';
            infoItems[2].textContent = funcionario.cargasFamiliares?.length || '0';
        }
        const estadoBadge = document.querySelector('.info-item .badge.success');
        if (estadoBadge) estadoBadge.textContent = funcionario.estado || '';
    } catch (error) {
        console.error('Error al cargar perfil:', error);
    }
}

// ========== FORMULARIO DATOS PERSONALES ==========

document.addEventListener('DOMContentLoaded', function () {
    const formPerfil = document.querySelectorAll('.profile-card form.profile-form')[0];
    if (formPerfil) {
        formPerfil.addEventListener('submit', async function (e) {
            e.preventDefault();
            let statusDiv = formPerfil.querySelector('.status-div');
            if (!statusDiv) {
                statusDiv = document.createElement('div');
                statusDiv.className = 'status-div';
                statusDiv.style.marginTop = "10px";
                formPerfil.appendChild(statusDiv);
            }
            statusDiv.textContent = '';
            statusDiv.style.color = '#333';

            const nombre = this.querySelectorAll('input')[0].value.trim();
            const rut = this.querySelectorAll('input')[1].value.trim().replace(/\./g,'').replace(/-/g,'');
            const email = this.querySelectorAll('input')[2].value.trim();
            const telefono = this.querySelectorAll('input')[3].value.trim();

            const user = auth.currentUser;
            const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
            if (!user || !userData) {
                statusDiv.textContent = 'No se pudo cargar el usuario.';
                statusDiv.style.color = 'red';
                return;
            }

            try {
                await updateDoc(doc(db, 'funcionarios', user.uid), {
                    nombre,
                    rut,
                    email,
                    telefono,
                    updatedAt: new Date()
                });
                if (email !== user.email) {
                    await updateEmail(user, email);
                }
                userData.nombre = nombre;
                userData.rut = rut;
                userData.email = email;
                userData.telefono = telefono;
                sessionStorage.setItem('userData', JSON.stringify(userData));
                statusDiv.textContent = 'Cambios guardados correctamente.';
                statusDiv.style.color = 'green';
            } catch (error) {
                statusDiv.textContent = 'Error al guardar cambios: ' + (error.message || error);
                statusDiv.style.color = 'red';
            }
        });
    }

    const formPassword = document.querySelectorAll('.profile-card form.profile-form')[1];
    if (formPassword) {
        formPassword.addEventListener('submit', async function (e) {
            e.preventDefault();
            let statusDiv = formPassword.querySelector('.status-div');
            if (!statusDiv) {
                statusDiv = document.createElement('div');
                statusDiv.className = 'status-div';
                statusDiv.style.marginTop = "10px";
                formPassword.appendChild(statusDiv);
            }
            statusDiv.textContent = '';

            const currentPass = this.querySelectorAll('input')[0].value;
            const newPass = this.querySelectorAll('input')[1].value;
            const confirmPass = this.querySelectorAll('input')[2].value;

            if (newPass.length < 6) {
                statusDiv.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
                statusDiv.style.color = 'red';
                return;
            }
            if (newPass !== confirmPass) {
                statusDiv.textContent = 'La nueva contraseña y la confirmación no coinciden.';
                statusDiv.style.color = 'red';
                return;
            }
            const user = auth.currentUser;
            const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
            if (!user || !userData) {
                statusDiv.textContent = 'No se pudo cargar el usuario.';
                statusDiv.style.color = 'red';
                return;
            }

            try {
                const credential = EmailAuthProvider.credential(user.email, currentPass);
                await reauthenticateWithCredential(user, credential);
                await updatePassword(user, newPass);
                statusDiv.textContent = 'Contraseña cambiada correctamente.';
                statusDiv.style.color = 'green';
                this.querySelectorAll('input')[0].value = '';
                this.querySelectorAll('input')[1].value = '';
                this.querySelectorAll('input')[2].value = '';
            } catch (error) {
                if (error.code === 'auth/wrong-password') {
                    statusDiv.textContent = 'La contraseña actual es incorrecta.';
                } else {
                    statusDiv.textContent = 'Error al cambiar contraseña: ' + (error.message || error);
                }
                statusDiv.style.color = 'red';
            }
        });
    }
});

// TABS Y FUNCIONES GLOBALES
document.addEventListener('DOMContentLoaded', function () {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    navTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            navTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            const targetContent = document.getElementById(`tab-${tabId}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            window.scrollTo({
                top: document.querySelector('.dashboard-content')?.offsetTop - 100 || 0,
                behavior: 'smooth'
            });
        });
    });
});

window.logout = async function () {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        await cerrarSesion();
    }
}
window.nuevaSolicitud = function () {
    alert('Función de nueva solicitud en desarrollo.\nPróximamente podrás crear solicitudes desde aquí.');
}
window.verDetalleSolicitud = function (solicitudId) {
    alert(`Ver detalle de solicitud: ${solicitudId}`);
}
function animateStats() {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}
window.addEventListener('load', animateStats);
