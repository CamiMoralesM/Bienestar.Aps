class ComprasGasManager {
    obtenerLimitesEstacionales(fecha) {
        const mes = fecha.getMonth() + 1;
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

    generarOpcionesSelect(limiteMax) {
        let options = '<option value="0">0</option>';
        for (let i = 1; i <= limiteMax; i++) {
            options += `<option value="${i}">${i}</option>`;
        }
        return options;
    }

    actualizarOpcionesGas(contenedorId) {
        const contenedor = document.getElementById(contenedorId);
        const fecha = new Date(this.fechaInput.value);
        const limites = this.obtenerLimitesEstacionales(fecha);
        const opciones = this.generarOpcionesSelect(limites.limitePorCarga);
        const temporadaMsg = limites.esTemporadaAlta ? 
            'Temporada Alta (Junio-Septiembre): Máximo 3 por carga, total 6 mensuales' :
            'Temporada Normal (Octubre-Mayo): Máximo 2 por carga, total 4 mensuales';

        const tiposGas = [
            { kg: '5', label: '5 kilos' },
            { kg: '11', label: '11 kilos' },
            { kg: '15', label: '15 kilos' },
            { kg: '45', label: '45 kilos' }
        ];

        const empresa = contenedorId === 'lipigasOpciones' ? 'lipigas' : 'abastible';

        contenedor.innerHTML = `
            <div class="gas-options-container">
                <div class="limites-info">${temporadaMsg}</div>
                ${tiposGas.map(tipo => `
                    <div class="gas-option-row">
                        <label class="gas-option-label">${tipo.label}</label>
                        <select id="${empresa}${tipo.kg}" name="${empresa}${tipo.kg}" class="gas-select">
                            ${opciones}
                        </select>
                    </div>
                `).join('')}
                <div class="total-info">
                    Total seleccionado: <span class="total-count">0</span>
                </div>
                ${empresa === 'abastible' ? `
                    <div class="form-group saldo-favor">
                        <label for="saldoFavor">Saldo a favor (si aplica)</label>
                        <input type="text" id="saldoFavor" name="saldoFavor" placeholder="Fecha y monto">
                    </div>
                ` : ''}
            </div>
        `;

        // Agregar event listeners para los nuevos selects
        const selects = contenedor.querySelectorAll('select');
        selects.forEach(select => {
            select.addEventListener('change', () => this.actualizarTotal(contenedorId));
        });
    }

    actualizarTotal(contenedorId) {
        const contenedor = document.getElementById(contenedorId);
        const selects = contenedor.querySelectorAll('select');
        const totalElement = contenedor.querySelector('.total-count');
        
        let total = 0;
        selects.forEach(select => {
            total += parseInt(select.value) || 0;
        });

        const limites = this.obtenerLimitesEstacionales(new Date(this.fechaInput.value));
        
        if (total > limites.limiteTotal) {
            alert(`El total de cargas no puede superar ${limites.limiteTotal} en este período`);
            selects[selects.length - 1].value = "0";
            this.actualizarTotal(contenedorId);
            return;
        }

        totalElement.textContent = total;
    }

    setupEventListeners() {
        const compraLipigas = document.getElementById('compraLipigas');
        const compraAbastible = document.getElementById('compraAbastible');
        const lipigasOpciones = document.getElementById('lipigasOpciones');
        const abastibleOpciones = document.getElementById('abastibleOpciones');

        compraLipigas.addEventListener('change', (e) => {
            lipigasOpciones.style.display = e.target.value === 'si' ? 'block' : 'none';
            if (e.target.value === 'si') {
                this.actualizarOpcionesGas('lipigasOpciones');
            }
        });

        compraAbastible.addEventListener('change', (e) => {
            abastibleOpciones.style.display = e.target.value === 'si' ? 'block' : 'none';
            if (e.target.value === 'si') {
                this.actualizarOpcionesGas('abastibleOpciones');
            }
        });

        this.fechaInput.addEventListener('change', () => {
            if (compraLipigas.value === 'si') {
                this.actualizarOpcionesGas('lipigasOpciones');
            }
            if (compraAbastible.value === 'si') {
                this.actualizarOpcionesGas('abastibleOpciones');
            }
        });
    }
}
