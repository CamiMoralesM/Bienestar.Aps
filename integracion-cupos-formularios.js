// ========================================
// INTEGRACIÓN DE VALIDACIÓN DE CUPOS CON FORMULARIOS
// Para dashboard-afiliado.html
// ========================================

import { 
    validarCupoMensual,
    inicializarValidacionAutomatica,
    mostrarEstadoCupo,
    formatearRUT
} from './validacion-cupo-mensual-mejorado.js';

import { 
    guardarCompraUnificada 
} from './compras-gas-firebase.js';

// ========================================
// INICIALIZACIÓN AL CARGAR LA PÁGINA
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando integración de validación de cupos...');
    
    // ========================================
    // CONFIGURAR VALIDACIÓN PARA CADA FORMULARIO
    // ========================================
    
    // 1. FORMULARIO DE GAS
    const formGas = document.getElementById('formCompraGas');
    if (formGas) {
        console.log('📋 Configurando validación para Gas');
        
        // Inicializar validación automática
        inicializarValidacionAutomatica('rutGas', 'formCompraGas', 'gas');
        
        // Interceptar el envío del formulario
        formGas.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const rutInput = document.getElementById('rutGas');
            const rut = rutInput.value.trim();
            
            // Calcular total de cargas solicitadas
            let totalCargas = 0;
            if (document.getElementById('compraLipigas')?.value === 'si') {
                totalCargas += parseInt(document.getElementById('lipigas5')?.value || 0);
                totalCargas += parseInt(document.getElementById('lipigas11')?.value || 0);
                totalCargas += parseInt(document.getElementById('lipigas15')?.value || 0);
                totalCargas += parseInt(document.getElementById('lipigas45')?.value || 0);
            }
            if (document.getElementById('compraAbastible')?.value === 'si') {
                totalCargas += parseInt(document.getElementById('abastible5')?.value || 0);
                totalCargas += parseInt(document.getElementById('abastible11')?.value || 0);
                totalCargas += parseInt(document.getElementById('abastible15')?.value || 0);
                totalCargas += parseInt(document.getElementById('abastible45')?.value || 0);
            }
            
            // Validar cupo antes de enviar
            const validacion = await validarCupoMensual(rut, 'gas', totalCargas);
            
            if (!validacion.success) {
                alert(`❌ Error al validar cupo: ${validacion.error}`);
                return;
            }
            
            if (!validacion.puedeComprarCantidad) {
                alert(`❌ No puede comprar ${totalCargas} cargas.\n\n${validacion.mensaje}\n\nMáximo permitido: ${validacion.cantidadMaximaPermitida} cargas`);
                return;
            }
            
            // Si todo está bien, proceder con el envío
            const submitBtn = formGas.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';
            
            try {
                const formData = new FormData(formGas);
                const datosCompra = Object.fromEntries(formData.entries());
                const comprobanteFile = formGas.querySelector('#comprobanteGas').files[0];
                
                const resultado = await guardarCompraUnificada('gas', datosCompra, comprobanteFile);
                
                if (resultado.success) {
                    alert(`✅ Compra registrada exitosamente!\n\nID: ${resultado.id}\nTotal: ${resultado.totalCargas} cargas\nPrecio: $${(resultado.precioTotal || 0).toLocaleString('es-CL')}`);
                    formGas.reset();
                    
                    // Actualizar validación de cupo
                    await validarCupoMensual(rut, 'gas', 0);
                } else {
                    throw new Error(resultado.error || 'Error desconocido');
                }
            } catch (error) {
                alert(`❌ Error al registrar la compra: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Compra Gas';
            }
        });
    }
    
    // 2. FORMULARIO DE CINE
    const formCine = document.getElementById('formCompraCine');
    if (formCine) {
        console.log('📋 Configurando validación para Cine');
        
        // Inicializar validación automática
        inicializarValidacionAutomatica('rutCine', 'formCompraCine', 'cine');
        
        // Interceptar el envío
        formCine.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const rut = document.getElementById('rutCine').value.trim();
            const cantidad = parseInt(document.getElementById('cantidadCine').value || 0);
            
            // Validar cupo
            const validacion = await validarCupoMensual(rut, 'cine', cantidad);
            
            if (!validacion.success) {
                alert(`❌ Error al validar cupo: ${validacion.error}`);
                return;
            }
            
            if (!validacion.puedeComprarCantidad) {
                alert(`❌ No puede comprar ${cantidad} entradas.\n\n${validacion.mensaje}\n\nMáximo permitido: ${validacion.cantidadMaximaPermitida} entradas`);
                return;
            }
            
            // Proceder con el envío
            const submitBtn = formCine.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';
            
            try {
                const formData = new FormData(formCine);
                const datosCompra = Object.fromEntries(formData.entries());
                const comprobanteFile = formCine.querySelector('#comprobanteCine').files[0];
                
                const resultado = await guardarCompraUnificada('cine', datosCompra, comprobanteFile);
                
                if (resultado.success) {
                    alert(`✅ Compra de Cine registrada!\n\nID: ${resultado.id}\nCantidad: ${resultado.cantidad} entradas\nTotal: $${(resultado.montoTotal || 0).toLocaleString('es-CL')}`);
                    formCine.reset();
                    
                    // Actualizar validación
                    await validarCupoMensual(rut, 'cine', 0);
                } else {
                    throw new Error(resultado.error || 'Error desconocido');
                }
            } catch (error) {
                alert(`❌ Error: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Compra Cine';
            }
        });
    }
    
    // 3. FORMULARIO DE JUMPER
    const formJumper = document.getElementById('formCompraJumper');
    if (formJumper) {
        console.log('📋 Configurando validación para Jumper');
        
        // Inicializar validación automática
        inicializarValidacionAutomatica('rutJumper', 'formCompraJumper', 'jumper');
        
        // Interceptar el envío
        formJumper.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const rut = document.getElementById('rutJumper').value.trim();
            const cantidad = parseInt(document.getElementById('cantidadJumper').value || 0);
            
            // Validar cupo
            const validacion = await validarCupoMensual(rut, 'jumper', cantidad);
            
            if (!validacion.success) {
                alert(`❌ Error al validar cupo: ${validacion.error}`);
                return;
            }
            
            if (!validacion.puedeComprarCantidad) {
                alert(`❌ No puede comprar ${cantidad} entradas.\n\n${validacion.mensaje}\n\nMáximo permitido: ${validacion.cantidadMaximaPermitida} entradas`);
                return;
            }
            
            // Proceder con el envío
            const submitBtn = formJumper.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';
            
            try {
                const formData = new FormData(formJumper);
                const datosCompra = Object.fromEntries(formData.entries());
                const comprobanteFile = formJumper.querySelector('#comprobanteJumper').files[0];
                
                const resultado = await guardarCompraUnificada('jumper', datosCompra, comprobanteFile);
                
                if (resultado.success) {
                    alert(`✅ Compra de Jumper registrada!\n\nID: ${resultado.id}\nCantidad: ${resultado.cantidad} entradas\nTotal: $${(resultado.montoTotal || 0).toLocaleString('es-CL')}`);
                    formJumper.reset();
                    
                    // Actualizar validación
                    await validarCupoMensual(rut, 'jumper', 0);
                } else {
                    throw new Error(resultado.error || 'Error desconocido');
                }
            } catch (error) {
                alert(`❌ Error: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Compra Jumper';
            }
        });
    }
    
    // 4. FORMULARIO DE GIMNASIO
    const formGimnasio = document.getElementById('formCompraGimnasio');
    if (formGimnasio) {
        console.log('📋 Configurando validación para Gimnasio');
        
        // Inicializar validación automática
        inicializarValidacionAutomatica('rutGimnasio', 'formCompraGimnasio', 'gimnasio');
        
        // Interceptar el envío
        formGimnasio.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const rut = document.getElementById('rutGimnasio').value.trim();
            const cantidad = parseInt(document.getElementById('cantidadGimnasio').value || 0);
            
            // Validar cupo
            const validacion = await validarCupoMensual(rut, 'gimnasio', cantidad);
            
            if (!validacion.success) {
                alert(`❌ Error al validar cupo: ${validacion.error}`);
                return;
            }
            
            if (!validacion.puedeComprarCantidad) {
                alert(`❌ No puede comprar ${cantidad} tickets.\n\n${validacion.mensaje}\n\nMáximo permitido: ${validacion.cantidadMaximaPermitida} tickets`);
                return;
            }
            
            // Proceder con el envío
            const submitBtn = formGimnasio.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';
            
            try {
                const formData = new FormData(formGimnasio);
                const datosCompra = Object.fromEntries(formData.entries());
                const comprobanteFile = formGimnasio.querySelector('#comprobanteGimnasio').files[0];
                
                const resultado = await guardarCompraUnificada('gimnasio', datosCompra, comprobanteFile);
                
                if (resultado.success) {
                    alert(`✅ Compra de Gimnasio registrada!\n\nID: ${resultado.id}\nCantidad: ${resultado.cantidad} tickets\nTotal: $${(resultado.montoTotal || 0).toLocaleString('es-CL')}`);
                    formGimnasio.reset();
                    
                    // Actualizar validación
                    await validarCupoMensual(rut, 'gimnasio', 0);
                } else {
                    throw new Error(resultado.error || 'Error desconocido');
                }
            } catch (error) {
                alert(`❌ Error: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Compra Gimnasio';
            }
        });
    }
    
    // ========================================
    // FORMATEO AUTOMÁTICO DE RUT
    // ========================================
    
    const rutInputs = ['rutGas', 'rutCine', 'rutJumper', 'rutGimnasio'];
    rutInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            // Formatear mientras escribe
            input.addEventListener('input', function() {
                const position = this.selectionStart;
                const valorAnterior = this.value;
                const valorFormateado = formatearRUT(this.value);
                
                // Solo actualizar si cambió el formato
                if (valorAnterior !== valorFormateado) {
                    this.value = valorFormateado;
                    
                    // Mantener la posición del cursor
                    const diff = valorFormateado.length - valorAnterior.length;
                    this.selectionStart = this.selectionEnd = position + diff;
                }
            });
            
            // Al perder el foco, asegurar formato correcto
            input.addEventListener('blur', function() {
                this.value = formatearRUT(this.value);
            });
        }
    });
    
    console.log('✅ Sistema de validación de cupos integrado correctamente');
});

// ========================================
// FUNCIÓN AUXILIAR PARA MOSTRAR RESUMEN DE CUPOS
// ========================================

export async function mostrarResumenCupos(rut) {
    try {
        console.log('📊 Generando resumen de cupos para RUT:', rut);
        
        const servicios = ['gas', 'cine', 'jumper', 'gimnasio'];
        const resultados = [];
        
        for (const servicio of servicios) {
            const validacion = await validarCupoMensual(rut, servicio, 0);
            resultados.push(validacion);
        }
        
        // Crear elemento de resumen
        const resumenHTML = `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3 style="color: #495057; margin-bottom: 15px;">📊 Resumen de Cupos Mensuales</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                    ${resultados.map(v => `
                        <div style="
                            background: white;
                            padding: 15px;
                            border-radius: 8px;
                            border-left: 4px solid ${v.colorEstado};
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong>${v.nombreServicio}</strong>
                                <span style="font-size: 1.2em;">${v.iconoEstado}</span>
                            </div>
                            <div style="margin-top: 10px; color: #6c757d;">
                                <small>Usado: ${v.usoActual} / ${v.limiteCupo}</small><br>
                                <small>Disponible: ${v.disponible}</small>
                            </div>
                            <div style="
                                margin-top: 10px;
                                background: ${v.colorEstado}20;
                                height: 8px;
                                border-radius: 4px;
                                overflow: hidden;
                            ">
                                <div style="
                                    background: ${v.colorEstado};
                                    height: 100%;
                                    width: ${v.porcentajeUso}%;
                                    transition: width 0.3s ease;
                                "></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        return {
            html: resumenHTML,
            resultados: resultados
        };
        
    } catch (error) {
        console.error('❌ Error al generar resumen de cupos:', error);
        return null;
    }
}

// ========================================
// EXPORTACIONES
// ========================================

export default {
    mostrarResumenCupos
};
