// ============================================
// PUBLIC APP MODULE - DOM Manipulation for Public Pages
// ============================================

import Database from './db.js';
import { injectNavbarAndFooter } from './components.js';

export class PublicApp {
  constructor() {
    this.db = new Database();
    this.init();
  }

  init() {
    injectNavbarAndFooter();
    this.setupPageSpecificLogic();
  }

  setupPageSpecificLogic() {
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

  // AFRO PULSE '27 PAGE SETUP
  setupAfroPulsePage() {
    this.afroPreviewIndex = 0;
    const eventConfig = this.getAfroPulseSettings();
    this.renderAfroPulsePage(eventConfig);
    this.setupAfroPulseInteractions(eventConfig);
  }

  getAfroPulseSettings() {
    let config = this.db.getById('settings', 'afro-pulse');
    const defaultGalleryImages = [
      { id: 'img-1', src: 'assets/images/IMG_1566.JPG' },
      { id: 'img-2', src: 'assets/images/IMG_1521.JPG' },
      { id: 'img-3', src: 'assets/images/IMG_1427.JPG' },
      { id: 'img-4', src: 'assets/images/IMG_1081.JPG' },
      { id: 'img-5', src: 'assets/images/IMG_1027.JPG' },
      { id: 'img-6', src: 'assets/images/IMG_0971.JPG' },
      { id: 'img-7', src: 'assets/images/IMG_2128.JPG' },
      { id: 'img-8', src: 'assets/images/IMG_2060.JPG' }
    ];

    if (!config) {
      config = {
        id: 'afro-pulse',
        title: "AFRO PULSE '27",
        subtitle: "Every edition set to spark up summer seasons in Iceland. Sign up for the next experience, join our community to stay updated on newsletters and reserve your tickets for AFRO PULSE '27.",
        ticketUrl: '',
        ticketButtonText: 'Get Tickets',
        newsletterEndpoint: '',
        newsletterConfirmation: 'Thanks for subscribing! We’ll keep you updated.',
        galleryImages: defaultGalleryImages,
        galleryVideos: Array.from({ length: 3 }, (_, index) => ({ id: `vid-${index + 1}`, embedUrl: '' })),
      };
      this.db.add('settings', config);
      return config;
    }

    const normalizedGalleryImages = Array.from({ length: defaultGalleryImages.length }, (_, index) => {
      const existingItem = (config.galleryImages || [])[index];
      const fallback = defaultGalleryImages[index];
      const currentSrc = existingItem?.src?.trim();
      const validSrc = currentSrc && (currentSrc.startsWith('assets/') || currentSrc.startsWith('/assets/') || currentSrc.startsWith('http'))
        ? currentSrc
        : fallback?.src || '';
      return {
        id: existingItem?.id || fallback?.id || `img-${index + 1}`,
        src: validSrc
      };
    });

    const updatedConfig = {
      ...config,
      galleryImages: normalizedGalleryImages,
      galleryVideos: config.galleryVideos || Array.from({ length: 3 }, (_, index) => ({ id: `vid-${index + 1}`, embedUrl: '' }))
    };

    if (JSON.stringify(updatedConfig) !== JSON.stringify(config)) {
      this.db.update('settings', 'afro-pulse', updatedConfig);
      return updatedConfig;
    }

    return config;
  }

  renderAfroPulsePage(config) {
    const ticketButtonHtml = config.ticketUrl
      ? `<a id="ticket-action-button" href="${config.ticketUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-large">${config.ticketButtonText || 'Get Tickets'}</a>`
      : `<button id="ticket-action-button" type="button" class="btn btn-large btn-disabled" disabled>Coming Soon</button>`;

    const galleryImagesHtml = config.galleryImages.map((image, index) => {
      const content = image.src
        ? `<img src="${image.src}" alt="AFRO PULSE image ${index + 1}">`
        : `<div class="gallery-placeholder"><span>Featured slot ${index + 1}</span></div>`;
      return `<div class="gallery-card">${content}<div class="gallery-card-label">${image.src ? `Moment ${index + 1}` : `Slot ${index + 1}`}</div></div>`;
    }).join('');

    const galleryVideosHtml = config.galleryVideos.map((video, index) => {
      const content = video.embedUrl
        ? this.formatVideoEmbed(video.embedUrl)
        : `<div class="gallery-placeholder"><span>Video ${index + 1}</span></div>`;
      return `<div class="video-card">${content}</div>`;
    }).join('');

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

      <section class="gallery-preview-section container" id="gallery-section">
        <div class="section-title">
          <h2>Event Preview Carousel</h2>
          <p>Swipe through a lightweight preview of the gallery before exploring the full collection.</p>
        </div>
        <div class="preview-carousel">
          <button id="carousel-prev" class="carousel-control" aria-label="Previous images">‹</button>
          <div class="carousel-window">
            <div class="carousel-track" id="carousel-track"></div>
          </div>
          <button id="carousel-next" class="carousel-control" aria-label="Next images">›</button>
        </div>
      </section>

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

    injectNavbarAndFooter();
    this.renderGalleryPreviewCarousel(config.galleryImages);
  }

  formatVideoEmbed(url) {
    const trimmed = url.trim();
    if (!trimmed) return '';
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

  renderGalleryPreviewCarousel(images) {
    const track = document.getElementById('carousel-track');
    if (!track) return;

    const previewImages = (images || []).slice(0, 8);
    track.innerHTML = previewImages.map((image, index) => {
      const content = image.src
        ? `<img src="${image.src}" alt="Preview ${index + 1}">`
        : `<div class="carousel-placeholder"><span>Slot ${index + 1}</span></div>`;
      return `<div class="preview-card">${content}<div class="preview-card-label">${image.src ? `Featured ${index + 1}` : `Open Slot ${index + 1}`}</div></div>`;
    }).join('');

    this.afroPreviewImages = previewImages;
    this.afroPreviewIndex = 0;
    this.startAfroCarousel(previewImages);
    this.updateCarouselPosition();
  }

  startAfroCarousel(images) {
    if (this.afroAutoRotateTimer) {
      clearInterval(this.afroAutoRotateTimer);
    }

    if (!images || images.length <= 1) return;

    this.afroAutoRotateTimer = window.setInterval(() => {
      if (!this.afroPreviewImages || this.afroPreviewImages.length <= 1) return;
      this.afroPreviewIndex = (this.afroPreviewIndex + 1) % this.afroPreviewImages.length;
      this.updateCarouselPosition();
    }, 4000);
  }

  updateCarouselPosition() {
    const track = document.getElementById('carousel-track');
    if (!track) return;
    const card = track.querySelector('.preview-card');
    const cardWidth = card ? card.offsetWidth + parseInt(getComputedStyle(card).marginRight || '0', 10) : 240;
    track.style.transform = `translateX(-${this.afroPreviewIndex * cardWidth}px)`;
  }

  setupAfroPulseInteractions(config) {
    const newsletterForm = document.getElementById('afro-newsletter-form');
    const feedback = document.getElementById('newsletter-feedback');
    const prevButton = document.getElementById('carousel-prev');
    const nextButton = document.getElementById('carousel-next');
    const totalSlides = config.galleryImages.length;

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

    if (prevButton) {
      prevButton.addEventListener('click', () => {
        this.afroPreviewIndex = Math.max(0, this.afroPreviewIndex - 1);
        this.updateCarouselPosition();
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', () => {
        this.afroPreviewIndex = Math.min(totalSlides - 1, this.afroPreviewIndex + 1);
        this.updateCarouselPosition();
      });
    }
  }

  // GALLERY PAGE SETUP
  setupGalleryPage() {
    const eventConfig = this.getAfroPulseSettings();
    this.renderGalleryPage(eventConfig);
  }

  renderGalleryPage(config) {
    const galleryImagesHtml = config.galleryImages.map((image, index) => {
      const content = image.src
        ? `<img src="${image.src}" alt="AFRO PULSE image ${index + 1}">`
        : `<div class="gallery-placeholder"><span>Featured slot ${index + 1}</span></div>`;
      return `<div class="gallery-card">${content}<div class="gallery-card-label">${image.src ? `Moment ${index + 1}` : `Slot ${index + 1}`}</div></div>`;
    }).join('');

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

      <section class="gallery-grid-section container">
        <div class="section-title">
          <h2>AFRO PULSE Gallery</h2>
          <p>Every shot captures the essence and energy of our event.</p>
        </div>
        <div class="gallery-grid">${galleryImagesHtml}</div>
      </section>
    `;

    injectNavbarAndFooter();
  }

  // HOME PAGE SETUP
  setupHomePage() {
    this.renderFeaturedProducts();
    this.renderHomeAfroPulseBanner();
  }

  renderHomeAfroPulseBanner() {
    const content = document.querySelector('.afro-home-banner-content');
    if (!content) return;

    const config = this.db.getById('settings', 'afro-pulse');
    if (!config) return;

    const title = config.title || "AFRO PULSE '27";
    const subtitle = config.subtitle || 'Every edition set to spark up summer seasons in Iceland.';
    const ticketText = config.ticketButtonText || 'Get Tickets';
    const ticketUrl = config.ticketUrl || 'afro-pulse-27.html';
    const ticketTarget = config.ticketUrl ? ' target="_blank" rel="noopener noreferrer"' : '';

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
    const html = products.map(product => `
      <div class="card">
        <img src="${product.image}" alt="${product.name}" class="card-img">
        <div class="card-title">${product.name}</div>
        <div class="card-price">$${product.price}</div>
        <div class="card-description">${product.description}</div>
        <button class="btn" onclick="alert('${product.name} booking opening soon!')">
          ${product.buttonText || 'VIEW'}
        </button>
      </div>
    `).join('');

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
    const html = services.map(service => `
      <div class="service-card">
        <div class="service-card-img">
          <img src="${service.image}" alt="${service.name}">
        </div>
        <div class="service-card-body">
          <h3 class="service-card-title">${service.name}</h3>
          <div class="service-card-price">$${service.price}</div>
          <p class="service-card-description">${service.description}</p>
          <div class="service-card-footer">
            <button class="btn" onclick="alert('Booking for ${service.name} coming soon!')">
              ${service.buttonText}
            </button>
          </div>
        </div>
      </div>
    `).join('');

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
    const html = merchandise.map(product => `
      <div class="product-card">
        <div class="product-card-img">
          <img src="${product.image}" alt="${product.name}">
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
    `).join('');

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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.publicApp = new PublicApp();
  window.PublicApp = PublicApp;
});
