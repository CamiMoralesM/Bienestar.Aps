// Dashboard del Afiliado - Versión con Estilo Simplificado para Compras de Gas
// Modificado para mostrar las compras de gas con el mismo estilo que entretenimiento
// CON SISTEMA DE FILTROS PARA SOLICITUDES Y ESTILO CONSISTENTE

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
                        // ========================================
                        // CAMBIO PRINCIPAL: ESTILO SIMPLIFICADO PARA GAS
                        // ========================================
                        
                        // Calcular total de cargas si no está
                        const total = c.totalCargas ?? (
                            (c.cargas_lipigas ? Object.values(c.cargas_lipigas).reduce((a,b)=>a+(b||0),0):0) +
                            (c.cargas_abastible ? Object.values(c.cargas_abastible).reduce((a,b)=>a+(b||0),0):0)
                        );
                        
                        // Obtener precio total desde Firebase (ya calculado en el backend)
                        const precioTotal = c.precioTotal || c.montoTotal || 0;
                        
                        // FORMATO SIMPLIFICADO: igual que entretenimiento
                        titulo = `Compra de Gas - ${total} carga${total !== 1 ? 's' : ''} - $${precioTotal.toLocaleString('es-CL')}`;
                        
                        // Descripción simple y limpia
                        const descripcionParts = [];
                        
                        // Agregar precio unitario si está disponible
                        if (c.precioUnitario) {
                            descripcionParts.push(`Precio unitario: $${c.precioUnitario.toLocaleString('es-CL')}`);
                        }
                        
                        // Agregar información de fecha de compra si está disponible
                        if (c.fechaCompra) {
                            descripcionParts.push(`Fecha compra: ${c.fechaCompra}`);
                        }
                        
                        // Información adicional opcional
                        if (c.saldoFavor) {
                            descripcionParts.push(`Saldo a favor: ${c.saldoFavor}`);
                        }
                        
                        descripcion = descripcionParts.length > 0 ? descripcionParts.join(' • ') : '';
                        
                    } else {
                        // entretenimiento: cine, jumper, gimnasio
                        const nombreTipo = tipo.charAt(0).toUpperCase() + tipo.slice(1);
                        const cantidad = c.cantidad || c.cantidadEntradas || 0;
                        const precioTotal = c.precioTotal || c.montoTotal || 0;
                        
                        titulo = `${nombreTipo} - ${cantidad} ${cantidad === 1 ? 'entrada' : 'entradas'} - $${precioTotal.toLocaleString('es-CL')}`;
                        
                        descripcion = `Precio total: $${precioTotal.toLocaleString('es-CL')}`;
                        if (c.precioUnitario) {
                            descripcion += ` • Precio unitario: $${c.precioUnitario.toLocaleString('es-CL')}`;
                        }
                        if (c.fechaCompra) {
                            descripcion += ` • Fecha compra: ${c.fechaCompra}`;
                        }
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

// ========================================
// RENDERIZAR SOLICITUDES CON ESTILO CONSISTENTE
// ========================================

// Renderiza la lista unificada de solicitudes/compras/prestamos con estilo consistente
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
        iconDiv.style.cssText = 'font-size: 32px; width:60px; text-align:center; margin-top: 4px; flex-shrink: 0;';

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
        header.style.marginBottom = '12px';
        header.style.gap = '12px';

        const titleDiv = document.createElement('div');
        titleDiv.style.flex = '1';

        const title = document.createElement('h4');
        title.style.cssText = 'margin: 0 0 8px 0; color: #2c5aa0; font-size: 18px; font-weight: 600; line-height: 1.3;';
        title.textContent = escapeHtml(item.titulo);

        const description = document.createElement('div');
        description.style.cssText = 'margin: 0; font-size: 14px; color: #495057; line-height: 1.5;';
        
        // ========================================
        // CAMBIO: DESCRIPCIÓN SIMPLE PARA TODAS LAS COMPRAS
        // ========================================
        description.textContent = escapeHtml(item.descripcion || '');

        titleDiv.appendChild(title);
        if (item.descripcion) {
            titleDiv.appendChild(description);
        }

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
        
        let metaHTML = `
            <div>📅 <strong>Solicitud:</strong> ${fechaReq}</div>
        `;
        
        if (fechaAprob) {
            metaHTML += `<div>✅ <strong>Respuesta:</strong> ${fechaAprob}</div>`;
        } else {
            metaHTML += `<div>⏳ <strong>Estado:</strong> En proceso</div>`;
        }
        
        // Agregar tipo de fuente
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
    return date.toLocaleDateString('es-CL', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    }) + ' ' + date.toLocaleTimeString('es-CL', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
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

// Cargar datos del perfil
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
