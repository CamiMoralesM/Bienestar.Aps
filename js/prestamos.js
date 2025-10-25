// UI para la pestaña de Préstamos / Fondo Solidario
import { guardarSolicitudPrestamo } from './prestamos-firebase.js';
import { auth } from './firebase-config.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    // Botones descargar (convierten imagen -> PDF)
    document.querySelectorAll('.btn-download').forEach(btn => {
        btn.addEventListener('click', async (e) => {
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

    // Abrir modal de subida
    document.querySelectorAll('.btn-open-upload').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tipo = btn.dataset.tipo || '';
            abrirModalSolicitud(tipo);
        });
    });

    // Manejo del formulario de solicitud
    const form = document.getElementById('formSolicitudPrestamo');
    if (form) {
        form.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            await enviarSolicitudPrestamo();
        });
    }

    // Cerrar modal cuando se hace click fuera (opcional)
    window.cerrarModalSolicitud = function() {
        const modal = document.getElementById('modalSolicitudPrestamo');
        if (modal) modal.style.display = 'none';
    };

    // Si está logueado, precargar datos del usuario
    onAuthStateChanged(auth, user => {
        if (user) {
            // precarga básica será hecha al abrir el modal
        }
    });
});

/**
 * Abre el modal y setea el tipo de préstamo
 */
function abrirModalSolicitud(tipo) {
    document.getElementById('tipoPrestamo').value = tipo || '';
    const titulo = {
        medico: 'Solicitud - Préstamo Médico',
        emergencia: 'Solicitud - Préstamo de Emergencia',
        libre_disposicion: 'Solicitud - Préstamo Libre Disposición',
        fondo_solidario: 'Solicitud - Fondo Solidario'
    }[tipo] || 'Solicitud - Préstamo / Fondo Solidario';
    document.getElementById('modalTitulo').textContent = titulo;

    // Si hay usuario autenticado, intentar rellenar nombre/email/rut desde sessionStorage o Firebase
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    if (userData && Object.keys(userData).length) {
        document.getElementById('nombreSolicitante').value = userData.nombre || '';
        document.getElementById('rutSolicitante').value = userData.rut || '';
        document.getElementById('emailSolicitante').value = userData.email || '';
    }

    document.getElementById('estadoEnvio').innerHTML = '';
    document.getElementById('modalSolicitudPrestamo').style.display = 'block';
}

/**
 * Envia la solicitud: valida campos, sube archivos y crea documento en Firestore
 */
async function enviarSolicitudPrestamo() {
    const tipo = document.getElementById('tipoPrestamo').value;
    const nombre = document.getElementById('nombreSolicitante').value.trim();
    const rut = document.getElementById('rutSolicitante').value.trim();
    const email = document.getElementById('emailSolicitante').value.trim();
    const comentario = document.getElementById('comentarioPrestamo').value.trim();
    const archivosInput = document.getElementById('archivosPrestamo');
    const files = archivosInput.files;

    if (!tipo) { alert('Tipo de solicitud no definido.'); return; }
    if (!nombre || !rut || !email) { alert('Complete nombre, RUT y correo.'); return; }
    if (!files || files.length === 0) { alert('Adjunte al menos un archivo (formulario completado y/o documentos).'); return; }

    // Mostrar estado de subida
    const estadoEl = document.getElementById('estadoEnvio');
    estadoEl.innerHTML = '⏳ Subiendo archivos y guardando solicitud...';

    // Preparar datos
    const datos = {
        nombre,
        rut,
        email,
        comentario
    };

    try {
        // Convert FileList a Array
        const archivosArray = Array.from(files);

        const resultado = await guardarSolicitudPrestamo(tipo, datos, archivosArray);

        if (resultado.success) {
            estadoEl.innerHTML = `✅ Solicitud enviada correctamente. ID: ${resultado.id}`;
            // Limpiar formulario
            document.getElementById('formSolicitudPrestamo').reset();
            // Cerrar modal tras 2s y actualizar lista de solicitudes si implementada
            setTimeout(() => {
                cerrarModalSolicitud();
                // opcional: recargar las solicitudes del usuario
            }, 2000);
        } else {
            estadoEl.innerHTML = `❌ Error guardando solicitud: ${resultado.error}`;
            console.error(resultado.error);
        }
    } catch (error) {
        console.error('Error al enviar solicitud:', error);
        estadoEl.innerHTML = `❌ Error al enviar solicitud: ${error.message || error}`;
    }
}

/**
 * Convierte una imagen (ruta relativa a este dominio) en un PDF y lo descarga.
 * Usa html2canvas + jsPDF para evitar problemas con tamaños.
 */
async function imageToPDFAndDownload(imageUrl, outFileName = 'formulario.pdf') {
    // Crear elemento imagen oculto
    const img = document.createElement('img');
    img.style.maxWidth = '100%';
    img.style.display = 'block';
    img.style.position = 'fixed';
    img.style.left = '-9999px';
    img.src = imageUrl;

    document.body.appendChild(img);

    // Esperar a que cargue la imagen
    await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(new Error('No se pudo cargar la imagen: ' + imageUrl));
    });

    // Usar html2canvas para sacar un canvas de la imagen y generar PDF
    const canvas = await html2canvas(img, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

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

    // limpiar
    document.body.removeChild(img);
}
