// ============================================
// SUPABASE AUTHENTICATION MODULE
// ============================================

import { supabase, supabaseReady } from './supabase.js';

export class SupabaseAuth {
  constructor() {
    this.client = supabase;
    this.currentUser = null;
    this.ready = supabaseReady;

    this.ready.then(() => {
      this.initializeAuth();
      // restore session on load so other modules relying on
      // `eau-de-play-current-user` see the logged-in user
      this.restoreSession().catch((e) => console.warn('Restore session failed', e));
    }).catch((error) => {
      console.warn('Supabase auth initialization failed', error);
    });
  }

  // INITIALIZE AUTH STATE LISTENER
  initializeAuth() {
    if (!this.client?.auth || typeof this.client.auth.onAuthStateChange !== 'function') {
      console.warn('Supabase auth client is not ready; auth state listener not attached.');
      return;
    }

    this.client.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth event:', event);
      if (session?.user) {
        const user = this.attachAdminRole(session.user);
        this.currentUser = user;
        // keep both legacy and new keys in sync
        localStorage.setItem('eau-de-play-user', JSON.stringify(user));
        localStorage.setItem('eau-de-play-current-user', JSON.stringify(user));
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));
      } else {
        this.currentUser = null;
        // remove both keys so UI modules update correctly
        localStorage.removeItem('eau-de-play-user');
        localStorage.removeItem('eau-de-play-current-user');
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
      }
    });
  }

  attachAdminRole(user) {
    const adminEmails = ['eaudeplay@gmail.com', 'admin@eaudeplay.com'];
    const normalizedEmail = String(user?.email || '').trim().toLowerCase();
    if (adminEmails.includes(normalizedEmail)) {
      return { ...user, role: 'admin' };
    }
    return { ...user, role: 'user' };
  }

  async ensureAuthClient() {
    await this.ready;
    if (!this.client?.auth) {
      throw new Error('Supabase auth client not initialized');
    }
    return this.client.auth;
  }

  // Try to restore an existing session on page load and sync localStorage
  async restoreSession() {
    try {
      const auth = await this.ensureAuthClient();
      const { data } = await auth.getSession();
      const session = data?.session || null;
      if (session?.user) {
        const user = this.attachAdminRole(session.user);
        this.currentUser = user;
        localStorage.setItem('eau-de-play-user', JSON.stringify(user));
        localStorage.setItem('eau-de-play-current-user', JSON.stringify(user));
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));
      }
    } catch (error) {
      console.warn('Could not restore session:', error?.message || error);
    }
  }

  formatSignUpError(error) {
    const rawMessage = error?.message || (error && typeof error === 'object' ? JSON.stringify(error) : String(error)) || 'Unknown error';
    const normalized = rawMessage.toLowerCase();

    if (/confirmation email/i.test(rawMessage) || /unexpected_failure/i.test(rawMessage) || /email/i.test(rawMessage) && /send/i.test(rawMessage)) {
      return 'Unable to send the confirmation email right now. Please try again later or check your Supabase email delivery settings.';
    }

    if (/authretryablefetcherror/i.test(rawMessage) || /failed to fetch/i.test(normalized) || /network/i.test(normalized) || /timeout/i.test(normalized)) {
      return 'A temporary signup error occurred. Please try again in a few minutes.';
    }

    return rawMessage;
  }

  // SIGN UP
  async signUp(email, password, metadata = {}) {
    try {
      const auth = await this.ensureAuthClient();
      const payload = { email, password };
      if (metadata && Object.keys(metadata).length) {
        payload.options = { data: metadata };
      }

      const { data, error } = await auth.signUp(payload);
      if (error) throw error;

      const user = data?.user ? this.attachAdminRole(data.user) : null;
      if (data?.session?.user) {
        const sessionUser = this.attachAdminRole(data.session.user);
        this.currentUser = sessionUser;
        localStorage.setItem('eau-de-play-user', JSON.stringify(sessionUser));
        localStorage.setItem('eau-de-play-current-user', JSON.stringify(sessionUser));
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: sessionUser }));
      }

      return {
        success: true,
        user,
        session: data?.session || null,
        confirmationRequired: !data?.session
      };
    } catch (error) {
      const message = this.formatSignUpError(error);
      console.error('❌ Sign up error:', error, message);
      return { success: false, error: message };
    }
  }

  // SIGN IN
  async signIn(email, password) {
    try {
      const auth = await this.ensureAuthClient();
      const { data, error } = await auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      const user = this.attachAdminRole(data.user);
      this.currentUser = user;
      // ensure legacy localStorage key used elsewhere is set
      if (user) {
        localStorage.setItem('eau-de-play-user', JSON.stringify(user));
        localStorage.setItem('eau-de-play-current-user', JSON.stringify(user));
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));
      }
      return { success: true, user };
    } catch (error) {
      const message = error?.message || (error && typeof error === 'object' ? JSON.stringify(error) : String(error)) || 'Unknown error';
      console.error('❌ Sign in error:', message);
      return { success: false, error: message };
    }
  }

  // SIGN OUT
  async signOut() {
    try {
      const auth = await this.ensureAuthClient();
      const { error } = await auth.signOut();
      if (error) throw error;
      this.currentUser = null;
      // clear both keys
      localStorage.removeItem('eau-de-play-user');
      localStorage.removeItem('eau-de-play-current-user');
      window.dispatchEvent(new CustomEvent('userLoggedOut'));
      return { success: true };
    } catch (error) {
      const message = error?.message || (error && typeof error === 'object' ? JSON.stringify(error) : String(error)) || 'Unknown error';
      console.error('❌ Sign out error:', message);
      return { success: false, error: message };
    }
  }

  // GET CURRENT USER
  async getCurrentUser() {
    try {
      const auth = await this.ensureAuthClient();
      const { data, error } = await auth.getUser();
      if (error) {
        const message = String(error?.message || error || 'Unknown auth error');
        if (message.includes('Auth session missing')) {
          return null;
        }
        throw error;
      }
      const normalizedUser = this.attachAdminRole(data.user);
      this.currentUser = normalizedUser;
      return normalizedUser;
    } catch (error) {
      console.error('❌ Get user error:', error?.message || (error && typeof error === 'object' ? JSON.stringify(error) : String(error)) || 'Unknown error');
      return null;
    }
  }

  // convenience alias used by other modules
  async getCurrent() {
    return this.getCurrentUser();
  }

  // CHECK IF AUTHENTICATED
  isAuthenticated() {
    return !!this.currentUser;
  }

  // GET USER EMAIL
  getUserEmail() {
    return this.currentUser?.email;
  }

  // UPDATE USER METADATA
  async updateProfile(updates) {
    try {
      const auth = await this.ensureAuthClient();
      const { data, error } = await auth.updateUser({
        data: updates
      });
      if (error) throw error;
      this.currentUser = data.user;
      return { success: true, user: data.user };
    } catch (error) {
      const message = error?.message || (error && typeof error === 'object' ? JSON.stringify(error) : String(error)) || 'Unknown error';
      console.error('❌ Update profile error:', message);
      return { success: false, error: message };
    }
  }

  // RESET PASSWORD
  async resetPassword(email) {
    try {
      const auth = await this.ensureAuthClient();
      const { error } = await auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      const message = error?.message || (error && typeof error === 'object' ? JSON.stringify(error) : String(error)) || 'Unknown error';
      console.error('❌ Reset password error:', message);
      return { success: false, error: message };
    }
  }

  // UPDATE PASSWORD
  async updatePassword(newPassword) {
    try {
      const auth = await this.ensureAuthClient();
      const { error } = await auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      const message = error?.message || (error && typeof error === 'object' ? JSON.stringify(error) : String(error)) || 'Unknown error';
      console.error('❌ Update password error:', message);
      return { success: false, error: message };
    }
  }
}

export const supabaseAuth = new SupabaseAuth();
export default supabaseAuth;
