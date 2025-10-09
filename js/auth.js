// Validación de RUT chileno
function validarRUT(rut) {
    // Limpiar el RUT
    rut = rut.replace(/\./g, '').replace(/-/g, '');
    
    if (rut.length < 8) return false;
    
    const cuerpo = rut.slice(0, -1);
    const dv = rut.slice(-1).toUpperCase();
    
    // Calcular dígito verificador
    let suma = 0;
    let multiplo = 2;
    
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo.charAt(i)) * multiplo;
        multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }
    
    const dvEsperado = 11 - (suma % 11);
    const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : String(dvEsperado);
    
    return dv === dvCalculado;
}

// Formatear RUT mientras se escribe
function formatearRUT(rut) {
    // Eliminar todo excepto números y K
    rut = rut.replace(/[^0-9kK]/g, '');
    
    if (rut.length <= 1) return rut;
    
    // Separar cuerpo y dígito verificador
    const cuerpo = rut.slice(0, -1);
    const dv = rut.slice(-1);
    
    // Formatear con puntos
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${cuerpoFormateado}-${dv}`;
}

// Detectar tipo de login desde URL
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const tipo = urlParams.get('tipo');
    
    const loginTitle = document.getElementById('login-title');
    const loginSubtitle = document.getElementById('login-subtitle');
    const btnSubmit = document.getElementById('btn-submit');
    
    if (tipo === 'admin') {
        loginTitle.textContent = 'Acceso Administrativo';
        loginSubtitle.textContent = 'Panel de administración del sistema';
        btnSubmit.style.background = 'linear-gradient(135deg, var(--azul-principal) 0%, var(--morado) 100%)';
    }
    
    // Formateo automático del RUT
    const rutInput = document.getElementById('rut');
    rutInput.addEventListener('input', function(e) {
        const cursorPosition = e.target.selectionStart;
        const valorAnterior = e.target.value;
        
        e.target.value = formatearRUT(e.target.value);
        
        // Mantener posición del cursor
        if (e.target.value.length > valorAnterior.length) {
            e.target.setSelectionRange(cursorPosition + 1, cursorPosition + 1);
        } else {
            e.target.setSelectionRange(cursorPosition, cursorPosition);
        }
    });
    
    // Manejo del formulario de login
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const rut = rutInput.value;
        const password = document.getElementById('password').value;
        const rutError = document.getElementById('rut-error');
        const passwordError = document.getElementById('password-error');
        
        // Limpiar errores previos
        rutError.textContent = '';
        passwordError.textContent = '';
        
        let isValid = true;
        
        // Validar RUT
        if (!validarRUT(rut)) {
            rutError.textContent = 'RUT inválido';
            isValid = false;
        }
        
        // Validar contraseña
        if (password.length < 6) {
            passwordError.textContent = 'La contraseña debe tener al menos 6 caracteres';
            isValid = false;
        }
        
        if (isValid) {
            // Aquí iría la lógica de autenticación real
            btnSubmit.textContent = 'Ingresando...';
            btnSubmit.disabled = true;
            
            // Simulación de login
            setTimeout(() => {
                alert('Login exitoso! (Función en desarrollo)');
                btnSubmit.textContent = 'Iniciar Sesión';
                btnSubmit.disabled = false;
            }, 1500);
        }
    });
    
    // Link de registro
    const registerLink = document.getElementById('register-link');
    registerLink.addEventListener('click', function(e) {
        e.preventDefault();
        alert('Función de registro en desarrollo. Contacta con el administrador para crear una cuenta.');
    });
});
