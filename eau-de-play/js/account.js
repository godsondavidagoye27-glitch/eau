import { supabaseAuth } from './supabase-auth.js';
import SupabaseDB, { supabase } from './supabase.js';

async function fetchOrders() {
  const user = await supabaseAuth.getCurrentUser();
  if (!user) {
    window.location.href = 'auth.html?redirect=account.html';
    return [];
  }

  const data = await SupabaseDB.getOrders(user.id);

  if (!data) return [];

  return data || [];
}

function renderOrders(orders) {
  const container = document.getElementById('orders-list');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = '<p>No orders found.</p>';
    return;
  }

  container.innerHTML = orders.map(o => `
    <div class="order-card" data-order-id="${o.id}">
      <div class="order-row">
        <strong>Order:</strong> ${o.id}
      </div>
      <div class="order-row">
        <strong>Date:</strong> ${new Date(o.created_at).toLocaleString()}
      </div>
      <div class="order-row">
        <strong>Total:</strong> $${parseFloat(o.total).toFixed(2)}
      </div>
      <div class="order-row">
        <strong>Status:</strong> <span class="order-status">${o.status}</span>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-small track-btn" data-order-id="${o.id}">Track Delivery</button>
        <button class="btn btn-small detail-btn" data-order-id="${o.id}">View Details</button>
      </div>
    </div>
  `).join('');

  // attach track handlers
  document.querySelectorAll('.track-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.orderId;
      await showDeliveryStatus(id);
    });
  });

  document.querySelectorAll('.detail-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.orderId;
      await showOrderDetail(id);
    });
  });
}

async function showDeliveryStatus(orderId) {
  const tracker = document.getElementById('delivery-tracker');
  if (!tracker) return;

  tracker.innerHTML = '<p>Loading delivery status...</p>';

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id,status,shipping,tracking_number,updated_at')
      .eq('id', orderId)
      .single();

    if (error) throw error;

    // If tracking_number exists, show simulated tracking steps
    const tracking = data.tracking_number || null;
    if (!tracking) {
      tracker.innerHTML = `
        <p>Order <strong>${data.id}</strong> is currently <strong>${data.status}</strong>.</p>
        <p>Tracking number not available yet. We'll update you soon.</p>
      `;
      return;
    }

    // Simulate delivery stages based on status and timestamps
    const stages = ['Order Received', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];
    const statusIndex = Math.min(stages.length -1, stages.indexOf(mapStatusToStage(data.status)));

    const html = stages.map((s, i) => `
      <div class="track-step ${i <= statusIndex ? 'completed' : ''}">
        <div class="step-title">${s}</div>
        ${i <= statusIndex ? `<div class="step-time">${new Date(data.updated_at).toLocaleString()}</div>` : ''}
      </div>
    `).join('');

    tracker.innerHTML = `
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
