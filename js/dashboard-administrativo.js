// DASHBOARD ADMINISTRATIVO JS

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection, getDocs, setDoc, doc, deleteDoc, updateDoc, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ========== CONTROL DE ACCESO ==========
onAuthStateChanged(auth, user => {
    if (!user) window.location.href = "login.html";
    const userType = sessionStorage.getItem('userType');
    if (userType !== "administrativo") window.location.href = "login.html";
});

// ========== TABS ==========
document.addEventListener('DOMContentLoaded', () => {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    navTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            navTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            const target = document.getElementById(`tab-${tabId}`);
            if (target) target.classList.add('active');
            // Recarga datos si corresponde
            switch (tabId) {
                case 'afiliados': cargarAfiliados(); break;
                case 'solicitudes': cargarSolicitudes(); break;
                case 'compras-gas': cargarComprasGas(); break;
            }
        });
    });
    cargarAfiliados();
    cargarSolicitudes();
    cargarComprasGas();
});

// ========== AFILIADOS ==========
let funcionariosData = [];
let filtroEstadoActual = '';
let filtroCentroActual = '';

async function cargarAfiliados(filtroEstado = '', filtroCentro = '') {
    const tbody = document.querySelector('#tab-afiliados tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
    // Traer funcionarios
    let q = collection(db, 'funcionarios');
    const snap = await getDocs(q);
    let funcionarios = [];
    snap.forEach(docu => {
        funcionarios.push({ id: docu.id, ...docu.data() });
    });
    funcionariosData = funcionarios;
    // Filtros
    let fil = funcionarios;
    if (filtroEstado && filtroEstado !== 'todos') fil = fil.filter(f => f.estado === filtroEstado);
    if (filtroCentro && filtroCentro !== 'todos') fil = fil.filter(f => f.centroSalud === filtroCentro);
    tbody.innerHTML = '';
    fil.forEach(func => {
        const fecha = func.fechaAfiliacion?.toDate?.().toLocaleDateString('es-CL') || 'N/A';
        let estadoBadge = '';
        let accionesEspeciales = '';
        if (func.estado === 'activo') {
            estadoBadge = '<span class="badge success">Activo</span>';
            accionesEspeciales = `<button class="btn-icon danger" title="Desactivar" onclick="desactivarFuncionario('${func.id}')">🚫</button>`;
        } else if (func.estado === 'pendiente') {
            estadoBadge = '<span class="badge warning">Pendiente</span>';
            accionesEspeciales = `<button class="btn-icon success" title="Aprobar" onclick="aprobarFuncionario('${func.id}')">✓</button>`;
        } else {
            estadoBadge = '<span class="badge">Inactivo</span>';
            accionesEspeciales = `<button class="btn-icon success" title="Activar" onclick="activarFuncionario('${func.id}')">✔️</button>`;
        }
        tbody.innerHTML += `
            <tr>
                <td>${func.rut}</td>
                <td>${func.nombre}</td>
                <td>${func.centroSalud}</td>
                <td>${fecha}</td>
                <td>${estadoBadge}</td>
                <td>
                    ${accionesEspeciales}
                    <button class="btn-icon" title="Ver perfil" onclick="verPerfilFuncionario('${func.id}')">👁️</button>
                    <button class="btn-icon" title="Editar" onclick="editarFuncionario('${func.id}')">✏️</button>
                    <button class="btn-icon danger" title="Eliminar" onclick="eliminarFuncionario('${func.id}')">🗑️</button>
                </td>
            </tr>
        `;
    });
    actualizarContadorAfiliados(fil.length, funcionarios.length);
}
function actualizarContadorAfiliados(mostrados, total) {
    const contador = document.querySelector('.afiliados-counter');
    if (contador) contador.textContent = `Mostrando ${mostrados} de ${total} afiliados`;
}
window.aprobarFuncionario = async function(funcionarioId) {
    await updateDoc(doc(db, "funcionarios", funcionarioId), { estado: "activo" });
    alert('Funcionario aprobado');
    cargarAfiliados(filtroEstadoActual, filtroCentroActual);
};
window.activarFuncionario = async function(funcionarioId) {
    await updateDoc(doc(db, "funcionarios", funcionarioId), { estado: "activo" });
    alert('Funcionario activado');
    cargarAfiliados(filtroEstadoActual, filtroCentroActual);
};
window.desactivarFuncionario = async function(funcionarioId) {
    await updateDoc(doc(db, "funcionarios", funcionarioId), { estado: "inactivo" });
    alert('Funcionario desactivado');
    cargarAfiliados(filtroEstadoActual, filtroCentroActual);
};
window.eliminarFuncionario = async function(funcionarioId) {
    if (!confirm('¿Eliminar este funcionario?')) return;
    await deleteDoc(doc(db, "funcionarios", funcionarioId));
    alert('Funcionario eliminado');
    cargarAfiliados(filtroEstadoActual, filtroCentroActual);
};
// Puedes reutilizar los modales de ver/editar perfil del dashboard actual...

// Filtros y búsqueda
document.addEventListener('DOMContentLoaded', function() {
    const estadoSelect = document.querySelector('#filtroEstado');
    if (estadoSelect) {
        estadoSelect.addEventListener('change', function() {
            filtroEstadoActual = this.value;
            cargarAfiliados(filtroEstadoActual, filtroCentroActual);
        });
    }
    const centroSelect = document.querySelector('#filtroCentro');
    if (centroSelect) {
        centroSelect.addEventListener('change', function() {
            filtroCentroActual = this.value;
            cargarAfiliados(filtroEstadoActual, filtroCentroActual);
        });
    }
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#tab-afiliados tbody tr').forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    }
});

// Exportar a Excel
window.exportarAfiliados = function() {
    let datosExportar = funcionariosData;
    if (filtroEstadoActual && filtroEstadoActual !== 'todos') datosExportar = datosExportar.filter(f => f.estado === filtroEstadoActual);
    if (filtroCentroActual && filtroCentroActual !== 'todos') datosExportar = datosExportar.filter(f => f.centroSalud === filtroCentroActual);
    const workbook = XLSX.utils.book_new();
    const excelData = datosExportar.map(func => {
        const fecha = func.fechaAfiliacion?.toDate?.().toLocaleDateString('es-CL') || 'N/A';
        return {
            'RUT': func.rut || 'N/A',
            'Nombre': func.nombre || 'N/A',
            'Fecha Afiliación': fecha,
            'Lugar de Trabajo': func.centroSalud || 'N/A',
            'Correo Electrónico': func.email || 'N/A',
            'Número de Teléfono': func.telefono || 'N/A',
            'Estado': func.estado || 'N/A',
            'Cargo': func.cargo || 'N/A'
        };
    });
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Afiliados');
    const fechaActual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `afiliados_${fechaActual}.xlsx`);
    alert('Excel exportado');
};

// ========== SOLICITUDES ==========
async function cargarSolicitudes() {
    const cont = document.querySelector('.admin-solicitudes');
    if (!cont) return;
    cont.innerHTML = 'Cargando...';
    // Traer solicitudes de préstamos
    const snap = await getDocs(query(collection(db, 'solicitudes'), orderBy('createdAt', 'desc')));
    let html = '';
    snap.forEach(docu => {
        const d = docu.data();
        const fecha = d.createdAt?.toDate?.().toLocaleDateString('es-CL') || 'N/A';
        let estadoBadge = '';
        if (d.estado === 'pendiente') estadoBadge = '<span class="badge warning">Pendiente</span>';
        else if (d.estado === 'aprobada') estadoBadge = '<span class="badge success">Aprobada</span>';
        else if (d.estado === 'rechazada') estadoBadge = '<span class="badge danger">Rechazada</span>';
        else estadoBadge = `<span class="badge">${d.estado || ''}</span>`;
        html += `<div class="solicitud-admin-card">
            <div class="solicitud-admin-header">
                <div class="solicitud-info">
                    <h3>${d.tipoBeneficio || '(Préstamo)'}</h3>
                    <p class="solicitud-afiliado">👤 ${d.funcionarioNombre || ''} (${d.funcionarioRut || ''})</p>
                </div>
                ${estadoBadge}
            </div>
            <div class="solicitud-admin-body">
                <p><strong>Monto:</strong> $${d.monto?.toLocaleString('es-CL') || ''}</p>
                <p><strong>Fecha:</strong> ${fecha}</p>
                <div class="solicitud-admin-actions">
                    ${d.estado === 'pendiente' ? `<button class="btn btn-success" onclick="aprobarSolicitud('${docu.id}')">Aprobar</button>
                    <button class="btn btn-danger" onclick="rechazarSolicitud('${docu.id}')">Rechazar</button>` : ''}
                </div>
            </div>
        </div>`;
    });
    cont.innerHTML = html || '<p>No hay solicitudes.</p>';
}
window.aprobarSolicitud = async function(id) {
    await updateDoc(doc(db, "solicitudes", id), { estado: "aprobada" });
    alert('Solicitud aprobada');
    cargarSolicitudes();
};
window.rechazarSolicitud = async function(id) {
    await updateDoc(doc(db, "solicitudes", id), { estado: "rechazada" });
    alert('Solicitud rechazada');
    cargarSolicitudes();
};

// ========== COMPRAS GAS ==========
async function cargarComprasGas() {
    const cont = document.getElementById('listadoComprasGas');
    if (!cont) return;
    cont.innerHTML = 'Cargando...';
    const snap = await getDocs(query(collection(db, 'comprasGas'), orderBy('createdAt', 'desc')));
    let html = '<table><tr><th>Fecha</th><th>Nombre</th><th>RUT</th><th>Email</th><th>Empresa</th><th>Cargas</th><th>Comprobante</th></tr>';
    snap.forEach(docu => {
        const d = docu.data();
        const fecha = d.fechaCompra?.slice?.(0,10) || d.createdAt?.toDate?.().toLocaleDateString('es-CL') || '';
        const cargas = [];
        if (d.cargas_lipigas) cargas.push(`L: ${Object.entries(d.cargas_lipigas).map(([k,v])=>`${k}:${v}`).join(', ')}`);
        if (d.cargas_abastible) cargas.push(`A: ${Object.entries(d.cargas_abastible).map(([k,v])=>`${k}:${v}`).join(', ')}`);
        html += `<tr>
            <td>${fecha}</td>
            <td>${d.nombre}</td>
            <td>${d.rut}</td>
            <td>${d.email}</td>
            <td>${d.compraLipigas?'Lipigas':''} ${d.compraAbastible?'Abastible':''}</td>
            <td>${cargas.join('<br>')}</td>
            <td>${d.comprobanteUrl ? `<a href="${d.comprobanteUrl}" target="_blank">Ver</a>` : ''}</td>
        </tr>`;
    });
    html += '</table>';
    cont.innerHTML = html;
}

// Exportar Excel: puedes usar tu lógica de exportarLipigasExcel, exportarAbastibleExcel, exportarGeneralExcel
window.exportarLipigasExcel = function() { alert('Funcionalidad de exportación Lipigas en desarrollo.'); }
window.exportarAbastibleExcel = function() { alert('Funcionalidad de exportación Abastible en desarrollo.'); }
window.exportarGeneralExcel = function() { alert('Funcionalidad de exportación General en desarrollo.'); }

// ========== LOGOUT ==========
window.logout = async function () {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        sessionStorage.clear();
        localStorage.clear();
        await auth.signOut();
        window.location.href = '../index.html';
    }
};
