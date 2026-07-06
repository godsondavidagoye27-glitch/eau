// Supabase Edge Function (Deno) - Bulk Ship Import
// Accepts POST JSON: { csv: string }
// Protected by header 'x-admin-secret' matching env var ADMIN_API_SECRET

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ADMIN_API_SECRET = Deno.env.get('ADMIN_API_SECRET');

function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim());
    const obj = {};
    header.forEach((h, i) => obj[h] = cols[i] || '');
    return obj;
  });
}

async function patchOrder(orderId, updates) {
  const url = `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase patch failed: ${res.status} ${txt}`);
  }
  return res.json();
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const secret = req.headers.get('x-admin-secret');
    if (!ADMIN_API_SECRET || secret !== ADMIN_API_SECRET) {
      return new Response('Forbidden', { status: 403 });
    }

    const { csv } = await req.json();
    if (!csv) return new Response('csv body required', { status: 400 });

    const rows = parseCSV(csv);
    const results = [];
    for (const r of rows) {
      const id = r.order_id || r.id;
      const carrier = r.carrier || r.carrier_name || null;
      const tracking = r.tracking_number || r.tracking || null;
      if (!id || !tracking) {
        results.push({ id, success: false, reason: 'missing id or tracking' });
        continue;
      }

      try {
        const updates = {
          status: 'shipped',
          carrier: carrier || null,
          tracking_number: tracking,
          shipped_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        const res = await patchOrder(id, updates);
        results.push({ id, success: true, res });
      } catch (err) {
        results.push({ id, success: false, reason: err.message });
      }
    }

    return new Response(JSON.stringify({ results }), { status: 200 });
  } catch (err) {
    console.error('Bulk ship function error', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
