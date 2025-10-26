// UI simplificada para préstamos (SIN subida de archivos para evitar CORS)
import { guardarSolicitudPrestamo, validarDatosSolicitud, generarInstruccionesEmail } from './prestamos-firebase-sin-cors.js';
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 Inicializando módulo de préstamos (versión sin CORS)...');
    
    // Botones descargar (convierten imagen -> PDF)
    document.querySelectorAll('.btn-download').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const imgPath = btn.dataset.img;
            const outName = btn.dataset.name || 'formulario.pdf';
            try {
                await imageToPDFAndDownload(imgPath, outName);
            } catch (err) {
                console.error('Error generando PDF:', err);
                alert('Error al generar PDF. Intente descargar la imagen directamente.');
                // fallback: abrir imagen
                window.open(imgPath, '_blank');
            }
        });
    });

    // Manejo del formulario de solicitud
    const form = document.getElementById('formSolicitudPrestamo');
    if (form) {
        console.log('✅ Formulario de solicitud encontrado');
        form.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            await enviarSolicitudPrestamo();
        });
    } else {
        console.warn('⚠️ Formulario de solicitud no encontrado');
    }

    // Precargar datos cuando el usuario esté autenticado
    onAuthStateChanged(auth, user => {
        if (user) {
            console.log('👤 Usuario autenticado:', user.uid);
            precargarDatosUsuario();
        } else {
            console.warn('❌ Usuario no autenticado');
        }
    });

    // Agregar event listeners para mostrar información de documentos según tipo
    const tipoSelect = document.getElementById('tipoSolicitud');
    if (tipoSelect) {
        tipoSelect.addEventListener('change', function() {
            mostrarInformacionDocumentos(this.value);
        });
    }
});

/**
 * Precarga los datos del usuario desde sessionStorage
 */
function precargarDatosUsuario() {
    try {
        const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
        console.log('📋 Datos del usuario disponibles');
        
        if (userData && Object.keys(userData).length) {
            const campos = [
                { id: 'nombrePrestamo', valor: userData.nombre },
                { id: 'rutPrestamo', valor: userData.rut },
                { id: 'emailPrestamo', valor: userData.email },
                { id: 'telefonoPrestamo', valor: userData.telefono }
            ];
            
            campos.forEach(campo => {
                const element = document.getElementById(campo.id);
                if (element && campo.valor) {
                    element.value = campo.valor;
                }
            });
            
            console.log('✅ Datos precargados en el formulario');
        }
    } catch (error) {
        console.error('❌ Error precargando datos:', error);
    }
}

/**
 * Muestra información específica de documentos según el tipo de préstamo
 */
function mostrarInformacionDocumentos(tipo) {
    const infoElement = document.getElementById('documentosExtrasInfo');
    const extraDiv = document.getElementById('documentosAdicionales');
    
    if (!infoElement || !extraDiv) return;
    
    const informacion = {
        'prestamo-medico': {
            texto: 'Para préstamos médicos: Certificado médico, presupuesto o factura médica',
            mostrar: true
        },
        'prestamo-emergencia': {
            texto: 'Para emergencias: Documentos que justifiquen la emergencia (certificados, facturas, etc.)',
            mostrar: true
        },
        'prestamo-libre-disposicion': {
            texto: 'No se requieren documentos adicionales para libre disposición',
            mostrar: false
        }
    };
    
    const info = informacion[tipo];
    if (info) {
        infoElement.textContent = info.texto;
        extraDiv.style.display = info.mostrar ? 'block' : 'none';
    } else {
        extraDiv.style.display = 'none';
    }
}

/**
 * Envia la solicitud (SIN subir archivos - solo guarda datos)
 */
async function enviarSolicitudPrestamo() {
    console.log('📤 Iniciando envío de solicitud (versión simplificada)...');
    
    try {
        // Verificar autenticación
        if (!auth.currentUser) {
            alert('❌ Debe iniciar sesión para enviar una solicitud');
            return;
        }

        // Obtener datos del formulario
        const datos = {
            tipo: document.getElementById('tipoSolicitud')?.value?.trim() || '',
            nombre: document.getElementById('nombrePrestamo')?.value?.trim() || '',
            rut: document.getElementById('rutPrestamo')?.value?.trim() || '',
            email: document.getElementById('emailPrestamo')?.value?.trim() || '',
            telefono: document.getElementById('telefonoPrestamo')?.value?.trim() || '',
            comentario: document.getElementById('descripcionSolicitud')?.value?.trim() || ''
        };

        console.log('📝 Datos del formulario:', datos);

        // Mapear tipos
        const tipoMap = {
            'prestamo-medico': 'medico',
            'prestamo-emergencia': 'emergencia',
            'prestamo-libre-disposicion': 'libre_disposicion'
        };
        const tipo = tipoMap[datos.tipo] || datos.tipo;

        // Validar datos básicos
        const validacion = validarDatosSolicitud(datos);
        if (!validacion.valido) {
            const mensajeError = '❌ Errores encontrados:\n\n' + validacion.errores.map(e => `• ${e}`).join('\n');
            alert(mensajeError);
            return;
        }

        // Obtener información de archivos (solo para mostrar al usuario)
        const archivos = obtenerArchivosSeleccionados();
        
        // Mostrar estado
        const estadoEl = document.getElementById('estadoEnvio');
        if (estadoEl) {
            estadoEl.innerHTML = '⏳ Guardando solicitud...';
            estadoEl.style.color = '#007bff';
        }

        // Deshabilitar botón
        const btnSubmit = document.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = '⏳ Enviando...';
        }

        // Guardar solicitud (sin subir archivos)
        const resultado = await guardarSolicitudPrestamo(tipo, datos, archivos);

        if (resultado.success) {
            // Generar instrucciones de email
            const instrucciones = generarInstruccionesEmail(resultado.id, tipo, datos.nombre);
            
            // Mostrar mensaje de éxito con instrucciones
            const mensaje = `✅ SOLICITUD CREADA EXITOSAMENTE\n\n` +
                          `📋 ID de Solicitud: ${resultado.id}\n` +
                          `👤 Solicitante: ${datos.nombre}\n` +
                          `📧 Tipo: ${tipo}\n` +
                          `📎 Archivos detectados: ${archivos.length}\n\n` +
                          `📧 IMPORTANTE - ENVÍO DE DOCUMENTOS:\n` +
                          `Para completar su solicitud, debe enviar los documentos por email a:\n\n` +
                          `📧 Para: ${instrucciones.para}\n` +
                          `📝 Asunto: ${instrucciones.asunto}\n\n` +
                          `Los documentos requeridos son:\n` +
                          `• Formulario completo y firmado\n` +
                          `• Fotocopia de cédula de identidad\n` +
                          `• Últimas 3 liquidaciones de sueldo\n` +
                          `• Otros documentos según el tipo de préstamo\n\n` +
                          `Su solicitud será procesada una vez recibidos los documentos.`;
            
            if (estadoEl) {
                estadoEl.innerHTML = `✅ Solicitud creada. ID: ${resultado.id}<br><strong>Envíe documentos por email a bienestar@aps.cl</strong>`;
                estadoEl.style.color = '#28a745';
            }
            
            alert(mensaje);
            
            // Crear enlace de email automático
            crearEnlaceEmail(instrucciones);
            
            // Limpiar formulario
            const form = document.getElementById('formSolicitudPrestamo');
            if (form) {
                form.reset();
                precargarDatosUsuario();
            }
            
        } else {
            const mensajeError = `❌ Error al crear la solicitud:\n\n${resultado.error}`;
            
            if (estadoEl) {
                estadoEl.innerHTML = `❌ Error: ${resultado.error}`;
                estadoEl.style.color = '#dc3545';
            }
            
            alert(mensajeError);
        }
        
    } catch (error) {
        console.error('❌ Error inesperado:', error);
        
        const estadoEl = document.getElementById('estadoEnvio');
        const mensajeError = `❌ Error inesperado: ${error.message || error}`;
        
        if (estadoEl) {
            estadoEl.innerHTML = mensajeError;
            estadoEl.style.color = '#dc3545';
        }
        
        alert(mensajeError);
    } finally {
        // Rehabilitar botón
        const btnSubmit = document.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = '📤 Enviar Solicitud de Préstamo';
        }
    }
}

/**
 * Obtiene los archivos seleccionados (para información)
 */
function obtenerArchivosSeleccionados() {
    const fileInputIds = [
        'formularioCompleto',
        'cedulaIdentidad', 
        'liquidacionesSueldo',
        'documentosExtras'
    ];
    
    const archivos = [];
    fileInputIds.forEach(id => {
        const input = document.getElementById(id);
        if (input && input.files) {
            for (const file of input.files) {
                archivos.push(file);
            }
        }
    });
    
    return archivos;
}

/**
 * Crea un enlace de email automático para facilitar el envío
 */
function crearEnlaceEmail(instrucciones) {
    const emailUrl = `mailto:${instrucciones.para}?subject=${encodeURIComponent(instrucciones.asunto)}&body=${encodeURIComponent(instrucciones.cuerpo)}`;
    
    // Crear botón para abrir email
    const emailBtn = document.createElement('button');
    emailBtn.innerHTML = '📧 Abrir Email para Enviar Documentos';
    emailBtn.className = 'btn btn-success';
    emailBtn.style.cssText = 'margin: 10px 0; padding: 10px 20px; font-weight: bold;';
    emailBtn.onclick = () => window.open(emailUrl);
    
    // Buscar donde insertarlo
    const estadoEl = document.getElementById('estadoEnvio');
    if (estadoEl && estadoEl.parentNode) {
        estadoEl.parentNode.insertBefore(emailBtn, estadoEl.nextSibling);
        
        // Remover después de 30 segundos
        setTimeout(() => {
            if (emailBtn.parentNode) {
                emailBtn.parentNode.removeChild(emailBtn);
            }
        }, 30000);
    }
}

/**
 * Convierte imagen a PDF (mantenido para descargas de formularios)
 */
async function imageToPDFAndDownload(imageUrl, outFileName = 'formulario.pdf') {
    console.log('🖼️ Generando PDF desde imagen:', imageUrl);
    
    try {
        const img = document.createElement('img');
        img.style.position = 'fixed';
        img.style.left = '-9999px';
        img.style.zIndex = '-1';
        img.src = imageUrl;
        img.style.maxWidth = '100%';

        document.body.appendChild(img);

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error('Error cargando imagen'));
        });

        const canvas = await html2canvas(img, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(outFileName);

        document.body.removeChild(img);
        
    } catch (error) {
        console.error('❌ Error generando PDF:', error);
        throw error;
    }
}

// Función global para compatibilidad
window.enviarSolicitudPrestamo = enviarSolicitudPrestamo;
