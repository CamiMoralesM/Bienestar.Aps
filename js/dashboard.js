// Manejo de tabs en el dashboard
document.addEventListener('DOMContentLoaded', function() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remover clase active de todos los tabs
            navTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Agregar clase active al tab clickeado
            this.classList.add('active');

            // Mostrar contenido correspondiente
            const tabId = this.getAttribute('data-tab');
            const targetContent = document.getElementById(`tab-${tabId}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // Scroll suave al inicio del contenido
            window.scrollTo({
                top: document.querySelector('.dashboard-content').offsetTop - 100,
                behavior: 'smooth'
            });
        });
    });
});

// Función de logout
function logout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        // Limpiar datos de sesión
        localStorage.removeItem('userSession');
        sessionStorage.clear();
        
        // Redireccionar a la página principal
        window.location.href = '../index.html';
    }
}

// Función para nueva solicitud
function nuevaSolicitud() {
    alert('Formulario de nueva solicitud en desarrollo.');
    // Aquí se abriría un modal o se redirigiría a un formulario
}

// Animación de entrada para las estadísticas
function animateStats() {
    const statCards = document.querySelectorAll('.stat-card');
    
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Ejecutar animación al cargar
window.addEventListener('load', animateStats);

// Marcar notificaciones como leídas
document.querySelectorAll('.notification').forEach(notification => {
    notification.addEventListener('click', function() {
        this.classList.remove('new');
    });
});

// Validación de formularios de perfil
const profileForms = document.querySelectorAll('.profile-form');
profileForms.forEach(form => {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Simulación de guardado
        const button = this.querySelector('button[type="submit"]');
        const originalText = button.textContent;
        
        button.textContent = 'Guardando...';
        button.disabled = true;
        
        setTimeout(() => {
            button.textContent = '✓ Guardado';
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 2000);
        }, 1500);
    });
});
