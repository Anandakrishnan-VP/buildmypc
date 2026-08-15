import React from 'react';
import ReactDOM from 'react-dom';
import { Printer, X, Cpu } from 'lucide-react';

function formatWarrantyStr(val) {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  if (/warranty/i.test(str)) return str;
  if (/year|yr|month|mo/i.test(str)) return `${str} Warranty`;

  const num = parseInt(str, 10);
  if (!isNaN(num)) {
    return `${num} ${num === 1 ? 'Year' : 'Years'} Warranty`;
  }
  return `${str} Warranty`;
}

function formatNoDec(val) {
  return Math.round(Number(val) || 0).toLocaleString('en-IN');
}

function numberToIndianWords(amount) {
  const num = Math.round(Number(amount) || 0);
  if (num === 0) return 'INR Zero Rupees Only.';

  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' And ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
  }

  return `INR ${inWords(num)} Rupees Only.`;
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

const defaultCategoryNameMap = {
  'cat_1': 'PROCESSOR',
  'cat_2': 'MOTHERBOARD',
  'cat_3': 'RAM / MEMORY',
  'cat_4': 'GRAPHICS CARD (GPU)',
  'cat_5': 'STORAGE (SSD/HDD)',
  'cat_6': 'POWER SUPPLY (PSU)',
  'cat_7': 'CABINET / CASE',
  'cat_8': 'COOLER / AIO',
  'cat_9': 'MONITOR',
  'cat_10': 'PERIPHERALS',
  'cpu': 'PROCESSOR',
  'gpu': 'GRAPHICS CARD (GPU)',
  'motherboard': 'MOTHERBOARD',
  'ram': 'RAM / MEMORY',
  'storage': 'STORAGE (SSD/HDD)',
  'psu': 'POWER SUPPLY (PSU)',
  'case': 'CABINET / CASE',
  'cooling': 'COOLER / AIO'
};

function resolveCategoryName(snap, item, categories = []) {
  if (snap.category_name && !snap.category_name.toLowerCase().startsWith('cat_')) return snap.category_name.toUpperCase();
  if (item.category_name && !item.category_name.toLowerCase().startsWith('cat_')) return item.category_name.toUpperCase();

  const catId = snap.category_id || item.category_id || '';
  if (catId) {
    const found = categories.find(c => String(c.id) === String(catId));
    if (found && found.name) return found.name.toUpperCase();

    const mapped = defaultCategoryNameMap[String(catId).toLowerCase()];
    if (mapped) return mapped;
  }

  return 'HARDWARE';
}

export default function PrintableQuotationModal({ isOpen, onClose, quotation, client, items = [], categories = [], settings = {}, enableRoundOff: enableRoundOffProp }) {
  if (!isOpen || !quotation) return null;

  const [pdfFormat, setPdfFormat] = React.useState('detailed'); // 'detailed' | 'lumpSum'

  const shopName = settings.name || 'MATRIX IT WORLD';
  const shopAddress = settings.address || '29/698A Jubilee Building, Mavoor Rd, opp. Saudi Arabian Airlines, Parayancheri, Kozhikode, Kerala 673016';
  const shopPhone = settings.phone || '+91 9048844155';
  const shopEmail = settings.email || 'sales@matrixitworld.com';
  const shopWebsite = settings.website || 'https://www.matrixitworld.com';
  const shopGstin = settings.gstin || '32AAGFM3714M1ZB';
  const shopPan = settings.pan || 'AAFM3714M';
  const consultantName = settings.consultant_name || 'Sales Team';
  const consultantPhone = settings.consultant_phone || '';

  let subtotal = 0;
  let totalGst = 0;

  const formattedItems = items.map((item, idx) => {
    const snap = parseSnapshot(item.product_snapshot);
    const brand = snap.brand || item.brand || '';
    const model = snap.model_name || item.model_name || item.product_name || `Component #${idx + 1}`;
    const categoryName = resolveCategoryName(snap, item, categories);
    const rawWarranty = snap.warranty || item.warranty || '';
    const warranty = formatWarrantyStr(rawWarranty);

    const basePrice = Number(snap.base_price ?? item.base_price ?? item.unit_price ?? 0);
    const gstPercent = Number(snap.gst_percent ?? item.gst_percent ?? 18);
    const qty = Number(item.quantity) || 1;

    const lineBase = basePrice * qty;
    const lineGst = lineBase * (gstPercent / 100);
    const lineTotal = lineBase + lineGst;

    subtotal += lineBase;
    totalGst += lineGst;

    return {
      slNo: idx + 1,
      brand,
      model,
      categoryName,
      warranty,
      unitBasePrice: basePrice,
      priceAfterGst: basePrice + (basePrice * gstPercent / 100),
      qty,
      lineTotal
    };
  });

  const discount = Number(quotation.discount) || 0;
  const labour = Number(quotation.labour_charge) || 0;
  const rawGrandTotal = Math.max(0, subtotal - discount + totalGst + labour);
  
  const enableRoundOff = enableRoundOffProp !== undefined ? enableRoundOffProp : (settings.enable_round_off !== false);
  const grandTotal = enableRoundOff ? (Math.round(rawGrandTotal / 50) * 50) : Math.round(rawGrandTotal);
  const roundOff = enableRoundOff ? Math.round(grandTotal - rawGrandTotal) : 0;
  const totalInWords = numberToIndianWords(grandTotal);

  const cgst = totalGst / 2;
  const sgst = totalGst / 2;

  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = ' ';
    const modalEl = document.querySelector('.printable-quotation-modal');
    if (modalEl) modalEl.scrollTop = 0;
    window.scrollTo(0, 0);
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  };

  const quoteId = quotation.id || quotation.quote_number || 'EST-AK9578';
  const quoteCreatedAt = new Date(quotation.created_at || Date.now());
  const quoteDate = quoteCreatedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  let validDate = quoteDate;
  if (quotation.valid_until) {
    validDate = new Date(quotation.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } else {
    const vDays = Number(settings.validity_days) || 2;
    const computedVal = new Date(quoteCreatedAt);
    computedVal.setDate(computedVal.getDate() + vDays);
    validDate = computedVal.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="modal-content printable-quotation-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '880px',
          width: '95%',
          maxHeight: '94vh',
          overflowY: 'auto',
          background: '#ffffff',
          color: '#1e293b',
          padding: '36px',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
        }}
      >
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={18} color="#FFCC06" /> PDF Mode:
            </div>
            
            <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <button
                type="button"
                onClick={() => setPdfFormat('detailed')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: pdfFormat === 'detailed' ? '#FFCC06' : 'transparent',
                  color: pdfFormat === 'detailed' ? '#000000' : '#64748b',
                  boxShadow: pdfFormat === 'detailed' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                📄 Detailed (Itemized Rates)
              </button>
              <button
                type="button"
                onClick={() => setPdfFormat('lumpSum')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: pdfFormat === 'lumpSum' ? '#0f172a' : 'transparent',
                  color: pdfFormat === 'lumpSum' ? '#ffffff' : '#64748b',
                  boxShadow: pdfFormat === 'lumpSum' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                🏷️ Lump-Sum (Final Total Only)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFCC06', color: '#000000', borderColor: '#FFCC06', fontWeight: 800 }}>
              <Printer size={16} /> Print / Save PDF
            </button>
            <button className="btn btn-secondary" onClick={onClose}>
              <X size={16} /> Close
            </button>
          </div>
        </div>

        {/* Printable Quotation Sheet */}
        <div id="printable-quotation" style={{ background: '#ffffff', color: '#0f172a' }}>
          {/* Header Block */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <img
                src="/logo.png"
                alt="Logo"
                style={{ maxHeight: '70px', maxWidth: '200px', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  {shopName}
                </h1>
                <div style={{ fontSize: '11px', color: '#334155', marginTop: '4px', maxWidth: '440px', lineHeight: 1.4, fontWeight: 500 }}>
                  <div><strong>GSTIN {shopGstin}</strong></div>
                  <div>{shopAddress}</div>
                  <div>Mobile <strong>{shopPhone}</strong></div>
                  <div>Email <strong>{shopEmail}</strong></div>
                  <div>Website <strong>{shopWebsite}</strong></div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#000000', textTransform: 'uppercase', letterSpacing: '1px' }}>
                QUOTATION
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.5px' }}>
                ORIGINAL FOR RECIPIENT
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '20px', fontSize: '12px', lineHeight: 1.5 }}>
            <div>
              <div style={{ color: '#475569', fontWeight: 700, fontSize: '11px' }}>Bill To:</div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', textTransform: 'uppercase' }}>
                {client?.name || 'VALUED CUSTOMER'}
              </div>
              {client?.phone && <div>Ph: <strong>{client.phone}</strong></div>}
              {client?.email && <div>{client.email}</div>}
              {client?.gstin && <div style={{ color: '#000000', fontWeight: 700 }}>Client GSTIN: {client.gstin}</div>}

              <div style={{ marginTop: '10px', color: '#475569', fontWeight: 700, fontSize: '11px' }}>Dispatch From:</div>
              <div style={{ fontSize: '11px', color: '#334155', textTransform: 'uppercase', fontWeight: 600 }}>
                {shopName}<br />
                {shopAddress}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '3px 8px 3px 0', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Quotation #:</td>
                    <td style={{ padding: '3px 0', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>{quoteId}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 8px 3px 0', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Quotation Date:</td>
                    <td style={{ padding: '3px 0', fontWeight: 700, textAlign: 'right' }}>{quoteDate}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 8px 3px 0', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Validity:</td>
                    <td style={{ padding: '3px 0', fontWeight: 700, textAlign: 'right' }}>{validDate}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 8px 3px 0', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Consultant Name:</td>
                    <td style={{ padding: '3px 0', fontWeight: 700, textAlign: 'right' }}>{consultantName}</td>
                  </tr>
                  {consultantPhone && (
                    <tr>
                      <td style={{ padding: '3px 8px 3px 0', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Consultant Phone:</td>
                      <td style={{ padding: '3px 0', fontWeight: 700, textAlign: 'right' }}>{consultantPhone}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Yellow Header Items Table (#FFCC06 - Without HSN/SAC, Category first, No Decimals) */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#FFCC06', color: '#000000' }}>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '35px', fontWeight: 800 }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800 }}>Item</th>
                {pdfFormat === 'detailed' && (
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: '110px', fontWeight: 800 }}>Rate / Item</th>
                )}
                <th style={{ padding: '8px 10px', textAlign: 'center', width: pdfFormat === 'detailed' ? '65px' : '85px', fontWeight: 800 }}>Qty</th>
                {pdfFormat === 'detailed' && (
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: '115px', fontWeight: 800 }}>Amount</th>
                )}
              </tr>
            </thead>
            <tbody>
              {formattedItems.map((it, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700, color: '#64748b', verticalAlign: 'top' }}>{it.slNo}</td>
                  <td style={{ padding: '10px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 800, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.5px' }}>
                      {it.categoryName}
                    </div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px', textTransform: 'uppercase' }}>
                      {it.brand} {it.model}
                    </div>
                    {it.warranty && (
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {it.warranty}
                      </div>
                    )}
                  </td>
                  {pdfFormat === 'detailed' && (
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, verticalAlign: 'top' }}>
                      ₹{formatNoDec(it.priceAfterGst)}
                    </td>
                  )}
                  <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700, verticalAlign: 'top' }}>
                    {it.qty} PCS
                  </td>
                  {pdfFormat === 'detailed' && (
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#0f172a', verticalAlign: 'top' }}>
                      ₹{formatNoDec(it.lineTotal)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Delivery & Totals Block */}
          <div className="summary-totals-block" style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '24px', alignItems: 'flex-start', marginTop: '24px', paddingTop: '20px', marginBottom: '24px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            {/* Left Bank & Terms */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>Bank Details:</div>
              <div style={{ fontSize: '11px', color: '#334155', lineHeight: 1.5, background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <div>Bank: <strong>{settings.bank_name || 'Axis Bank'}</strong></div>
                <div>Account #: <strong>{settings.account_number || '923020059560559'}</strong></div>
                <div>IFSC Code: <strong>{settings.ifsc_code || 'UTIB0000694'}</strong></div>
                <div>Branch: <strong>{settings.branch_name || 'KARAMANA'}</strong></div>
              </div>

              <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Terms and Conditions:</div>
              <div style={{ fontSize: '10px', color: '#64748b', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                {settings.terms_conditions || `Price valid for ${settings.validity_days || 2} days from quote issue date.\nWarranty as per component manufacturer guidelines.`}
              </div>
            </div>

            {/* Right Totals Box */}
            <div style={{ textAlign: 'right' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <tbody>
                  {labour > 0 && (
                    <tr>
                      <td style={{ padding: '4px 0', color: '#475569', textAlign: 'right' }}>Assembly & Service Charge:</td>
                      <td style={{ padding: '4px 0 4px 12px', fontWeight: 700, textAlign: 'right' }}>₹{formatNoDec(labour)}</td>
                    </tr>
                  )}
                  {discount > 0 && (
                    <tr>
                      <td style={{ padding: '4px 0', color: '#ef4444', textAlign: 'right' }}>Discount Applied:</td>
                      <td style={{ padding: '4px 0 4px 12px', fontWeight: 700, color: '#ef4444', textAlign: 'right' }}>- ₹{formatNoDec(discount)}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ padding: '4px 0', color: '#475569', textAlign: 'right' }}>Taxable Amount:</td>
                    <td style={{ padding: '4px 0 4px 12px', fontWeight: 700, textAlign: 'right' }}>₹{formatNoDec(subtotal)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#475569', textAlign: 'right' }}>CGST 9.0%:</td>
                    <td style={{ padding: '4px 0 4px 12px', fontWeight: 700, textAlign: 'right' }}>₹{formatNoDec(cgst)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#475569', textAlign: 'right' }}>SGST 9.0%:</td>
                    <td style={{ padding: '4px 0 4px 12px', fontWeight: 700, textAlign: 'right' }}>₹{formatNoDec(sgst)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#475569', textAlign: 'right' }}>Round Off:</td>
                    <td style={{ padding: '4px 0 4px 12px', fontWeight: 700, textAlign: 'right' }}>
                      {!enableRoundOff ? '₹0' : `${roundOff >= 0 ? '+' : ''}${formatNoDec(roundOff)}`}
                    </td>
                  </tr>
                  <tr style={{ borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a' }}>
                    <td style={{ padding: '8px 0', fontSize: '16px', fontWeight: 900, color: '#0f172a', textAlign: 'right' }}>Total</td>
                    <td style={{ padding: '8px 0 8px 12px', fontSize: '18px', fontWeight: 900, color: '#0f172a', textAlign: 'right' }}>₹{formatNoDec(grandTotal)}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ background: '#FFCC06', color: '#000000', padding: '6px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, marginTop: '8px', textAlign: 'right' }}>
                {totalInWords}
              </div>

              <div style={{ marginTop: '28px', textAlign: 'right' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>For {shopName}</div>
                <div style={{ height: '40px' }}></div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Authorized Signatory</div>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', fontSize: '10px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>Page 1/1 • {quoteId}</span>
            <span>This is a digitally generated document.</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
