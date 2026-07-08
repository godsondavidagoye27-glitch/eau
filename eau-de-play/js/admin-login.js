// ============================================
// ADMIN LOGIN MODULE - Login Page Logic
// ============================================

import Auth from './auth.js';

class AdminLogin {
  constructor() {
    this.auth = new Auth();
    this.init();
  }

  init() {
    // If already logged in, redirect to dashboard
    if (this.auth.isAuthenticated()) {
      window.location.href = 'admin-dashboard.html';
      return;
    }

    this.setupLoginForm();
  }

  setupLoginForm() {
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleLogin(e));
    }
  }

  handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const result = this.auth.login(email, password, { requireRole: 'admin' });

    if (result.success) {
      // Redirect to dashboard
      window.location.href = 'admin-dashboard.html';
    } else {
      // Show error message
      const errorEl = document.getElementById('login-error');
      if (errorEl) {
        errorEl.textContent = result.error;
        errorEl.classList.add('show');
        setTimeout(() => {
          errorEl.classList.remove('show');
        }, 5000);
      }
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new AdminLogin();
});
