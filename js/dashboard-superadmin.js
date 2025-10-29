// DASHBOARD SUPERADMIN JS

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection, getDocs, setDoc, doc, deleteDoc, addDoc, updateDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ========== CONTROL DE ACCESO ==========
onAuthStateChanged(auth, user => {
    if (!user) window.location.href = "login.html";
    const userType = sessionStorage.getItem('userType');
    if (userType !== "administrador") window.location.href = "login.html";
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
                case 'administrativos': cargarAdministrativos(); break;
                case 'graficos': cargarGraficos(); break;
                case 'precios': cargarPrecios(); break;
                case 'beneficios': cargarBeneficios(); break;
                case 'convenios': cargarConvenios(); break;
            }
        });
    });
    cargarAdministrativos();
    cargarGraficos();
    cargarPrecios();
    cargarBeneficios();
    cargarConvenios();
});

// ========== ADMINISTRATIVOS ==========
async function cargarAdministrativos() {
    const cont = document.getElementById('administativos-list');
    if (!cont) return;
    cont.innerHTML = 'Cargando...';
    const adminCol = collection(db, 'administrativos');
    const pendCol = collection(db, 'pendientesAdministrativos');
    const admins = await getDocs(adminCol);
    const pendientes = await getDocs(pendCol);

    let html = '<h3>Activos</h3><table><tr><th>Nombre</th><th>Email</th><th>Acción</th></tr>';
    admins.forEach(docu => {
        const d = docu.data();
        html += `<tr>
            <td>${d.nombre}</td>
            <td>${d.email}</td>
            <td><button onclick="eliminarAdministrativo('${docu.id}')">Eliminar</button></td>
        </tr>`;
    });
    html += '</table><h3>Pendientes</h3><table><tr><th>Nombre</th><th>Email</th><th>Acción</th></tr>';
    pendientes.forEach(docu => {
        const d = docu.data();
        html += `<tr>
            <td>${d.nombre}</td>
            <td>${d.email}</td>
            <td>
                <button onclick="aprobarAdministrativo('${docu.id}')">Aprobar</button>
                <button onclick="rechazarAdministrativo('${docu.id}')">Rechazar</button>
            </td>
        </tr>`;
    });
    html += '</table>';
    cont.innerHTML = html;
}

window.aprobarAdministrativo = async function(id) {
    const pendRef = doc(db, "pendientesAdministrativos", id);
    const snap = await getDocs(query(collection(db, "pendientesAdministrativos"), where('__name__', '==', id)));
    if (!snap.empty) {
        const datos = snap.docs[0].data();
        await setDoc(doc(db, "administrativos", id), { ...datos, estado: "activo" });
        await deleteDoc(pendRef);
        alert('Aprobado');
        cargarAdministrativos();
    }
};
window.rechazarAdministrativo = async function(id) {
    await deleteDoc(doc(db, "pendientesAdministrativos", id));
    alert('Rechazado');
    cargarAdministrativos();
};
window.eliminarAdministrativo = async function(id) {
    if (!confirm('¿Eliminar este administrativo?')) return;
    await deleteDoc(doc(db, "administrativos", id));
    alert('Eliminado');
    cargarAdministrativos();
};

// ========== GRÁFICOS (Chart.js) ==========
async function cargarGraficos() {
    const tipos = [
        { key: "comprasGas", label: "Gas" },
        { key: "comprasCine", label: "Cine" },
        { key: "comprasJumper", label: "Jumper" },
        { key: "comprasGimnasio", label: "Gimnasio" }
    ];
    const labels = [];
    const dataPorTipo = { "Gas": [], "Cine": [], "Jumper": [], "Gimnasio": [] };
    const hoy = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        labels.push(d.toLocaleString('es-CL', { month: 'short', year: '2-digit' }));
    }
    for (const tipo of tipos) {
        const snap = await getDocs(collection(db, tipo.key));
        const conteo = Array(12).fill(0);
        snap.forEach(docu => {
            const d = docu.data();
            const fecha = d.createdAt?.toDate ? d.createdAt.toDate() : (d.fechaCompra ? new Date(d.fechaCompra) : null);
            if (!fecha) return;
            const idx = 11 - ((hoy.getFullYear() - fecha.getFullYear()) * 12 + (hoy.getMonth() - fecha.getMonth()));
            if (idx >= 0 && idx < 12) conteo[idx]++;
        });
        dataPorTipo[tipo.label] = conteo;
    }
    const ctx = document.getElementById('chart-compras').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Gas', data: dataPorTipo.Gas, backgroundColor: '#ff6b6b' },
                { label: 'Cine', data: dataPorTipo.Cine, backgroundColor: '#87ceed' },
                { label: 'Jumper', data: dataPorTipo.Jumper, backgroundColor: '#f0d481' },
                { label: 'Gimnasio', data: dataPorTipo.Gimnasio, backgroundColor: '#a4eb8a' }
            ]
        },
        options: { responsive: true, plugins: { legend: { position: 'top' } } }
    });
}

// ========== PRECIOS ==========
async function cargarPrecios() {
    const docRef = doc(db, "configuracion_precios", "actual");
    const snap = await getDocs(query(collection(db, "configuracion_precios"), where('__name__', '==', 'actual')));
    let precios = {};
    if (!snap.empty) precios = snap.docs[0].data();
    const form = document.getElementById('form-precios');
    if (!form) return;
    ['lipigas5','lipigas11','lipigas15','lipigas45','abastible5','abastible11','abastible15','abastible45','cine','jumper','gimnasio'].forEach(k => {
        if (form[k]) form[k].value = precios[k] || "";
    });
    form.onsubmit = async function(ev) {
        ev.preventDefault();
        const datos = {};
        ['lipigas5','lipigas11','lipigas15','lipigas45','abastible5','abastible11','abastible15','abastible45','cine','jumper','gimnasio'].forEach(k => {
            datos[k] = parseInt(form[k].value) || 0;
        });
        await setDoc(doc(db, "configuracion_precios", "actual"), datos);
        alert('Precios actualizados');
    };
}

// ========== BENEFICIOS ==========
async function cargarBeneficios() {
    const cont = document.getElementById('beneficios-list');
    if (!cont) return;
    cont.innerHTML = 'Cargando...';
    const snap = await getDocs(collection(db, "beneficios_config"));
    let html = '<table><tr><th>Nombre</th><th>Monto</th><th>Acción</th></tr>';
    snap.forEach(docu => {
        const d = docu.data();
        html += `<tr>
            <td>${d.nombre || ''}</td>
            <td>${d.monto || ''}</td>
            <td>
                <button onclick="editarBeneficio('${docu.id}')">Editar</button>
                <button onclick="eliminarBeneficio('${docu.id}')">Eliminar</button>
            </td>
        </tr>`;
    });
    html += '</table>';
    cont.innerHTML = html;
}
window.abrirModalBeneficio = function() { alert('Funcionalidad de agregar beneficio en desarrollo'); };
window.editarBeneficio = function(id) { alert('Editar beneficio ' + id); };
window.eliminarBeneficio = async function(id) {
    await deleteDoc(doc(db, "beneficios_config", id));
    alert('Beneficio eliminado');
    cargarBeneficios();
};

// ========== CONVENIOS ==========
async function cargarConvenios() {
    const cont = document.getElementById('convenios-list');
    if (!cont) return;
    cont.innerHTML = 'Cargando...';
    const snap = await getDocs(collection(db, "convenios_config"));
    let html = '<table><tr><th>Nombre</th><th>Descuento</th><th>Acción</th></tr>';
    snap.forEach(docu => {
        const d = docu.data();
        html += `<tr>
            <td>${d.nombre || ''}</td>
            <td>${d.descuento || ''}</td>
            <td>
                <button onclick="editarConvenio('${docu.id}')">Editar</button>
                <button onclick="eliminarConvenio('${docu.id}')">Eliminar</button>
            </td>
        </tr>`;
    });
    html += '</table>';
    cont.innerHTML = html;
}
window.abrirModalConvenio = function() { alert('Funcionalidad de agregar convenio en desarrollo'); };
window.editarConvenio = function(id) { alert('Editar convenio ' + id); };
window.eliminarConvenio = async function(id) {
    await deleteDoc(doc(db, "convenios_config", id));
    alert('Convenio eliminado');
    cargarConvenios();
};

// ========== LOGOUT ==========
window.logout = async function () {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        sessionStorage.clear();
        localStorage.clear();
        await auth.signOut();
        window.location.href = '../index.html';
    }
};
