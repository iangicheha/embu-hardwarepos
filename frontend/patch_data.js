const data = require('./extracted_products.json');
const fs = require('fs');

const SUPPLIER_META = {
  'Electrical Items': { id: 's6', name: 'ElectroMart Kenya', contact: 'John Mwangi', phone: '+254 711 600 100', email: 'sales@electromart.co.ke', address: 'Industrial Area, Nairobi' },
  'Garden Tools': { id: 's7', name: 'AgriTools Suppliers', contact: 'Mary Akinyi', phone: '+254 722 700 200', email: 'orders@agritools.co.ke', address: 'Kitengela, Kajiado' },
  'Painting Tools & Materials': { id: 's8', name: 'ColorHub Distributors', contact: 'Peter Njoroge', phone: '+254 733 800 300', email: 'info@colorhub.co.ke', address: 'Mombasa Road, Nairobi' },
  'Bathroom & Toiletry': { id: 's9', name: 'AquaPro Sanitary Supplies', contact: 'Susan Wambui', phone: '+254 700 900 400', email: 'sales@aquapro.co.ke', address: 'Westlands, Nairobi' },
  'General Hardware': { id: 's10', name: 'BuildMart Hardware', contact: 'Daniel Otieno', phone: '+254 720 100 500', email: 'info@buildmart.co.ke', address: 'Kenyatta Avenue, Nairobi' },
  'Hand Tools & Measuring': { id: 's11', name: 'Precision Tools Ltd', contact: 'Joyce Chebet', phone: '+254 711 200 600', email: 'sales@precisiontools.co.ke', address: 'Parklands, Nairobi' },
  'Window & Lock Fittings': { id: 's12', name: 'SecureLock Fittings', contact: 'Brian Kiprop', phone: '+254 722 300 700', email: 'orders@securelock.co.ke', address: 'Thika Road, Ruiru' },
  'Screws & Fasteners': { id: 's13', name: 'FastRight Hardware', contact: 'Esther Nyambura', phone: '+254 733 400 800', email: 'sales@fastright.co.ke', address: 'Eastleigh, Nairobi' },
  'Ropes': { id: 's14', name: 'Rope & Cord Wholesalers', contact: 'Kevin Mutiso', phone: '+254 700 500 900', email: 'info@ropecord.co.ke', address: 'Gikomba, Nairobi' },
  'Plumbing & Piping': { id: 's15', name: 'PipeWorks Kenya', contact: 'Linet Achieng', phone: '+254 720 600 100', email: 'sales@pipeworks.co.ke', address: 'Kasarani, Nairobi' },
  'Masonry & Hand Tools': { id: 's16', name: 'MasonPro Supplies', contact: 'Anthony Karanja', phone: '+254 711 700 200', email: 'orders@masonpro.co.ke', address: 'Ngong Road, Nairobi' },
  'Fasteners & Fixings': { id: 's17', name: 'FixIt Fasteners', contact: 'Caroline Wairimu', phone: '+254 722 800 300', email: 'info@fixit.co.ke', address: 'Mombasa Road, Athi River' },
  'Adhesives & Sealants': { id: 's18', name: 'SealRight Chemicals', contact: 'George Maina', phone: '+254 733 900 400', email: 'sales@sealright.co.ke', address: 'Industrial Area, Nairobi' },
  'Household Fittings': { id: 's19', name: 'HomeFix Distributors', contact: 'Faith Wangari', phone: '+254 700 100 500', email: 'orders@homefix.co.ke', address: 'Yaya Centre, Nairobi' },
  'Building Materials & Chemicals': { id: 's20', name: 'BuildChem Supplies', contact: 'Stephen Ouma', phone: '+254 720 200 600', email: 'sales@buildchem.co.ke', address: 'Mlolongo, Machakos' },
  'Brackets & Hinges': { id: 's21', name: 'HingeRight Hardware', contact: 'Rebecca Atieno', phone: '+254 711 300 700', email: 'info@hingeright.co.ke', address: 'Kirinyaga Road, Nairobi' },
  'Motorcycle & Bicycle Parts': { id: 's22', name: 'AutoBike Parts Kenya', contact: 'Joseph Wekesa', phone: '+254 722 400 800', email: 'sales@autobike.co.ke', address: 'Likoni Road, Nairobi' },
  'Safety Equipment': { id: 's23', name: 'SafeGuard PPE', contact: 'Margaret Naliaka', phone: '+254 733 500 900', email: 'orders@safeguard.co.ke', address: 'Enterprise Road, Nairobi' },
};

const DEFAULT_REORDER_LEVEL = 5;
const ESTIMATED_MARGIN = 0.25;
const existingNames = new Set();

// Build new suppliers block
let newSuppliers = '  // ---- Suppliers for products imported from electrical_items.xlsx ----\n';
for (const sheetName of Object.keys(data)) {
  const meta = SUPPLIER_META[sheetName];
  const info = data[sheetName];
  if (!meta) continue;
  newSuppliers += '  {\n';
  newSuppliers += '    id: "' + meta.id + '",\n';
  newSuppliers += '    name: ' + JSON.stringify(meta.name) + ',\n';
  newSuppliers += '    contactPerson: ' + JSON.stringify(meta.contact) + ',\n';
  newSuppliers += '    phone: ' + JSON.stringify(meta.phone) + ',\n';
  newSuppliers += '    email: ' + JSON.stringify(meta.email) + ',\n';
  newSuppliers += '    address: ' + JSON.stringify(meta.address) + ',\n';
  newSuppliers += '    productCount: ' + info.productCount + ',\n';
  newSuppliers += '    totalPurchases: ' + info.totalPurchases + ',\n';
  newSuppliers += '  },\n';
}

// Build new products block
let newProducts = '  // ---- Products imported from electrical_items.xlsx ----\n';
newProducts += '  // Each row in the workbook becomes a product entry. `buyingPrice` is\n';
newProducts += '  // ESTIMATED at 75% of the selling price (the sheet only has selling\n';
newProducts += '  // prices) - go back and correct it per product once you know your\n';
newProducts += '  // real supplier cost. Codes use the same prefix scheme as\n';
newProducts += '  // seed-products.ts.\n';
const codeCounters = {};
let idCounter = 0;
for (const sheetName of Object.keys(data)) {
  const meta = SUPPLIER_META[sheetName];
  const info = data[sheetName];
  if (!meta) continue;
  for (const item of info.items) {
    if (existingNames.has(item.name)) continue;
    existingNames.add(item.name);
    idCounter++;

    codeCounters[info.prefix] = (codeCounters[info.prefix] || 0) + 1;
    const code = info.prefix + '-' + String(codeCounters[info.prefix]).padStart(4, '0');
    const buyingPrice = item.unitPrice > 0 ? Math.round(item.unitPrice * (1 - ESTIMATED_MARGIN)) : 0;
    const status = item.quantity <= 0 ? '"Out of Stock"' : (item.quantity <= DEFAULT_REORDER_LEVEL ? '"Low Stock"' : '"In Stock"');

    newProducts += '  {\n';
    newProducts += '    id: "i' + String(idCounter).padStart(4, '0') + '",\n';
    newProducts += '    name: ' + JSON.stringify(item.name) + ',\n';
    newProducts += '    code: "' + code + '",\n';
    newProducts += '    category: ' + JSON.stringify(sheetName) + ',\n';
    newProducts += '    description: "",\n';
    newProducts += '    supplierId: "' + meta.id + '",\n';
    newProducts += '    supplierName: ' + JSON.stringify(meta.name) + ',\n';
    newProducts += '    buyingPrice: ' + buyingPrice + ',\n';
    newProducts += '    sellingPrice: ' + item.unitPrice + ',\n';
    newProducts += '    stock: ' + item.quantity + ',\n';
    newProducts += '    reorderLevel: ' + DEFAULT_REORDER_LEVEL + ',\n';
    newProducts += '    status: ' + status + ',\n';
    newProducts += '    image: "",\n';
    newProducts += '  },\n';
}

// Now splice into lib/data.ts
const dataPath = './lib/data.ts';
let src = fs.readFileSync(dataPath, 'utf8');

// 1) Insert new suppliers before the closing ]; of the suppliers array.
const supplierMarker = '    productCount: 18,\n    totalPurchases: 760000,\n  },\n];\n\nexport const products';
if (!src.includes(supplierMarker)) throw new Error('supplier marker not found');
src = src.replace(supplierMarker, '    productCount: 18,\n    totalPurchases: 760000,\n  },\n' + newSuppliers + '];\n\nexport const products');

// 2) Append new products before the closing ]; of the products array.
const productMarker = '    image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=200&h=200&fit=crop",\n  },\n];\n\nexport const orders';
if (!src.includes(productMarker)) throw new Error('product marker not found');
src = src.replace(productMarker, '    image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=200&h=200&fit=crop",\n  },\n' + newProducts + '];\n\nexport const orders');

fs.writeFileSync(dataPath, src);
console.log('lib/data.ts updated. New products added:', existingNames.size);
