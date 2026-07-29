import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const delhiPath = path.join(__dirname, '../public/Delhi.xlsx');
const goaPath = path.join(__dirname, '../public/Goa.xlsx');

const delhiWb = XLSX.read(fs.readFileSync(delhiPath), { type: 'buffer' });
const goaWb = XLSX.read(fs.readFileSync(goaPath), { type: 'buffer' });

// 1. KHUSHI (Delhi) - Sheet "Khushi"
const khushiRows = XLSX.utils.sheet_to_json(delhiWb.Sheets['Khushi'], { defval: '' });
console.log(` Khushi: ${khushiRows.length} schools`);
const khushiSchools = khushiRows.map((r, idx) => {
  const name = String(r['School Name'] || '').trim();
  const udise = String(r['UDISE'] || '').trim();
  const numStr = String(idx + 1).padStart(3, '0');
  return {
    id: `sch-dl-khushi-${numStr}`,
    stateId: 'delhi',
    name,
    schoolId: `SCH-DL-K${numStr}`,
    udiseCode: udise || `0701010${numStr}`,
    district: 'Central Delhi',
    block: 'Central Block',
    village: 'New Delhi',
    address: 'Central Delhi, New Delhi',
    principalName: `Principal (${name})`,
    principalContact: `98110${String(1000 + idx)}`,
    totalStudents: 350 + idx * 10,
    assignedTrainer: 't-khushi',
    schoolStatus: 'Active',
    latitude: 28.6315 + (idx * 0.002),
    longitude: 77.2167 + (idx * 0.002)
  };
});

// 2. SACHIN (Delhi) - Sheet "Sachin"
const sachinRows = XLSX.utils.sheet_to_json(delhiWb.Sheets['Sachin'], { defval: '' });
console.log(` Sachin: ${sachinRows.length} schools`);
const sachinSchools = sachinRows.map((r, idx) => {
  const name = String(r['School Name'] || '').trim();
  const udise = String(r['UDISE'] || '').trim();
  const numStr = String(idx + 1).padStart(3, '0');
  return {
    id: `sch-dl-sachin-${numStr}`,
    stateId: 'delhi',
    name,
    schoolId: `SCH-DL-S${numStr}`,
    udiseCode: udise || `0702020${numStr}`,
    district: 'South Delhi',
    block: 'South Block',
    village: 'South Delhi',
    address: 'South Delhi, New Delhi',
    principalName: `Principal (${name})`,
    principalContact: `98110${String(2000 + idx)}`,
    totalStudents: 300 + idx * 10,
    assignedTrainer: 't-sachin',
    schoolStatus: 'Active',
    latitude: 28.5245 + (idx * 0.002),
    longitude: 77.2066 + (idx * 0.002)
  };
});

// 3. FILOMINA (Goa) - Sheet "Filomina"
const filominaRows = XLSX.utils.sheet_to_json(goaWb.Sheets['Filomina'], { defval: '' });
console.log(` Filomina: ${filominaRows.length} schools`);
const filominaSchools = filominaRows.map((r, idx) => {
  const name = String(r['School Name'] || '').trim();
  const city = String(r['City'] || '').trim();
  const numStr = String(idx + 1).padStart(3, '0');
  return {
    id: `sch-ga-filomina-${numStr}`,
    stateId: 'goa',
    name,
    schoolId: `SCH-GA-F${numStr}`,
    udiseCode: `300101${String(idx + 1).padStart(5, '0')}`,
    district: city.includes('South') ? 'South Goa' : 'North Goa',
    block: city || 'Tiswadi',
    village: city || 'Panaji',
    address: `${city || 'Goa'}, Goa`,
    principalName: `Principal (${name})`,
    principalContact: `98220${String(1000 + idx)}`,
    totalStudents: 220 + idx * 5,
    assignedTrainer: 't-filomina',
    schoolStatus: 'Active',
    latitude: 15.4909 + (idx * 0.001),
    longitude: 73.8278 + (idx * 0.001)
  };
});

// Load existing schools.json
const schoolsPath = path.join(__dirname, '../src/data/schools.json');
let schools = JSON.parse(fs.readFileSync(schoolsPath, 'utf8'));

// Filter out old Delhi & Goa dummy generated entries
schools = schools.filter(s => !s.id.startsWith('sch-dl-') && !s.id.startsWith('sch-ga-'));

// Push exact parsed schools from Excel sheets!
schools.push(...khushiSchools, ...sachinSchools, ...filominaSchools);

fs.writeFileSync(schoolsPath, JSON.stringify(schools, null, 2));
console.log(`\nUpdated schools.json! Total schools count: ${schools.length}`);

// Load existing trainers.json and update assignedSchools arrays with exact IDs
const trainersPath = path.join(__dirname, '../src/data/trainers.json');
let trainers = JSON.parse(fs.readFileSync(trainersPath, 'utf8'));

trainers = trainers.map((t) => {
  if (t.id === 't-khushi') {
    return { ...t, assignedSchools: khushiSchools.map(s => s.id) };
  }
  if (t.id === 't-sachin') {
    return { ...t, assignedSchools: sachinSchools.map(s => s.id) };
  }
  if (t.id === 't-filomina') {
    return { ...t, assignedSchools: filominaSchools.map(s => s.id) };
  }
  return t;
});

fs.writeFileSync(trainersPath, JSON.stringify(trainers, null, 2));
console.log(`Updated trainers.json! Khushi=${khushiSchools.length}, Sachin=${sachinSchools.length}, Filomina=${filominaSchools.length}`);
