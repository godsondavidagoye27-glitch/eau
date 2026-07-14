// ============================================
// CHECKOUT MODULE - PayPal + Supabase Integration
// ============================================

import { supabaseAuth } from './supabase-auth.js';
import { supabase } from './supabase.js';

export class Checkout {
  constructor() {
    this.cart = window.cartManager;
    this.userId = null;
    this.paymentIntentId = null;
  }

  async init() {
    const user = await supabaseAuth.getCurrentUser();
    this.userId = user?.id;

    if (!this.userId) {
      throw new Error('User must be logged in to checkout');
    }
  }

  validateForm(formData) {
    const required = [
      'firstName', 'lastName', 'email', 'phone',
      'address', 'city', 'state', 'zip'
    ];

    for (const field of required) {
      if (!formData[field] || formData[field].trim() === '') {
        return {
          valid: false,
          error: `${field} is required`
        };
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  async createPaymentIntent() {
    return null;
  }

  showCheckoutStatus(message, success = false) {
    if (typeof document === 'undefined') return;
    const statusElement = document.getElementById('checkout-status');
    if (!statusElement) return;
    statusElement.className = `payment-status ${success ? 'success' : 'error'}`;
    statusElement.textContent = message;
  }

  buildPayPalUrl(order, total) {
    const runtimeConfig = typeof window !== 'undefined' ? (window.__APP_CONFIG__ || {}) : {};
    const businessEmail = runtimeConfig.paypalBusinessEmail || '';
    const baseOrigin = window.location.origin && window.location.origin !== 'null' ? window.location.origin : 'https://www.paypal.com';
    const url = new URL('https://www.paypal.com/cgi-bin/webscr');
    url.searchParams.set('cmd', '_xclick');
    if (businessEmail) {
      url.searchParams.set('business', businessEmail);
    }
    url.searchParams.set('item_name', `EAU DE PLAY Order ${order.id}`);
    url.searchParams.set('amount', Number(total).toFixed(2));
    url.searchParams.set('currency_code', 'EUR');
    url.searchParams.set('no_shipping', '1');
    url.searchParams.set('return', `${baseOrigin}/checkout-success.html?orderId=${encodeURIComponent(order.id)}&paymentStatus=success`);
    url.searchParams.set('cancel_return', `${baseOrigin}/checkout-success.html?orderId=${encodeURIComponent(order.id)}&paymentStatus=cancelled`);
    return url.toString();
  }

  async processPayment(formData) {
    try {
      const validation = this.validateForm(formData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const order = await this.createOrder(formData);
      const total = Number(this.cart.getGrandTotal() || 0);
      const payPalUrl = this.buildPayPalUrl(order, total);

      void supabase
        .from('orders')
        .update({
          status: 'pending',
          payment_method: 'paypal',
          notes: formData.notes || ''
        })
        .eq('id', order.id);

      if (typeof this.cart?.clearCart === 'function') {
        await this.cart.clearCart();
      }

      this.showCheckoutStatus('Redirecting you to PayPal to complete payment.', true);
      window.location.assign(payPalUrl);
      return { success: true, orderId: order.id, redirectUrl: payPalUrl };
    } catch (error) {
      console.error('❌ Checkout error:', error);
      return { success: false, error: error.message };
    }
  }

  async createOrder(formData) {
    try {
      const user = await supabaseAuth.getCurrentUser();
      if (!user) throw new Error('User must be logged in to create an order');
      const order = {
        user_id: user.id,
        status: 'pending',
        carrier: null,
        tracking_number: null,
        shipped_at: null,
        payment_method: 'paypal',
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        country: formData.country || 'United States',
        items: JSON.stringify(this.cart.getCartItems()),
        subtotal: this.cart.getSubtotal(),
        tax: this.cart.getTax(),
        shipping: this.cart.getShipping(),
        total: this.cart.getGrandTotal(),
        notes: formData.notes || '',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([order])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error creating order:', error);
      throw error;
    }
  }

  async getOrderStatus(orderId) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error getting order status:', error);
      throw error;
    }
  }

  async saveCard() {
    console.warn('Save card is not supported in the PayPal checkout flow.');
    return { success: false, error: 'Save card is not supported' };
  }

  clearPayment() {
    this.paymentIntentId = null;
  }

  destroy() {
    return null;
  }
}

export const checkout = new Checkout();
export default checkout;
