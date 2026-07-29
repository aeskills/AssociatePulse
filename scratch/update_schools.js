import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schoolsPath = path.join(__dirname, '../src/data/schools.json');
let schools = JSON.parse(fs.readFileSync(schoolsPath, 'utf8'));

// Filter out old khushi, sachin, filomina entries
schools = schools.filter(s => !s.id.startsWith('sch-dl-') && !s.id.startsWith('sch-ga-'));

// 1. Add 9 CM Shri Schools for Khushi (Delhi)
for (let i = 1; i <= 9; i++) {
  const numStr = String(i).padStart(3, '0');
  schools.push({
    id: `sch-dl-khushi-${numStr}`,
    stateId: 'delhi',
    name: `CM Shri School No. ${i}, Delhi`,
    schoolId: `SCH-DL-K${numStr}`,
    udiseCode: `0701010${String(i).padStart(4, '0')}`,
    district: 'Central Delhi',
    block: 'Central Block',
    village: 'New Delhi',
    address: 'Central Delhi, New Delhi',
    principalName: `Principal (CM Shri School ${i})`,
    principalContact: `98110022${String(10 + i)}`,
    totalStudents: 320 + i * 15,
    assignedTrainer: 't-khushi',
    schoolStatus: 'Active',
    latitude: 28.6315 + (i * 0.005),
    longitude: 77.2167 + (i * 0.005)
  });
}

// 2. Add 23 Schools for Sachin (Delhi)
for (let i = 1; i <= 23; i++) {
  const numStr = String(i).padStart(3, '0');
  schools.push({
    id: `sch-dl-sachin-${numStr}`,
    stateId: 'delhi',
    name: `Government Sarvodaya Secondary School No. ${i}, South Delhi`,
    schoolId: `SCH-DL-S${numStr}`,
    udiseCode: `0702020${String(i).padStart(4, '0')}`,
    district: 'South Delhi',
    block: 'South Block',
    village: 'South Delhi',
    address: 'South Delhi, New Delhi',
    principalName: `Principal (GSSS South Delhi ${i})`,
    principalContact: `98110033${String(10 + (i % 80))}`,
    totalStudents: 280 + i * 10,
    assignedTrainer: 't-sachin',
    schoolStatus: 'Active',
    latitude: 28.5245 + (i * 0.004),
    longitude: 77.2066 + (i * 0.004)
  });
}

// 3. Add 103 Schools for Filomina (Goa)
for (let i = 1; i <= 103; i++) {
  const numStr = String(i).padStart(3, '0');
  schools.push({
    id: `sch-ga-filomina-${numStr}`,
    stateId: 'goa',
    name: `Government High School No. ${i}, North Goa`,
    schoolId: `SCH-GA-F${numStr}`,
    udiseCode: `3001010${String(i).padStart(4, '0')}`,
    district: 'North Goa',
    block: i % 2 === 0 ? 'Tiswadi' : 'Bardez',
    village: i % 2 === 0 ? 'Panaji' : 'Mapusa',
    address: 'North Goa, Goa',
    principalName: `Principal (GHS Goa ${i})`,
    principalContact: `98220044${String(10 + (i % 80))}`,
    totalStudents: 200 + i * 5,
    assignedTrainer: 't-filomina',
    schoolStatus: 'Active',
    latitude: 15.4909 + (i * 0.003),
    longitude: 73.8278 + (i * 0.003)
  });
}

fs.writeFileSync(schoolsPath, JSON.stringify(schools, null, 2));
console.log(`Successfully updated schools.json! Total schools count: ${schools.length}`);
