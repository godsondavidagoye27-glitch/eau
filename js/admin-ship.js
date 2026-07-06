import { supabaseAuth } from './supabase-auth.js';
import SupabaseDB from './supabase.js';

async function ensureAdmin() {
  const user = await supabaseAuth.getCurrentUser();
  if (!user) {
    window.location.href = 'auth.html?redirect=admin-ship.html';
    return null;
  }

  // Check users table for is_admin flag
  try {
    const profile = await SupabaseDB.getUser(user.id);
    if (profile && profile.is_admin) return user;
  } catch (err) {
    console.warn('Could not load user profile for admin check', err);
  }

  // As fallback, check JWT role claim
  try {
    const jwtRole = user?.role || (user?.app_metadata && user.app_metadata?.role);
    if (jwtRole === 'admin') return user;
  } catch (e) {}

  document.getElementById('orders-admin').innerHTML = '<p>Access denied.</p>';
  return null;
}

async function loadOrders() {
  const orders = await SupabaseDB.getOrders();
  const container = document.getElementById('orders-admin');
  if (!container) return;

  container.innerHTML = orders.map(o => `
    <div class="order-row" data-id="${o.id}">
      <div class="order-meta">
        <div><strong>#${o.id}</strong> — ${o.email} — ${new Date(o.created_at).toLocaleString()}</div>
        <div>Status: <em>${o.status}</em> • Total: $${parseFloat(o.total||0).toFixed(2)}</div>
      </div>
      <div class="ship-actions">
        <input type="text" placeholder="Carrier (e.g. USPS)" class="carrier-input" value="${o.carrier || ''}">
        <input type="text" placeholder="Tracking #" class="tracking-input" value="${o.tracking_number || ''}">
        <button class="btn ship-btn" data-id="${o.id}">Mark Shipped</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.ship-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const row = e.target.closest('.order-row');
      const id = e.target.dataset.id;
      const carrier = row.querySelector('.carrier-input').value.trim();
      const tracking = row.querySelector('.tracking-input').value.trim();
      if (!tracking) return alert('Enter tracking number');

      try {
        const updated = await SupabaseDB.updateOrder(id, {
          status: 'shipped',
          carrier: carrier || null,
          tracking_number: tracking,
          shipped_at: new Date().toISOString()
        });

        alert('Order marked as shipped');
        // Trigger backend tracking initiation if available
        if (import.meta.env?.VITE_API_URL) {
          fetch(`${import.meta.env.VITE_API_URL}/track/initiate`, {
            method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ orderId: id })
          }).catch(() => {});
        }

        loadOrders();
      } catch (err) {
        console.error('Ship error', err);
        alert('Failed to mark shipped');
      }
    });
  });
}

// CSV parsing and bulk operations
function parseCSVText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows = lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim());
    const obj = {};
    header.forEach((h, idx) => { obj[h] = cols[idx] || ''; });
    return obj;
  });
  return rows;
}

function renderCsvRows(rows) {
  const container = document.getElementById('csv-rows');
  if (!container) return;
  if (!rows || rows.length === 0) {
    container.innerHTML = '<p>No rows parsed.</p>';
    return;
  }

  container.innerHTML = `
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr><th style="text-align:left">Select</th><th>order_id</th><th>carrier</th><th>tracking_number</th></tr></thead>
      <tbody>
        ${rows.map((r, i) => `
          <tr data-idx="${i}" style="border-top:1px solid var(--color-border);">
            <td><input type="checkbox" class="csv-select" data-idx="${i}" checked></td>
            <td>${r.order_id || r.id || ''}</td>
            <td>${r.carrier || ''}</td>
            <td>${r.tracking_number || r.tracking || ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // store parsed rows on container for later
  container._rows = rows;
}

async function bulkShipSelected() {
  const container = document.getElementById('csv-rows');
  if (!container || !container._rows) return alert('No CSV parsed');
  const rows = container._rows;
  const checkboxes = Array.from(document.querySelectorAll('.csv-select'));
  const toShip = checkboxes.filter(cb => cb.checked).map(cb => rows[parseInt(cb.dataset.idx,10)]);
  if (toShip.length === 0) return alert('No rows selected');

  let success = 0, failed = 0;
  for (const r of toShip) {
    const id = r.order_id || r.id;
    const carrier = r.carrier || r.carrier_name || null;
    const tracking = r.tracking_number || r.tracking || null;
    if (!id || !tracking) { failed++; continue; }
    try {
      await SupabaseDB.updateOrder(id, {
        status: 'shipped',
        carrier: carrier || null,
        tracking_number: tracking,
        shipped_at: new Date().toISOString()
      });
      success++;
    } catch (err) {
      console.error('Bulk ship error for', id, err);
      failed++;
    }
  }

  alert(`Bulk ship complete — success: ${success}, failed: ${failed}`);
  await loadOrders();
}

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('csv-file');
  const processBtn = document.getElementById('process-csv');
  const download = document.getElementById('download-template');
  const bulkBtn = document.getElementById('bulk-ship');

  if (download) {
    download.addEventListener('click', (e) => {
      e.preventDefault();
      const csv = 'order_id,carrier,tracking_number\n{order_id},USPS,9400110898825022579493\n';
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'tracking-template.csv'; a.click(); URL.revokeObjectURL(url);
    });
  }

  if (processBtn && fileInput) {
    processBtn.addEventListener('click', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return alert('Select a CSV file first');
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result;
        const rows = parseCSVText(text);
        renderCsvRows(rows);
      };
      reader.readAsText(file);
    });
  }

  if (bulkBtn) {
    bulkBtn.addEventListener('click', bulkShipSelected);
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const ok = await ensureAdmin();
  if (!ok) return;
  await loadOrders();
});
