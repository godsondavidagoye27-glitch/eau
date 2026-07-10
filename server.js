const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.join(__dirname, 'eau-de-play');
const DATA_FILE = path.join(__dirname, 'data', 'site-data.json');
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_SENDER = process.env.RESEND_SENDER || 'newsletter@yourdomain.com';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.webp': 'image/webp'
};

const DEFAULT_SITE_DATA = {
  products: [
    { id: 1, name: 'Premium DJ Services', category: 'service', price: 500, description: 'Professional DJ services for events', image: 'assets/images/IMG_3347.jpg', buttonText: 'BOOK' },
    { id: 2, name: 'Photography & Videography', category: 'service', price: 500, description: 'Professional photography and videography packages', image: 'assets/images/IMG_4699.JPG', buttonText: 'BOOK' },
    { id: 3, name: 'Event Planning', category: 'service', price: 12000, description: 'Complete event planning and coordination', image: 'assets/images/IMG_4703.jpg', buttonText: 'BOOK' },
    { id: 4, name: 'Sports Solutions', category: 'service', price: 500, description: 'Sports event management and coverage', image: '', buttonText: 'BOOK' }
  ],
  merchandise: [
    { id: 101, name: 'Eau de Kack T-Shirt', category: 'merchandise', price: 25, description: 'Premium cotton t-shirt with logo', image: '', buttonText: 'ADD TO CART' },
    { id: 102, name: 'Eau de Play Cap', category: 'merchandise', price: 20, description: 'Adjustable cap with embroidered logo', image: '', buttonText: 'ADD TO CART' },
    { id: 103, name: 'Brand Hoodie', category: 'merchandise', price: 60, description: 'Comfortable pullover hoodie', image: '', buttonText: 'ADD TO CART' }
  ],
  settings: [
    {
      id: 'afro-pulse',
      title: "AFRO PULSE '27",
      subtitle: "Every edition set to spark up summer seasons in Iceland. Sign up for the next experience, join our community to stay updated on newsletters and reserve your tickets for AFRO PULSE '27.",
      ticketUrl: '',
      ticketButtonText: 'Get Tickets',
      newsletterEndpoint: '',
      newsletterConfirmation: 'Thanks for subscribing! We’ll keep you updated.',
      galleryImages: [
        { id: 'img-1', src: 'assets/images/IMG_1566.JPG' },
        { id: 'img-2', src: 'assets/images/IMG_1521.JPG' },
        { id: 'img-3', src: 'assets/images/IMG_1427.JPG' },
        { id: 'img-4', src: 'assets/images/IMG_1081.JPG' },
        { id: 'img-5', src: 'assets/images/IMG_1027.JPG' },
        { id: 'img-6', src: 'assets/images/IMG_0971.JPG' },
        { id: 'img-7', src: 'assets/images/IMG_2128.JPG' },
        { id: 'img-8', src: 'assets/images/IMG_2060.JPG' }
      ],
      galleryVideos: []
    }
  ],
  orders: [],
  users: [ { id: 1, email: 'admin@eaudeplay.com', password: 'admin123', role: 'admin' } ],
  bookings: []
};

function normalizeSiteData(data) {
  const baseData = JSON.parse(JSON.stringify(DEFAULT_SITE_DATA));
  if (!data || typeof data !== 'object') return baseData;
  return {
    ...baseData,
    ...data,
    products: Array.isArray(data.products) ? data.products : baseData.products,
    merchandise: Array.isArray(data.merchandise) ? data.merchandise : baseData.merchandise,
    settings: Array.isArray(data.settings) ? data.settings : baseData.settings,
    orders: Array.isArray(data.orders) ? data.orders : baseData.orders,
    users: Array.isArray(data.users) ? data.users : baseData.users,
    bookings: Array.isArray(data.bookings) ? data.bookings : baseData.bookings
  };
}

function loadSiteData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return normalizeSiteData(parsed);
    }
  } catch (err) {
    console.error('Failed to load shared site data:', err);
  }
  saveSiteData(DEFAULT_SITE_DATA);
  return normalizeSiteData(DEFAULT_SITE_DATA);
}

function saveSiteData(data) {
  try {
    const normalizedData = normalizeSiteData(data);
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(normalizedData, null, 2));
    return true;
  } catch (err) {
    console.error('Failed to save shared site data:', err);
    return false;
  }
}

function getRuntimeConfigScript() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const stripePublicKey = process.env.VITE_STRIPE_PUBLIC_KEY || process.env.STRIPE_PUBLIC_KEY || '';
  const apiUrl = process.env.VITE_API_URL || process.env.API_URL || '';

  return `\n    <script>\n      window.__APP_CONFIG__ = {\n        supabaseUrl: ${JSON.stringify(supabaseUrl)},\n        supabaseAnonKey: ${JSON.stringify(supabaseAnonKey)},\n        stripePublicKey: ${JSON.stringify(stripePublicKey)},\n        apiUrl: ${JSON.stringify(apiUrl)}\n      };\n      window.__SUPABASE_CONFIG__ = {\n        url: ${JSON.stringify(supabaseUrl)},\n        anonKey: ${JSON.stringify(supabaseAnonKey)}\n      };\n    </script>\n  `;
}

function getSiteDataScript(siteData) {
  const jsonString = JSON.stringify(siteData);
  // escape closing script tags and comment openings to safely embed
  const escaped = jsonString.replace(new RegExp('</script', 'gi'), '<\\/script').replace(/<!--/g, '<\\!--');
  return `<script>window.__SITE_DATA__ = ${escaped};</script>`;
}

function injectRuntimeConfig(html, siteData) {
  const configScript = getRuntimeConfigScript();
  const dataScript = getSiteDataScript(siteData);
  if (html.includes('</head>')) return html.replace('</head>', `${configScript}${dataScript}</head>`);
  return html.replace('</body>', `${configScript}${dataScript}</body>`);
}

function getSupabaseStorageConfig() {
  return {
    url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    serviceKey: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    bucket: process.env.VITE_SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || 'uploads'
  };
}

function getContentTypeFromFilename(filename) {
  const ext = path.extname(filename).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

async function ensureSupabaseBucketExists(bucket, url, serviceKey) {
  const checkRes = await fetch(`${url}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey
    }
  });

  if (checkRes.ok) {
    let bucketInfo = null;
    try { bucketInfo = await checkRes.json(); } catch (err) { /* ignore */ }
    if (bucketInfo?.public !== true) {
      const patchRes = await fetch(`${url}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ public: true })
      });
      if (!patchRes.ok) {
        let detail = 'Unable to make Supabase bucket public';
        try { const errJson = await patchRes.json(); detail = errJson?.message || errJson?.error || detail; } catch (err) { /* ignore */ }
        throw new Error(detail);
      }
    }
    return;
  }

  if (checkRes.status !== 404) {
    let detail = 'Unable to verify Supabase bucket';
    try { const errJson = await checkRes.json(); detail = errJson?.message || errJson?.error || detail; } catch (err) { /* ignore */ }
    throw new Error(detail);
  }

  const createRes = await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: bucket, public: true })
  });

  if (!createRes.ok) {
    let detail = 'Unable to create Supabase bucket';
    try { const errJson = await createRes.json(); detail = errJson?.message || errJson?.error || detail; } catch (err) { /* ignore */ }
    throw new Error(detail);
  }
}

async function uploadToSupabaseStorage(filename, buffer) {
  const { url, serviceKey, bucket } = getSupabaseStorageConfig();
  if (!url || !serviceKey) throw new Error('Supabase Storage is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY (or the non-VITE equivalents) to your environment or .env file.');
  await ensureSupabaseBucketExists(bucket, url, serviceKey);
  const ext = path.extname(filename).toLowerCase() || '';
  const safeBase = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40) || 'file';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}${ext}`;
  const objectPath = `uploads/${uniqueName}`;
  const encodedPath = encodeURIComponent(objectPath).replace(/%2F/g, '/');

  const response = await fetch(`${url}/storage/v1/object/${bucket}/${encodedPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': getContentTypeFromFilename(filename),
      'x-upsert': 'true'
    },
    body: buffer
  });

  if (!response.ok) {
    let detail = 'Cloud upload failed';
    try { const errJson = await response.json(); detail = errJson?.message || errJson?.error || detail; } catch (err) { /* ignore */ }
    throw new Error(detail);
  }

  return `${url}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

function getLocalUploadPath(filename) {
  const ext = path.extname(filename).toLowerCase() || '.bin';
  const safeBase = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40) || 'file';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}${ext}`;
  return path.join(ROOT_DIR, 'assets', 'uploads', uniqueName);
}

async function uploadToLocalStorage(filename, buffer) {
  const uploadDir = path.join(ROOT_DIR, 'assets', 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });
  const dest = getLocalUploadPath(filename);
  fs.writeFileSync(dest, buffer);
  const rel = path.relative(ROOT_DIR, dest).replace(/\\/g, '/');
  return `/${rel}`;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e7) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// Minimal API handlers (site-data and bookings)
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // API: GET /api/site-data
    if (req.method === 'GET' && url.pathname === '/api/site-data') {
      const data = loadSiteData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    // API: POST /api/site-data
    if (req.method === 'POST' && url.pathname === '/api/site-data') {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || '{}');
      saveSiteData(parsed);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(loadSiteData()));
      return;
    }

    // API: GET /api/bookings
    if (req.method === 'GET' && url.pathname === '/api/bookings') {
      const data = loadSiteData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ bookings: data.bookings || [] }));
      return;
    }

    // API: POST /api/bookings
    if (req.method === 'POST' && url.pathname === '/api/bookings') {
      const body = await readRequestBody(req);
      const payload = JSON.parse(body || '{}');

      const site = loadSiteData();
      site.bookings = site.bookings || [];

      // Determine total from product price if not provided
      let total = payload.total;
      if (!total) {
        const prod = (site.products || []).find(p => p.id === payload.serviceId);
        total = prod ? prod.price : 0;
      }

      const booking = {
        id: payload.id || `bk-${Date.now()}`,
        serviceId: payload.serviceId,
        serviceName: payload.serviceName || '',
        where: payload.where,
        start: payload.start,
        total: total,
        payment: payload.payment || {},
        createdAt: new Date().toISOString()
      };

      site.bookings.push(booking);
      saveSiteData(site);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, booking }));
      return;
    }

    // Serve static files from ROOT_DIR
    let filePath = path.join(ROOT_DIR, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname));
    if (!filePath.startsWith(ROOT_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');

  } catch (err) {
    console.error('Server error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
