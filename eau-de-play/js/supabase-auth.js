// ============================================
// SUPABASE AUTHENTICATION MODULE
// ============================================

import { supabase } from './supabase.js';

export class SupabaseAuth {
  constructor() {
    this.client = supabase;
    this.currentUser = null;
    this.initializeAuth();
    // restore session on load so other modules relying on
    // `eau-de-play-current-user` see the logged-in user
    this.restoreSession().catch((e) => console.warn('Restore session failed', e));
  }

  // INITIALIZE AUTH STATE LISTENER
  initializeAuth() {
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
    const adminEmails = ['eaudeyplay@gmail.com', 'admin@eaudeplay.com'];
    const normalizedEmail = String(user?.email || '').trim().toLowerCase();
    if (adminEmails.includes(normalizedEmail)) {
      return { ...user, role: 'admin' };
    }
    return { ...user, role: 'user' };
  }

  // Try to restore an existing session on page load and sync localStorage
  async restoreSession() {
    try {
      const { data } = await this.client.auth.getSession();
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

  // SIGN UP
  async signUp(email, password, metadata = {}) {
    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      console.error('❌ Sign up error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // SIGN IN
  async signIn(email, password) {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
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
      console.error('❌ Sign in error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // SIGN OUT
  async signOut() {
    try {
      const { error } = await this.client.auth.signOut();
      if (error) throw error;
      this.currentUser = null;
      // clear both keys
      localStorage.removeItem('eau-de-play-user');
      localStorage.removeItem('eau-de-play-current-user');
      window.dispatchEvent(new CustomEvent('userLoggedOut'));
      return { success: true };
    } catch (error) {
      console.error('❌ Sign out error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // GET CURRENT USER
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();
      if (error) throw error;
      const normalizedUser = this.attachAdminRole(user);
      this.currentUser = normalizedUser;
      return normalizedUser;
    } catch (error) {
      console.error('❌ Get user error:', error.message);
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
      const { data, error } = await this.client.auth.updateUser({
        data: updates
      });
      if (error) throw error;
      this.currentUser = data.user;
      return { success: true, user: data.user };
    } catch (error) {
      console.error('❌ Update profile error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // RESET PASSWORD
  async resetPassword(email) {
    try {
      const { error } = await this.client.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('❌ Reset password error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // UPDATE PASSWORD
  async updatePassword(newPassword) {
    try {
      const { error } = await this.client.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('❌ Update password error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export const supabaseAuth = new SupabaseAuth();
export default supabaseAuth;
