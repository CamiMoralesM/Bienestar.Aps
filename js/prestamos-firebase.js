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
            // precarga básica será hecha al abrir el modal o al rellenar el formulario
        }
    });
});

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

    // Si hay usuario autenticado, intentar rellenar nombre/email/rut desde sessionStorage o Firebase
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    if (userData && Object.keys(userData).length) {
        const nombreEl = document.getElementById('nombreSolicitante') || document.getElementById('nombrePrestamo');
        const rutEl = document.getElementById('rutSolicitante') || document.getElementById('rutPrestamo');
        const emailEl = document.getElementById('emailSolicitante') || document.getElementById('emailPrestamo');
        if (nombreEl) nombreEl.value = userData.nombre || '';
        if (rutEl) rutEl.value = userData.rut || '';
        if (emailEl) emailEl.value = userData.email || '';
    }

    const estadoEl = document.getElementById('estadoEnvio');
    if (estadoEl) estadoEl.innerHTML = '';
    const modal = document.getElementById('modalSolicitudPrestamo');
    if (modal) modal.style.display = 'block';
}

/**
 * Envia la solicitud: valida campos, sube archivos y crea documento en Firestore
 * Adaptado para funcionar tanto con el modal original como con el formulario en dashboard-prestamos.html
 */
async function enviarSolicitudPrestamo() {
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

    // Mapear tipos del dashboard a los que espera la función de Firebase (si aplica)
    // Ajusta el mapeo según lo que uses en prestamos-firebase.js
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
            for (const f of Array.from(inp.files)) archivosArray.push(f);
        }
    }

    // Validaciones básicas
    if (!tipo) {
        alert('Tipo de solicitud no definido.');
        return;
    }
    if (!nombre || !rut || !email) {
        alert('Complete nombre, RUT y correo.');
        return;
    }
    if (!archivosArray || archivosArray.length === 0) {
        alert('Adjunte al menos un archivo (formulario completado y/o documentos).');
        return;
    }

    // Mostrar estado de subida si existe, sino console.log
    if (estadoEl) {
        estadoEl.innerHTML = '⏳ Subiendo archivos y guardando solicitud...';
    } else {
        console.log('Subiendo archivos y guardando solicitud...');
    }

    // Preparar datos
    const datos = {
        nombre,
        rut,
        email,
        comentario
    };

    try {
        const resultado = await guardarSolicitudPrestamo(tipo, datos, archivosArray);

        if (resultado.success) {
            if (estadoEl) {
                estadoEl.innerHTML = `✅ Solicitud enviada correctamente. ID: ${resultado.id}`;
            } else {
                alert(`Solicitud enviada correctamente. ID: ${resultado.id}`);
                console.log('Solicitud enviada:', resultado.id);
            }
            // Limpiar formulario (si existe)
            const form = document.getElementById('formSolicitudPrestamo');
            if (form) form.reset();

            // Cerrar modal tras 2s si existe
            setTimeout(() => {
                const modal = document.getElementById('modalSolicitudPrestamo');
                if (modal) modal.style.display = 'none';
            }, 2000);
        } else {
            if (estadoEl) {
                estadoEl.innerHTML = `❌ Error guardando solicitud: ${resultado.error}`;
            } else {
                alert('Error guardando solicitud: ' + resultado.error);
                console.error(resultado.error);
            }
        }
    } catch (error) {
        console.error('Error al enviar solicitud:', error);
        if (estadoEl) {
            estadoEl.innerHTML = `❌ Error al enviar solicitud: ${error.message || error}`;
        } else {
            alert('Error al enviar solicitud: ' + (error.message || error));
        }
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
