import { subscribeToTable } from './supabase.js';

async function fetchBookings() {
  const res = await fetch('/api/bookings');
  if (!res.ok) throw new Error('Failed to load bookings');
  return res.json();
}

function renderBookings(list) {
  const root = document.getElementById('bookings-root');
  if (!list || list.length === 0) {
    root.innerHTML = '<p>No bookings found.</p>';
    return;
  }

  const rows = list.map(b => `
    <tr>
      <td>${b.id}</td>
      <td>${b.serviceName || ''}</td>
      <td>${b.where || ''}</td>
      <td>${b.start || ''}</td>
      <td>€${(b.total || 0)}</td>
      <td>${(b.payment && b.payment.paymentStatus) || 'N/A'}</td>
      <td>
        <button class="btn small" data-id="${b.id}" data-action="set-paid">Paid</button>
        <button class="btn small" data-id="${b.id}" data-action="set-cancel">Cancel</button>
      </td>
    </tr>
  `).join('');

  root.innerHTML = `
    <table style="width:100%; border-collapse:collapse;">
      <thead><tr><th>ID</th><th>Service</th><th>Where</th><th>Start</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  root.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      let updates = {};
      if (action === 'set-paid') updates = { status: 'Paid', 'payment.paymentStatus': 'succeeded' };
      if (action === 'set-cancel') updates = { status: 'Canceled' };
      try {
        await fetch('/api/site-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collection: 'bookings', id, updates })
        });
        document.getElementById('message').textContent = 'Updated.';
        loadAndRender();
      } catch (err) {
        document.getElementById('message').textContent = 'Update failed.';
      }
    });
  });
}

async function loadAndRender() {
  try {
    const data = await fetchBookings();
    const items = (data && data.bookings) || [];
    renderBookings(items);
  } catch (err) {
    document.getElementById('bookings-root').innerHTML = '<p>Unable to load bookings.</p>';
  }
}

async function migrateLocalBookings() {
  const raw = localStorage.getItem('eau-bookings');
  if (!raw) { alert('No local bookings found'); return; }
  const local = JSON.parse(raw || '[]');
  if (!local.length) { alert('No local bookings found'); return; }

  // fetch server bookings to avoid duplicates
  const srvRes = await fetch('/api/bookings');
  const srvJson = await srvRes.json();
  const srvList = (srvJson && srvJson.bookings) || [];
  const existingIds = new Set(srvList.map(b => b.id));

  let migrated = 0;
  for (const b of local) {
    if (existingIds.has(b.id)) continue;
    try {
      const payload = { ...b };
      // keep payment info limited
      if (payload.payment && payload.payment.cardNumber) delete payload.payment.cardNumber;
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      migrated++;
    } catch (err) {
      console.warn('Failed to migrate booking', b.id, err);
    }
  }

  alert(`Migrated ${migrated} booking(s) to server.`);
  if (migrated > 0) {
    // remove migrated entries from localStorage
    const remaining = JSON.parse(localStorage.getItem('eau-bookings')||'[]').filter(b=>srvList.findIndex(s=>s.id===b.id)===-1);
    localStorage.setItem('eau-bookings', JSON.stringify(remaining));
  }
  loadAndRender();
}

document.getElementById('refresh').addEventListener('click', loadAndRender);
document.getElementById('migrate').addEventListener('click', migrateLocalBookings);

loadAndRender();

// Realtime: subscribe to bookings changes and refresh the table on updates
if (typeof subscribeToTable === 'function') {
  try {
    const channel = subscribeToTable('bookings', (payload) => {
      console.debug('[admin-bookings] realtime payload', payload);
      // simple refresh strategy: reload the list (debounced)
      if (window.__admin_bookings_debounce) clearTimeout(window.__admin_bookings_debounce);
      window.__admin_bookings_debounce = setTimeout(() => {
        loadAndRender();
      }, 350);
    });
    window.__admin_bookings_channel = channel;

    // cleanup on unload
    window.addEventListener('beforeunload', () => {
      try { channel?.unsubscribe?.(); } catch (e) { /* ignore */ }
    });
  } catch (err) {
    console.warn('Failed to setup admin bookings realtime subscription', err);
  }
}
