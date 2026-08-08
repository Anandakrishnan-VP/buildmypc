import { DEFAULT_CATEGORIES } from './defaultCategories.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const API_BASE = 'http://localhost:5000/api';

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

// Preload local storage if empty
if (!localStorage.getItem(LS_KEYS.CATEGORIES)) {
  setLS(LS_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
}

// Fallback request helper for local express API
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

export const api = {
  // Categories
  getCategories: async () => {
    if (isSupabaseConfigured) {
      try {
        let { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
        if (error) throw error;
        // Auto-seed preloaded categories if Supabase categories table is empty
        if (!data || data.length === 0) {
          const formattedDefaults = DEFAULT_CATEGORIES.map(c => ({
            id: String(c.id).startsWith('cat_') ? c.id : `cat_${c.id}`,
            name: c.name,
            prefix: c.prefix || c.name.substring(0, 3).toUpperCase(),
            description: c.description || '',
            icon: c.icon || 'Box',
            sort_order: c.id
          }));
          const { data: seeded, error: seedErr } = await supabase.from('categories').insert(formattedDefaults).select();
          if (!seedErr && seeded) data = seeded;
        }
        if (data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getCategories failed, falling back:', err.message);
      }
    }
    try {
      return await request('/categories');
    } catch (e) {
      const cached = getLS(LS_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
      return cached.length > 0 ? cached : DEFAULT_CATEGORIES;
    }
  },

  createCategory: async (data) => {
    const formattedData = {
      id: data.id || `cat_${Date.now()}`,
      name: String(data.name || ''),
      prefix: String(data.prefix || 'CAT'),
      description: data.description || '',
      icon: data.icon || 'Box',
      sort_order: Number(data.sort_order) || 0
    };
    if (isSupabaseConfigured) {
      const { data: inserted, error } = await supabase.from('categories').insert([formattedData]).select();
      if (error) throw new Error(`Supabase Category Insert Error: ${error.message}`);
      if (inserted && inserted[0]) return inserted[0];
    }
    try {
      return await request('/categories', { method: 'POST', body: formattedData });
    } catch (e) {
      const cats = getLS(LS_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
      cats.push(formattedData);
      setLS(LS_KEYS.CATEGORIES, cats);
      return formattedData;
    }
  },

  updateCategory: async (id, data) => {
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.from('categories').update(data).eq('id', id).select();
      if (error) throw new Error(`Supabase Category Update Error: ${error.message}`);
      if (updated && updated[0]) return updated[0];
    }
    try {
      return await request(`/categories/${id}`, { method: 'PUT', body: data });
    } catch (e) {
      const cats = getLS(LS_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
      const idx = cats.findIndex(c => String(c.id) === String(id));
      if (idx !== -1) {
        cats[idx] = { ...cats[idx], ...data };
        setLS(LS_KEYS.CATEGORIES, cats);
        return cats[idx];
      }
      return data;
    }
  },

  deleteCategory: async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw new Error(`Supabase Category Delete Error: ${error.message}`);
      return { success: true };
    }
    try {
      return await request(`/categories/${id}`, { method: 'DELETE' });
    } catch (e) {
      const cats = getLS(LS_KEYS.CATEGORIES, DEFAULT_CATEGORIES).filter(c => String(c.id) !== String(id));
      setLS(LS_KEYS.CATEGORIES, cats);
      return { success: true };
    }
  },

  // Products
  getProducts: async (params = {}) => {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('products').select('*').order('created_at', { ascending: false });
        if (params.activeOnly) query = query.eq('is_active', true);
        if (params.category) query = query.eq('category_id', params.category);
        if (params.category_id) query = query.eq('category_id', params.category_id);
        const { data, error } = await query;
        if (error) throw error;
        if (data) {
          // Parse json specs if stringified
          return data.map(p => ({
            ...p,
            specs: typeof p.specs === 'string' ? JSON.parse(p.specs || '[]') : (p.specs || [])
          }));
        }
      } catch (err) {
        console.warn('Supabase getProducts failed, falling back:', err.message);
      }
    }
    try {
      const queryStr = new URLSearchParams(params).toString();
      return await request(`/products${queryStr ? `?${queryStr}` : ''}`);
    } catch (e) {
      let prods = getLS(LS_KEYS.PRODUCTS, []);
      if (params.activeOnly) prods = prods.filter(p => p.is_active !== false);
      if (params.category) prods = prods.filter(p => String(p.category_id) === String(params.category));
      return prods;
    }
  },

  getProduct: async (id) => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (error) throw error;
        if (data) {
          return {
            ...data,
            specs: typeof data.specs === 'string' ? JSON.parse(data.specs || '[]') : (data.specs || [])
          };
        }
      } catch (err) {
        console.warn('Supabase getProduct failed:', err.message);
      }
    }
    try {
      return await request(`/products/${id}`);
    } catch (e) {
      const prods = getLS(LS_KEYS.PRODUCTS, []);
      return prods.find(p => String(p.id) === String(id)) || null;
    }
  },

  createProduct: async (data) => {
    const basePrice = Number(data.base_price) || 0;
    const gstPercent = Number(data.gst_percent) || 18;
    const priceAfterGst = Number(data.price_after_gst) || Math.round((basePrice + (basePrice * gstPercent / 100)) * 100) / 100;

    const formattedData = {
      id: data.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category_id: String(data.category_id),
      brand: String(data.brand || ''),
      model_name: String(data.model_name || ''),
      specs: typeof data.specs === 'string' ? data.specs : JSON.stringify(data.specs || []),
      base_price: basePrice,
      gst_percent: gstPercent,
      price_after_gst: priceAfterGst,
      stock_qty: data.stock_qty ? Number(data.stock_qty) : null,
      warranty: data.warranty || null,
      image_url: data.image_url || null,
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true
    };

    if (isSupabaseConfigured) {
      const { data: inserted, error } = await supabase.from('products').insert([formattedData]).select();
      if (error) throw new Error(`Supabase Product Insert Error: ${error.message}`);
      if (inserted && inserted[0]) {
        return {
          ...inserted[0],
          specs: typeof inserted[0].specs === 'string' ? JSON.parse(inserted[0].specs || '[]') : (inserted[0].specs || [])
        };
      }
    }

    try {
      return await request('/products', { method: 'POST', body: formattedData });
    } catch (e) {
      const prods = getLS(LS_KEYS.PRODUCTS, []);
      const newProd = { ...formattedData, specs: data.specs || [] };
      prods.push(newProd);
      setLS(LS_KEYS.PRODUCTS, prods);
      return newProd;
    }
  },

  updateProduct: async (id, data) => {
    const basePrice = data.base_price !== undefined ? Number(data.base_price) : undefined;
    const gstPercent = data.gst_percent !== undefined ? Number(data.gst_percent) : undefined;
    
    const formattedData = { ...data };
    if (basePrice !== undefined) formattedData.base_price = basePrice;
    if (gstPercent !== undefined) formattedData.gst_percent = gstPercent;
    if (basePrice !== undefined || gstPercent !== undefined) {
      const bp = basePrice !== undefined ? basePrice : 0;
      const gp = gstPercent !== undefined ? gstPercent : 18;
      formattedData.price_after_gst = Math.round((bp + (bp * gp / 100)) * 100) / 100;
    }
    if (data.specs) {
      formattedData.specs = typeof data.specs === 'string' ? data.specs : JSON.stringify(data.specs);
    }

    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.from('products').update(formattedData).eq('id', id).select();
      if (error) throw new Error(`Supabase Product Update Error: ${error.message}`);
      if (updated && updated[0]) {
        return {
          ...updated[0],
          specs: typeof updated[0].specs === 'string' ? JSON.parse(updated[0].specs || '[]') : (updated[0].specs || [])
        };
      }
    }

    try {
      return await request(`/products/${id}`, { method: 'PUT', body: formattedData });
    } catch (e) {
      const prods = getLS(LS_KEYS.PRODUCTS, []);
      const idx = prods.findIndex(p => String(p.id) === String(id));
      if (idx !== -1) {
        prods[idx] = { ...prods[idx], ...formattedData, specs: data.specs || prods[idx].specs };
        setLS(LS_KEYS.PRODUCTS, prods);
        return prods[idx];
      }
      return data;
    }
  },

  deleteProduct: async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw new Error(`Supabase Product Delete Error: ${error.message}`);
      return { success: true, message: `Product ${id} deleted successfully` };
    }
    try {
      return await request(`/products/${id}`, { method: 'DELETE' });
    } catch (e) {
      const prods = getLS(LS_KEYS.PRODUCTS, []).filter(p => String(p.id) !== String(id));
      setLS(LS_KEYS.PRODUCTS, prods);
      return { success: true, message: `Product ${id} deleted successfully` };
    }
  },

  importProducts: async (items) => {
    const formattedItems = items.map((item, idx) => ({
      id: item.id || `prod_${Date.now()}_${idx}`,
      category_id: String(item.category_id),
      brand: String(item.brand || ''),
      model_name: String(item.model_name || ''),
      specs: typeof item.specs === 'string' ? item.specs : JSON.stringify(item.specs || []),
      base_price: Number(item.base_price) || 0,
      gst_percent: Number(item.gst_percent) || 18,
      price_after_gst: Number(item.price_after_gst) || Math.round((Number(item.base_price || 0) * (1 + (Number(item.gst_percent || 18) / 100))) * 100) / 100,
      stock_qty: item.stock_qty ? Number(item.stock_qty) : null,
      warranty: item.warranty || null,
      image_url: item.image_url || null,
      is_active: item.is_active !== undefined ? Boolean(item.is_active) : true
    }));

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('products').insert(formattedItems).select();
      if (error) throw new Error(`Supabase Bulk Import Error: ${error.message}`);
      if (data) return { imported: data.length };
    }

    try {
      return await request('/products/import', { method: 'POST', body: { items: formattedItems } });
    } catch (e) {
      const prods = getLS(LS_KEYS.PRODUCTS, []);
      formattedItems.forEach(item => prods.push(item));
      setLS(LS_KEYS.PRODUCTS, prods);
      return { imported: formattedItems.length };
    }
  },

  // Clients
  getClients: async (search = '') => {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('clients').select('*').order('created_at', { ascending: false });
        if (search) query = query.ilike('name', `%${search}%`);
        const { data, error } = await query;
        if (error) throw error;
        if (data) return data;
      } catch (err) {
        console.warn('Supabase getClients failed, falling back:', err.message);
      }
    }
    try {
      return await request(`/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    } catch (e) {
      let clients = getLS(LS_KEYS.CLIENTS, []);
      if (search) clients = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
      return clients;
    }
  },

  createClient: async (data) => {
    const formattedData = {
      id: data.id || `cli_${Date.now()}`,
      name: String(data.name || ''),
      phone: String(data.phone || ''),
      email: data.email || null,
      address: data.address || null,
      gstin: data.gstin || null
    };

    if (isSupabaseConfigured) {
      const { data: inserted, error } = await supabase.from('clients').insert([formattedData]).select();
      if (error) throw new Error(`Supabase Client Insert Error: ${error.message}`);
      if (inserted && inserted[0]) return inserted[0];
    }

    try {
      return await request('/clients', { method: 'POST', body: formattedData });
    } catch (e) {
      const clients = getLS(LS_KEYS.CLIENTS, []);
      clients.push(formattedData);
      setLS(LS_KEYS.CLIENTS, clients);
      return formattedData;
    }
  },

  updateClient: async (id, data) => {
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.from('clients').update(data).eq('id', id).select();
      if (error) throw new Error(`Supabase Client Update Error: ${error.message}`);
      if (updated && updated[0]) return updated[0];
    }
    try {
      return await request(`/clients/${id}`, { method: 'PUT', body: data });
    } catch (e) {
      const clients = getLS(LS_KEYS.CLIENTS, []);
      const idx = clients.findIndex(c => String(c.id) === String(id));
      if (idx !== -1) {
        clients[idx] = { ...clients[idx], ...data };
        setLS(LS_KEYS.CLIENTS, clients);
        return clients[idx];
      }
      return data;
    }
  },

  deleteClient: async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw new Error(`Supabase Client Delete Error: ${error.message}`);
      return { success: true, message: `Client ${id} deleted successfully` };
    }
    try {
      return await request(`/clients/${id}`, { method: 'DELETE' });
    } catch (e) {
      const clients = getLS(LS_KEYS.CLIENTS, []).filter(c => String(c.id) !== String(id));
      setLS(LS_KEYS.CLIENTS, clients);
      return { success: true, message: `Client ${id} deleted successfully` };
    }
  },

  // Quotations
  getQuotations: async (params = {}) => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('quotations').select('*, items:quotation_items(*)').order('created_at', { ascending: false });
        if (error) throw error;
        if (data) return data;
      } catch (err) {
        console.warn('Supabase getQuotations failed, falling back:', err.message);
      }
    }
    try {
      const queryStr = new URLSearchParams(params).toString();
      return await request(`/quotations${queryStr ? `?${queryStr}` : ''}`);
    } catch (e) {
      return getLS(LS_KEYS.QUOTATIONS, []);
    }
  },

  getQuotation: async (id) => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('quotations').select('*, items:quotation_items(*)').eq('id', id).single();
        if (error) throw error;
        if (data) return data;
      } catch (err) {
        console.warn('Supabase getQuotation failed:', err.message);
      }
    }
    try {
      return await request(`/quotations/${id}`);
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      return quotes.find(q => String(q.id) === String(id)) || null;
    }
  },

  createQuotation: async (data) => {
    const formattedData = {
      id: data.id || `qtn_${Date.now()}`,
      client_id: String(data.client_id),
      build_name: data.build_name || 'Custom PC Build',
      status: data.status || 'draft',
      labour_charge: Number(data.labour_charge) || 0,
      discount: Number(data.discount) || 0,
      notes: data.notes || '',
      valid_until: data.valid_until || null
    };

    if (isSupabaseConfigured) {
      const { data: inserted, error } = await supabase.from('quotations').insert([formattedData]).select();
      if (error) throw new Error(`Supabase Quotation Insert Error: ${error.message}`);
      if (inserted && inserted[0]) return { ...inserted[0], items: [] };
    }

    try {
      return await request('/quotations', { method: 'POST', body: formattedData });
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      const newQuote = { ...formattedData, items: [] };
      quotes.push(newQuote);
      setLS(LS_KEYS.QUOTATIONS, quotes);
      return newQuote;
    }
  },

  updateQuotation: async (id, data) => {
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.from('quotations').update(data).eq('id', id).select();
      if (error) throw new Error(`Supabase Quotation Update Error: ${error.message}`);
      if (updated && updated[0]) return updated[0];
    }
    try {
      return await request(`/quotations/${id}`, { method: 'PUT', body: data });
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      const idx = quotes.findIndex(q => String(q.id) === String(id));
      if (idx !== -1) {
        quotes[idx] = { ...quotes[idx], ...data };
        setLS(LS_KEYS.QUOTATIONS, quotes);
        return quotes[idx];
      }
      return data;
    }
  },

  deleteQuotation: async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('quotations').delete().eq('id', id);
      if (error) throw new Error(`Supabase Quotation Delete Error: ${error.message}`);
      return { success: true };
    }
    try {
      return await request(`/quotations/${id}`, { method: 'DELETE' });
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []).filter(q => String(q.id) !== String(id));
      setLS(LS_KEYS.QUOTATIONS, quotes);
      return { success: true };
    }
  },

  addQuotationItem: async (id, data) => {
    const formattedData = {
      id: data.id || `qitem_${Date.now()}`,
      quotation_id: String(id),
      product_id: String(data.product_id),
      product_snapshot: typeof data.product_snapshot === 'string' ? data.product_snapshot : JSON.stringify(data.product_snapshot || {}),
      quantity: Number(data.quantity) || 1,
      line_total: Number(data.line_total) || 0
    };

    if (isSupabaseConfigured) {
      const { data: inserted, error } = await supabase.from('quotation_items').insert([formattedData]).select();
      if (error) throw new Error(`Supabase Quotation Item Add Error: ${error.message}`);
      if (inserted && inserted[0]) return inserted[0];
    }

    try {
      return await request(`/quotations/${id}/items`, { method: 'POST', body: formattedData });
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      const quote = quotes.find(q => String(q.id) === String(id));
      if (quote) {
        if (!quote.items) quote.items = [];
        quote.items.push(formattedData);
        setLS(LS_KEYS.QUOTATIONS, quotes);
        return formattedData;
      }
      return formattedData;
    }
  },

  updateQuotationItem: async (id, itemId, data) => {
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.from('quotation_items').update(data).eq('id', itemId).select();
      if (error) throw new Error(`Supabase Quotation Item Update Error: ${error.message}`);
      if (updated && updated[0]) return updated[0];
    }
    try {
      return await request(`/quotations/${id}/items/${itemId}`, { method: 'PUT', body: data });
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      const quote = quotes.find(q => String(q.id) === String(id));
      if (quote && quote.items) {
        const itemIdx = quote.items.findIndex(it => String(it.id) === String(itemId));
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
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('quotation_items').delete().eq('id', itemId);
      if (error) throw new Error(`Supabase Quotation Item Delete Error: ${error.message}`);
      return { success: true };
    }
    try {
      return await request(`/quotations/${id}/items/${itemId}`, { method: 'DELETE' });
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      const quote = quotes.find(q => String(q.id) === String(id));
      if (quote && quote.items) {
        quote.items = quote.items.filter(it => String(it.id) !== String(itemId));
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
      const original = quotes.find(q => String(q.id) === String(id));
      if (original) {
        const dup = {
          ...original,
          id: `qtn_${Date.now()}`,
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
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.from('quotations').update({ status: 'finalized' }).eq('id', id).select();
      if (error) throw new Error(`Supabase Finalize Error: ${error.message}`);
      if (updated && updated[0]) return updated[0];
    }
    try {
      return await request(`/quotations/${id}/finalize`, { method: 'POST' });
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      const quote = quotes.find(q => String(q.id) === String(id));
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
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('shop_settings').select('*').eq('id', 'default').single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase getSettings failed:', err.message);
      }
    }
    try {
      return await request('/settings');
    } catch (e) {
      return getLS(LS_KEYS.SETTINGS, { shop_name: 'Zeus PC Builder', currency: '₹', tax_rate: 18 });
    }
  },

  updateSettings: async (data) => {
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.from('shop_settings').upsert({ id: 'default', ...data }).select();
      if (error) throw new Error(`Supabase Settings Update Error: ${error.message}`);
      if (updated && updated[0]) return updated[0];
    }
    try {
      return await request('/settings', { method: 'PUT', body: data });
    } catch (e) {
      setLS(LS_KEYS.SETTINGS, data);
      return data;
    }
  }
};
