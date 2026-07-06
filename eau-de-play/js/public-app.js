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
    } else if (currentPage === 'contact.html') {
      this.setupContactPage();
    }
  }

  // HOME PAGE SETUP
  setupHomePage() {
    this.renderFeaturedProducts();
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
    const form = document.getElementById('contact-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleContactSubmit(e));
    }

    // Hide local contact form if Tally embed exists
    const tally = document.getElementById('tally-embed');
    if (tally) {
      const localForm = document.getElementById('contact-form');
      if (localForm) localForm.style.display = 'none';
    }
  }

  handleContactSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    const message = {
      id: Date.now(),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      message: formData.get('message'),
      date: new Date().toISOString()
    };

    this.db.add('messages', message);

    // Show success message
    const successEl = document.getElementById('success-message');
    if (successEl) {
      successEl.classList.add('show');
      setTimeout(() => {
        successEl.classList.remove('show');
      }, 5000);
    }

    form.reset();
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
