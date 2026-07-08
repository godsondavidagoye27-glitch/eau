// ============================================
// DATABASE MODULE - LocalStorage CRUD Operations
// ============================================

export class Database {
  constructor(storageKey = 'eau-de-play-db') {
    this.storageKey = storageKey;
    this.initializeDB();
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
            image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f5f5' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%23999'%3EDIJ Service%3C/text%3E%3C/svg%3E",
            buttonText: "BOOK"
          },
          {
            id: 2,
            name: "Photography & Videography",
            category: "service",
            price: 800,
            description: "Professional photography and videography packages",
            image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f5f5' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%23999'%3EPhoto/Video%3C/text%3E%3C/svg%3E",
            buttonText: "BOOK"
          },
          {
            id: 3,
            name: "Event Planning",
            category: "service",
            price: 1200,
            description: "Complete event planning and coordination",
            image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f5f5' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%23999'%3EEvent Planning%3C/text%3E%3C/svg%3E",
            buttonText: "BOOK"
          },
          {
            id: 4,
            name: "Sports Solutions",
            category: "service",
            price: 600,
            description: "Sports event management and coverage",
            image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f5f5' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%23999'%3ESports%3C/text%3E%3C/svg%3E",
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
            image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f5f5' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%23999'%3ET-Shirt%3C/text%3E%3C/svg%3E",
            buttonText: "ADD TO CART"
          },
          {
            id: 102,
            name: "Eau de Play Cap",
            category: "merchandise",
            price: 20,
            description: "Adjustable cap with embroidered logo",
            image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f5f5' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%23999'%3ECap%3C/text%3E%3C/svg%3E",
            buttonText: "ADD TO CART"
          },
          {
            id: 103,
            name: "Brand Hoodie",
            category: "merchandise",
            price: 60,
            description: "Comfortable pullover hoodie",
            image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f5f5' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%23999'%3EHoodie%3C/text%3E%3C/svg%3E",
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
            galleryImages: [
              { id: 'img-1', src: 'assets/images/IMG_1566.JPG' },
              { id: 'img-2', src: 'assets/images/IMG_1521.JPG' },
              { id: 'img-3', src: 'assets/images/IMG_1427.JPG' },
              { id: 'img-4', src: 'assets/images/IMG_1081.JPG' },
              { id: 'img-5', src: 'assets/images/IMG_1027.JPG' },
              { id: 'img-6', src: 'assets/images/IMG_0971.JPG' },
              { id: 'img-7', src: 'assets/images/IMG_2128.JPG' },
              { id: 'img-8', src: 'assets/images/IMG_2060.JPG' },
              { id: 'img-9', src: 'assets/images/IMG_1953.JPG' },
              { id: 'img-10', src: 'assets/images/IMG_1632.JPG' },
              { id: 'img-11', src: 'assets/images/IMG_1599.JPG' },
              { id: 'img-12', src: 'assets/images/IMG_4764.JPG.jpeg' },
              ...Array.from({ length: 10 }, (_, index) => ({ id: `img-${index + 13}`, src: '' }))
            ],
            galleryVideos: Array.from({ length: 3 }, (_, index) => ({ id: `vid-${index + 1}`, embedUrl: '' })),
          }
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
    if (typeof window !== 'undefined' && window.__SITE_DATA__) {
      return window.__SITE_DATA__;
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
    return data ? JSON.parse(data) : {};
  }

  // SAVE ALL DATA
  saveData(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    if (typeof window !== 'undefined') {
      window.__SITE_DATA__ = data;
      window.dispatchEvent(new CustomEvent('siteDataUpdated', { detail: data }));
    }

    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      window.fetch('/api/site-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      }).catch((err) => {
        console.warn('Failed to sync shared site data', err);
      });
    }

    if (typeof window !== 'undefined') {
      this.syncToSupabase(data).catch((err) => {
        console.warn('Supabase sync failed', err);
      });
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
