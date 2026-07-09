// ============================================
// ADMIN APP MODULE - Admin Dashboard Logic
// ============================================

import Database from './db.js';
import Auth from './auth.js';

export class AdminApp {
  constructor() {
    this.db = new Database();
    this.auth = new Auth();
    this.currentView = 'dashboard';
    this.editingProductId = null;
    this.init();
  }

  async init() {
    const currentUser = this.auth.getCurrentUser();

    // Check if user is logged in and has admin role
    if (!currentUser || currentUser.role !== 'admin') {
      window.location.href = 'admin-login.html';
      return;
    }

    await this.refreshSharedDataFromServer();
    this.setupSidebar();
    this.setupModal();
    this.showDashboard();
  }

  async refreshSharedDataFromServer() {
    try {
      await this.db.refreshFromServer();
    } catch (err) {
      console.warn('Failed to refresh admin shared data', err);
    }
  }

  setupSidebar() {
    const navLinks = document.querySelectorAll('.admin-nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        this.switchView(view);
      });
    });

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }
  }

  // Reads a File object as a base64 data URL
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
  }

  // Uploads a File to the server and returns the public URL for it
  async uploadMediaFile(file) {
    const dataUrl = await this.readFileAsDataURL(file);
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, data: dataUrl })
    });

    if (!response.ok) {
      let message = 'Upload failed';
      try {
        const errJson = await response.json();
        message = errJson.error || message;
      } catch (e) { /* ignore */ }
      throw new Error(message);
    }

    const result = await response.json();
    return result.url;
  }

  switchView(view) {

    this.currentView = view;
    
    // Update active nav link
    document.querySelectorAll('.admin-nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.dataset.view === view) {
        link.classList.add('active');
      }
    });

    // Update content
    if (view === 'dashboard') {
      this.showDashboard();
    } else if (view === 'products') {
      this.showProducts();
    } else if (view === 'event') {
      this.showEventSettings();
    } else if (view === 'orders') {
      this.showOrders();
    }
  }

  showEventSettings() {
    let config = this.db.getById('settings', 'afro-pulse');
    if (!config) {
      config = {
        id: 'afro-pulse',
        title: "AFRO PULSE '27",
        subtitle: "Every edition set to spark up summer seasons in Iceland. Sign up for the next experience, join our community to stay updated on newsletters and reserve your tickets for AFRO PULSE '27.",
        ticketUrl: '',
        ticketButtonText: 'Get Tickets',
        newsletterEndpoint: '',
        newsletterConfirmation: '',
        galleryImages: [],
        galleryVideos: [],
      };
      this.db.add('settings', config);
    }

    const contentArea = document.getElementById('admin-content');
    contentArea.innerHTML = `
      <div class="products-view">
        <div class="products-header">
          <div>
            <h2>AFRO PULSE '27 Page Settings</h2>
            <p>Update event details, ticket links, newsletter endpoint, and gallery media.</p>
          </div>
        </div>
        <form id="event-settings-form">
          <div class="product-form-group">
            <label for="event-title">Event Title</label>
            <input type="text" id="event-title" value="${config.title}">
          </div>
          <div class="product-form-group">
            <label for="event-subtitle">Event Description</label>
            <textarea id="event-subtitle">${config.subtitle}</textarea>
          </div>
          <div class="product-form-group">
            <label for="event-ticket-url">Ticket Sales URL</label>
            <input type="text" id="event-ticket-url" value="${config.ticketUrl}" placeholder="https://example.com/tickets">
          </div>
          <div class="product-form-group">
            <label for="event-ticket-button">Ticket Button Text</label>
            <input type="text" id="event-ticket-button" value="${config.ticketButtonText}">
          </div>
          <div class="product-form-group">
            <label for="event-newsletter-endpoint">Newsletter Endpoint</label>
            <input type="text" id="event-newsletter-endpoint" value="${config.newsletterEndpoint}" placeholder="https://example.com/api/newsletter">
          </div>
          <div class="product-form-group">
            <label for="event-newsletter-confirmation">Newsletter Confirmation Text</label>
            <input type="text" id="event-newsletter-confirmation" value="${config.newsletterConfirmation}">
          </div>
          <div class="product-form-group">
            <button type="submit" class="btn">Save Event Settings</button>
          </div>
        </form>

        <div class="products-header" style="margin-top: var(--spacing-2xl);">
          <h3>Gallery Images</h3>
          <p>Paste image URLs below or add a new slot. Changes save instantly.</p>
        </div>
        <div class="product-form-group">
          <label for="new-image-url">Add Image</label>
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <input type="text" id="new-image-url" placeholder="Paste image URL (optional)">
            <span style="color:#888;">OR</span>
            <input type="file" id="new-image-file" accept="image/*,video/*">
            <button type="button" class="btn btn-small" id="add-gallery-image">Add Image</button>
          </div>
          <span id="new-image-upload-status" style="font-size:12px; color:#666;"></span>
        </div>
        <div id="gallery-images-list" class="media-list"></div>

        <div class="products-header" style="margin-top: var(--spacing-2xl);">
          <h3>Video Embeds</h3>
          <p>Paste YouTube, Vimeo or iframe URLs, or upload a video file directly from your computer.</p>
        </div>
        <div class="product-form-group">
          <label for="new-video-url">Add Video</label>
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <input type="text" id="new-video-url" placeholder="Paste video URL (optional)">
            <span style="color:#888;">OR</span>
            <input type="file" id="new-video-file" accept="video/*">
            <button type="button" class="btn btn-small" id="add-gallery-video">Add Video</button>
          </div>
          <span id="new-video-upload-status" style="font-size:12px; color:#666;"></span>
        </div>
        <div id="gallery-videos-list" class="media-list"></div>

      </div>
    `;

    this.renderMediaRows(config);
    this.bindEventSettingsListeners(config);
  }

  getMediaPreviewMarkup(item, type) {
    const previewUrl = item?.previewUrl || (type === 'image' ? item?.src : item?.embedUrl) || '';
    if (!previewUrl) {
      return `<div class="media-preview media-preview-placeholder">${type === 'image' ? 'Image' : 'Video'}</div>`;
    }

    if (type === 'image') {
      return `<div class="media-preview"><img src="${previewUrl}" alt="Preview"></div>`;
    }

    const lowerPreview = String(previewUrl).toLowerCase();
    if (lowerPreview.startsWith('data:video') || lowerPreview.startsWith('blob:') || lowerPreview.endsWith('.mp4') || lowerPreview.endsWith('.webm') || lowerPreview.endsWith('.ogg') || lowerPreview.endsWith('.mov')) {
      return `<div class="media-preview"><video src="${previewUrl}" muted playsinline preload="metadata"></video></div>`;
    }

    return `<div class="media-preview media-preview-placeholder">Video</div>`;
  }

  renderMediaRows(config) {
    const imagesList = document.getElementById('gallery-images-list');
    const videosList = document.getElementById('gallery-videos-list');
    if (imagesList) {
      imagesList.innerHTML = (config.galleryImages || []).map((image, index) => `
        <div class="media-row" data-id="${image.id}">
          <div class="media-row-main">
            ${this.getMediaPreviewMarkup(image, 'image')}
            <div class="media-row-fields">
              <label>Image ${index + 1}</label>
              <input type="text" class="media-input image-url" value="${image.src || ''}" placeholder="Image URL or leave blank">
            </div>
          </div>
          <button type="button" class="btn btn-small btn-secondary remove-media" data-type="image">Remove</button>
        </div>
      `).join('');
    }
    if (videosList) {
      videosList.innerHTML = (config.galleryVideos || []).map((video, index) => `
        <div class="media-row" data-id="${video.id}">
          <div class="media-row-main">
            ${this.getMediaPreviewMarkup(video, 'video')}
            <div class="media-row-fields">
              <label>Video ${index + 1}</label>
              <input type="text" class="media-input video-url" value="${video.embedUrl || ''}" placeholder="YouTube, Vimeo, or embed URL">
            </div>
          </div>
          <button type="button" class="btn btn-small btn-secondary remove-media" data-type="video">Remove</button>
        </div>
      `).join('');
    }
  }

  persistEventConfig(config) {
    const normalizedConfig = {
      ...config,
      galleryImages: Array.isArray(config.galleryImages) ? config.galleryImages : [],
      galleryVideos: Array.isArray(config.galleryVideos) ? config.galleryVideos : []
    };

    const data = this.db.getData();
    const settings = Array.isArray(data.settings) ? data.settings : [];
    const updatedSettings = settings.map((item) => item.id === 'afro-pulse' ? normalizedConfig : item);

    if (!updatedSettings.some((item) => item.id === 'afro-pulse')) {
      updatedSettings.push(normalizedConfig);
    }

    const nextData = { ...data, settings: updatedSettings };
    this.db.saveData(nextData);
    Object.assign(config, normalizedConfig);
    this.refreshSharedDataFromServer();
    window.dispatchEvent(new CustomEvent('siteDataUpdated', { detail: nextData }));
    return normalizedConfig;
  }

  bindEventSettingsListeners(config) {
    const form = document.getElementById('event-settings-form');
    const imagesList = document.getElementById('gallery-images-list');
    const videosList = document.getElementById('gallery-videos-list');
    const addImageButton = document.getElementById('add-gallery-image');
    const addVideoButton = document.getElementById('add-gallery-video');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const updates = {
          title: document.getElementById('event-title').value,
          subtitle: document.getElementById('event-subtitle').value,
          ticketUrl: document.getElementById('event-ticket-url').value,
          ticketButtonText: document.getElementById('event-ticket-button').value,
          newsletterEndpoint: document.getElementById('event-newsletter-endpoint').value,
          newsletterConfirmation: document.getElementById('event-newsletter-confirmation').value,
          galleryImages: Array.from(document.querySelectorAll('.image-url')).map((input, index) => ({
            id: config.galleryImages[index]?.id || `img-${index + 1}`,
            src: input.value.trim()
          })),
          galleryVideos: Array.from(document.querySelectorAll('.video-url')).map((input, index) => ({
            id: config.galleryVideos[index]?.id || `vid-${index + 1}`,
            embedUrl: input.value.trim()
          }))
        };
        this.persistEventConfig({ ...config, ...updates });
        alert('Event settings saved and synced.');
      });
    }

    if (addImageButton) {
      addImageButton.addEventListener('click', async () => {
        const urlInput = document.getElementById('new-image-url');
        const fileInput = document.getElementById('new-image-file');
        const statusEl = document.getElementById('new-image-upload-status');
        const file = fileInput?.files?.[0];
        let src = urlInput?.value?.trim() || '';

        if (file) {
          const tempId = `img-${Date.now()}`;
          const previewUrl = await this.readFileAsDataURL(file);
          config.galleryImages = [...(config.galleryImages || []), { id: tempId, src: '', previewUrl }];
          this.renderMediaRows(config);

          try {
            addImageButton.disabled = true;
            if (statusEl) statusEl.textContent = 'Uploading...';
            src = await this.uploadMediaFile(file);
            config.galleryImages = (config.galleryImages || []).map((item) => item.id === tempId ? { ...item, src, previewUrl: '' } : item);
            this.renderMediaRows(config);
            if (statusEl) statusEl.textContent = 'Uploaded!';
          } catch (err) {
            config.galleryImages = (config.galleryImages || []).filter((item) => item.id !== tempId);
            this.renderMediaRows(config);
            if (statusEl) statusEl.textContent = '';
            alert('Upload failed: ' + err.message);
            addImageButton.disabled = false;
            return;
          }
          addImageButton.disabled = false;
        }

        if (!src) {
          alert('Please paste an image URL or choose a file to upload.');
          return;
        }

        if (!file) {
          config.galleryImages = [...(config.galleryImages || []), { id: `img-${Date.now()}`, src }];
          this.persistEventConfig(config);
          this.renderMediaRows(config);
        } else {
          this.persistEventConfig(config);
          this.renderMediaRows(config);
        }
        if (urlInput) urlInput.value = '';
        if (fileInput) fileInput.value = '';
        if (statusEl) statusEl.textContent = '';
      });
    }

    if (addVideoButton) {
      addVideoButton.addEventListener('click', async () => {
        const urlInput = document.getElementById('new-video-url');
        const fileInput = document.getElementById('new-video-file');
        const statusEl = document.getElementById('new-video-upload-status');
        const file = fileInput?.files?.[0];
        let embedUrl = urlInput?.value?.trim() || '';

        if (file) {
          const tempId = `vid-${Date.now()}`;
          const previewUrl = await this.readFileAsDataURL(file);
          config.galleryVideos = [...(config.galleryVideos || []), { id: tempId, embedUrl: '', previewUrl }];
          this.renderMediaRows(config);

          try {
            addVideoButton.disabled = true;
            if (statusEl) statusEl.textContent = 'Uploading...';
            embedUrl = await this.uploadMediaFile(file);
            config.galleryVideos = (config.galleryVideos || []).map((item) => item.id === tempId ? { ...item, embedUrl, previewUrl: '' } : item);
            this.renderMediaRows(config);
            if (statusEl) statusEl.textContent = 'Uploaded!';
          } catch (err) {
            config.galleryVideos = (config.galleryVideos || []).filter((item) => item.id !== tempId);
            this.renderMediaRows(config);
            if (statusEl) statusEl.textContent = '';
            alert('Upload failed: ' + err.message);
            addVideoButton.disabled = false;
            return;
          }
          addVideoButton.disabled = false;
        }

        if (!embedUrl) {
          alert('Please paste a video URL or choose a file to upload.');
          return;
        }

        if (!file) {
          config.galleryVideos = [...(config.galleryVideos || []), { id: `vid-${Date.now()}`, embedUrl }];
          this.persistEventConfig(config);
          this.renderMediaRows(config);
        } else {
          this.persistEventConfig(config);
          this.renderMediaRows(config);
        }
        if (urlInput) urlInput.value = '';
        if (fileInput) fileInput.value = '';
        if (statusEl) statusEl.textContent = '';
      });
    }


    if (imagesList) {
      imagesList.addEventListener('click', (event) => {
        if (event.target.matches('.remove-media')) {
          const row = event.target.closest('.media-row');
          const type = event.target.getAttribute('data-type');
          const id = row?.getAttribute('data-id');
          if (type === 'image') {
            config.galleryImages = (config.galleryImages || []).filter(item => item.id !== id);
          }
          if (type === 'video') {
            config.galleryVideos = (config.galleryVideos || []).filter(item => item.id !== id);
          }
          this.persistEventConfig(config);
          this.renderMediaRows(config);
        }
      });

      imagesList.addEventListener('change', (event) => {
        if (event.target.matches('.media-input.image-url')) {
          const row = event.target.closest('.media-row');
          const id = row?.getAttribute('data-id');
          config.galleryImages = (config.galleryImages || []).map((item) => item.id === id ? { ...item, src: event.target.value.trim() } : item);
          this.persistEventConfig(config);
        }
      });
    }

    if (videosList) {
      videosList.addEventListener('click', (event) => {
        if (event.target.matches('.remove-media')) {
          const row = event.target.closest('.media-row');
          const type = event.target.getAttribute('data-type');
          const id = row?.getAttribute('data-id');
          if (type === 'image') {
            config.galleryImages = (config.galleryImages || []).filter(item => item.id !== id);
          }
          if (type === 'video') {
            config.galleryVideos = (config.galleryVideos || []).filter(item => item.id !== id);
          }
          this.persistEventConfig(config);
          this.renderMediaRows(config);
        }
      });

      videosList.addEventListener('change', (event) => {
        if (event.target.matches('.media-input.video-url')) {
          const row = event.target.closest('.media-row');
          const id = row?.getAttribute('data-id');
          config.galleryVideos = (config.galleryVideos || []).map((item) => item.id === id ? { ...item, embedUrl: event.target.value.trim() } : item);
          this.persistEventConfig(config);
        }
      });
    }
  }

  showDashboard() {
    const contentArea = document.getElementById('admin-content');
    const products = this.db.getAll('products');
    const orders = this.db.getAll('orders');

    contentArea.innerHTML = `
      <div class="dashboard-view">
        <h2>Dashboard Overview</h2>
        <div class="dashboard-stats">
          <div class="stat-card">
            <h3>${products.length}</h3>
            <p>Total Products</p>
          </div>
          <div class="stat-card">
            <h3>${orders.length}</h3>
            <p>Total Orders</p>
          </div>
          <div class="stat-card">
            <h3>$${orders.reduce((sum, o) => sum + o.total, 0).toLocaleString()}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
        <div class="recent-activity">
          <h3>Recent Orders</h3>
          <table class="products-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Product</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${orders.slice(-5).reverse().map(order => `
                <tr>
                  <td>${order.customerName}</td>
                  <td>${this.db.getById('products', order.productId)?.name || 'Unknown'}</td>
                  <td>$${order.total}</td>
                  <td>${new Date(order.date).toLocaleDateString()}</td>
                  <td>${order.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  showProducts() {
    const contentArea = document.getElementById('admin-content');
    const products = this.db.getAll('products');

    contentArea.innerHTML = `
      <div class="products-view">
        <div class="products-header">
          <h2>Manage Products & Services</h2>
          <button class="btn" onclick="adminApp.openProductModal()">+ ADD PRODUCT</button>
        </div>
        <table class="products-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Price</th>
              <th>Category</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(product => `
              <tr>
                <td><img src="${product.image}" alt="${product.name}" class="product-thumbnail"></td>
                <td>${product.name}</td>
                <td>$${product.price}</td>
                <td>${product.category}</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn btn-small btn-edit" onclick="adminApp.editProduct(${product.id})">Edit</button>
                    <button class="btn btn-small btn-delete" onclick="adminApp.deleteProduct(${product.id})">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  showOrders() {
    const contentArea = document.getElementById('admin-content');
    const orders = this.db.getAll('orders');

    contentArea.innerHTML = `
      <div class="orders-view">
        <h2>Manage Orders</h2>
        <table class="products-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Email</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Total</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(order => `
              <tr>
                <td>#${order.id}</td>
                <td>${order.customerName}</td>
                <td>${order.email}</td>
                <td>${this.db.getById('products', order.productId)?.name || 'Unknown'}</td>
                <td>${order.quantity}</td>
                <td>$${order.total}</td>
                <td>${new Date(order.date).toLocaleDateString()}</td>
                <td>${order.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  setupModal() {
    const modal = document.getElementById('product-modal');
    const closeBtn = document.getElementById('modal-close');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        this.resetForm();
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        this.resetForm();
      }
    });

    const form = document.getElementById('product-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleProductFormSubmit(e));
    }

    const imageFileInput = document.getElementById('product-image-file');
    const imageUrlInput = document.getElementById('product-image');
    const uploadStatus = document.getElementById('product-image-upload-status');
    if (imageFileInput) {
      imageFileInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          if (uploadStatus) uploadStatus.textContent = 'Uploading...';
          const url = await this.uploadMediaFile(file);
          if (imageUrlInput) imageUrlInput.value = url;
          if (uploadStatus) uploadStatus.textContent = 'Uploaded!';
        } catch (err) {
          if (uploadStatus) uploadStatus.textContent = '';
          alert('Upload failed: ' + err.message);
        }
      });
    }
  }


  openProductModal() {
    this.editingProductId = null;
    this.resetForm();
    const modal = document.getElementById('product-modal');
    document.getElementById('modal-title').textContent = 'Add New Product';
    modal.classList.add('active');
  }

  editProduct(productId) {
    const product = this.db.getById('products', productId);
    if (!product) return;

    this.editingProductId = productId;
    
    document.getElementById('modal-title').textContent = 'Edit Product';
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-description').value = product.description;
    document.getElementById('product-image').value = product.image;
    document.getElementById('product-button-text').value = product.buttonText || 'BOOK';

    const modal = document.getElementById('product-modal');
    modal.classList.add('active');
  }

  deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
      this.db.delete('products', productId);
      window.dispatchEvent(new CustomEvent('siteDataUpdated', { detail: this.db.getData() }));
      this.showProducts();
    }
  }

  handleProductFormSubmit(e) {
    e.preventDefault();

    const productData = {
      name: document.getElementById('product-name').value,
      price: parseFloat(document.getElementById('product-price').value),
      category: document.getElementById('product-category').value,
      description: document.getElementById('product-description').value,
      image: document.getElementById('product-image').value || this.getPlaceholderImage(),
      buttonText: document.getElementById('product-button-text').value || 'BOOK'
    };

    if (this.editingProductId) {
      // Update existing product
      this.db.update('products', this.editingProductId, productData);
    } else {
      // Add new product
      this.db.add('products', productData);
    }

    window.dispatchEvent(new CustomEvent('siteDataUpdated', { detail: this.db.getData() }));

    // Close modal and refresh
    document.getElementById('product-modal').classList.remove('active');
    this.resetForm();
    this.showProducts();
  }

  resetForm() {
    const form = document.getElementById('product-form');
    if (form) {
      form.reset();
    }
    this.editingProductId = null;
  }

  getPlaceholderImage() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f5f5' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='14' fill='%23999'%3EProduct Image%3C/text%3E%3C/svg%3E";
  }

  handleLogout() {
    this.auth.logout();
    window.location.href = 'admin-login.html';
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('admin-content')) {
    window.adminApp = new AdminApp();
  }
});
