# FLUTTERWAVE + SUPABASE QUICK REFERENCE

## 🔐 Supabase Authentication

```javascript
import { supabaseAuth } from './js/supabase-auth.js';

// Sign up new user
const { success, user, error } = await supabaseAuth.signUp(
  'user@example.com',
  'password123'
);

// Sign in
const { success, user, error } = await supabaseAuth.signIn(
  'user@example.com',
  'password123'
);

// Sign out
await supabaseAuth.signOut();

// Get current user
const user = await supabaseAuth.getCurrentUser();

// Check if logged in
if (supabaseAuth.isAuthenticated()) {
  console.log('User email:', supabaseAuth.getUserEmail());
}

// Update profile
const { success, user } = await supabaseAuth.updateProfile({
  full_name: 'John Doe',
  phone: '+1234567890'
});

// Reset password
const { success } = await supabaseAuth.resetPassword('user@example.com');

// Update password
const { success } = await supabaseAuth.updatePassword('newPassword123');
```

---

## 💾 Supabase Database

```javascript
import supabaseDB from './js/supabase.js';

// PRODUCTS
const products = await supabaseDB.getProducts('merchandise');
const product = await supabaseDB.getProductById(101);
const newProduct = await supabaseDB.addProduct({
  name: 'T-Shirt',
  price: 25,
  category: 'merchandise'
});
await supabaseDB.updateProduct(101, { price: 30 });
await supabaseDB.deleteProduct(101);

// ORDERS
const order = await supabaseDB.createOrder({
  user_id: userId,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  items: JSON.stringify(cartItems),
  total: 99.99
});
const orders = await supabaseDB.getOrders(userId); // User's orders
const order = await supabaseDB.getOrderById('order-id');
await supabaseDB.updateOrder('order-id', { status: 'shipped' });

// USERS
const user = await supabaseDB.getUser(userId);
await supabaseDB.updateUser(userId, { phone: '+1234567890' });
const newUser = await supabaseDB.createUser({
  id: userId,
  email: 'user@example.com'
});

// FILE UPLOADS
await supabaseDB.uploadFile('products', 'img/shirt.jpg', file);
const url = await supabaseDB.getPublicUrl('products', 'img/shirt.jpg');
await supabaseDB.deleteFile('products', 'img/shirt.jpg');

// MESSAGES (Contact Form)
await supabaseDB.createMessage({
  name: 'John',
  email: 'john@example.com',
  subject: 'Question',
  message: 'Hi there...'
});
const messages = await supabaseDB.getMessages(50); // Last 50 messages
```

---

## 🛒 Supabase Cart Manager

```javascript
// Auto-initialized globally as window.cartManager

// Add item
window.cartManager.addToCart(productId, quantity, {
  name: 'Product',
  price: 25.99,
  image: 'url'
});

// Remove item
window.cartManager.removeFromCart(productId);

// Update quantity
window.cartManager.updateCartQuantity(productId, 5);

// Get data
const items = window.cartManager.getCartItems();
const count = window.cartManager.getCartCount();
const total = window.cartManager.calculateTotal();
const subtotal = window.cartManager.getSubtotal();
const tax = window.cartManager.getTax();
const shipping = window.cartManager.getShipping();
const grandTotal = window.cartManager.getGrandTotal();

// Clear
await window.cartManager.clearCart();

// UI
window.cartManager.renderCartItems('container-id');
window.cartManager.updateTotal();
window.cartManager.updateCartBadge();

// Load from server
const cartItems = await window.cartManager.loadCartFromSupabase();
```

---

## 💳 Flutterwave Payment

```javascript
import { stripePayment } from './js/stripe-payment.js';

// Initialize
await stripePayment.init();

// Mount payment form
await stripePayment.mountCardElement('card-element');

// Create payment intent (from Edge Function)
const clientSecret = await stripePayment.createPaymentIntent(
  99.99, // amount
  { orderId: '123', items: 5 } // metadata
);

// Process payment
const result = await stripePayment.processPayment(clientSecret, {
  name: 'John Doe',
  email: 'john@example.com',
  address: '123 Main St',
  city: 'New York',
  state: 'NY',
  zip: '10001',
  country: 'United States'
});

if (result.success) {
  console.log('Payment successful!', result.transactionId);
} else {
  console.error('Payment failed:', result.error);
}

// Save card for future use
const setupIntent = await stripePayment.createSetupIntent({
  cardName: 'My Card'
});
const setupResult = await stripePayment.confirmSetup(
  setupIntent,
  paymentMethod
);

// Get payment status
const status = await stripePayment.getPaymentStatus(paymentIntentId);

// Cleanup
stripePayment.clearCard();
stripePayment.destroy();
```

---

## 🛍️ Checkout with Flutterwave

```javascript
import { checkout } from './js/checkout-supabase.js';

// Initialize
await checkout.init();

// Process payment
const result = await checkout.processPayment({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  address: '123 Main St',
  city: 'New York',
  state: 'NY',
  zip: '10001',
  country: 'United States',
  notes: 'Gift wrap please'
});

if (result.success) {
  window.location.href = `checkout-success.html?orderId=${result.orderId}`;
}

// Get order status
const order = await checkout.getOrderStatus(orderId);
console.log(order.status); // pending, confirmed, paid, etc

// Save card
const saveResult = await checkout.saveCard({
  cardName: 'My Visa'
});
```

---

## 🔄 Event Listeners

```javascript
// User logged in
window.addEventListener('userLoggedIn', (e) => {
  console.log('User:', e.detail);
});

// User logged out
window.addEventListener('userLoggedOut', () => {
  console.log('User signed out');
});
```

---

## 📊 Supabase Data Structure

### Users Table
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "avatar_url": "https://...",
  "phone": "+1234567890",
  "address": "123 Main St",
  "city": "New York",
  "is_admin": false
}
```

### Products Table
```json
{
  "id": 101,
  "name": "T-Shirt",
  "price": 25.00,
  "category": "merchandise",
  "image": "https://...",
  "stock": 999,
  "active": true
}
```

### Orders Table
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "status": "paid",
  "payment_method": "flutterwave",
  "payment_id": "pi_...",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "address": "123 Main St",
  "city": "New York",
  "items": "[{...cart items...}]",
  "subtotal": 50.00,
  "tax": 4.00,
  "shipping": 0.00,
  "total": 54.00
}
```

### Cart Items Table
```json
{
  "id": 1,
  "user_id": "uuid",
  "product_id": 101,
  "name": "T-Shirt",
  "price": 25.00,
  "quantity": 2
}
```

---

## 🧪 Test Data

### Flutterwave Test Payments
Use the Flutterwave hosted checkout modal with your Flutterwave test keys. For test card details, see Flutterwave docs.

Example test card from Flutterwave docs:
```
Card: 5531886652142950
Exp: 09/32
CVV: 564
PIN: 3310
```

### Test Email Addresses
```
test+1@example.com
test+2@example.com
admin@eaudeplay.com (admin)
```

### Test Password
```
Test123!@#
```

---

## ⚠️ Error Handling

```javascript
try {
  const result = await checkout.processPayment(formData);
  if (!result.success) {
    console.error('Payment error:', result.error);
    // Display error to user
  }
} catch (error) {
  console.error('Checkout error:', error.message);
  // Fallback error handling
}
```

### Common Errors
- **"User must be logged in"** → Redirect to login
- **"Invalid API Key"** → Check Flutterwave keys in .env.local
- **"Card declined"** → Use valid test card
- **"Network error"** → Check internet connection
- **"Webhook not configured"** → Deploy Edge Function

---

## 🔧 Configuration

### Environment Variables (.env.local)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_FLW_PUBLIC_KEY=FLWPUBK-...
FLW_SECRET_KEY=FLWSECK-...
VITE_API_URL=https://your-project.supabase.co/functions/v1
```

### Supabase Settings
- **RLS Policies**: Enforce row-level security
- **Auth**: Email + optional OAuth providers
- **Edge Functions**: Flutterwave payment processing via compatibility shim
- **Storage**: Public buckets for images

### Flutterwave Settings
- **Test Mode**: For development
- **Live Mode**: For production
- **Webhooks**: Payment confirmations
- **API Keys**: Publishable + Secret

---

## 📖 Documentation Files

- `STRIPE_SUPABASE_SETUP.md` - Complete setup guide
- `README.md` - Project overview
- `DEVELOPER_GUIDE.md` - Architecture
- `QUICK_REFERENCE.md` - Cart API reference

---

## 🚀 Quick Start

1. Create `.env.local` with Supabase + Flutterwave keys
2. Run `DATABASE_SCHEMA.sql` in Supabase
3. Deploy Edge Function: `supabase functions deploy payments`
4. Update HTML files to use new checkout
5. Test with Flutterwave payment flow
6. Go live with production keys

---

**Ready to accept payments? 💳**
