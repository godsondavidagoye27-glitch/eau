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
  // Require authentication to book
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
        <p>${service.description || 'Book your service with a smooth checkout, live preview and secure payment flow.'}</p>
      </div>

      <div class="booking-grid">
        <section class="booking-form-panel">
          <form id="booking-form" class="booking-form">
            <div class="field-group">
              <label for="where">Where is the service needed?</label>
              <input id="where" name="where" placeholder="Enter location or venue" required />
            </div>

            <div class="field-row">
              <div class="field-group">
                <label for="start">Start date & time</label>
                <input id="start" name="start" type="datetime-local" required />
              </div>
              <div class="field-group">
                <label for="card-name">Cardholder name</label>
                <input id="card-name" name="cardName" placeholder="Jane Doe" required />
              </div>
            </div>

            <div class="field-group">
              <label for="card-number">Card number</label>
              <input id="card-number" name="cardNumber" inputmode="numeric" placeholder="1234 5678 9012 3456" maxlength="19" required />
            </div>

            <div class="field-row">
              <div class="field-group">
                <label for="card-expiry">Expiry date</label>
                <input id="card-expiry" name="cardExpiry" inputmode="numeric" placeholder="MM/YY" maxlength="5" required />
              </div>
              <div class="field-group">
                <label for="card-cvv">CVV</label>
                <input id="card-cvv" name="cardCvv" inputmode="numeric" placeholder="123" maxlength="4" required />
              </div>
            </div>

            <div class="field-group booking-summary-line">
              <span>Booking total</span>
              <strong class="price-badge">€${flatPrice.toFixed(2)}</strong>
            </div>

            <div class="field-group">
              <button class="btn btn-primary btn-large" type="submit">Confirm booking</button>
            </div>

            <p class="small-text">Payment is completed securely inside the Flutterwave checkout modal after you submit the booking.</p>
          </form>
        </section>

        <aside class="booking-preview">
          <div class="card-viz">
            <div class="card-face card-front" id="card-front">
              <div class="card-top">
                <div class="card-chip"></div>
                <div class="card-brand" id="preview-brand">FLW</div>
              </div>
              <div class="card-number" id="preview-number">•••• •••• •••• 4242</div>
              <div class="card-meta">
                <div class="card-holder">
                  <span>Cardholder</span>
                  <strong id="preview-name">CARDHOLDER NAME</strong>
                </div>
                <div class="card-expiry">
                  <span>Expires</span>
                  <strong id="preview-expiry">12/26</strong>
                </div>
              </div>
            </div>
            <div class="card-face card-back" id="card-back">
              <div class="magnetic-strip"></div>
              <div class="signature-row">
                <span>AUTHORIZED SIGNATURE</span>
                <div class="signature-box">Jane Doe</div>
              </div>
              <div class="cvv-block">
                <span>CVV</span>
                <div>•••</div>
              </div>
            </div>
          </div>

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

  const previewNumber = document.getElementById('preview-number');
  const previewName = document.getElementById('preview-name');
  const previewExpiry = document.getElementById('preview-expiry');
  const previewBrand = document.getElementById('preview-brand');
  const summaryWhere = document.getElementById('summary-where');
  const summaryStart = document.getElementById('summary-start');
  const cardFront = document.getElementById('card-front');

  const inputWhere = document.getElementById('where');
  const inputStart = document.getElementById('start');
  const inputCardName = document.getElementById('card-name');
  const inputCardNumber = document.getElementById('card-number');
  const inputCardExpiry = document.getElementById('card-expiry');
  const inputCardCvv = document.getElementById('card-cvv');
  const cardViz = document.querySelector('.card-viz');

  function formatDate(value) {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function detectCardNetwork(value) {
    const number = (value || '').replace(/\D/g, '');
    if (number.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(number) || /^2(?:2[2-9]|[3-6]\d|7[01]|720)/.test(number)) return 'Mastercard';
    if (/^3[47]/.test(number)) return 'American Express';
    if (/^6(?:011|5|4[4-9]|22)/.test(number)) return 'Discover';
    if (/^35/.test(number)) return 'JCB';
    if (/^62/.test(number)) return 'UnionPay';
    if (/^3(?:0[0-5]|[68])/.test(number)) return 'Diners';
    return '';
  }

  function formatExpiry(value) {
    if (!value) return '12/26';
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length < 2) return '12/26';
    const month = cleaned.slice(0, 2);
    const year = cleaned.length >= 4 ? cleaned.slice(2, 4) : '26';
    return `${month}/${year}`;
  }

  function formatCardNumber(value) {
    return value
      .replace(/\D/g, '')
      .match(/.{1,4}/g)
      ?.join(' ') || '';
  }

  function updatePreview() {
    previewName.textContent = inputCardName.value.trim() || 'CARDHOLDER NAME';
    previewNumber.textContent = inputCardNumber.value.trim() ? formatCardNumber(inputCardNumber.value) : '•••• •••• •••• 4242';
    const cardNetwork = detectCardNetwork(inputCardNumber.value);
    previewBrand.textContent = cardNetwork || 'FLW';
    previewBrand.dataset.network = cardNetwork.toLowerCase().replace(/[^a-z]+/g, '-') || 'flw';
    summaryWhere.textContent = inputWhere.value.trim() || 'Not set';
    summaryStart.textContent = formatDate(inputStart.value);
    previewExpiry.textContent = formatExpiry(inputCardExpiry.value);
    document.querySelector('#card-back .cvv-block div').textContent = inputCardCvv.value.trim().padEnd(3, '•').slice(0, 3);
  }

  function updateTotal() {
    const totalDisplay = document.querySelector('.price-badge');
    totalDisplay.textContent = `€${flatPrice.toFixed(2)}`;
  }

  [inputWhere, inputStart, inputCardName, inputCardNumber, inputCardExpiry, inputCardCvv].forEach((field) => {
    field.addEventListener('input', updatePreview);
    field.addEventListener('focus', () => cardFront.classList.add('card-focus'));
    field.addEventListener('blur', () => cardFront.classList.remove('card-focus'));
  });

  cardViz.addEventListener('click', () => cardViz.classList.toggle('flip'));
  updatePreview();

  const flwKey = window.__APP_CONFIG__ && window.__APP_CONFIG__.flutterwavePublicKey;
  let usingFlutterwave = false;
  if (flwKey && window.FlutterwaveCheckout) {
    usingFlutterwave = true;
  }

  const form = document.getElementById('booking-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const where = inputWhere.value.trim();
    const start = inputStart.value;
    const cardName = inputCardName.value.trim();
    const total = flatPrice;

    if (!where) { alert('Please enter where the service is needed'); return; }
    if (!start) { alert('Please select start date/time'); return; }

    // Real payment is required - no offline/demo mode
    if (!usingFlutterwave) {
      alert('Payment service is not available. Please try again later.');
      return;
    }

    form.classList.add('submitting');
    cardFront.classList.add('anim');

    try {
      const tx_ref = `tx-${Date.now()}`;
      FlutterwaveCheckout({
        public_key: flwKey,
        tx_ref,
        amount: total,
        currency: 'EUR',
        payment_options: 'card',
        customer: { name: cardName || 'Guest' },
        callback: async function (data) {
          try {
            const verifyRes = await fetch('/api/flutterwave/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transaction_id: data.transaction_id })
            });
            const vr = await verifyRes.json();
            if (vr && vr.success && vr.data && vr.data.status === 'successful') {
              // Get current user email if authenticated
              const currentUser = supabaseAuth.currentUser;
              const userEmail = currentUser?.email || null;

              const payload = {
                serviceId,
                serviceName: service.name,
                where,
                start,
                total,
                userEmail,
                payment: { system: 'flutterwave', transaction_id: data.transaction_id }
              };
              const saveRes = await postBooking(payload);
              if (saveRes && saveRes.success && saveRes.booking) {
                window.location.href = `booking-confirmation.html?bookingId=${saveRes.booking.id}`;
                return;
              }
              alert('Booking save failed after payment verification.');
            } else {
              alert('Payment verification failed. Please try again.');
            }
          } catch (err) {
            console.error('Verification error:', err);
            alert('Payment verification error. Please contact support.');
          } finally {
            form.classList.remove('submitting');
            cardFront.classList.remove('anim');
          }
        },
        onclose: function() {
          form.classList.remove('submitting');
          cardFront.classList.remove('anim');
        }
      });
    } catch (err) {
      console.error('Booking error:', err);
      alert(err && err.message ? err.message : 'Booking failed');
      form.classList.remove('submitting');
      cardFront.classList.remove('anim');
    }
  });
}

init();
