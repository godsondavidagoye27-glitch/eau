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

  init() {
    // Check if user is logged in
    if (!this.auth.isAuthenticated()) {
      window.location.href = 'admin-login.html';
      return;
    }

    this.setupSidebar();
    this.setupModal();
    this.showDashboard();
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
    } else if (view === 'orders') {
      this.showOrders();
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
