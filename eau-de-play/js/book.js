import Database from './db.js';
function qs(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

async function createPaymentIntent(amount) {
  const res = await fetch('/api/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
  });
  return res.json();
}

async function postBooking(payload) {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function init() {
  const db = new Database();
  await db.initializeFromServer();
  let serviceId = parseInt(qs('serviceId'), 10);
  if (!serviceId) {
    const stored = sessionStorage.getItem('eau_selected_service');
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed)) serviceId = parsed;
    }
  }
  const root = document.getElementById('booking-root');
  if (!serviceId) {
    root.innerHTML = '<h2>Please select a service to book.</h2><p><a href="services.html" class="btn">Choose a service</a></p>';
    return;
  }

  const service = db.getById('products', serviceId) || { name: 'Unknown Service', description: '', price: 0 };
  const flatPrice = Number(service.price || 0);

  root.innerHTML = `
    <h1>Book: ${service.name}</h1>
    <p>${service.description}</p>
    <form id="booking-form" class="booking-form">
      <div class="product-form-group">
        <label for="where">Where is the service needed?</label>
        <input id="where" name="where" required />
      </div>
      <div class="product-form-group">
        <label for="start">Start date & time</label>
        <input id="start" name="start" type="datetime-local" required />
      </div>
      <div class="product-form-group">
        <label>Price</label>
        <div id="price-display">€${flatPrice.toFixed(2)} — <span id="total-display">€${flatPrice.toFixed(2)}</span></div>
      </div>

      <h3>Payment</h3>
      <div class="product-form-group">
        <label for="card-name">Cardholder name</label>
        <input id="card-name" name="cardName" required />
      </div>
      <div class="product-form-group">
        <label>Card</label>
        <div id="card-element" style="padding:12px; border:1px solid #ddd; border-radius:6px;"></div>
        <div id="card-errors" role="alert" style="color:#b00020; margin-top:8px;"></div>
      </div>

      <div class="product-form-group">
        <button class="btn" type="submit">Confirm Booking</button>
      </div>
    </form>
  `;

  const totalDisplay = document.getElementById('total-display');
  totalDisplay.textContent = `€${flatPrice.toFixed(2)}`;

  const stripeKey = window.__APP_CONFIG__ && window.__APP_CONFIG__.stripePublicKey;
  let stripe = null;
  let cardElement = null;
  if (stripeKey && window.Stripe) {
    stripe = Stripe(stripeKey);
    const elements = stripe.elements();
    cardElement = elements.create('card', { hidePostalCode: true });
    cardElement.mount('#card-element');
  } else {
    document.getElementById('card-errors').textContent = 'Payment not configured — falling back to demo mode.';
  }

  const form = document.getElementById('booking-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const where = document.getElementById('where').value.trim();
    const start = document.getElementById('start').value;
    const cardName = document.getElementById('card-name').value.trim();
    const total = flatPrice;

    if (!where) { alert('Please enter where the service is needed'); return; }
    if (!start) { alert('Please select start date/time'); return; }

    try {
      if (stripe && cardElement) {
        // Create payment intent on server
        const intentRes = await createPaymentIntent(Math.round(total * 100));
        if (!intentRes || !intentRes.success || !intentRes.clientSecret) {
          throw new Error((intentRes && intentRes.error) || 'Failed to create payment intent');
        }

        const clientSecret = intentRes.clientSecret;
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: { name: cardName || 'Guest' }
          }
        });

        if (result.error) {
          document.getElementById('card-errors').textContent = result.error.message || 'Payment failed';
          return;
        }

        if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
          // Persist booking to server with paymentIntentId
          const payload = {
              serviceId,
              serviceName: service.name,
              where,
              start,
              total,
              payment: {
                system: 'stripe',
                paymentIntentId: result.paymentIntent.id
              }
            };

          const saveRes = await postBooking(payload);
          if (saveRes && saveRes.success && saveRes.booking) {
            window.location.href = `booking-confirmation.html?bookingId=${saveRes.booking.id}`;
            return;
          }

          throw new Error('Failed to save booking');
        }

        throw new Error('Payment did not succeed');
      } else {
        // Fallback demo: save locally and redirect
        const booking = {
          id: 'bk-' + Date.now(),
          serviceId,
          serviceName: service.name,
          where,
          start,
          total,
          payment: { system: 'demo' },
          createdAt: new Date().toISOString()
        };
        const bookings = JSON.parse(localStorage.getItem('eau-bookings') || '[]');
        bookings.push(booking);
        localStorage.setItem('eau-bookings', JSON.stringify(bookings));
        window.location.href = `booking-confirmation.html?bookingId=${booking.id}`;
      }
    } catch (err) {
      console.error('Booking error:', err);
      alert(err && err.message ? err.message : 'Booking failed');
    }
  });
}

init();
