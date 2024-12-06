import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"; // Añade esta línea

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
const db = getFirestore(app);
const auth = getAuth(app); // Añade esta línea

const form = document.getElementById("product-form");
const productList = document.getElementById("product-list-ul");

document.getElementById('adminLogout').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await signOut(auth);
        window.location.href = '../html/login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
});

async function addProductToFirestore(product) {
    try {
        const productsCollection = collection(db, "productos");
        await addDoc(productsCollection, product);
        showNotification('Producto agregado exitosamente', 'success');
        fetchProducts();
    } catch (error) {
        console.error("Error al agregar el producto: ", error);
        showNotification('Error al agregar el producto', 'error');
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

async function fetchProducts() {
    try {
        const productsCollection = collection(db, "productos");
        const querySnapshot = await getDocs(productsCollection);
        productList.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productCard = createProductCard(product);
            productList.appendChild(productCard);
        });
    } catch (error) {
        console.error("Error al cargar los productos: ", error);
        showNotification('Error al cargar los productos', 'error');
    }
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <img src="${product.image}" alt="${product.name}" class="product-image">
        <div class="product-info">
            <h3>${product.name}</h3>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            <p class="product-description">${product.description}</p>
        </div>
    `;
    return card;
}

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const newProduct = {
        name: document.getElementById("product-name").value,
        description: document.getElementById("product-description").value,
        price: parseFloat(document.getElementById("product-price").value),
        image: document.getElementById("product-image").value
    };

    addProductToFirestore(newProduct);
    form.reset();
});

// Agregar estilos para las notificaciones
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        animation: slideIn 0.5s ease-out;
    }
    
    .notification.success {
        background-color: #2ecc71;
    }
    
    .notification.error {
        background-color: #e74c3c;
    }
    
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
`;
document.head.appendChild(style);

fetchProducts();

