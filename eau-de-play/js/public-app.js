// ============================================
// PUBLIC APP MODULE - DOM Manipulation for Public Pages
// ============================================

import Database from './db.js';
import { injectNavbarAndFooter } from './components.js';
import { subscribeToTable } from './supabase.js';

export class PublicApp {
  constructor() {
    this.db = new Database();
    this.syncInterval = null;
    this.gallerySlideshowInterval = null;
    this.hasInitialRender = false;
    this.init();
  }

  init() {
    // Inject navbar/footer first
    injectNavbarAndFooter();
    
    // Render immediately with the latest live data once available
    this.setupPageSpecificLogic();
    this.hasInitialRender = true;

    // Setup event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('siteDataUpdated', () => {
        this.syncSharedData();
      });
    }

    // Start periodic sync
    this.startSharedDataSync();
    
    // Fetch latest data in background (non-blocking)
    this.fetchLatestData();

    // Realtime subscription to site_data (if Supabase is configured)
    this.setupRealtimeSiteData();
  }

  setupRealtimeSiteData() {
    if (typeof subscribeToTable !== 'function') return;
    try {
      const channel = subscribeToTable('site_data', (payload) => {
        try {
          console.debug('[public-app] realtime site_data payload', payload);
          const newRec = payload?.new;
          if (newRec && newRec.content) {
            // Accept object content or JSON string
            const content = typeof newRec.content === 'string' ? JSON.parse(newRec.content) : newRec.content;
            this.db.syncFromServerData(content);
          } else {
            // fallback: trigger fetch
            this.fetchLatestData();
          }
        } catch (e) {
          console.warn('Failed to apply realtime site_data payload', e);
          this.fetchLatestData();
        }
      });

      window.addEventListener('beforeunload', () => { try { channel?.unsubscribe?.(); } catch (e) { } });
      this._siteDataChannel = channel;
    } catch (err) {
      console.warn('Failed to setup realtime site_data subscription', err);
    }
  }

  async fetchLatestData() {
    try {
      const supabaseContent = await this.db.fetchSiteDataFromSupabase();
      if (supabaseContent && typeof supabaseContent === 'object') {
        this.db.syncFromServerData(supabaseContent);
        return;
      }
    } catch (err) {
      console.warn('Failed to fetch site data from Supabase', err);
    }

    try {
      const response = await fetch('/api/site-data');
      if (response.ok) {
        const data = await response.json();
        this.db.syncFromServerData(data);
      }
    } catch (err) {
      console.warn('Failed to fetch initial site data', err);
    }
  }

  setupPageSpecificLogic() {
    // Ensure homepage-only background class is cleared before page setup
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('home-background');
    }

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    if (currentPage === 'index.html' || currentPage === '') {
      this.setupHomePage();
    } else if (currentPage === 'services.html') {
      this.setupServicesPage();
    } else if (currentPage === 'shop.html') {
      this.setupShopPage();
    } else if (currentPage === 'about.html') {
      this.setupAboutPage();
    } else if (currentPage === 'afro-pulse-27.html') {
      this.setupAfroPulsePage();
    } else if (currentPage === 'gallery.html') {
      this.setupGalleryPage();
    } else if (currentPage === 'contact.html') {
      this.setupContactPage();
    }
  }

  startSharedDataSync() {
    if (this.syncInterval) {
      window.clearInterval(this.syncInterval);
    }

    // Sync every 120 seconds (2 minutes) - very infrequent
    this.syncInterval = window.setInterval(() => {
      this.syncSharedData();
    }, 120000);
  }

  async syncSharedData() {
    try {
      const response = await fetch('/api/site-data');
      if (!response.ok) return;
      const data = await response.json();
      
      // Sync silently without triggering re-renders
      this.db.syncFromServerData(data);
    } catch (err) {
      console.warn('Failed to sync shared site data', err);
    }
  }

  // AFRO PULSE '27 PAGE SETUP
  setupAfroPulsePage() {
    this.afroPreviewIndex = 0;
    const eventConfig = this.getAfroPulseSettings();
    this.renderAfroPulsePage(eventConfig);
    this.setupAfroPulseInteractions(eventConfig);
  }

  normalizeMediaSrc(value) {
    if (typeof value !== 'string') return '';

    const trimmed = value.trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      return trimmed;
    }

    if (trimmed.startsWith('/')) {
      return trimmed;
    }

    if (trimmed.startsWith('./') || trimmed.startsWith('../')) {
      return trimmed;
    }

    if (trimmed.startsWith('assets/') || trimmed.startsWith('images/') || trimmed.startsWith('uploads/')) {
      return `/${trimmed}`;
    }

    return trimmed;
  }

  isRenderableMediaValue(value) {
    const normalized = this.normalizeMediaSrc(value);
    const trimmed = String(normalized || '').trim();
    if (!trimmed) return false;

    const lowerValue = trimmed.toLowerCase();
    return lowerValue.startsWith('http://')
      || lowerValue.startsWith('https://')
      || lowerValue.startsWith('data:')
      || lowerValue.startsWith('blob:')
      || lowerValue.startsWith('/assets/')
      || lowerValue.startsWith('assets/')
      || lowerValue.startsWith('./')
      || lowerValue.startsWith('../')
      || lowerValue.startsWith('/images/')
      || lowerValue.startsWith('images/')
      || lowerValue.startsWith('/uploads/')
      || lowerValue.startsWith('uploads/');
  }

  getAfroPulseSettings() {
    let config = this.db.getById('settings', 'afro-pulse');

    if (!config) {
      config = {
        id: 'afro-pulse',
        title: "AFRO PULSE '27",
        subtitle: "Every edition set to spark up summer seasons in Iceland. Sign up for the next experience, join our community to stay updated on newsletters and reserve your tickets for AFRO PULSE '27.",
        ticketUrl: '',
        ticketButtonText: 'Get Tickets',
        newsletterEndpoint: '',
        newsletterConfirmation: 'Thanks for subscribing! We’ll keep you updated.',
        galleryImages: [],
        galleryVideos: [],
      };
      this.db.add('settings', config);
      return config;
    }

    const existingImages = Array.isArray(config.galleryImages) ? config.galleryImages : [];
    const normalizedGalleryImages = existingImages
      .map((existingItem, index) => ({
        id: existingItem?.id || `img-${index + 1}`,
        src: this.isRenderableMediaValue(existingItem?.src) ? this.normalizeMediaSrc(existingItem.src) : ''
      }))
      .filter((image) => this.isRenderableMediaValue(image.src));

    const existingVideos = Array.isArray(config.galleryVideos) ? config.galleryVideos : [];
    const normalizedGalleryVideos = existingVideos
      .map((video, index) => ({
        id: video?.id || `vid-${index + 1}`,
        embedUrl: this.isRenderableMediaValue(video?.embedUrl) ? this.normalizeMediaSrc(video.embedUrl) : ''
      }))
      .filter((video) => this.isRenderableMediaValue(video.embedUrl));

    const updatedConfig = {
      ...config,
      galleryImages: normalizedGalleryImages,
      galleryVideos: normalizedGalleryVideos
    };

    if (JSON.stringify(updatedConfig) !== JSON.stringify(config)) {
      this.db.update('settings', 'afro-pulse', updatedConfig);
      return updatedConfig;
    }

    return updatedConfig;
  }

  renderAfroPulsePage(config) {
    const ticketButtonHtml = config.ticketUrl
      ? `<a id="ticket-action-button" href="${config.ticketUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-large">${config.ticketButtonText || 'Get Tickets'}</a>`
      : `<button id="ticket-action-button" type="button" class="btn btn-large btn-disabled" disabled>Coming Soon</button>`;

    const galleryImagesHtml = (config.galleryImages || [])
      .filter((image) => this.isRenderableMediaValue(image?.src))
      .map((image, index) => `<div class="gallery-card"><img src="${image.src}" alt="AFRO PULSE image ${index + 1}"><div class="gallery-card-label">Moment ${index + 1}</div></div>`)
      .join('');

    const galleryVideosHtml = (config.galleryVideos || [])
      .filter((video) => this.isRenderableMediaValue(video?.embedUrl))
      .map((video, index) => `<div class="video-card">${this.formatVideoEmbed(video.embedUrl)}</div>`)
      .join('');

    const pageContent = document.getElementById('afro-page-content');
    if (!pageContent) return;

    pageContent.innerHTML = `
      <section class="afro-page-hero">
        <div class="afro-hero-inner container">
          <span class="eyebrow">AFRO PULSE '27</span>
          <h1>${config.title}</h1>
          <p>${config.subtitle}</p>
          <div class="hero-cta-group">
            ${ticketButtonHtml}
            <a href="#newsletter-section" class="btn btn-secondary">Join Newsletter</a>
          </div>
        </div>
      </section>

      <section class="afro-event-header container">
        <div class="event-header-copy">
          <h2>Experience the pulse of Icelandic summer.</h2>
          <p>AFRO PULSE is a curated music event series built around culture, energy, and unforgettable performances. Keep your calendar open and your ticket link ready.</p>
        </div>
        <div class="event-header-actions">
          ${ticketButtonHtml}
          <a href="gallery.html" class="btn btn-secondary">View Full Gallery</a>
        </div>
      </section>

      <!-- Gallery preview carousel removed per request -->

      <section class="newsletter-section container" id="newsletter-section">
        <div class="section-title">
          <h2>Join the AFRO PULSE Community</h2>
          <p>Enter your email to receive updates, ticket drops, and exclusive event news.</p>
        </div>
        <form id="afro-newsletter-form" class="newsletter-form">
          <input type="email" id="newsletter-email" name="email" placeholder="Enter your email" required>
          <button type="submit" class="btn btn-large">Subscribe</button>
        </form>
        <div id="newsletter-feedback" class="newsletter-feedback" aria-live="polite"></div>
      </section>
    `;

    // carousel removed: no preview carousel rendered
  }

  formatVideoEmbed(url) {
    const trimmed = url.trim();
    if (!trimmed) return '';

    const lowerUrl = trimmed.toLowerCase();
    if (lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.ogg') || lowerUrl.endsWith('.mov')) {
      return `<div class="video-embed"><video controls preload="metadata" playsinline><source src="${trimmed}"></video></div>`;
    }

    if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
      const videoIdMatch = trimmed.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;
      if (videoId) {
        return `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${videoId}" title="AFRO PULSE video" frameborder="0" allowfullscreen></iframe></div>`;
      }
    }
    if (trimmed.includes('vimeo.com')) {
      const videoIdMatch = trimmed.match(/vimeo\.com\/(\d+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;
      if (videoId) {
        return `<div class="video-embed"><iframe src="https://player.vimeo.com/video/${videoId}" title="AFRO PULSE video" frameborder="0" allowfullscreen></iframe></div>`;
      }
    }
    return `<div class="video-embed"><iframe src="${trimmed}" title="AFRO PULSE video" frameborder="0" allowfullscreen></iframe></div>`;
  }

  // Carousel functionality removed. Keep placeholders if needed in future.

  setupAfroPulseInteractions(config) {
    const newsletterForm = document.getElementById('afro-newsletter-form');
    const feedback = document.getElementById('newsletter-feedback');

    if (newsletterForm) {
      newsletterForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const emailInput = document.getElementById('newsletter-email');
        const email = emailInput?.value?.trim();

        if (!email) {
          feedback.textContent = 'Please enter a valid email address.';
          return;
        }

        if (!config.newsletterEndpoint) {
          feedback.textContent = 'Newsletter endpoint is not configured yet. Please update the admin settings.';
          return;
        }

        try {
          const response = await fetch(config.newsletterEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });

          if (response.ok) {
            feedback.textContent = config.newsletterConfirmation || 'Thank you for subscribing!';
            emailInput.value = '';
          } else {
            feedback.textContent = 'Subscription failed. Please try again later.';
          }
        } catch (error) {
          feedback.textContent = 'Unable to submit subscription. Please check your connection or newsletter endpoint.';
          console.error(error);
        }
      });
    }

    // Carousel controls removed
  }

  // GALLERY PAGE SETUP
  setupGalleryPage() {
    const eventConfig = this.getAfroPulseSettings();
    this.renderGalleryPage(eventConfig);
  }

  startGallerySlideshow() {
    if (typeof window === 'undefined') return;
    if (this.gallerySlideshowInterval) {
      window.clearInterval(this.gallerySlideshowInterval);
      this.gallerySlideshowInterval = null;
    }

    const slides = Array.from(document.querySelectorAll('.gallery-slide'));
    if (!slides.length) return;

    let currentIndex = slides.findIndex((slide) => slide.classList.contains('active'));
    if (currentIndex < 0) currentIndex = 0;

    slides.forEach((slide, index) => {
      slide.classList.toggle('active', index === currentIndex);
    });

    this.gallerySlideshowInterval = window.setInterval(() => {
      slides[currentIndex].classList.remove('active');
      currentIndex = (currentIndex + 1) % slides.length;
      slides[currentIndex].classList.add('active');
    }, 4500);
  }

  renderGalleryPage(config) {
    const galleryImages = (config.galleryImages || [])
      .filter((image) => this.isRenderableMediaValue(image?.src));

    const gallerySlidesHtml = galleryImages
      .map((image, index) => `<div class="gallery-slide${index === 0 ? ' active' : ''}" role="group" aria-roledescription="slide" aria-label="Slide ${index + 1} of ${galleryImages.length}"><img src="${image.src}" alt="AFRO PULSE image ${index + 1}"><div class="gallery-card-label">Moment ${index + 1}</div></div>`)
      .join('');

    const gallerySlideshowHtml = gallerySlidesHtml
      ? `<section class="gallery-slideshow-section container">
           <div class="gallery-slideshow" aria-live="polite">
             ${gallerySlidesHtml}
           </div>
         </section>`
      : `<section class="gallery-slideshow-section container"><div class="gallery-slideshow gallery-placeholder">No gallery images are available at the moment.</div></section>`;

    const pageContent = document.getElementById('gallery-page-content');
    if (!pageContent) return;

    pageContent.innerHTML = `
      <section class="afro-page-hero">
        <div class="afro-hero-inner container">
          <span class="eyebrow">GALLERY</span>
          <h1>AFRO PULSE '27 Gallery</h1>
          <p>Explore the complete collection of moments from AFRO PULSE '27. From the energy on the dance floor to the creativity behind the scenes, relive every unforgettable moment.</p>
          <div class="hero-cta-group">
            <a href="afro-pulse-27.html" class="btn btn-large">Back to Event</a>
          </div>
        </div>
      </section>

      ${gallerySlideshowHtml}
    `;

    this.startGallerySlideshow();
  }

  // HOME PAGE SETUP
  setupHomePage() {
    // Apply homepage-only orange background
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.add('home-background');
    }
    this.renderFeaturedProducts();
    this.renderHomeAfroPulseBanner();
  }

  renderHomeAfroPulseBanner() {
    const content = document.querySelector('.afro-home-banner-content');
    if (!content) return;

    // Preserve the original static HTML for the AFRO banner so we don't overwrite
    // the author's original markup with a generated duplicate. Capture once.
    if (!this._afroOriginalCaptured) {
      try {
        this._afroOriginalHTML = content.innerHTML || '';
      } catch (e) {
        this._afroOriginalHTML = '';
      }
      this._afroOriginalCaptured = true;
    }

    const config = this.db.getById('settings', 'afro-pulse');
    if (!config) return;

    // If the original static AFRO banner was captured early on page load,
    // always prefer it to avoid dynamic overrides from later syncs.
    if (typeof window !== 'undefined' && window.__AFRO_ORIGINAL_AFRO_BANNER && window.__AFRO_ORIGINAL_AFRO_BANNER.trim().length > 0) {
      content.innerHTML = window.__AFRO_ORIGINAL_AFRO_BANNER;
      return;
    }

    const title = config.title || "AFRO PULSE '27";
    const subtitle = config.subtitle || 'Every edition set to spark up summer seasons in Iceland.';
    const ticketText = config.ticketButtonText || 'Get Tickets';
    const ticketUrl = config.ticketUrl || 'afro-pulse-27.html';
    const ticketTarget = config.ticketUrl ? ' target="_blank" rel="noopener noreferrer"' : '';

    // If a generic .hero exists on the page, keep it and hide the afro-home-banner
    const genericHero = document.querySelector('.hero');
    const afroSection = content.closest('.afro-home-banner');
    if (genericHero && afroSection) {
      try {
        // Keep whichever banner appears first in the document (the top one),
        // and hide the lower duplicate to avoid showing both.
        const NODE = Node || window.Node;
        const relation = afroSection.compareDocumentPosition(genericHero);
        const afroBeforeHero = Boolean(relation & NODE.DOCUMENT_POSITION_FOLLOWING);
        if (afroBeforeHero) {
          // afro is before hero -> keep afro, hide hero
          genericHero.style.display = 'none';
        } else {
          // hero is before afro -> keep hero, hide afro
          afroSection.style.display = 'none';
          return;
        }
      } catch (e) {
        // Fallback: if anything goes wrong, prefer keeping the afro banner
        try { genericHero.style.display = 'none'; } catch (err) {}
      }
    }

    // If we captured a non-empty original banner, prefer it to avoid showing
    // a generated duplicate. This preserves the original design as authored
    // in `index.html` unless an admin explicitly requests replacement.
    if (this._afroOriginalHTML && this._afroOriginalHTML.trim().length > 0) {
      content.innerHTML = this._afroOriginalHTML;
      return;
    }

    // Otherwise render the afro-home-banner content (fallback)
    content.innerHTML = `
      <span class="eyebrow">AFRO PULSE '27</span>
      <h2>${title}</h2>
      <p>${subtitle}</p>
      <div class="hero-cta-group">
        <a href="${ticketUrl}"${ticketTarget} class="btn btn-large">${ticketText}</a>
        <a href="afro-pulse-27.html" class="btn btn-secondary">Learn More</a>
      </div>
    `;
  }

  renderFeaturedProducts() {
    const container = document.getElementById('featured-products');
    if (!container) return;

    const products = this.db.getAll('products').slice(0, 4);

    const safeSrc = (src) => {
      if (!src) return '';
      const trimmed = src.trim();
      if (trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('/') || trimmed.startsWith('assets/')) return trimmed;
      return `assets/images/${trimmed}`;
    };

    const html = products.map(product => {
      const src = product.name && product.name.toLowerCase().includes('dj')
        ? 'assets/images/DJLogo.png'
        : safeSrc(product.image) || '';
      const imgHtml = src ? `<img src="${src}" alt="${product.name}" class="card-img">` : `<div class="card-img" style="display:flex;align-items:center;justify-content:center;color:var(--color-text-light);">No image</div>`;
      const priceHtml = product.category === 'service' ? '' : `<div class="card-price">$${product.price}</div>`;
      const bookLink = product.category === 'service' ? `book.html?serviceId=${product.id}` : '#';
      return `
      <div class="card">
        ${imgHtml}
        <div class="card-title">${product.name}</div>
        ${priceHtml}
        <div class="card-description">${product.description}</div>
        <a class="btn" href="${bookLink}" onclick="sessionStorage.setItem('eau_selected_service', '${product.id}')">
          ${product.buttonText || 'VIEW'}
        </a>
      </div>
    `;
    }).join('');

    container.innerHTML = html;
  }

  // SERVICES PAGE SETUP
  setupServicesPage() {
    this.renderServices();
  }

  renderServices() {
    const container = document.getElementById('services-container');
    if (!container) return;

    const services = this.db.getByCategory('products', 'service');
    const safeSrc = (src) => {
      if (!src) return '';
      const trimmed = src.trim();
      if (trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('/') || trimmed.startsWith('assets/')) return trimmed;
      return `assets/images/${trimmed}`;
    };

    const html = services.map(service => {
      const defaultSrc = service.name && service.name.toLowerCase().includes('dj')
        ? '/assets/images/DJLogo.png'
        : safeSrc(service.image);
      const src = defaultSrc || '';
      const img = src ? `<img src="${src}" alt="${service.name}">` : `<div class="service-card-placeholder">No image</div>`;
      const bookLink = `book.html?serviceId=${service.id}`;
      return `
      <div class="service-card">
        <div class="service-card-img">
          ${img}
        </div>
        <div class="service-card-body">
          <h3 class="service-card-title">${service.name}</h3>
          <p class="service-card-description">${service.description}</p>
          <div class="service-card-footer">
            <a class="btn" href="${bookLink}" onclick="sessionStorage.setItem('eau_selected_service', '${service.id}')">${service.buttonText}</a>
          </div>
        </div>
      </div>
    `;
    }).join('');

    container.innerHTML = html;
  }

  // SHOP PAGE SETUP
  setupShopPage() {
    this.renderProducts();
  }

  renderProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    const merchandise = this.db.getByCategory('merchandise', 'merchandise');
    const safeSrc = (src) => {
      if (!src) return '';
      const trimmed = src.trim();
      if (trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('/') || trimmed.startsWith('assets/')) return trimmed;
      return `assets/images/${trimmed}`;
    };

    const html = merchandise.map(product => {
      const src = safeSrc(product.image);
      const img = src ? `<img src="${src}" alt="${product.name}">` : `<div class="product-card-placeholder">No image</div>`;
      return `
      <div class="product-card">
        <div class="product-card-img">
          ${img}
        </div>
        <div class="product-card-body">
          <h3 class="product-card-title">${product.name}</h3>
          <div class="product-card-price">$${product.price}</div>
          <div class="quantity-selector">
            <button class="btn btn-small" onclick="document.querySelector('.qty-input-${product.id}').value = Math.max(1, parseInt(document.querySelector('.qty-input-${product.id}').value) - 1)">−</button>
            <input type="number" value="1" min="1" class="qty-input qty-input-${product.id}" readonly>
            <button class="btn btn-small" onclick="document.querySelector('.qty-input-${product.id}').value = parseInt(document.querySelector('.qty-input-${product.id}').value) + 1">+</button>
          </div>
            <button class="btn" onclick="window.cartManager.addToCart(${product.id}, parseInt(document.querySelector('.qty-input-${product.id}').value), {name: '${product.name.replace(/'/g, "\\'")}', price: ${product.price}, image: '${product.image}'}); alert('Added to cart!'); window.cartManager.updateCartBadge();">
            ${product.buttonText}
          </button>
        </div>
      </div>
    `;
    }).join('');

    container.innerHTML = html;
  }

  // ABOUT PAGE SETUP
  setupAboutPage() {
    // Static content already in HTML
  }

  // CONTACT PAGE SETUP
  setupContactPage() {
    // Tally embed handles all form submission
    // No additional setup needed
  }

  // CART METHODS (Handled by CartManager in cart.js)
  loadCart() {
    // Deprecated - Use window.cartManager instead
    return JSON.parse(localStorage.getItem('eau-de-play-cart') || '[]');
  }

  saveCart() {
    // Deprecated - Use window.cartManager instead
    localStorage.setItem('eau-de-play-cart', JSON.stringify(this.cart));
  }
}

function initializePublicApp() {
  if (window.__PUBLIC_APP_INITIALIZED__) return;
  window.__PUBLIC_APP_INITIALIZED__ = true;
  window.publicApp = new PublicApp();
  window.PublicApp = PublicApp;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePublicApp, { once: true });
} else {
  initializePublicApp();
}
