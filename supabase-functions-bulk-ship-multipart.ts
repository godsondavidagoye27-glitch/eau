// Supabase Edge Function (Deno) - Bulk Ship Import (JSON or multipart/form-data)
// - POST JSON: { csv: "..." }
// - POST multipart/form-data with file field `file`
// Protected by header 'x-admin-secret' matching env var ADMIN_API_SECRET

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { MultipartReader } from 'https://deno.land/std@0.203.0/mime/multipart.ts';

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

async function extractCsvFromMultipart(req) {
  const contentType = req.headers.get('content-type') || '';
  const m = contentType.match(/boundary=(.*)$/i);
  if (!m) return null;
  const boundary = m[1];
  const body = await req.arrayBuffer();
  const buf = new Uint8Array(body);
  const mr = new MultipartReader(new Deno.Buffer(buf), boundary);
  const form = await mr.readForm();
  // try file field `file` or `csv`
  const file = form.file('file') || form.file('csv');
  if (!file) return null;
  const content = await Deno.readTextFile(file.filename ? file.filename : file.tempfile);
  // If readTextFile above fails (no tempfile), fallback to content provided by form
  return content || null;
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const secret = req.headers.get('x-admin-secret');
    if (!ADMIN_API_SECRET || secret !== ADMIN_API_SECRET) {
      return new Response('Forbidden', { status: 403 });
    }

    let csvText = null;
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const { csv } = await req.json();
      csvText = csv || null;
    } else if (ct.includes('multipart/form-data')) {
      // try to extract file
      try {
        csvText = await extractCsvFromMultipart(req);
      } catch (e) {
        console.warn('Multipart parse error', e);
        csvText = null;
      }
    } else {
      // try plain text body
      csvText = await req.text();
    }

    if (!csvText) return new Response('csv body required', { status: 400 });

    const rows = parseCSV(csvText);
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
    console.error('Bulk ship multipart function error', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
