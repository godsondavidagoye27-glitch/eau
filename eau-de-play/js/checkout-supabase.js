// ============================================
// CHECKOUT MODULE - Stripe + Supabase Integration
// ============================================

import { supabaseAuth } from './supabase-auth.js';
import { supabase } from './supabase.js';

function getApiUrl() {
  const runtimeConfig = typeof window !== 'undefined' ? (window.__APP_CONFIG__ || null) : null;
  const envConfig = typeof import.meta !== 'undefined' ? import.meta.env : null;
  return runtimeConfig?.apiUrl || envConfig?.VITE_API_URL || '/api';
}

export class Checkout {
  constructor() {
    this.cart = window.cartManager;
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

    // No third-party init required for Flutterwave flow
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
      // For Flutterwave we don't create a server-side PaymentIntent; return null
      return null;
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
        // Create order
        const order = await this.createOrder(formData);

        // Start Flutterwave Checkout
        const flwKey = (window.__APP_CONFIG__ && window.__APP_CONFIG__.flutterwavePublicKey) || '';
        if (!flwKey || !window.FlutterwaveCheckout) {
          throw new Error('Flutterwave not configured');
        }

        const tx_ref = `order-${order.id}-${Date.now()}`;

        FlutterwaveCheckout({
          public_key: flwKey,
          tx_ref,
          amount: this.cart.getGrandTotal(),
          currency: 'EUR',
          payment_options: 'card',
          customer: {
            email: formData.email,
            name: `${formData.firstName} ${formData.lastName}`
          },
          callback: async (data) => {
            try {
              const verifyRes = await fetch('/api/flutterwave/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transaction_id: data.transaction_id })
              });
              const vr = await verifyRes.json();
              if (vr && vr.success && vr.data && vr.data.status === 'successful') {
                // Update order with payment confirmation
                await supabase
                  .from('orders')
                  .update({
                    status: 'confirmed',
                    payment_id: data.transaction_id,
                    payment_method: 'flutterwave',
                    paid_at: new Date().toISOString()
                  })
                  .eq('id', order.id);

                // Clear cart
                await this.cart.clearCart();
                // Redirect to success page
                window.location.href = `checkout-success.html?orderId=${order.id}`;
              } else {
                await supabase
                  .from('orders')
                  .update({ status: 'failed', notes: 'Payment verification failed' })
                  .eq('id', order.id);
                alert('Payment verification failed');
              }
            } catch (err) {
              console.error('Verification error:', err);
              alert('Payment verification error');
            }
          },
          onclose: function() {}
        });

        return { success: true, orderId: order.id };
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
        payment_method: 'flutterwave',
        
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
