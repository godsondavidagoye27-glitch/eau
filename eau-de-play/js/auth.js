import Database from './db.js';

document.addEventListener('DOMContentLoaded', () => {
  initializeAuthToggle();
  bindAuthForms();
});

function initializeAuthToggle() {
  const switches = document.querySelectorAll('.auth-switch');
  const urlParams = new URLSearchParams(window.location.search);
  const defaultMode = urlParams.get('mode') === 'signup' ? 'signup-panel' : 'login-panel';
  const activeButton = Array.from(switches).find((btn) => btn.dataset.target === defaultMode) || switches[0];

  if (activeButton) {
    setAuthMode(activeButton);
  }

  switches.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      setAuthMode(button);
    });
  });
}

function setAuthMode(button) {
  const target = button.dataset.target;
  const switches = document.querySelectorAll('.auth-switch');
  const panels = document.querySelectorAll('.auth-panel');

  switches.forEach((btn) => btn.classList.toggle('active', btn === button));
  panels.forEach((panel) => {
    const active = panel.id === target;
    panel.classList.toggle('active', active);
    panel.setAttribute('aria-hidden', active ? 'false' : 'true');
  });

  const mode = target === 'signup-panel' ? 'signup' : 'login';
  const currentParams = new URLSearchParams(window.location.search);
  currentParams.set('mode', mode);
  history.replaceState(null, '', `${window.location.pathname}?${currentParams.toString()}`);
}

function bindAuthForms() {
  const signinForm = document.getElementById('signin-form');
  const signupForm = document.getElementById('signup-form');
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get('redirect') || 'account.html';

  if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signin-email').value;
      const password = document.getElementById('signin-password').value;

      const { supabaseAuth } = await import('./supabase-auth.js');
      const res = await supabaseAuth.signIn(email, password);
      if (res.success) {
        window.location.href = redirect;
      } else {
        alert('Sign in failed: ' + (res.error || 'Unknown'));
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;

      const { supabaseAuth } = await import('./supabase-auth.js');
      const res = await supabaseAuth.signUp(email, password);
      if (res.success) {
        alert('Sign up successful! Please check your email for confirmation.');
        window.location.href = redirect;
      } else {
        alert('Sign up failed: ' + (res.error || 'Unknown'));
      }
    });
  }
}

// ============================================
// AUTHENTICATION MODULE - Admin Login/Logout
// ============================================

export class Auth {
  constructor() {
    this.db = new Database();
    this.currentUser = this.loadCurrentUser();
  }

  // LOGIN
  login(email, password, options = {}) {
    const { requireRole = null } = options;
    const users = this.db.getAll('users');
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (requireRole && user.role !== requireRole) {
      return { success: false, error: 'Only admins can access the admin panel.' };
    }

    this.currentUser = user;
    this.saveCurrentUser(user);
    return { success: true, user };
  }

  // LOGOUT
  logout() {
    this.currentUser = null;
    localStorage.removeItem('eau-de-play-current-user');
    return true;
  }

  // GET CURRENT USER
  getCurrentUser() {
    return this.currentUser;
  }

  // IS AUTHENTICATED
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // SAVE CURRENT USER
  saveCurrentUser(user) {
    localStorage.setItem('eau-de-play-current-user', JSON.stringify(user));
  }

  // LOAD CURRENT USER
  loadCurrentUser() {
    const user = localStorage.getItem('eau-de-play-current-user');
    return user ? JSON.parse(user) : null;
  }

  // REGISTER (for future use)
  register(email, password) {
    const users = this.db.getAll('users');
    if (users.find(u => u.email === email)) {
      return { success: false, error: 'Email already exists' };
    }
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      email,
      password,
      role: 'user'
    };
    this.db.add('users', newUser);
    return { success: true, user: newUser };
  }
}

export default Auth;
