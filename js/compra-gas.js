document.addEventListener('DOMContentLoaded', function() {
    // Obtener referencias a los elementos
    const compraLipigas = document.getElementById('compraLipigas');
    const compraAbastible = document.getElementById('compraAbastible');
    const lipigasOpciones = document.getElementById('lipigasOpciones');
    const abastibleOpciones = document.getElementById('abastibleOpciones');

    // Función para generar opciones según el mes
    function generarOpciones(select) {
        const fecha = new Date();
        const mes = fecha.getMonth() + 1;
        const maxOpciones = (mes >= 6 && mes <= 9) ? 3 : 2;
        
        select.innerHTML = '<option value="0">0</option>';
        for (let i = 1; i <= maxOpciones; i++) {
            select.innerHTML += `<option value="${i}">${i}</option>`;
        }
    }

    // Función para actualizar los límites y mostrar las opciones
    function actualizarOpcionesGas(contenedor) {
        const fecha = new Date();
        const mes = fecha.getMonth() + 1;
        const esTemporadaAlta = mes >= 6 && mes <= 9;
        const maxOpciones = esTemporadaAlta ? 3 : 2;
        const limiteTotal = esTemporadaAlta ? 6 : 4;

        const temporadaMsg = esTemporadaAlta ? 
            'Temporada Alta (Junio-Septiembre): Máximo 3 por carga, total 6 mensuales' :
            'Temporada Normal (Octubre-Mayo): Máximo 2 por carga, total 4 mensuales';

        // Agregar mensaje de límites
        const limiteInfo = contenedor.querySelector('.limites-info') || document.createElement('div');
        limiteInfo.className = 'limites-info';
        limiteInfo.textContent = temporadaMsg;
        if (!contenedor.querySelector('.limites-info')) {
            contenedor.insertBefore(limiteInfo, contenedor.firstChild);
        }

        // Actualizar selects
        const selects = contenedor.querySelectorAll('select');
        selects.forEach(select => {
            generarOpciones(select);
        });

        contenedor.style.display = 'block';
    }

    // Event listeners para los selectores
    compraLipigas.addEventListener('change', function() {
        if (this.value === 'si') {
            actualizarOpcionesGas(lipigasOpciones);
        } else {
            lipigasOpciones.style.display = 'none';
        }
    });

    compraAbastible.addEventListener('change', function() {
        if (this.value === 'si') {
            actualizarOpcionesGas(abastibleOpciones);
        } else {
            abastibleOpciones.style.display = 'none';
        }
    });

    // Función para actualizar totales
    function actualizarTotal(contenedor) {
        const selects = contenedor.querySelectorAll('select');
        let total = 0;
        
        selects.forEach(select => {
            total += parseInt(select.value) || 0;
        });
        
        const totalElement = contenedor.querySelector('.total-count');
        if (totalElement) {
            totalElement.textContent = total;
        }
        
        const mes = new Date().getMonth() + 1;
        const limiteTotal = mes >= 6 && mes <= 9 ? 6 : 4;
        
        if (total > limiteTotal) {
            alert(`El total de cargas no puede superar ${limiteTotal} en este período`);
            selects[selects.length - 1].value = "0";
            actualizarTotal(contenedor);
        }
    }

    // Agregar listeners para actualizar totales
    [lipigasOpciones, abastibleOpciones].forEach(contenedor => {
        const selects = contenedor.querySelectorAll('select');
        selects.forEach(select => {
            select.addEventListener('change', () => actualizarTotal(contenedor));
        });
    });

    // Inicializar fecha con la actual
    const fechaInput = document.getElementById('fechaCompraGas');
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.value = today;
        fechaInput.max = today;
    }
});
    });
});
