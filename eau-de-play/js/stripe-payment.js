// Lightweight compatibility shim for legacy payment references.
// The storefront now routes payments through PayPal instead of Stripe or Flutterwave.

function getRuntimeConfig() {
  const runtimeConfig = typeof window !== 'undefined' ? (window.__APP_CONFIG__ || null) : null;
  const envConfig = typeof import.meta !== 'undefined' ? import.meta.env : null;

  return {
    apiUrl: runtimeConfig?.apiUrl || envConfig?.VITE_API_URL || '/api'
  };
}

const { apiUrl: API_URL } = getRuntimeConfig();

export class StripePayment {
  constructor() {
    this.stripe = null;
    this.elements = null;
    this.cardElement = null;
  }

  async init() {
    console.warn('Stripe has been deprecated in this build. Using PayPal checkout instead.');
    return null;
  }

  async createPaymentIntent() {
    return null;
  }

  async processPayment() {
    return { success: false, error: 'Stripe disabled — use the PayPal checkout flow' };
  }

  async createSetupIntent() { return null; }
  async confirmSetup() { return { success: false, error: 'Not supported' }; }

  clearCard() {}
  destroy() {}
}

export const stripePayment = new StripePayment();
export default stripePayment;
