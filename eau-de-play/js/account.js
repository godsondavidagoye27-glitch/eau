import { supabaseAuth } from './supabase-auth.js';
import { supabase, subscribeToTable } from './supabase.js';

function getStoredUser() {
  try {
    const raw = localStorage.getItem('eau-de-play-current-user') || localStorage.getItem('eau-de-play-user');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

async function fetchBookings(userEmail) {
  try {
    if (!userEmail) return [];

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_email', userEmail)
      .order('start_date', { ascending: false });

    if (error) {
      console.warn('Bookings could not be loaded:', error.message || error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.warn('Bookings request failed:', error);
    return [];
  }
}

function renderDashboardSummary(bookings, purchases) {
  const bookingCount = document.getElementById('summary-bookings-count');
  const upcomingCount = document.getElementById('summary-upcoming-count');
  const purchaseCount = document.getElementById('summary-purchases-count');

  const now = new Date();
  const upcoming = bookings.filter((booking) => new Date(booking.start_date) > now);

  // Animate counts so the dashboard feels alive
  if (bookingCount) animateCount(bookingCount, bookings.length);
  if (purchaseCount) animateCount(purchaseCount, purchases.length);
  if (upcomingCount) animateCount(upcomingCount, upcoming.length);
}

function animateCount(element, target) {
  if (!element) return;
  const start = 0;
  const duration = 650;
  let rafId = null;
  const startTime = performance.now();
  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const value = Math.floor(t * target);
    element.textContent = String(value);
    if (t < 1) rafId = requestAnimationFrame(step);
    else element.textContent = String(target);
  }
  if (rafId) cancelAnimationFrame(rafId);
  requestAnimationFrame(step);
}

function renderBookings(bookings) {
  const container = document.getElementById('bookings-list');
  const upcomingContainer = document.getElementById('upcoming-services');
  const infoContainer = document.getElementById('booking-info');
  if (!container || !upcomingContainer) return;

  const now = new Date();
  const upcoming = bookings.filter((booking) => new Date(booking.start_date) > now);
  const past = bookings.filter((booking) => new Date(booking.start_date) <= now);

  if (bookings.length === 0) {
    container.innerHTML = '<p>No bookings found yet.</p>';
    upcomingContainer.innerHTML = '<p>No upcoming services scheduled.</p>';
    if (infoContainer) infoContainer.innerHTML = '<p>Select a booking to view details.</p>';
    return;
  }

  container.innerHTML = past.map((booking) => `
    <div class="booking-card card-enter" data-booking-id="${booking.id}">
      <div class="booking-row">
        <strong>${booking.service_name || 'Service'}</strong>
      </div>
      <div class="booking-row">
        <span>Date:</span> ${new Date(booking.start_date).toLocaleString()}
      </div>
      <div class="booking-row">
        <span>Location:</span> ${booking.location || 'N/A'}
      </div>
      <div class="booking-row">
        <span>Total:</span> €${parseFloat(booking.total || 0).toFixed(2)}
      </div>
      <div class="booking-row">
        <span>Status:</span> <span class="booking-status ${String(booking.status || 'confirmed').toLowerCase()}">${booking.status || 'Confirmed'}</span>
      </div>
      <p style="font-size:0.85rem; color:var(--color-text-secondary); margin-top:8px;">
        To cancel or modify, please <a href="contact.html">contact our admin</a>.
      </p>
    </div>
  `).join('');

  upcomingContainer.innerHTML = upcoming.length === 0
    ? '<p>No upcoming services scheduled.</p>'
    : upcoming.map((booking) => `
      <div class="upcoming-service-card" data-booking-id="${booking.id}">
        <div class="service-date">${new Date(booking.start_date).toLocaleDateString()}</div>
        <div class="service-name">${booking.service_name || 'Service'}</div>
        <div class="service-location">${booking.location || 'N/A'}</div>
        <div class="service-price">€${parseFloat(booking.total || 0).toFixed(2)}</div>
      </div>
    `).join('');

  document.querySelectorAll('.booking-card').forEach((card) => {
    card.addEventListener('click', () => {
      const bookingId = card.dataset.bookingId;
      const booking = bookings.find((item) => item.id === bookingId);
      if (booking) showBookingInfo(booking);
    });
  });

  // Stagger entrance animation for better UX
  document.querySelectorAll('.booking-card.card-enter').forEach((el, idx) => {
    el.style.animationDelay = `${idx * 60}ms`;
    // remove helper class after animation finished to avoid interfering with hover states
    el.addEventListener('animationend', () => el.classList.remove('card-enter'));
  });

  document.querySelectorAll('.upcoming-service-card').forEach((card) => {
    card.addEventListener('click', () => {
      const bookingId = card.dataset.bookingId;
      const booking = bookings.find((item) => item.id === bookingId);
      if (booking) showBookingInfo(booking);
    });
  });

  if (bookings.length > 0 && infoContainer) {
    showBookingInfo(bookings[0]);
  }
}

function showBookingInfo(booking) {
  const infoContainer = document.getElementById('booking-info');
  if (!infoContainer) return;

  infoContainer.innerHTML = `
    <div class="booking-detail">
      <h4>${booking.service_name || 'Service'}</h4>
      <div class="detail-row"><span>Booking ID:</span><strong>${booking.id || 'N/A'}</strong></div>
      <div class="detail-row"><span>Date & Time:</span><strong>${new Date(booking.start_date).toLocaleString()}</strong></div>
      <div class="detail-row"><span>Location:</span><strong>${booking.location || 'N/A'}</strong></div>
      <div class="detail-row"><span>Total Cost:</span><strong>€${parseFloat(booking.total || 0).toFixed(2)}</strong></div>
      <div class="detail-row"><span>Payment Method:</span><strong>${booking.payment_system || 'Card'}</strong></div>
      <div class="detail-row"><span>Status:</span><strong class="booking-status ${String(booking.status || 'confirmed').toLowerCase()}">${booking.status || 'Confirmed'}</strong></div>
      ${booking.transaction_id ? `<div class="detail-row"><span>Transaction ID:</span><strong>${booking.transaction_id}</strong></div>` : ''}
      <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--color-border);">
        <p style="font-size:0.85rem; color:var(--color-text-secondary);">
          To cancel or modify this booking, please <a href="contact.html">contact our admin</a>.
        </p>
      </div>
    </div>
  `;
}

function renderPurchases(purchases) {
  const container = document.getElementById('purchases-list');
  if (!container) return;

  if (purchases.length === 0) {
    container.innerHTML = '<p>No purchases found yet.</p>';
    return;
  }

  container.innerHTML = purchases.map((purchase) => `
    <div class="purchase-card">
      <div class="purchase-row"><strong>${purchase.name || 'Purchase'}</strong></div>
      <div class="purchase-row"><span>Quantity:</span> ${purchase.quantity || 1}</div>
      <div class="purchase-row"><span>Price:</span> €${parseFloat(purchase.price || 0).toFixed(2)}</div>
    </div>
  `).join('');
}

async function init() {
  const storedUser = getStoredUser();
  const user = (await supabaseAuth.getCurrentUser()) || storedUser;

  if (!user) {
    document.getElementById('profile-email').textContent = 'Please sign in to view your account.';
    document.getElementById('bookings-list').innerHTML = '<p>Please sign in to view your bookings.</p>';
    document.getElementById('purchases-list').innerHTML = '<p>Please sign in to view your purchases.</p>';
    return;
  }

  const profileEmail = document.getElementById('profile-email');
  if (profileEmail) {
    profileEmail.textContent = user.email || user.id || 'Account user';
  }

  // show loading spinners while we fetch
  const bookingsContainer = document.getElementById('bookings-list');
  const purchasesContainer = document.getElementById('purchases-list');
  const upcomingContainer = document.getElementById('upcoming-services');
  if (bookingsContainer) bookingsContainer.innerHTML = `<div class="loading-row"><div class="spinner"><span></span></div><div>Loading bookings…</div></div>`;
  if (purchasesContainer) purchasesContainer.innerHTML = `<div class="loading-row"><div class="spinner"><span></span></div><div>Loading purchases…</div></div>`;
  if (upcomingContainer) upcomingContainer.innerHTML = `<div class="loading-row"><div class="spinner"><span></span></div><div>Loading upcoming services…</div></div>`;

  const bookings = await fetchBookings(user.email || user.id);
  console.debug('[account] fetched bookings count:', bookings.length, bookings);
  const cartHistory = (() => {
    try { return JSON.parse(localStorage.getItem('eau-de-play-cart') || '[]'); }
    catch { return []; }
  })();
  console.debug('[account] cart history items:', cartHistory.length, cartHistory);

  renderDashboardSummary(bookings, cartHistory);
  renderBookings(bookings);
  renderPurchases(cartHistory);

  // Realtime: subscribe to bookings changes and refresh the list when updates occur
  if (typeof subscribeToTable === 'function') {
    try {
      const channel = subscribeToTable('bookings', (payload) => {
        console.debug('[realtime] bookings payload:', payload);
        // small UI hint while refreshing
        if (bookingsContainer) bookingsContainer.style.opacity = '0.6';
        // For simplicity, re-fetch the user's bookings on any table change
        fetchBookings(user.email || user.id).then((fresh) => {
          renderDashboardSummary(fresh, cartHistory);
          renderBookings(fresh);
        }).catch((err) => console.error('Realtime refresh error', err))
        .finally(() => { if (bookingsContainer) bookingsContainer.style.opacity = ''; });
      });

      // store channel for cleanup
      window.__bookings_realtime_channel = channel;
      window.addEventListener('beforeunload', () => {
        try { channel?.unsubscribe?.(); } catch (e) { /* ignore */ }
      });
    } catch (err) {
      console.warn('Realtime subscription setup failed:', err);
    }
  }

  const signoutBtn = document.getElementById('signout-btn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', async () => {
      await supabaseAuth.signOut();
      window.location.href = 'index.html';
    });
  }
}

init();
