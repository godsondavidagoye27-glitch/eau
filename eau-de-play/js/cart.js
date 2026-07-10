// ============================================
// CART MODULE - Shopping Cart Management
// ============================================

export class CartManager {
  constructor() {
    this.storageKey = 'eau-de-play-cart';
    this.cart = this.loadCart();
  }

  // LOAD CART FROM LOCALSTORAGE
  loadCart() {
    const cart = localStorage.getItem(this.storageKey);
    return cart ? JSON.parse(cart) : [];
  }

  // SAVE CART TO LOCALSTORAGE
  saveCart() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.cart));
    this.updateCartBadge();
  }

  // ADD TO CART
  addToCart(productId, quantity = 1, productData = {}) {
    const existingItem = this.cart.find(item => item.productId === productId);

    if (existingItem) {
      // Update quantity if item exists
      existingItem.quantity += parseInt(quantity);
    } else {
      // Add new item
      this.cart.push({
        id: Date.now(),
        productId,
        name: productData.name || 'Product',
        price: productData.price || 0,
        image: productData.image || '',
        quantity: parseInt(quantity)
      });
    }

    this.saveCart();
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
    const item = this.cart.find(item => item.productId === productId);

    if (item) {
      if (newQuantity <= 0) {
        this.removeFromCart(productId);
      } else {
        item.quantity = parseInt(newQuantity);
        this.saveCart();
      }
      return true;
    }
    return false;
  }

  // GET CART ITEMS
  getCartItems() {
    return this.cart;
  }

  // GET CART COUNT
  getCartCount() {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

  // CALCULATE TOTAL PRICE
  calculateTotal() {
    return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  // CLEAR CART
  clearCart() {
    this.cart = [];
    this.saveCart();
    return true;
  }

  // UPDATE CART BADGE IN NAVBAR
  updateCartBadge() {
    const badge = document.querySelector('.cart-count');
    if (badge) {
      const count = this.getCartCount();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  // RENDER CART ITEMS IN DOM
  renderCartItems(containerId = 'cart-items-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (this.cart.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: var(--spacing-3xl);">
          <h3>Your cart is empty</h3>
          <p>Add some products to get started!</p>
          <a href="shop.html" class="btn" style="margin-top: var(--spacing-lg);">
            CONTINUE SHOPPING
          </a>
        </div>
      `;
      return;
    }

    const html = this.cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-image">
          <img src="${item.image}" alt="${item.name}">
        </div>
        <div class="cart-item-details">
          <h3>${item.name}</h3>
          <p class="cart-item-price">$${item.price.toFixed(2)}</p>
        </div>
        <div class="cart-item-quantity">
          <button class="qty-btn" onclick="window.cartManager.updateCartQuantity(${item.productId}, ${item.quantity - 1}); window.cartManager.renderCartItems('${containerId}'); window.cartManager.updateTotal();">−</button>
          <input type="number" value="${item.quantity}" readonly class="qty-display">
          <button class="qty-btn" onclick="window.cartManager.updateCartQuantity(${item.productId}, ${item.quantity + 1}); window.cartManager.renderCartItems('${containerId}'); window.cartManager.updateTotal();">+</button>
        </div>
        <div class="cart-item-subtotal">
          $${(item.price * item.quantity).toFixed(2)}
        </div>
        <button class="btn btn-small btn-danger" onclick="window.cartManager.removeFromCart(${item.productId}); window.cartManager.renderCartItems('${containerId}'); window.cartManager.updateTotal();">
          REMOVE
        </button>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  // UPDATE TOTAL PRICE DISPLAY
  updateTotal() {
    const totalElement = document.getElementById('cart-total');
    if (totalElement) {
      const total = this.calculateTotal();
      totalElement.textContent = `$${total.toFixed(2)}`;
    }

    const subtotalElement = document.getElementById('cart-subtotal');
    if (subtotalElement) {
      const subtotal = this.calculateTotal();
      subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    }

    const taxElement = document.getElementById('cart-tax');
    if (taxElement) {
      const subtotal = this.calculateTotal();
      const tax = subtotal * 0.08; // 8% tax
      taxElement.textContent = `$${tax.toFixed(2)}`;
    }

    const totalWithTaxElement = document.getElementById('cart-total-with-tax');
    if (totalWithTaxElement) {
      const subtotal = this.calculateTotal();
      const tax = subtotal * 0.08;
      const total = subtotal + tax;
      totalWithTaxElement.textContent = `$${total.toFixed(2)}`;
    }
  }
}

// Initialize immediately so add-to-cart buttons can use it as soon as scripts load
window.cartManager = new CartManager();
window.cartManager.updateCartBadge();
window.dispatchEvent(new Event('cartManagerReady'));

export default CartManager;
