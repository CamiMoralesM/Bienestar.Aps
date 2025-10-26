// UI para la pestaña de Préstamos / Fondo Solidario
import { guardarSolicitudPrestamo, validarArchivos } from './prestamos-firebase.js';
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 Inicializando módulo de préstamos...');
    
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

    // Abrir modal de subida (si usas botones que abren modal)
    document.querySelectorAll('.btn-open-upload').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tipo = btn.dataset.tipo || '';
            abrirModalSolicitud(tipo);
        });
    });

    // Manejo del formulario de solicitud (si existe en la página)
    const form = document.getElementById('formSolicitudPrestamo');
    if (form) {
        console.log('✅ Formulario de solicitud encontrado, agregando event listener...');
        form.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            await enviarSolicitudPrestamo();
        });
    } else {
        console.warn('⚠️ Formulario de solicitud no encontrado');
    }

    // Cerrar modal cuando se hace click fuera (opcional)
    window.cerrarModalSolicitud = function() {
        const modal = document.getElementById('modalSolicitudPrestamo');
        if (modal) modal.style.display = 'none';
    };

    // Si está logueado, precargar datos del usuario
    onAuthStateChanged(auth, user => {
        if (user) {
            console.log('👤 Usuario autenticado:', user.uid);
            precargarDatosUsuario();
        } else {
            console.warn('❌ Usuario no autenticado');
        }
    });
});

/**
 * Precarga los datos del usuario desde sessionStorage
 */
function precargarDatosUsuario() {
    try {
        const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
        console.log('📋 Datos del usuario:', userData);
        
        if (userData && Object.keys(userData).length) {
            const nombreEl = document.getElementById('nombrePrestamo');
            const rutEl = document.getElementById('rutPrestamo');
            const emailEl = document.getElementById('emailPrestamo');
            
            if (nombreEl) nombreEl.value = userData.nombre || '';
            if (rutEl) rutEl.value = userData.rut || '';
            if (emailEl) emailEl.value = userData.email || '';
            
            console.log('✅ Datos precargados en el formulario');
        }
    } catch (error) {
        console.error('❌ Error precargando datos:', error);
    }
}

/**
 * Abre el modal y setea el tipo de préstamo
 */
function abrirModalSolicitud(tipo) {
    const tipoEl = document.getElementById('tipoPrestamo') || document.getElementById('tipoSolicitud');
    if (tipoEl) tipoEl.value = tipo || '';
    
    const titulo = {
        medico: 'Solicitud - Préstamo Médico',
        emergencia: 'Solicitud - Préstamo de Emergencia',
        libre_disposicion: 'Solicitud - Préstamo Libre Disposición',
        fondo_solidario: 'Solicitud - Fondo Solidario'
    }[tipo] || 'Solicitud - Préstamo / Fondo Solidario';
    
    const modalTitulo = document.getElementById('modalTitulo');
    if (modalTitulo) modalTitulo.textContent = titulo;

    precargarDatosUsuario();

    const estadoEl = document.getElementById('estadoEnvio');
    if (estadoEl) estadoEl.innerHTML = '';
    
    const modal = document.getElementById('modalSolicitudPrestamo');
    if (modal) modal.style.display = 'block';
}

/**
 * Envia la solicitud: valida campos, sube archivos y crea documento en Firestore
 */
async function enviarSolicitudPrestamo() {
    console.log('📤 Iniciando envío de solicitud...');
    
    try {
        // Verificar autenticación
        if (!auth.currentUser) {
            alert('❌ Debe iniciar sesión para enviar una solicitud');
            return;
        }

        // Buscar valores con varios IDs posibles (compatibilidad)
        const tipoEl = document.getElementById('tipoPrestamo') || document.getElementById('tipoSolicitud');
        const nombreEl = document.getElementById('nombreSolicitante') || document.getElementById('nombrePrestamo');
        const rutEl = document.getElementById('rutSolicitante') || document.getElementById('rutPrestamo');
        const emailEl = document.getElementById('emailSolicitante') || document.getElementById('emailPrestamo');
        const comentarioEl = document.getElementById('comentarioPrestamo') || document.getElementById('descripcionSolicitud');

        // Elemento de estado opcional
        const estadoEl = document.getElementById('estadoEnvio');

        // Recoger tipo, nombre, rut, email, comentario
        const tipoRaw = tipoEl ? (tipoEl.value || '').trim() : '';
        const nombre = nombreEl ? (nombreEl.value || '').trim() : '';
        const rut = rutEl ? (rutEl.value || '').trim() : '';
        const email = emailEl ? (emailEl.value || '').trim() : '';
        const comentario = comentarioEl ? (comentarioEl.value || '').trim() : '';

        console.log('📝 Datos del formulario:', { tipoRaw, nombre, rut, email, comentario: comentario.substring(0, 50) + '...' });

        // Mapear tipos del dashboard a los que espera la función de Firebase
        const tipoMap = {
            'prestamo-medico': 'medico',
            'prestamo-emergencia': 'emergencia',
            'prestamo-libre-disposicion': 'libre_disposicion',
            'fondo_solidario': 'fondo_solidario',
            'medico': 'medico',
            'emergencia': 'emergencia',
            'libre_disposicion': 'libre_disposicion'
        };
        const tipo = tipoMap[tipoRaw] || tipoRaw;

        // Recolectar archivos desde varios inputs posibles
        const fileInputIds = [
            'archivosPrestamo',        // antiguo
            'formularioCompleto',
            'cedulaIdentidad',
            'liquidacionesSueldo',
            'documentosExtras',
            'comprobantePrestamo'      // por si existe otro id
        ];
        
        const archivosArray = [];
        for (const id of fileInputIds) {
            const inp = document.getElementById(id);
            if (inp && inp.files && inp.files.length) {
                for (const f of Array.from(inp.files)) {
                    archivosArray.push(f);
                }
            }
        }

        console.log('📎 Archivos recolectados:', archivosArray.length);

        // Validaciones básicas
        let errores = [];
        
        if (!tipo) {
            errores.push('Tipo de solicitud no definido');
        }
        if (!nombre) {
            errores.push('El nombre es obligatorio');
        }
        if (!rut) {
            errores.push('El RUT es obligatorio');
        }
        if (!email || !email.includes('@')) {
            errores.push('El correo electrónico es obligatorio y debe ser válido');
        }
        if (!comentario) {
            errores.push('La descripción de la solicitud es obligatoria');
        }

        // Validar archivos
        const validacionArchivos = validarArchivos(archivosArray);
        if (!validacionArchivos.valido) {
            errores = errores.concat(validacionArchivos.errores);
        }

        if (errores.length > 0) {
            const mensajeError = '❌ Errores encontrados:\n\n' + errores.map(e => `• ${e}`).join('\n');
            alert(mensajeError);
            console.error('❌ Errores de validación:', errores);
            return;
        }

        // Mostrar estado de subida
        if (estadoEl) {
            estadoEl.innerHTML = '⏳ Subiendo archivos y guardando solicitud...';
            estadoEl.style.color = '#007bff';
        } else {
            console.log('⏳ Subiendo archivos y guardando solicitud...');
        }

        // Deshabilitar botón de envío
        const btnSubmit = document.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = '⏳ Enviando...';
        }

        // Preparar datos
        const datos = {
            nombre,
            rut,
            email,
            comentario
        };

        console.log('🚀 Llamando a guardarSolicitudPrestamo...');
        const resultado = await guardarSolicitudPrestamo(tipo, datos, archivosArray);

        console.log('📊 Resultado:', resultado);

        if (resultado.success) {
            const mensaje = `✅ Solicitud enviada correctamente\n\n` +
                          `ID: ${resultado.id}\n` +
                          `Tipo: ${tipo}\n` +
                          `Archivos subidos: ${resultado.archivosSubidos}\n\n` +
                          `Su solicitud será revisada por el equipo de Bienestar APS.`;
            
            if (estadoEl) {
                estadoEl.innerHTML = `✅ Solicitud enviada correctamente. ID: ${resultado.id}`;
                estadoEl.style.color = '#28a745';
            }
            
            alert(mensaje);
            
            // Limpiar formulario
            const form = document.getElementById('formSolicitudPrestamo');
            if (form) {
                form.reset();
                precargarDatosUsuario(); // Volver a precargar datos básicos
            }

            // Cerrar modal tras 2s si existe
            setTimeout(() => {
                const modal = document.getElementById('modalSolicitudPrestamo');
                if (modal) modal.style.display = 'none';
            }, 2000);
            
        } else {
            const mensajeError = `❌ Error al enviar la solicitud:\n\n${resultado.error}`;
            
            if (estadoEl) {
                estadoEl.innerHTML = `❌ Error: ${resultado.error}`;
                estadoEl.style.color = '#dc3545';
            }
            
            alert(mensajeError);
            console.error('❌ Error en el resultado:', resultado);
        }
        
    } catch (error) {
        console.error('❌ Error inesperado al enviar solicitud:', error);
        
        const estadoEl = document.getElementById('estadoEnvio');
        const mensajeError = `❌ Error inesperado: ${error.message || error}`;
        
        if (estadoEl) {
            estadoEl.innerHTML = mensajeError;
            estadoEl.style.color = '#dc3545';
        }
        
        alert(mensajeError);
    } finally {
        // Rehabilitar botón de envío
        const btnSubmit = document.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = '📤 Enviar Solicitud de Préstamo';
        }
    }
}

/**
 * Convierte una imagen (ruta relativa a este dominio) en un PDF y lo descarga.
 * Usa html2canvas + jsPDF para evitar problemas con tamaños.
 */
async function imageToPDFAndDownload(imageUrl, outFileName = 'formulario.pdf') {
    console.log('🖼️ Generando PDF desde imagen:', imageUrl);
    
    try {
        // Crear elemento imagen oculto
        const img = document.createElement('img');
        img.style.maxWidth = '100%';
        img.style.display = 'block';
        img.style.position = 'fixed';
        img.style.left = '-9999px';
        img.style.zIndex = '-1';
        img.src = imageUrl;

        document.body.appendChild(img);

        // Esperar a que cargue la imagen
        await new Promise((resolve, reject) => {
            img.onload = () => {
                console.log('✅ Imagen cargada correctamente');
                resolve();
            };
            img.onerror = (e) => {
                console.error('❌ Error cargando imagen:', e);
                reject(new Error('No se pudo cargar la imagen: ' + imageUrl));
            };
        });

        console.log('🎨 Generando canvas...');
        
        // Usar html2canvas para sacar un canvas de la imagen y generar PDF
        const canvas = await html2canvas(img, { 
            scale: 2, 
            useCORS: true,
            allowTaint: true 
        });
        
        const imgData = canvas.toDataURL('image/png');

        console.log('📄 Creando PDF...');
        
        // usar jsPDF
        const { jsPDF } = window.jspdf;
        
        // Determinar orientación según dimensiones
        const pdf = new jsPDF({
            orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(outFileName);

        console.log('✅ PDF generado y descargado:', outFileName);

        // limpiar
        document.body.removeChild(img);
        
    } catch (error) {
        console.error('❌ Error generando PDF:', error);
        throw error;
    }
}

// Hacer la función global para compatibilidad
window.enviarSolicitudPrestamo = enviarSolicitudPrestamo;
window.abrirModalSolicitud = abrirModalSolicitud;
