import { supabase } from '../eau-de-play/js/supabase.js';

const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('csvFile');
const statusEl = document.getElementById('status');
const forwarderUrlInput = document.getElementById('forwarderUrl');
const progressWrap = document.getElementById('progressWrap');
const fileNameEl = document.getElementById('fileName');
const uploadProgress = document.getElementById('uploadProgress');
const progressText = document.getElementById('progressText');
const previewWrap = document.getElementById('previewWrap');
const csvPreview = document.getElementById('csvPreview');

async function getAccessToken() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch (err) {
    console.error('Failed to get session', err);
    return null;
  }
}

uploadBtn.addEventListener('click', async () => {
  statusEl.textContent = '';
  const file = fileInput.files && fileInput.files[0];
  if (!file) return statusEl.textContent = 'Select a CSV file first.';

  const token = await getAccessToken();
  if (!token) return statusEl.textContent = 'Not authenticated.';

  // Read and parse CSV for validation & preview
  const text = await file.text();
  const parsed = parseCSV(text, 6); // header + 5 rows
  if (!parsed || !parsed.headers) return statusEl.textContent = 'Failed to parse CSV.';
  const required = ['order_id', 'carrier', 'tracking_number'];
  const headersLower = parsed.headers.map(h => h.toLowerCase());
  const missing = required.filter(r => !headersLower.includes(r));
  if (missing.length) {
    statusEl.textContent = `Missing required columns: ${missing.join(', ')}`;
    return;
  }

  // Render preview
  renderPreview(parsed.headers, parsed.rows.slice(0,5));
  // Prepare multipart upload using XHR so we can show progress
  const forwarderUrl = forwarderUrlInput.value || window.FORWARDER_URL || '/.netlify/functions/forwarder';
  const form = new FormData();
  form.append('file', file, file.name);

  // UI
  fileNameEl.textContent = file.name;
  progressWrap.style.display = 'block';
  uploadProgress.value = 0;
  progressText.textContent = '0%';
  statusEl.textContent = 'Uploading...';

  // Upload with retries/backoff
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await uploadWithProgress(forwarderUrl, form, token);
      statusEl.textContent = 'Upload complete.';
      break;
    } catch (err) {
      console.warn('Upload attempt failed', attempt, err);
      if (attempt === maxAttempts) {
        statusEl.textContent = 'Upload failed after retries: ' + err.message;
      } else {
        const backoff = Math.pow(2, attempt) * 500;
        statusEl.textContent = `Upload attempt ${attempt} failed, retrying in ${backoff}ms...`;
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  }
});

function renderPreview(headers, rows) {
  previewWrap.style.display = 'block';
  csvPreview.innerHTML = '';
  const table = document.createElement('table');
  table.style.borderCollapse = 'collapse';
  table.style.width = '100%';
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    th.style.border = '1px solid #ddd';
    th.style.padding = '4px';
    tr.appendChild(th);
  });
  thead.appendChild(tr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  rows.forEach(row => {
    const r = document.createElement('tr');
    row.forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell;
      td.style.border = '1px solid #eee';
      td.style.padding = '4px';
      r.appendChild(td);
    });
    tbody.appendChild(r);
  });
  table.appendChild(tbody);
  csvPreview.appendChild(table);
}

function parseCSV(text, maxLines = 1000) {
  // Simple CSV parser handling quoted fields
  const lines = text.split(/\r?\n/).filter((l, i) => l.trim() !== '' || i === 0);
  if (!lines.length) return null;
  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < Math.min(lines.length, maxLines); i++) {
    rows.push(parseLine(lines[i]));
  }
  return { headers, rows };
}

function parseLine(line) {
  const res = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { cur += '"'; i++; continue; }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) { res.push(cur); cur = ''; continue; }
    cur += ch;
  }
  res.push(cur);
  return res.map(s => s.trim());
}

function uploadWithProgress(url, formData, token) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      uploadProgress.value = pct;
      progressText.textContent = `${pct}% (${Math.round(e.loaded / 1024)} KB)`;
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText);
        } else if (xhr.status >= 500) {
          reject(new Error(`Server error ${xhr.status}: ${xhr.responseText}`));
        } else {
          // Client errors (4xx) are not retried
          reject(new Error(`Upload failed ${xhr.status}: ${xhr.responseText}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}
