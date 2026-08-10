import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Download, UserPlus, Search, Receipt, Percent, TrendingUp } from 'lucide-react';
import { api } from '../api/client';
import ClientFormModal from '../components/ClientFormModal';
import PrintableQuotationModal from '../components/PrintableQuotationModal';
import PriceHistoryModal from '../components/PriceHistoryModal';

export default function BuildQuotationPage({ categories = [], clients = [], activeQuoteId = null, onFinished, showToast = () => {}, showConfirm = () => {} }) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [buildName, setBuildName] = useState('');
  const [discount, setDiscount] = useState(0);
  const [labourCharge, setLabourCharge] = useState(500);
  const [notes, setNotes] = useState('');
  const [quotationId, setQuotationId] = useState(activeQuoteId);
  const [items, setItems] = useState([]);
  const [historyProduct, setHistoryProduct] = useState(null);

  const [allProducts, setAllProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState(categories[0]?.id || 'cat_1');
  const [showClientModal, setShowClientModal] = useState(false);
  const [showGstBreakdownModal, setShowGstBreakdownModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [currentQuotationData, setCurrentQuotationData] = useState(null);
  const [settingsData, setSettingsData] = useState({});

  // Margin Distributor state
  const [showMarginModal, setShowMarginModal] = useState(false);
  const [marginInput, setMarginInput] = useState('');
  const [marginStrategy, setMarginStrategy] = useState('all');
  const [marginSelectedItems, setMarginSelectedItems] = useState([]);
  const [savingMargin, setSavingMargin] = useState(false);

  // Load products catalog and shop settings
  useEffect(() => {
    api.getProducts({ activeOnly: true }).then((data) => setAllProducts(data || []));
    api.getSettings().then((s) => setSettingsData(s || {}));
  }, []);

  // Update activeCategoryTab if categories change
  useEffect(() => {
    if (categories.length > 0 && !categories.find(c => c.id === activeCategoryTab)) {
      setActiveCategoryTab(categories[0].id);
    }
  }, [categories]);

  // Load quote details if editing an existing quote/draft
  useEffect(() => {
    if (activeQuoteId) {
      api.getQuotation(activeQuoteId).then((res) => {
        if (res && res.quotation) {
          setQuotationId(res.quotation.id);
          setSelectedClientId(res.quotation.client_id);
          setBuildName(res.quotation.build_name || '');
          setDiscount(res.quotation.discount || 0);
          setLabourCharge(res.quotation.labour_charge || 0);
          setNotes(res.quotation.notes || '');
          setItems(res.items || []);
          setCurrentQuotationData(res.quotation);
        }
      }).catch((err) => {
        showToast('Failed to load quotation: ' + err.message, 'error');
      });
    } else {
      if (clients.length > 0 && !selectedClientId) {
        setSelectedClientId(clients[0].id);
      }
    }
  }, [activeQuoteId, clients]);

  // Ensure initial draft quotation exists in database
  const ensureDraft = async (clientIdToUse) => {
    if (quotationId) return quotationId;
    const validityDays = settingsData.validity_days || 2;
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + validityDays);

    const res = await api.createQuotation({
      client_id: clientIdToUse || selectedClientId,
      build_name: buildName || 'Custom Gaming Rig',
      discount,
      labour_charge: labourCharge,
      notes,
      valid_until: validUntilDate.toISOString().split('T')[0]
    });
    setQuotationId(res.id);
    setCurrentQuotationData(res);
    return res.id;
  };

  const handleAddComponent = async (product) => {
    if (!selectedClientId) {
      showToast('Please select or create a client first.', 'error');
      return;
    }

    try {
      const qId = await ensureDraft(selectedClientId);

      const basePrice = Number(product.base_price) || 0;
      const gstPercent = Number(product.gst_percent) || 18;
      const priceAfterGst = Number(product.price_after_gst) || (basePrice + (basePrice * gstPercent / 100));

      const snapshot = {
        product_id: product.id,
        brand: product.brand,
        model_name: product.model_name,
        category_id: product.category_id,
        category_name: categories.find(c => c.id === product.category_id)?.name || 'Hardware',
        specs: product.specs,
        base_price: basePrice,
        gst_percent: gstPercent,
        price_after_gst: priceAfterGst,
        warranty: product.warranty,
        image_url: product.image_url
      };

      await api.addQuotationItem(qId, {
        product_id: product.id,
        product_snapshot: snapshot,
        quantity: 1,
        line_total: priceAfterGst
      });

      const updated = await api.getQuotation(qId);
      if (updated) {
        setItems(updated.items || []);
      }
      showToast(`Added ${product.brand} ${product.model_name} to build`, 'success');
    } catch (err) {
      showToast('Failed to add component: ' + err.message, 'error');
    }
  };

  const handleRemoveComponent = async (itemId) => {
    try {
      await api.removeQuotationItem(quotationId, itemId);
      const updated = await api.getQuotation(quotationId);
      if (updated) {
        setItems(updated.items || []);
      }
      showToast('Item removed from build', 'info');
    } catch (err) {
      showToast('Failed to remove item: ' + err.message, 'error');
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedClientId) {
      showToast('Please select a client.', 'error');
      return;
    }
    try {
      const qId = await ensureDraft(selectedClientId);
      await api.updateQuotation(qId, {
        client_id: selectedClientId,
        build_name: buildName,
        discount,
        labour_charge: labourCharge,
        notes
      });
      showToast(`Draft quotation ${qId} saved successfully!`, 'success');
      if (onFinished) onFinished();
    } catch (err) {
      showToast('Failed to save draft: ' + err.message, 'error');
    }
  };

  const handleFinalizeAndDownloadPdf = async () => {
    if (!selectedClientId) {
      showToast('Please select a client.', 'error');
      return;
    }
    if (items.length === 0) {
      showToast('Please add at least 1 component to the build before exporting PDF.', 'error');
      return;
    }
    try {
      const qId = await ensureDraft(selectedClientId);
      await api.updateQuotation(qId, {
        client_id: selectedClientId,
        build_name: buildName,
        discount,
        labour_charge: labourCharge,
        notes
      });
      await api.finalizeQuotation(qId);

      const qData = await api.getQuotation(qId);
      if (qData) {
        setCurrentQuotationData(qData.quotation);
        setItems(qData.items || []);
      }

      try {
        const blob = await api.getPdfBlob(qId);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Quotation_${qId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        showToast(`Quotation ${qId} finalized & PDF downloaded!`, 'success');
      } catch (e) {
        setShowPrintModal(true);
        showToast(`Quotation ${qId} finalized! Opening printable PDF...`, 'success');
      }
    } catch (err) {
      showToast('Failed to finalize quotation: ' + err.message, 'error');
    }
  };

  const handleApplyMargin = async () => {
    const amount = Number(marginInput);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid margin amount in ₹ (greater than 0)', 'error');
      return;
    }
    if (items.length === 0) {
      showToast('Add components to the build first before applying margin.', 'error');
      return;
    }

    const targetItems = marginStrategy === 'selected'
      ? items.filter(it => marginSelectedItems.includes(it.id))
      : items;

    if (targetItems.length === 0) {
      showToast('Please select at least 1 component to distribute the margin.', 'error');
      return;
    }

    const marginPerItem = amount / targetItems.length;
    setSavingMargin(true);

    try {
      const qId = await ensureDraft(selectedClientId);
      const updatedItems = await Promise.all(items.map(async (it) => {
        if (!targetItems.some(t => String(t.id) === String(it.id))) return it;

        const snap = typeof it.product_snapshot === 'string'
          ? JSON.parse(it.product_snapshot)
          : { ...(it.product_snapshot || {}) };

        const gstRate = Number(snap.gst_percent) || 18;
        const currentPriceAfterGst = Number(snap.price_after_gst) || Number(it.unit_price) || 0;
        const currentBasePrice = Number(snap.base_price) || (currentPriceAfterGst / (1 + (gstRate / 100))) || 0;

        const newBasePrice = Math.round((currentBasePrice + marginPerItem) * 100) / 100;
        const newPriceAfterGst = Math.round((newBasePrice * (1 + (gstRate / 100))) * 100) / 100;

        snap.base_price = newBasePrice;
        snap.price_after_gst = newPriceAfterGst;

        const updatedSnapStr = JSON.stringify(snap);
        const newQty = Number(it.quantity) || 1;
        const newLineTotal = newPriceAfterGst * newQty;

        if (qId && it.id) {
          await api.updateQuotationItem(qId, it.id, {
            product_snapshot: updatedSnapStr,
            line_total: newLineTotal
          });
        }

        return {
          ...it,
          product_snapshot: snap,
          line_total: newLineTotal
        };
      }));

      setItems(updatedItems);
      setShowMarginModal(false);
      setMarginInput('');
      showToast(`Added ₹${amount.toLocaleString('en-IN')} seller profit margin (+₹${marginPerItem.toFixed(2)} to base price excl. GST per component)!`, 'success');
    } catch (err) {
      showToast('Failed to apply margin: ' + err.message, 'error');
    } finally {
      setSavingMargin(false);
    }
  };

  // Filter products by active category tab & search
  const filteredProducts = allProducts.filter((p) => {
    if (!p) return false;
    const matchesCat = !activeCategoryTab || String(p.category_id) === String(activeCategoryTab);
    if (!matchesCat) return false;

    if (!productSearch || !productSearch.trim()) return true;

    const q = productSearch.toLowerCase().trim();
    const brand = String(p.brand || '').toLowerCase();
    const model = String(p.model_name || '').toLowerCase();
    const id = String(p.id || '').toLowerCase();

    let specsStr = '';
    if (Array.isArray(p.specs)) {
      specsStr = p.specs
        .map(s => (typeof s === 'object' ? Object.entries(s).map(([k, v]) => `${k} ${v}`).join(' ') : String(s)))
        .join(' ')
        .toLowerCase();
    } else if (typeof p.specs === 'string') {
      specsStr = p.specs.toLowerCase();
    } else {
      specsStr = JSON.stringify(p.specs || '').toLowerCase();
    }

    const matchBrand = brand.includes(q);
    const matchModel = model.includes(q);
    const matchId = id.includes(q);
    const matchSpecs = specsStr.includes(q);
    const matchCombo = `${brand} ${model}`.includes(q);

    return matchBrand || matchModel || matchId || matchSpecs || matchCombo;
  });

  // Calculate totals for bottom bar
  let subtotal = 0;
  let totalGst = 0;
  const gstMap = {};

  items.forEach((item) => {
    const snap = item.product_snapshot || {};
    const basePrice = Number(snap.base_price) || 0;
    const gstRate = Number(snap.gst_percent) || 18;
    const qty = Number(item.quantity) || 1;

    const lineBase = basePrice * qty;
    const lineGst = lineBase * (gstRate / 100);

    subtotal += lineBase;
    totalGst += lineGst;

    if (!gstMap[gstRate]) gstMap[gstRate] = { rate: gstRate, taxable_amount: 0, gst_amount: 0 };
    gstMap[gstRate].taxable_amount += lineBase;
    gstMap[gstRate].gst_amount += lineGst;
  });

  const rawGrandTotal = Math.max(0, subtotal - (Number(discount) || 0) + totalGst + (Number(labourCharge) || 0));
  const grandTotal = Math.round(rawGrandTotal / 50) * 50;
  const roundOff = Math.round(grandTotal - rawGrandTotal);
  const gstBreakdown = Object.values(gstMap).sort((a, b) => a.rate - b.rate);
  const selectedClient = clients.find(c => String(c.id) === String(selectedClientId));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{quotationId ? `Build Quotation — ${quotationId}` : 'Build Custom PC Quotation'}</h1>
          <p className="page-subtitle">Select client, configure hardware components, apply discount & profit margin, and generate tax invoice</p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 340px', gap: '20px', flex: 1, paddingBottom: '90px' }}>
        
        {/* Left Column: Client & Config */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            Quotation Setup
          </h3>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>Select Client *</label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '11px' }}
                onClick={() => setShowClientModal(true)}
              >
                <UserPlus size={12} /> New Client
              </button>
            </div>
            <select
              className="form-select"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              required
            >
              <option value="">-- Choose Client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Build Title / PC Config Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Ultra Gaming Rig 2026"
              value={buildName}
              onChange={(e) => setBuildName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Special Notes / Recommendations</label>
            <textarea
              className="form-textarea"
              rows="3"
              placeholder="e.g. Price valid for 2 days. 3 Years Warranty on CPU/GPU."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {selectedClient && (
            <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
              <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>Client Info:</div>
              <div><strong>Name:</strong> {selectedClient.name}</div>
              <div><strong>Phone:</strong> {selectedClient.phone}</div>
              {selectedClient.email && <div><strong>Email:</strong> {selectedClient.email}</div>}
            </div>
          )}
        </div>

        {/* Center Column: Catalog Picker */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '36px' }}
                placeholder="Search products by brand, model, or specs..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="category-tabs" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px' }}>
            <button
              className={`category-tab ${!activeCategoryTab ? 'active' : ''}`}
              onClick={() => setActiveCategoryTab('')}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-tab ${String(activeCategoryTab) === String(cat.id) ? 'active' : ''}`}
                onClick={() => setActiveCategoryTab(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Catalog Product Cards */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', alignContent: 'start' }}>
            {filteredProducts.map((p) => {
              const basePrice = Number(p.base_price) || 0;
              const gstPercent = Number(p.gst_percent) || 18;
              const priceAfterGst = Number(p.price_after_gst) || (basePrice + (basePrice * gstPercent / 100));

              return (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                      {categories.find(c => String(c.id) === String(p.category_id))?.name || 'Component'}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px', lineHeight: 1.3 }}>
                      {p.brand} {p.model_name}
                    </div>
                    {p.warranty && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {p.warranty} Warranty
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }} className="price-display">
                        ₹{priceAfterGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Incl. {gstPercent}% GST</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setHistoryProduct(p)}
                        title="View Component Price History Graph"
                        style={{ padding: '6px 8px', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                      >
                        <TrendingUp size={14} />
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleAddComponent(p)}
                        title="Add to quotation build"
                        style={{ padding: '6px 10px' }}
                      >
                        <Plus size={14} /> Add
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No products found matching your search.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Build Items List */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Build Components ({items.length})</span>
          </h3>

          {items.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '30px', textAlign: 'center' }}>
              <Plus size={36} strokeWidth={1} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <div>No components selected yet</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Click <strong>+ Add</strong> on products from catalog</div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {items.map((it, idx) => {
                const snap = typeof it.product_snapshot === 'string' ? JSON.parse(it.product_snapshot) : (it.product_snapshot || {});
                const basePrice = Number(snap.base_price) || 0;
                const gstRate = Number(snap.gst_percent) || 18;
                const priceAfterGst = Number(snap.price_after_gst) || (basePrice + (basePrice * gstRate / 100));

                return (
                  <div
                    key={it.id || idx}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between'
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>
                        {snap.brand} {snap.model_name}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        ₹{priceAfterGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Incl. {gstRate}% GST)
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 6px', color: 'var(--danger)' }}
                      onClick={() => handleRemoveComponent(it.id)}
                      title="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Dock */}
      <div className="fixed-bottom-bar">
        <div className="bottom-dock-stats">
          <div className="bottom-stat-item">
            <span className="bottom-stat-label">Subtotal (Excl. GST)</span>
            <span className="bottom-stat-val price-display">₹{Math.round(subtotal).toLocaleString('en-IN')}</span>
          </div>

          <div className="bottom-stat-item">
            <span className="bottom-stat-label" style={{ color: 'var(--primary)' }}>Total GST</span>
            <span className="bottom-stat-val price-display" style={{ color: 'var(--primary)' }}>
              ₹{Math.round(totalGst).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bottom-stat-item">
            <span className="bottom-stat-label">Round Off</span>
            <span className="bottom-stat-val price-display" style={{ color: roundOff >= 0 ? '#10b981' : '#ef4444' }}>
              {roundOff >= 0 ? '+' : ''}₹{Math.abs(roundOff).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bottom-stat-item" style={{ minWidth: '110px' }}>
            <span className="bottom-stat-label" style={{ color: 'var(--danger)' }}>Discount (₹)</span>
            <input
              type="number"
              min="0"
              step="100"
              className="form-input"
              style={{ padding: '2px 6px', height: '28px', textAlign: 'right', fontSize: '13px' }}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </div>

          <div className="bottom-stat-item" style={{ minWidth: '120px' }}>
            <span className="bottom-stat-label" style={{ color: '#10b981' }}>Assembly Fee (₹)</span>
            <input
              type="number"
              min="0"
              step="100"
              className="form-input"
              style={{ padding: '2px 6px', height: '28px', textAlign: 'right', fontSize: '13px' }}
              value={labourCharge}
              onChange={(e) => setLabourCharge(Number(e.target.value))}
            />
          </div>

          {/* Seller Profit Margin Control */}
          <div className="bottom-stat-item" style={{ minWidth: '130px' }}>
            <span className="bottom-stat-label" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Percent size={12} color="#f59e0b" /> Margin (₹)
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ padding: '2px 8px', height: '28px', fontSize: '12px', borderColor: '#f59e0b', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.08)' }}
              onClick={() => {
                setMarginSelectedItems(items.map(i => i.id));
                setShowMarginModal(true);
              }}
            >
              + Add Margin
            </button>
          </div>

          {gstBreakdown.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => setShowGstBreakdownModal(true)}
            >
              <Receipt size={14} color="var(--primary)" /> GST Rates ({gstBreakdown.length})
            </button>
          )}

          <div className="bottom-grand-total">
            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>
                Grand Total (Incl. GST)
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800 }} className="price-display">
                ₹{Math.round(grandTotal).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons docked right at bottom */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleSaveDraft}>
            <Save size={16} /> Save Draft
          </button>
          <button className="btn btn-primary" onClick={handleFinalizeAndDownloadPdf}>
            <Download size={16} /> Finalize & Print PDF
          </button>
        </div>
      </div>

      {/* Margin Distributor Modal */}
      {showMarginModal && (
        <div className="modal-overlay" onClick={() => setShowMarginModal(false)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Percent color="#f59e0b" size={18} /> Profit Margin Distributor (Seller Margin)
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowMarginModal(false)}>
                Close
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.4 }}>
                ℹ️ <strong>Hidden on Customer Bills:</strong> Profit margin is bundled directly into component unit rates. It will <strong>NOT</strong> be displayed as a separate line item on customer PDF invoices.
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Total Seller Margin Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  className="form-input"
                  placeholder="e.g. 5000"
                  value={marginInput}
                  onChange={(e) => setMarginInput(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Margin Distribution Mode</label>
                <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="marginStrategy"
                      value="all"
                      checked={marginStrategy === 'all'}
                      onChange={() => setMarginStrategy('all')}
                    />
                    Spread Equally to All Components ({items.length})
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="marginStrategy"
                      value="selected"
                      checked={marginStrategy === 'selected'}
                      onChange={() => {
                        setMarginStrategy('selected');
                        if (marginSelectedItems.length === 0) {
                          setMarginSelectedItems(items.map(i => i.id || i.product_id));
                        }
                      }}
                    />
                    Selected Components Only
                  </label>
                </div>
              </div>

              {marginStrategy === 'selected' && (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>Select Components ({marginSelectedItems.length}/{items.length}):</label>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', padding: '2px 6px' }}
                      onClick={() => {
                        const allIds = items.map(i => i.id || i.product_id);
                        setMarginSelectedItems(marginSelectedItems.length === items.length ? [] : allIds);
                      }}
                    >
                      {marginSelectedItems.length === items.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px' }}>
                    {items.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        No components added to the build yet.
                      </div>
                    ) : (
                      items.map((it, idx) => {
                        let snap = {};
                        if (typeof it.product_snapshot === 'string') {
                          try { snap = JSON.parse(it.product_snapshot); } catch (e) { snap = {}; }
                        } else {
                          snap = it.product_snapshot || {};
                        }

                        const itemId = it.id || it.product_id || `item_${idx}`;
                        const isSelected = marginSelectedItems.includes(itemId);
                        const brandStr = snap.brand || it.brand || '';
                        const modelStr = snap.model_name || it.model_name || it.product_name || `Component #${idx + 1}`;
                        const priceVal = Number(snap.price_after_gst ?? it.price_after_gst ?? it.unit_price ?? 0);

                        return (
                          <label key={itemId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', fontSize: '12px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) setMarginSelectedItems([...marginSelectedItems, itemId]);
                                else setMarginSelectedItems(marginSelectedItems.filter(id => id !== itemId));
                              }}
                            />
                            <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <strong>{brandStr} {modelStr}</strong>
                            </div>
                            <div style={{ fontWeight: 700 }}>₹{priceVal.toLocaleString('en-IN')}</div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {Number(marginInput) > 0 && items.length > 0 && (
                <div style={{ fontSize: '12px', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px', color: '#f59e0b', fontWeight: 700 }}>
                  Preview: +₹{(Number(marginInput) / (marginStrategy === 'selected' ? (marginSelectedItems.length || 1) : items.length)).toFixed(2)} added to base price (excl. GST) per target component
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setShowMarginModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleApplyMargin} disabled={savingMargin} style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#000000', fontWeight: 800 }}>
                {savingMargin ? 'Applying...' : 'Apply Profit Margin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GST Breakdown Modal */}
      {showGstBreakdownModal && (
        <div className="modal-overlay" onClick={() => setShowGstBreakdownModal(false)}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt color="var(--primary)" size={18} /> Tax Rate Breakdown
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowGstBreakdownModal(false)}>
                Close
              </button>
            </div>
            <div className="modal-body" style={{ marginTop: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 0' }}>Rate</th>
                    <th style={{ textAlign: 'right', padding: '6px 0' }}>Taxable Base</th>
                    <th style={{ textAlign: 'right', padding: '6px 0' }}>GST Total</th>
                  </tr>
                </thead>
                <tbody>
                  {gstBreakdown.map((b) => (
                    <tr key={b.rate} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 0', fontWeight: 700, color: 'var(--accent)' }}>GST @ {b.rate}%</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }} className="price-display">₹{b.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', color: '#10b981' }} className="price-display">₹{b.gst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Printable PDF Quotation Invoice Modal */}
      <PrintableQuotationModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        quotation={currentQuotationData || { id: quotationId, build_name: buildName, discount, labour_charge: labourCharge, notes }}
        client={selectedClient}
        items={items}
        categories={categories}
        settings={settingsData}
      />

      <ClientFormModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSave={async (newClientData) => {
          try {
            const created = await api.createClient(newClientData);
            setSelectedClientId(created.id);
            setShowClientModal(false);
            showToast(`Client "${created.name}" created`, 'success');
          } catch (err) {
            showToast('Failed to create client: ' + err.message, 'error');
          }
        }}
      />

      <PriceHistoryModal
        product={historyProduct}
        isOpen={Boolean(historyProduct)}
        onClose={() => setHistoryProduct(null)}
      />
    </div>
  );
}
