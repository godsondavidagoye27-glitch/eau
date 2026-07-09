import Database from './db.js';

function qs(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

async function init() {
  const db = new Database();
  await db.initializeFromServer();
  const serviceId = parseInt(qs('serviceId'), 10);
  const root = document.getElementById('booking-root');
  if (!serviceId) {
    root.innerHTML = '<h2>Invalid service selected.</h2>';
    return;
  }

  const service = db.getById('products', serviceId) || { name: 'Unknown Service', description: '' };
  const ratePerHour = 75; // fixed as requested

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
        <label for="hours">Hours needed</label>
        <input id="hours" name="hours" type="number" min="1" value="1" required />
      </div>
      <div class="product-form-group">
        <label>Price</label>
        <div id="price-display">$${ratePerHour} per hour</div>
      </div>

      <h3>Payment information</h3>
      <div class="product-form-group">
        <label for="card-name">Cardholder name</label>
        <input id="card-name" name="cardName" required />
      </div>
      <div class="product-form-group">
        <label for="card-number">Card number</label>
        <input id="card-number" name="cardNumber" inputmode="numeric" required />
      </div>
      <div class="product-form-group">
        <label for="card-exp">Expiry (MM/YY)</label>
        <input id="card-exp" name="cardExp" required />
      </div>
      <div class="product-form-group">
        <label for="card-cvc">CVC</label>
        <input id="card-cvc" name="cardCvc" required />
      </div>

      <div class="product-form-group">
        <button class="btn" type="submit">Confirm Booking</button>
      </div>
    </form>
  `;

  const form = document.getElementById('booking-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const where = document.getElementById('where').value.trim();
    const start = document.getElementById('start').value;
    const hours = parseFloat(document.getElementById('hours').value) || 1;
    const cardName = document.getElementById('card-name').value.trim();
    const cardNumber = document.getElementById('card-number').value.trim();
    const cardExp = document.getElementById('card-exp').value.trim();
    const cardCvc = document.getElementById('card-cvc').value.trim();

    const total = ratePerHour * hours;

    const booking = {
      id: 'bk-' + Date.now(),
      serviceId,
      serviceName: service.name,
      where,
      start,
      hours,
      ratePerHour,
      total,
      payment: {
        system: 'TestCard',
        cardName,
        cardNumber: cardNumber.replace(/.(?=.{4})/g, '*'),
        cardExp,
        cardCvc: '***'
      },
      createdAt: new Date().toISOString()
    };

    // Save booking to localStorage for demo purposes
    const bookings = JSON.parse(localStorage.getItem('eau-bookings') || '[]');
    bookings.push(booking);
    localStorage.setItem('eau-bookings', JSON.stringify(bookings));

    // Redirect to confirmation page
    window.location.href = `booking-confirmation.html?bookingId=${booking.id}`;
  });
}

init();
