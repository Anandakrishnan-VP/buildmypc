import { DEFAULT_CATEGORIES } from './defaultCategories.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const API_BASE = 'http://localhost:5000/api';

// Helper for local storage persistence fallback
const LS_KEYS = {
  CATEGORIES: 'zeus_categories',
  PRODUCTS: 'zeus_products',
  CLIENTS: 'zeus_clients',
  QUOTATIONS: 'zeus_quotations',
  SETTINGS: 'zeus_settings'
};

function getLS(key, defaultVal) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function setLS(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

// Preload categories on first launch
if (!localStorage.getItem(LS_KEYS.CATEGORIES)) {
  setLS(LS_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
}

// Request helper for Local Express API
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errData = await response.json();
      errorMsg = errData.error || errorMsg;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  if (config.responseType === 'blob') {
    return await response.blob();
  }

  return await response.json();
}

// Smart API wrapper supporting Local Server, Supabase Cloud, and LocalStorage
export const api = {
  // Categories
  getCategories: async () => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('categories').select('*').order('id', { ascending: true });
        if (!error && data && data.length > 0) return data;
      }
      return await request('/categories');
    } catch (e) {
      const cached = getLS(LS_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
      return cached.length > 0 ? cached : DEFAULT_CATEGORIES;
    }
  },

  createCategory: async (data) => {
    try {
      if (isSupabaseConfigured) {
        const { data: inserted, error } = await supabase.from('categories').insert([data]).select();
        if (!error && inserted) return inserted[0];
      }
      return await request('/categories', { method: 'POST', body: data });
    } catch (e) {
      const cats = getLS(LS_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
      const newCat = { id: Date.now(), ...data };
      cats.push(newCat);
      setLS(LS_KEYS.CATEGORIES, cats);
      return newCat;
    }
  },

  updateCategory: async (id, data) => {
    try {
      if (isSupabaseConfigured) {
        const { data: updated, error } = await supabase.from('categories').update(data).eq('id', id).select();
        if (!error && updated) return updated[0];
      }
      return await request(`/categories/${id}`, { method: 'PUT', body: data });
    } catch (e) {
      const cats = getLS(LS_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
      const idx = cats.findIndex(c => c.id === Number(id));
      if (idx !== -1) {
        cats[idx] = { ...cats[idx], ...data };
        setLS(LS_KEYS.CATEGORIES, cats);
        return cats[idx];
      }
      return data;
    }
  },

  deleteCategory: async (id) => {
    try {
      if (isSupabaseConfigured) {
        await supabase.from('categories').delete().eq('id', id);
        return { success: true };
      }
      return await request(`/categories/${id}`, { method: 'DELETE' });
    } catch (e) {
      const cats = getLS(LS_KEYS.CATEGORIES, DEFAULT_CATEGORIES).filter(c => c.id !== Number(id));
      setLS(LS_KEYS.CATEGORIES, cats);
      return { success: true };
    }
  },

  // Products
  getProducts: async (params = {}) => {
    try {
      if (isSupabaseConfigured) {
        let query = supabase.from('products').select('*');
        if (params.activeOnly) query = query.eq('is_active', true);
        if (params.category_id) query = query.eq('category_id', params.category_id);
        const { data, error } = await query;
        if (!error && data) return data;
      }
      const queryStr = new URLSearchParams(params).toString();
      return await request(`/products${queryStr ? `?${queryStr}` : ''}`);
    } catch (e) {
      let prods = getLS(LS_KEYS.PRODUCTS, []);
      if (params.activeOnly) prods = prods.filter(p => p.is_active !== false);
      if (params.category_id) prods = prods.filter(p => p.category_id === Number(params.category_id));
      return prods;
    }
  },

  getProduct: async (id) => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (!error && data) return data;
      }
      return await request(`/products/${id}`);
    } catch (e) {
      const prods = getLS(LS_KEYS.PRODUCTS, []);
      return prods.find(p => p.id === Number(id)) || null;
    }
  },

  createProduct: async (data) => {
    try {
      if (isSupabaseConfigured) {
        const { data: inserted, error } = await supabase.from('products').insert([data]).select();
        if (!error && inserted) return inserted[0];
      }
      return await request('/products', { method: 'POST', body: data });
    } catch (e) {
      const prods = getLS(LS_KEYS.PRODUCTS, []);
      const newProd = { id: Date.now(), is_active: true, created_at: new Date().toISOString(), ...data };
      prods.push(newProd);
      setLS(LS_KEYS.PRODUCTS, prods);
      return newProd;
    }
  },

  updateProduct: async (id, data) => {
    try {
      if (isSupabaseConfigured) {
        const { data: updated, error } = await supabase.from('products').update(data).eq('id', id).select();
        if (!error && updated) return updated[0];
      }
      return await request(`/products/${id}`, { method: 'PUT', body: data });
    } catch (e) {
      const prods = getLS(LS_KEYS.PRODUCTS, []);
      const idx = prods.findIndex(p => p.id === Number(id));
      if (idx !== -1) {
        prods[idx] = { ...prods[idx], ...data };
        setLS(LS_KEYS.PRODUCTS, prods);
        return prods[idx];
      }
      return data;
    }
  },

  deleteProduct: async (id) => {
    try {
      if (isSupabaseConfigured) {
        await supabase.from('products').delete().eq('id', id);
        return { success: true };
      }
      return await request(`/products/${id}`, { method: 'DELETE' });
    } catch (e) {
      const prods = getLS(LS_KEYS.PRODUCTS, []).filter(p => p.id !== Number(id));
      setLS(LS_KEYS.PRODUCTS, prods);
      return { success: true };
    }
  },

  importProducts: async (items) => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('products').insert(items).select();
        if (!error && data) return { imported: data.length };
      }
      return await request('/products/import', { method: 'POST', body: { items } });
    } catch (e) {
      const prods = getLS(LS_KEYS.PRODUCTS, []);
      items.forEach((item, idx) => {
        prods.push({ id: Date.now() + idx, is_active: true, created_at: new Date().toISOString(), ...item });
      });
      setLS(LS_KEYS.PRODUCTS, prods);
      return { imported: items.length };
    }
  },

  // Clients
  getClients: async (search = '') => {
    try {
      if (isSupabaseConfigured) {
        let query = supabase.from('clients').select('*');
        if (search) query = query.ilike('name', `%${search}%`);
        const { data, error } = await query;
        if (!error && data) return data;
      }
      return await request(`/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    } catch (e) {
      let clients = getLS(LS_KEYS.CLIENTS, []);
      if (search) clients = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
      return clients;
    }
  },

  createClient: async (data) => {
    try {
      if (isSupabaseConfigured) {
        const { data: inserted, error } = await supabase.from('clients').insert([data]).select();
        if (!error && inserted) return inserted[0];
      }
      return await request('/clients', { method: 'POST', body: data });
    } catch (e) {
      const clients = getLS(LS_KEYS.CLIENTS, []);
      const newClient = { id: Date.now(), created_at: new Date().toISOString(), ...data };
      clients.push(newClient);
      setLS(LS_KEYS.CLIENTS, clients);
      return newClient;
    }
  },

  updateClient: async (id, data) => {
    try {
      if (isSupabaseConfigured) {
        const { data: updated, error } = await supabase.from('clients').update(data).eq('id', id).select();
        if (!error && updated) return updated[0];
      }
      return await request(`/clients/${id}`, { method: 'PUT', body: data });
    } catch (e) {
      const clients = getLS(LS_KEYS.CLIENTS, []);
      const idx = clients.findIndex(c => c.id === Number(id));
      if (idx !== -1) {
        clients[idx] = { ...clients[idx], ...data };
        setLS(LS_KEYS.CLIENTS, clients);
        return clients[idx];
      }
      return data;
    }
  },

  deleteClient: async (id) => {
    try {
      if (isSupabaseConfigured) {
        await supabase.from('clients').delete().eq('id', id);
        return { success: true };
      }
      return await request(`/clients/${id}`, { method: 'DELETE' });
    } catch (e) {
      const clients = getLS(LS_KEYS.CLIENTS, []).filter(c => c.id !== Number(id));
      setLS(LS_KEYS.CLIENTS, clients);
      return { success: true };
    }
  },

  // Quotations
  getQuotations: async (params = {}) => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('quotations').select('*, items:quotation_items(*)');
        if (!error && data) return data;
      }
      const queryStr = new URLSearchParams(params).toString();
      return await request(`/quotations${queryStr ? `?${queryStr}` : ''}`);
    } catch (e) {
      return getLS(LS_KEYS.QUOTATIONS, []);
    }
  },

  getQuotation: async (id) => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('quotations').select('*, items:quotation_items(*)').eq('id', id).single();
        if (!error && data) return data;
      }
      return await request(`/quotations/${id}`);
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      return quotes.find(q => q.id === Number(id)) || null;
    }
  },

  createQuotation: async (data) => {
    try {
      if (isSupabaseConfigured) {
        const { data: inserted, error } = await supabase.from('quotations').insert([data]).select();
        if (!error && inserted) return inserted[0];
      }
      return await request('/quotations', { method: 'POST', body: data });
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      const newQuote = { id: Date.now(), quote_number: `QT-${Date.now().toString().slice(-6)}`, status: 'draft', items: [], created_at: new Date().toISOString(), ...data };
      quotes.push(newQuote);
      setLS(LS_KEYS.QUOTATIONS, quotes);
      return newQuote;
    }
  },

  updateQuotation: async (id, data) => {
    try {
      if (isSupabaseConfigured) {
        const { data: updated, error } = await supabase.from('quotations').update(data).eq('id', id).select();
        if (!error && updated) return updated[0];
      }
      return await request(`/quotations/${id}`, { method: 'PUT', body: data });
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      const idx = quotes.findIndex(q => q.id === Number(id));
      if (idx !== -1) {
        quotes[idx] = { ...quotes[idx], ...data };
        setLS(LS_KEYS.QUOTATIONS, quotes);
        return quotes[idx];
      }
      return data;
    }
  },

  deleteQuotation: async (id) => {
    try {
      if (isSupabaseConfigured) {
        await supabase.from('quotations').delete().eq('id', id);
        return { success: true };
      }
      return await request(`/quotations/${id}`, { method: 'DELETE' });
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []).filter(q => q.id !== Number(id));
      setLS(LS_KEYS.QUOTATIONS, quotes);
      return { success: true };
    }
  },

  addQuotationItem: async (id, data) => {
    try {
      return await request(`/quotations/${id}/items`, { method: 'POST', body: data });
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      const quote = quotes.find(q => q.id === Number(id));
      if (quote) {
        if (!quote.items) quote.items = [];
        const newItem = { id: Date.now(), ...data };
        quote.items.push(newItem);
        setLS(LS_KEYS.QUOTATIONS, quotes);
        return newItem;
      }
      return data;
    }
  },

  updateQuotationItem: async (id, itemId, data) => {
    try {
      return await request(`/quotations/${id}/items/${itemId}`, { method: 'PUT', body: data });
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      const quote = quotes.find(q => q.id === Number(id));
      if (quote && quote.items) {
        const itemIdx = quote.items.findIndex(it => it.id === Number(itemId));
        if (itemIdx !== -1) {
          quote.items[itemIdx] = { ...quote.items[itemIdx], ...data };
          setLS(LS_KEYS.QUOTATIONS, quotes);
          return quote.items[itemIdx];
        }
      }
      return data;
    }
  },

  removeQuotationItem: async (id, itemId) => {
    try {
      return await request(`/quotations/${id}/items/${itemId}`, { method: 'DELETE' });
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      const quote = quotes.find(q => q.id === Number(id));
      if (quote && quote.items) {
        quote.items = quote.items.filter(it => it.id !== Number(itemId));
        setLS(LS_KEYS.QUOTATIONS, quotes);
      }
      return { success: true };
    }
  },

  duplicateQuotation: async (id) => {
    try {
      return await request(`/quotations/${id}/duplicate`, { method: 'POST' });
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      const original = quotes.find(q => q.id === Number(id));
      if (original) {
        const dup = {
          ...original,
          id: Date.now(),
          quote_number: `QT-${Date.now().toString().slice(-6)}`,
          status: 'draft',
          created_at: new Date().toISOString()
        };
        quotes.push(dup);
        setLS(LS_KEYS.QUOTATIONS, quotes);
        return dup;
      }
      return null;
    }
  },

  finalizeQuotation: async (id) => {
    try {
      return await request(`/quotations/${id}/finalize`, { method: 'POST' });
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      const quote = quotes.find(q => q.id === Number(id));
      if (quote) {
        quote.status = 'finalized';
        setLS(LS_KEYS.QUOTATIONS, quotes);
        return quote;
      }
      return null;
    }
  },

  getPdfBlob: async (id) => {
    return await request(`/quotations/${id}/pdf`, { responseType: 'blob' });
  },

  // Settings
  getSettings: async () => {
    try {
      return await request('/settings');
    } catch (e) {
      return getLS(LS_KEYS.SETTINGS, { shop_name: 'Zeus PC Builder', currency: '₹', tax_rate: 18 });
    }
  },

  updateSettings: async (data) => {
    try {
      return await request('/settings', { method: 'PUT', body: data });
    } catch (e) {
      setLS(LS_KEYS.SETTINGS, data);
      return data;
    }
  }
};
