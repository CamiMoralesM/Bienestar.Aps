// ========================================
// VALIDACIÓN MEJORADA - LÍMITE POR TIPO DE CARGA
// ========================================

/**
 * Actualiza el total y valida límites por tipo Y total global
 */
function actualizarTotal(contenedor) {
    if (!contenedor) return;

    const selects = contenedor.querySelectorAll('.gas-select');
    let totalLocal = 0;
    
    // Calcular total local del contenedor
    selects.forEach(select => {
        totalLocal += parseInt(select.value) || 0;
    });
    
    // Actualizar contador local del contenedor
    const totalElement = contenedor.querySelector('.total-count');
    if (totalElement) {
        totalElement.textContent = totalLocal;
    }
    
    // VALIDACIÓN 1: Límite por tipo de carga
    const temporadaAlta = esTemporadaAlta();
    selects.forEach(select => {
        const valor = parseInt(select.value) || 0;
        const tipoCarga = select.id.includes('45') ? '45' : 'normal';
        const maxPermitido = temporadaAlta ? (tipoCarga === '45' ? 2 : 3) : 2;
        
        if (valor > maxPermitido) {
            const nombreCarga = select.id.replace('lipigas', '').replace('abastible', '') + 'kg';
            alert(`⚠️ Límite por tipo de carga excedido\n\nMáximo permitido para ${nombreCarga}: ${maxPermitido} cargas\nIntentó seleccionar: ${valor} cargas`);
            select.value = maxPermitido.toString();
            actualizarTotal(contenedor);
            return;
        }
    });
    
    // VALIDACIÓN 2: Límite global (Lipigas + Abastible)
    const totalGlobal = calcularTotalGlobal();
    const limiteTotal = obtenerLimiteMaximo();
    
    if (totalGlobal > limiteTotal) {
        alert(`⚠️ El total de cargas entre LIPIGAS y ABASTIBLE no puede superar ${limiteTotal} en este período.\n\n${temporadaAlta ? 'Temporada Alta: Máximo 6 cargas mensuales (sumando ambas marcas)' : 'Temporada Normal: Máximo 4 cargas mensuales (sumando ambas marcas)'}\n\nTotal actual: ${totalGlobal} cargas`);
        
        // Resetear el último select que causó el exceso
        const lastChanged = Array.from(selects).reverse().find(s => parseInt(s.value) > 0);
        if (lastChanged) {
            lastChanged.value = '0';
            actualizarTotal(contenedor);
        }
    }
}

/**
 * Genera las opciones de cantidad según el tipo de carga y temporada
 * MEJORADO: Considera el límite real por tipo
 */
function generarOpcionesPorCarga(tipoCarga, selectElement) {
    const temporadaAlta = esTemporadaAlta();
    let maxOpciones;

    // Determinar máximo por tipo
    if (temporadaAlta) {
        maxOpciones = (tipoCarga === '45') ? 2 : 3;
    } else {
        maxOpciones = 2;
    }

    // Limpiar opciones existentes
    selectElement.innerHTML = '<option value="0">0</option>';
    
    // Generar opciones hasta el máximo permitido
    for (let i = 1; i <= maxOpciones; i++) {
        selectElement.innerHTML += `<option value="${i}">${i}</option>`;
    }
    
    // Asegurar que el valor actual no exceda el límite
    const valorActual = parseInt(selectElement.value) || 0;
    if (valorActual > maxOpciones) {
        selectElement.value = maxOpciones.toString();
    }
}

/**
 * Valida TODOS los límites antes de enviar el formulario
 */
function validarLimitesFormulario() {
    const temporadaAlta = esTemporadaAlta();
    const limiteTotal = obtenerLimiteMaximo();
    const maxPorCarga = temporadaAlta ? 3 : 2;
    const max45kg = 2;
    
    let errores = [];
    
    // Validar Lipigas
    if (lipigasOpciones && lipigasOpciones.style.display !== 'none') {
        const lipigas5 = parseInt(document.getElementById('lipigas5')?.value || 0);
        const lipigas11 = parseInt(document.getElementById('lipigas11')?.value || 0);
        const lipigas15 = parseInt(document.getElementById('lipigas15')?.value || 0);
        const lipigas45 = parseInt(document.getElementById('lipigas45')?.value || 0);
        
        if (lipigas5 > maxPorCarga) errores.push(`Lipigas 5kg: máximo ${maxPorCarga}`);
        if (lipigas11 > maxPorCarga) errores.push(`Lipigas 11kg: máximo ${maxPorCarga}`);
        if (lipigas15 > maxPorCarga) errores.push(`Lipigas 15kg: máximo ${maxPorCarga}`);
        if (lipigas45 > max45kg) errores.push(`Lipigas 45kg: máximo ${max45kg}`);
    }
    
    // Validar Abastible
    if (abastibleOpciones && abastibleOpciones.style.display !== 'none') {
        const abastible5 = parseInt(document.getElementById('abastible5')?.value || 0);
        const abastible11 = parseInt(document.getElementById('abastible11')?.value || 0);
        const abastible15 = parseInt(document.getElementById('abastible15')?.value || 0);
        const abastible45 = parseInt(document.getElementById('abastible45')?.value || 0);
        
        if (abastible5 > maxPorCarga) errores.push(`Abastible 5kg: máximo ${maxPorCarga}`);
        if (abastible11 > maxPorCarga) errores.push(`Abastible 11kg: máximo ${maxPorCarga}`);
        if (abastible15 > maxPorCarga) errores.push(`Abastible 15kg: máximo ${maxPorCarga}`);
        if (abastible45 > max45kg) errores.push(`Abastible 45kg: máximo ${max45kg}`);
    }
    
    // Validar total global
    const totalGlobal = calcularTotalGlobal();
    if (totalGlobal > limiteTotal) {
        errores.push(`Total global: máximo ${limiteTotal} cargas (tiene ${totalGlobal})`);
    }
    
    // Si hay errores, mostrar todos juntos
    if (errores.length > 0) {
        const mensajeError = `⚠️ LÍMITES EXCEDIDOS:\n\n${errores.join('\n')}\n\nTemporada ${temporadaAlta ? 'Alta' : 'Normal'}:\n- Por tipo: máximo ${maxPorCarga} cargas (45kg: máximo ${max45kg})\n- Total global: máximo ${limiteTotal} cargas`;
        alert(mensajeError);
        return false;
    }
    
    return true;
}
