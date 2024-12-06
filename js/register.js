import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    GoogleAuthProvider, 
    FacebookAuthProvider,
    OAuthProvider,
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// Initialize Firebase with your config
const firebaseConfig = {
    apiKey: "AIzaSyD134oGJdsO2zpXSkXSg7Z_VABaQmfiIQQ",
    authDomain: "proyecto-d-iv.firebaseapp.com",
    projectId: "proyecto-d-iv",
    storageBucket: "proyecto-d-iv.firebasestorage.app",
    messagingSenderId: "247422509873",
    appId: "1:247422509873:web:2a11bf59b83aae52494610",
    measurementId: "G-ZNVXN04Z0S"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const appleProvider = new OAuthProvider('apple.com');


document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const emailInput = document.getElementById('email');
    const fullNameInput = document.getElementById('fullName');

    // Toggle password visibility
    [togglePassword, toggleConfirmPassword].forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.id === 'togglePassword' ? passwordInput : confirmPasswordInput;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });

    // Form submission
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = emailInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const fullName = fullNameInput.value;

        if (password !== confirmPassword) {
            showNotification('error', 'Las contraseñas no coinciden');
            return;
        }

        if (!validatePassword(password)) {
            showNotification('error', 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            showNotification('success', '¡Registro exitoso!');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } catch (error) {
            showNotification('error', getErrorMessage(error.code));
        }
    });

    // Google Sign In
    document.querySelector('.google').addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            showNotification('success', '¡Registro con Google exitoso!');
            setTimeout(() => {
                window.location.href = './index.html';
            }, 1500);
        } catch (error) {
            showNotification('error', getErrorMessage(error.code));
        }
    });

    // Facebook Sign In
    document.querySelector('.facebook').addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, facebookProvider);
            showNotification('success', '¡Registro con Facebook exitoso!');
            setTimeout(() => {
                window.location.href = './index.html';
            }, 1500);
        } catch (error) {
            showNotification('error', getErrorMessage(error.code));
        }
    });

    // Apple Sign In
    document.querySelector('.apple').addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, appleProvider);
            showNotification('success', '¡Registro con Apple exitoso!');
            setTimeout(() => {
                window.location.href = './index.html';
            }, 1500);
        } catch (error) {
            showNotification('error', getErrorMessage(error.code));
        }
    });

    // Update error messages function
    function getErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/email-already-in-use':
                return 'Este correo electrónico ya está registrado';
            case 'auth/invalid-email':
                return 'Correo electrónico inválido';
            case 'auth/operation-not-allowed':
                return 'Operación no permitida';
            case 'auth/weak-password':
                return 'La contraseña es muy débil';
            case 'auth/account-exists-with-different-credential':
                return 'Ya existe una cuenta con este email usando otro método de inicio de sesión';
            case 'auth/popup-blocked':
                return 'El navegador bloqueó la ventana emergente';
            case 'auth/popup-closed-by-user':
                return 'Ventana de autenticación cerrada por el usuario';
            case 'auth/cancelled-popup-request':
                return 'La operación fue cancelada';
            default:
                return 'Ocurrió un error durante el registro';
        }
    }

    function validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;
    }

    function getErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/email-already-in-use':
                return 'Este correo electrónico ya está registrado';
            case 'auth/invalid-email':
                return 'Correo electrónico inválido';
            case 'auth/operation-not-allowed':
                return 'Operación no permitida';
            case 'auth/weak-password':
                return 'La contraseña es muy débil';
            default:
                return 'Ocurrió un error durante el registro';
        }
    }

    function showNotification(type, message) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 25px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '0.9rem',
            zIndex: '1000',
            animation: 'slideIn 0.5s ease-out',
            backgroundColor: type === 'success' ? '#10B981' : '#EF4444'
        });

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.5s ease-out';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
});