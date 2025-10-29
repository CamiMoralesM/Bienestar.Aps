// =====================
// DASHBOARD SUPERADMIN
// =====================

// IMPORTS
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection, getDocs, query, where, updateDoc, doc, setDoc, addDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ========== AUTENTICACIÓN Y CONTROL DE ACCESO ==========
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    // Solo permitir acceso a superadmins
    const userType = sessionStorage.getItem('userType');
    if (userType !== 'administrador') {
        window.location.href = 'login.html';
        return;
    }
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
            const targetContent = document.getElementById(`tab-${tabId}`);
            if (targetContent) targetContent.classList.add('active');
        });
    });

    // Inicial
    cargarAdministrativos();
    cargarGraficos();
    cargarPrecios();
    cargarBeneficios();
    cargarConvenios();
});

// ========== GESTIÓN DE ADMINISTRATIVOS ==========
async function cargarAdministrativos() {
    const cont = document.getElementById('administativos-list');
    if (!cont) return;
    cont.innerHTML = '<p>Cargando...</p>';
    // Traer todos los documentos de la colección "administrativos" y los pendientes de la colección "pendientesAdministrativos" (ejemplo)
    const administrativosRef = collection(db, 'administrativos');
    const pendientesRef = collection(db, 'pendientesAdministrativos');
    const administrativosSnap = await getDocs(administrativosRef);
    const pendientesSnap = await getDocs(pendientesRef);

    let html = '<h3>Administrativos Aprobados</h3><table><tr><th>Nombre</th><th>Email</th><th>Estado</th><th>Acción</th></tr>';
    administrativosSnap.forEach(docu => {
        const d = docu.data();
        html += `<tr>
            <td>${d.nombre || ''}</td>
            <td>${d.email || ''}</td>
            <td><span class="badge success">Activo</span></td>
            <td>
                <button onclick="eliminarAdministrativo('${docu.id}')">Eliminar</button>
            </td>
        </tr>`;
    });
    html += '</table>';

    html += '<h3>Pendientes de aprobación</h3><table><tr><th>Nombre</th><th>Email</th><th>Acción</th></tr>';
    pendientesSnap.forEach(docu => {
        const d = docu.data();
        html += `<tr>
            <td>${d.nombre || ''}</td>
            <td>${d.email || ''}</td>
            <td>
                <button onclick="aprobarAdministrativo('${docu.id}')">Aprobar</button>
                <button onclick="rechazarAdministrativo('${docu.id}')">Rechazar</button>
            </td>
        </tr>`;
    });
    html += '</table>';
    cont.innerHTML = html;
}

// Aprobar/rechazar administrativo (asume una colección "pendientesAdministrativos" y otra "administrativos")
window.aprobarAdministrativo = async function(id) {
    const docPendiente = doc(db, "pendientesAdministrativos", id);
    const snap = await getDocs(query(collection(db, "pendientesAdministrativos"), where('__name__', '==', id)));
    if (!snap.empty) {
        const datos = snap.docs[0].data();
        // Mover a administrativos
        await setDoc(doc(db, "administrativos", id), { ...datos, estado: "activo" });
        await deleteDoc(docPendiente);
        alert('Administrativo aprobado');
        cargarAdministrativos();
    }
};
window.rechazarAdministrativo = async function(id) {
    await deleteDoc(doc(db, "pendientesAdministrativos", id));
    alert('Solicitud rechazada');
    cargarAdministrativos();
};
window.eliminarAdministrativo = async function(id) {
    if (!confirm('¿Eliminar este administrativo?')) return;
    await deleteDoc(doc(db, "administrativos", id));
    alert('Eliminado');
    cargarAdministrativos();
};

// ========== GRÁFICOS (CHART JS) ==========
async function cargarGraficos() {
    // Trae datos de compras de gas, cine, jumper, gimnasio agrupados por mes
    const tipos = [
        { key: "comprasGas", label: "Gas" },
        { key: "comprasCine", label: "Cine" },
        { key: "comprasJumper", label: "Jumper Park" },
        { key: "comprasGimnasio", label: "Gimnasio" }
    ];
    const labels = [];
    const dataPorTipo = { "Gas": [], "Cine": [], "Jumper Park": [], "Gimnasio": [] };
    // Supón que solo quieres los últimos 12 meses
    const hoy = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const label = d.toLocaleString('es-CL', { month: 'short', year: '2-digit' });
        labels.push(label);
    }
    // Por cada tipo, consulta los docs y agrupa por mes
    for (const tipo of tipos) {
        const snap = await getDocs(collection(db, tipo.key));
        const conteoPorMes = Array(12).fill(0);
        snap.forEach(docu => {
            const d = docu.data();
            const fecha = d.createdAt?.toDate ? d.createdAt.toDate() : (d.fechaCompra ? new Date(d.fechaCompra) : null);
            if (!fecha) return;
            const mesesAtras = (hoy.getFullYear() - fecha.getFullYear()) * 12 + (hoy.getMonth() - fecha.getMonth());
            if (mesesAtras >= 0 && mesesAtras < 12) {
                conteoPorMes[11 - mesesAtras]++;
            }
        });
        dataPorTipo[tipo.label] = conteoPorMes;
    }
    // Render gráfico
    const ctx = document.getElementById('chart-compras').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Gas', data: dataPorTipo['Gas'], backgroundColor: '#ff6b6b' },
                { label: 'Cine', data: dataPorTipo['Cine'], backgroundColor: '#87ceed' },
                { label: 'Jumper Park', data: dataPorTipo['Jumper Park'], backgroundColor: '#f0d481' },
                { label: 'Gimnasio', data: dataPorTipo['Gimnasio'], backgroundColor: '#a4eb8a' }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Compras por mes y tipo (últimos 12 meses)' }
            }
        }
    });
}

// ========== PRECIOS (CONFIGURACIÓN DINÁMICA) ==========
async function cargarPrecios() {
    // Supón que tienes una colección "configuracion_precios" con un doc "actual"
    const docRef = doc(db, "configuracion_precios", "actual");
    const docSnap = await getDocs(query(collection(db, "configuracion_precios"), where('__name__', '==', 'actual')));
    let precios = {};
    if (!docSnap.empty) {
        precios = docSnap.docs[0].data();
    }
    const form = document.getElementById('form-precios');
    if (!form) return;
    // Prellenar
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

// ========== BENEFICIOS Y CONVENIOS (CRUD BÁSICO) ==========
async function cargarBeneficios() {
    // Ejemplo para mostrar un listado básico de beneficios
    const cont = document.getElementById('beneficios-list');
    if (!cont) return;
    cont.innerHTML = '<p>Cargando...</p>';
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
window.abrirModalBeneficio = function() {
    // Mostrar modal para agregar beneficio
    alert('Funcionalidad de agregar beneficio en desarrollo');
};
window.editarBeneficio = function(id) {
    alert('Editar beneficio ' + id);
};
window.eliminarBeneficio = async function(id) {
    await deleteDoc(doc(db, "beneficios_config", id));
    alert('Beneficio eliminado');
    cargarBeneficios();
};

async function cargarConvenios() {
    const cont = document.getElementById('convenios-list');
    if (!cont) return;
    cont.innerHTML = '<p>Cargando...</p>';
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
window.abrirModalConvenio = function() {
    alert('Funcionalidad de agregar convenio en desarrollo');
};
window.editarConvenio = function(id) {
    alert('Editar convenio ' + id);
};
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
