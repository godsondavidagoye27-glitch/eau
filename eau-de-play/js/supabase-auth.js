// ============================================
// SUPABASE AUTHENTICATION MODULE
// ============================================

import { supabase } from './supabase.js';

export class SupabaseAuth {
  constructor() {
    this.client = supabase;
    this.currentUser = null;
    this.initializeAuth();
  }

  // INITIALIZE AUTH STATE LISTENER
  initializeAuth() {
    this.client.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth event:', event);
      if (session?.user) {
        this.currentUser = session.user;
        localStorage.setItem('eau-de-play-user', JSON.stringify(session.user));
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: session.user }));
      } else {
        this.currentUser = null;
        localStorage.removeItem('eau-de-play-user');
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
      }
    });
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
      this.currentUser = data.user;
      return { success: true, user: data.user };
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
      this.currentUser = user;
      return user;
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
