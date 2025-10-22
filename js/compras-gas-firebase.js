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

    // Construir objeto de compra
    const compraData = {
        fechaCompra: compra.fechaCompraGas,
        rut: compra.rutGas,
        nombre: compra.nombreGas,
        email: compra.emailGas,
        telefono: compra.telefonoGas,
        comprobanteUrl,
        
        // Datos Lipigas
        compraLipigas: compra.compraLipigas === 'si',
        cargas_lipigas: compra.compraLipigas === 'si' ? {
            kg5: parseInt(compra.lipigas5) || 0,
            kg11: parseInt(compra.lipigas11) || 0,
            kg15: parseInt(compra.lipigas15) || 0,
            kg45: parseInt(compra.lipigas45) || 0
        } : null,
        
        // Datos Abastible
        compraAbastible: compra.compraAbastible === 'si',
        cargas_abastible: compra.compraAbastible === 'si' ? {
            kg5: parseInt(compra.abastible5) || 0,
            kg11: parseInt(compra.abastible11) || 0,
            kg15: parseInt(compra.abastible15) || 0,
            kg45: parseInt(compra.abastible45) || 0
        } : null,
        saldoFavor: compra.saldoFavor || null,
        
        // Metadatos
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Guardar en Firestore
    await addDoc(collection(db, "comprasGas"), compraData);
}

// Inicializar la gestión de compras de gas
document.addEventListener('DOMContentLoaded', function() {
    const comprasGasManager = new ComprasGasManager();
});

export { guardarCompraGasFirebase };
