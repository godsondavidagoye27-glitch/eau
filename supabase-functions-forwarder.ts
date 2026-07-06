// Supabase Edge Function (Deno) - Authenticated CSV Forwarder
// Accepts multipart/form-data or JSON (csv string). Verifies Supabase session
// via Authorization: Bearer <access_token> and checks `is_admin` role via
// Supabase REST `rpc` or by querying users table. Then forwards the CSV to the
// internal bulk-ship-multipart function (server-side) using ADMIN_API_SECRET.

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ADMIN_FORWARD_SECRET = Deno.env.get('ADMIN_FORWARD_SECRET') || Deno.env.get('ADMIN_API_SECRET');
const FORWARD_FUNCTION_URL = Deno.env.get('SUPABASE_FUNCTIONS_BULK_SHIP_MULTIPART_URL');

async function verifySessionAndAdmin(accessToken) {
  // Use the Supabase `/rest/v1/rpc/get_user` style or query `users` if available.
  // Simpler approach: call Supabase Auth user endpoint.
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!res.ok) return null;
  const user = await res.json();
  // Check `app_metadata` or `user_metadata` for is_admin flag if your schema uses it
  const isAdmin = (user?.app_metadata?.role === 'admin') || (user?.user_metadata?.is_admin === true);
  return { user, isAdmin };
}

async function extractCSVFromRequest(req) {
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await req.json();
    if (body.csv) return body.csv;
    return null;
  }

  if (contentType.includes('multipart/form-data')) {
    const boundaryMatch = contentType.match(/boundary=(.*)$/);
    if (!boundaryMatch) return null;
    const formData = await req.formData();
    const file = formData.get('file') || formData.get('csv');
    if (!file) return null;
    const text = await file.text();
    return text;
  }

  // Fallback: treat as plain text
  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    return await req.text();
  }

  return null;
}

function countCSVRows(csvText) {
  // naive: split by newlines and ignore empty lines
  const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
  return Math.max(0, lines.length - 1); // subtract header
}

async function createBulkJob(adminId, csvText) {
  // Insert a job record into `bulk_jobs` table via Supabase REST
  const url = `${SUPABASE_URL}/rest/v1/bulk_jobs`;
  const payload = {
    admin_id: adminId,
    csv: csvText,
    storage_path: null,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Failed to create job: ' + txt);
  }
  const data = await res.json();
  return data?.[0];
}

async function uploadCsvToStorage(bucket, path, csvText) {
  // Upload the CSV to Supabase Storage at the given path using PUT
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeURIComponent(path)}`;
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/csv',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    },
    body: csvText
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Storage upload failed: ' + txt);
  }
  return `${path}`;
}

function parseCSVHeaders(csvText) {
  const firstLine = csvText.split(/\r?\n/).find(l => l.trim() !== '');
  if (!firstLine) return null;
  // naive parse similar to client
  const headers = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i];
    if (ch === '"') {
      if (inQuotes && firstLine[i+1] === '"') { cur += '"'; i++; continue; }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) { headers.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  headers.push(cur.trim());
  return headers.map(h => h.toLowerCase());
}

async function recentJobsCount(adminId, minutes = 60) {
  // Count jobs created in the last `minutes` for this admin
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const url = `${SUPABASE_URL}/rest/v1/bulk_jobs?admin_id=eq.${adminId}&created_at=gt.${encodeURIComponent(since)}&select=id`;
  const res = await fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } });
  if (!res.ok) return 0;
  const data = await res.json();
  return Array.isArray(data) ? data.length : 0;
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const auth = req.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ')) return new Response('Missing Authorization', { status: 401 });
    const token = auth.split(' ')[1];

    const session = await verifySessionAndAdmin(token);
    if (!session) return new Response('Invalid session', { status: 401 });
    if (!session.isAdmin) return new Response('Admin required', { status: 403 });

    const csv = await extractCSVFromRequest(req);
    if (!csv) return new Response('CSV not found', { status: 400 });

    if (!FORWARD_FUNCTION_URL) return new Response('Forward function not configured', { status: 500 });

    // Basic rate-limiting: limit admins to 5 bulk jobs per hour
    const adminId = session.user?.id || 'unknown';
    const recent = await recentJobsCount(adminId, 60);
    if (recent >= 5) return new Response('Rate limit: too many bulk uploads in last hour', { status: 429 });

    // Count rows to decide whether to queue
    const rows = countCSVRows(csv);
    const sizeBytes = new TextEncoder().encode(csv).length;

    if (rows > 1000 || sizeBytes > 1024 * 1024) {
      // Server-side CSV validation: ensure required columns
      const headers = parseCSVHeaders(csv) || [];
      const required = ['order_id', 'carrier', 'tracking_number'];
      const missing = required.filter(r => !headers.includes(r));
      if (missing.length) return new Response('Missing required columns: ' + missing.join(', '), { status: 400 });

      // For large CSVs: upload to Storage and create a queued job for processing
      const bucket = Deno.env.get('SUPABASE_STORAGE_BUCKET') || Deno.env.get('VITE_SUPABASE_STORAGE_BUCKET') || 'public';
      const keyPrefix = Deno.env.get('BULK_JOB_PREFIX') || 'bulk_jobs';
      const filename = `${keyPrefix}/${adminId}_${Date.now()}.csv`;
      const storagePath = await uploadCsvToStorage(bucket, filename, csv);
      // Create job record with storage_path
      const url = `${SUPABASE_URL}/rest/v1/bulk_jobs`;
      const payload = {
        admin_id: adminId,
        csv: null,
        storage_path: storagePath,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error('Failed to create job: ' + txt);
      }
      const jobData = await res.json();
      const job = jobData?.[0];
      // Attempt to trigger the forward function asynchronously; don't block if it fails
      (async () => {
        try {
          await fetch(FORWARD_FUNCTION_URL, {
            method: 'POST',
            headers: { 'x-admin-secret': ADMIN_FORWARD_SECRET, 'Content-Type': 'application/json' },
            body: JSON.stringify({ csv, job_id: job?.id, storage_path: job?.storage_path })
          });
        } catch (e) {
          console.error('Async trigger failed', e);
        }
      })();

      return new Response(JSON.stringify({ accepted: true, job_id: job?.id, queued: true }), { status: 202 });
    }

    // Small CSVs: forward immediately with basic retry/backoff
    let attempts = 0;
    let lastErr = null;
    while (attempts < 3) {
      attempts++;
      try {
        const forwardRes = await fetch(FORWARD_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'x-admin-secret': ADMIN_FORWARD_SECRET,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ csv })
        });
        const forwardBody = await forwardRes.text();
        return new Response(forwardBody, { status: forwardRes.status });
      } catch (err) {
        lastErr = err;
        const backoff = Math.pow(2, attempts) * 500;
        await new Promise(r => setTimeout(r, backoff));
      }
    }
    throw lastErr || new Error('Forward failed');
  } catch (err) {
    console.error('Forwarder error', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
