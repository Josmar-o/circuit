// dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

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
const auth = getAuth(app);

// Verificar el estado de autenticación al cargar la página
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Si no hay usuario autenticado, redirigir al login
        window.location.href = '../html/login.html';
    }
});

// Manejador del evento de cierre de sesión
document.getElementById('adminLogout').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await signOut(auth);
        window.location.href = '../html/login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
});

document.getElementById('adminLogout').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await signOut(auth);
        window.location.href = '../html/login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
});

async function updateDashboardCounters() {
    try {
        // Get products count
        const productsSnapshot = await getDocs(collection(db, "productos"));
        document.getElementById('total-products').textContent = productsSnapshot.size;

        // Get users count
        const usersResponse = await fetch('/get-users-count');
        if (!usersResponse.ok) throw new Error('Failed to fetch users count');
        const usersData = await usersResponse.json();
        document.getElementById('total-users').textContent = usersData.count;

        // Get total sales
        const salesResponse = await fetch('/get-total-sales');
        if (!salesResponse.ok) throw new Error('Failed to fetch sales data');
        const salesData = await salesResponse.json();
        document.getElementById('total-sales').textContent = 
            new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'USD'
            }).format(salesData.total || 0);

    } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
        // Optionally show error to user
        alert('Error al cargar los datos del dashboard. Por favor, intente nuevamente.');
    }
}

async function createSalesChart() {
    try {
        // Obtener datos de ventas de Stripe
        const response = await fetch('/get-monthly-sales');
        const monthlyData = await response.json();

        const ctx = document.getElementById('sales-chart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.labels,
                datasets: [{
                    label: 'Ventas Mensuales',
                    data: monthlyData.data,
                    borderColor: '#3498db',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => `$${value}`
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error al crear gráfico de ventas:", error);
    }
}

async function createProductsChart() {
    try {
        const response = await fetch('/get-top-products');
        if (!response.ok) {
            throw new Error('Error al obtener productos más vendidos');
        }
        const topProducts = await response.json();

        const ctx = document.getElementById('products-chart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topProducts.labels,
                datasets: [{
                    label: 'Unidades Vendidas',
                    data: topProducts.data,
                    backgroundColor: '#2ecc71'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Productos más Vendidos (Último mes)'
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error al crear gráfico de productos:", error);
    }
}

// Inicializar dashboard
document.addEventListener('DOMContentLoaded', () => {
    updateDashboardCounters();
    createSalesChart();
    createProductsChart();
});