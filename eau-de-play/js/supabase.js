// ============================================
// SUPABASE CONFIGURATION & INITIALIZATION
// ============================================

let createClient;

try {
  ({ createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'));
} catch (error) {
  console.error('Supabase module failed to load from CDN:', error);
  throw error;
}

function getSupabaseConfig() {
  const runtimeConfig = typeof window !== 'undefined' ? (window.__SUPABASE_CONFIG__ || window.__APP_CONFIG__ || null) : null;
  const envConfig = typeof import.meta !== 'undefined' ? import.meta.env : null;
  const envUrl = envConfig?.VITE_SUPABASE_URL || '';
  const envKey = envConfig?.VITE_SUPABASE_ANON_KEY || '';
  const appConfig = typeof window !== 'undefined' ? window.__APP_CONFIG__ : null;

  return {
    url: runtimeConfig?.url || runtimeConfig?.supabaseUrl || appConfig?.supabaseUrl || envUrl || '',
    key: runtimeConfig?.anonKey || runtimeConfig?.supabaseAnonKey || appConfig?.supabaseAnonKey || envKey || ''
  };
}

const { url: SUPABASE_URL, key: SUPABASE_KEY } = getSupabaseConfig();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('MISSING SUPABASE CREDENTIALS - set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or provide window.__APP_CONFIG__ before loading the app.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// realtime subscription helpers
export function subscribeToTable(table, handler) {
  if (!supabase) throw new Error('Supabase client not initialized');
  try {
    const channel = supabase.channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        handler(payload);
      })
      .subscribe();

    return channel;
  } catch (err) {
    console.error('Realtime subscription failed', err);
    return null;
  }
}

// ============================================
// SUPABASE DATABASE MODULE
// ============================================

export class SupabaseDB {
  constructor() {
    this.client = supabase;
  }

  // PRODUCTS
  async getProducts(category = null) {
    let query = this.client.from('products').select('*');
    if (category) query = query.eq('category', category);
    const { data, error } = await query;
    if (error) console.error('Error fetching products:', error);
    return data || [];
  }

  async getProductById(id) {
    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    if (error) console.error('Error fetching product:', error);
    return data;
  }

  async addProduct(product) {
    const { data, error } = await this.client
      .from('products')
      .insert([product])
      .select();
    if (error) throw error;
    return data?.[0];
  }

  async updateProduct(id, updates) {
    const { data, error } = await this.client
      .from('products')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  }

  async deleteProduct(id) {
    const { error } = await this.client
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }

  // ORDERS
  async createOrder(order) {
    const { data, error } = await this.client
      .from('orders')
      .insert([order])
      .select();
    if (error) throw error;
    return data?.[0];
  }

  async getOrders(userId = null) {
    let query = this.client.from('orders').select('*');
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) console.error('Error fetching orders:', error);
    return data || [];
  }

  async getOrderById(id) {
    const { data, error } = await this.client
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
    if (error) console.error('Error fetching order:', error);
    return data;
  }

  async updateOrder(id, updates) {
    const { data, error } = await this.client
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  }

  // USERS
  async getUser(id) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error) console.error('Error fetching user:', error);
    return data;
  }

  async updateUser(id, updates) {
    const { data, error } = await this.client
      .from('users')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  }

  async createUser(user) {
    const { data, error } = await this.client
      .from('users')
      .insert([user])
      .select();
    if (error) throw error;
    return data?.[0];
  }

  // FILE UPLOADS (Avatars, Images, etc)
  async uploadFile(bucket, path, file) {
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    if (error) throw error;
    return data;
  }

  async getPublicUrl(bucket, path) {
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl;
  }

  async deleteFile(bucket, path) {
    const { error } = await this.client.storage
      .from(bucket)
      .remove([path]);
    if (error) throw error;
    return true;
  }

  // MESSAGES/CONTACT FORM
  async createMessage(message) {
    const { data, error } = await this.client
      .from('messages')
      .insert([message])
      .select();
    if (error) throw error;
    return data?.[0];
  }

  async getMessages(limit = 50) {
    const { data, error } = await this.client
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) console.error('Error fetching messages:', error);
    return data || [];
  }
}

export default new SupabaseDB();
