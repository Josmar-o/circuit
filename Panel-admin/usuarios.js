// Add this import at the top
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-functions.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    updateDoc,
    setDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { 
    getAuth, 
    signOut,
    createUserWithEmailAndPassword,
    updateProfile,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updateEmail 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD134oGJdsO2zpXSkXSg7Z_VABaQmfiIQQ",
    authDomain: "proyecto-d-iv.firebaseapp.com",
    projectId: "proyecto-d-iv",
    storageBucket: "proyecto-d-iv.firebasestorage.app",
    messagingSenderId: "247422509873",
    appId: "1:247422509873:web:2a11bf59b83aae52494610",
    measurementId: "G-ZNVXN04Z0S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Firebase Functions
const functions = getFunctions(app);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM Elements
const userForm = document.getElementById("user-form");
const usersList = document.getElementById("users-list");
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('edit-user-form');
const closeModal = document.querySelector('.close-modal');
let currentUserId = null;

// Event Listeners
document.getElementById('adminLogout').addEventListener('click', handleLogout);
userForm.addEventListener("submit", handleNewUserSubmit);
editForm.addEventListener('submit', handleEditFormSubmit);
closeModal.onclick = () => editModal.style.display = 'none';
window.onclick = (event) => {
    if (event.target == editModal) {
        editModal.style.display = 'none';
    }
};

// User Management Functions
async function handleNewUserSubmit(event) {
    event.preventDefault();
    const newUser = {
        name: document.getElementById("user-name").value,
        email: document.getElementById("user-email").value,
        role: document.getElementById("user-role").value,
        password: document.getElementById("user-password").value
    };
    await addUserToSystem(newUser);
    userForm.reset();
}

async function addUserToSystem(user) {
    try {
        // Create user in Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, user.email, user.password);
        const uid = userCredential.user.uid;
        
        await updateProfile(userCredential.user, {
            displayName: user.name
        });

        // Create user object for Firestore
        const userForFirestore = {
            name: user.name,
            email: user.email,
            role: user.role,
            uid: uid,
            createdAt: serverTimestamp()
        };

        // Add to Firestore collections
        await setDoc(doc(db, "usuarios", uid), userForFirestore);
        await setDoc(doc(db, "usuarios_registrados", uid), {
            ...userForFirestore,
            timestamp: serverTimestamp()
        });

        showToast('Usuario agregado exitosamente', 'success');
        fetchUsers();
    } catch (error) {
        console.error("Error al agregar el usuario: ", error);
        showToast('Error: ' + error.message, 'error');
    }
}

async function fetchUsers() {
    try {
        const usersCollection = collection(db, "usuarios");
        const querySnapshot = await getDocs(usersCollection);
        usersList.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const user = doc.data();
            const row = generateUserRow(user, doc.id);
            usersList.appendChild(row);
        });
    } catch (error) {
        console.error("Error al cargar los usuarios: ", error);
        showToast('Error al cargar los usuarios', 'error');
    }
}

function generateUserRow(user, userId) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.role}</td>
        <td>
            <div class="user-actions">
                <button class="btn-edit" data-id="${userId}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" data-id="${userId}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;

    row.querySelector('.btn-edit').addEventListener('click', () => showEditModal(userId, user));
    row.querySelector('.btn-delete').addEventListener('click', () => handleDeleteUser(userId));

    return row;
}

// Update the handleDeleteUser function
async function handleDeleteUser(userId) {
    const result = await showConfirmDialog({
      title: 'Confirmar Eliminación',
      message: '¿Cómo desea eliminar este usuario?',
      buttons: [
        {
          text: 'Cancelar',
          value: 'cancel',
          class: 'btn-cancel'
        },
        {
          text: 'Solo Firestore',
          value: 'firestore',
          class: 'btn-warning'
        },
        {
          text: 'Firestore y Authentication',
          value: 'both',
          class: 'btn-danger'
        }
      ]
    });
  
    try {
      if (result === 'firestore') {
        // Eliminar solo de Firestore
        await deleteDoc(doc(db, "usuarios", userId));
        await deleteDoc(doc(db, "usuarios_registrados", userId));
        showToast('Usuario eliminado de Firestore exitosamente', 'success');
      } else if (result === 'both') {
        // Eliminar de Firestore y Authentication usando la ruta del backend
        const response = await fetch(`/delete-user/${userId}`, {
          method: 'DELETE'
        });
  
        if (response.ok) {
          showToast('Usuario eliminado completamente', 'success');
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error desconocido');
        }
      }
  
      fetchUsers();
    } catch (error) {
      console.error("Error al eliminar el usuario:", error);
      showToast('Error al eliminar el usuario: ' + error.message, 'error');
    }
  }

// Add this helper function for better-looking notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    const container = document.querySelector('.toast-container') || createToastContainer();
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getToastIcon(type) {
    switch(type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function showConfirmDialog({ title, message, buttons }) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="custom-modal">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="modal-buttons">
                    ${buttons.map(btn => `
                        <button class="${btn.class}">${btn.text}</button>
                    `).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const buttonElements = modal.querySelectorAll('button');
        buttons.forEach((btn, index) => {
            buttonElements[index].addEventListener('click', () => {
                modal.remove();
                resolve(btn.value);
            });
        });
    });
}

async function handleEditFormSubmit(e) {
    e.preventDefault();
    
    const newPassword = document.getElementById('edit-user-password').value;
    const updatedUser = {
        name: document.getElementById('edit-user-name').value,
        email: document.getElementById('edit-user-email').value,
        role: document.getElementById('edit-user-role').value
    };

    try {
        // Actualizar datos en Firestore
        await updateUserData(currentUserId, updatedUser);

        // Si hay una nueva contraseña, actualizarla en Authentication
        if (newPassword) {
            const user = auth.currentUser;
            if (user) {
                try {
                    await updatePassword(user, newPassword);
                    showToast('Contraseña actualizada exitosamente', 'success');
                } catch (error) {
                    // Si necesita reautenticación
                    if (error.code === 'auth/requires-recent-login') {
                        // Aquí podrías mostrar un modal para pedir la contraseña actual
                        const currentPassword = prompt("Por favor, ingrese su contraseña actual para confirmar los cambios:");
                        if (currentPassword) {
                            const credential = EmailAuthProvider.credential(
                                user.email,
                                currentPassword
                            );
                            await reauthenticateWithCredential(user, credential);
                            await updatePassword(user, newPassword);
                            showToast('Contraseña actualizada exitosamente', 'success');
                        }
                    } else {
                        throw error;
                    }
                }
            }
        }

        editModal.style.display = 'none';
    } catch (error) {
        console.error("Error en la actualización:", error);
        showToast('Error: ' + error.message, 'error');
    }
}

// Agregar event listeners adicionales
document.querySelector('.btn-cancel').addEventListener('click', () => {
    editModal.style.display = 'none';
});

// Mejorar el cierre del modal
window.onclick = (event) => {
    if (event.target === editModal) {
        editModal.style.display = 'none';
    }
};

async function updateUserData(userId, userData) {
    try {
        // Primero verificamos si el documento existe en usuarios
        const userDoc = doc(db, "usuarios", userId);
        
        // Actualizamos en la colección usuarios
        await updateDoc(userDoc, userData);

        // Intentamos actualizar en usuarios_registrados
        try {
            await updateDoc(doc(db, "usuarios_registrados", userId), {
                ...userData,
                lastUpdated: serverTimestamp()
            });
        } catch (error) {
            // Si el documento no existe en usuarios_registrados, lo creamos
            if (error.code === 'not-found') {
                await setDoc(doc(db, "usuarios_registrados", userId), {
                    ...userData,
                    timestamp: serverTimestamp(),
                    lastUpdated: serverTimestamp()
                });
            } else {
                throw error; // Re-lanzamos otros tipos de errores
            }
        }

        showToast('Usuario actualizado exitosamente', 'success');
        fetchUsers();
    } catch (error) {
        console.error("Error al actualizar el usuario:", error);
        showToast('Error al actualizar el usuario: ' + error.message, 'error');
    }
}

async function handleLogout(e) {
    e.preventDefault();
    try {
        await signOut(auth);
        window.location.href = '../html/login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showEditModal(userId, user) {
    currentUserId = userId;
    
    // Llenar el formulario con los datos actuales
    document.getElementById('edit-user-name').value = user.name;
    document.getElementById('edit-user-email').value = user.email;
    document.getElementById('edit-user-role').value = user.role;
    document.getElementById('edit-user-password').value = '';
    
    editModal.style.display = 'block';
}



// Initialize
fetchUsers();