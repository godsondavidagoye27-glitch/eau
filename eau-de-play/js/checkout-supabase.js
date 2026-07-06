// ============================================
// CHECKOUT MODULE - Stripe + Supabase Integration
// ============================================

import { supabaseAuth } from './supabase-auth.js';
import { supabase } from './supabase.js';
import { stripePayment } from './stripe-payment.js';

export class Checkout {
  constructor() {
    this.stripe = stripePayment;
    this.cart = window.cartManager;
    this.userId = null;
    this.paymentIntentId = null;
  }

  // INITIALIZE CHECKOUT
  async init() {
    const user = await supabaseAuth.getCurrentUser();
    this.userId = user?.id;

    if (!this.userId) {
      throw new Error('User must be logged in to checkout');
    }

    // Initialize Stripe
    await this.stripe.init();

    // Mount card element if it exists
    const cardContainer = document.getElementById('card-element');
    if (cardContainer) {
      await this.stripe.mountCardElement('card-element');
    }
  }

  // VALIDATE CHECKOUT FORM
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  // CREATE PAYMENT INTENT
  async createPaymentIntent(order) {
    try {
      const total = this.cart.getGrandTotal() * 100; // Convert to cents
      
      this.paymentIntentId = await this.stripe.createPaymentIntent(
        this.cart.getGrandTotal(),
        {
          userId: this.userId,
          orderId: order.id,
          items: this.cart.getCartItems().length
        }
      );

      return this.paymentIntentId;
    } catch (error) {
      console.error('❌ Error creating payment intent:', error);
      throw error;
    }
  }

  // PROCESS PAYMENT
  async processPayment(formData) {
    try {
      // Validate form
      const validation = this.validateForm(formData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Create order
      const order = await this.createOrder(formData);
      
      // Create payment intent
      const clientSecret = await this.createPaymentIntent(order);

      // Process payment with Stripe
      const payment = await this.stripe.processPayment(clientSecret, {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        country: formData.country || 'United States'
      });

      if (!payment.success) {
        // Update order status to failed
        await supabase
          .from('orders')
          .update({ status: 'failed', notes: payment.error })
          .eq('id', order.id);

        return { success: false, error: payment.error };
      }

      // Update order with payment confirmation
      await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          payment_id: payment.transactionId,
          payment_method: 'stripe',
          paid_at: new Date().toISOString()
        })
        .eq('id', order.id);

      // Optionally notify backend to start fulfillment/tracking polling
      try {
        if (typeof fetch === 'function' && import.meta.env?.VITE_API_URL) {
          fetch(`${import.meta.env.VITE_API_URL}/track/initiate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id })
          }).catch(() => {});
        }
      } catch (e) {}

      // Clear cart
      await this.cart.clearCart();

      return {
        success: true,
        orderId: order.id,
        transactionId: payment.transactionId
      };
    } catch (error) {
      console.error('❌ Checkout error:', error);
      return { success: false, error: error.message };
    }
  }

  // CREATE ORDER IN SUPABASE
  async createOrder(formData) {
    try {
      const order = {
        user_id: this.userId,
        status: 'pending',
        carrier: null,
        tracking_number: null,
        shipped_at: null,
        payment_method: 'stripe',
        
        // Customer info
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        
        // Shipping address
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        country: formData.country || 'United States',
        
        // Items
        items: JSON.stringify(this.cart.getCartItems()),
        
        // Calculations
        subtotal: this.cart.getSubtotal(),
        tax: this.cart.getTax(),
        shipping: this.cart.getShipping(),
        total: this.cart.getGrandTotal(),
        
        // Metadata
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

  // GET ORDER STATUS
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

  // SAVE CARD FOR FUTURE USE
  async saveCard(formData) {
    try {
      const setupIntent = await this.stripe.createSetupIntent({
        userId: this.userId,
        cardName: formData.cardName
      });

      const result = await this.stripe.confirmSetup(setupIntent, {
        card: this.stripe.cardElement
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Save payment method to database
      const { error } = await supabase
        .from('payment_methods')
        .insert([{
          user_id: this.userId,
          stripe_payment_method_id: result.setupIntent.payment_method,
          card_name: formData.cardName,
          is_default: false
        }]);

      if (error) throw error;

      return { success: true, paymentMethodId: result.setupIntent.payment_method };
    } catch (error) {
      console.error('❌ Error saving card:', error);
      return { success: false, error: error.message };
    }
  }

  // CLEAR PAYMENT DATA
  clearPayment() {
    this.paymentIntentId = null;
    this.stripe.clearCard();
  }

  // DESTROY
  destroy() {
    this.stripe.destroy();
  }
}

export const checkout = new Checkout();
export default checkout;
