import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Validación de RUT chileno
function validarRUT(rut) {
    rut = rut.replace(/\./g, '').replace(/-/g, '');
    if (rut.length < 8) return false;
    
    const cuerpo = rut.slice(0, -1);
    const dv = rut.slice(-1).toUpperCase();
    
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

// Formatear RUT
function formatearRUT(rut) {
    rut = rut.replace(/[^0-9kK]/g, '');
    if (rut.length <= 1) return rut;
    
    const cuerpo = rut.slice(0, -1);
    const dv = rut.slice(-1);
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${cuerpoFormateado}-${dv}`;
}

// Limpiar RUT
function limpiarRUT(rut) {
    return rut.replace(/\./g, '').replace(/-/g, '');
}

// Buscar usuario por RUT - CORREGIDO
async function buscarUsuarioPorRUT(rut) {
    try {
        const rutLimpio = limpiarRUT(rut);
        console.log('Buscando usuario con RUT:', rutLimpio);
        
        // Buscar en funcionarios
        const funcionariosRef = collection(db, 'funcionarios');
        const qFuncionarios = query(funcionariosRef, where('rut', '==', rutLimpio));
        
        try {
            const funcionariosSnapshot = await getDocs(qFuncionarios);
            
            if (!funcionariosSnapshot.empty) {
                const doc = funcionariosSnapshot.docs[0];
                console.log('Usuario encontrado en funcionarios:', doc.data());
                return {
                    tipo: 'funcionario',
                    uid: doc.id,
                    data: doc.data()
                };
            }
        } catch (error) {
            console.error('Error al buscar en funcionarios:', error);
        }
        
        // Buscar en administradores
        const adminsRef = collection(db, 'administradores');
        const qAdmins = query(adminsRef, where('rut', '==', rutLimpio));
        
        try {
            const adminsSnapshot = await getDocs(qAdmins);
            
            if (!adminsSnapshot.empty) {
                const doc = adminsSnapshot.docs[0];
                console.log('Usuario encontrado en administradores:', doc.data());
                return {
                    tipo: 'administrador',
                    uid: doc.id,
                    data: doc.data()
                };
            }
        } catch (error) {
            console.error('Error al buscar en administradores:', error);
        }
        
        console.log('Usuario no encontrado en ninguna colección');
        return null;
        
    } catch (error) {
        console.error('Error general en buscarUsuarioPorRUT:', error);
        return null;
    }
}

// Login con RUT y contraseña - MEJORADO
async function loginConRUT(rut, password) {
    try {
        console.log('Iniciando login con RUT:', rut);
        const rutLimpio = limpiarRUT(rut);
        
        // Buscar usuario por RUT
        const usuario = await buscarUsuarioPorRUT(rutLimpio);
        
        if (!usuario) {
            throw new Error('Usuario no encontrado. Verifique su RUT.');
        }
        
        console.log('Usuario encontrado:', usuario.tipo);
        
        // Verificar estado activo
        if (usuario.data.estado !== 'activo') {
            throw new Error('Usuario inactivo. Contacte al administrador.');
        }
        
        // Verificar que tiene email
        if (!usuario.data.email) {
            throw new Error('Usuario sin email configurado. Contacte al administrador.');
        }
        
        console.log('Intentando login con email:', usuario.data.email);
        
        // Login con email y password
        const userCredential = await signInWithEmailAndPassword(
            auth, 
            usuario.data.email, 
            password
        );
        
        console.log('Login exitoso en Firebase Auth');
        
        // Guardar información en sessionStorage
        sessionStorage.setItem('userType', usuario.tipo);
        sessionStorage.setItem('userData', JSON.stringify(usuario.data));
        
        return {
            success: true,
            tipo: usuario.tipo,
            user: userCredential.user,
            data: usuario.data
        };
        
    } catch (error) {
        console.error('Error en login:', error);
        
        // Mensajes de error más específicos
        let errorMessage = error.message;
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Usuario no encontrado en el sistema de autenticación.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Contraseña incorrecta.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Email inválido en el sistema.';
        } else if (error.code === 'auth/user-disabled') {
            errorMessage = 'Usuario deshabilitado.';
        }
        
        return {
            success: false,
            error: errorMessage
        };
    }
}

// Registrar nuevo funcionario
async function registrarFuncionario(datos) {
    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            datos.email,
            datos.password
        );
        
        const user = userCredential.user;
        
        await setDoc(doc(db, 'funcionarios', user.uid), {
            uid: user.uid,
            rut: limpiarRUT(datos.rut),
            nombre: datos.nombre,
            email: datos.email,
            telefono: datos.telefono || '',
            fechaAfiliacion: new Date(),
            centroSalud: datos.centroSalud,
            cargo: datos.cargo,
            estado: 'pendiente',
            cargasFamiliares: [],
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        return {
            success: true,
            message: 'Registro exitoso. Su cuenta está pendiente de aprobación.',
            uid: user.uid
        };
        
    } catch (error) {
        console.error('Error en registro:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Registrar administrador
async function registrarAdministrador(datos) {
    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            datos.email,
            datos.password
        );
        const user = userCredential.user;

        await setDoc(doc(db, 'administradores', user.uid), {
            uid: user.uid,
            rut: limpiarRUT(datos.rut),
            nombre: datos.nombre,
            email: datos.email,
            estado: 'activo',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        return {
            success: true,
            message: 'Registro exitoso. Puede ingresar como administrador.',
            uid: user.uid
        };

    } catch (error) {
        console.error('Error en registro administrador:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Cerrar sesión
async function cerrarSesion() {
    try {
        await signOut(auth);
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}

// Verificar autenticación
function verificarAutenticacion(tipoRequerido) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userType = sessionStorage.getItem('userType');
            
            if (tipoRequerido && userType !== tipoRequerido) {
                window.location.href = '../pages/login.html';
            }
        } else {
            window.location.href = '../pages/login.html';
        }
    });
}

// Obtener datos del usuario actual
async function obtenerDatosUsuario() {
    const user = auth.currentUser;
    const userType = sessionStorage.getItem('userType');
    
    if (!user || !userType) return null;
    
    const docRef = doc(db, userType === 'administrador' ? 'administradores' : 'funcionarios', user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        return docSnap.data();
    }
    
    return null;
}

// Event listeners para el formulario de login - MEJORADO
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const tipo = urlParams.get('tipo');
    
    const loginTitle = document.getElementById('login-title');
    const loginSubtitle = document.getElementById('login-subtitle');
    const btnSubmit = document.getElementById('btn-submit');
    
    if (tipo === 'admin') {
        if (loginTitle) loginTitle.textContent = 'Acceso Administrativo';
        if (loginSubtitle) loginSubtitle.textContent = 'Panel de administración del sistema';
        if (btnSubmit) {
            btnSubmit.style.background = 'linear-gradient(135deg, var(--azul-principal) 0%, var(--morado) 100%)';
        }
    }
    
    // Formateo automático del RUT
    const rutInput = document.getElementById('rut');
    if (rutInput) {
        rutInput.addEventListener('input', function(e) {
            const cursorPosition = e.target.selectionStart;
            const valorAnterior = e.target.value;
            
            e.target.value = formatearRUT(e.target.value);
            
            if (e.target.value.length > valorAnterior.length) {
                e.target.setSelectionRange(cursorPosition + 1, cursorPosition + 1);
            } else {
                e.target.setSelectionRange(cursorPosition, cursorPosition);
            }
        });
    }
    
    // Manejo del formulario de login - MEJORADO
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const rut = rutInput?.value || '';
            const password = document.getElementById('password')?.value || '';
            const rutError = document.getElementById('rut-error');
            const passwordError = document.getElementById('password-error');
            
            // Limpiar errores previos
            if (rutError) rutError.textContent = '';
            if (passwordError) passwordError.textContent = '';
            
            let isValid = true;
            
            // Validar RUT
            if (!validarRUT(rut)) {
                if (rutError) rutError.textContent = 'RUT inválido';
                isValid = false;
            }
            
            // Validar contraseña
            if (password.length < 6) {
                if (passwordError) passwordError.textContent = 'La contraseña debe tener al menos 6 caracteres';
                isValid = false;
            }
            
            if (isValid && btnSubmit) {
                btnSubmit.textContent = 'Ingresando...';
                btnSubmit.disabled = true;
                
                try {
                    // Intentar login
                    const resultado = await loginConRUT(rut, password);
                    
                    if (resultado.success) {
                        console.log('Login exitoso, redirigiendo...');
                        // Redireccionar según tipo de usuario
                        if (resultado.tipo === 'administrador') {
                            window.location.href = 'dashboard-admin.html';
                        } else {
                            window.location.href = 'dashboard-afiliado.html';
                        }
                    } else {
                        // Mostrar error
                        if (passwordError) passwordError.textContent = resultado.error;
                    }
                } catch (error) {
                    console.error('Error inesperado:', error);
                    if (passwordError) passwordError.textContent = 'Error inesperado. Intente nuevamente.';
                } finally {
                    if (btnSubmit) {
                        btnSubmit.textContent = 'Iniciar Sesión';
                        btnSubmit.disabled = false;
                    }
                }
            }
        });
    }
    
    // Link de registro
    const registerLink = document.getElementById('register-link');
    if (registerLink) {
        registerLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'registro.html';
        });
    }
});

// Exportar funciones
export { 
    validarRUT, 
    formatearRUT, 
    limpiarRUT,
    loginConRUT, 
    registrarFuncionario,
    cerrarSesion,
    verificarAutenticacion,
    obtenerDatosUsuario,
    buscarUsuarioPorRUT,
    registrarAdministrador
};
