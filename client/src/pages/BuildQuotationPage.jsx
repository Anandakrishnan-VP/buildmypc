import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Download, UserPlus, Search, Receipt } from 'lucide-react';
import { api } from '../api/client';
import ClientFormModal from '../components/ClientFormModal';

export default function BuildQuotationPage({ categories = [], clients = [], activeQuoteId = null, onFinished, showToast = () => {}, showConfirm = () => {} }) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [buildName, setBuildName] = useState('');
  const [discount, setDiscount] = useState(0);
  const [labourCharge, setLabourCharge] = useState(500);
  const [notes, setNotes] = useState('');
  const [quotationId, setQuotationId] = useState(activeQuoteId);
  const [items, setItems] = useState([]);
  
  const [allProducts, setAllProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState(categories[0]?.id || 'cpu');
  const [showClientModal, setShowClientModal] = useState(false);
  const [showGstBreakdownModal, setShowGstBreakdownModal] = useState(false);

  // Load products catalog for picker
  useEffect(() => {
    api.getProducts({ activeOnly: true }).then((data) => setAllProducts(data));
  }, []);

  // Load quote details if editing an existing quote/draft
  useEffect(() => {
    if (activeQuoteId) {
      api.getQuotation(activeQuoteId).then((data) => {
        setQuotationId(data.quotation.id);
        setSelectedClientId(data.quotation.client_id);
        setBuildName(data.quotation.build_name || '');
        setDiscount(data.quotation.discount || 0);
        setLabourCharge(data.quotation.labour_charge || 0);
        setNotes(data.quotation.notes || '');
        setItems(data.items || []);
      }).catch((err) => {
        showToast('Failed to load quotation: ' + err.message, 'error');
      });
    } else {
      if (clients.length > 0) {
        setSelectedClientId(clients[0].id);
      }
    }
  }, [activeQuoteId, clients]);

  // Ensure initial draft quotation exists in database
  const ensureDraft = async (clientIdToUse) => {
    if (quotationId) return quotationId;
    const res = await api.createQuotation({
      client_id: clientIdToUse || selectedClientId,
      build_name: buildName || 'Custom Gaming Rig',
      discount,
      labour_charge: labourCharge,
      notes
    });
    setQuotationId(res.id);
    return res.id;
  };

  const handleAddItem = async (product) => {
    if (!selectedClientId) {
      showToast('Please select or create a client first.', 'error');
      return;
    }
    try {
      const qId = await ensureDraft(selectedClientId);
      await api.addQuotationItem(qId, { product_id: product.id, quantity: 1 });
      const updated = await api.getQuotation(qId);
      setItems(updated.items);
      showToast(`Added "${product.brand} ${product.model_name}" to build`, 'success');
    } catch (err) {
      showToast('Failed to add item: ' + err.message, 'error');
    }
  };

  const handleUpdateQty = async (itemId, newQty) => {
    if (newQty < 1) return;
    try {
      await api.updateQuotationItem(quotationId, itemId, { quantity: newQty });
      const updated = await api.getQuotation(quotationId);
      setItems(updated.items);
    } catch (err) {
      showToast('Failed to update quantity: ' + err.message, 'error');
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await api.removeQuotationItem(quotationId, itemId);
      const updated = await api.getQuotation(quotationId);
      setItems(updated.items);
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

      const blob = await api.getPdfBlob(qId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Quotation_${qId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      showToast(`Quotation ${qId} finalized & PDF downloaded!`, 'success');
      if (onFinished) onFinished();
    } catch (err) {
      showToast('PDF Generation failed: ' + err.message, 'error');
    }
  };

  // Filter products by active category tab & search
  const filteredProducts = allProducts.filter((p) => {
    const matchesCat = !activeCategoryTab || p.category_id === activeCategoryTab;
    const matchesSearch = !productSearch || 
      p.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.model_name.toLowerCase().includes(productSearch.toLowerCase()) ||
      JSON.stringify(p.specs).toLowerCase().includes(productSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Calculate totals for bottom bar
  let subtotal = 0;
  let totalGst = 0;
  const gstMap = {};

  items.forEach((item) => {
    const snap = item.product_snapshot;
    const lineBase = (snap.base_price || 0) * item.quantity;
    const lineGst = lineBase * ((snap.gst_percent || 0) / 100);
    subtotal += lineBase;
    totalGst += lineGst;

    const rate = snap.gst_percent || 0;
    if (!gstMap[rate]) gstMap[rate] = { rate, taxable_amount: 0, gst_amount: 0 };
    gstMap[rate].taxable_amount += lineBase;
    gstMap[rate].gst_amount += lineGst;
  });

  const grandTotal = Math.max(0, subtotal - (Number(discount) || 0) + totalGst + (Number(labourCharge) || 0));
  const gstBreakdown = Object.values(gstMap).sort((a, b) => a.rate - b.rate);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{quotationId ? `Build Quotation — ${quotationId}` : 'Build Custom PC Quotation'}</h1>
          <p className="page-subtitle">Pick components across categories to assemble your quote</p>
        </div>
      </div>

      {/* Client & Build Information Header Card */}
      <div className="card" style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', minWidth: 0, overflow: 'hidden' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label">Client *</label>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => setShowClientModal(true)}
            >
              <UserPlus size={14} /> Quick Add Client
            </button>
          </div>
          <select
            className="form-select"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            <option value="">-- Select Client --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone}) {c.gstin ? `[GSTIN: ${c.gstin}]` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Build Title / Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Rahul's 1440p Gaming PC"
            value={buildName}
            onChange={(e) => setBuildName(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Special Notes / T&C for Quote</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Free home delivery included"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        {/* Left Panel: Component Selector */}
        <div className="card" style={{ minWidth: 0, overflow: 'hidden' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Component Selector</h3>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`btn btn-sm ${activeCategoryTab === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ whiteSpace: 'nowrap' }}
                onClick={() => setActiveCategoryTab(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Search */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder={`Search ${categories.find(c => c.id === activeCategoryTab)?.name || 'parts'}...`}
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>

          {/* Available Parts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '480px', overflowY: 'auto' }}>
            {filteredProducts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No parts found in this category.
              </div>
            ) : (
              filteredProducts.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.brand} {p.model_name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>{p.id}</span>
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      {Array.isArray(p.specs) && p.specs.map((specObj, idx) => {
                        const k = Object.keys(specObj)[0];
                        return (
                          <span key={idx} className="spec-chip" style={{ fontSize: '10px' }}>
                            {k}: {specObj[k]}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }} className="price-display">
                      ₹{p.price_after_gst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Incl. {p.gst_percent}% GST</div>
                  </div>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAddItem(p)}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Selected Components (Scrollable List) */}
        <div className="card" style={{ minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
              Selected Components ({items.length})
            </h3>
            {items.length > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                Scrollable List
              </span>
            )}
          </div>

          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Your build is empty. Click <strong>"+ Add"</strong> on components from the left panel to populate this list.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '480px', overflowY: 'auto' }}>
              {items.map((item) => {
                const snap = item.product_snapshot;
                const lineTotal = (snap.price_after_gst || 0) * item.quantity;
                return (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {snap.brand} {snap.model_name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        ₹{snap.price_after_gst?.toLocaleString('en-IN')} x {item.quantity} (GST {snap.gst_percent}%)
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '2px 8px' }}
                        onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 700, width: '24px', textAlign: 'center', fontSize: '14px' }}>{item.quantity}</span>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '2px 8px' }}
                        onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: '95px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#10b981' }} className="price-display">
                        ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <button
                      className="btn btn-danger btn-sm"
                      style={{ padding: '6px' }}
                      onClick={() => handleRemoveItem(item.id)}
                      title="Remove component"
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
            <span className="bottom-stat-val price-display">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="bottom-stat-item">
            <span className="bottom-stat-label" style={{ color: 'var(--primary)' }}>Total GST</span>
            <span className="bottom-stat-val price-display" style={{ color: 'var(--primary)' }}>
              ₹{totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
            <Download size={16} /> Finalize & Download PDF
          </button>
        </div>
      </div>

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
            <div className="modal-body">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 0' }}>GST Rate</th>
                    <th style={{ textAlign: 'right', padding: '6px 0' }}>Taxable Base</th>
                    <th style={{ textAlign: 'right', padding: '6px 0' }}>GST Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {gstBreakdown.map((b, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
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

      <ClientFormModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSave={async (newClientData) => {
          try {
            const created = await api.createClient(newClientData);
            setSelectedClientId(created.id);
            setShowClientModal(false);
            showToast(`Client "${created.name}" created`, 'success');
          } catch (e) {
            showToast('Failed to add client: ' + e.message, 'error');
          }
        }}
      />
    </div>
  );
}
