// ============================================
// COMPONENTS MODULE - Navbar & Footer Injection
// ============================================

const DEFAULT_FOOTER_LINKS = [
  { label: 'Instagram', href: 'https://www.instagram.com/deyplay.rvk?igsh=bjZ4ZTFhdDJlYzUw' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@eau.dey.play?_r=1&_t=ZN-97rkM4Xkbag' },
  { label: 'Email', href: 'mailto:eaudeyplay@gmail.com' }
];

export function createNavbar() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const isActive = (page) => currentPage === page ? 'active' : '';
  const cartActive = ['cart.html', 'checkout.html', 'checkout-success.html'].includes(currentPage) ? 'active' : '';

  return `
    <nav class="navbar">
      <div class="navbar-container">
        <div class="navbar-left">
          <div class="navbar-brand">
            <span class="brand-line">EAU DEY</span>
            <span class="brand-line brand-play">PLAY</span>
          </div>
        </div>

        <div class="navbar-center">
          <ul class="navbar-nav desktop-nav">
            <li><a href="index.html" class="${isActive('index.html')}">HOME</a></li>
            <li><a href="services.html" class="${isActive('services.html')}">SERVICES</a></li>
            <li><a href="shop.html" class="${isActive('shop.html')}">SHOP</a></li>
            <li><a href="about.html" class="${isActive('about.html')}">ABOUT</a></li>
            <li><a href="afro-pulse-27.html" class="${isActive('afro-pulse-27.html')}">AFRO PULSE</a></li>
            <li><a href="gallery.html" class="${isActive('gallery.html')}">GALLERY</a></li>
            <li><a href="contact.html" class="${isActive('contact.html')}">CONTACT</a></li>
          </ul>
        </div>

        <div class="navbar-right">
          <a href="cart.html" class="cart-link ${cartActive}">🛒 CART <span class="cart-count">0</span></a>
          <a href="auth.html" class="auth-link ${isActive('auth.html')}">LOGIN / SIGNUP</a>
          <a href="account.html" class="account-link ${isActive('account.html')}">ACCOUNT</a>
        </div>

        <button class="navbar-toggle" aria-label="Open navigation" aria-expanded="false">☰</button>
      </div>
    </nav>

    <div class="mobile-menu" id="mobile-menu">
      <div class="mobile-menu-panel">
        <button class="mobile-menu-close" aria-label="Close navigation">✕</button>
        <ul class="navbar-nav mobile-nav">
          <li><a href="index.html" class="${isActive('index.html')}">HOME</a></li>
          <li><a href="services.html" class="${isActive('services.html')}">SERVICES</a></li>
          <li><a href="shop.html" class="${isActive('shop.html')}">SHOP</a></li>
          <li><a href="about.html" class="${isActive('about.html')}">ABOUT</a></li>
          <li><a href="afro-pulse-27.html" class="${isActive('afro-pulse-27.html')}">AFRO PULSE</a></li>
          <li><a href="gallery.html" class="${isActive('gallery.html')}">GALLERY</a></li>
          <li><a href="contact.html" class="${isActive('contact.html')}">CONTACT</a></li>
          <li><a href="cart.html" class="cart-link ${cartActive}">🛒 CART <span class="cart-count">0</span></a></li>
          <li><a href="auth.html" class="auth-link ${isActive('auth.html')}">LOGIN / SIGNUP</a></li>
          <li><a href="account.html" class="account-link ${isActive('account.html')}">ACCOUNT</a></li>
        </ul>
      </div>
    </div>
  `;
}

export function createFooter() {
  const defaultLinks = [
    { label: 'Instagram', href: 'https://www.instagram.com/deyplay.rvk?igsh=bjZ4ZTFhdDJlYzUw' },
    { label: 'TikTok', href: 'https://www.tiktok.com/@eau.dey.play?_r=1&_t=ZN-97rkM4Xkbag' },
    { label: 'Email', href: 'mailto:eaudeyplay@gmail.com' }
  ];

  const siteData = typeof window !== 'undefined' ? window.__SITE_DATA__ : null;
  const footerLinks = Array.isArray(siteData?.footerLinks) ? siteData.footerLinks : defaultLinks;

  const linkHtml = footerLinks.map((link) => {
    const href = String(link.href || '').trim();
    const label = String(link.label || '').trim() || href;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  }).join('');

  return `
    <footer class="site-footer">
      <div class="site-footer-inner container">
        <nav class="footer-links">
          ${linkHtml}
        </nav>
      </div>
    </footer>
  `;
}

export function injectNavbarAndFooter(showFooter = false) {
  const body = document.body;
  if (body && body.dataset.navInjected === 'true') {
    return;
  }

  // Inject Navbar
  const navbarPlaceholder = document.getElementById('navbar-placeholder');
  if (navbarPlaceholder) {
    navbarPlaceholder.innerHTML = createNavbar();
  }

  // Inject or replace footer with quick links
  const footerPlaceholder = document.getElementById('footer-placeholder');
  const footerHtml = createFooter();
  if (footerPlaceholder) {
    footerPlaceholder.innerHTML = footerHtml;
  } else {
    // append footer at end of body if no placeholder
    const existing = document.querySelector('footer.site-footer');
    if (!existing) {
      const div = document.createElement('div');
      div.innerHTML = footerHtml;
      document.body.appendChild(div.firstElementChild);
    }
  }

  if (body) {
    body.dataset.navInjected = 'true';
  }
  
  // Add navbar toggle behavior for mobile
  const toggle = document.querySelector('.navbar-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const closeButton = document.querySelector('.mobile-menu-close');

  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  if (closeButton && mobileMenu && toggle) {
    closeButton.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  }

  if (mobileMenu) {
    const navLinks = mobileMenu.querySelectorAll('a');
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Listen for auth events to update auth/account links
  function refreshAuthLinks(user) {
    const authLink = document.querySelector('.auth-link');
    const accountLink = document.querySelector('.account-link');
    const cartCount = document.querySelector('.cart-count');
    if (user) {
      if (authLink) authLink.textContent = 'LOGOUT';
      if (accountLink) accountLink.textContent = (user.email || 'ACCOUNT');
    } else {
      if (authLink) authLink.textContent = 'LOGIN / SIGNUP';
      if (accountLink) accountLink.textContent = 'ACCOUNT';
    }

    // ensure cart badge persists
    if (cartCount && window.cartManager) {
      window.cartManager.updateCartBadge();
    }
  }

  window.addEventListener('userLoggedIn', (e) => refreshAuthLinks(e.detail));
  window.addEventListener('userLoggedOut', () => refreshAuthLinks(null));

  // Initialize auth links from existing localStorage or Supabase session
  (async function initializeAuthLinks() {
    try {
      const stored = localStorage.getItem('eau-de-play-current-user') || localStorage.getItem('eau-de-play-user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          refreshAuthLinks(user);
        } catch (e) {
          // ignore parse errors
        }
      }

      // attempt to sync with Supabase auth if available
      try {
        const mod = await import('./supabase-auth.js');
        const supAuth = mod.supabaseAuth || mod.default;
        if (supAuth && typeof supAuth.getCurrentUser === 'function') {
          const user = await supAuth.getCurrentUser();
          if (user) refreshAuthLinks(user);
        }
      } catch (err) {
        // Supabase auth may not be available on this page - that's fine
      }
    } catch (err) {
      console.warn('Failed to initialize auth links', err);
    }
  })();

  // Wire auth link to perform logout if user is logged in
  const authLinkEl = document.querySelector('.auth-link');
  if (authLinkEl) {
    authLinkEl.addEventListener('click', async (ev) => {
      // If link shows LOGOUT, sign out via supabase-auth
      if (authLinkEl.textContent.trim() === 'LOGOUT') {
        try {
          const { supabaseAuth } = await import('./supabase-auth.js');
          await supabaseAuth.signOut();
        } catch (err) {
          console.error('Logout failed:', err);
        }
        ev.preventDefault();
      }
    });
  }
}

export default { createNavbar, createFooter, injectNavbarAndFooter };
