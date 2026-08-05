const API_BASE = 'http://localhost:5000/api';

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

  // Handle blob responses (e.g. PDF download)
  if (config.responseType === 'blob') {
    return await response.blob();
  }

  return await response.json();
}

export const api = {
  // Categories
  getCategories: () => request('/categories'),
  createCategory: (data) => request('/categories', { method: 'POST', body: data }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: data }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/products${query ? `?${query}` : ''}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (data) => request('/products', { method: 'POST', body: data }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: data }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  importProducts: (items) => request('/products/import', { method: 'POST', body: { items } }),

  // Clients
  getClients: (search = '') => request(`/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getClient: (id) => request(`/clients/${id}`),
  createClient: (data) => request('/clients', { method: 'POST', body: data }),
  updateClient: (id, data) => request(`/clients/${id}`, { method: 'PUT', body: data }),
  deleteClient: (id) => request(`/clients/${id}`, { method: 'DELETE' }),

  // Quotations
  getQuotations: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/quotations${query ? `?${query}` : ''}`);
  },
  getQuotation: (id) => request(`/quotations/${id}`),
  createQuotation: (data) => request('/quotations', { method: 'POST', body: data }),
  updateQuotation: (id, data) => request(`/quotations/${id}`, { method: 'PUT', body: data }),
  deleteQuotation: (id) => request(`/quotations/${id}`, { method: 'DELETE' }),
  addQuotationItem: (id, data) => request(`/quotations/${id}/items`, { method: 'POST', body: data }),
  updateQuotationItem: (id, itemId, data) => request(`/quotations/${id}/items/${itemId}`, { method: 'PUT', body: data }),
  removeQuotationItem: (id, itemId) => request(`/quotations/${id}/items/${itemId}`, { method: 'DELETE' }),
  duplicateQuotation: (id) => request(`/quotations/${id}/duplicate`, { method: 'POST' }),
  finalizeQuotation: (id) => request(`/quotations/${id}/finalize`, { method: 'POST' }),
  getPdfBlob: (id) => request(`/quotations/${id}/pdf`, { responseType: 'blob' }),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'PUT', body: data })
};
