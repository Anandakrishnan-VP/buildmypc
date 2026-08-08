import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatMoney(amount) {
  const num = Math.round(Number(amount) || 0);
  return num.toLocaleString('en-IN');
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Lightweight template compiler for quotation HTML
 */
function renderTemplate(templateHtml, data) {
  const { quotation, client, settings, categoriesWithItems, totals } = data;

  let html = templateHtml;

  const logoPath = path.join(__dirname, '../../buildguide/matrix-IT-world.png');
  let logoBase64 = '';
  if (fs.existsSync(logoPath)) {
    logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
  }

  if (logoBase64) {
    html = html.replace(/\{\{#if settings\.logo_base64\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1')
      .replace(/\{\{settings\.logo_base64\}\}/g, logoBase64);
  } else {
    html = html.replace(/\{\{#if settings\.logo_base64\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  // Simple string replacements
  html = html.replace(/\{\{settings\.name\}\}/g, settings.name || '');
  html = html.replace(/\{\{settings\.address\}\}/g, settings.address || '');
  html = html.replace(/\{\{settings\.phone\}\}/g, settings.phone || '');
  html = html.replace(/\{\{settings\.email\}\}/g, settings.email || '');
  html = html.replace(/\{\{settings\.terms_conditions\}\}/g, (settings.terms_conditions || '').replace(/\n/g, '<br/>'));
  
  if (settings.gstin) {
    html = html.replace(/\{\{#if settings\.gstin\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1')
      .replace(/\{\{settings\.gstin\}\}/g, settings.gstin);
  } else {
    html = html.replace(/\{\{#if settings\.gstin\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }


  if (settings.bank_name) {
    html = html.replace(/\{\{#if settings\.bank_name\}\}([\s\S]*?)\{\{else\}\}[\s\S]*?\{\{\/if\}\}/g, '$1')
      .replace(/\{\{settings\.bank_name\}\}/g, settings.bank_name);
  } else {
    html = html.replace(/\{\{#if settings\.bank_name\}\}[\s\S]*?\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
  }

  if (settings.account_number) {
    html = html.replace(/\{\{#if settings\.account_number\}\}([\s\S]*?)\{\{else\}\}[\s\S]*?\{\{\/if\}\}/g, '$1')
      .replace(/\{\{settings\.account_number\}\}/g, settings.account_number);
  } else {
    html = html.replace(/\{\{#if settings\.account_number\}\}[\s\S]*?\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
  }

  if (settings.ifsc_code) {
    html = html.replace(/\{\{#if settings\.ifsc_code\}\}([\s\S]*?)\{\{else\}\}[\s\S]*?\{\{\/if\}\}/g, '$1')
      .replace(/\{\{settings\.ifsc_code\}\}/g, settings.ifsc_code);
  } else {
    html = html.replace(/\{\{#if settings\.ifsc_code\}\}[\s\S]*?\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
  }

  if (settings.branch_name) {
    html = html.replace(/\{\{#if settings\.branch_name\}\}([\s\S]*?)\{\{else\}\}[\s\S]*?\{\{\/if\}\}/g, '$1')
      .replace(/\{\{settings\.branch_name\}\}/g, settings.branch_name);
  } else {
    html = html.replace(/\{\{#if settings\.branch_name\}\}[\s\S]*?\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
  }

  html = html.replace(/\{\{quotation\.id\}\}/g, quotation.id || '');
  html = html.replace(/\{\{formatDate quotation\.created_at\}\}/g, formatDate(quotation.created_at));
  
  if (quotation.valid_until) {
    html = html.replace(/\{\{#if quotation\.valid_until\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1')
      .replace(/\{\{formatDate quotation\.valid_until\}\}/g, formatDate(quotation.valid_until));
  } else {
    html = html.replace(/\{\{#if quotation\.valid_until\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  html = html.replace(/\{\{client\.name\}\}/g, client.name || '');
  html = html.replace(/\{\{client\.phone\}\}/g, client.phone || '');

  if (client.email) {
    html = html.replace(/\{\{#if client\.email\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1')
      .replace(/\{\{client\.email\}\}/g, client.email);
  } else {
    html = html.replace(/\{\{#if client\.email\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  if (client.address) {
    html = html.replace(/\{\{#if client\.address\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1')
      .replace(/\{\{client\.address\}\}/g, client.address);
  } else {
    html = html.replace(/\{\{#if client\.address\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  if (client.gstin) {
    html = html.replace(/\{\{#if client\.gstin\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1')
      .replace(/\{\{client\.gstin\}\}/g, client.gstin);
  } else {
    html = html.replace(/\{\{#if client\.gstin\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  if (quotation.build_name) {
    html = html.replace(/\{\{#if quotation\.build_name\}\}(.*?)\{\{else\}\}.*?\{\{\/if\}\}/g, '$1')
      .replace(/\{\{quotation\.build_name\}\}/g, quotation.build_name);
  } else {
    html = html.replace(/\{\{#if quotation\.build_name\}\}.*?\{\{else\}\}(.*?)\{\{\/if\}\}/g, '$1');
  }

  html = html.replace(/\{\{quotation\.status\}\}/g, quotation.status || 'draft');
  html = html.replace(/\{\{items\.length\}\}/g, totals.items.length);

  // Render items grouped by category
  let categoriesRowsHtml = '';
  for (const cat of categoriesWithItems) {
    categoriesRowsHtml += `
      <tr class="category-row">
        <td colspan="6">${cat.category_name}</td>
      </tr>
    `;
    for (const item of cat.items) {
      const snapshot = item.product_snapshot;
      let specsHtml = '';
      if (Array.isArray(snapshot.specs)) {
        for (const specObj of snapshot.specs) {
          for (const [k, v] of Object.entries(specObj)) {
            specsHtml += `<span class="spec-tag">${k}: ${v}</span> `;
          }
        }
      }

      const rawW = snapshot.warranty || item.warranty || '';
      let wStr = '';
      if (rawW) {
        const s = String(rawW).trim();
        if (/warranty/i.test(s)) wStr = s;
        else if (/year|yr|month|mo/i.test(s)) wStr = `${s} Warranty`;
        else {
          const n = parseInt(s, 10);
          wStr = !isNaN(n) ? `${n} ${n === 1 ? 'Year' : 'Years'} Warranty` : `${s} Warranty`;
        }
      }

      categoriesRowsHtml += `
        <tr>
          <td><strong>${snapshot.brand || ''}</strong> ${snapshot.model_name || ''}${wStr ? ` (${wStr})` : ''}</td>
          <td>${specsHtml}</td>
          <td class="text-center">${item.calculated.quantity}</td>
          <td class="text-right">₹${formatMoney(item.calculated.line_base)}</td>
          <td class="text-center">${item.calculated.gst_percent}%</td>
          <td class="text-right">₹${formatMoney(item.calculated.line_total)}</td>
        </tr>
      `;
    }
  }

  html = html.replace(/\{\{#each categoriesWithItems\}\}[\s\S]*?\{\{\/each\}\}/, categoriesRowsHtml);

  // Notes
  if (quotation.notes) {
    html = html.replace(/\{\{#if quotation\.notes\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1')
      .replace(/\{\{quotation\.notes\}\}/g, quotation.notes);
  } else {
    html = html.replace(/\{\{#if quotation\.notes\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  // GST Breakdown
  let gstBreakdownRows = '';
  for (const row of totals.gst_breakdown) {
    gstBreakdownRows += `
      <tr>
        <td style="padding: 2px 0;">GST @ ${row.rate}%</td>
        <td style="padding: 2px 0;" class="text-right">₹${formatMoney(row.taxable_amount)}</td>
        <td style="padding: 2px 0;" class="text-right">₹${formatMoney(row.gst_amount)}</td>
      </tr>
    `;
  }
  html = html.replace(/\{\{#each totals\.gst_breakdown\}\}[\s\S]*?\{\{\/each\}\}/, gstBreakdownRows);

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

// Totals
  const unroundedTotal = Math.max(0, (totals.subtotal || 0) - (totals.discount || 0) + (totals.total_gst || 0) + (totals.labour_charge || 0));
  const roundedGrandTotal = Math.round(unroundedTotal / 50) * 50;
  const roundOff = Math.round(roundedGrandTotal - unroundedTotal);
  totals.grand_total = roundedGrandTotal;
  const roundOffStr = (roundOff >= 0 ? '+' : '') + roundOff.toLocaleString('en-IN');

  const cgst = (totals.total_gst || 0) / 2;
  const sgst = (totals.total_gst || 0) / 2;
  const grandTotalWords = numberToIndianWords(totals.grand_total);

  html = html.replace(/\{\{totals\.round_off_str\}\}/g, roundOffStr);
  html = html.replace(/\{\{formatMoney totals\.subtotal\}\}/g, formatMoney(totals.subtotal));
  html = html.replace(/\{\{formatMoney totals\.total_gst\}\}/g, formatMoney(totals.total_gst));
  html = html.replace(/\{\{formatMoney totals\.cgst\}\}/g, formatMoney(cgst));
  html = html.replace(/\{\{formatMoney totals\.sgst\}\}/g, formatMoney(sgst));
  html = html.replace(/\{\{totals\.grand_total_words\}\}/g, grandTotalWords);

  if (totals.discount > 0) {
    html = html.replace(/\{\{#if totals\.discount\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1')
      .replace(/\{\{formatMoney totals\.discount\}\}/g, formatMoney(totals.discount));
  } else {
    html = html.replace(/\{\{#if totals\.discount\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  if (totals.labour_charge > 0) {
    html = html.replace(/\{\{#if totals\.labour_charge\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1')
      .replace(/\{\{formatMoney totals\.labour_charge\}\}/g, formatMoney(totals.labour_charge));
  } else {
    html = html.replace(/\{\{#if totals\.labour_charge\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  html = html.replace(/\{\{formatMoney totals\.grand_total\}\}/g, formatMoney(totals.grand_total));


  return html;
}

export async function generateQuotationPdf(data) {
  const templatePath = path.join(__dirname, '../templates/quotation.html');
  const templateHtml = fs.readFileSync(templatePath, 'utf8');

  const renderedHtml = renderTemplate(templateHtml, data);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(renderedHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}
