// Compatibility shim: replace Stripe client usage with a Flutterwave-friendly shim.
// The original `stripe-payment.js` provided a heavy Stripe Card Element integration.
// For the Flutterwave migration we keep a compatible API surface but make the
// operations no-ops that intentionally fall back to the Flutterwave Checkout
// flow implemented elsewhere in the app.

function getRuntimeConfig() {
  const runtimeConfig = typeof window !== 'undefined' ? (window.__APP_CONFIG__ || null) : null;
  const envConfig = typeof import.meta !== 'undefined' ? import.meta.env : null;

  return {
    flutterwavePublicKey: runtimeConfig?.flutterwavePublicKey || envConfig?.VITE_FLW_PUBLIC_KEY || '',
    apiUrl: runtimeConfig?.apiUrl || envConfig?.VITE_API_URL || '/api'
  };
}

const { flutterwavePublicKey: FLW_PUBLIC_KEY, apiUrl: API_URL } = getRuntimeConfig();

export class StripePayment {
  constructor() {
    // keep the same properties used by the rest of the codebase
    this.stripe = null;
    this.elements = null;
    this.cardElement = null;
  }

  // Initialization is a no-op (we don't load Stripe)
  async init() {
    console.warn('Stripe has been deprecated in this build. Using Flutterwave instead.');
    return null;
  }

  // Legacy API: return null to indicate there is no server-side PaymentIntent
  async createPaymentIntent() {
    return null;
  }

  // Process payment: always return failure so callers fall back to Flutterwave Checkout
  async processPayment() {
    return { success: false, error: 'Stripe disabled — use Flutterwave Checkout' };
  }

  // Setup intent / saved cards are not supported with Flutterwave in this codebase
  async createSetupIntent() { return null; }
  async confirmSetup() { return { success: false, error: 'Not supported' }; }

  // Helpers to satisfy callers
  clearCard() {}
  destroy() {}
}

export const stripePayment = new StripePayment();
export default stripePayment;
