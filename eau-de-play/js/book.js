import Database from './db.js';
import { supabaseAuth } from './supabase-auth.js';

function qs(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

async function postBooking(payload) {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

function buildPayPalUrl(total, label, bookingId, serviceId) {
  const runtimeConfig = typeof window !== 'undefined' ? (window.__APP_CONFIG__ || {}) : {};
  const businessEmail = runtimeConfig.paypalBusinessEmail || '';
  const baseOrigin = window.location.origin && window.location.origin !== 'null' ? window.location.origin : 'https://www.paypal.com';
  const url = new URL('https://www.paypal.com/cgi-bin/webscr');
  url.searchParams.set('cmd', '_xclick');
  if (businessEmail) {
    url.searchParams.set('business', businessEmail);
  }
  url.searchParams.set('item_name', label);
  url.searchParams.set('amount', Number(total).toFixed(2));
  url.searchParams.set('currency_code', 'EUR');
  url.searchParams.set('no_shipping', '1');
  url.searchParams.set('return', `${baseOrigin}/booking-confirmation.html?bookingId=${encodeURIComponent(bookingId)}&paymentStatus=success`);
  url.searchParams.set('cancel_return', `${baseOrigin}/booking-confirmation.html?bookingId=${encodeURIComponent(bookingId)}&paymentStatus=cancelled`);
  return url.toString();
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
  const currentUser = await supabaseAuth.getCurrentUser();
  if (!currentUser) {
    if (root) {
      root.innerHTML = `<div class="notice"><h2>Please sign in</h2><p>You must be signed in to make a booking. <a href="auth.html">Sign in / Register</a></p></div>`;
    }
    return;
  }
  if (!serviceId) {
    root.innerHTML = '<h2>Please select a service to book.</h2><p><a href="services.html" class="btn">Choose a service</a></p>';
    return;
  }

  const service = db.getById('products', serviceId) || { name: 'Unknown Service', description: '', price: 0 };
  const flatPrice = Number(service.price || 0);

  root.innerHTML = `
    <div class="booking-card booking-hero">
      <div class="booking-intro">
        <span class="eyebrow">Booking Experience</span>
        <h1>Reserve ${service.name}</h1>
        <p>${service.description || 'Book your service with a smooth checkout and secure PayPal payment.'}</p>
      </div>

      <div class="booking-grid">
        <section class="booking-form-panel">
          <form id="booking-form" class="booking-form">
            <div class="field-group">
              <label for="bookerName">Booker name</label>
              <input id="bookerName" name="bookerName" placeholder="Enter your full name" required />
            </div>

            <div class="field-group">
              <label for="bookerPhone">Phone number</label>
              <input id="bookerPhone" name="bookerPhone" placeholder="Enter your phone number" required />
            </div>

            <div class="field-group">
              <label for="where">Where is the service needed?</label>
              <input id="where" name="where" placeholder="Enter location or venue" required />
            </div>

            <div class="field-group">
              <label for="start">Start date & time</label>
              <input id="start" name="start" type="datetime-local" required />
            </div>

            <div class="field-group booking-summary-line">
              <span>Booking total</span>
              <strong class="price-badge">€${flatPrice.toFixed(2)}</strong>
            </div>

            <div class="field-group" style="display:flex; gap:12px; flex-wrap:wrap;">
              <button class="btn btn-primary btn-large" type="submit">Pay with PayPal</button>
              <button class="btn btn-secondary btn-large" id="cancel-booking-btn" type="button">Cancel</button>
            </div>

            <div id="booking-status" class="alert"></div>

            <p class="small-text">You will be redirected to PayPal after the booking is saved so you can complete the payment securely.</p>
          </form>
        </section>

        <aside class="booking-preview">
          <div class="booking-details-panel">
            <h2>Booking summary</h2>
            <div class="summary-row"><span>Service</span><strong>${service.name}</strong></div>
            <div class="summary-row"><span>Price</span><strong>€${flatPrice.toFixed(2)}</strong></div>
            <div class="summary-row"><span>Location</span><strong id="summary-where">Not set</strong></div>
            <div class="summary-row"><span>Starts</span><strong id="summary-start">Not set</strong></div>
          </div>
        </aside>
      </div>
    </div>
  `;

  const totalDisplay = document.querySelector('.price-badge');
  totalDisplay.textContent = `€${flatPrice.toFixed(2)}`;

  const summaryWhere = document.getElementById('summary-where');
  const summaryStart = document.getElementById('summary-start');
  const inputName = document.getElementById('bookerName');
  const inputPhone = document.getElementById('bookerPhone');
  const inputWhere = document.getElementById('where');
  const inputStart = document.getElementById('start');

  function formatDate(value) {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function updateSummary() {
    summaryWhere.textContent = inputWhere.value.trim() || 'Not set';
    summaryStart.textContent = formatDate(inputStart.value);
  }

  function showBookingMessage(message, type = 'error') {
    const statusBox = document.getElementById('booking-status');
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.className = `alert show ${type === 'success' ? 'success-message' : ''}`;
    statusBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  [inputWhere, inputStart].forEach((field) => {
    field.addEventListener('input', updateSummary);
  });

  const cancelBookingButton = document.getElementById('cancel-booking-btn');
  cancelBookingButton?.addEventListener('click', () => {
    window.location.href = 'services.html';
  });
  updateSummary();

  const form = document.getElementById('booking-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const customerName = inputName.value.trim();
    const customerPhone = inputPhone.value.trim();
    const where = inputWhere.value.trim();
    const start = inputStart.value;
    const total = flatPrice;

    if (!customerName) {
      showBookingMessage('Please enter the booker name.');
      return;
    }
    if (!customerPhone) {
      showBookingMessage('Please enter your phone number.');
      return;
    }
    if (!where) {
      showBookingMessage('Please enter where the service is needed.');
      return;
    }
    if (!start) {
      showBookingMessage('Please select start date/time.');
      return;
    }

    const currentUser = await supabaseAuth.getCurrentUser();
    if (!currentUser) {
      showBookingMessage('Please sign in to book. Redirecting...');
      window.location.href = 'auth.html';
      return;
    }

    form.classList.add('submitting');

    try {
      const payload = {
        serviceId,
        serviceName: service.name,
        where,
        start,
        total,
        customerName,
        customerPhone,
        customerEmail: currentUser.email || null,
        userEmail: currentUser.email || null,
        payment: { system: 'paypal', status: 'pending' }
      };
      const saveRes = await postBooking(payload);
      if (saveRes && saveRes.success && saveRes.booking) {
        const payPalUrl = buildPayPalUrl(total, `${service.name} booking`, saveRes.booking.id, serviceId);
        window.location.assign(payPalUrl);
        return;
      }
      showBookingMessage('Booking save failed. Please try again.');
    } catch (err) {
      console.error('Booking error:', err);
      showBookingMessage(err && err.message ? err.message : 'Booking failed.');
    } finally {
      form.classList.remove('submitting');
    }
  });
}

init();
