// ========================================
// COMPRAS GAS - VERSIÓN COMPLETA CON GUARDADO EN FIREBASE
// ========================================

import { db, auth } from './firebase-config.js';
import { collection, addDoc, Timestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Importar validaciones de cupo (si existen)
let validarCupoDisponible, validarCargasSolicitadas;
try {
    const validacionModule = await import('./validacion-cupo-mensual.js');
    validarCupoDisponible = validacionModule.validarCupoDisponible;
    validarCargasSolicitadas = validacionModule.validarCargasSolicitadas;
    console.log('✅ Módulo de validación de cupo cargado');
} catch (error) {
    console.warn('⚠️ Módulo de validación de cupo no encontrado, continuando sin validación de cupo mensual');
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Inicializando sistema de compras de gas...');
    
    // Obtener referencias a los elementos
    const compraLipigas = document.getElementById('compraLipigas');
    const compraAbastible = document.getElementById('compraAbastible');
    const lipigasOpciones = document.getElementById('lipigasOpciones');
    const abastibleOpciones = document.getElementById('abastibleOpciones');
    const rutInput = document.getElementById('rutGas');
    const formCompraGas = document.getElementById('formCompraGas');

    if (!formCompraGas) {
        console.error('❌ No se encontró el formulario #formCompraGas');
        return;
    }

    // Función para determinar si estamos en temporada alta
    function esTemporadaAlta() {
        const fecha = new Date();
        const mes = fecha.getMonth() + 1;
        return mes >= 6 && mes <= 9;
    }

    // Función para generar opciones según el mes
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

    // Función para calcular el total GLOBAL
    function calcularTotalGlobal() {
        let totalGlobal = 0;
        
        if (lipigasOpciones && lipigasOpciones.style.display !== 'none') {
            const selectsLipigas = lipigasOpciones.querySelectorAll('.gas-select');
            selectsLipigas.forEach(select => {
                totalGlobal += parseInt(select.value) || 0;
            });
        }
        
        if (abastibleOpciones && abastibleOpciones.style.display !== 'none') {
            const selectsAbastible = abastibleOpciones.querySelectorAll('.gas-select');
            selectsAbastible.forEach(select => {
                totalGlobal += parseInt(select.value) || 0;
            });
        }
        
        return totalGlobal;
    }

    // Función para actualizar opciones de gas
    function actualizarOpcionesGas(contenedor, empresa) {
        const temporadaAlta = esTemporadaAlta();
        const limiteTotal = temporadaAlta ? 6 : 4;
        
        const temporadaMsg = temporadaAlta ? 
            '🔥 Temporada Alta (Junio-Septiembre): Máximo 3 por carga (2 para 45kg). TOTAL MENSUAL ENTRE AMBAS MARCAS: 6 cargas' :
            '❄️ Temporada Normal (Octubre-Mayo): Máximo 2 por carga. TOTAL MENSUAL ENTRE AMBAS MARCAS: 4 cargas';

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

    // Event listeners
    if (compraLipigas) {
        compraLipigas.addEventListener('change', function() {
            if (this.value === 'si') {
                actualizarOpcionesGas(lipigasOpciones, 'lipigas');
            } else {
                lipigasOpciones.style.display = 'none';
                lipigasOpciones.querySelectorAll('select').forEach(select => select.value = '0');
                actualizarTotal(lipigasOpciones);
            }
        });
    }

    if (compraAbastible) {
        compraAbastible.addEventListener('change', function() {
            if (this.value === 'si') {
                actualizarOpcionesGas(abastibleOpciones, 'abastible');
            } else {
                abastibleOpciones.style.display = 'none';
                abastibleOpciones.querySelectorAll('select').forEach(select => select.value = '0');
                actualizarTotal(abastibleOpciones);
            }
        });
    }

    // Función para actualizar totales
    function actualizarTotal(contenedor) {
        const selects = contenedor.querySelectorAll('.gas-select');
        let totalLocal = 0;
        
        selects.forEach(select => {
            totalLocal += parseInt(select.value) || 0;
        });
        
        const totalElement = contenedor.querySelector('.total-count');
        if (totalElement) {
            totalElement.textContent = totalLocal;
        }
        
        const totalGlobal = calcularTotalGlobal();
        const temporadaAlta = esTemporadaAlta();
        const limiteTotal = temporadaAlta ? 6 : 4;
        
        if (totalGlobal > limiteTotal) {
            alert(`⚠️ El total de cargas entre LIPIGAS y ABASTIBLE no puede superar ${limiteTotal} en este período.\n\nTotal actual: ${totalGlobal} cargas`);
            const lastChanged = Array.from(selects).reverse().find(s => parseInt(s.value) > 0);
            if (lastChanged) {
                lastChanged.value = '0';
                actualizarTotal(contenedor);
            }
        }
    }

    // Agregar listeners
    if (lipigasOpciones) {
        lipigasOpciones.querySelectorAll('.gas-select').forEach(select => {
            select.addEventListener('change', () => actualizarTotal(lipigasOpciones));
        });
    }

    if (abastibleOpciones) {
        abastibleOpciones.querySelectorAll('.gas-select').forEach(select => {
            select.addEventListener('change', () => actualizarTotal(abastibleOpciones));
        });
    }

    // Inicializar fecha
    const fechaInput = document.getElementById('fechaCompraGas');
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.value = today;
        fechaInput.max = today;
    }

    // ========================================
    // FUNCIÓN PRINCIPAL: GUARDAR EN FIREBASE
    // ========================================
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
    // SUBMIT DEL FORMULARIO
    // ========================================
    formCompraGas.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('🔍 Formulario enviado');

        try {
            // Validaciones básicas
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
            const temporadaAlta = esTemporadaAlta();
            const limiteTotal = temporadaAlta ? 6 : 4;

            if (totalCargas > limiteTotal) {
                alert(`⚠️ El total de cargas no puede superar ${limiteTotal}`);
                return false;
            }

            // Validación de cupo mensual (si está disponible)
            if (validarCargasSolicitadas) {
                console.log('🔍 Validando cupo mensual...');
                const rut = rutInput.value.trim();
                
                const cargasSolicitadas = {};
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

                const validacion = await validarCargasSolicitadas(rut, cargasSolicitadas);
                
                if (!validacion.success || !validacion.puedeComprar) {
                    alert(`❌ ${validacion.mensaje}`);
                    return false;
                }
            }

            // Obtener datos del formulario
            const formData = new FormData(this);
            const comprobanteFile = document.getElementById('comprobanteGas').files[0];

            if (!comprobanteFile) {
                alert('⚠️ Debe adjuntar el comprobante de transferencia');
                return false;
            }

            // Deshabilitar botón
            const btnSubmit = this.querySelector('button[type="submit"]');
            const textoOriginal = btnSubmit.textContent;
            btnSubmit.disabled = true;
            btnSubmit.textContent = '⏳ Guardando...';

            // Guardar en Firebase
            const resultado = await guardarCompraEnFirebase(formData, comprobanteFile);

            if (resultado.success) {
                alert(`✅ ${resultado.message}\n\nID de compra: ${resultado.id}\n\nSu compra ha sido registrada y será procesada a la brevedad.`);
                
                // Limpiar formulario
                this.reset();
                lipigasOpciones.style.display = 'none';
                abastibleOpciones.style.display = 'none';
                
                // Recargar página o redirigir
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }

        } catch (error) {
            console.error('❌ Error al procesar:', error);
            alert(`❌ Error al guardar la compra: ${error.message}\n\nPor favor, intente nuevamente.`);
        } finally {
            // Rehabilitar botón
            const btnSubmit = this.querySelector('button[type="submit"]');
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Enviar Compra';
            }
        }
    });

    console.log('✅ Sistema de compras de gas inicializado correctamente');
});
