// compras-gas.js
export class ComprasGasManager {
    constructor() {
        this.form = document.getElementById('formCompraGas');
        this.fechaInput = document.getElementById('fechaCompraGas');
        this.setupEventListeners();
        this.initializeDateInput();
    }

    initializeDateInput() {
        // Establecer fecha actual como valor predeterminado
        const today = new Date().toISOString().split('T')[0];
        this.fechaInput.value = today;
        this.fechaInput.max = today; // No permitir fechas futuras
        this.actualizarLimitesEnFormulario();
    }

    obtenerLimitesEstacionales(fecha) {
        const mes = fecha.getMonth() + 1; // getMonth() retorna 0-11
        
        // Temporada alta: Junio (6) a Septiembre (9)
        if (mes >= 6 && mes <= 9) {
            return {
                limitePorCarga: 3,
                limiteTotal: 6,
                esTemporadaAlta: true
            };
        } else {
            // Temporada normal: Octubre (10) a Mayo (5)
            return {
                limitePorCarga: 2,
                limiteTotal: 4,
                esTemporadaAlta: false
            };
        }
    }

    actualizarLimitesEnFormulario() {
        const fecha = new Date(this.fechaInput.value);
        const limites = this.obtenerLimitesEstacionales(fecha);
        
        ['lipigasOpciones', 'abastibleOpciones'].forEach(contenedorId => {
            const contenedor = document.getElementById(contenedorId);
            if (!contenedor) return;

            // Actualizar mensaje de límites
            const infoDiv = contenedor.querySelector('.limites-info');
            if (infoDiv) {
                infoDiv.innerHTML = limites.esTemporadaAlta ? 
                    '<strong>Temporada Alta (Junio-Septiembre):</strong> Máximo 3 por carga, total 6 mensuales' :
                    '<strong>Temporada Normal (Octubre-Mayo):</strong> Máximo 2 por carga, total 4 mensuales';
            }

            // Actualizar límites en inputs
            const inputs = contenedor.querySelectorAll('input[type="number"]');
            inputs.forEach(input => {
                input.max = limites.limitePorCarga;
                input.setAttribute('data-limite-total', limites.limiteTotal);
            });
        });
    }

    validarCantidades(contenedor) {
        const inputs = contenedor.querySelectorAll('input[type="number"]');
        const limites = this.obtenerLimitesEstacionales(new Date(this.fechaInput.value));
        let total = 0;
        
        inputs.forEach(input => {
            const valor = parseInt(input.value) || 0;
            total += valor;
            
            // Validar límite por tipo
            if (valor > limites.limitePorCarga) {
                input.value = limites.limitePorCarga;
            }
        });
        
        // Actualizar contador
        const totalCount = contenedor.querySelector('.total-count');
        if (totalCount) {
            totalCount.textContent = total;
        }
        
        // Validar límite total
        if (total > limites.limiteTotal) {
            alert(`El total de cargas no puede superar ${limites.limiteTotal} en este período`);
            inputs[inputs.length - 1].value = Math.max(0, limites.limiteTotal - (total - parseInt(inputs[inputs.length - 1].value)));
            this.validarCantidades(contenedor); // Recalcular
        }
    }

    setupEventListeners() {
        // Manejar cambios en fecha
        this.fechaInput.addEventListener('change', () => {
            this.actualizarLimitesEnFormulario();
        });

        // Manejar visibilidad de opciones
        const compraLipigas = document.getElementById('compraLipigas');
        const compraAbastible = document.getElementById('compraAbastible');
        const lipigasOpciones = document.getElementById('lipigasOpciones');
        const abastibleOpciones = document.getElementById('abastibleOpciones');

        compraLipigas.addEventListener('change', function() {
            lipigasOpciones.style.display = this.value === 'si' ? 'block' : 'none';
        });

        compraAbastible.addEventListener('change', function() {
            abastibleOpciones.style.display = this.value === 'si' ? 'block' : 'none';
        });

        // Validar cantidades en tiempo real
        ['lipigasOpciones', 'abastibleOpciones'].forEach(id => {
            const contenedor = document.getElementById(id);
            if (contenedor) {
                contenedor.addEventListener('input', (e) => {
                    if (e.target.type === 'number') {
                        this.validarCantidades(contenedor);
                    }
                });
            }
        });

        // Validar formulario antes de enviar
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    handleSubmit(e) {
        e.preventDefault();
        const fecha = new Date(this.fechaInput.value);
        const limites = this.obtenerLimitesEstacionales(fecha);
        
        let totalLipigas = 0;
        let totalAbastible = 0;
        
        ['5', '11', '15', '45'].forEach(kg => {
            totalLipigas += parseInt(document.getElementById(`lipigas${kg}`)?.value || 0);
            totalAbastible += parseInt(document.getElementById(`abastible${kg}`)?.value || 0);
        });
        
        if (totalLipigas + totalAbastible === 0) {
            alert('Debe seleccionar al menos una carga');
            return;
        }
        
        if (totalLipigas > limites.limiteTotal || totalAbastible > limites.limiteTotal) {
            alert(`El total de cargas por empresa no puede superar ${limites.limiteTotal} en este período`);
            return;
        }
        
        // Proceder con el envío
        this.guardarCompra();
    }

    async guardarCompra() {
        try {
            // Recopilar datos del formulario
            const formData = new FormData(this.form);
            
            // Procesamiento adicional si es necesario
            
            // Llamar a la función de guardado
            await guardarCompraGasFirebase(Object.fromEntries(formData));
            
            alert('Compra registrada exitosamente');
            this.form.reset();
            this.initializeDateInput();
        } catch (error) {
            console.error('Error al guardar la compra:', error);
            alert('Error al registrar la compra. Por favor intente nuevamente.');
        }
    }
}
