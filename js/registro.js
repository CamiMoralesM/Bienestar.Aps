import { registrarFuncionario, validarRUT, formatearRUT } from './auth.js';

document.addEventListener('DOMContentLoaded', function() {
    const registroForm = document.getElementById('registroForm');
    const rutInput = document.getElementById('rut-registro');
    
    // Formateo automático del RUT
    if (rutInput) {
        rutInput.addEventListener('input', function(e) {
            e.target.value = formatearRUT(e.target.value);
        });
    }
    
    // Manejo del formulario de registro
    if (registroForm) {
        registroForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Limpiar errores previos
            document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
            
            // Obtener valores
            const datos = {
                nombre: document.getElementById('nombre').value.trim(),
                rut: document.getElementById('rut-registro').value.trim(),
                email: document.getElementById('email').value.trim(),
                telefono: document.getElementById('telefono').value.trim(),
                centroSalud: document.getElementById('centroSalud').value,
                cargo: document.getElementById('cargo').value.trim(),
                password: document.getElementById('password-registro').value,
                passwordConfirm: document.getElementById('password-confirm').value
            };
            
            let isValid = true;
            
            // Validaciones
            if (!validarRUT(datos.rut)) {
                document.getElementById('rut-registro-error').textContent = 'RUT inválido';
                isValid = false;
            }
            
            if (datos.password.length < 6) {
                document.getElementById('password-registro-error').textContent = 'La contraseña debe tener al menos 6 caracteres';
                isValid = false;
            }
            
            if (datos.password !== datos.passwordConfirm) {
                document.getElementById('password-confirm-error').textContent = 'Las contraseñas no coinciden';
                isValid = false;
            }
            
            if (!document.getElementById('terminos').checked) {
                alert('Debe aceptar los términos y condiciones');
                isValid = false;
            }
            
            if (isValid) {
                const btnRegistro = document.getElementById('btn-registro');
                btnRegistro.textContent = 'Registrando...';
                btnRegistro.disabled = true;
                
                // Intentar registro
                const resultado = await registrarFuncionario(datos);
                
                if (resultado.success) {
                    alert(resultado.message);
                    window.location.href = 'login.html';
                } else {
                    alert('Error en el registro: ' + resultado.error);
                    btnRegistro.textContent = 'Registrarse';
                    btnRegistro.disabled = false;
                }
            }
        });
    }
});
