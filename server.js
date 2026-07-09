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
    {
      id: 1,
      name: 'Premium DJ Services',
      category: 'service',
      price: 500,
      description: 'Professional DJ services for events',
      image: "",
      buttonText: 'BOOK'
    },
    {
      id: 2,
      name: 'Photography & Videography',
      category: 'service',
      price: 500,
      description: 'Professional photography and videography packages',
      image: "",
      buttonText: 'BOOK'
    },
    {
      id: 3,
      name: 'Event Planning',
      category: 'service',
      price: 12000,
      description: 'Complete event planning and coordination',
      image: "",
      buttonText: 'BOOK'
    },
    {
      id: 4,
      name: 'Sports Solutions',
      category: 'service',
      price: 500,
      description: 'Sports event management and coverage',
      image: "",
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
      image: "",
      buttonText: 'ADD TO CART'
    },
    {
      id: 102,
      name: 'Eau de Play Cap',
      category: 'merchandise',
      price: 20,
      description: 'Adjustable cap with embroidered logo',
      image: "",
      buttonText: 'ADD TO CART'
    },
    {
      id: 103,
      name: 'Brand Hoodie',
      category: 'merchandise',
      price: 60,
      description: 'Comfortable pullover hoodie',
      image: "",
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
      galleryVideos: []
    }
  ],
  orders: [],
  users: [
    { id: 1, email: 'admin@eaudeplay.com', password: 'admin123', role: 'admin' }
  ],
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
  const json = JSON.stringify(siteData).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  return `<script>window.__SITE_DATA__ = ${json};</script>`;
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
The file was created.