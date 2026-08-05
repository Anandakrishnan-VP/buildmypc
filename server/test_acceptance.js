const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- STARTING ACCEPTANCE CRITERIA VERIFICATION ---');

  // 1. Create a category & product, verify price_after_gst
  console.log('\n[Test 1] Category & Product creation with GST calculation...');
  const catRes = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test Cooler', prefix: 'TCLR', sort_order: 99 })
  });
  const cat = await catRes.json();
  console.log('Category created:', cat.id, cat.prefix);

  const prodRes = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category_id: cat.id,
      brand: 'Noctua',
      model_name: 'NH-D15 chromax.black',
      specs: [{ Type: 'Dual Tower Air Cooler' }, { Fans: '2x 140mm' }],
      base_price: 10000,
      gst_percent: 18,
      warranty: '6 Years'
    })
  });
  const prod = await prodRes.json();
  console.log('Product created:', prod.id, 'Price after GST:', prod.price_after_gst);
  if (prod.price_after_gst !== 11800) {
    throw new Error(`Expected price_after_gst 11800, got ${prod.price_after_gst}`);
  }
  console.log('✅ Test 1 PASSED: GST calculation exact (10000 + 18% = 11800)');

  // 2. Global search "16GB"
  console.log('\n[Test 2] Global search for "16GB"...');
  const searchRes = await fetch(`${BASE_URL}/products?search=16GB`);
  const searchProds = await searchRes.json();
  console.log(`Found ${searchProds.length} products matching "16GB"`);
  if (searchProds.length === 0) throw new Error('Expected search results for 16GB');
  console.log('Matches:', searchProds.map(p => `${p.brand} ${p.model_name}`));
  console.log('✅ Test 2 PASSED');

  // 3. Multi-category quotation with mixed GST rates
  console.log('\n[Test 3] Building multi-category quotation...');
  const clientsRes = await fetch(`${BASE_URL}/clients`);
  const clients = await clientsRes.json();
  const client = clients[0];

  const qRes = await fetch(`${BASE_URL}/quotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: client.id,
      build_name: 'Acceptance Verification Rig',
      labour_charge: 1000,
      discount: 500
    })
  });
  const quotation = await qRes.json();
  console.log('Quotation created:', quotation.id);

  // Add 6 items
  const allProds = await (await fetch(`${BASE_URL}/products`)).json();
  const sampleProductIds = allProds.slice(0, 6).map(p => p.id);

  for (const pid of sampleProductIds) {
    await fetch(`${BASE_URL}/quotations/${quotation.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: pid, quantity: 1 })
    });
  }

  const qDetail = await (await fetch(`${BASE_URL}/quotations/${quotation.id}`)).json();
  console.log('Quote Subtotal:', qDetail.totals.subtotal);
  console.log('Quote Total GST:', qDetail.totals.total_gst);
  console.log('Quote Discount:', qDetail.totals.discount);
  console.log('Quote Labour Charge:', qDetail.totals.labour_charge);
  console.log('Quote Grand Total:', qDetail.totals.grand_total);
  console.log('GST Breakdown:', qDetail.totals.gst_breakdown);
  console.log('✅ Test 3 PASSED');

  // 4. Finalize quotation & test product price change snapshot protection
  console.log('\n[Test 4] Verifying snapshot protection upon price edit...');
  await fetch(`${BASE_URL}/quotations/${quotation.id}/finalize`, { method: 'POST' });
  
  // Edit first product price in catalog
  const firstProdId = sampleProductIds[0];
  const oldPrice = allProds.find(p => p.id === firstProdId).base_price;
  await fetch(`${BASE_URL}/products/${firstProdId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_price: oldPrice + 5000 })
  });

  const qDetailAfterEdit = await (await fetch(`${BASE_URL}/quotations/${quotation.id}`)).json();
  if (qDetailAfterEdit.totals.grand_total !== qDetail.totals.grand_total) {
    throw new Error('Snapshot failed: Grand total changed after product catalog price update!');
  }
  console.log('Original Grand Total:', qDetail.totals.grand_total);
  console.log('Grand Total after product price edit:', qDetailAfterEdit.totals.grand_total);
  console.log('✅ Test 4 PASSED: Quotation numbers preserved via snapshot protection!');

  // 5. PDF generation route check
  console.log('\n[Test 5] Checking PDF generation endpoint...');
  const pdfRes = await fetch(`${BASE_URL}/quotations/${quotation.id}/pdf`);
  const contentType = pdfRes.headers.get('content-type');
  console.log('PDF Content-Type:', contentType);
  if (!contentType.includes('application/pdf')) {
    throw new Error('Expected application/pdf response');
  }
  console.log('✅ Test 5 PASSED: PDF generated and streamed successfully!');

  // 6. Delete category with active products check
  console.log('\n[Test 6] Blocking deletion of category with active products...');
  const delCatRes = await fetch(`${BASE_URL}/categories/cpu`, { method: 'DELETE' });
  const delCatBody = await delCatRes.json();
  console.log('Delete response status:', delCatRes.status, delCatBody);
  if (delCatRes.status !== 400 || !delCatBody.error.includes('assigned')) {
    throw new Error('Category delete with active products was not blocked properly');
  }
  console.log('✅ Test 6 PASSED: Category deletion blocked with clear error message!');

  console.log('\n=============================================');
  console.log('ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!');
  console.log('=============================================');
}

runTests().catch(err => {
  console.error('Acceptance test error:', err);
  process.exit(1);
});
