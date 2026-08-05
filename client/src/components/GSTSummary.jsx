import React from 'react';
import { Tag, Receipt, ShieldCheck } from 'lucide-react';

function formatINR(val) {
  const num = Number(val) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GSTSummary({
  subtotal = 0,
  totalGst = 0,
  gstBreakdown = [],
  discount = 0,
  setDiscount,
  labourCharge = 0,
  setLabourCharge,
  grandTotal = 0
}) {
  return (
    <div className="card" style={{ background: '#1e293b', border: '1px solid var(--primary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <Receipt color="var(--primary)" size={20} />
        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>GST Summary & Total</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
          <span>Subtotal (Excl. GST):</span>
          <span className="price-display" style={{ color: '#fff' }}>{formatINR(subtotal)}</span>
        </div>

        {/* GST Rate Breakdown Box */}
        {gstBreakdown.length > 0 && (
          <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px dashed var(--border-color)', fontSize: '12px' }}>
            <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '6px', textTransform: 'uppercase', fontSize: '11px' }}>
              GST Rate Breakdown
            </div>
            {gstBreakdown.map((b, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', color: 'var(--text-muted)' }}>
                <span>GST @ {b.rate}% (on {formatINR(b.taxable_amount)}):</span>
                <span className="price-display" style={{ color: '#38bdf8' }}>{formatINR(b.gst_amount)}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', fontWeight: 600 }}>
          <span>Total GST Amount:</span>
          <span className="price-display">{formatINR(totalGst)}</span>
        </div>

        {/* Editable Discount */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Tag size={14} color="#ef4444" /> Discount (Pre-tax ₹):
          </label>
          <input
            type="number"
            min="0"
            step="100"
            className="form-input"
            style={{ width: '120px', padding: '4px 8px', textAlign: 'right' }}
            value={discount}
            onChange={(e) => setDiscount && setDiscount(Number(e.target.value))}
          />
        </div>

        {/* Editable Labour / Assembly Charge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} color="#10b981" /> Assembly & Labour Fee (₹):
          </label>
          <input
            type="number"
            min="0"
            step="100"
            className="form-input"
            style={{ width: '120px', padding: '4px 8px', textAlign: 'right' }}
            value={labourCharge}
            onChange={(e) => setLabourCharge && setLabourCharge(Number(e.target.value))}
          />
        </div>

        {/* Grand Total */}
        <div style={{
          marginTop: '12px',
          padding: '14px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, var(--primary), #0369a1)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>
              Grand Total (Incl. GST)
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800 }} className="price-display">
              {formatINR(grandTotal)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
