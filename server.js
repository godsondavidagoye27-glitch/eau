const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.join(__dirname, 'eau-de-play');
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

function injectRuntimeConfig(html) {
  const configScript = getRuntimeConfigScript();
  if (html.includes('</head>')) {
    return html.replace('</head>', `${configScript}</head>`);
  }
  return html.replace('</body>', `${configScript}</body>`);
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
      responseBody = Buffer.from(injectRuntimeConfig(html), 'utf8');
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(responseBody);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
