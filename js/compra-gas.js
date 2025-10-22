document.addEventListener('DOMContentLoaded', function() {
    const compraLipigas = document.getElementById('compraLipigas');
    const compraAbastible = document.getElementById('compraAbastible');
    const lipigasOpciones = document.getElementById('lipigasOpciones');
    const abastibleOpciones = document.getElementById('abastibleOpciones');
    
    // Función para generar opciones según el mes
    function generarOpciones(select) {
        const fecha = new Date();
        const mes = fecha.getMonth() + 1;
        const maxOpciones = (mes >= 6 && mes <= 9) ? 3 : 2;
        
        select.innerHTML = '<option value="0">Seleccionar cantidad</option>';
        for (let i = 1; i <= maxOpciones; i++) {
            select.innerHTML += `<option value="${i}">${i}</option>`;
        }
    }
    
    // Función para mostrar opciones de gas
    function mostrarOpcionesGas(contenedor, empresa) {
        const fecha = new Date();
        const mes = fecha.getMonth() + 1;
        const esTemporadaAlta = mes >= 6 && mes <= 9;
        
        const selects = contenedor.querySelectorAll('select');
        selects.forEach(select => {
            generarOpciones(select);
        });
        
        contenedor.style.display = 'block';
    }
    
    // Event listeners para los selectores
    compraLipigas.addEventListener('change', function() {
        if (this.value === 'si') {
            mostrarOpcionesGas(lipigasOpciones, 'Lipigas');
        } else {
            lipigasOpciones.style.display = 'none';
        }
    });
    
    compraAbastible.addEventListener('change', function() {
        if (this.value === 'si') {
            mostrarOpcionesGas(abastibleOpciones, 'Abastible');
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
        
        // Validar límite total
        const fecha = new Date();
        const mes = fecha.getMonth() + 1;
        const limiteTotal = mes >= 6 && mes <= 9 ? 6 : 4;
        
        if (total > limiteTotal) {
            alert(`El total de cargas no puede superar ${limiteTotal} en este período`);
            selects[selects.length - 1].value = "0";
            actualizarTotal(contenedor);
        }
    }
    
    // Agregar event listeners para actualizar totales
    [lipigasOpciones, abastibleOpciones].forEach(contenedor => {
        const selects = contenedor.querySelectorAll('select');
        selects.forEach(select => {
            select.addEventListener('change', () => actualizarTotal(contenedor));
        });
    });
});
