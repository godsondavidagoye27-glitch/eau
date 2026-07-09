const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.join(__dirname, 'eau-de-play');
const DATA_FILE = path.join(__dirname, 'data', 'site-data.json');
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_SENDER = process.env.RESEND_SENDER || 'newsletter@yourdomain.com';

function loadEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return;

    const [, key, rawValue] = match;
    let value = rawValue.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

[
  path.join(__dirname, '.env'),
  path.join(__dirname, '.env.local'),
  path.join(__dirname, 'eau-de-play', '.env'),
  path.join(__dirname, 'eau-de-play', '.env.local')
].forEach(loadEnvFile);

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
    {
      id: 1,
      name: 'Premium DJ Services',
      category: 'service',
      price: 500,
      description: 'Professional DJ services for events',
      image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f5f5' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%23999'%3EDIJ Service%3C/text%3E%3C/svg%3E",
      buttonText: 'BOOK'
    },
    {
      id: 2,
      name: 'Photography & Videography',
      category: 'service',
      price: 800,
      description: 'Professional photography and videography packages',
      image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f5f5' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%23999'%3EPhoto/Video%3C/text%3E%3C/svg%3E",
      buttonText: 'BOOK'
    },
    {
      id: 3,
      name: 'Event Planning',
      category: 'service',
      price: 1200,
      description: 'Complete event planning and coordination',
      image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f5f5' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%23999'%3EEvent Planning%3C/text%3E%3C/svg%3E",
      buttonText: 'BOOK'
    },
    {
      id: 4,
      name: 'Sports Solutions',
      category: 'service',
      price: 600,
      description: 'Sports event management and coverage',
      image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f5f5' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%23999'%3ESports%3C/text%3E%3C/svg%3E",
      buttonText: 'BOOK'
    }
  ],
  merchandise: [
    {
      id: 101,
      name: 'Eau de Kack T-Shirt',
      category: 'merchandise',
      price: 25,
      description: 'Premium cotton t-shirt with logo',
      image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f5f5' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%23999'%3ET-Shirt%3C/text%3E%3C/svg%3E",
      buttonText: 'ADD TO CART'
    },
    {
      id: 102,
      name: 'Eau de Play Cap',
      category: 'merchandise',
      price: 20,
      description: 'Adjustable cap with embroidered logo',
      image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f5f5' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%23999'%3ECap%3C/text%3E%3C/svg%3E",
      buttonText: 'ADD TO CART'
    },
    {
      id: 103,
      name: 'Brand Hoodie',
      category: 'merchandise',
      price: 60,
      description: 'Comfortable pullover hoodie',
      image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f5f5' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%23999'%3EHoodie%3C/text%3E%3C/svg%3E",
      buttonText: 'ADD TO CART'
    }
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
      galleryVideos: Array.from({ length: 3 }, (_, index) => ({ id: `vid-${index + 1}`, embedUrl: '' }))
    }
  ],
  orders: [
    {
      id: 1001,
      customerName: 'John Doe',
      email: 'john@example.com',
      productId: 1,
      quantity: 1,
      total: 500,
      date: new Date().toISOString(),
      status: 'Pending'
    }
  ],
  users: [
    {
      id: 1,
      email: 'admin@eaudeplay.com',
      password: 'admin123',
      role: 'admin'
    }
  ]
  ,
  bookings: []
};

function normalizeSiteData(data) {
  const baseData = JSON.parse(JSON.stringify(DEFAULT_SITE_DATA));
  if (!data || typeof data !== 'object') {
    return baseData;
  }

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
      if (parsed && typeof parsed === 'object') {
        return normalizeSiteData(parsed);
      }
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

  return `
    <script>
      window.__APP_CONFIG__ = {
        supabaseUrl: ${JSON.stringify(supabaseUrl)},
        supabaseAnonKey: ${JSON.stringify(supabaseAnonKey)},
        stripePublicKey: ${JSON.stringify(stripePublicKey)},
        apiUrl: ${JSON.stringify(apiUrl)}
      };
      window.__SUPABASE_CONFIG__ = {
        url: ${JSON.stringify(supabaseUrl)},
        anonKey: ${JSON.stringify(supabaseAnonKey)}
      };
    </script>
  `;
}

function getSiteDataScript(siteData) {
  // Safely serialize site data to avoid prematurely closing the script tag
  const json = JSON.stringify(siteData)
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--');
  return `<script>window.__SITE_DATA__ = ${json};</script>`;
}

function injectRuntimeConfig(html, siteData) {
  const configScript = getRuntimeConfigScript();
  const dataScript = getSiteDataScript(siteData);
  if (html.includes('</head>')) {
    return html.replace('</head>', `${configScript}${dataScript}</head>`);
  }
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
    try {
      bucketInfo = await checkRes.json();
    } catch (err) {
      // ignore
    }

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
        try {
          const errJson = await patchRes.json();
          detail = errJson?.message || errJson?.error || detail;
        } catch (err) {
          // ignore
        }
        throw new Error(detail);
      }
    }

    return;
  }

  if (checkRes.status !== 404) {
    let detail = 'Unable to verify Supabase bucket';
    try {
      const errJson = await checkRes.json();
      detail = errJson?.message || errJson?.error || detail;
    } catch (err) {
      // ignore
    }
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
    try {
      const errJson = await createRes.json();
      detail = errJson?.message || errJson?.error || detail;
    } catch (err) {
      // ignore
    }
    throw new Error(detail);
  }
}

async function uploadToSupabaseStorage(filename, buffer) {
  const { url, serviceKey, bucket } = getSupabaseStorageConfig();

  if (!url || !serviceKey) {
    throw new Error('Supabase Storage is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY (or the non-VITE equivalents) to your environment or .env file.');
  }

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
    try {
      const errJson = await response.json();
      detail = errJson?.message || errJson?.error || detail;
    } catch (err) {
      // ignore
    }
    throw new Error(detail);
  }

  return `${url}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

function getLocalUploadPath(filename) {
  const ext = path.extname(filename).toLowerCase() || '.bin';
  const safeBase = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40) || 'file';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}${ext}`;
  const uploadDir = path.join(ROOT_DIR, 'assets', 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });
  return {
    uploadDir,
    filePath: path.join(uploadDir, uniqueName)
  };
}

function uploadToLocalStorage(filename, buffer) {
  const { filePath } = getLocalUploadPath(filename);
  fs.writeFileSync(filePath, buffer);
  return `/assets/uploads/${path.basename(filePath)}`;
}

async function uploadMedia(filename, buffer, requestUrl) {
  try {
    return {
      url: await uploadToSupabaseStorage(filename, buffer),
      storage: 'supabase'
    };
  } catch (err) {
    console.warn('Supabase upload failed, falling back to local storage:', err.message || err);
    return {
      url: uploadToLocalStorage(filename, buffer),
      storage: 'local'
    };
  }
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(requestUrl.pathname);

  // Bookings API
  if (pathname === '/api/bookings') {
    if (req.method === 'GET') {
      const id = requestUrl.searchParams.get('id');
      const data = loadSiteData();
      const items = data.bookings || [];
      if (id) {
        const item = items.find(b => b.id === id);
        if (item) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, booking: item }));
          return;
        }
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Booking not found' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, bookings: items }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1e6) req.destroy();
      });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const required = ['serviceId', 'where', 'start', 'hours', 'total'];
          for (const r of required) {
            if (payload[r] === undefined || payload[r] === null) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: `Missing required field: ${r}` }));
              return;
            }
          }

          const site = loadSiteData();
          site.bookings = site.bookings || [];
          const booking = {
            id: payload.id || `bk-${Date.now()}`,
            serviceId: payload.serviceId,
            serviceName: payload.serviceName || '',
            where: payload.where,
            start: payload.start,
            hours: payload.hours,
            ratePerHour: payload.ratePerHour || 0,
            total: payload.total,
            payment: payload.payment || {},
            createdAt: new Date().toISOString()
          };

          // If Stripe secret is present and a paymentIntentId was provided,
          // attempt to fetch limited card details (last4) for display only.
          const stripeSecret = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY || '';
          if (stripeSecret && booking.payment && booking.payment.paymentIntentId) {
            try {
              const Stripe = require('stripe');
              const stripe = Stripe(stripeSecret);
              const pi = await stripe.paymentIntents.retrieve(booking.payment.paymentIntentId);
              const card = pi.charges && pi.charges.data && pi.charges.data[0] && pi.charges.data[0].payment_method_details && pi.charges.data[0].payment_method_details.card;
              if (card && card.last4) {
                booking.payment.cardLast4 = card.last4;
                booking.payment.paymentStatus = pi.status;
              }
            } catch (err) {
              console.warn('Failed to fetch payment intent details:', err && err.message);
            }
          }

          site.bookings.push(booking);
          saveSiteData(site);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, booking }));
        } catch (err) {
          console.error('Bookings endpoint error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Server error' }));
        }
      });
      return;
    }
  }

  if (pathname === '/api/create-payment-intent' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const amount = parseInt(payload.amount, 10);
        if (!amount || amount <= 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid amount' }));
          return;
        }

        const stripeSecret = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY || '';
        if (!stripeSecret) {
          res.writeHead(501, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Stripe not configured on server' }));
          return;
        }

        const Stripe = require('stripe');
        const stripe = Stripe(stripeSecret);
        const pi = await stripe.paymentIntents.create({
          amount: amount,
          currency: payload.currency || 'usd',
          metadata: payload.metadata || {}
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, clientSecret: pi.client_secret, id: pi.id }));
      } catch (err) {
        console.error('Create Payment Intent error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server error' }));
      }
    });
    return;
  }

  if (pathname === '/api/newsletter' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
      }
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const email = (payload.email || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid email address' }));
          return;
        }

        if (!RESEND_API_KEY) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Resend API key is not configured' }));
          return;
        }

        const sendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: RESEND_SENDER,
            to: email,
            subject: 'Thanks for subscribing!',
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
                <h1>Thanks for subscribing!</h1>
                <p>You are now signed up to receive updates from EAU DEY PLAY.</p>
                <p>We’ll keep you posted with event news, tickets, and special offers.</p>
              </div>
            `
          })
        });

        if (!sendRes.ok) {
          const errorText = await sendRes.text();
          console.error('Resend error:', errorText);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to send newsletter confirmation' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error('Newsletter endpoint error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server error' }));
      }
    });

    return;
  }

  if (pathname === '/api/upload' && req.method === 'POST') {
    const chunks = [];
    let size = 0;
    const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100MB
    let aborted = false;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_UPLOAD_SIZE) {
        aborted = true;
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });

    req.on('end', async () => {
      if (aborted) return;
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        const payload = JSON.parse(body || '{}');
        const filename = (payload.filename || 'upload').toString();
        const rawData = (payload.data || '').toString();

        if (!rawData) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No file data provided' }));
          return;
        }

        const match = rawData.match(/^data:(.+);base64,(.*)$/s);
        const base64 = match ? match[2] : rawData;
        const buffer = Buffer.from(base64, 'base64');

        const { url: publicUrl, storage } = await uploadMedia(filename, buffer, requestUrl);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, url: publicUrl, storage }));
      } catch (err) {
        console.error('Upload endpoint error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Server error while uploading file' }));
      }
    });

    req.on('error', (err) => {
      console.error('Upload request error:', err);
    });

    return;
  }

  if (pathname === '/api/site-data') {

    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(loadSiteData()));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1e6) {
          req.destroy();
        }
      });

      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          if (payload.data && typeof payload.data === 'object') {
            const normalizedData = normalizeSiteData(payload.data);
            saveSiteData(normalizedData);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: normalizedData }));
            return;
          }

          if (payload.collection && payload.id && payload.updates) {
            const data = loadSiteData();
            const items = data[payload.collection] || [];
            const index = items.findIndex(item => item.id === payload.id);
            if (index !== -1) {
              items[index] = { ...items[index], ...payload.updates };
              data[payload.collection] = items;
              saveSiteData(data);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, data }));
              return;
            }
          }

          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid site data payload' }));
        } catch (err) {
          console.error('Site data endpoint error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Server error' }));
        }
      });
      return;
    }
  }

  if (pathname === '/') {
    pathname = '/index.html';
  }

  const relativePath = pathname.replace(/^\/+/, '');
  let filePath = path.join(ROOT_DIR, relativePath);

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath)) {
    if (fs.existsSync(path.join(filePath, 'index.html'))) {
      filePath = path.join(filePath, 'index.html');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
      return;
    }

    let responseBody = data;
    if (contentType.startsWith('text/html')) {
      const html = data.toString('utf8');
      const siteData = loadSiteData();
      responseBody = Buffer.from(injectRuntimeConfig(html, siteData), 'utf8');
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(responseBody);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
