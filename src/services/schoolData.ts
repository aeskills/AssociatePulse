/**
 * Mock Excel/CSV download sheets for school student IDs.
 * Simulates generating and downloading credentials spreadsheets.
 */
export interface StudentRecord {
  rollNo: string;
  studentId: string;
  name: string;
  class: string;
  loginPin: string;
}

export function generateStudentIds(schoolId: string, _schoolName: string): StudentRecord[] {
  const students = [
    { name: "Pooja Gurjar", class: "VIII" },
    { name: "Mamta Kumari", class: "VIII" },
    { name: "Rina Yadav", class: "VIII" },
    { name: "Jyoti Meena", class: "VII" },
    { name: "Anu Choudhary", class: "VII" },
    { name: "Khushi Sharma", class: "VI" },
    { name: "Payal Kanwar", class: "VI" }
  ];
  
  return students.map((std, i) => {
    const num = i + 1;
    const cleanId = schoolId.replace("SCH-", "").toLowerCase();
    return {
      rollNo: String(num),
      studentId: `STU-${cleanId.toUpperCase()}-${100 + num}`,
      name: std.name,
      class: std.class,
      loginPin: String(Math.floor(1000 + Math.random() * 9000))
    };
  });
}

export function downloadStudentIdSheet(schoolId: string, schoolName: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Generate records
    const records = generateStudentIds(schoolId, schoolName);
    
    // Create CSV content
    const headers = ["Roll No", "Student ID", "Student Name", "Class", "Default Login PIN\n"].join(",");
    const rows = records.map(r => 
      [r.rollNo, r.studentId, `"${r.name}"`, r.class, r.loginPin].join(",")
    ).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
    const encodedUri = encodeURI(csvContent);
    
    // Trigger download
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const cleanName = schoolName.replace(/\s+/g, "_");
    link.setAttribute("download", `Student_Credentials_${cleanName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
      resolve(true);
    }, 600);
  });
}
