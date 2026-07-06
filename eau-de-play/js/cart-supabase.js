// ============================================
// CART MODULE - Supabase Integration
// ============================================

import { supabaseAuth } from './supabase-auth.js';
import { supabase } from './supabase.js';

export class CartManager {
  constructor() {
    this.storageKey = 'eau-de-play-cart';
    this.cart = [];
    this.userId = null;
    this.initializeCart();
  }

  async initializeCart() {
    // Get current user
    const user = await supabaseAuth.getCurrentUser();
    this.userId = user?.id;

    // Load cart from LocalStorage first (fallback while Supabase loads)
    this.loadCartLocal();

    // If user is logged in, try to load from Supabase
    if (this.userId) {
      await this.loadCartFromSupabase();
    }

    this.updateCartBadge();
  }

  // LOAD CART FROM SUPABASE
  async loadCartFromSupabase() {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', this.userId);

      if (error) throw error;

      if (data && data.length > 0) {
        this.cart = data;
        return this.cart;
      }
    } catch (error) {
      console.error('Error loading cart from Supabase:', error);
      // Fallback to local storage
      this.cart = this.loadCartLocal();
    }

    return this.cart;
  }

  // LOAD CART FROM LOCALSTORAGE (Fallback)
  loadCartLocal() {
    const cart = localStorage.getItem(this.storageKey);
    return cart ? JSON.parse(cart) : [];
  }

  // SAVE CART
  async saveCart() {
    // Always save to local storage for offline access
    localStorage.setItem(this.storageKey, JSON.stringify(this.cart));

    // If user is logged in, save to Supabase
    if (this.userId) {
      try {
        // First, delete existing cart items for this user
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', this.userId);

        // Then insert new cart items
        const cartWithUserId = this.cart.map(item => ({
          ...item,
          user_id: this.userId
        }));

        if (cartWithUserId.length > 0) {
          const { error } = await supabase
            .from('cart_items')
            .insert(cartWithUserId);

          if (error) throw error;
        }
      } catch (error) {
        console.error('Error saving cart to Supabase:', error);
        // Cart is still saved locally, so it's not lost
      }
    }

    this.updateCartBadge();
  }

  // ADD TO CART
  addToCart(productId, quantity = 1, productData = {}) {
    const existingItem = this.cart.find(item => item.productId === productId);

    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
    } else {
      this.cart.push({
        id: Date.now(),
        productId,
        name: productData.name || 'Product',
        price: parseFloat(productData.price) || 0,
        image: productData.image || '',
        quantity: parseInt(quantity),
        user_id: this.userId || null
      });
    }

    this.saveCart();

    // show toast briefly
    try {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = `${productData.name || 'Product'} added to cart`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 1800);
    } catch (e) {}

    return { success: true, message: `${productData.name || 'Product'} added to cart!` };
  }

  // REMOVE FROM CART
  removeFromCart(productId) {
    this.cart = this.cart.filter(item => item.productId !== productId);
    this.saveCart();
    return true;
  }

  // UPDATE CART QUANTITY
  updateCartQuantity(productId, newQuantity) {
    const item = this.cart.find(i => i.productId === productId);
    if (!item) return false;

    if (newQuantity <= 0) {
      return this.removeFromCart(productId);
    }

    item.quantity = newQuantity;
    this.saveCart();
    return true;
  }

  // GET CART ITEMS
  getCartItems() {
    return this.cart;
  }

  // GET CART COUNT
  getCartCount() {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  // CALCULATE TOTAL
  calculateTotal() {
    return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  // CLEAR CART
  async clearCart() {
    this.cart = [];
    localStorage.removeItem(this.storageKey);

    if (this.userId) {
      try {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', this.userId);
      } catch (error) {
        console.error('Error clearing cart from Supabase:', error);
      }
    }

    this.updateCartBadge();
  }

  // UPDATE CART BADGE IN NAVBAR
  updateCartBadge() {
    const badge = document.querySelector('.cart-count');
    if (badge) {
      const count = this.getCartCount();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  // RENDER CART ITEMS TO DOM
  renderCartItems(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (this.cart.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <p style="font-size: 18px; margin-bottom: 20px;">Your cart is empty</p>
          <a href="shop.html" style="color: var(--primary-color); text-decoration: none;">
            → Continue Shopping
          </a>
        </div>
      `;
      return;
    }

    const html = this.cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-img">
          <img src="${item.image}" alt="${item.name}">
        </div>
        <div class="cart-item-details">
          <h3>${item.name}</h3>
          <p class="cart-item-price">$${item.price.toFixed(2)}</p>
        </div>
        <div class="cart-item-qty">
          <button onclick="window.cartManager.updateCartQuantity(${item.productId}, ${item.quantity - 1})">−</button>
          <input type="text" value="${item.quantity}" readonly>
          <button onclick="window.cartManager.updateCartQuantity(${item.productId}, ${item.quantity + 1})">+</button>
        </div>
        <div class="cart-item-subtotal">
          $${(item.price * item.quantity).toFixed(2)}
        </div>
        <button class="btn-remove" onclick="window.cartManager.removeFromCart(${item.productId})">
          ✕ Remove
        </button>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  // UPDATE TOTAL DISPLAY
  updateTotal() {
    const subtotal = this.calculateTotal();
    const tax = subtotal * 0.08;
    const shipping = subtotal > 50 ? 0 : 10;
    const total = subtotal + tax + shipping;

    const elements = {
      subtotal: document.getElementById('cart-subtotal'),
      tax: document.getElementById('cart-tax'),
      shipping: document.getElementById('cart-shipping'),
      total: document.getElementById('cart-total-with-tax')
    };

    if (elements.subtotal) elements.subtotal.textContent = `$${subtotal.toFixed(2)}`;
    if (elements.tax) elements.tax.textContent = `$${tax.toFixed(2)}`;
    if (elements.shipping) elements.shipping.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
    if (elements.total) elements.total.textContent = `$${total.toFixed(2)}`;
  }

  // GET SUBTOTAL
  getSubtotal() {
    return this.calculateTotal();
  }

  // GET TAX
  getTax() {
    return this.getSubtotal() * 0.08;
  }

  // GET SHIPPING
  getShipping() {
    const subtotal = this.getSubtotal();
    return subtotal > 50 ? 0 : 10;
  }

  // GET TOTAL WITH TAX & SHIPPING
  getGrandTotal() {
    return this.getSubtotal() + this.getTax() + this.getShipping();
  }
}

// Initialize and expose globally
let cartManagerInstance = null;

async function initializeCartManager() {
  if (!cartManagerInstance) {
    cartManagerInstance = new CartManager();
    await cartManagerInstance.initializeCart();
  }
  return cartManagerInstance;
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    window.cartManager = await initializeCartManager();
  });
} else {
  initializeCartManager().then(cm => {
    window.cartManager = cm;
  });
}

export { CartManager };
export default cartManagerInstance;
