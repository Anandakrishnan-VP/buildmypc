import { getDb } from './database.js';
import { calculateProductPrice } from '../services/pricing.js';

export async function seedDatabase() {
  const db = await getDb();

  console.log('Seeding categories...');
  const categories = [
    { id: 'cpu', name: 'CPU', prefix: 'CPU', sort_order: 1 },
    { id: 'motherboard', name: 'Motherboard', prefix: 'MB', sort_order: 2 },
    { id: 'ram', name: 'RAM', prefix: 'RAM', sort_order: 3 },
    { id: 'gpu', name: 'GPU (Graphics Card)', prefix: 'GPU', sort_order: 4 },
    { id: 'storage-ssd', name: 'Storage - SSD', prefix: 'SSD', sort_order: 5 },
    { id: 'storage-hdd', name: 'Storage - HDD', prefix: 'HDD', sort_order: 6 },
    { id: 'psu', name: 'PSU (Power Supply)', prefix: 'PSU', sort_order: 7 },
    { id: 'cabinet', name: 'Cabinet', prefix: 'CAB', sort_order: 8 },
    { id: 'cooler', name: 'CPU Cooler', prefix: 'CLR', sort_order: 9 },
    { id: 'monitor', name: 'Monitor', prefix: 'MON', sort_order: 10 },
    { id: 'keyboard', name: 'Keyboard', prefix: 'KB', sort_order: 11 },
    { id: 'mouse', name: 'Mouse', prefix: 'MS', sort_order: 12 },
    { id: 'mousepad', name: 'Mousepad', prefix: 'MP', sort_order: 13 },
    { id: 'headset', name: 'Headset/Speakers', prefix: 'AUD', sort_order: 14 },
    { id: 'os', name: 'OS/Software', prefix: 'SW', sort_order: 15 },
    { id: 'cables', name: 'Cables & Others', prefix: 'OTH', sort_order: 16 }
  ];

  const catStmt = await db.prepare(
    'INSERT OR REPLACE INTO categories (id, name, prefix, sort_order) VALUES (?, ?, ?, ?)'
  );
  for (const cat of categories) {
    await catStmt.run(cat.id, cat.name, cat.prefix, cat.sort_order);
  }
  await catStmt.finalize();

  console.log('Seeding products...');
  const rawProducts = [
    {
      id: 'CPU-0001',
      category_id: 'cpu',
      brand: 'Intel',
      model_name: 'Core i5-14600K',
      specs: [{ Cores: '14 (6P+8E)' }, { Socket: 'LGA1700' }, { 'Base Clock': '3.5GHz' }],
      base_price: 27500,
      gst_percent: 18,
      stock_qty: 10,
      warranty: '3 Years'
    },
    {
      id: 'CPU-0002',
      category_id: 'cpu',
      brand: 'AMD',
      model_name: 'Ryzen 7 7800X3D',
      specs: [{ Cores: '8' }, { Socket: 'AM5' }, { Cache: '96MB L3' }, { 'Base Clock': '4.2GHz' }],
      base_price: 36000,
      gst_percent: 18,
      stock_qty: 8,
      warranty: '3 Years'
    },
    {
      id: 'MB-0001',
      category_id: 'motherboard',
      brand: 'MSI',
      model_name: 'B650 Gaming Plus WiFi',
      specs: [{ Socket: 'AM5' }, { 'Form Factor': 'ATX' }, { Memory: 'DDR5 7200+' }],
      base_price: 16500,
      gst_percent: 18,
      stock_qty: 5,
      warranty: '3 Years'
    },
    {
      id: 'MB-0002',
      category_id: 'motherboard',
      brand: 'ASUS',
      model_name: 'ROG Strix Z790-F Gaming WiFi',
      specs: [{ Socket: 'LGA1700' }, { 'Form Factor': 'ATX' }, { Memory: 'DDR5' }],
      base_price: 34000,
      gst_percent: 18,
      stock_qty: 3,
      warranty: '3 Years'
    },
    {
      id: 'RAM-0001',
      category_id: 'ram',
      brand: 'Corsair',
      model_name: 'Vengeance 16GB DDR5 6000MHz',
      specs: [{ Capacity: '16GB' }, { Speed: '6000MHz' }, { Type: 'DDR5' }],
      base_price: 4200,
      gst_percent: 18,
      stock_qty: 20,
      warranty: 'Lifetime'
    },
    {
      id: 'RAM-0002',
      category_id: 'ram',
      brand: 'G.Skill',
      model_name: 'Trident Z5 RGB 32GB (2x16GB) DDR5 6000MHz',
      specs: [{ Capacity: '32GB (2x16GB)' }, { Speed: '6000MHz' }, { RGB: 'Yes' }],
      base_price: 11200,
      gst_percent: 18,
      stock_qty: 15,
      warranty: 'Lifetime'
    },
    {
      id: 'GPU-0001',
      category_id: 'gpu',
      brand: 'Nvidia',
      model_name: 'GeForce RTX 4070 Super 12GB',
      specs: [{ VRAM: '12GB GDDR6X' }, { Power: '220W' }, { Ports: '3x DP, 1x HDMI' }],
      base_price: 58000,
      gst_percent: 18,
      stock_qty: 6,
      warranty: '3 Years'
    },
    {
      id: 'GPU-0002',
      category_id: 'gpu',
      brand: 'ASUS',
      model_name: 'Dual GeForce RTX 4060 OC Edition 8GB',
      specs: [{ VRAM: '8GB GDDR6' }, { Power: '115W' }],
      base_price: 28500,
      gst_percent: 18,
      stock_qty: 9,
      warranty: '3 Years'
    },
    {
      id: 'SSD-0001',
      category_id: 'storage-ssd',
      brand: 'Samsung',
      model_name: '990 PRO 1TB PCIe 4.0 NVMe M.2 SSD',
      specs: [{ Capacity: '1TB' }, { Read: '7450 MB/s' }, { Interface: 'NVMe Gen4' }],
      base_price: 9500,
      gst_percent: 18,
      stock_qty: 12,
      warranty: '5 Years'
    },
    {
      id: 'PSU-0001',
      category_id: 'psu',
      brand: 'Corsair',
      model_name: 'RM750e 750W 80+ Gold Fully Modular',
      specs: [{ Wattage: '750W' }, { Efficiency: '80+ Gold' }, { Modular: 'Full' }],
      base_price: 8900,
      gst_percent: 18,
      stock_qty: 7,
      warranty: '7 Years'
    },
    {
      id: 'CAB-0001',
      category_id: 'cabinet',
      brand: 'NZXT',
      model_name: 'H5 Flow RGB Mid-Tower',
      specs: [{ SidePanel: 'Tempered Glass' }, { FansIncluded: '2x 140mm RGB' }],
      base_price: 7800,
      gst_percent: 18,
      stock_qty: 5,
      warranty: '2 Years'
    },
    {
      id: 'CLR-0001',
      category_id: 'cooler',
      brand: 'DeepCool',
      model_name: 'AK620 Digital CPU Air Cooler',
      specs: [{ Type: 'Dual Tower Air Cooler' }, { Display: 'Digital Temperature Screen' }],
      base_price: 6400,
      gst_percent: 18,
      stock_qty: 8,
      warranty: '3 Years'
    },
    {
      id: 'MON-0001',
      category_id: 'monitor',
      brand: 'LG',
      model_name: 'Ultragear 27" QHD 180Hz IPS Gaming Monitor',
      specs: [{ Resolution: '2560x1440' }, { RefreshRate: '180Hz' }, { Panel: 'IPS 1ms' }],
      base_price: 22500,
      gst_percent: 18,
      stock_qty: 4,
      warranty: '3 Years'
    },
    {
      id: 'KB-0001',
      category_id: 'keyboard',
      brand: 'Keychron',
      model_name: 'K2 Wireless Mechanical Keyboard',
      specs: [{ Layout: '75%' }, { Switches: 'Gateron G Pro Red' }, { Connectivity: 'Bluetooth/Type-C' }],
      base_price: 7200,
      gst_percent: 18,
      stock_qty: 6,
      warranty: '1 Year'
    },
    {
      id: 'MS-0001',
      category_id: 'mouse',
      brand: 'Logitech',
      model_name: 'G Pro X Superlight Wireless Gaming Mouse',
      specs: [{ Weight: '63g' }, { Sensor: 'HERO 25K' }, { Battery: '70 Hours' }],
      base_price: 10500,
      gst_percent: 18,
      stock_qty: 10,
      warranty: '2 Years'
    }
  ];

  const prodStmt = await db.prepare(
    `INSERT OR REPLACE INTO products 
    (id, category_id, brand, model_name, specs, base_price, gst_percent, price_after_gst, stock_qty, warranty, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  );

  for (const p of rawProducts) {
    const calc = calculateProductPrice(p.base_price, p.gst_percent);
    await prodStmt.run(
      p.id,
      p.category_id,
      p.brand,
      p.model_name,
      JSON.stringify(p.specs),
      calc.base_price,
      calc.gst_percent,
      calc.price_after_gst,
      p.stock_qty,
      p.warranty
    );
  }
  await prodStmt.finalize();

  console.log('Seeding clients...');
  const clients = [
    {
      id: 'CLI-0001',
      name: 'Ramesh Kumar',
      phone: '+91 98765 43210',
      email: 'ramesh.k@gmail.com',
      address: '14, 5th Cross, Koramangala, Bengaluru',
      gstin: '29AAACR1234A1Z1'
    },
    {
      id: 'CLI-0002',
      name: 'TechCorp Systems',
      phone: '+91 91234 56789',
      email: 'procurement@techcorp.in',
      address: 'Suite 402, Indiranagar 100ft Road, Bengaluru',
      gstin: '29BBBCT9876F2Z9'
    }
  ];

  const clientStmt = await db.prepare(
    'INSERT OR REPLACE INTO clients (id, name, phone, email, address, gstin) VALUES (?, ?, ?, ?, ?, ?)'
  );

  for (const c of clients) {
    await clientStmt.run(c.id, c.name, c.phone, c.email, c.address, c.gstin);
  }
  await clientStmt.finalize();

  console.log('Seeding shop settings...');
  await db.run(
    `INSERT OR REPLACE INTO shop_settings (id, name, logo_url, address, phone, email, gstin, default_gst_percent, terms_conditions, quotation_prefix)
     VALUES ('default', 'Zeus PC Custom Builds', NULL, '123 Tech Street, Electronic City, Bengaluru, Karnataka 560100', '+91 98765 43210', 'sales@zeuspc.in', '29ABCDE1234F1Z5', 18, '1. Quotation valid for 7 days from issue date.\n2. Prices inclusive of GST as indicated.\n3. Warranty as per manufacturer terms.', 'QTN')`
  );

  console.log('Database seeded successfully!');
}

if (process.argv[1].includes('seed.js')) {
  seedDatabase().catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}
