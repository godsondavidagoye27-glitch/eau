# DEVELOPER GUIDE - EAU DE PLAY

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           USER INTERFACE (HTML)                 │
│  ├─ Public Pages (5 files)                     │
│  └─ Admin Pages (2 files)                      │
└────────────────┬────────────────────────────────┘
                 │
┌─────────────────────────────────────────────────┐
│       APPLICATION LOGIC (JavaScript)            │
│  ├─ public-app.js (Public pages)              │
│  ├─ admin-app.js (Admin dashboard)            │
│  ├─ admin-login.js (Login logic)              │
│  ├─ components.js (Navbar/Footer)             │
│  ├─ auth.js (Authentication)                 │
│  └─ db.js (Database CRUD)                    │
└────────────────┬────────────────────────────────┘
                 │
┌─────────────────────────────────────────────────┐
│    PERSISTENT STORAGE (LocalStorage)            │
│  ├─ eau-de-play-db (Main data)               │
│  ├─ eau-de-play-current-user (Auth)          │
│  └─ eau-de-play-cart (Shopping cart)         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│       STYLING (CSS)                             │
│  ├─ variables.css (CSS variables)             │
│  ├─ global.css (Base styles)                  │
│  ├─ layout.css (Layouts & components)        │
│  ├─ public.css (Public pages)                 │
│  └─ admin.css (Admin pages)                   │
└─────────────────────────────────────────────────┘
```

---

## 📚 Module Documentation

### `db.js` - Database Layer

**Purpose**: CRUD operations on LocalStorage

**Key Methods**:
```javascript
new Database()                              // Initialize
.getAll(collection)                         // Get all items
.getById(collection, id)                    // Get single item by ID
.add(collection, item)                      // Create new item
.update(collection, id, updates)            // Update existing item
.delete(collection, id)                     // Delete item
.getByCategory(collection, category)        // Filter by category
.getData()                                  // Get entire DB
.saveData(data)                             // Save entire DB
.clearAll()                                 // Reset all data
```

**Usage Example**:
```javascript
import Database from './db.js';

const db = new Database();

// Get all products
const products = db.getAll('products');

// Add new product
db.add('products', {
  name: 'New Service',
  price: 500,
  category: 'service',
  description: 'Description here',
  image: 'url',
  buttonText: 'BOOK'
});

// Update product
db.update('products', 1, { price: 600 });

// Delete product
db.delete('products', 1);
```

---

### `auth.js` - Authentication Layer

**Purpose**: User authentication and session management

**Key Methods**:
```javascript
new Auth()                                  // Initialize
.login(email, password)                     // Authenticate user
.logout()                                   // Log out
.isAuthenticated()                          // Check if logged in
.getCurrentUser()                           // Get current user object
.register(email, password)                  // Create new user (future)
```

**Usage Example**:
```javascript
import Auth from './auth.js';

const auth = new Auth();

// Login
const result = auth.login('admin@eaudeplay.com', 'admin123');
if (result.success) {
  console.log('Logged in as:', result.user);
} else {
  console.log('Error:', result.error);
}

// Check authentication
if (auth.isAuthenticated()) {
  const user = auth.getCurrentUser();
  console.log('Logged in as:', user.email);
}

// Logout
auth.logout();
```

---

### `components.js` - Reusable Components

**Purpose**: Generate and inject shared UI components

**Key Functions**:
```javascript
createNavbar()              // Returns navbar HTML string
createFooter()              // Returns footer HTML string
injectNavbarAndFooter()     // Injects both into DOM (called automatically)
```

**How It Works**:
1. Each public page has placeholder divs:
   ```html
   <div id="navbar-placeholder"></div>
   <div id="footer-placeholder"></div>
   ```

2. When `public-app.js` initializes, it calls:
   ```javascript
   injectNavbarAndFooter()
   ```

3. Navbar automatically highlights current page based on URL

---

### `public-app.js` - Public Pages Controller

**Purpose**: Handle all interactions on public-facing pages

**Key Methods**:
```javascript
new PublicApp()                             // Initialize
.init()                                    // Setup page
.setupPageSpecificLogic()                   // Route to correct page handler
.setupHomePage()                            // Render featured products
.setupServicesPage()                        // Render all services
.setupShopPage()                            // Render products
.setupAboutPage()                           // Static content
.setupContactPage()                         // Attach form handlers
.handleContactSubmit(e)                     // Process contact form
.addToCart(productId, name, price)         // Add item to cart
.renderFeaturedProducts()                   // Render home products
.renderServices()                           // Render services grid
.renderProducts()                           // Render shop products
```

**Data Flow on Load**:
1. DOM content loaded
2. `PublicApp` instantiated
3. `injectNavbarAndFooter()` called
4. `setupPageSpecificLogic()` detects current page
5. Appropriate render function called
6. Products fetched from DB and rendered

---

### `admin-app.js` - Admin Dashboard Controller

**Purpose**: Handle all admin dashboard interactions

**Key Methods**:
```javascript
new AdminApp()                              // Initialize (checks auth)
.init()                                    // Setup dashboard
.setupSidebar()                            // Attach sidebar listeners
.switchView(view)                          // Change active view
.showDashboard()                           // Show stats & recent orders
.showProducts()                            // Show products table
.showOrders()                               // Show orders table
.openProductModal()                        // Open add product modal
.editProduct(id)                           // Load product into modal
.deleteProduct(id)                         // Delete product
.handleProductFormSubmit(e)                // Save product (add/update)
.setupModal()                              // Attach modal listeners
.handleLogout()                            // Logout and redirect
```

**Authentication Check**:
- On load, checks `auth.isAuthenticated()`
- If not logged in, redirects to `admin-login.html`
- This prevents direct access to dashboard

---

### `admin-login.js` - Login Page Controller

**Purpose**: Handle admin login functionality

**Key Methods**:
```javascript
new AdminLogin()                            // Initialize
.init()                                    // Check auth, setup form
.setupLoginForm()                          // Attach submit listener
.handleLogin(e)                            // Process login attempt
```

**Login Flow**:
1. User enters email & password
2. Form submitted
3. `handleLogin()` calls `auth.login()`
4. If successful: Redirects to `admin-dashboard.html`
5. If failed: Shows error message for 5 seconds

---

## 🧪 Testing Guide

### Test Public Pages

#### Home Page
```
1. Open index.html
2. Verify:
   - [ ] Navbar shows "HOME" as active
   - [ ] Hero section displays
   - [ ] Featured products load
   - [ ] Footer shows
   - [ ] All links work
```

#### Services Page
```
1. Click "SERVICES" in navbar
2. Verify:
   - [ ] URL is services.html
   - [ ] "SERVICES" active in navbar
   - [ ] 4 service cards display
   - [ ] Each card has: image, name, price, description, BOOK button
   - [ ] Cards are responsive
```

#### Shop Page
```
1. Click "SHOP" in navbar
2. Verify:
   - [ ] Shop page loads
   - [ ] 3 products display
   - [ ] Each product has quantity selector
   - [ ] ADD TO CART button works
   - [ ] Cart stored in LocalStorage
```

#### About Page
```
1. Click "ABOUT" in navbar
2. Verify:
   - [ ] Two-column layout
   - [ ] Image on left
   - [ ] Text on right
   - [ ] All content visible
   - [ ] Mobile: stacks vertically
```

#### Contact Page
```
1. Click "CONTACT" in navbar
2. Verify:
   - [ ] Form displays
   - [ ] All 4 fields present
   - [ ] Form submits (no reload)
   - [ ] Success message appears
   - [ ] Data saved to LocalStorage
```

### Test Admin Functionality

#### Login
```
1. Click "ADMIN" link
2. Open admin-login.html
3. Test with:
   - [ ] Correct credentials (admin@eaudeplay.com / admin123) → Success
   - [ ] Wrong email → Error message
   - [ ] Wrong password → Error message
   - [ ] Error disappears after 5 seconds
```

#### Dashboard Overview
```
1. Login successfully
2. Dashboard view shows:
   - [ ] 3 stat cards with numbers
   - [ ] Recent orders table
   - [ ] All sidebar links functional
   - [ ] Logout button works
```

#### Add Product
```
1. Click "Manage Products"
2. Click "+ ADD PRODUCT"
3. Fill form:
   - [ ] Name field works
   - [ ] Price accepts numbers
   - [ ] Category dropdown works
   - [ ] Description textarea works
   - [ ] Image URL optional
   - [ ] Button Text defaults to "BOOK"
4. Click "SAVE PRODUCT"
5. Verify:
   - [ ] Modal closes
   - [ ] Product appears in table
   - [ ] Product appears on shop.html
```

#### Edit Product
```
1. Click "Manage Products"
2. Click "Edit" on a product
3. Verify:
   - [ ] Modal title changes to "Edit Product"
   - [ ] Form pre-fills with current data
   - [ ] Can modify all fields
   - [ ] Save updates LocalStorage
   - [ ] Table updates without reload
```

#### Delete Product
```
1. Click "Manage Products"
2. Click "Delete" on a product
3. Verify:
   - [ ] Confirmation dialog appears
   - [ ] Canceling keeps product
   - [ ] Confirming removes from table
   - [ ] Product removed from LocalStorage
```

#### Orders Management
```
1. Click "Manage Orders"
2. Verify:
   - [ ] Table shows all orders
   - [ ] Columns: Order ID, Customer, Email, Product, Qty, Total, Date, Status
   - [ ] Real data displays
```

---

## 🔄 Extending the Application

### Add a New Page

1. **Create HTML file** (e.g., `gallery.html`)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Gallery - EAU DE PLAY</title>
  <link rel="stylesheet" href="css/variables.css">
  <link rel="stylesheet" href="css/global.css">
  <link rel="stylesheet" href="css/layout.css">
  <link rel="stylesheet" href="css/public.css">
</head>
<body>
  <div id="navbar-placeholder"></div>
  
  <section>
    <!-- Your content -->
  </section>
  
  <div id="footer-placeholder"></div>
  <script type="module" src="js/public-app.js"></script>
</body>
</html>
```

2. **Update navbar in `components.js`**
```javascript
<li><a href="gallery.html" class="${currentPage === 'gallery.html' ? 'active' : ''}">GALLERY</a></li>
```

3. **Add route in `public-app.js`**
```javascript
} else if (currentPage === 'gallery.html') {
  this.setupGalleryPage();
}
```

4. **Implement handler**
```javascript
setupGalleryPage() {
  // Render gallery content
}
```

---

### Add New Database Collection

1. **Update `db.js` initialization**
```javascript
const initialData = {
  products: [...],
  merchandise: [...],
  testimonials: [  // NEW COLLECTION
    {
      id: 1,
      author: "Client Name",
      content: "Great service!",
      rating: 5
    }
  ]
};
```

2. **Use in app**
```javascript
const testimonials = db.getAll('testimonials');
```

---

### Switch to Firebase

1. **Create `firebase-db.js`** with same API:
```javascript
export class FirebaseDB {
  constructor() {
    // Initialize Firebase
  }
  
  getAll(collection) {
    // Return Firebase query
  }
  
  add(collection, item) {
    // Add to Firebase
  }
  // ... etc
}
```

2. **Update imports**
```javascript
// Before
import Database from './db.js';

// After
import Database from './firebase-db.js';
```

3. **No other code changes needed!**

---

## 🐛 Debugging Tips

### Check if Page Initialized Properly
```javascript
// In browser console
console.log(window.publicApp);  // For public pages
console.log(window.adminApp);   // For admin pages
```

### Inspect LocalStorage
```javascript
// In browser console
console.log(JSON.parse(localStorage.getItem('eau-de-play-db')));
```

### Check Authentication
```javascript
// In browser console
console.log(JSON.parse(localStorage.getItem('eau-de-play-current-user')));
```

### Clear Data & Reset
```javascript
// In browser console (on public page)
localStorage.clear();
location.reload();
```

### Check Network
- Open DevTools (F12)
- Network tab
- Reload page
- See all resources loaded (should all be local files)

### View Errors
- Open DevTools (F12)
- Console tab
- Reload page
- Check for red error messages

---

## 📈 Performance Optimization

### Current Performance
- ✅ All files load instantly (local)
- ✅ No external dependencies
- ✅ Minimal CSS (modular design)
- ✅ No rendering overhead
- ✅ Smooth animations (CSS)

### Future Optimizations
1. **Minify CSS/JS** for production
2. **Code splitting** if adding many pages
3. **Image optimization** when adding real images
4. **ServiceWorker** for offline access
5. **Caching strategy** for faster load times

---

## 🚀 Production Checklist

- [ ] Replace demo admin credentials
- [ ] Remove demo products (or keep as template)
- [ ] Add real images to assets/
- [ ] Update contact information
- [ ] Test all forms and validations
- [ ] Check mobile responsiveness
- [ ] Test in multiple browsers
- [ ] Set up database backup (if using LocalStorage)
- [ ] Plan migration to real backend
- [ ] Add SSL certificate (if hosting)
- [ ] Set up domain
- [ ] Add analytics (Google Analytics)
- [ ] Add privacy policy & terms
- [ ] Test all admin functions
- [ ] Create deployment workflow

---

## 📞 Quick Answers

**Q: How do I add a new feature?**
A: Update the relevant module (db.js, public-app.js, admin-app.js), add HTML to pages, style in CSS files.

**Q: How do I change the database?**
A: Modify db.js (if using a different service) or switch to firebase-db.js.

**Q: How do I add authentication with passwords hashed?**
A: Replace auth.js with a backend authentication service using JWT.

**Q: How do I deploy?**
A: Upload all files to any hosting (GitHub Pages, Netlify, etc.). No build required!

**Q: Can I use this code with a backend?**
A: Yes! Replace db.js with API calls. Everything else stays the same.

---

**Happy coding! 🚀**
