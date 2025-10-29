import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    obtenerFuncionario,
    obtenerSolicitudesFuncionario,
    actualizarFuncionario
} from './firestore-operations.js';
import { cerrarSesion } from './auth.js';
import { obtenerComprasPorRUT } from './compras-gas-firebase.js';
import { obtenerSolicitudesPrestamosPorUID } from './prestamos-firebase.js';
import { updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variable global para almacenar todas las solicitudes (para filtrado)
let todasLasSolicitudes = [];

// Autenticación
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

// ================================
// NUEVA FUNCIÓN: CARGAR PENDIENTES EN RESUMEN
// ================================
async function cargarPendientesResumen(uid, rut) {
    // 1. Solicitudes de beneficios
    const solicitudes = await obtenerSolicitudesFuncionario(uid);
    const pendientesBeneficio = solicitudes.filter(s =>
        s.estado === 'pendiente' || s.estado === 'en_revision'
    ).length;

    // 2. Compras (gas, cine, jumper, gimnasio)
    let comprasPorRUT = { success: false, comprasPorTipo: {} };
    try { comprasPorRUT = await obtenerComprasPorRUT(rut); } catch (err) {}
    let pendientesCompras = 0;
    if (comprasPorRUT && comprasPorRUT.success && comprasPorRUT.comprasPorTipo) {
        Object.values(comprasPorRUT.comprasPorTipo).forEach(lista => {
            pendientesCompras += (lista || []).filter(c =>
                c.estado === 'pendiente' || c.estado === 'en_revision'
            ).length;
        });
    }

    // 3. Préstamos
    let prestamos = [];
    try { prestamos = await obtenerSolicitudesPrestamosPorUID(uid); } catch (err) {}
    const pendientesPrestamos = (prestamos || []).filter(p =>
        p.estado === 'pendiente' || p.estado === 'en_revision'
    ).length;

    // Suma total
    const totalPendientes = pendientesBeneficio + pendientesCompras + pendientesPrestamos;

    // Mostrar en el resumen
    const solicitudesEl = document.getElementById('solicitudes-pendientes');
    if (solicitudesEl) solicitudesEl.textContent = totalPendientes;
}

// Cargar datos del usuario y estadísticas
async function cargarDatosUsuario(uid) {
    try {
        const funcionario = await obtenerFuncionario(uid);
        if (!funcionario) {
            alert('Error al cargar datos del usuario');
            return;
        }
        // Mostrar en cabecera
        const userNameEl = document.querySelector('.user-name');
        const userRutEl = document.querySelector('.user-rut');
        const bienvenidaEl = document.getElementById('bienvenida-usuario');
        if (userNameEl) userNameEl.textContent = `👤 ${funcionario.nombre}`;
        if (userRutEl) userRutEl.textContent = `RUT: ${funcionario.rut}`;
        if (bienvenidaEl) {
            const primerNombre = funcionario.nombre.split(" ")[0];
            bienvenidaEl.textContent = funcionario.genero === 'F' ? `¡Bienvenida, ${primerNombre}!` : `¡Bienvenido, ${primerNombre}!`;
        }
        await cargarPendientesResumen(uid, funcionario.rut);
        await cargarEstadisticas(uid, funcionario.fechaAfiliacion);
        await cargarSolicitudes(uid, funcionario.rut);
        await cargarPerfil(funcionario);
    } catch (error) {
        console.error('Error al cargar datos:', error);
    }
}

async function cargarEstadisticas(uid, fechaAfiliacion) {
    try {
        const solicitudes = await obtenerSolicitudesFuncionario(uid);
        const solicitudesPendientes = solicitudes.filter(s =>
            s.estado === 'pendiente' || s.estado === 'en_revision'
        ).length;
        const solicitudesEl = document.getElementById('solicitudes-pendientes');
        const tiempoEl = document.getElementById('tiempo-afiliacion');
        if (solicitudesEl) solicitudesEl.textContent = solicitudesPendientes;
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
        // Primer formulario: datos personales
        const formPerfil = document.querySelectorAll('.profile-card form.profile-form')[0];
        if (formPerfil) {
            const inputs = formPerfil.querySelectorAll('input');
            if (inputs[0]) inputs[0].value = funcionario.nombre || '';
            if (inputs[1]) inputs[1].value = funcionario.rut || '';
            if (inputs[2]) inputs[2].value = funcionario.email || '';
            if (inputs[3]) inputs[3].value = funcionario.telefono || '';
        }
        // Información de cuenta
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
    // Datos personales
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
            const rut = this.querySelectorAll('input')[1].value.trim();
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
                // Actualizar Firestore
                await updateDoc(doc(db, 'funcionarios', user.uid), {
                    nombre,
                    email,
                    telefono,
                    updatedAt: new Date()
                });
                // Cambiar email en Auth si cambió
                if (email !== user.email) {
                    await updateEmail(user, email);
                }
                userData.nombre = nombre;
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

    // Cambio de contraseña
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

