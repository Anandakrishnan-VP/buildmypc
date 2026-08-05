/**
 * Currency rounding helper (2 decimal places)
 */
export function roundCurrency(amount) {
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates product pricing with GST
 */
export function calculateProductPrice(basePrice, gstPercent = 18) {
  const base = roundCurrency(basePrice);
  const gstRate = Number(gstPercent) || 0;
  const gstAmount = roundCurrency(base * (gstRate / 100));
  const priceAfterGst = roundCurrency(base + gstAmount);

  return {
    base_price: base,
    gst_percent: gstRate,
    gst_amount: gstAmount,
    price_after_gst: priceAfterGst
  };
}

/**
 * Calculates totals for a quotation line item
 */
export function calculateLineItem(productSnapshot, quantity = 1) {
  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const basePrice = roundCurrency(productSnapshot.base_price || 0);
  const gstPercent = Number(productSnapshot.gst_percent) || 0;

  const lineBase = roundCurrency(basePrice * qty);
  const lineGst = roundCurrency(lineBase * (gstPercent / 100));
  const lineTotal = roundCurrency(lineBase + lineGst);

  return {
    quantity: qty,
    line_base: lineBase,
    line_gst: lineGst,
    line_total: lineTotal,
    gst_percent: gstPercent
  };
}

/**
 * Calculates quotation grand totals and tax rate breakdown
 */
export function calculateQuotationTotals(items = [], discount = 0, labourCharge = 0) {
  let subtotal = 0;
  let totalGst = 0;
  const gstGroupMap = {};

  const processedItems = items.map((item) => {
    const snapshot = typeof item.product_snapshot === 'string'
      ? JSON.parse(item.product_snapshot)
      : item.product_snapshot;

    const lineCalc = calculateLineItem(snapshot, item.quantity);
    subtotal = roundCurrency(subtotal + lineCalc.line_base);
    totalGst = roundCurrency(totalGst + lineCalc.line_gst);

    const rateKey = `${lineCalc.gst_percent}%`;
    if (!gstGroupMap[rateKey]) {
      gstGroupMap[rateKey] = {
        rate: lineCalc.gst_percent,
        taxable_amount: 0,
        gst_amount: 0
      };
    }
    gstGroupMap[rateKey].taxable_amount = roundCurrency(
      gstGroupMap[rateKey].taxable_amount + lineCalc.line_base
    );
    gstGroupMap[rateKey].gst_amount = roundCurrency(
      gstGroupMap[rateKey].gst_amount + lineCalc.line_gst
    );

    return {
      ...item,
      product_snapshot: snapshot,
      calculated: lineCalc
    };
  });

  const disc = roundCurrency(discount || 0);
  const labour = roundCurrency(labourCharge || 0);
  const grandTotal = roundCurrency(subtotal - disc + totalGst + labour);
  const gstBreakdown = Object.values(gstGroupMap).sort((a, b) => a.rate - b.rate);

  return {
    items: processedItems,
    subtotal,
    discount: disc,
    labour_charge: labour,
    total_gst: totalGst,
    gst_breakdown: gstBreakdown,
    grand_total: Math.max(0, grandTotal)
  };
}
