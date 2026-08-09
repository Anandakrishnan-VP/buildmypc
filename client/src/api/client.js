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
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/pdf')) {
      throw new Error('Response is not a valid PDF file stream');
    }
    return await response.blob();
  }

  return await response.json();
}

function parseSnapshot(snap) {
  if (!snap) return {};
  if (typeof snap === 'string') {
    try {
      return JSON.parse(snap);
    } catch (e) {
      return {};
    }
  }
  return snap;
}

export const api = {
  // Categories
  getCategories: async () => {
    if (isSupabaseConfigured) {
      try {
        let { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
        if (error) throw error;
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
        let { data, error } = await query;
        if (error) throw error;
        if (data) {
          let parsed = data.map(p => ({
            ...p,
            specs: typeof p.specs === 'string' ? JSON.parse(p.specs || '[]') : (p.specs || [])
          }));

          if (params.search && params.search.trim()) {
            const q = params.search.trim().toLowerCase();
            parsed = parsed.filter(p => {
              const brand = (p.brand || '').toLowerCase();
              const model = (p.model_name || '').toLowerCase();
              const id = (p.id || '').toLowerCase();
              const specsStr = typeof p.specs === 'string' ? p.specs.toLowerCase() : JSON.stringify(p.specs || '').toLowerCase();
              return brand.includes(q) || model.includes(q) || id.includes(q) || specsStr.includes(q) || `${brand} ${model}`.includes(q);
            });
          }

          return parsed;
        }
      } catch (err) {
        console.warn('Supabase getProducts failed, falling back:', err.message);
      }
    }
    try {
      const queryParams = {};
      if (params.search) queryParams.search = params.search;
      if (params.category) queryParams.category = params.category;
      if (params.category_id) queryParams.category = params.category_id;
      if (params.activeOnly !== undefined) queryParams.activeOnly = params.activeOnly;
      const queryStr = new URLSearchParams(queryParams).toString();
      return await request(`/products${queryStr ? `?${queryStr}` : ''}`);
    } catch (e) {
      let prods = getLS(LS_KEYS.PRODUCTS, []);
      if (params.activeOnly) prods = prods.filter(p => p.is_active !== false);
      if (params.category) prods = prods.filter(p => String(p.category_id) === String(params.category));
      if (params.search && params.search.trim()) {
        const q = params.search.trim().toLowerCase();
        prods = prods.filter(p => {
          const brand = (p.brand || '').toLowerCase();
          const model = (p.model_name || '').toLowerCase();
          const id = (p.id || '').toLowerCase();
          const specsStr = typeof p.specs === 'string' ? p.specs.toLowerCase() : JSON.stringify(p.specs || '').toLowerCase();
          return brand.includes(q) || model.includes(q) || id.includes(q) || specsStr.includes(q) || `${brand} ${model}`.includes(q);
        });
      }
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
          const resObj = {
            ...inserted[0],
            specs: typeof inserted[0].specs === 'string' ? JSON.parse(inserted[0].specs || '[]') : (inserted[0].specs || [])
          };
          api.recordPriceHistory(resObj.id, basePrice, priceAfterGst).catch(() => {});
          return resObj;
        }
      }

      let resObj;
      try {
        resObj = await request('/products', { method: 'POST', body: formattedData });
      } catch (e) {
        const prods = getLS(LS_KEYS.PRODUCTS, []);
        resObj = { ...formattedData, specs: data.specs || [] };
        prods.push(resObj);
        setLS(LS_KEYS.PRODUCTS, prods);
      }
      api.recordPriceHistory(resObj.id || formattedData.id, basePrice, priceAfterGst).catch(() => {});
      return resObj;
    },

    updateProduct: async (id, data) => {
      const basePrice = data.base_price !== undefined && data.base_price !== '' ? Number(data.base_price) : undefined;
      const gstPercent = data.gst_percent !== undefined && data.gst_percent !== '' ? Number(data.gst_percent) : undefined;
      
      const formattedData = {};
      if (data.category_id !== undefined) formattedData.category_id = String(data.category_id);
      if (data.brand !== undefined) formattedData.brand = String(data.brand);
      if (data.model_name !== undefined) formattedData.model_name = String(data.model_name);
      if (basePrice !== undefined) formattedData.base_price = basePrice;
      if (gstPercent !== undefined) formattedData.gst_percent = gstPercent;

      if (basePrice !== undefined || gstPercent !== undefined) {
        const bp = basePrice !== undefined ? basePrice : (Number(data.base_price) || 0);
        const gp = gstPercent !== undefined ? gstPercent : (Number(data.gst_percent) || 18);
        formattedData.price_after_gst = Math.round((bp + (bp * gp / 100)) * 100) / 100;
      }
      if (data.specs !== undefined) {
        formattedData.specs = typeof data.specs === 'string' ? data.specs : JSON.stringify(data.specs);
      }
      if (data.stock_qty !== undefined) {
        formattedData.stock_qty = (data.stock_qty === '' || data.stock_qty === null || data.stock_qty === undefined) ? null : Number(data.stock_qty);
      }
      if (data.warranty !== undefined) {
        formattedData.warranty = data.warranty ? String(data.warranty) : null;
      }
      if (data.image_url !== undefined) {
        formattedData.image_url = data.image_url ? String(data.image_url) : null;
      }
      if (data.is_active !== undefined) {
        formattedData.is_active = Boolean(data.is_active);
      }

      let resObj;
      if (isSupabaseConfigured) {
        const { data: updated, error } = await supabase.from('products').update(formattedData).eq('id', id).select();
        if (error) throw new Error(`Supabase Product Update Error: ${error.message}`);
        if (updated && updated[0]) {
          resObj = {
            ...updated[0],
            specs: typeof updated[0].specs === 'string' ? JSON.parse(updated[0].specs || '[]') : (updated[0].specs || [])
          };
          if (basePrice !== undefined || formattedData.price_after_gst !== undefined) {
            api.recordPriceHistory(id, resObj.base_price, resObj.price_after_gst).catch(() => {});
          }
          return resObj;
        }
      }

      try {
        resObj = await request(`/products/${id}`, { method: 'PUT', body: formattedData });
      } catch (e) {
        const prods = getLS(LS_KEYS.PRODUCTS, []);
        const idx = prods.findIndex(p => String(p.id) === String(id));
        if (idx !== -1) {
          prods[idx] = { ...prods[idx], ...formattedData, specs: data.specs || prods[idx].specs };
          setLS(LS_KEYS.PRODUCTS, prods);
          resObj = prods[idx];
        } else {
          resObj = data;
        }
      }
      if (resObj && (basePrice !== undefined || formattedData.price_after_gst !== undefined)) {
        api.recordPriceHistory(id, resObj.base_price || basePrice || 0, resObj.price_after_gst || formattedData.price_after_gst || 0).catch(() => {});
      }
      return resObj;
    },

    getPriceHistory: async (productId) => {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('product_price_history')
            .select('*')
            .eq('product_id', String(productId))
            .order('created_at', { ascending: true });
          if (!error && data && data.length > 0) return data;
        } catch (e) {
          console.warn('Supabase price history fetch error:', e);
        }
      }
      try {
        const res = await request(`/products/${productId}/price-history`);
        if (res && res.length > 0) return res;
      } catch (e) {}

      const history = getLS('zeus_price_history', []);
      const filtered = history.filter(h => String(h.product_id) === String(productId)).sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
      return filtered;
    },

    recordPriceHistory: async (productId, basePrice, priceAfterGst) => {
      const entry = {
        product_id: String(productId),
        base_price: Number(basePrice) || 0,
        price_after_gst: Number(priceAfterGst) || 0,
        created_at: new Date().toISOString()
      };
      if (isSupabaseConfigured) {
        try {
          await supabase.from('product_price_history').insert([entry]);
        } catch (e) {
          console.warn('Supabase price history insert error:', e);
        }
      }
      try {
        await request(`/products/${productId}/price-history`, { method: 'POST', body: entry });
      } catch (e) {
        const history = getLS('zeus_price_history', []);
        history.push(entry);
        setLS('zeus_price_history', history);
      }
      return entry;
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

  getClient: async (id) => {
    let clientObj = null;
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
        if (!error && data) clientObj = data;
      } catch (e) {}
    }

    if (!clientObj) {
      try {
        clientObj = await request(`/clients/${id}`);
      } catch (e) {
        const clients = getLS(LS_KEYS.CLIENTS, []);
        clientObj = clients.find(c => String(c.id) === String(id)) || null;
      }
    }

    if (clientObj) {
      if (!Array.isArray(clientObj.quotations)) {
        try {
          const allQuotes = await api.getQuotations();
          clientObj.quotations = allQuotes.filter(q => String(q.client_id) === String(id));
        } catch (e) {
          clientObj.quotations = [];
        }
      }
    }

    return clientObj;
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
    let rawQuotes = [];
    let clientsMap = {};

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('quotations').select('*, items:quotation_items(*)').order('created_at', { ascending: false });
        if (!error && data) rawQuotes = data;
        
        const { data: clientsData } = await supabase.from('clients').select('*');
        if (clientsData) {
          clientsData.forEach(c => { clientsMap[c.id] = c; });
        }
      } catch (err) {
        console.warn('Supabase getQuotations failed, falling back:', err.message);
      }
    }

    if (rawQuotes.length === 0) {
      try {
        const queryStr = new URLSearchParams(params).toString();
        rawQuotes = await request(`/quotations${queryStr ? `?${queryStr}` : ''}`);
      } catch (e) {
        rawQuotes = getLS(LS_KEYS.QUOTATIONS, []);
        const localClients = getLS(LS_KEYS.CLIENTS, []);
        localClients.forEach(c => { clientsMap[c.id] = c; });
      }
    }

    return rawQuotes.map(q => {
      const items = (q.items || []).map(it => ({
        ...it,
        product_snapshot: parseSnapshot(it.product_snapshot)
      }));

      let subtotal = 0;
      let totalGst = 0;

      items.forEach(it => {
        const snap = it.product_snapshot || {};
        const basePrice = Number(snap.base_price ?? it.base_price ?? it.unit_price ?? 0);
        const gstRate = Number(snap.gst_percent ?? it.gst_percent ?? 18);
        const qty = Number(it.quantity) || 1;

        const lineBase = basePrice * qty;
        const lineGst = lineBase * (gstRate / 100);

        subtotal += lineBase;
        totalGst += lineGst;
      });

      const discount = Number(q.discount) || 0;
      const labour = Number(q.labour_charge) || 0;
      const grandTotal = q.grand_total || Math.max(0, subtotal - discount + totalGst + labour);
      const client = clientsMap[q.client_id] || {};

      return {
        ...q,
        client_name: client.name || q.client_name || 'Valued Client',
        client_phone: client.phone || q.client_phone || '',
        item_count: items.length,
        items,
        subtotal: q.subtotal || subtotal,
        total_gst: q.total_gst || totalGst,
        grand_total: grandTotal
      };
    });
  },

  getQuotation: async (id) => {
    let rawData = null;
    let clientData = null;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('quotations').select('*, items:quotation_items(*)').eq('id', id).single();
        if (!error && data) {
          rawData = data;
          if (data.client_id) {
            const { data: c } = await supabase.from('clients').select('*').eq('id', data.client_id).single();
            if (c) clientData = c;
          }
        }
      } catch (err) {
        console.warn('Supabase getQuotation failed:', err.message);
      }
    }

    if (!rawData) {
      try {
        rawData = await request(`/quotations/${id}`);
        if (rawData && rawData.quotation) return rawData;
      } catch (e) {
        const quotes = getLS(LS_KEYS.QUOTATIONS, []);
        const q = quotes.find(q => String(q.id) === String(id)) || null;
        if (q) {
          rawData = q;
          const clients = getLS(LS_KEYS.CLIENTS, []);
          clientData = clients.find(c => String(c.id) === String(q.client_id)) || null;
        }
      }
    }

    if (!rawData) return null;

    const quotation = rawData.quotation || rawData;
    const items = (rawData.items || quotation.items || []).map(it => ({
      ...it,
      product_snapshot: parseSnapshot(it.product_snapshot)
    }));

    let subtotal = 0;
    let totalGst = 0;

    items.forEach(it => {
      const snap = it.product_snapshot || {};
      const basePrice = Number(snap.base_price ?? it.base_price ?? it.unit_price ?? 0);
      const gstRate = Number(snap.gst_percent ?? it.gst_percent ?? 18);
      const qty = Number(it.quantity) || 1;

      const lineBase = basePrice * qty;
      const lineGst = lineBase * (gstRate / 100);

      subtotal += lineBase;
      totalGst += lineGst;
    });

    const discount = Number(quotation.discount) || 0;
    const labour = Number(quotation.labour_charge) || 0;
    const grandTotal = quotation.grand_total || Math.max(0, subtotal - discount + totalGst + labour);

    return {
      quotation: {
        ...quotation,
        subtotal,
        total_gst: totalGst,
        grand_total: grandTotal
      },
      client: clientData || rawData.client,
      items
    };
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
    const snap = data.product_snapshot || {};
    const basePrice = Number(snap.base_price) || 0;
    const gstRate = Number(snap.gst_percent) || 18;
    const priceAfterGst = Number(snap.price_after_gst) || (basePrice + (basePrice * gstRate / 100));
    const qty = Number(data.quantity) || 1;
    const calculatedLineTotal = Number(data.line_total) || (priceAfterGst * qty);

    const formattedData = {
      id: data.id || `qitem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      quotation_id: String(id),
      product_id: String(data.product_id),
      product_snapshot: typeof data.product_snapshot === 'string' ? data.product_snapshot : JSON.stringify(snap),
      quantity: qty,
      line_total: calculatedLineTotal
    };

    if (isSupabaseConfigured) {
      const { data: inserted, error } = await supabase.from('quotation_items').insert([formattedData]).select();
      if (error) throw new Error(`Supabase Quotation Item Add Error: ${error.message}`);
      if (inserted && inserted[0]) {
        return {
          ...inserted[0],
          product_snapshot: parseSnapshot(inserted[0].product_snapshot)
        };
      }
    }

    try {
      return await request(`/quotations/${id}/items`, { method: 'POST', body: formattedData });
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      const quote = quotes.find(q => String(q.id) === String(id));
      if (quote) {
        if (!quote.items) quote.items = [];
        const newItem = { ...formattedData, product_snapshot: snap };
        quote.items.push(newItem);
        setLS(LS_KEYS.QUOTATIONS, quotes);
        return newItem;
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
      const origData = await api.getQuotation(id);
      if (!origData || !origData.quotation) {
        throw new Error(`Original quotation ${id} not found.`);
      }

      const origQuote = origData.quotation;
      const origItems = origData.items || [];
      const newQuoteId = `QTN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newQuoteObj = {
        id: newQuoteId,
        client_id: String(origQuote.client_id || ''),
        build_name: `${origQuote.build_name || 'Custom PC Build'} (Copy)`,
        status: 'draft',
        labour_charge: Number(origQuote.labour_charge) || 0,
        discount: Number(origQuote.discount) || 0,
        notes: origQuote.notes || '',
        valid_until: origQuote.valid_until || null,
        created_at: new Date().toISOString()
      };

      if (isSupabaseConfigured) {
        try {
          const { data: inserted, error } = await supabase.from('quotations').insert([newQuoteObj]).select();
          if (!error && inserted && inserted[0]) {
            if (origItems.length > 0) {
              const formattedItems = origItems.map(it => ({
                id: `qitem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                quotation_id: newQuoteId,
                product_id: String(it.product_id),
                product_snapshot: typeof it.product_snapshot === 'string' ? it.product_snapshot : JSON.stringify(it.product_snapshot || {}),
                quantity: Number(it.quantity) || 1,
                line_total: Number(it.line_total) || 0
              }));
              await supabase.from('quotation_items').insert(formattedItems);
            }
            return { ...inserted[0], items: origItems };
          }
        } catch (err) {
          console.warn('Supabase duplicateQuotation error, trying API fallback:', err.message);
        }
      }

      try {
        const res = await request(`/quotations/${id}/duplicate`, { method: 'POST' });
        if (res && res.id) return res;
      } catch (e) {}

      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      quotes.push(newQuoteObj);
      setLS(LS_KEYS.QUOTATIONS, quotes);
      return newQuoteObj;
    } catch (err) {
      throw new Error(`Failed to duplicate quotation: ${err.message}`);
    }
  },

  finalizeQuotation: async (id) => {
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.from('quotations').update({ status: 'sent' }).eq('id', id).select();
      if (error) throw new Error(`Supabase Finalize Error: ${error.message}`);
      if (updated && updated[0]) return updated[0];
    }
    try {
      return await request(`/quotations/${id}/finalize`, { method: 'POST' });
    } catch (e) {
      const quotes = getLS(LS_KEYS.QUOTATIONS, []);
      const quote = quotes.find(q => String(q.id) === String(id));
      if (quote) {
        quote.status = 'sent';
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
        if (!error && data) {
          setLS(LS_KEYS.SETTINGS, data);
          return data;
        }
      } catch (err) {
        console.warn('Supabase getSettings failed, using fallback:', err.message);
      }
    }
    try {
      const res = await request('/settings');
      if (res && typeof res === 'object') {
        setLS(LS_KEYS.SETTINGS, res);
        return res;
      }
    } catch (e) {}

    return getLS(LS_KEYS.SETTINGS, {});
  },

  updateSettings: async (data) => {
    const payload = {
      id: 'default',
      name: data.name ?? '',
      logo_url: data.logo_url ?? null,
      address: data.address ?? '',
      phone: data.phone ?? '',
      email: data.email ?? '',
      website: data.website ?? '',
      gstin: data.gstin ?? '',
      pan: data.pan ?? '',
      bank_name: data.bank_name ?? '',
      account_number: data.account_number ?? '',
      ifsc_code: data.ifsc_code ?? '',
      branch_name: data.branch_name ?? '',
      terms_conditions: data.terms_conditions ?? '',
      quotation_prefix: data.quotation_prefix ?? 'QTN',
      consultant_name: data.consultant_name ?? '',
      consultant_phone: data.consultant_phone ?? '',
      validity_days: Number(data.validity_days) || 2,
      updated_at: new Date().toISOString()
    };

    setLS(LS_KEYS.SETTINGS, payload);

    if (isSupabaseConfigured) {
      try {
        const { data: updated, error } = await supabase.from('shop_settings').upsert(payload).select();
        if (!error && updated && updated[0]) {
          setLS(LS_KEYS.SETTINGS, updated[0]);
          return updated[0];
        }
        if (error) {
          console.warn('Supabase settings upsert error:', error.message);
          // Omit branch_name if remote Supabase schema hasn't added it yet
          const fallbackPayload = { ...payload };
          delete fallbackPayload.branch_name;
          const { data: retryUpdated, error: retryErr } = await supabase.from('shop_settings').upsert(fallbackPayload).select();
          if (!retryErr && retryUpdated && retryUpdated[0]) {
            setLS(LS_KEYS.SETTINGS, retryUpdated[0]);
            return retryUpdated[0];
          }
        }
      } catch (err) {
        console.warn('Supabase settings update exception:', err.message);
      }
    }
    try {
      const res = await request('/settings', { method: 'PUT', body: payload });
      if (res) {
        setLS(LS_KEYS.SETTINGS, res);
        return res;
      }
    } catch (e) {}

    return payload;
  }
};
