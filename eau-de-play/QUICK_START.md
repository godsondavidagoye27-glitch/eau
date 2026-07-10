# ⚡ QUICK START CHECKLIST - Flutterwave & Supabase

## 🎯 5-Step Setup (20 minutes)

### ✅ STEP 1: Create Accounts (5 min)
- [ ] Create Flutterwave account: https://flutterwave.com
- [ ] Create Supabase account: https://supabase.com
- [ ] Verify both emails

### ✅ STEP 2: Get API Keys (2 min)
**From Flutterwave Dashboard** (https://dashboard.flutterwave.com):
- [ ] Copy **Public Key**
  - Save as: `VITE_FLW_PUBLIC_KEY`
- [ ] Copy **Secret Key**
  - Save as: `FLW_SECRET_KEY`

**From Supabase Console** (https://app.supabase.com):
- [ ] Go to **Settings → API**
- [ ] Copy **Project URL**
  - Save as: `VITE_SUPABASE_URL`
- [ ] Copy **anon public key**
  - Save as: `VITE_SUPABASE_ANON_KEY`
- [ ] Copy **Service Role Secret** (keep private!)
  - Save for Edge Function

### ✅ STEP 3: Create .env.local (1 min)
Create file: `eau-de-play/.env.local`
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_FLW_PUBLIC_KEY=FLWPUBK-...
FLW_SECRET_KEY=FLWSECK-...
VITE_API_URL=https://your-project.supabase.co/functions/v1
VITE_NODE_ENV=development
```
- [ ] File created in project root
- [ ] All 5 keys filled in
- [ ] File is NOT committed to git (.gitignore)

### ✅ STEP 4: Setup Database (3 min)
**In Supabase Console:**
1. [ ] Go to **SQL Editor**
2. [ ] Click **New Query**
3. [ ] Copy entire contents of `DATABASE_SCHEMA.sql`
4. [ ] Paste into SQL editor
5. [ ] Click **Run**
6. [ ] Wait for green checkmark ✅
7. [ ] Check **Tables** section - should see 6 new tables

**Create Storage Buckets:**
1. [ ] Go to **Storage**
2. [ ] Create bucket: **products** (Public)
3. [ ] Create bucket: **avatars** (Public)
4. [ ] Create bucket: **orders** (Private)

### ✅ STEP 5: Test Payment (5 min)
1. [ ] Open `checkout-flutterwave.html` in browser
2. [ ] Click **Sign Up**
   - Email: `test@example.com`
   - Password: `Test123!@#`
3. [ ] Add product to cart
4. [ ] Click **CHECKOUT**
5. [ ] Fill shipping form (use any address)
6. [ ] Enter test card:
   - **Card**: 4242 4242 4242 4242
   - **Exp**: 12/25
   - **CVC**: 123
   - **ZIP**: 12345
7. [ ] Click **PLACE ORDER**
8. [ ] See success page! 🎉

---

## 📋 Verification Checklist

### After Setup
- [ ] **Supabase Console**
  - [ ] User appears in Auth → Users
  - [ ] Order appears in Tables → orders
  - [ ] Order shows correct items & total

- [ ] **Flutterwave Dashboard**
  - [ ] Payment appears in Payments
  - [ ] Status is "Succeeded"
  - [ ] Amount is correct ($xxx.xx)

- [ ] **Browser Console** (F12 → Console)
  - [ ] No red error messages
  - [ ] See success logs

### Test Data Sample
```
Email: test@example.com
Password: Test123!@#
```

---

## 🚀 Deployment (When Ready)

### Option 1: Vercel (Recommended)
```bash
npm install -g vercel
vercel
```
- Follow prompts
- Enter environment variables when asked
- Done! 🎉

### Option 2: Netlify
```bash
npm install -g netlify-cli
netlify deploy
```

### Before Going Live
1. [ ] Switch Flutterwave keys to LIVE
   - Public key: `FLWPUBK-...`
   - Secret key: `FLWSECK-...`
2. [ ] Update `.env.local` with live keys
3. [ ] Test with real card (small amount)
4. [ ] Enable Supabase backups
5. [ ] Configure error monitoring

---

## 📁 Key Files Reference

| File | Purpose | Action |
|------|---------|--------|
| `.env.example` | Template | Copy to `.env.local` |
| `DATABASE_SCHEMA.sql` | Database setup | Run in Supabase SQL |
| `checkout-flutterwave.html` | Payment page | Link in shop.html |
| `STRIPE_SUPABASE_SETUP.md` | Full guide | Read for details |
| `STRIPE_SUPABASE_REFERENCE.md` | API reference | Use for coding |

---

## 🆘 Troubleshooting Quick Fixes

### "Cannot read property 'getUser' of undefined"
- **Fix**: `.env.local` not loaded. Restart dev server.

### "Payment failed - Invalid API Key"
- **Fix**: Wrong Flutterwave key. Check the public key starts with `FLWPUBK_` and the secret starts with `FLWSECK_`

### "User not found in Supabase"
- **Fix**: Run DATABASE_SCHEMA.sql to create auth tables

### "Cart not syncing"
- **Fix**: User must be logged in. Signup first.

### "Webhook failed"
- **Fix**: Edge Function not deployed. Run: `supabase functions deploy payments`

---

## ✨ What's Working Now

✅ User authentication (email/password)
✅ Product shopping & cart management
✅ Real Flutterwave payment processing
✅ Cloud database for orders
✅ Order confirmation & tracking
✅ Responsive checkout page
✅ Payment webhook handling
✅ Order persistence in Supabase

---

## 📞 Quick Reference Links

| Resource | Link |
|----------|------|
| Flutterwave Dashboard | https://dashboard.flutterwave.com |
| Supabase Console | https://app.supabase.com |
| Flutterwave API Keys | https://dashboard.flutterwave.com/#/settings/api-keys |
| Supabase Settings | https://app.supabase.com/project/_/settings/api |
| Test Cards | See Step 5 above |

---

## 🎓 Learn More

- **Flutterwave Docs**: https://developer.flutterwave.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Project README**: `README.md`
- **Setup Guide**: `STRIPE_SUPABASE_SETUP.md`
- **API Reference**: `STRIPE_SUPABASE_REFERENCE.md`

---

## ✅ Done! You're Ready

Your website now has:
- 💳 Real payment processing
- 🔐 Secure authentication
- 💾 Cloud database
- ⚡ Serverless backend
- 📱 Mobile-responsive checkout
- 🎯 Production-ready!

**Next: Follow Step 1-5 above. Should take ~20 minutes. Good luck! 🚀**

---

**Questions? Check the documentation files or Stripe/Supabase support.**
