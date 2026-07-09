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

  getAdminCandidates() {
    const candidates = [
      { email: 'eaudeyplay@gmail.com', password: 'EAUDETPLAY456$' },
      { email: 'admin@eaudeplay.com', password: 'admin123' }
    ];

    const storedUsers = this.db.getAll('users') || [];
    storedUsers.forEach((user) => {
      if (user?.role === 'admin' && user?.email && user?.password) {
        candidates.push({ email: String(user.email).trim().toLowerCase(), password: String(user.password) });
      }
    });

    const unique = [];
    const seen = new Set();
    candidates.forEach((candidate) => {
      const key = `${candidate.email}:${candidate.password}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(candidate);
      }
    });

    return unique;
  }

  matchesAdminCredentials(email, password) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedPassword = password || '';
    return this.getAdminCandidates().some((candidate) => candidate.email === normalizedEmail && candidate.password === normalizedPassword);
  }

  // LOGIN
  login(email, password, options = {}) {
    const { requireRole = null } = options;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedPassword = password || '';

    if (!this.matchesAdminCredentials(normalizedEmail, normalizedPassword)) {
      return { success: false, error: 'Invalid email or password' };
    }

    const user = {
      id: 1,
      email: normalizedEmail,
      password: normalizedPassword,
      role: 'admin'
    };

    if (requireRole && user.role !== requireRole) {
      return { success: false, error: 'Only admins can access the admin panel.' };
    }

    this.currentUser = user;
    this.saveCurrentUser(user);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));
    }
    return { success: true, user };
  }

  // LOGOUT
  logout() {
    this.currentUser = null;
    localStorage.removeItem('eau-de-play-current-user');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('userLoggedOut'));
    }
    return true;
  }

  // GET CURRENT USER
  getCurrentUser() {
    return this.currentUser;
  }

  // IS AUTHENTICATED
  isAuthenticated() {
    if (!this.currentUser) return false;
    const normalizedEmail = (this.currentUser.email || '').trim().toLowerCase();
    const normalizedPassword = this.currentUser.password || '';
    return this.currentUser.role === 'admin' && this.matchesAdminCredentials(normalizedEmail, normalizedPassword);
  }

  // SAVE CURRENT USER
  saveCurrentUser(user) {
    localStorage.setItem('eau-de-play-current-user', JSON.stringify(user));
  }

  // LOAD CURRENT USER
  loadCurrentUser() {
    try {
      const raw = localStorage.getItem('eau-de-play-current-user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.role !== 'admin') return null;
      const normalizedEmail = (parsed.email || '').trim().toLowerCase();
      const normalizedPassword = parsed.password || '';
      if (this.matchesAdminCredentials(normalizedEmail, normalizedPassword)) {
        return parsed;
      }
      return null;
    } catch (err) {
      return null;
    }
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
