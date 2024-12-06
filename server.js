const express = require('express');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);const app = express();
const path = require('path');  
const bodyParser = require('body-parser');
// In server.js, add:
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true }); // Import and configure CORS
const serviceAccount = require('./proyecto-d-iv-firebase-adminsdk-3l5tr-fb9b9a6a03.json');


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



// Usar bodyParser para analizar el cuerpo de las solicitudes POST
app.use(bodyParser.json());
app.use('/js', express.static(path.join(__dirname, 'js'))); 
app.use('/html', express.static(path.join(__dirname, 'html'))); 
app.use('/css', express.static(path.join(__dirname, 'css'))); 
app.use('/img', express.static(path.join(__dirname, 'img'))); 
app.use('/Panel-admin', express.static(path.join(__dirname, 'Panel-admin'))); 
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/html/index.html')); // Make sure you have the HTML file
});


// Configura el servidor para escuchar en un puerto
const port = 3000;
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

  app.get('/test', (req, res) => {
    // Simula un error aleatorio para la prueba
    const randomError = Math.random() < 0.5; // 50% de chance de error
    if (randomError) {
      return res.status(500).json({ error: 'Algo salió mal en el servidor' });
    }
    res.send('La ruta /test está funcionando correctamente!');
  });



app.get('/config', (req, res) => {
    res.json({ stripePublicKey: "pk_test_51QQXJkBurRU52l6eWZOHl1gRh4YGxUVcEH3W2WqEzmQaBEgfemXwP3jOtIkXdC6IymFR3fg6oXlD5atJ8L38xSJN00J1ZZIb34"});
});



// Ruta para procesar el pago
app.post('/procesar-pago', async (req, res) => {
  const { payment_method_data, total, userId, items } = req.body; // Add items here

  if (!total || isNaN(total)) {
    return res.status(400).json({ error: 'El monto total es inválido.' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'Usuario no autenticado.' });
  }

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'No hay items en el carrito.' });
  }

  try {
    const amountInCents = Math.round(total * 100);

    // 1. Crear cliente
    const customer = await stripe.customers.create({
      metadata: { 
          userId: userId,
          items: JSON.stringify(items.map(item => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity
          })))
      }
    });

    // 2. Create PaymentIntent with line items
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      customer: customer.id,
      payment_method_data: payment_method_data,
      automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
      },
      metadata: {
          userId: userId,
          items: JSON.stringify(items)
      },
      description: `Compra de ${items.length} productos`
    });

    // 3. Confirmar PaymentIntent
    const confirmedPaymentIntent = await stripe.paymentIntents.confirm(paymentIntent.id);

    if (confirmedPaymentIntent.status === 'succeeded') {
      // 4. Crear factura directamente
      const invoice = await stripe.invoices.create({
        customer: customer.id,
        auto_advance: true,
        collection_method: 'charge_automatically',
        metadata: {
            paymentIntentId: paymentIntent.id
        }
      });

      // Add line items to the invoice
      for (const item of items) {
          await stripe.invoiceItems.create({
              customer: customer.id,
              amount: Math.round(item.price * item.quantity * 100),
              currency: 'usd',
              description: `${item.name} x${item.quantity}`,
              invoice: invoice.id
          });
      }

      // 6. Finalizar y pagar la factura
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
      res.json({
        success: true,
        message: 'Pago completado con éxito.',
        paymentIntent: confirmedPaymentIntent,
        invoice: finalizedInvoice
      });
    } else {
      res.status(400).json({ error: 'El pago no pudo ser completado.' });
    }
  } catch (error) {
    console.error("Error al procesar el pago:", error);
    res.status(400).json({ error: error.message });
  }
});

// NEWWWWWWWWWWWWWWWWWWWWWWWWWWWWW

app.get('/payment-history/:userId', async (req, res) => {
  try {
      const { userId } = req.params;
      
      const paymentIntents = await stripe.paymentIntents.list({
          limit: 100,
          // En lugar de usar metadata como filtro directo, obtenemos todos los pagos
          // y filtramos por metadata.userId en el servidor
      });

      // Filtrar los pagos que corresponden al usuario
      const userPayments = paymentIntents.data.filter(
          payment => payment.metadata && payment.metadata.userId === userId
      );

      res.json({ 
          success: true, 
          payments: userPayments 
      });
  } catch (error) {
      console.error('Error al obtener historial de pagos:', error);
      res.status(500).json({ error: error.message });
  }
});

//FActura
app.post('/create-invoice', async (req, res) => {
  try {
      const { paymentIntentId } = req.body;

      // Recuperar el PaymentIntent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (!paymentIntent || paymentIntent.amount_received <= 0) {
          return res.status(400).json({ error: 'PaymentIntent inválido o sin monto recibido.' });
      }

      // Crear un nuevo cliente con información básica
      const customer = await stripe.customers.create({
          description: `Cliente para PaymentIntent ${paymentIntentId}`,
          metadata: {
              paymentIntentId: paymentIntentId
          }
      });

      // Crear un invoice item usando el ID del cliente
      const invoiceItem = await stripe.invoiceItems.create({
          customer: customer.id, // Usar solo el ID del cliente
          amount: paymentIntent.amount_received,
          currency: paymentIntent.currency,
          description: `Pago por orden ${paymentIntentId}`
      });

      // Crear la factura
      const invoice = await stripe.invoices.create({
          customer: customer.id, // Usar solo el ID del cliente
          auto_advance: true,
          collection_method: 'charge_automatically'
      });

      // Finalizar la factura
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

      // Pagar la factura
      const paidInvoice = await stripe.invoices.pay(invoice.id, {
          paid_out_of_band: true // Indicar que el pago ya se realizó fuera de la factura
      });

      res.json({
          success: true,
          invoicePdf: paidInvoice.invoice_pdf
      });

  } catch (error) {
      console.error('Error al crear factura:', error);
      res.status(500).json({ 
          error: 'Error al crear la factura',
          details: error.message 
      });
  }
});


app.get('/download-invoice/:invoiceId', async (req, res) => {
  try {
    const invoice = await stripe.invoices.retrieve(req.params.invoiceId);
    if (!invoice.invoice_pdf) {
      throw new Error('PDF no disponible');
    }
    
    const response = await fetch(invoice.invoice_pdf);
    const buffer = await response.buffer();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.id}.pdf`);
    res.send(buffer);
  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({ error: 'Error al descargar la factura' });
  }
});


// server.js
app.get('/get-total-sales', async (req, res) => {
  try {
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    
    const paymentIntents = await stripe.paymentIntents.list({
      created: { gte: thirtyDaysAgo },
      limit: 100
    });

    // Filter succeeded payments in JavaScript instead of query
    const succeededPayments = paymentIntents.data.filter(payment => 
      payment.status === 'succeeded'
    );

    const total = succeededPayments.reduce((sum, payment) => 
      sum + payment.amount, 0) / 100;

    res.json({ total });
  } catch (error) {
    console.error('Error in /get-total-sales:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/get-monthly-sales', async (req, res) => {
  try {
    const monthlyData = {
      labels: [],
      data: []
    };

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const paymentIntents = await stripe.paymentIntents.list({
      created: {
        gte: Math.floor(sixMonthsAgo.getTime() / 1000)
      },
      limit: 100
    });

    // Filter succeeded payments
    const succeededPayments = paymentIntents.data.filter(payment => 
      payment.status === 'succeeded'
    );

    // Group by month
    const monthlyTotals = {};
    succeededPayments.forEach(payment => {
      const date = new Date(payment.created * 1000);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + payment.amount;
    });

    // Format data for the last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      monthlyData.labels.push(date.toLocaleString('es-ES', { month: 'short' }));
      monthlyData.data.push((monthlyTotals[monthKey] || 0) / 100);
    }

    res.json(monthlyData);
  } catch (error) {
    console.error('Error getting monthly sales:', error);
    res.status(500).json({ error: error.message });
  }
});


// Add this endpoint
app.get('/get-users-count', async (req, res) => {
  try {
    const listUsersResult = await admin.auth().listUsers();
    res.json({ count: listUsersResult.users.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Modify dashboard.js:
async function updateDashboardCounters() {
    try {
        // Get products count
        const productsSnapshot = await getDocs(collection(db, "productos"));
        document.getElementById('total-products').textContent = productsSnapshot.size;

        // Get users count from server
        const usersResponse = await fetch('/get-users-count');
        const usersData = await usersResponse.json();
        document.getElementById('total-users').textContent = usersData.count;

        // Rest of the code...
    } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
    }
}

// In server.js, modify the endpoint:
app.get('/get-monthly-sales', async (req, res) => {
  try {
      const monthlyData = {
          labels: [],
          data: []
      };

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Get all successful payments from the last 6 months
      const paymentIntents = await stripe.paymentIntents.list({
          created: {
              gte: Math.floor(sixMonthsAgo.getTime() / 1000)
          },
          limit: 100,
          status: 'succeeded'
      });

      // Group by month
      const monthlyTotals = {};
      paymentIntents.data.forEach(payment => {
          const date = new Date(payment.created * 1000);
          const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
          monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + payment.amount;
      });

      // Format data for the last 6 months
      for (let i = 0; i < 6; i++) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
          
          monthlyData.labels.unshift(date.toLocaleString('es-ES', { month: 'short' }));
          monthlyData.data.unshift((monthlyTotals[monthKey] || 0) / 100);
      }

      res.json(monthlyData);
  } catch (error) {
      console.error('Error getting monthly sales:', error);
      res.status(500).json({ error: error.message });
  }
});

app.get('/get-top-products', async (req, res) => {
  try {
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
      
      // Obtener todas las facturas del último mes
      const invoices = await stripe.invoices.list({
          created: { gte: thirtyDaysAgo },
          limit: 100
      });

      // Objeto para almacenar el conteo de productos
      const productCounts = {};

      // Procesar cada factura
      invoices.data.forEach(invoice => {
          // Dividir la descripción en líneas
          const lines = invoice.lines.data;
          lines.forEach(line => {
              const description = line.description;
              if (description) {
                  // Extraer el nombre del producto (asumiendo formato "Nombre producto x1")
                  const match = description.match(/(.*?)\sx\d+/);
                  if (match) {
                      const productName = match[1].trim();
                      const quantity = parseInt(line.quantity) || 1;
                      productCounts[productName] = (productCounts[productName] || 0) + quantity;
                  }
              }
          });
      });

      // Convertir a array y ordenar
      const sortedProducts = Object.entries(productCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5); // Top 5 productos

      res.json({
          labels: sortedProducts.map(p => p.name),
          data: sortedProducts.map(p => p.count)
      });

  } catch (error) {
      console.error('Error getting top products:', error);
      res.status(500).json({ error: error.message });
  }
});


exports.deleteUserComplete = functions.https.onCall(async (data, context) => {
  // Verify admin privileges here if needed
  try {
      const uid = data.userId;
      
      // Delete from Authentication
      await admin.auth().deleteUser(uid);
      
      // Delete from Firestore
      await admin.firestore().doc(`usuarios/${uid}`).delete();
      await admin.firestore().doc(`usuarios_registrados/${uid}`).delete();
      
      return { success: true, message: 'Usuario eliminado completamente' };
  } catch (error) {
      console.error('Error:', error);
      throw new functions.https.HttpsError('internal', error.message);
  }
});

app.delete('/delete-user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Eliminar al usuario de Firebase Authentication
    await admin.auth().deleteUser(userId);

    // Eliminar al usuario de Firestore
    await admin.firestore().doc(`usuarios/${userId}`).delete();
    await admin.firestore().doc(`usuarios_registrados/${userId}`).delete();

    res.status(200).json({ success: true, message: 'Usuario eliminado completamente' });
  } catch (error) {
    console.error('Error al eliminar el usuario:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});