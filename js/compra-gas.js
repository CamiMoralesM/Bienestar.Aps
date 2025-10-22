document.addEventListener('DOMContentLoaded', function() {
    // Obtener referencias a los elementos
    const compraLipigas = document.getElementById('compraLipigas');
    const compraAbastible = document.getElementById('compraAbastible');
    const lipigasOpciones = document.getElementById('lipigasOpciones');
    const abastibleOpciones = document.getElementById('abastibleOpciones');

    // Función para determinar si estamos en temporada alta
    function esTemporadaAlta() {
        const fecha = new Date();
        const mes = fecha.getMonth() + 1; // Enero = 1, Diciembre = 12
        return mes >= 6 && mes <= 9; // Junio a Septiembre
    }

    // Función para generar opciones según el tipo de carga y temporada
    function generarOpcionesPorCarga(tipoCarga, selectElement) {
        const temporadaAlta = esTemporadaAlta();
        let maxOpciones;

        if (temporadaAlta) {
            // Temporada Alta (Junio-Septiembre)
            if (tipoCarga === '45') {
                maxOpciones = 2; // Máximo 2 cargas de 45 kilos
            } else {
                maxOpciones = 3; // Máximo 3 cargas para 5, 11 y 15 kilos
            }
        } else {
            // Temporada Normal (Octubre-Mayo)
            maxOpciones = 2; // Máximo 2 cargas por cada tipo
        }

        // Limpiar select
        selectElement.innerHTML = '<option value="0">0</option>';
        
        // Agregar opciones
        for (let i = 1; i <= maxOpciones; i++) {
            selectElement.innerHTML += `<option value="${i}">${i}</option>`;
        }
    }

    // Función para actualizar los límites y mostrar las opciones
    function actualizarOpcionesGas(contenedor, empresa) {
        const temporadaAlta = esTemporadaAlta();
        const limiteTotal = temporadaAlta ? 6 : 4;
        
        const temporadaMsg = temporadaAlta ? 
            '🔥 Temporada Alta (Junio-Septiembre): Máximo 3 por carga (2 para 45kg). TOTAL MENSUAL ENTRE AMBAS MARCAS: 6 cargas' :
            '❄️ Temporada Normal (Octubre-Mayo): Máximo 2 por carga. TOTAL MENSUAL ENTRE AMBAS MARCAS: 4 cargas';

        // Crear o actualizar mensaje de límites
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

        // Actualizar selects con opciones correctas por tipo de carga
        const select5kg = contenedor.querySelector(`#${empresa}5`);
        const select11kg = contenedor.querySelector(`#${empresa}11`);
        const select15kg = contenedor.querySelector(`#${empresa}15`);
        const select45kg = contenedor.querySelector(`#${empresa}45`);

        if (select5kg) generarOpcionesPorCarga('5', select5kg);
        if (select11kg) generarOpcionesPorCarga('11', select11kg);
        if (select15kg) generarOpcionesPorCarga('15', select15kg);
        if (select45kg) generarOpcionesPorCarga('45', select45kg);

        // Mostrar el contenedor
        contenedor.style.display = 'block';
    }

    // Event listeners para los selectores principales
    if (compraLipigas) {
        compraLipigas.addEventListener('change', function() {
            if (this.value === 'si') {
                actualizarOpcionesGas(lipigasOpciones, 'lipigas');
            } else {
                lipigasOpciones.style.display = 'none';
                // Resetear valores
                lipigasOpciones.querySelectorAll('select').forEach(select => {
                    select.value = '0';
                });
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
                // Resetear valores
                abastibleOpciones.querySelectorAll('select').forEach(select => {
                    select.value = '0';
                });
                actualizarTotal(abastibleOpciones);
            }
        });
    }

    // Función para calcular el total GLOBAL (Lipigas + Abastible)
    function calcularTotalGlobal() {
        let totalGlobal = 0;
        
        // Sumar cargas de Lipigas
        if (lipigasOpciones && lipigasOpciones.style.display !== 'none') {
            const selectsLipigas = lipigasOpciones.querySelectorAll('.gas-select');
            selectsLipigas.forEach(select => {
                totalGlobal += parseInt(select.value) || 0;
            });
        }
        
        // Sumar cargas de Abastible
        if (abastibleOpciones && abastibleOpciones.style.display !== 'none') {
            const selectsAbastible = abastibleOpciones.querySelectorAll('.gas-select');
            selectsAbastible.forEach(select => {
                totalGlobal += parseInt(select.value) || 0;
            });
        }
        
        return totalGlobal;
    }

    // Función para actualizar el total de cargas seleccionadas
    function actualizarTotal(contenedor) {
        const selects = contenedor.querySelectorAll('.gas-select');
        let totalLocal = 0;
        
        selects.forEach(select => {
            totalLocal += parseInt(select.value) || 0;
        });
        
        // Actualizar contador local del contenedor
        const totalElement = contenedor.querySelector('.total-count');
        if (totalElement) {
            totalElement.textContent = totalLocal;
        }
        
        // Validar límite GLOBAL (Lipigas + Abastible juntas)
        const totalGlobal = calcularTotalGlobal();
        const temporadaAlta = esTemporadaAlta();
        const limiteTotal = temporadaAlta ? 6 : 4;
        
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

    // Agregar listeners para actualizar totales en Lipigas
    if (lipigasOpciones) {
        const selectsLipigas = lipigasOpciones.querySelectorAll('.gas-select');
        selectsLipigas.forEach(select => {
            select.addEventListener('change', () => actualizarTotal(lipigasOpciones));
        });
    }

    // Agregar listeners para actualizar totales en Abastible
    if (abastibleOpciones) {
        const selectsAbastible = abastibleOpciones.querySelectorAll('.gas-select');
        selectsAbastible.forEach(select => {
            select.addEventListener('change', () => actualizarTotal(abastibleOpciones));
        });
    }

    // Inicializar fecha con la actual y establecer límite máximo
    const fechaInput = document.getElementById('fechaCompraGas');
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.value = today;
        fechaInput.max = today;
    }

    // Validación adicional antes de enviar el formulario
    const formCompraGas = document.getElementById('formCompraGas');
    if (formCompraGas) {
        formCompraGas.addEventListener('submit', function(e) {
            // Validar que al menos una empresa esté seleccionada
            const comprandoLipigas = compraLipigas.value === 'si';
            const comprandoAbastible = compraAbastible.value === 'si';

            if (!comprandoLipigas && !comprandoAbastible) {
                e.preventDefault();
                alert('⚠️ Debe seleccionar al menos una empresa (Lipigas o Abastible)');
                return false;
            }

            // Calcular total de cargas global
            const totalCargas = calcularTotalGlobal();

            if (totalCargas === 0) {
                e.preventDefault();
                alert('⚠️ Debe seleccionar al menos una carga de gas');
                return false;
            }

            // Validar límite global
            const temporadaAlta = esTemporadaAlta();
            const limiteTotal = temporadaAlta ? 6 : 4;

            if (totalCargas > limiteTotal) {
                e.preventDefault();
                alert(`⚠️ El total de cargas (Lipigas + Abastible) no puede superar ${limiteTotal} en este período.\n\nTotal seleccionado: ${totalCargas} cargas\nLímite permitido: ${limiteTotal} cargas`);
                return false;
            }

            // Validación exitosa
            console.log('Formulario válido, enviando...');
            console.log(`Total de cargas: ${totalCargas} (Límite: ${limiteTotal})`);
        });
    }

    // Función auxiliar para mostrar información de temporada al cargar
    function mostrarInfoTemporada() {
        const temporadaAlta = esTemporadaAlta();
        console.log(temporadaAlta ? 
            '🔥 Temporada Alta Activa (Junio-Septiembre)' : 
            '❄️ Temporada Normal Activa (Octubre-Mayo)'
        );
    }

    mostrarInfoTemporada();
});
