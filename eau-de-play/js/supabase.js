// ============================================
// SUPABASE CONFIGURATION & INITIALIZATION
// ============================================

let createClient;

try {
  ({ createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'));
} catch (error) {
  console.warn('Supabase module failed to load from CDN, using fallback client:', error);
  createClient = null;
}

const DEFAULT_SUPABASE_URL = 'https://ogzdkseybdwuqnsaletz.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_sM33fiXNtEIsm0Occ-l3fQ_q0UO1a6w';

function getEnvValue(source, keys) {
  if (!source || typeof source !== 'object') return '';
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function getSupabaseConfigFromWindow() {
  const runtimeConfig = typeof window !== 'undefined' ? (window.__SUPABASE_CONFIG__ || window.__APP_CONFIG__ || window.__RUNTIME_CONFIG__ || null) : null;
  const appConfig = typeof window !== 'undefined' ? window.__APP_CONFIG__ : null;
  const browserConfig = typeof window !== 'undefined' ? window.__SUPABASE_CONFIG__ : null;

  const url = getEnvValue(runtimeConfig, ['url', 'supabaseUrl', 'projectUrl']) || getEnvValue(appConfig, ['supabaseUrl', 'url']) || getEnvValue(browserConfig, ['url']) || '';
  const key = getEnvValue(runtimeConfig, ['anonKey', 'supabaseAnonKey', 'serviceRoleKey', 'anon_key', 'publishableKey', 'publishable_key']) || getEnvValue(appConfig, ['supabaseAnonKey', 'anonKey', 'publishableKey', 'publishable_key']) || getEnvValue(browserConfig, ['anonKey', 'publishableKey', 'publishable_key']) || '';

  return { url, key };
}

function getSupabaseConfigFromMetaEnv() {
  const envConfig = typeof import.meta !== 'undefined' ? import.meta.env : null;
  const url = getEnvValue(envConfig, ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL', 'SUPABASE_PROJECT_URL']);
  const key = getEnvValue(envConfig, ['VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY', 'SUPABASE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_PUBLISHABLE_KEY']);
  return { url, key };
}

async function getSupabaseConfig() {
  const windowConfig = getSupabaseConfigFromWindow();
  if (windowConfig.url && windowConfig.key) {
    return windowConfig;
  }

  try {
    const response = await fetch('/api/config', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      const config = {
        url: getEnvValue(data, ['supabaseUrl', 'url', 'projectUrl']) || getEnvValue(data, ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']),
        key: getEnvValue(data, ['supabaseAnonKey', 'anonKey', 'key']) || getEnvValue(data, ['SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'])
      };
      if (config.url && config.key) {
        return config;
      }
    }
  } catch (err) {
    console.warn('Unable to load runtime Supabase config from /api/config', err);
  }

  const metaEnvConfig = getSupabaseConfigFromMetaEnv();
  if (metaEnvConfig.url && metaEnvConfig.key) {
    return metaEnvConfig;
  }

  return { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_KEY };
}

let supabaseClient = null;

async function initializeSupabaseClient() {
  const { url, key } = await getSupabaseConfig();

  console.log('Supabase config resolved:', {
    url: url || '[missing]',
    hasKey: !!key,
    keyLength: key ? key.length : 0
  });

  if (!createClient || !url || !key) {
    console.warn('Supabase credentials are missing; realtime features are unavailable until the site is configured.');
    supabaseClient = null;
    return null;
  }

  try {
    supabaseClient = createClient(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    return supabaseClient;
  } catch (error) {
    console.warn('Supabase client initialization failed:', error);
    supabaseClient = null;
    return null;
  }
}

const supabaseProxy = new Proxy({}, {
  get(_target, prop) {
    const client = supabaseClient;
    const value = client?.[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
  set(_target, prop, value) {
    if (supabaseClient) {
      supabaseClient[prop] = value;
    }
    return true;
  }
});

export const supabase = supabaseProxy;
export const supabaseReady = initializeSupabaseClient();
supabaseReady.catch((error) => {
  console.warn('Supabase initialization failed:', error);
});

// realtime subscription helpers
export function subscribeToTable(table, handler) {
  const channelWrapper = {
    unsubscribe() {}
  };

  (async () => {
    const client = await initializeSupabaseClient();
    if (!client || typeof client.channel !== 'function') {
      return;
    }

    try {
      const channel = client.channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          if (typeof handler === 'function') handler(payload);
        })
        .subscribe();

      channelWrapper.unsubscribe = () => {
        try { channel?.unsubscribe?.(); } catch (err) { console.warn('Failed to unsubscribe from realtime channel', err); }
      };
    } catch (err) {
      console.warn('Realtime subscription failed', err);
    }
  })().catch((err) => {
    console.warn('Realtime initialization failed', err);
  });

  return channelWrapper;
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
