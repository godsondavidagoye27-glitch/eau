// ============================================
// STRIPE PAYMENT INTEGRATION
// ============================================

import { loadStripe } from 'https://js.stripe.com/v3/';

function getRuntimeConfig() {
  const runtimeConfig = typeof window !== 'undefined' ? (window.__APP_CONFIG__ || null) : null;
  const envConfig = typeof import.meta !== 'undefined' ? import.meta.env : null;

  return {
    stripePublicKey: runtimeConfig?.stripePublicKey || runtimeConfig?.stripePublishableKey || envConfig?.VITE_STRIPE_PUBLIC_KEY || '',
    apiUrl: runtimeConfig?.apiUrl || envConfig?.VITE_API_URL || '/api'
  };
}

const { stripePublicKey: STRIPE_PUBLIC_KEY, apiUrl: API_URL } = getRuntimeConfig();

if (!STRIPE_PUBLIC_KEY) {
  console.error('❌ MISSING STRIPE PUBLIC KEY');
  console.error('Add to .env.local: VITE_STRIPE_PUBLIC_KEY=pk_test_...');
}

let stripeInstance = null;

// Load Stripe instance
async function getStripe() {
  if (!stripeInstance) {
    stripeInstance = await loadStripe(STRIPE_PUBLIC_KEY);
  }
  return stripeInstance;
}

export class StripePayment {
  constructor() {
    this.stripe = null;
    this.elements = null;
    this.cardElement = null;
  }

  // INITIALIZE STRIPE
  async init() {
    this.stripe = await getStripe();
    if (!this.stripe) {
      throw new Error('Failed to initialize Stripe');
    }
    return this.stripe;
  }

  // CREATE PAYMENT INTENT
  async createPaymentIntent(amount, metadata = {}) {
    try {
      const response = await fetch(`${API_URL}/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          metadata
        })
      });

      if (!response.ok) throw new Error('Failed to create payment intent');
      
      const { clientSecret } = await response.json();
      return clientSecret;
    } catch (error) {
      console.error('❌ Error creating payment intent:', error);
      throw error;
    }
  }

  // MOUNT CARD ELEMENT
  async mountCardElement(containerId) {
    await this.init();
    
    this.elements = this.stripe.elements();
    this.cardElement = this.elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#333',
          fontFamily: '"Arial", sans-serif'
        },
        invalid: {
          color: '#fa755a',
          iconColor: '#fa755a'
        }
      }
    });

    const container = document.getElementById(containerId);
    if (container) {
      this.cardElement.mount(`#${containerId}`);
    }

    return this.cardElement;
  }

  // PROCESS PAYMENT
  async processPayment(clientSecret, billingDetails) {
    try {
      if (!this.stripe) await this.init();

      const result = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: this.cardElement,
          billing_details: {
            name: billingDetails.name,
            email: billingDetails.email,
            address: {
              line1: billingDetails.address,
              city: billingDetails.city,
              state: billingDetails.state,
              postal_code: billingDetails.zip,
              country: billingDetails.country
            }
          }
        }
      });

      if (result.error) {
        return { 
          success: false, 
          error: result.error.message 
        };
      }

      // Payment successful
      const paymentIntent = result.paymentIntent;
      return {
        success: true,
        paymentIntent,
        transactionId: paymentIntent.id
      };
    } catch (error) {
      console.error('❌ Payment processing error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // HANDLE PAYMENT METHOD
  async handlePaymentMethod(clientSecret, billingDetails) {
    try {
      if (!this.stripe) await this.init();

      const result = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: this.cardElement,
          billing_details: billingDetails
        }
      });

      return result;
    } catch (error) {
      console.error('❌ Payment method error:', error);
      throw error;
    }
  }

  // CREATE SETUP INTENT (For saved cards)
  async createSetupIntent(metadata = {}) {
    try {
      const response = await fetch(`${API_URL}/payments/setup-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metadata })
      });

      if (!response.ok) throw new Error('Failed to create setup intent');
      
      const { clientSecret } = await response.json();
      return clientSecret;
    } catch (error) {
      console.error('❌ Error creating setup intent:', error);
      throw error;
    }
  }

  // CONFIRM SETUP (For saved cards)
  async confirmSetup(clientSecret, paymentMethod) {
    try {
      if (!this.stripe) await this.init();

      const result = await this.stripe.confirmCardSetup(clientSecret, {
        payment_method: paymentMethod
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { 
        success: true, 
        setupIntent: result.setupIntent 
      };
    } catch (error) {
      console.error('❌ Setup confirmation error:', error);
      return { success: false, error: error.message };
    }
  }

  // RETRIEVE PAYMENT STATUS
  async getPaymentStatus(paymentIntentId) {
    try {
      const response = await fetch(
        `${API_URL}/payments/status/${paymentIntentId}`
      );

      if (!response.ok) throw new Error('Failed to retrieve payment status');
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error retrieving payment status:', error);
      throw error;
    }
  }

  // CLEAR CARD ELEMENT
  clearCard() {
    if (this.cardElement) {
      this.cardElement.clear();
    }
  }

  // DESTROY ELEMENTS
  destroy() {
    if (this.cardElement) {
      this.cardElement.unmount();
      this.cardElement = null;
    }
    if (this.elements) {
      this.elements = null;
    }
  }
}

export const stripePayment = new StripePayment();
export default stripePayment;
