# EAU DE PLAY - Complete Website with Admin Dashboard

A fully functional, multi-page website built with vanilla HTML5, CSS3, and ES6+ JavaScript. No frameworks, no build tools required!

## 🚀 Quick Start

1. **Open in Browser**: Simply open `index.html` in your web browser
2. **Access Admin Dashboard**: Navigate to `admin-login.html`
3. **Demo Credentials**:
   - Email: `admin@eaudeplay.com`
   - Password: `admin123`

## � Newsletter Setup (Resend)

To enable newsletter subscriptions via Resend, set these environment variables:

```bash
RESEND_API_KEY=your_resend_api_key_here
RESEND_SENDER=newsletter@yourdomain.com
```

Then configure the admin dashboard newsletter endpoint to:

```text
http://localhost:3000/api/newsletter
```

If you deploy the site, use your production URL instead, for example:

```text
https://your-domain.com/api/newsletter
```

## �📁 Project Structure

```
eau-de-play/
├── index.html                 # Home page
├── services.html             # Services listing
├── shop.html                 # Product shop
├── about.html                # About page
├── contact.html              # Contact form
├── admin-login.html          # Admin login page
├── admin-dashboard.html      # Admin dashboard
│
├── css/
│   ├── variables.css         # CSS custom properties (colors, fonts, spacing)
│   ├── global.css            # Global styles, typography, form elements
│   ├── layout.css            # Navbar, footer, grids, cards, modals
│   ├── public.css            # Styles for public pages
│   └── admin.css             # Styles for admin dashboard
│
├── js/
│   ├── db.js                 # LocalStorage database operations (CRUD)
│   ├── auth.js               # Authentication and user management
│   ├── components.js         # Reusable navbar and footer components
│   ├── public-app.js         # Public pages DOM manipulation
│   ├── admin-app.js          # Admin dashboard logic
│   └── admin-login.js        # Admin login page logic
│
├── assets/
│   └── images/               # Image storage (empty - uses SVG placeholders)
│
└── README.md                 # This file
```

## 🎨 Design System

### Colors
- **Primary**: Black (#000000)
- **Background**: White (#ffffff)
- **Light Background**: #f5f5f5
- **Text**: Black (#000000)
- **Text Light**: #666666
- **Border**: #e0e0e0

### Typography
- **Headings**: Georgia, Garamond (Serif) - Bold
- **Body**: System fonts (Sans-serif) - Regular

### Components
- **Buttons**: Pill-shaped (full radius), black background, white text
- **Cards**: Subtle shadow on hover with slight elevation
- **Forms**: Clean input fields with focus states
- **Grid**: Responsive flexbox/grid layouts

## 🌐 Public Pages

### Home Page (`index.html`)
- Hero section with brand tagline
- About teaser
- Featured services carousel/grid (fetched from LocalStorage)
- Footer

### Services Page (`services.html`)
- Grid of service offerings (DJ, Photography, Event Planning, Sports)
- Card layout with images, prices, descriptions
- Book/action buttons
- Dynamically loaded from database

### Shop Page (`shop.html`)
- Merchandise products grid
- Product cards with quantity selector
- Add to cart functionality
- Cart stored in LocalStorage

### About Page (`about.html`)
- Two-column layout (image + text)
- Company story and values
- Team information

### Contact Page (`contact.html`)
- Two-column layout (contact info + form)
- Contact form with validation
- Success message on submission
- Messages saved to LocalStorage

## 🔐 Admin Dashboard

### Login Page (`admin-login.html`)
- Clean, centered login form
- Email/password authentication
- Error messages
- Redirects to dashboard on success

### Dashboard (`admin-dashboard.html`)
Three main sections:

#### 1. Dashboard Overview
- Quick stats cards (Total Products, Total Orders, Revenue)
- Recent orders table
- Navigation to other sections

#### 2. Manage Products
- Table view of all products/services
- Columns: Image thumbnail, Name, Price, Category, Actions
- **Add/Edit Modal**:
  - Form to create or edit products
  - Fields: Name, Price, Category, Description, Image URL, Button Text
  - Save to LocalStorage
  - Table updates dynamically
- **Delete**: Remove products with confirmation

#### 3. Manage Orders
- View all orders
- Order details: Customer, Email, Product, Quantity, Total, Date, Status

## 💾 Database (LocalStorage)

The app uses browser's LocalStorage to persist data. Default data includes:

### Collections:
- **products**: Services (DJ, Photography, Event Planning, Sports)
- **merchandise**: Shop items (T-shirts, caps, hoodies)
- **orders**: Customer orders
- **users**: Admin users
- **messages**: Contact form submissions

### No Backend Required!
- ✅ Runs entirely in the browser
- ✅ Data persists across sessions
- ✅ Can be easily swapped for Firebase/Supabase

## 🔄 Data Flow Architecture

```
User Interaction
    ↓
Event Listener (public-app.js / admin-app.js)
    ↓
Database Module (db.js)
    ↓
LocalStorage
    ↓
DOM Update (re-render)
```

## 📝 JavaScript Modules

### `db.js`
Provides CRUD operations for LocalStorage:
```javascript
const db = new Database();
db.getAll('products')           // Get all items
db.getById('products', 1)       // Get single item
db.add('products', item)        // Add new item
db.update('products', 1, {...}) // Update item
db.delete('products', 1)        // Delete item
db.getByCategory('products', 'service')
```

### `auth.js`
Handles authentication:
```javascript
const auth = new Auth();
auth.login(email, password)      // Login
auth.logout()                    // Logout
auth.isAuthenticated()           // Check auth status
auth.getCurrentUser()            // Get current user
```

### `components.js`
Reusable components:
```javascript
createNavbar()                   // Returns navbar HTML
createFooter()                   // Returns footer HTML
injectNavbarAndFooter()         // Injects both into DOM
```

### `public-app.js`
Controls public page functionality:
```javascript
- Renders featured products
- Renders services grid
- Renders merchandise products
- Handles cart operations
- Processes contact forms
```

### `admin-app.js`
Controls admin dashboard:
```javascript
- Dashboard statistics
- Product management (CRUD)
- Order management
- Modal handling
- Table rendering
```

## 🎯 Features

### Public Features
✅ Multi-page navigation with active states
✅ Responsive design (mobile, tablet, desktop)
✅ Dynamic product/service loading
✅ Shopping cart (LocalStorage)
✅ Contact form with validation
✅ Smooth scrolling
✅ Hidden scrollbar

### Admin Features
✅ Secure login with session management
✅ Dashboard overview with statistics
✅ Add new products/services
✅ Edit existing products
✅ Delete products with confirmation
✅ View all orders
✅ Responsive sidebar navigation
✅ Modal for add/edit operations
✅ Real-time table updates

## 🔧 Customization

### Change Brand Colors
Edit `css/variables.css`:
```css
--color-primary: #000000;      /* Change primary color */
--color-background: #ffffff;   /* Change background */
--font-serif: 'Georgia', ...   /* Change heading font */
--font-sans: '...', sans-serif /* Change body font */
```

### Add More Products
Edit `db.js` in the `initializeDB()` method or use the admin dashboard to add dynamically.

### Modify Logo Text
Search for "EAU DE PLAY" in HTML files to change branding.

### Change Admin Credentials
Edit `db.js` in the initial `users` array:
```javascript
{
  id: 1,
  email: "youremail@example.com",
  password: "yourpassword",
  role: "admin"
}
```

## 🚀 Migration to Backend

The code is structured to easily swap LocalStorage for a backend:

1. **Database Layer** (`db.js`):
   - Replace localStorage calls with API calls
   - Keep the same method names for compatibility

2. **Auth Layer** (`auth.js`):
   - Replace with JWT authentication
   - Call your auth API endpoints

3. **No Other Changes Needed**:
   - UI components stay the same
   - Business logic stays the same

Example migration:
```javascript
// Before: LocalStorage
db.getAll('products')

// After: Fetch API
fetch('/api/products').then(r => r.json())
```

## 🎓 Browser Compatibility

- Chrome/Edge: ✅ Excellent
- Firefox: ✅ Excellent
- Safari: ✅ Excellent
- Mobile browsers: ✅ Responsive

## 📱 Responsive Breakpoints

- Desktop: 1024px+
- Tablet: 768px - 1023px
- Mobile: < 768px

## 🔐 Security Notes

⚠️ **This is a prototype** - for production:
- Hash passwords using bcrypt/Argon2
- Use HTTPS
- Implement proper JWT authentication
- Use a real database (Firebase, Supabase, PostgreSQL)
- Validate all inputs on backend
- Implement CSRF protection
- Add rate limiting

## 📖 Usage Examples

### Adding a Product via Admin
1. Go to admin-login.html
2. Login with admin@eaudeplay.com / admin123
3. Click "Manage Products"
4. Click "+ ADD PRODUCT"
5. Fill in the form
6. Click "SAVE PRODUCT"
7. Product appears in table and on shop page

### Adding to Cart
1. Go to shop.html
2. Adjust quantity with +/- buttons
3. Click "ADD TO CART"
4. Cart is saved in browser's LocalStorage

### Submitting Contact Form
1. Go to contact.html
2. Fill in form fields
3. Click "SEND MESSAGE"
4. Success message appears
5. Message is saved to LocalStorage

## 🛠️ Development Tips

1. **Open Console** (F12) to see any errors
2. **Check LocalStorage**: 
   - Open DevTools → Application → LocalStorage
   - Key: `eau-de-play-db`
3. **Clear Data**: 
   - In Console: `localStorage.clear()`
   - Then refresh page to reinitialize

## 📦 No Dependencies Required!

- ✅ No npm/package managers needed
- ✅ No build tools required
- ✅ No CSS framework needed
- ✅ No JavaScript framework needed
- ✅ Works offline
- ✅ Mobile friendly

## 🎉 You're Ready!

Open `index.html` in your browser and enjoy! The site is fully functional and ready to customize.

---

**Built with ❤️ using Vanilla HTML5, CSS3, and ES6+ JavaScript**
