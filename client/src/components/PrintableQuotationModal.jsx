import React from 'react';
import { Printer, X, ShieldCheck, Cpu } from 'lucide-react';

export default function PrintableQuotationModal({ isOpen, onClose, quotation, client, items = [], settings = {} }) {
  if (!isOpen || !quotation) return null;

  const shopName = settings.name || 'Zeus PC Custom Builds';
  const shopPhone = settings.phone || '+91 98765 43210';
  const shopEmail = settings.email || 'sales@zeuspc.in';
  const shopAddress = settings.address || '123 Tech Street, Electronic City, Bengaluru, Karnataka 560100';
  const shopGstin = settings.gstin || '29ABCDE1234F1Z5';

  let subtotal = 0;
  let totalGst = 0;
  const gstMap = {};

  items.forEach(item => {
    const snap = item.product_snapshot || {};
    const basePrice = Number(snap.base_price) || 0;
    const gstRate = Number(snap.gst_percent) || 18;
    const qty = Number(item.quantity) || 1;
    
    const lineBase = basePrice * qty;
    const lineGst = lineBase * (gstRate / 100);
    
    subtotal += lineBase;
    totalGst += lineGst;

    if (!gstMap[gstRate]) gstMap[gstRate] = { rate: gstRate, taxable: 0, gst: 0 };
    gstMap[gstRate].taxable += lineBase;
    gstMap[gstRate].gst += lineGst;
  });

  const discount = Number(quotation.discount) || 0;
  const labour = Number(quotation.labour_charge) || 0;
  const grandTotal = Math.max(0, subtotal - discount + totalGst + labour);
  const gstList = Object.values(gstMap).sort((a, b) => a.rate - b.rate);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="modal-content printable-quotation-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '850px',
          width: '95%',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#ffffff',
          color: '#0f172a',
          padding: '36px',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          fontFamily: "'Space Grotesk', 'Inter', sans-serif"
        }}
      >
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={20} color="#00f0ff" /> Official Tax Quotation Invoice
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={16} /> Print / Save as PDF
            </button>
            <button className="btn btn-secondary" onClick={onClose}>
              <X size={16} /> Close
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="printable-quotation">
          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #00f0ff', paddingBottom: '20px', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '1px' }}>
                {shopName}
              </h2>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px', maxWidth: '380px', lineHeight: 1.5 }}>
                {shopAddress}<br />
                Phone: <strong>{shopPhone}</strong> | Email: <strong>{shopEmail}</strong><br />
                <span style={{ color: '#8b5cf6', fontWeight: 700 }}>GSTIN: {shopGstin}</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#00f0ff', textTransform: 'uppercase', letterSpacing: '1px' }}>
                QUOTATION
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                #{quotation.id || quotation.quote_number}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Date: {new Date(quotation.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Client Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#f8fafc', padding: '16px 20px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>Billed To Client:</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{client?.name || 'Valued Customer'}</div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>Phone: {client?.phone || 'N/A'}</div>
              {client?.email && <div style={{ fontSize: '12px', color: '#475569' }}>Email: {client.email}</div>}
              {client?.address && <div style={{ fontSize: '12px', color: '#475569' }}>Address: {client.address}</div>}
              {client?.gstin && <div style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: 700, marginTop: '2px' }}>Client GSTIN: {client.gstin}</div>}
            </div>

            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>Build Title:</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{quotation.build_name || 'Custom PC Build'}</div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>Status: <strong style={{ color: '#10b981', textTransform: 'uppercase' }}>{quotation.status || 'Draft'}</strong></div>
              {quotation.notes && <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', fontStyle: 'italic' }}>Note: {quotation.notes}</div>}
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '10px 12px', textAlign: 'center', width: '40px' }}>#</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Component & Specifications</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', width: '70px' }}>Qty</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', width: '100px' }}>Unit Price (Excl. GST)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', width: '70px' }}>GST %</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', width: '110px' }}>Total (Incl. GST)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const snap = it.product_snapshot || {};
                const basePrice = Number(snap.base_price) || 0;
                const gstPercent = Number(snap.gst_percent) || 18;
                const priceAfterGst = Number(snap.price_after_gst) || (basePrice + (basePrice * gstPercent / 100));
                const qty = Number(it.quantity) || 1;
                const lineTotal = priceAfterGst * qty;

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{snap.brand} {snap.model_name}</div>
                      {Array.isArray(snap.specs) && snap.specs.length > 0 && (
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                          {snap.specs.map(s => Object.entries(s).map(([k, v]) => `${k}: ${v}`).join(' | ')).join(' • ')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{qty}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>₹{basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#8b5cf6', fontWeight: 700 }}>{gstPercent}%</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Bottom Totals & GST Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}>GST Tax Rate Breakdown</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', background: '#f8fafc', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <thead>
                  <tr style={{ background: '#e2e8f0', color: '#334155' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Rate</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Taxable Base</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>CGST</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>SGST</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total GST</th>
                  </tr>
                </thead>
                <tbody>
                  {gstList.map((g, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>{g.rate}%</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{g.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{(g.gst / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{(g.gst / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>₹{g.gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '16px', fontSize: '10px', color: '#64748b', lineHeight: 1.5 }}>
                <strong>Terms & Conditions:</strong><br />
                {settings.terms_conditions || '1. Quotation valid for 7 days from issue date.\n2. Prices inclusive of GST as indicated.\n3. Warranty as per manufacturer terms.'}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', color: '#475569' }}>
                <span>Subtotal (Excl. GST):</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', color: '#8b5cf6' }}>
                <span>Total GST:</span>
                <span style={{ fontWeight: 700 }}>₹{totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {labour > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', color: '#475569' }}>
                  <span>Assembly / Testing Fee:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{labour.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', color: '#ef4444' }}>
                  <span>Discount Applied:</span>
                  <span style={{ fontWeight: 700 }}>- ₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0 0', marginTop: '8px', borderTop: '2px dashed #cbd5e1', fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                <span>Grand Total:</span>
                <span style={{ color: '#10b981' }}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
