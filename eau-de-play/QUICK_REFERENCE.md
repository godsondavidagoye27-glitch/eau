# QUICK REFERENCE GUIDE - EAU DEY PLAY

## 🚀 Getting Started (30 seconds)

1. Open `index.html` in your browser
2. Done! The site is fully functional
3. To access admin: Click "ADMIN" link → Login with `admin@eaudeplay.com` / `admin123`

---

## 📄 Page Map

| Page | Path | Purpose |
|------|------|---------|
| Home | `index.html` | Landing page with featured services |
| Services | `services.html` | Browse all services with booking |
| Shop | `shop.html` | Purchase merchandise |
| About | `about.html` | Company information |
| Contact | `contact.html` | Contact form & business info |
| Admin Login | `admin-login.html` | Authenticate admin user |
| Admin Dashboard | `admin-dashboard.html` | Manage products & orders |

---

## 🔐 Admin Dashboard Walkthrough

### Login
```
→ admin-login.html
  Email: admin@eaudeplay.com
  Password: admin123
```

### Dashboard Overview
```
→ View statistics
→ See recent orders
→ 3 stat cards: Total Products, Total Orders, Revenue
```

### Manage Products
```
→ Click "Manage Products" in sidebar
→ View all products in table
→ Click "+ ADD PRODUCT" to create new
→ Click "Edit" button to modify
→ Click "Delete" button to remove
→ Modal form appears for add/edit
```

### Manage Orders
```
→ Click "Manage Orders" in sidebar
→ View all customer orders
→ Table shows: Order ID, Customer, Email, Product, Qty, Total, Date, Status
```

### Logout
```
→ Click "Logout" in sidebar
→ Redirected to admin-login.html
```

---

## 💾 LocalStorage Keys

| Key | Contains |
|-----|----------|
| `eau-de-play-db` | All application data (products, orders, users, messages) |
| `eau-de-play-current-user` | Currently logged-in admin user |
| `eau-de-play-cart` | Shopping cart items |

**To Clear All Data**:
```javascript
// Open browser console (F12) and run:
localStorage.clear();
// Then refresh the page
```

---

## 📝 File Modification Guide

### Change Brand Name
**Files to edit**:
- All `.html` files: Search and replace "EAU DEY PLAY"
- `css/variables.css`: Change brand colors

### Add New Admin User
**File**: `js/db.js` (in `initializeDB()` method)
```javascript
users: [
  {
    id: 1,
    email: "admin@eaudeplay.com",
    password: "admin123",
    role: "admin"
  },
  // ADD NEW USER HERE
  {
    id: 2,
    email: "newadmin@example.com",
    password: "newpassword",
    role: "admin"
  }
]
```

### Add New Product (Pre-loaded)
**File**: `js/db.js` (in `initializeDB()` method)
```javascript
products: [
  // ... existing products
  {
    id: 5,
    name: "New Service",
    category: "service",
    price: 999,
    description: "Service description",
    image: "url-or-leave-empty",
    buttonText: "BOOK"
  }
]
```

Or add via Admin Dashboard UI (easier!)

### Change Colors
**File**: `css/variables.css`
```css
:root {
  --color-primary: #000000;        /* Main color */
  --color-background: #ffffff;     /* Background */
  --color-text: #000000;          /* Text color */
  /* ... more colors ... */
}
```

### Change Fonts
**File**: `css/variables.css`
```css
:root {
  --font-serif: 'Georgia', serif;        /* Headings */
  --font-sans: 'Arial', sans-serif;      /* Body text */
}
```

### Change Spacing/Sizes
**File**: `css/variables.css`
```css
:root {
  --spacing-md: 1rem;         /* Default spacing */
  --font-size-base: 1rem;     /* Default font size */
  /* ... more sizes ... */
}
```

---

## 🎨 Styling Classes

### Buttons
```html
<button class="btn">PRIMARY</button>
<button class="btn btn-secondary">SECONDARY</button>
<button class="btn btn-small">SMALL</button>
<button class="btn btn-large">LARGE</button>
<button class="btn btn-danger">DANGER</button>
<button class="btn btn-success">SUCCESS</button>
```

### Cards
```html
<div class="card">
  <img class="card-img" src="...">
  <div class="card-title">Title</div>
  <div class="card-price">$99</div>
  <div class="card-description">Description</div>
</div>
```

### Grids
```html
<div class="grid grid-2"><!-- 2 columns --></div>
<div class="grid grid-3"><!-- 3 columns --></div>
<div class="grid grid-4"><!-- 4 columns --></div>
```

### Spacing
```html
<div class="mt-md">Margin top medium</div>
<div class="mb-lg">Margin bottom large</div>
<div class="mt-xl">Margin top extra large</div>
```

### Text Utilities
```html
<div class="text-center">Centered text</div>
<div class="text-left">Left aligned</div>
<div class="text-right">Right aligned</div>
```

---

## 🔧 Common Tasks

### Update Admin Credentials
1. Open `js/db.js`
2. Find the `users` array in `initializeDB()`
3. Change `password` field
4. Clear browser storage and refresh

### Add New Product Category
1. Open `admin-dashboard.html`
2. Find the select dropdown with id `product-category`
3. Add new `<option>` tag

### Change Footer Content
1. Open `js/components.js`
2. Find `createFooter()` function
3. Edit the footer HTML

### Add New Menu Link
1. Open `js/components.js`
2. Find the navbar nav items in `createNavbar()`
3. Add new `<li>` with link

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Admin dashboard not loading | Check login - must be logged in first |
| Products not showing | Check LocalStorage in DevTools → Application |
| Styles not applied | Clear browser cache (Ctrl+Shift+R) |
| Form not submitting | Check console for JavaScript errors (F12) |
| Products disappear after refresh | Check LocalStorage wasn't cleared |

---

## 📊 Database Schema

### products/merchandise
```javascript
{
  id: 1,
  name: "Product Name",
  category: "service" | "merchandise",
  price: 99.99,
  description: "...",
  image: "url-or-svg",
  buttonText: "BOOK" | "ADD TO CART"
}
```

### orders
```javascript
{
  id: 1001,
  customerName: "John Doe",
  email: "john@example.com",
  productId: 1,
  quantity: 1,
  total: 500,
  date: "2024-01-01T12:00:00.000Z",
  status: "Pending" | "Completed" | "Cancelled"
}
```

### users
```javascript
{
  id: 1,
  email: "admin@example.com",
  password: "password123",
  role: "admin" | "user"
}
```

### messages
```javascript
{
  id: 1704110400000,
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  message: "...",
  date: "2024-01-01T12:00:00.000Z"
}
```

---

## 🚀 Deploy

### Simple Hosting (GitHub Pages, Netlify, Vercel)
1. No build step needed
2. Upload all files to hosting
3. Set `index.html` as home page
4. Done!

### Important Notes for Deployment
- LocalStorage data is per-domain, so reset after deploying
- Consider backing up LocalStorage periodically
- For production, migrate to real database

---

## 📞 Support Files

| File | Purpose |
|------|---------|
| `README.md` | Full documentation |
| `QUICK_REFERENCE.md` | This file |
| All `.html` files | Complete pages |
| All `.css` files | Styling & layout |
| All `.js` files | Business logic |

---

## ✨ Tips & Tricks

1. **View Page Source**: Right-click → View Page Source to see clean, readable HTML
2. **Check Console**: F12 → Console tab to see any errors
3. **Test Responsiveness**: F12 → Toggle device toolbar (Ctrl+Shift+M)
4. **Inspect Element**: F12 → Right-click element → Inspect
5. **Edit LocalStorage**: F12 → Application → LocalStorage → Select key

---

**Happy Developing! 🎉**
