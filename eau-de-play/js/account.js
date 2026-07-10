import { supabaseAuth } from './supabase-auth.js';
import { supabase } from './supabase.js';

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

  if (bookingCount) bookingCount.textContent = String(bookings.length);
  if (purchaseCount) purchaseCount.textContent = String(purchases.length);

  const now = new Date();
  const upcoming = bookings.filter((booking) => new Date(booking.start_date) > now);
  if (upcomingCount) upcomingCount.textContent = String(upcoming.length);
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
    <div class="booking-card" data-booking-id="${booking.id}">
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

  const signoutBtn = document.getElementById('signout-btn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', async () => {
      await supabaseAuth.signOut();
      window.location.href = 'index.html';
    });
  }
}

init();
      <div class="tracking-number">Tracking: <strong>${tracking}</strong></div>
      <div class="tracking-steps">${html}</div>
    `;
  } catch (err) {
    console.error('Error fetching delivery status', err);
    tracker.innerHTML = '<p>Unable to fetch delivery status.</p>';
  }
}

async function showOrderDetail(orderId) {
  const modal = document.getElementById('order-modal');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');
  if (!modal || !body) return;

  title.textContent = `Order ${orderId}`;
  body.innerHTML = '<p>Loading...</p>';

  try {
    const data = await SupabaseDB.getOrderById(orderId);
    if (!data) {
      body.innerHTML = '<p>Order not found.</p>';
      return;
    }

    const items = JSON.parse(data.items || '[]');
    const itemsHtml = items.map(it => `
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--color-border);">
        <div>${it.name}</div>
        <div>${it.quantity} × $${parseFloat(it.price).toFixed(2)}</div>
      </div>
    `).join('');

    const history = data.tracking_history || data.checkpoints || [];
    const historyHtml = history.length > 0 ? history.map(h => `
      <div style="padding:8px 0;border-bottom:1px solid var(--color-border);">
        <div style="font-weight:600">${h.location || h.city || ''} ${h.status || h.tag || ''}</div>
        <div style="font-size:12px;color:var(--color-text-light)">${h.created_at || h.time || h.datetime || ''}</div>
        <div style="font-size:13px">${h.message || h.description || ''}</div>
      </div>
    `).join('') : '<div>No tracking checkpoints yet.</div>';

    const trackingHtml = data.tracking_number ? `
      <div><strong>Carrier:</strong> ${data.carrier || 'N/A'}</div>
      <div><strong>Tracking:</strong> ${data.tracking_number}</div>
      <div><strong>Shipped At:</strong> ${data.shipped_at ? new Date(data.shipped_at).toLocaleString() : '—'}</div>
      <div style="margin-top:10px"><strong>History</strong>${historyHtml}</div>
    ` : '<div>No tracking information yet.</div>';

    body.innerHTML = `
      <div>
        <h4>Items</h4>
        ${itemsHtml}
        <h4 style="margin-top:12px">Summary</h4>
        <div>Subtotal: $${parseFloat(data.subtotal||0).toFixed(2)}</div>
        <div>Tax: $${parseFloat(data.tax||0).toFixed(2)}</div>
        <div>Shipping: $${parseFloat(data.shipping||0).toFixed(2)}</div>
        <div><strong>Total: $${parseFloat(data.total||0).toFixed(2)}</strong></div>
        <h4 style="margin-top:12px">Tracking</h4>
        ${trackingHtml}
      </div>
    `;

    // show modal
    modal.classList.add('active');
    document.getElementById('modal-close').addEventListener('click', () => modal.classList.remove('active'));
  } catch (err) {
    console.error('Order detail error', err);
    body.innerHTML = '<p>Unable to load order details.</p>';
  }
}

function mapStatusToStage(status) {
  const map = {
    pending: 'Order Received',
    confirmed: 'Processing',
    paid: 'Processing',
    shipped: 'Shipped',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    failed: 'Processing'
  };
  return map[status] || 'Order Received';
}

async function initAccountPage() {
  const user = await supabaseAuth.getCurrentUser();
  if (!user) {
    window.location.href = 'auth.html?redirect=account.html';
    return;
  }

  document.getElementById('profile-email').textContent = user.email;

  document.getElementById('signout-btn').addEventListener('click', async () => {
    await supabaseAuth.signOut();
    window.location.href = 'index.html';
  });

  const orders = await fetchOrders();
  renderOrders(orders);

  // Poll for updates every 60 seconds
  setInterval(async () => {
    const updatedOrders = await fetchOrders();
    renderOrders(updatedOrders);
  }, 60000);
}

document.addEventListener('DOMContentLoaded', initAccountPage);
