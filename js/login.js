import { auth, db } from './firebase-config.js';
import { 
    GoogleAuthProvider, 
    signInWithPopup,
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { 
    collection, 
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Función para obtener todos los usuarios
async function getAllUsers() {
    try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        console.log("Documentos en la colección usuarios:");
        querySnapshot.forEach((doc) => {
            console.log(`ID del documento: ${doc.id}`);
            console.log("Datos del documento:", doc.data());
        });
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
    }
}

async function checkUserCredentials(email, password) {
    try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        let userExists = false;
        let userData = null;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.email === email) {
                userExists = true;
                userData = { ...data, id: doc.id };
            }
        });

        return { exists: userExists, data: userData };
    } catch (error) {
        console.error("Error checking credentials:", error);
        return { exists: false, data: null };
    }
}

// Función para verificar el rol del usuario
async function checkUserRole(uid) {
    try {
        const userRef = doc(db, "usuarios", uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return userData.role === 'admin';
        }
        return false;
    } catch (error) {
        console.error("Error checking user role:", error);
        return false;
    }
}


document.addEventListener('DOMContentLoaded', function() {
    getAllUsers();
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const emailInput = document.getElementById('email');
    const rememberCheckbox = document.getElementById('remember');
    const googleLogin = document.getElementById('googleLogin'); // Asegúrate de tener este elemento


 

// Función para verificar el rol del usuario
async function checkUserRole(uid) {
    try {
        const userRef = doc(db, "usuarios", uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return userData.role === 'admin'; // Retorna true si el usuario es admin
        }
        return false;
    } catch (error) {
        console.error("Error checking user role:", error);
        return false;
    }
}


 // Login con Google
 googleLogin.addEventListener('click', async () => {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        
        const isAdmin = await checkUserRole(result.user.uid);
        
        if (isAdmin) {
            showNotification('success', '¡Bienvenido administrador!');
            setTimeout(() => {
                window.location.href = '../Panel-admin/productos.html';
            }, 1500);
        } else {
            showNotification('success', '¡Inicio de sesión exitoso!');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Error al iniciar sesión con Google');
    }
});

    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });

    // Load remembered user data
    if (localStorage.getItem('rememberedUser')) {
        const userData = JSON.parse(localStorage.getItem('rememberedUser'));
        emailInput.value = userData.email;
        passwordInput.value = userData.password;
        rememberCheckbox.checked = true;
    }

    // Formulario de inicio de sesión
// Modificar el manejador del formulario de login
// Modify the login form handler
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        // Primero, verifica si el usuario existe en Firestore
        const { exists, data } = await checkUserCredentials(email, password);
        
        if (exists) {
            // Si existe en Firestore, realiza el inicio de sesión con Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            if (data.role === 'admin') {
                showNotification('success', '¡Bienvenido administrador!');
                setTimeout(() => {
                    window.location.href = '../Panel-admin/productos.html';
                }, 1500);
            } else {
                showNotification('success', '¡Inicio de sesión exitoso!');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }
        } else {
            // Si no existe en Firestore, verifica en Firebase Authentication
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);

                // Si se autentica correctamente, redirige a la página principal
                showNotification('success', '¡Inicio de sesión exitoso!');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } catch (authError) {
                // Si no se encuentra en Firebase Authentication
                showNotification('error', 'Usuario no encontrado o credenciales incorrectas');
                return;
            }
        }

        // Maneja la funcionalidad de "recordarme"
        if (rememberCheckbox.checked) {
            localStorage.setItem('rememberedUser', JSON.stringify({
                email: email,
                password: password
            }));
        } else {
            localStorage.removeItem('rememberedUser');
        }

    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Credenciales incorrectas');
    }
});



    function showNotification(type, message) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 25px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '0.9rem',
            zIndex: '1000',
            animation: 'slideIn 0.5s ease-out'
        });

        if (type === 'success') {
            notification.style.backgroundColor = '#10B981';
        } else {
            notification.style.backgroundColor = '#EF4444';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.5s ease-out';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    // Add some CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Real-time validation
    emailInput.addEventListener('input', function() {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(this.value)) {
            this.style.borderColor = '#EF4444';
        } else {
            this.style.borderColor = '#10B981';
        }
    });

    passwordInput.addEventListener('input', function() {
        if (this.value.length < 6) {
            this.style.borderColor = '#EF4444';
        } else {
            this.style.borderColor = '#10B981';
        }
    });
});