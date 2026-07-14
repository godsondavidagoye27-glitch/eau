const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.join(__dirname, 'eau-de-play');
const DATA_FILE = path.join(__dirname, 'data', 'site-data.json');
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_SENDER = process.env.RESEND_SENDER || 'newsletter@yourdomain.com';
const BOOKING_EMAIL_RECIPIENT = process.env.BOOKING_EMAIL_RECIPIENT || process.env.RESEND_TO_EMAIL || 'eaudeyplay@gmail.com';

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
  homeHero: {
    title: 'EAU DEY PLAY',
    subtitle: 'We bring premium entertainment experiences to every event, festival, and party. Book our DJ services, photography, or full event planning for an unforgettable vibe.',
    buttonText: 'Book Now',
    buttonUrl: 'contact.html'
  },
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
  draft: {},
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
    homeHero: typeof data.homeHero === 'object' && data.homeHero !== null ? { ...baseData.homeHero, ...data.homeHero } : baseData.homeHero,
    settings: Array.isArray(data.settings) ? data.settings : baseData.settings,
    orders: Array.isArray(data.orders) ? data.orders : baseData.orders,
    users: Array.isArray(data.users) ? data.users : baseData.users,
    bookings: Array.isArray(data.bookings) ? data.bookings : baseData.bookings
  };
}

function normalizeBookingStatus(status) {
  const value = String(status || '').toLowerCase();
  if (['paid', 'confirmed', 'complete', 'completed', 'success', 'succeeded'].includes(value)) {
    return 'confirmed';
  }
  if (['cancelled', 'canceled', 'cancel', 'failed', 'error'].includes(value)) {
    return 'cancelled';
  }
  return 'pending';
}

function normalizeOrderStatus(status) {
  const value = String(status || '').toLowerCase();
  if (['paid', 'confirmed', 'complete', 'completed', 'success', 'succeeded'].includes(value)) {
    return 'paid';
  }
  if (['cancelled', 'canceled', 'cancel', 'failed', 'error'].includes(value)) {
    return 'cancelled';
  }
  return 'pending';
}

function findBooking(site, bookingId) {
  return (site.bookings || []).find((booking) => String(booking.id) === String(bookingId));
}

function updateBooking(site, bookingId, updates) {
  const booking = findBooking(site, bookingId);
  if (!booking) return null;

  const paymentStatus = updates.paymentStatus || booking.payment?.status || 'pending';
  const nextStatus = normalizeBookingStatus(updates.status || paymentStatus);

  booking.status = nextStatus;
  booking.payment = {
    ...(booking.payment || {}),
    ...(updates.payment || {}),
    status: paymentStatus,
    system: updates.paymentSystem || booking.payment?.system || 'paypal',
    updatedAt: new Date().toISOString()
  };
  booking.updatedAt = new Date().toISOString();

  if (updates.notes) {
    booking.notes = updates.notes;
  }

  return booking;
}

function findOrder(site, orderId) {
  return (site.orders || []).find((order) => String(order.id) === String(orderId));
}

function updateOrder(site, orderId, updates) {
  const order = findOrder(site, orderId);
  if (!order) return null;

  const paymentStatus = updates.paymentStatus || order.payment_status || order.paymentStatus || 'pending';
  const nextStatus = normalizeOrderStatus(updates.status || paymentStatus);

  order.status = nextStatus;
  order.payment_status = paymentStatus;
  order.payment_method = updates.paymentMethod || order.payment_method || 'paypal';
  order.updated_at = new Date().toISOString();
  order.notes = updates.notes || order.notes || '';

  return order;
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

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) {
    console.warn('Resend API key missing; email notification was not sent.');
    return { success: false, skipped: true, reason: 'missing_api_key' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: RESEND_SENDER,
      to,
      subject,
      html
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Failed to send email');
  }

  return { success: true, response: await response.json() };
}

async function sendBookingEmail(booking) {
  if (!booking || !booking.id) return { success: false, skipped: true, reason: 'invalid_booking' };

  const adminHtml = `
    <h2>New booking received</h2>
    <p>A new booking was submitted through PayPal.</p>
    <ul>
      <li><strong>Booking ID:</strong> ${booking.id}</li>
      <li><strong>Booker:</strong> ${booking.customerName || 'N/A'}</li>
      <li><strong>Phone:</strong> ${booking.customerPhone || 'N/A'}</li>
      <li><strong>Email:</strong> ${booking.customerEmail || 'N/A'}</li>
      <li><strong>Service:</strong> ${booking.serviceName || 'N/A'}</li>
      <li><strong>Location:</strong> ${booking.where || 'N/A'}</li>
      <li><strong>Start:</strong> ${booking.start || 'N/A'}</li>
      <li><strong>Total:</strong> €${Number(booking.total || 0).toFixed(2)}</li>
      <li><strong>Status:</strong> ${booking.status || 'pending'}</li>
    </ul>
  `;

  const customerHtml = `
    <h2>Your booking is on the way</h2>
    <p>Thanks for booking with EAU DEY PLAY. We have received your request and will be in touch soon.</p>
    <ul>
      <li><strong>Confirmation number:</strong> ${booking.id}</li>
      <li><strong>Service:</strong> ${booking.serviceName || 'N/A'}</li>
      <li><strong>Location:</strong> ${booking.where || 'N/A'}</li>
      <li><strong>Start:</strong> ${booking.start || 'N/A'}</li>
      <li><strong>Total:</strong> €${Number(booking.total || 0).toFixed(2)}</li>
    </ul>
  `;

  const adminResult = await sendEmail(BOOKING_EMAIL_RECIPIENT, `New booking received - ${booking.id}`, adminHtml);
  const customerResult = booking.customerEmail ? await sendEmail(booking.customerEmail, `Booking confirmation ${booking.id}`, customerHtml) : { success: false, skipped: true, reason: 'missing_customer_email' };

  return { success: adminResult.success || customerResult.success, adminResult, customerResult };
}

async function sendOrderEmail(order) {
  if (!order || !order.id) return { success: false, skipped: true, reason: 'invalid_order' };

  const adminHtml = `
    <h2>New cart order received</h2>
    <p>A new cart order was submitted through PayPal.</p>
    <ul>
      <li><strong>Order ID:</strong> ${order.id}</li>
      <li><strong>Customer:</strong> ${order.customerName || 'N/A'}</li>
      <li><strong>Phone:</strong> ${order.phone || 'N/A'}</li>
      <li><strong>Email:</strong> ${order.email || 'N/A'}</li>
      <li><strong>Total:</strong> €${Number(order.total || 0).toFixed(2)}</li>
      <li><strong>Status:</strong> ${order.status || 'pending'}</li>
    </ul>
  `;

  const customerHtml = `
    <h2>Your order is confirmed</h2>
    <p>Thank you for shopping with EAU DEY PLAY. Your order is now being processed.</p>
    <ul>
      <li><strong>Confirmation number:</strong> ${order.id}</li>
      <li><strong>Total:</strong> €${Number(order.total || 0).toFixed(2)}</li>
      <li><strong>Delivery address:</strong> ${[order.address, order.city, order.state, order.zip, order.country].filter(Boolean).join(', ') || 'N/A'}</li>
    </ul>
  `;

  const adminResult = await sendEmail(BOOKING_EMAIL_RECIPIENT, `New order received - ${order.id}`, adminHtml);
  const customerResult = order.email ? await sendEmail(order.email, `Order confirmation ${order.id}`, customerHtml) : { success: false, skipped: true, reason: 'missing_customer_email' };

  return { success: adminResult.success || customerResult.success, adminResult, customerResult };
}

function getRuntimeConfigScript() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';
  const paypalBusinessEmail = process.env.PAYPAL_BUSINESS_EMAIL || process.env.VITE_PAYPAL_BUSINESS_EMAIL || '';
  const apiUrl = process.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';

  return `\n    <script>\n      window.__APP_CONFIG__ = {\n        supabaseUrl: ${JSON.stringify(supabaseUrl)},\n        supabaseAnonKey: ${JSON.stringify(supabaseAnonKey)},\n        paypalBusinessEmail: ${JSON.stringify(paypalBusinessEmail)},\n        apiUrl: ${JSON.stringify(apiUrl)}\n      };\n      window.__SUPABASE_CONFIG__ = {\n        url: ${JSON.stringify(supabaseUrl)},\n        anonKey: ${JSON.stringify(supabaseAnonKey)}\n      };\n    </script>\n  `;
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

    // API: GET /api/config
    if (req.method === 'GET' && url.pathname === '/api/config') {
      const config = {
        supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || '',
        supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '',
        paypalBusinessEmail: process.env.PAYPAL_BUSINESS_EMAIL || process.env.VITE_PAYPAL_BUSINESS_EMAIL || '',
        apiUrl: process.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || ''
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(config));
      return;
    }

    // API: GET /api/bookings
    if (req.method === 'GET' && url.pathname === '/api/bookings') {
      const data = loadSiteData();
      const bookingId = url.searchParams.get('id');
      const bookings = data.bookings || [];
      if (bookingId) {
        const booking = bookings.find((item) => String(item.id) === String(bookingId));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: !!booking, booking: booking || null }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ bookings }));
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

      const initialStatus = normalizeBookingStatus(payload.payment?.status || payload.paymentStatus || 'pending');
      const booking = {
        id: payload.id || `bk-${Date.now()}`,
        serviceId: payload.serviceId,
        serviceName: payload.serviceName || '',
        where: payload.where,
        start: payload.start,
        total: total,
        customerName: payload.customerName || '',
        customerPhone: payload.customerPhone || '',
        customerEmail: payload.customerEmail || '',
        payment: payload.payment || {},
        status: initialStatus,
        createdAt: new Date().toISOString()
      };

      site.bookings.push(booking);
      saveSiteData(site);

      try {
        await sendBookingEmail(booking);
      } catch (err) {
        console.warn('Booking confirmation email failed:', err.message);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, booking }));
      return;
    }

    // API: POST /api/bookings/status
    if (req.method === 'POST' && url.pathname === '/api/bookings/status') {
      try {
        const body = await readRequestBody(req);
        const payload = JSON.parse(body || '{}');
        const site = loadSiteData();
        const existingBooking = findBooking(site, payload.bookingId);
        const updated = updateBooking(site, payload.bookingId, {
          paymentStatus: payload.paymentStatus,
          status: payload.status,
          paymentSystem: payload.paymentSystem || 'paypal',
          notes: payload.notes || ''
        });

        if (!updated) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Booking not found' }));
          return;
        }

        saveSiteData(site);

        if (updated.status === 'confirmed' && existingBooking?.status !== 'confirmed') {
          try {
            await sendBookingEmail(updated);
          } catch (err) {
            console.warn('Booking confirmation email failed:', err.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, booking: updated }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    // API: POST /api/orders
    if (req.method === 'POST' && url.pathname === '/api/orders') {
      try {
        const body = await readRequestBody(req);
        const payload = JSON.parse(body || '{}');
        const site = loadSiteData();
        site.orders = site.orders || [];

        const order = {
          id: payload.id || `ORD-${Date.now()}`,
          customerName: payload.customerName || '',
          email: payload.email || '',
          phone: payload.phone || '',
          address: payload.address || '',
          city: payload.city || '',
          state: payload.state || '',
          zip: payload.zip || '',
          country: payload.country || '',
          items: payload.items || [],
          subtotal: Number(payload.subtotal || 0),
          shipping: Number(payload.shipping || 0),
          tax: Number(payload.tax || 0),
          total: Number(payload.total || 0),
          date: payload.date || new Date().toISOString(),
          status: normalizeOrderStatus(payload.status || 'pending'),
          payment: payload.payment || 'paypal',
          payment_method: payload.payment_method || 'paypal',
          payment_status: normalizeOrderStatus(payload.payment_status || 'pending'),
          notes: payload.notes || '',
          created_at: payload.created_at || new Date().toISOString()
        };

        site.orders.push(order);
        saveSiteData(site);

        try {
          await sendOrderEmail(order);
        } catch (err) {
          console.warn('Order confirmation email failed:', err.message);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, order }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    // API: GET /api/orders
    if (req.method === 'GET' && url.pathname === '/api/orders') {
      const data = loadSiteData();
      const orderId = url.searchParams.get('id');
      const orders = data.orders || [];
      if (orderId) {
        const order = orders.find((item) => String(item.id) === String(orderId));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: !!order, order: order || null }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ orders }));
      return;
    }

    // API: POST /api/orders/status
    if (req.method === 'POST' && url.pathname === '/api/orders/status') {
      try {
        const body = await readRequestBody(req);
        const payload = JSON.parse(body || '{}');
        const site = loadSiteData();
        const updated = updateOrder(site, payload.orderId, {
          paymentStatus: payload.paymentStatus,
          status: payload.status,
          paymentMethod: payload.paymentMethod || 'paypal',
          notes: payload.notes || ''
        });

        if (!updated) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Order not found' }));
          return;
        }

        saveSiteData(site);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, order: updated }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    // API: POST /api/paypal/verify
    if (req.method === 'POST' && url.pathname === '/api/paypal/verify') {
      try {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'PayPal confirmation is handled by the checkout redirect flow.' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    // API: POST /api/newsletter (Resend integration)
    if (req.method === 'POST' && url.pathname === '/api/newsletter') {
      try {
        const body = await readRequestBody(req);
        const parsed = JSON.parse(body || '{}');
        const email = parsed.email || '';

        if (!email || !email.includes('@')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid email address' }));
          return;
        }

        if (!RESEND_API_KEY) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Newsletter service not configured' }));
          return;
        }

        // Send email via Resend
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: RESEND_SENDER,
            to: email,
            subject: 'Welcome to AFRO PULSE Newsletter',
            html: `
              <h2>Welcome to AFRO PULSE '27!</h2>
              <p>Thank you for subscribing to our newsletter.</p>
              <p>We'll keep you updated on the latest news, events, and exclusive offers from EAU DEY PLAY and AFRO PULSE.</p>
              <p>Stay tuned!</p>
            `
          })
        });

        const resendData = await resendRes.json();

        if (!resendRes.ok) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: resendData.message || 'Failed to subscribe' 
          }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Successfully subscribed to newsletter',
          emailId: resendData.id 
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    // API: POST /api/upload (Media uploads)
    if (req.method === 'POST' && url.pathname === '/api/upload') {
      try {
        const body = await readRequestBody(req);
        const parsed = JSON.parse(body || '{}');
        const { filename, data } = parsed;

        if (!filename || !data) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Missing filename or data' }));
          return;
        }

        // Extract base64 data (handle data URLs)
        let base64Data = data;
        if (data.includes(',')) {
          base64Data = data.split(',')[1];
        }

        // Decode base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64');

        // Save to local storage or Supabase
        let uploadUrl;
        try {
          uploadUrl = await uploadToSupabaseStorage(filename, buffer);
        } catch (e) {
          console.log('Supabase upload failed, falling back to local storage:', e.message);
          uploadUrl = await uploadToLocalStorage(filename, buffer);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, url: uploadUrl }));
      } catch (err) {
        console.error('Upload error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
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
      let content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      if (ext === '.html' || ext === '.htm') {
        try {
          const html = content.toString('utf8');
          const injected = injectRuntimeConfig(html, loadSiteData());
          res.end(injected);
          return;
        } catch (err) {
          // fallback to raw content
        }
      }
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
