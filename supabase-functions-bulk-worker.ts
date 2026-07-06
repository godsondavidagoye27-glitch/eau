// Supabase Edge Function (Deno) - Bulk Jobs Worker
// This function is intended to run on a schedule (cron) and process rows in
// `bulk_jobs` with status='pending'. For each job it will fetch the CSV (from
// `csv` column or storage path), validate it, call the protected bulk-ship
// function, then update the job status to 'processing' -> 'done' or 'failed'.

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { parse } from 'https://deno.land/std@0.203.0/csv/mod.ts';

const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const BULK_PROCESSOR_URL = Deno.env.get('SUPABASE_FUNCTIONS_BULK_SHIP_MULTIPART_URL');
const STORAGE_BUCKET = Deno.env.get('SUPABASE_STORAGE_BUCKET') || Deno.env.get('VITE_SUPABASE_STORAGE_BUCKET') || 'public';
const ADMIN_FORWARD_SECRET = Deno.env.get('ADMIN_FORWARD_SECRET') || Deno.env.get('ADMIN_API_SECRET');

async function listPendingJobs(limit = 10) {
  const url = `${SUPABASE_URL}/rest/v1/bulk_jobs?status=eq.pending&order=created_at.asc&limit=${limit}`;
  const res = await fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } });
  if (!res.ok) throw new Error('Failed to list jobs');
  return res.json();
}

async function updateJobStatus(jobId, updates) {
  const url = `${SUPABASE_URL}/rest/v1/bulk_jobs?id=eq.${jobId}`;
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
    throw new Error('Failed to update job: ' + txt);
  }
  return res.json();
}

async function fetchCsvFromStorage(path) {
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(STORAGE_BUCKET)}/${encodeURIComponent(path)}`;
  const res = await fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Failed to fetch CSV from storage: ' + txt);
  }
  return await res.text();
}

function parseCSVHeaders(csvText) {
  const firstLine = csvText.split(/\r?\n/).find(l => l.trim() !== '');
  if (!firstLine) return null;
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

async function processJob(job) {
  const id = job.id;
  try {
    await updateJobStatus(id, { status: 'processing', updated_at: new Date().toISOString() });
    let csvText = job.csv;
    if (!csvText && job.storage_path) {
      csvText = await fetchCsvFromStorage(job.storage_path);
    }
    if (!csvText) throw new Error('No CSV found for job');

    // Robust CSV parsing and per-row validation
    let rows = [];
    let headers = parseCSVHeaders(csvText) || [];
    try {
      // parse returns an array of objects when header:true
      const parsed = await parse(csvText, { header: true }) as Array<Record<string,string>>;
      if (Array.isArray(parsed) && parsed.length > 0) {
        rows = parsed;
        headers = Object.keys(parsed[0]).map(h => h.toLowerCase());
      }
    } catch (e) {
      console.warn('CSV parse error, falling back to simple parser', e.message);
      // fallback: split lines
      const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
      headers = (lines[0] || '').split(',').map(h => h.trim().toLowerCase());
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, idx) => obj[h] = vals[idx] || '');
        rows.push(obj);
      }
    }

    const required = ['order_id', 'carrier', 'tracking_number'];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length) {
      await updateJobStatus(id, { status: 'failed', result: `Missing columns: ${missing.join(', ')}`, updated_at: new Date().toISOString() });
      return;
    }

    // Per-row validation
    const validRows: Array<Record<string,string>> = [];
    const invalidRows: Array<{row: Record<string,string>, reason: string}> = [];
    for (const r of rows) {
      const order_id = (r['order_id'] || r['orderid'] || r['id'] || '').toString().trim();
      const carrier = (r['carrier'] || '').toString().trim();
      const tracking_number = (r['tracking_number'] || r['trackingnumber'] || '').toString().trim();
      if (!order_id || !carrier || !tracking_number) {
        invalidRows.push({ row: r, reason: 'Missing required field(s)' });
      } else {
        validRows.push({ ...r, order_id, carrier, tracking_number });
      }
    }

    if (validRows.length === 0) {
      const summary = `All rows invalid: ${invalidRows.length}`;
      await updateJobStatus(id, { status: 'failed', result: summary, updated_at: new Date().toISOString() });
      return;
    }

    // If some rows invalid, upload them to storage for review
    let failedStoragePath = null;
    if (invalidRows.length > 0) {
      const failedCsvHeader = Object.keys(rows[0] || {}).join(',');
      const failedCsvLines = [failedCsvHeader].concat(invalidRows.map(ir => Object.values(ir.row).map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')));
      const failedCsvText = failedCsvLines.join('\n');
      const bucket = STORAGE_BUCKET;
      const path = `failed_rows/${id}_failed_${Date.now()}.csv`;
      try {
        await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeURIComponent(path)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'text/csv', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
          body: failedCsvText
        });
        failedStoragePath = path;
      } catch (e) {
        console.error('Failed to upload invalid rows to storage', e);
      }
    }

    // Reconstruct CSV for validRows using original header order
    const outHeaders = Object.keys(rows[0] || {});
    const outLines = [outHeaders.join(',')];
    for (const vr of validRows) {
      const line = outHeaders.map(h => {
        const val = vr[h] !== undefined ? vr[h] : '';
        return `"${String(val).replace(/"/g,'""')}"`;
      }).join(',');
      outLines.push(line);
    }
    const validCsvText = outLines.join('\n');

    // Forward valid rows to processor
    const res = await fetch(BULK_PROCESSOR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_FORWARD_SECRET },
      body: JSON.stringify({ csv: validCsvText, job_id: id })
    });
    const body = await res.text();
    if (res.ok) {
      const result = { processed: validRows.length, invalid: invalidRows.length, failed_path: failedStoragePath, processor_result: body };
      await updateJobStatus(id, { status: 'done', result: JSON.stringify(result), processed_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    } else {
      const result = `Processor error ${res.status}: ${body}`;
      await updateJobStatus(id, { status: 'failed', result, updated_at: new Date().toISOString() });
    }
  } catch (err) {
    console.error('Job processing error', id, err);
    try { await updateJobStatus(id, { status: 'failed', result: err.message, updated_at: new Date().toISOString() }); } catch (e) { console.error('Failed updating job status', e); }
  }
}

serve(async (req) => {
  try {
    // allow GET for cron pings or manual POST to run immediate
    const jobs = await listPendingJobs(20);
    for (const job of jobs) {
      await processJob(job);
    }
    return new Response(JSON.stringify({ processed: jobs.length }), { status: 200 });
  } catch (err) {
    console.error('Worker error', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
