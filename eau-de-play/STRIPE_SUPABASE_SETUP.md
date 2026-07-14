# ✨ FLUTTERWAVE + SUPABASE INTEGRATION GUIDE

## 🎯 Overview

This guide walks you through integrating **Flutterwave** for payments and **Supabase** for authentication and database storage with your EAU DE PLAY website.

**What You'll Get:**
- ✅ Flutterwave payment processing (real payments)
- ✅ Supabase authentication (secure user accounts)
- ✅ Supabase database (products, orders, users)
- ✅ Supabase storage (product images, avatars)
- ✅ Edge Functions (serverless backend)

---

## 📋 Prerequisites

1. **Flutterwave Account** - https://flutterwave.com
2. **Supabase Account** - https://supabase.com
3. **Node.js** (optional, for local testing) - https://nodejs.org

---

## 🚀 STEP 1: Set Up Supabase Project

### 1.1 Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - **Name**: `eau-de-play`
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Pick one closest to your users
4. Click "Create new project"
5. Wait 2-3 minutes for initialization

### 1.2 Get Your API Keys

1. Go to **Settings → API**
2. Copy these values (save in `.env.local`):
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **Service Role Secret** (for Edge Functions) → Keep safe!

### 1.3 Create Database Schema

1. Go to **SQL Editor**
2. Click **New Query**
3. Copy entire contents of `DATABASE_SCHEMA.sql`
4. Paste into SQL Editor
5. Click **Run**
6. Wait for all tables to be created ✅

### 1.4 Create Storage Buckets

1. Go to **Storage**
2. Create 3 buckets:
   - **Name**: `products` → **Public** (for product images)
   - **Name**: `avatars` → **Public** (for user avatars)
   - **Name**: `orders` → **Private** (for order documents)

### 1.5 Enable Auth Providers

1. Go to **Authentication → Providers**
2. Enable:
   - ✅ Email (default, already on)
   - Optional: Google, GitHub, etc.

---

## 💳 STEP 2: Set Up Flutterwave

### 2.1 Create Flutterwave Account

1. Go to https://dashboard.flutterwave.com
2. Sign up and verify email
3. Complete account setup

### 2.2 Get Flutterwave Keys

1. Go to **Developers → API keys**
2. Copy (save in safe places):
   - **Public key** → `VITE_FLW_PUBLIC_KEY` (.env.local)
   - **Secret key** → Save for Edge Function setup
   - **Webhook signing secret** → Save for Edge Function setup

### 2.3 Configure Webhook

1. Go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Enter: `https://your-supabase-url/functions/v1/payments/webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Save the **Signing secret** for Edge Function

---

## 🔧 STEP 3: Environment Configuration

### 3.1 Create `.env.local` File

Create file in project root: `.env.local`

```env
# SUPABASE
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-key...

# FLUTTERWAVE
VITE_FLW_PUBLIC_KEY=FLWPUBK-...your-key...

# API
VITE_API_URL=https://your-project.supabase.co/functions/v1
VITE_NODE_ENV=development
```

⚠️ **Never commit `.env.local` to Git!** It contains sensitive keys.

### 3.2 Add to `.gitignore`

```
.env
.env.local
.env.*.local
```

---

## 🔌 STEP 4: Deploy Supabase Edge Function

### 4.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 4.2 Create Function Directory

```bash
supabase functions new payments
```

### 4.3 Update Function Code

Replace contents of `supabase/functions/payments/index.ts` with:
- Copy from `supabase-functions-payments.ts` in your project

### 4.4 Set Environment Secrets

```bash
supabase secrets set \
  FLW_SECRET_KEY=FLWSECK-...your-secret-key... \
```

### 4.5 Deploy Function

```bash
supabase functions deploy payments
```

---

## 📁 STEP 5: Update Project Files

### 5.1 New Files Created

- ✅ `.env.example` - Environment template
- ✅ `js/supabase.js` - Supabase database module
- ✅ `js/supabase-auth.js` - Supabase authentication
- ✅ `js/stripe-payment.js` - Flutterwave payment processing shim
- ✅ `js/cart-supabase.js` - Cart with Supabase sync
- ✅ `js/checkout-supabase.js` - Checkout with Flutterwave
- ✅ `checkout-flutterwave.html` - New checkout page (Flutterwave)
- ✅ `DATABASE_SCHEMA.sql` - Database structure

### 5.2 Update HTML Files

Update `shop.html` to use new cart module:

```html
<!-- OLD -->
<script type="module" src="js/cart.js"></script>

<!-- NEW -->
<script type="module" src="js/cart-supabase.js"></script>
```

Update checkout link:

```html
<!-- OLD -->
<a href="checkout.html">CHECKOUT</a>

<!-- NEW -->
<a href="checkout-flutterwave.html">CHECKOUT</a>
```

### 5.3 Update Authentication

Replace login/logout code to use Supabase:

```javascript
import { supabaseAuth } from './js/supabase-auth.js';

// Sign up
const { success, error } = await supabaseAuth.signUp(email, password);

// Sign in
const { success, user } = await supabaseAuth.signIn(email, password);

// Sign out
await supabaseAuth.signOut();

// Check if logged in
if (supabaseAuth.isAuthenticated()) {
  const user = await supabaseAuth.getCurrentUser();
}
```

---

## 🧪 STEP 6: Testing

### 6.1 Test Authentication

1. Open your site
2. Click "Sign up" or "Login"
3. Enter test email: `test@example.com`
4. Enter password: `Test123!@#`
5. Should see success message
6. Check Supabase Auth in console

### 6.2 Test Payment (Flutterwave Test Mode)

Use Flutterwave test payment details:

```
Card Number: 4242 4242 4242 4242
Expiry: 12/25
CVC: 123
ZIP: 12345
```

Steps:
1. Add products to cart
2. Click "CHECKOUT"
3. Fill in shipping form
4. Enter test card details
5. Click "PLACE ORDER"
6. Should see success page

### 6.3 Verify in Supabase

1. Check **Orders** table → New order created
2. Check **Cart Items** → Cart cleared
3. Check **Payment Methods** → Card saved (if selected)
4. Check **Flutterwave Dashboard** → Payment appears

---

## 🔐 Security Best Practices

### Frontend (What's OK)
- ✅ Supabase anon key
- ✅ Flutterwave public key
- ✅ Client-side validation

### Backend (Never expose!)
- ❌ Flutterwave secret key
- ❌ Supabase service role key
- ❌ Database passwords
- ❌ Webhook secrets

**Solution:** Use Supabase Edge Functions for:
- Creating payment intents (server-side)
- Processing webhooks
- Updating sensitive data

---

## 🚨 Troubleshooting

### Issue: "Supabase credentials missing"
**Solution:**
1. Create `.env.local` with correct keys
2. Restart your development server
3. Check console for exact missing variable

### Issue: "Payment fails with 'Invalid API Key'"
**Solution:**
1. Verify Flutterwave public key is correct
2. Check it starts with `FLWPUBK-` (test mode) or `FLWPUBK-` (live)
3. Copy from your Flutterwave dashboard settings

### Issue: "Order not appearing in Supabase"
**Solution:**
1. Check if user is logged in (required for checkout)
2. Check browser console for errors
3. Verify database schema was created correctly
4. Check RLS policies allow order creation

### Issue: "Cart not syncing to Supabase"
**Solution:**
1. User must be logged in for sync to work
2. Check browser console for errors
3. LocalStorage backup still works if Supabase fails
4. Offline mode: cart persists locally, syncs when online

### Issue: "Edge Function not found"
**Solution:**
1. Verify function deployed: `supabase functions list`
2. Check function URL: `https://your-project.supabase.co/functions/v1/payments`
3. Check environment secrets were set
4. Redeploy: `supabase functions deploy payments`

---

## 📚 File Structure

```
eau-de-play/
├── .env.example                    # Environment template
├── .env.local                      # Your local secrets (NOT in git)
├── DATABASE_SCHEMA.sql             # Database structure
├── supabase-functions-payments.ts  # Edge Function code
│
├── js/
│   ├── supabase.js                 # Database module
│   ├── supabase-auth.js            # Authentication
│   ├── stripe-payment.js           # Flutterwave integration shim
│   ├── cart-supabase.js            # Cart with Supabase
│   └── checkout-supabase.js        # Checkout with Flutterwave
│
├── checkout-flutterwave.html            # NEW checkout page (Flutterwave)
│
└── supabase/                       # Local (created by CLI)
    └── functions/
        └── payments/
            └── index.ts            # Edge Function
```

---

## 🚀 Going Live

### Before Launch:

1. **Switch to Live Mode**
   - Go to Flutterwave Dashboard
   - Switch from Test to Live keys
   - Update `.env.local` with live keys

2. **Enable HTTPS**
   - Get SSL certificate (free from Let's Encrypt)
   - Update `VITE_API_URL` to `https://`

3. **Database Backup**
   - Enable automated backups in Supabase
   - Test restoration process

4. **Monitor Payments**
   - Set up Flutterwave alerts
   - Monitor failed payments
   - Check order fulfillment

### Security Checklist:

- ✅ `.env.local` not committed to Git
- ✅ Service keys stored securely (not in code)
- ✅ Webhooks verified (using signing secret)
- ✅ HTTPS enabled
- ✅ RLS policies enforced
- ✅ Rate limiting enabled (Supabase)
- ✅ Regular backups scheduled

---

## 📞 Support Resources

### Supabase
- Docs: https://supabase.com/docs
- Community: https://discord.supabase.io
- GitHub: https://github.com/supabase/supabase

### Flutterwave
- Docs: https://developer.flutterwave.com/docs
- API Reference: https://developer.flutterwave.com/docs
- Help: https://developer.flutterwave.com/support

### Your Project
- README.md - Project overview
- DEVELOPER_GUIDE.md - Architecture
- QUICK_REFERENCE.md - Quick API lookup

---

## 🎉 Next Steps

1. ✅ Follow setup guide above
2. ✅ Test everything in development
3. ✅ Deploy Edge Function
4. ✅ Test with Flutterwave test cards
5. ✅ Prepare for launch
6. ✅ Switch to live keys
7. ✅ Monitor payments and orders

---

## 💡 Future Enhancements

- Email confirmations (Supabase Email template)
- Order tracking (customer dashboard)
- Admin order management (enhanced dashboard)
- Inventory system (stock tracking)
- Wishlist/favorites (user saved items)
- Reviews and ratings (product feedback)
- Coupon system (discount codes)
- Analytics dashboard (sales reports)
- Abandoned cart recovery (automated emails)
- Multi-currency support (international sales)

---

**You're all set! 🚀 Happy selling with Flutterwave + Supabase!**
