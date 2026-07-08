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
  '.map': 'application/json; charset=utf-8'
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
};

function loadSiteData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load shared site data:', err);
  }

  saveSiteData(DEFAULT_SITE_DATA);
  return DEFAULT_SITE_DATA;
}

function saveSiteData(data) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
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

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(requestUrl.pathname);

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
            saveSiteData(payload.data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: payload.data }));
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
