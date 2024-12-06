import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {     
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs,
    query,
    where } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD134oGJdsO2zpXSkXSg7Z_VABaQmfiIQQ",
    authDomain: "proyecto-d-iv.firebaseapp.com",
    projectId: "proyecto-d-iv",
    storageBucket: "proyecto-d-iv.firebasestorage.app",
    messagingSenderId: "247422509873",
    appId: "1:247422509873:web:2a11bf59b83aae52494610",
    measurementId: "G-ZNVXN04Z0S"
  };
  
  // Inicializar Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

// Verificar el estado de autenticación al cargar la página
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Si no hay usuario autenticado, redirigir al login
        window.location.href = '../html/login.html';
    }
});

// Carrito de compras
let cart = [];
let currentUser = null;

// Función para cargar productos desde Firebase
async function loadProducts() {
    const productsContainer = document.getElementById('productsContainer');
    productsContainer.innerHTML = '';
    
    try {
        const productsCollection = collection(db, "productos");
        const querySnapshot = await getDocs(productsCollection);
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            
            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <span class="product-price">$${product.price.toFixed(2)}</span>
                    <button class="add-to-cart" onclick="addToCart('${doc.id}')">
                        Añadir al carrito
                    </button>
                </div>
            `;
            
            productsContainer.appendChild(productCard);
        });
    } catch (error) {
        console.error("Error al cargar los productos: ", error);
        productsContainer.innerHTML = '<p>Error al cargar los productos</p>';
    }
}

// Guardar carrito en Firebase
async function saveCartToFirebase() {
    if (!currentUser) return;
    
    try {
        await setDoc(doc(db, "carritos", currentUser.uid), {
            items: cart,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error al guardar el carrito: ", error);
    }
}

// Cargar carrito desde Firebase
async function loadCartFromFirebase() {
    if (!currentUser) return;
    
    try {
        const cartDoc = await getDoc(doc(db, "carritos", currentUser.uid));
        if (cartDoc.exists()) {
            cart = cartDoc.data().items;
            updateCartDisplay();
        }
    } catch (error) {
        console.error("Error al cargar el carrito: ", error);
    }
}

// Añadir al carrito
async function addToCart(productId) {
    try {
        const productDoc = await getDoc(doc(db, "productos", productId));
        
        if (productDoc.exists()) {
            const product = productDoc.data();
            const existingItem = cart.find(item => item.id === productId);
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    id: productId,
                    ...product,
                    quantity: 1
                });
            }
            
            await saveCartToFirebase();
            updateCartDisplay();
            showNotification('Producto añadido al carrito');
            
        }
    } catch (error) {
        console.error("Error al añadir al carrito: ", error);
        showNotification('Error al añadir el producto');
    }
}

// Actualizar cantidad de un item
async function updateItemQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(item => item.id !== productId);
        }
        await saveCartToFirebase();
        updateCartDisplay();
    }
}

// Eliminar item del carrito
async function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    await saveCartToFirebase();
    updateCartDisplay();
}

let total = 0;

// Actualizar visualización del carrito
function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const cartCount = document.querySelector('.cart-count');
    
    // Actualizar contador
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Actualizar items del carrito
    cartItems.innerHTML = '';
    total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        cartItems.innerHTML += `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="updateItemQuantity('${item.id}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateItemQuantity('${item.id}', 1)">+</button>
                        <span class="remove-item" onclick="removeFromCart('${item.id}')">
                            <i class="fas fa-trash"></i>
                        </span>
                    </div>
                </div>
            </div>
        `;
    });
    
    cartTotal.textContent = `$${total.toFixed(2)}`;
}

// Modal del carrito
const cartModal = document.getElementById('cartModal');
const closeCart = document.querySelector('.close-cart');

document.querySelector('.cart-icon').addEventListener('click', () => {
    cartModal.style.display = 'block';
    document.getElementById('modalPaymentAmount').textContent = total.toFixed(2);
    document.getElementById('payment-amount').textContent = total.toFixed(2);
});

closeCart.addEventListener('click', () => {
    cartModal.style.display = 'none';
});

// Cerrar modal al hacer clic fuera
window.addEventListener('click', (e) => {
    if (e.target === cartModal) {
        cartModal.style.display = 'none';
    }
});

// Hacer funciones disponibles globalmente
window.addToCart = addToCart;
window.updateItemQuantity = updateItemQuantity;
window.removeFromCart = removeFromCart;

// Actualizar contador del carrito
function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = totalItems;
}

// Observador de autenticación
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        loadCartFromFirebase();
    } else {
        cart = [];
        updateCartDisplay();
    }
});

// Agregar el observador del estado de autenticación
onAuthStateChanged(auth, (user) => {
    const signInButton = document.getElementById('signInButton');
    const signOutButton = document.getElementById('signOutButton');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userImage = document.getElementById('userImage');
    const dropdownUserImage = document.getElementById('dropdownUserImage');

    if (user) {
        // Usuario está autenticado
        signInButton.classList.add('hidden');
        signOutButton.classList.remove('hidden');
        userName.textContent = user.displayName || 'Usuario';
        userEmail.textContent = user.email;
        userImage.src = user.photoURL || 'https://via.placeholder.com/32';
        dropdownUserImage.src = user.photoURL || 'https://via.placeholder.com/50';
    } else {
        // Usuario no está autenticado
        signInButton.classList.remove('hidden');
        signOutButton.classList.add('hidden');
        userName.textContent = 'No has iniciado sesión';
        userEmail.textContent = '';
        userImage.src = 'https://via.placeholder.com/32';
        dropdownUserImage.src = 'https://via.placeholder.com/50';
    }
});

// Agregar el manejador para cerrar sesión
document.getElementById('signOutButton').addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = '/html/login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
});

// Mostrar notificación
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Añadir estilos para la notificación
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = '#3498db';
    notification.style.color = 'white';
    notification.style.padding = '1rem 2rem';
    notification.style.borderRadius = '5px';
    notification.style.animation = 'slideIn 0.5s ease-out';
    
    // Eliminar la notificación después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// Animaciones para la notificación
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Smooth scroll para los enlaces de navegación
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        target.scrollIntoView({
            behavior: 'smooth'
        });
    });
});

/* Navbar scroll effect
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
    } else {
        navbar.style.backgroundColor = '#fff';
        navbar.style.boxShadow = 'none';
    }
});
*/

// Formulario de contacto
document.querySelector('.contact-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    // Aquí puedes agregar la lógica para enviar el formulario
    showNotification('Mensaje enviado correctamente');
    this.reset();
});

// Inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    updateCartCount();
});



// Función para filtrar productos (puedes implementarla según tus necesidades)
function filterProducts(category) {
    const filtered = products.filter(product => product.category === category);
    loadProducts(filtered);
}

// Función para ordenar productos (puedes implementarla según tus necesidades)
function sortProducts(criteria) {
    let sorted = [...products];
    switch(criteria) {
        case 'price-asc':
            sorted.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            sorted.sort((a, b) => b.price - a.price);
            break;
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
    }
    loadProducts(sorted);
}

// Google Sign-In Configuration
function initializeGoogleSignIn() {
    // Load the Google Sign-In API
    gapi.load('auth2', function() {
        gapi.auth2.init({
            client_id: 'YOUR_GOOGLE_CLIENT_ID' // Replace with your Google Client ID
        });
    });
}

// Profile Dropdown Toggle
const profileIcon = document.getElementById('profileIcon');
const profileDropdown = document.getElementById('profileDropdown');
const signInButton = document.getElementById('signInButton');
const signOutButton = document.getElementById('signOutButton');
const themeToggle = document.getElementById('themeToggle');

profileIcon.addEventListener('click', () => {
    profileDropdown.classList.toggle('active');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!profileIcon.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.remove('active');
    }
});

// Theme Toggle
themeToggle.addEventListener('click', () => {
// Theme Toggle with persistence
const themeToggle = document.getElementById('themeToggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

function setTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('darkMode', isDark);
    
    const icon = themeToggle.querySelector('i');
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    themeToggle.innerHTML = `${icon.outerHTML} ${isDark ? 'Light Mode' : 'Dark Mode'}`;
}

// Initialize theme
const savedTheme = localStorage.getItem('darkMode');
if (savedTheme !== null) {
    setTheme(savedTheme === 'true');
} else {
    setTheme(prefersDarkScheme.matches);
}

// Theme toggle event listener
themeToggle.addEventListener('click', () => {
    const isDarkMode = !document.body.classList.contains('dark-mode');
    setTheme(isDarkMode);
});

// Listen for system theme changes
prefersDarkScheme.addEventListener('change', (e) => {
    if (localStorage.getItem('darkMode') === null) {
        setTheme(e.matches);
    }
});
});

// Check for saved theme preference
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    const icon = themeToggle.querySelector('i');
    icon.className = 'fas fa-sun';
    themeToggle.innerHTML = `${icon.outerHTML} Light Mode`;
}

// Google Sign-In
function handleSignIn() {
    const auth2 = gapi.auth2.getAuthInstance();
    auth2.signIn().then(function(googleUser) {
        const profile = googleUser.getBasicProfile();
        updateUserProfile(profile);
        signInButton.classList.add('hidden');
        signOutButton.classList.remove('hidden');
    });
}

function handleSignOut() {
    const auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function() {
        resetUserProfile();
        signInButton.classList.remove('hidden');
        signOutButton.classList.add('hidden');
    });
}

function updateUserProfile(profile) {
    const userImage = document.getElementById('userImage');
    const dropdownUserImage = document.getElementById('dropdownUserImage');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');

    userImage.src = profile.getImageUrl();
    dropdownUserImage.src = profile.getImageUrl();
    userName.textContent = profile.getName();
    userEmail.textContent = profile.getEmail();
}

function resetUserProfile() {
    const userImage = document.getElementById('userImage');
    const dropdownUserImage = document.getElementById('dropdownUserImage');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');

    userImage.src = 'https://via.placeholder.com/32';
    dropdownUserImage.src = 'https://via.placeholder.com/50';
    userName.textContent = 'Not signed in';
    userEmail.textContent = '';
}

// Event Listeners
signInButton.addEventListener('click', handleSignIn);
signOutButton.addEventListener('click', handleSignOut);

// Authentication State Observer
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        updateUserProfile({
            getImageUrl: () => user.photoURL || 'https://via.placeholder.com/32',
            getName: () => user.displayName || 'User',
            getEmail: () => user.email
        });
        signInButton.classList.add('hidden');
        signOutButton.classList.remove('hidden');
    } else {
        // User is signed out
        resetUserProfile();
        signInButton.classList.remove('hidden');
        signOutButton.classList.add('hidden');
    }
});

// Update sign out handler to use Firebase
signOutButton.addEventListener('click', () => {
    auth.signOut().then(() => {
        resetUserProfile();
        window.location.href = '/html/login.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
    });
});

// // Stripe configuration
// const stripe = Stripe('pk_test_51QQXJkBurRU52l6ex1Dxq8I2xmFn6GmLzZNsBwBDed2aR8BEbZY3fbVuwaimrbMDXYDyHCyTttVcmZlVWrOgwmHx00lSUG6JGB');
// let elements;

// async function initialize() {
//     const response = await fetch("/create-payment-intent", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ items: cart })
//     });

//     const { clientSecret } = await response.json();

//     const appearance = {
//         theme: 'stripe',
//         variables: {
//             colorPrimary: '#3498db',
//         }
//     };

//     elements = stripe.elements({ appearance, clientSecret });

//     const paymentElement = elements.create("payment");
//     paymentElement.mount("#payment-element");
// }

// async function handleSubmit(e) {
//     e.preventDefault();
//     setLoading(true);

//     const { error } = await stripe.confirmPayment({
//         elements,
//         confirmParams: {
//             return_url: `${window.location.origin}/completion.html`,
//         },
//     });

//     if (error) {
//         const messageContainer = document.querySelector("#payment-message");
//         messageContainer.textContent = error.message;
//         messageContainer.classList.remove("hidden");
//         setLoading(false);
//     }
// }

// function setLoading(isLoading) {
//     const button = document.querySelector("#checkoutButton");
//     const spinner = document.querySelector("#spinner");
//     const buttonText = document.querySelector("#button-text");

//     if (isLoading) {
//         button.disabled = true;
//         spinner.classList.remove("hidden");
//         buttonText.classList.add("hidden");
//     } else {
//         button.disabled = false;
//         spinner.classList.add("hidden");
//         buttonText.classList.remove("hidden");
//     }
// }

// // Event listeners
// document.querySelector("#payment-form").addEventListener("submit", handleSubmit);
// document.querySelector(".cart-icon").addEventListener("click", () => {
//     initialize();
// });


document.getElementById('testButton').addEventListener('click', async () => {
    try {
      const response = await fetch('/test'); // Enviar solicitud GET a la ruta /test
      if (!response.ok) {
        // Si la respuesta no es exitosa, lanzar error
        throw new Error('Error al hacer la solicitud');
      }
      const data = await response.text(); // Obtener la respuesta como texto
      document.getElementById('result').textContent = data; // Mostrar respuesta exitosa
    } catch (error) {
      // Mostrar error si algo sale mal
      document.getElementById('result').textContent = `Error: ${error.message}`;
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("PaymentModal");
    const cartModal = document.getElementById("cartModal");
    const closeBtn = document.getElementById("closePaymentModal");
    const checkoutButton = document.getElementById("checkoutButton");
  
    // Open modal when the checkout button is clicked
    checkoutButton.addEventListener("click", () => {
      modal.style.display = "flex";
      cartModal.style.display = 'none';
    });
  
    // Close modal when the close button is clicked
    closeBtn.onclick = () => {
      modal.style.display = "none";
    };
  
    // Close modal when clicking outside the modal content
    window.onclick = (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    };
  });
  

const paymentForm = document.getElementById('payment-form');
const submitButton = document.getElementById('submit');
const paymentMessage = document.getElementById('payment-message');
document.addEventListener('DOMContentLoaded', async () => {
    let stripe, elements, card;
    try {
        
        const response = await fetch('/config');
        const config = await response.json();
        stripe = Stripe(config.stripePublicKey);


        elements = stripe.elements();
        card = elements.create('card');
        card.mount('#card-element');

    } catch (error) {
        console.error('Error fetching Stripe public key:', error);
    }
    
    paymentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        try {
            const { token, error } = await stripe.createToken(card);
            
            if (error) {
                paymentMessage.textContent = error.message;
                return;
            }

            // Update the modal payment amount
        // document.getElementById('modalPaymentAmount').textContent = total.toFixed(2); 
            
            const paymentData = {
                payment_method_data: {
                    type: 'card',
                    card: {
                        token: token.id,
                    },
                },
                total: total,
                userId: currentUser ? currentUser.uid : null,
                items: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                }))
            };

            if (!paymentData.userId) {
                showNotification('Debes iniciar sesión para realizar el pago');
                return;
            }
            
            const response = await fetch('/procesar-pago', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(paymentData),
            });
            
            //holis

            const data = await response.json();
            if (response.ok) {


                // Ask user if they want an invoice
            const wantsInvoice = await showInvoiceConfirmation();
            if (wantsInvoice && data.invoice) {
                // Open invoice PDF in new tab
                window.open(data.invoice.invoice_pdf, '_blank');
      }

                      // Limpiar el carrito
                      cart = [];
                      await saveCartToFirebase();
                      updateCartDisplay();
                      
      
                      // Mostrar mensaje de éxito
                      showNotification('¡Pago procesado correctamente!');
                 

                // Guardar el pago en Firestore
            await savePaymentToFirestore({
                userId: currentUser.uid,
                amount: total,
                items: cart,
                paymentIntentId: data.paymentIntentId,
                status: 'succeeded',
                createdAt: new Date().toISOString()
            });
                
             // Close payment modal
            document.getElementById('PaymentModal').style.display = 'none';
            


 } else {
                paymentMessage.textContent = data.error || 'Hubo un problema al procesar el pago.';
            }
        } catch (error) {
            paymentMessage.textContent = 'Hubo un error al procesar la solicitud.';
        }
    });
    
    // Añade esta función para guardar el pago en Firestore
async function savePaymentToFirestore(paymentData) {
    try {
        const paymentRef = doc(collection(db, "pagos"));
        await setDoc(paymentRef, paymentData);
    } catch (error) {
        console.error("Error al guardar el pago:", error);
    }
}
    
});



// HISTORY PAGOS

// Función para cargar el historial de pagos
async function loadPaymentHistory() {
    if (!currentUser) return;

    try {
        const response = await fetch(`/payment-history/${currentUser.uid}`);
        const data = await response.json();

        if (data.success) {
            const historyContent = document.getElementById('paymentHistoryContent');
            historyContent.innerHTML = '';

            data.payments.forEach(payment => {
                const date = new Date(payment.created * 1000).toLocaleDateString();
                const amount = (payment.amount / 100).toFixed(2);

                const paymentElement = document.createElement('div');
                paymentElement.className = 'payment-history-item';
                paymentElement.innerHTML = `
                    <h3>Pago del ${date}</h3>
                    <p>Monto: $${amount}</p>
                    <p>Estado: ${payment.status === 'succeeded' ? 'Exitoso' : payment.status}</p>
                `;

                historyContent.appendChild(paymentElement);
            });
        }
    } catch (error) {
        console.error('Error al cargar historial:', error);
        showNotification('Error al cargar el historial de pagos');
    }
}

// Función para generar factura
async function generateInvoice(paymentIntentId) {
    try {
        const response = await fetch('/create-invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ paymentIntentId })
        });

        const data = await response.json();

        if (data.success && data.invoicePdf) {
            window.open(data.invoicePdf, '_blank');
            showNotification('Factura generada correctamente');
        } else {
            throw new Error(data.error || 'Error al generar la factura');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al generar la factura: ' + error.message);
    }
}



// Eventos para el modal de historial
document.addEventListener('DOMContentLoaded', () => {
    const historyModal = document.getElementById('paymentHistoryModal');
    const closeHistoryBtn = document.getElementById('closeHistoryModal');

    // Añadir opción en el menú de usuario
    const profileOptions = document.querySelector('.profile-options');
    const historyOption = document.createElement('a');
    historyOption.href = '#';
    historyOption.className = 'profile-option';
    historyOption.innerHTML = '<i class="fas fa-history"></i> Historial de Pagos';
    historyOption.onclick = () => {
        historyModal.style.display = 'flex';
        loadPaymentHistory();
    };
    profileOptions.appendChild(historyOption);

    // Cerrar modal
    closeHistoryBtn.onclick = () => {
        historyModal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target === historyModal) {
            historyModal.style.display = 'none';
        }
    };
});


function showInvoiceConfirmation() {
    return new Promise((resolve) => {
        const confirmModal = document.createElement('div');
        confirmModal.className = 'invoice-confirm-modal';
        confirmModal.innerHTML = `
            <div class="invoice-confirm-content">
                <h3>¿Desea descargar la factura?</h3>
                <div class="invoice-buttons">
                    <button id="downloadYes" class="btn-primary">Sí</button>
                    <button id="downloadNo" class="btn-secondary">No</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);

        document.getElementById('downloadYes').onclick = () => {
            confirmModal.remove();
            resolve(true);
        };
        document.getElementById('downloadNo').onclick = () => {
            confirmModal.remove();
            resolve(false);
        };
    });
}

async function downloadInvoice(invoiceId) {
    try {
      const response = await fetch(`/download-invoice/${invoiceId}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      showNotification('Error al descargar la factura');
    }
  }

