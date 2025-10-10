import { db } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Guardar compra de gas en Firestore y comprobante en Storage
async function guardarCompraGasFirebase(compra, comprobanteFile) {
    const storage = getStorage();

    let comprobanteUrl = "";

    // Subir comprobante a Firebase Storage
    if (comprobanteFile) {
        const storageRef = ref(storage, `comprobantesGas/${Date.now()}_${comprobanteFile.name}`);
        await uploadBytes(storageRef, comprobanteFile);
        comprobanteUrl = await getDownloadURL(storageRef);
    }

    // Agregar la compra a Firestore
    const compraData = {
        ...compra,
        comprobanteUrl,
        fechaCompra: new Date().toISOString(),
    };

    await addDoc(collection(db, "comprasGas"), compraData);
}

// Manejo del formulario
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('formCompraGas');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Extrae los datos del formulario aquí
        const compra = {
            rut: document.getElementById('rutGas').value,
            nombre: document.getElementById('nombreGas').value.split(' ')[0],
            apellido: document.getElementById('nombreGas').value.split(' ').slice(1).join(' '),
            email: document.getElementById('emailGas').value,
            telefono: document.getElementById('telefonoGas').value,
            empresa: document.getElementById('compraLipigas').value === 'si' ? 'Lipigas' : (document.getElementById('compraAbastible').value === 'si' ? 'Abastible' : ''),
            tipoCarga: document.getElementById('compraLipigas').value === 'si' ? document.getElementById('tipoLipigas').value : document.getElementById('tipoAbastible').value,
            cantidad: document.getElementById('compraLipigas').value === 'si' ? Number(document.getElementById('cantidadLipigas').value) : Number(document.getElementById('cantidadAbastible').value),
            saldoFavor: document.getElementById('compraAbastible').value === 'si' ? document.getElementById('saldoFavor').value : "",
        };

        const comprobanteFile = document.getElementById('comprobanteGas').files[0];

        try {
            await guardarCompraGasFirebase(compra, comprobanteFile);
            alert('Compra registrada correctamente');
            form.reset();
        } catch (err) {
            alert('Error al registrar la compra: ' + err.message);
        }
    });
});
