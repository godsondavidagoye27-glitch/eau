// ============================================
// DATABASE MODULE - LocalStorage CRUD Operations
// ============================================

export class Database {
  constructor(storageKey = 'eau-de-play-db') {
    this.storageKey = storageKey;
    this.initializeDB();
  }

  async initializeFromServer() {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
      return this.getData();
    }

    try {
      const response = await window.fetch('/api/site-data');
      if (!response.ok) {
        return this.getData();
      }
      const data = await response.json();
      return this.syncFromServerData(data);
    } catch (err) {
      console.warn('Initial server sync failed', err);
      return this.getData();
    }
  }

  initializeDB() {
    const sharedData = this.getSharedData();
    if (sharedData && typeof sharedData === 'object') {
      localStorage.setItem(this.storageKey, JSON.stringify(sharedData));
      return;
    }

    const existing = localStorage.getItem(this.storageKey);
    if (!existing) {
      const initialData = {
        products: [
          {
            id: 1,
            name: "Premium DJ Services",
            category: "service",
            price: 500,
            description: "Professional DJ services for events",
            image: "assets/images/IMG_3347.jpg",
            buttonText: "BOOK"
          },
          {
            id: 2,
            name: "Photography & Videography",
            category: "service",
            price: 800,
            description: "Professional photography and videography packages",
            image: "assets/images/IMG-20260713-WA0009.jpg",
            buttonText: "BOOK"
          },
          {
            id: 3,
            name: "Event Planning",
            category: "service",
            price: 1200,
            description: "Complete event planning and coordination",
            image: "assets/images/IMG_4703.jpg",
            buttonText: "BOOK"
          },
          {
            id: 4,
            name: "Sports Solutions",
            category: "service",
            price: 600,
            description: "Sports event management and coverage",
            image: "assets/images/IMG-20260713-WA0008.jpg",
            buttonText: "BOOK"
          }
        ],
        merchandise: [
          {
            id: 101,
            name: "Eau de Kack T-Shirt",
            category: "merchandise",
            price: 25,
            description: "Premium cotton t-shirt with logo",
            image: "assets/images/IMG_1599.JPG",
            buttonText: "ADD TO CART"
          },
          {
            id: 102,
            name: "Eau de Play Cap",
            category: "merchandise",
            price: 20,
            description: "Adjustable cap with embroidered logo",
            image: "assets/images/IMG_2128.JPG",
            buttonText: "ADD TO CART"
          },
          {
            id: 103,
            name: "Brand Hoodie",
            category: "merchandise",
            price: 60,
            description: "Comfortable pullover hoodie",
            image: "assets/images/IMG_1953.JPG",
            buttonText: "ADD TO CART"
          }
        ],
        settings: [
          {
            id: 'afro-pulse',
            title: "AFRO PULSE '27",
            subtitle: "Every edition set to spark up summer seasons in Iceland. Sign up for the next experience, join our community to stay updated on newsletters and reserve your tickets for AFRO PULSE '27.",
            ticketUrl: '',
            ticketButtonText: 'Get Tickets',
            newsletterEndpoint: '',
            newsletterConfirmation: 'Thanks for subscribing! We’ll keep you updated.',
            galleryImages: [],
            galleryVideos: [],
          }
        ],
        footerLinks: [
          { label: 'Instagram', href: 'https://www.instagram.com/deyplay.rvk?igsh=bjZ4ZTFhdDJlYzUw' },
          { label: 'TikTok', href: 'https://www.tiktok.com/@eau.dey.play?_r=1&_t=ZN-97rkM4Xkbag' },
          { label: 'Email', href: 'mailto:eaudeyplay@gmail.com' }
        ],
        orders: [
          {
            id: 1001,
            customerName: "John Doe",
            email: "john@example.com",
            productId: 1,
            quantity: 1,
            total: 500,
            date: new Date().toISOString(),
            status: "Pending"
          }
        ],
        users: [
          {
            id: 1,
            email: "admin@eaudeplay.com",
            password: "admin123", // In production, this would be hashed
            role: "admin"
          }
        ]
      };
      localStorage.setItem(this.storageKey, JSON.stringify(initialData));
    }
  }

  getSharedData() {
    if (typeof window !== 'undefined' && window.__SITE_DATA__ && typeof window.__SITE_DATA__ === 'object' && !Array.isArray(window.__SITE_DATA__)) {
      const sharedData = window.__SITE_DATA__;
      if (Object.keys(sharedData).length > 0) {
        return sharedData;
      }
    }
    return null;
  }

  async getSupabaseClient() {
    try {
      const mod = await import('./supabase.js');
      return mod.supabase || mod.default || null;
    } catch (err) {
      console.warn('Supabase client unavailable', err);
      return null;
    }
  }

  getDraftData() {
    const data = this.getData();
    return data.draft && typeof data.draft === 'object' ? data.draft : {};
  }

  async saveDraftData(draft = {}) {
    const data = this.getData();
    data.draft = { ...data.draft, ...draft };
    return this.saveData(data);
  }

  async publishDraft() {
    const data = this.getData();
    const draft = this.getDraftData();
    const publishTarget = { ...data, ...draft, draft: {} };

    await this.saveData(publishTarget);

    try {
      const client = await this.getSupabaseClient();
      if (client && typeof client.from === 'function') {
        const payload = {
          id: 1,
          content: publishTarget,
          updated_at: new Date().toISOString()
        };
        await client.from('site_data').upsert(payload, { onConflict: 'id' }).select();
      }
    } catch (err) {
      console.warn('Direct Supabase publish failed', err);
    }

    return publishTarget;
  }

  async discardDraft() {
    const data = this.getData();
    data.draft = {};
    return this.saveData(data);
  }

  async syncToSupabase(data) {
    const client = await this.getSupabaseClient();
    if (!client || typeof client.from !== 'function') {
      return false;
    }

    const payload = {
      id: 1,
      content: data,
      updated_at: new Date().toISOString()
    };

    const candidateTables = ['site_data', 'site_content', 'site_settings'];

    for (const table of candidateTables) {
      try {
        const { error } = await client.from(table).upsert(payload, { onConflict: 'id' }).select();
        if (!error) {
          return true;
        }
      } catch (err) {
        console.warn(`Supabase sync to ${table} failed`, err);
      }
    }

    return false;
  }

  async fetchSiteDataFromSupabase() {
    const client = await this.getSupabaseClient();
    if (!client || typeof client.from !== 'function') {
      return null;
    }

    try {
      const { data, error } = await client.from('site_data').select('content').eq('id', 1).single();
      if (error) {
        console.warn('Supabase site_data fetch failed', error);
        return null;
      }

      if (!data || data.content == null) {
        return null;
      }

      return typeof data.content === 'string'
        ? JSON.parse(data.content)
        : data.content;
    } catch (err) {
      console.warn('Supabase site_data load failed', err);
      return null;
    }
  }

  // GET ALL ITEMS
  getAll(collection) {
    const data = this.getData();
    return data[collection] || [];
  }

  // GET SINGLE ITEM
  getById(collection, id) {
    const items = this.getAll(collection);
    return items.find(item => item.id === id);
  }

  // CREATE/ADD ITEM
  add(collection, item) {
    const data = this.getData();
    if (!data[collection]) {
      data[collection] = [];
    }
    // Generate ID if not provided
    if (!item.id) {
      item.id = data[collection].length > 0
        ? Math.max(...data[collection].map(i => i.id)) + 1
        : 1;
    }
    data[collection].push(item);
    this.saveData(data);
    return item;
  }

  // UPDATE ITEM
  update(collection, id, updates) {
    const data = this.getData();
    const items = data[collection] || [];
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      data[collection] = items;
      this.saveData(data);
      return items[index];
    }
    return null;
  }

  // DELETE ITEM
  delete(collection, id) {
    const data = this.getData();
    const items = data[collection] || [];
    const filtered = items.filter(item => item.id !== id);
    data[collection] = filtered;
    this.saveData(data);
    return true;
  }

  // GET ALL DATA
  getData() {
    const sharedData = this.getSharedData();
    if (sharedData) {
      return sharedData;
    }

    const data = localStorage.getItem(this.storageKey);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (err) {
        console.warn('Failed to parse local site data', err);
      }
    }

    return {};
  }

  // SAVE ALL DATA
  saveData(data) {
    const normalizedData = data && typeof data === 'object' ? data : {};
    localStorage.setItem(this.storageKey, JSON.stringify(normalizedData));
    if (typeof window !== 'undefined') {
      window.__SITE_DATA__ = normalizedData;
    }

    const syncAndNotify = async () => {
      try {
        if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
          const response = await window.fetch('/api/site-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(normalizedData)
          });

          if (!response.ok) {
            throw new Error('Server rejected site data update');
          }

          const result = await response.json();
          if (result?.data && typeof result.data === 'object') {
            const persistedData = result.data;
            localStorage.setItem(this.storageKey, JSON.stringify(persistedData));
            if (typeof window !== 'undefined') {
              window.__SITE_DATA__ = persistedData;
            }
          }
        }
      } catch (err) {
        console.warn('Failed to sync shared site data', err);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('siteDataUpdated', { detail: normalizedData }));
      }

      if (typeof window !== 'undefined') {
        this.syncToSupabase(normalizedData).catch((err) => {
          console.warn('Supabase sync failed', err);
        });
      }
    };

    return syncAndNotify();
  }

  async refreshFromServer() {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
      return this.getData();
    }

    try {
      const response = await window.fetch('/api/site-data');
      if (!response.ok) {
        return this.getData();
      }
      const data = await response.json();
      return this.syncFromServerData(data);
    } catch (err) {
      console.warn('Failed to refresh shared site data', err);
      return this.getData();
    }
  }

  syncFromServerData(data) {
    if (!data || typeof data !== 'object') return null;
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    if (typeof window !== 'undefined') {
      window.__SITE_DATA__ = data;
      window.dispatchEvent(new CustomEvent('siteDataUpdated', { detail: data }));
    }
    return data;
  }

  // FILTER BY CATEGORY
  getByCategory(collection, category) {
    const items = this.getAll(collection);
    return items.filter(item => item.category === category);
  }

  // CLEAR ALL (for testing)
  clearAll() {
    localStorage.removeItem(this.storageKey);
    this.initializeDB();
  }
}

export default Database;
