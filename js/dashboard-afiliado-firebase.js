// Dashboard del Afiliado - Versión Corregida Sin Notificaciones
// Modificado para mostrar todas las compras y préstamos en la pestaña "Mis Solicitudes"
// CON SISTEMA DE FILTROS PARA SOLICITUDES Y DETALLE DE CUPONES DE GAS

import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    obtenerFuncionario,
    obtenerSolicitudesFuncionario
} from './firestore-operations.js';
import { cerrarSesion } from './auth.js';

// Nuevas importaciones para obtener compras y préstamos
import { obtenerComprasPorRUT } from './compras-gas-firebase.js';
import { obtenerSolicitudesPrestamosPorUID } from './prestamos-firebase.js';

// NUEVA IMPORTACIÓN: Sistema de detalle de cupones de gas
import { 
    inicializarDetalleGas, 
    obtenerDetalleGasMensual,
    crearWidgetCupoGas 
} from './detalle-cupones-gas.js';

// Variable global para almacenar todas las solicitudes (para filtrado)
let todasLasSolicitudes = [];

// Verificar autenticación al cargar
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userType = sessionStorage.getItem('userType');
        
        if (userType !== 'funcionario') {
            window.location.href = 'login.html';
            return;
        }
        
        // Cargar datos del usuario
        await cargarDatosUsuario(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

// Cargar datos del usuario
async function cargarDatosUsuario(uid) {
    try {
        const funcionario = await obtenerFuncionario(uid);
        
        if (!funcionario) {
            alert('Error al cargar datos del usuario');
            return;
        }
        
        // Actualizar información en la UI
        const userNameEl = document.querySelector('.user-name');
        const userRutEl = document.querySelector('.user-rut');
        const bienvenidaEl = document.getElementById('bienvenida-usuario');
        
        if (userNameEl) userNameEl.textContent = `👤 ${funcionario.nombre}`;
        if (userRutEl) userRutEl.textContent = `RUT: ${funcionario.rut}`;
        if (bienvenidaEl) {
            const primerNombre = funcionario.nombre.split(" ")[0];
            bienvenidaEl.textContent = funcionario.genero === 'F' ? `¡Bienvenida, ${primerNombre}!` : `¡Bienvenido, ${primerNombre}!`;
        }

        // Cargar estadísticas
        await cargarEstadisticas(uid, funcionario.fechaAfiliacion);
        
        // Cargar solicitudes (ahora incluye compras y préstamos). Pasamos el RUT.
        await cargarSolicitudes(uid, funcionario.rut);
        
        // NUEVO: Inicializar sistema de detalle de cupones de gas
        await inicializarSistemaDetalleGas(funcionario.rut);
        
        // Cargar perfil
        await cargarPerfil(funcionario);
        
    } catch (error) {
        console.error('Error al cargar datos:', error);
    }
}

// Cargar estadísticas del dashboard
async function cargarEstadisticas(uid, fechaAfiliacion) {
    try {
        const solicitudes = await obtenerSolicitudesFuncionario(uid);
        
        const solicitudesPendientes = solicitudes.filter(s => 
            s.estado === 'pendiente' || s.estado === 'en_revision'
        ).length;

        // Actualizar cards de estadísticas
        const beneficiosEl = document.getElementById('beneficios-recibidos');
        const solicitudesEl = document.getElementById('solicitudes-pendientes');
        const conveniosEl = document.getElementById('convenios-disponibles');
        const tiempoEl = document.getElementById('tiempo-afiliacion');
        
        if (beneficiosEl) beneficiosEl.textContent = '$0';
        if (solicitudesEl) solicitudesEl.textContent = solicitudesPendientes;
        if (conveniosEl) conveniosEl.textContent = "24";

        // Tiempo de afiliación
        if (fechaAfiliacion && fechaAfiliacion.toDate && tiempoEl) {
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

// ========================================
// SISTEMA DE FILTROS PARA SOLICITUDES
// ========================================

/**
 * Crea los filtros para las solicitudes si no existen
 */
function crearFiltrosSolicitudes() {
    const container = document.getElementById('listaSolicitudes');
    if (!container) return;
    
    // Verificar si ya existe el contenedor de filtros
    let filtrosContainer = document.getElementById('filtros-solicitudes');
    if (filtrosContainer) return; // Ya existe
    
    // Crear contenedor de filtros
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
    
    // HTML de los filtros
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
                        <option value="aprobada">Aprobadas</option>
                        <option value="aprobado">Aprobadas</option>
                        <option value="rechazada">Rechazadas</option>
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
                        <option value="solicitud_beneficio">Beneficios</option>
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
    
    // Insertar antes del contenedor de solicitudes
    container.parentNode.insertBefore(filtrosContainer, container);
    
    // Agregar event listeners
    document.getElementById('filtro-estado').addEventListener('change', aplicarFiltros);
    document.getElementById('filtro-tipo').addEventListener('change', aplicarFiltros);
    document.getElementById('limpiar-filtros').addEventListener('click', limpiarFiltros);
}

/**
 * Aplica los filtros seleccionados a las solicitudes
 */
function aplicarFiltros() {
    const filtroEstado = document.getElementById('filtro-estado')?.value || 'todas';
    const filtroTipo = document.getElementById('filtro-tipo')?.value || 'todos';
    
    console.log('🔍 Aplicando filtros:', { estado: filtroEstado, tipo: filtroTipo });
    
    let solicitudesFiltradas = [...todasLasSolicitudes];
    
    // Filtrar por estado
    if (filtroEstado !== 'todas') {
        solicitudesFiltradas = solicitudesFiltradas.filter(solicitud => {
            const estado = (solicitud.estado || '').toLowerCase();
            const filtro = filtroEstado.toLowerCase();
            
            // Manejar sinónimos de estados
            if (filtro === 'aprobada' || filtro === 'aprobado') {
                return estado === 'aprobada' || estado === 'aprobado';
            }
            if (filtro === 'rechazada' || filtro === 'rechazado') {
                return estado === 'rechazada' || estado === 'rechazado';
            }
            
            return estado === filtro;
        });
    }
    
    // Filtrar por tipo
    if (filtroTipo !== 'todos') {
        solicitudesFiltradas = solicitudesFiltradas.filter(solicitud => {
            if (filtroTipo === 'solicitud_beneficio') {
                return solicitud.fuente === 'solicitud_beneficio';
            }
            if (filtroTipo === 'prestamo') {
                return solicitud.fuente === 'prestamo';
            }
            if (filtroTipo.startsWith('compra_')) {
                return solicitud.fuente === filtroTipo;
            }
            return true;
        });
    }
    
    console.log(`📊 Filtros aplicados: ${solicitudesFiltradas.length} de ${todasLasSolicitudes.length} solicitudes`);
    
    // Renderizar solicitudes filtradas
    const container = document.getElementById('listaSolicitudes');
    renderMisSolicitudes(container, solicitudesFiltradas);
    
    // Actualizar contador
    actualizarContadorSolicitudes(solicitudesFiltradas.length, todasLasSolicitudes.length);
}

/**
 * Limpia todos los filtros y muestra todas las solicitudes
 */
function limpiarFiltros() {
    document.getElementById('filtro-estado').value = 'todas';
    document.getElementById('filtro-tipo').value = 'todos';
    
    const container = document.getElementById('listaSolicitudes');
    renderMisSolicitudes(container, todasLasSolicitudes);
    
    actualizarContadorSolicitudes(todasLasSolicitudes.length, todasLasSolicitudes.length);
    
    console.log('🔄 Filtros limpiados, mostrando todas las solicitudes');
}

/**
 * Actualiza el contador de solicitudes mostradas
 */
function actualizarContadorSolicitudes(mostradas, total) {
    const contador = document.getElementById('contador-solicitudes');
    if (contador) {
        contador.textContent = `Mostrando ${mostradas} de ${total} solicitudes`;
        
        // Cambiar color según si hay filtros activos
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

// ========================================
// CARGAR SOLICITUDES (MODIFICADO)
// ========================================

// Cargar solicitudes (ahora combina: solicitudes, compras y préstamos)
async function cargarSolicitudes(uid, rut) {
    try {
        // Contenedores
        const container = document.getElementById('listaSolicitudes');
        if (!container) return;
        container.innerHTML = '<p>Cargando solicitudes y compras...</p>';

        // 1) Solicitudes tradicionales (beneficios)
        const solicitudes = await obtenerSolicitudesFuncionario(uid);

        // 2) Compras (gas + entretenimiento) por RUT
        let comprasPorRUT = { success: false, comprasPorTipo: {} };
        try {
            comprasPorRUT = await obtenerComprasPorRUT(rut);
        } catch (err) {
            console.error('Error al obtener compras por RUT:', err);
        }

        // 3) Solicitudes de préstamos por UID
        let prestamos = [];
        try {
            prestamos = await obtenerSolicitudesPrestamosPorUID(uid);
        } catch (err) {
            console.error('Error al obtener solicitudes de préstamos:', err);
        }

        // Normalizar y combinar todos los ítems en una sola lista
        const items = [];

        // Mapear solicitudes (beneficios)
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

        // Mapear compras (comprasPorTipo: {gas: [...], cine: [...], ...})
        if (comprasPorRUT && comprasPorRUT.success && comprasPorRUT.comprasPorTipo) {
            const comprasObj = comprasPorRUT.comprasPorTipo;
            for (const [tipo, compras] of Object.entries(comprasObj)) {
                if (!Array.isArray(compras)) continue;
                compras.forEach(c => {
                    const fecha = c.createdAt?.toDate?.() || new Date();
                    // tratar fecha de aprobación si existe (fechaRespuesta o updatedAt)
                    const fechaAprob = c.fechaRespuesta?.toDate?.() || c.updatedAt?.toDate?.();
                    let titulo = '';
                    let descripcion = '';

                    if (tipo === 'gas') {
                        // calcular total de cargas si no está
                        const total = c.totalCargas ?? (
                            (c.cargas_lipigas ? Object.values(c.cargas_lipigas).reduce((a,b)=>a+(b||0),0):0) +
                            (c.cargas_abastible ? Object.values(c.cargas_abastible).reduce((a,b)=>a+(b||0),0):0)
                        );
                        titulo = `Compra de Gas (${total} carga${total !== 1 ? 's' : ''})`;
                        descripcion = `Lipigas: ${c.compraLipigas ? 'Sí' : 'No'} • Abastible: ${c.compraAbastible ? 'Sí' : 'No'}`;
                    } else {
                        // entretenimiento: cine, jumper, gimnasio
                        const nombreTipo = tipo.charAt(0).toUpperCase() + tipo.slice(1);
                        const cantidad = c.cantidad || c.cantidadEntradas || 0;
                        titulo = `${nombreTipo} - ${cantidad} ${cantidad === 1 ? 'entrada' : 'entradas'}`;
                        descripcion = `Precio total: ${c.montoTotal ? '$' + c.montoTotal.toLocaleString('es-CL') : 'N/A'}`;
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
        } else {
            // Si no devolvió success puede que la función devuelva directamente arrays (compatibilidad)
            if (comprasPorRUT && comprasPorRUT.comprasPorTipo) {
                // ya cubierto arriba; si estructura distinta, ignoramos silenciosamente
            }
        }

        // Mapear préstamos
        if (Array.isArray(prestamos)) {
            prestamos.forEach(p => {
                const fecha = p.createdAt?.toDate?.() || new Date();
                const fechaAprob = p.updatedAt?.toDate?.(); // en prestamos-firebase usamos updatedAt
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

        // Ordenar items por fechaSolicitud descendente
        items.sort((a, b) => b.fechaSolicitud - a.fechaSolicitud);

        // Guardar todas las solicitudes para filtrado
        todasLasSolicitudes = items;

        // Crear filtros si no existen
        crearFiltrosSolicitudes();

        // Renderizar todas las solicitudes inicialmente
        renderMisSolicitudes(container, items);

        // Actualizar contador
        actualizarContadorSolicitudes(items.length, items.length);

    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
    }
}

// Renderiza la lista unificada de solicitudes/compras/prestamos
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
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            border: 1px solid #e9ecef;
            transition: all 0.2s ease;
        `;

        // Efecto hover
        card.addEventListener('mouseenter', () => {
            card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            card.style.transform = 'translateY(-1px)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
            card.style.transform = 'translateY(0)';
        });

        const iconDiv = document.createElement('div');
        iconDiv.style.cssText = 'font-size: 28px; width:50px; text-align:center; margin-top: 4px;';

        // icono según fuente
        switch (true) {
            case item.fuente.startsWith('compra_gas'):
                iconDiv.textContent = '🛒';
                break;
            case item.fuente.startsWith('compra_cine'):
                iconDiv.textContent = '🎬';
                break;
            case item.fuente.startsWith('compra_jumper'):
                iconDiv.textContent = '🤸';
                break;
            case item.fuente.startsWith('compra_gimnasio'):
                iconDiv.textContent = '💪';
                break;
            case item.fuente === 'prestamo':
                iconDiv.textContent = '💰';
                break;
            default:
                iconDiv.textContent = '📄';
        }

        const content = document.createElement('div');
        content.style.flex = '1';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'flex-start';
        header.style.marginBottom = '8px';
        header.style.gap = '12px';

        const titleDiv = document.createElement('div');
        titleDiv.style.flex = '1';

        const title = document.createElement('h4');
        title.style.cssText = 'margin: 0 0 4px 0; color: #2c5aa0; font-size: 16px; font-weight: 600;';
        title.textContent = escapeHtml(item.titulo);

        const description = document.createElement('p');
        description.style.cssText = 'margin: 0; font-size: 14px; color: #6c757d; line-height: 1.4;';
        description.textContent = escapeHtml(item.descripcion || '');

        titleDiv.appendChild(title);
        if (item.descripcion) {
            titleDiv.appendChild(description);
        }

        const badge = document.createElement('div');
        badge.innerHTML = `<span class="badge ${estadoClass}" style="
            padding: 6px 12px; 
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
        meta.style.marginTop = '12px';
        meta.style.paddingTop = '8px';
        meta.style.borderTop = '1px solid #f1f3f4';
        
        let metaHTML = `📅 Fecha solicitud: <strong>${fechaReq}</strong>`;
        if (fechaAprob) {
            metaHTML += ` &nbsp;•&nbsp; ✅ Fecha respuesta: <strong>${fechaAprob}</strong>`;
        }
        
        // Agregar tipo de fuente
        const tipoFuente = getTipoFuenteLabel(item.fuente);
        metaHTML += ` &nbsp;•&nbsp; 🏷️ Tipo: <strong>${tipoFuente}</strong>`;
        
        meta.innerHTML = metaHTML;

        content.appendChild(header);
        content.appendChild(meta);

        card.appendChild(iconDiv);
        card.appendChild(content);

        container.appendChild(card);
    });
}

// ========================================
// FUNCIONES AUXILIARES
// ========================================

/**
 * Obtiene la etiqueta legible del tipo de fuente
 */
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

// Utils
function formatDate(d) {
    if (!d) return 'N/A';
    const date = (d instanceof Date) ? d : (d.toDate ? d.toDate() : new Date(d));
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
           ' ' +
           date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function estadoToClass(estado) {
    if (!estado) return 'badge-secondary';
    switch (estado.toLowerCase()) {
        case 'pendiente':
        case 'pendiente_comprobante':
        case 'en_revision':
            return 'badge-warning';
        case 'aprobada':
        case 'aprobado':
            return 'badge-success';
        case 'rechazada':
        case 'rechazado':
            return 'badge-danger';
        default:
            return 'badge-secondary';
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

// ========================================
// SISTEMA DE DETALLE DE CUPONES DE GAS
// ========================================

/**
 * Inicializa el sistema de detalle de cupones de gas en el dashboard
 * @param {string} rut - RUT del usuario
 */
async function inicializarSistemaDetalleGas(rut) {
    try {
        console.log('🔄 Inicializando sistema de detalle de cupones de gas...');
        
        // Obtener detalle completo de gas del mes
        const detalleGas = await obtenerDetalleGasMensual(rut);
        
        if (!detalleGas.success) {
            console.error('❌ Error al obtener detalle de gas:', detalleGas.error);
            return;
        }
        
        // 1. Crear widget en la sección de resumen (si existe)
        crearWidgetCupoGasEnResumen(detalleGas);
        
        // 2. Agregar pestaña específica para cupones de gas
        agregarPestañaCuponesGas(detalleGas);
        
        // 3. Actualizar estadísticas de gas en el dashboard principal
        actualizarEstadisticasGasEnDashboard(detalleGas);
        
        console.log('✅ Sistema de detalle de cupones de gas inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error al inicializar sistema de detalle de gas:', error);
    }
}

/**
 * Crea el widget de cupo de gas en la sección de resumen del dashboard
 */
function crearWidgetCupoGasEnResumen(detalleGas) {
    // Buscar contenedor en la sección de resumen
    let widgetContainer = document.getElementById('widget-cupo-gas');
    
    if (!widgetContainer) {
        // Si no existe, crear uno en la sección de estadísticas
        const statsContainer = document.querySelector('.dashboard-stats') || 
                              document.querySelector('.stats-container') ||
                              document.querySelector('#tab-resumen');
        
        if (statsContainer) {
            widgetContainer = document.createElement('div');
            widgetContainer.id = 'widget-cupo-gas';
            widgetContainer.className = 'stat-card';
            widgetContainer.style.cssText = 'margin-bottom: 20px;';
            
            // Insertar después de las estadísticas principales
            const existingStats = statsContainer.querySelector('.stat-cards');
            if (existingStats) {
                existingStats.appendChild(widgetContainer);
            } else {
                statsContainer.appendChild(widgetContainer);
            }
        }
    }
    
    if (widgetContainer) {
        crearWidgetCupoGas('widget-cupo-gas', detalleGas);
        console.log('✅ Widget de cupo de gas creado en resumen');
    }
}

/**
 * Agrega una pestaña específica para mostrar el detalle completo de cupones de gas
 */
function agregarPestañaCuponesGas(detalleGas) {
    // Buscar contenedor de pestañas
    const tabsContainer = document.querySelector('.nav-tabs');
    const contentContainer = document.querySelector('.tab-contents') || 
                            document.querySelector('.dashboard-content');
    
    if (!tabsContainer || !contentContainer) {
        console.warn('⚠️ No se encontraron contenedores de pestañas para agregar cupo de gas');
        return;
    }
    
    // Verificar si la pestaña ya existe
    if (document.querySelector('[data-tab="cupones-gas"]')) {
        console.log('ℹ️ Pestaña de cupones de gas ya existe, actualizando contenido...');
        const existingContent = document.getElementById('tab-cupones-gas');
        if (existingContent) {
            existingContent.innerHTML = generarContenidoPestañaGas(detalleGas);
        }
        return;
    }
    
    // Crear nueva pestaña
    const nuevaPestaña = document.createElement('button');
    nuevaPestaña.className = 'nav-tab';
    nuevaPestaña.setAttribute('data-tab', 'cupones-gas');
    nuevaPestaña.innerHTML = '🛒 Cupones Gas';
    
    // Insertar la pestaña (antes de la pestaña de perfil si existe)
    const perfilTab = document.querySelector('[data-tab="perfil"]');
    if (perfilTab) {
        tabsContainer.insertBefore(nuevaPestaña, perfilTab);
    } else {
        tabsContainer.appendChild(nuevaPestaña);
    }
    
    // Crear contenido de la pestaña
    const nuevoContenido = document.createElement('div');
    nuevoContenido.id = 'tab-cupones-gas';
    nuevoContenido.className = 'tab-content';
    nuevoContenido.innerHTML = generarContenidoPestañaGas(detalleGas);
    
    // Agregar al contenedor de contenidos
    contentContainer.appendChild(nuevoContenido);
    
    // Inicializar widgets en la nueva pestaña
    setTimeout(() => {
        // Widget resumen en la pestaña
        crearWidgetCupoGas('widget-cupo-gas-detalle', detalleGas);
        
        // Detalle completo
        import('./detalle-cupones-gas.js').then(module => {
            module.renderizarDetalleGas('detalle-gas-completo', detalleGas);
        });
    }, 100);
    
    // Agregar event listener para la nueva pestaña
    nuevaPestaña.addEventListener('click', function() {
        // Remover clase active de todas las pestañas
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Activar esta pestaña
        this.classList.add('active');
        nuevoContenido.classList.add('active');
        
        // Scroll suave
        window.scrollTo({
            top: document.querySelector('.dashboard-content')?.offsetTop - 100 || 0,
            behavior: 'smooth'
        });
    });
    
    console.log('✅ Pestaña de cupones de gas agregada');
}

/**
 * Genera el contenido HTML para la pestaña de cupones de gas
 */
function generarContenidoPestañaGas(detalleGas) {
    return `
        <div class="cupones-gas-content">
            <div class="section-header">
                <h2>🛒 Mis Cupones de Gas - ${detalleGas.mesActual}</h2>
                <p class="section-description">
                    Detalle completo de tus compras de gas del mes actual. 
                    Aquí puedes ver exactamente qué cargas has comprado de cada empresa y tu cupo disponible.
                </p>
            </div>
            
            <!-- Widget resumen en la parte superior -->
            <div class="resumen-superior">
                <div id="widget-cupo-gas-detalle" class="widget-container"></div>
            </div>
            
            <!-- Detalle completo -->
            <div id="detalle-gas-completo" class="detalle-container">
                <!-- Aquí se insertará el detalle completo -->
            </div>
            
            <!-- Información adicional y ayuda -->
            <div class="info-ayuda">
                <div class="info-box">
                    <h4>📋 Información Importante</h4>
                    <ul>
                        <li><strong>Temporada actual:</strong> ${detalleGas.temporadaTexto}</li>
                        <li><strong>Límite mensual:</strong> ${detalleGas.limiteActual} cargas</li>
                        <li><strong>Próximo reset:</strong> 1° del próximo mes</li>
                        <li><strong>¿Dudas?</strong> Contacta a bienestar@aps.cl</li>
                    </ul>
                </div>
                
                <div class="acciones-rapidas">
                    <h4>⚡ Acciones Rápidas</h4>
                    <div class="botones-accion">
                        <button onclick="irACompraGas()" class="btn-accion">
                            🛒 Comprar Gas
                        </button>
                        <button onclick="actualizarDetalleGas()" class="btn-accion">
                            🔄 Actualizar Datos
                        </button>
                        <button onclick="descargarReporteGas()" class="btn-accion">
                            📊 Descargar Reporte
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Actualiza las estadísticas de gas en el dashboard principal
 */
function actualizarEstadisticasGasEnDashboard(detalleGas) {
    // Buscar y actualizar estadísticas relacionadas con gas
    const gasStats = document.querySelectorAll('[data-stat="gas"], #gas-stats, .gas-counter');
    
    gasStats.forEach(element => {
        if (element.textContent.includes('gas') || element.textContent.includes('Gas')) {
            element.textContent = `${detalleGas.totalCargas}/${detalleGas.limiteActual}`;
            
            // Agregar color según el estado
            element.style.color = detalleGas.estadoCupo === 'critico' ? '#fd7e14' :
                                 detalleGas.estadoCupo === 'agotado' ? '#dc3545' : '#28a745';
        }
    });
    
    // Actualizar card específico de gas si existe
    const gasCard = document.querySelector('.gas-card, #card-gas');
    if (gasCard) {
        gasCard.innerHTML = `
            <div class="card-header">
                <h4>🛒 Cupo Gas</h4>
                <span class="badge ${getBadgeClass(detalleGas.estadoCupo)}">${detalleGas.estadoCupo.toUpperCase()}</span>
            </div>
            <div class="card-body">
                <div class="big-number">${detalleGas.totalCargas}/${detalleGas.limiteActual}</div>
                <div class="card-subtitle">cargas usadas este mes</div>
                <div class="progress-mini">
                    <div class="progress-bar-mini" style="width: ${detalleGas.porcentajeUso}%; background: ${getColorProgreso(detalleGas.porcentajeUso)};"></div>
                </div>
            </div>
        `;
    }
}

// ========================================
// FUNCIONES AUXILIARES PARA DETALLE DE GAS
// ========================================

function getColorProgreso(porcentaje) {
    if (porcentaje >= 90) return '#dc3545';
    if (porcentaje >= 75) return '#fd7e14';
    if (porcentaje >= 50) return '#ffc107';
    return '#28a745';
}

function getBadgeClass(estado) {
    switch (estado.toLowerCase()) {
        case 'agotado': return 'badge-danger';
        case 'critico': return 'badge-warning';
        case 'medio': return 'badge-warning';
        case 'disponible': return 'badge-success';
        default: return 'badge-secondary';
    }
}

// Funciones globales para los botones de acción
window.irACompraGas = function() {
    const tabCompras = document.querySelector('[data-tab="compras-gas"]');
    if (tabCompras) {
        tabCompras.click();
    } else {
        alert('La funcionalidad de compra de gas estará disponible próximamente');
    }
};

window.actualizarDetalleGas = async function() {
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    const rut = userData.rut;
    
    if (!rut) {
        alert('No se pudo obtener el RUT del usuario');
        return;
    }
    
    try {
        // Mostrar indicador de carga
        const container = document.getElementById('detalle-gas-completo');
        if (container) {
            container.innerHTML = '<div class="loading-indicator">⏳ Actualizando datos...</div>';
        }
        
        // Reinicializar sistema
        await inicializarSistemaDetalleGas(rut);
        
        alert('✅ Datos actualizados correctamente');
    } catch (error) {
        console.error('Error al actualizar:', error);
        alert('❌ Error al actualizar los datos');
    }
};

window.descargarReporteGas = function() {
    // Implementar descarga de reporte en futuras versiones
    alert('📊 La funcionalidad de descarga de reportes estará disponible próximamente');
};
async function cargarPerfil(funcionario) {
    try {
        // Llenar formulario de información personal
        const inputs = document.querySelectorAll('#tab-perfil input[type="text"]');
        if (inputs[0]) inputs[0].value = funcionario.nombre || '';
        if (inputs[1]) inputs[1].value = funcionario.rut || '';
        
        const emailInput = document.querySelector('#tab-perfil input[type="email"]');
        if (emailInput) emailInput.value = funcionario.email || '';
        
        const telInput = document.querySelector('#tab-perfil input[type="tel"]');
        if (telInput) telInput.value = funcionario.telefono || '';
        
        // Información de cuenta
        const infoItems = document.querySelectorAll('.info-item .info-value');
        if (infoItems.length >= 3) {
            const fecha = funcionario.fechaAfiliacion?.toDate().toLocaleDateString('es-CL') || 'N/A';
            infoItems[0].textContent = fecha;
            infoItems[1].textContent = funcionario.centroSalud || 'N/A';
            infoItems[2].textContent = funcionario.cargasFamiliares?.length || '0';
        }
        
        const estadoBadge = document.querySelector('.info-item .badge.success');
        if (estadoBadge) {
            estadoBadge.textContent = funcionario.estado || '';
        }
    } catch (error) {
        console.error('Error al cargar perfil:', error);
    }
}

// Manejo de tabs (el resto del archivo se mantiene)
document.addEventListener('DOMContentLoaded', function() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
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

// Función de logout
window.logout = async function() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        await cerrarSesion();
    }
}

// Función para nueva solicitud
window.nuevaSolicitud = function() {
    alert('Función de nueva solicitud en desarrollo.\nPróximamente podrás crear solicitudes desde aquí.');
}

// Funciones auxiliares
window.verDetalleSolicitud = function(solicitudId) {
    alert(`Ver detalle de solicitud: ${solicitudId}`);
}

// Animación de entrada para las estadísticas
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

// ========================================
// ESTILOS CSS PARA LOS BADGES
// ========================================

// Agregar estilos CSS dinámicamente
const style = document.createElement('style');
style.textContent = `
    .badge {
        display: inline-block;
        font-size: 11px;
        font-weight: 600;
        text-align: center;
        white-space: nowrap;
        vertical-align: baseline;
        border-radius: 20px;
        padding: 6px 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .badge-success {
        background-color: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }
    
    .badge-warning {
        background-color: #fff3cd;
        color: #856404;
        border: 1px solid #ffeaa7;
    }
    
    .badge-danger {
        background-color: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }
    
    .badge-secondary {
        background-color: #e2e3e5;
        color: #383d41;
        border: 1px solid #d6d8db;
    }
    
    .filtros-container select:hover {
        border-color: #80bdff;
        box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
    }
    
    .filtros-container button:hover {
        background-color: #5a6268 !important;
        transform: translateY(-1px);
    }
    
    .solicitud-item:hover {
        border-color: #80bdff;
    }
`;

document.head.appendChild(style);
