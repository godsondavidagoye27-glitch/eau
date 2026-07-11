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
  const key = getEnvValue(runtimeConfig, ['anonKey', 'supabaseAnonKey', 'serviceRoleKey', 'anon_key']) || getEnvValue(appConfig, ['supabaseAnonKey', 'anonKey']) || getEnvValue(browserConfig, ['anonKey']) || '';

  return { url, key };
}

function getSupabaseConfigFromMetaEnv() {
  const envConfig = typeof import.meta !== 'undefined' ? import.meta.env : null;
  const url = getEnvValue(envConfig, ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL', 'SUPABASE_PROJECT_URL']);
  const key = getEnvValue(envConfig, ['VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY', 'SUPABASE_KEY']);
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

  return getSupabaseConfigFromMetaEnv();
}

function createFallbackClient() {
  const createQueryBuilder = () => {
    const builder = {
      select() { return builder; },
      insert() { return builder; },
      update() { return builder; },
      delete() { return builder; },
      eq() { return builder; },
      order() { return builder; },
      limit() { return builder; },
      single: async () => ({ data: null, error: new Error('Supabase is not configured') }),
      maybeSingle: async () => ({ data: null, error: new Error('Supabase is not configured') })
    };
    return builder;
  };

  return {
    from() { return createQueryBuilder(); },
    channel() {
      return {
        on() { return this; },
        subscribe() { return { unsubscribe() {} }; }
      };
    },
    auth: {
      onAuthStateChange() {},
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase is not configured') }),
      signUp: async () => ({ data: { user: null, session: null }, error: new Error('Supabase is not configured') }),
      signOut: async () => ({ error: null }),
      updateUser: async () => ({ data: { user: null }, error: new Error('Supabase is not configured') }),
      resetPasswordForEmail: async () => ({ error: new Error('Supabase is not configured') })
    },
    storage: {
      from() {
        return {
          upload: async () => ({ data: null, error: new Error('Supabase storage is not configured') }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
          remove: async () => ({ data: null, error: new Error('Supabase storage is not configured') })
        };
      }
    },
    rpc: async () => ({ data: null, error: new Error('Supabase is not configured') })
  };
}

const fallbackClient = createFallbackClient();
let supabaseClient = fallbackClient;

async function initializeSupabaseClient() {
  const { url, key } = await getSupabaseConfig();

  if (createClient && url && key) {
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
      console.warn('Supabase client initialization failed, using fallback client:', error);
      supabaseClient = fallbackClient;
      return supabaseClient;
    }
  }

  if (!url || !key) {
    console.warn('Supabase credentials are missing; continuing with local-only mode.');
  }

  return supabaseClient;
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

initializeSupabaseClient().catch((error) => {
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
