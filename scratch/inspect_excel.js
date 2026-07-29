import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const delhiPath = path.join(__dirname, '../public/Delhi.xlsx');
const goaPath = path.join(__dirname, '../public/Goa.xlsx');

console.log('--- DELHI EXCEL INSPECTION ---');
const delhiBuf = fs.readFileSync(delhiPath);
const delhiWb = XLSX.read(delhiBuf, { type: 'buffer' });
console.log('Delhi Sheet Names:', delhiWb.SheetNames);

delhiWb.SheetNames.forEach((sheetName) => {
  const sheet = delhiWb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`\nSheet "${sheetName}" has ${rows.length} rows.`);
  if (rows.length > 0) {
    console.log('Sample Keys:', Object.keys(rows[0]));
    console.log('Sample Row 1:', rows[0]);
    console.log('Sample Row 2:', rows[1]);
  }
});

console.log('\n--- GOA EXCEL INSPECTION ---');
const goaBuf = fs.readFileSync(goaPath);
const goaWb = XLSX.read(goaBuf, { type: 'buffer' });
console.log('Goa Sheet Names:', goaWb.SheetNames);

goaWb.SheetNames.forEach((sheetName) => {
  const sheet = goaWb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`\nSheet "${sheetName}" has ${rows.length} rows.`);
  if (rows.length > 0) {
    console.log('Sample Keys:', Object.keys(rows[0]));
    console.log('Sample Row 1:', rows[0]);
    console.log('Sample Row 2:', rows[1]);
  }
});
