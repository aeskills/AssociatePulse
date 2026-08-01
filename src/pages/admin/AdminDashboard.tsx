import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Search,
  School,
  MapPin,
  ExternalLink,
  Edit,
  Trash2,
  X,
  LogOut,
  Building2,
  CalendarCheck,
  Lock,
  ShieldAlert,
  KeyRound,
  ArrowRight,
  Plus,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import useAppStore, { type TrainerData } from '../../store/useAppStore';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { deleteTrainerSheet } from '../../services/googleSheets';
import { getInitials, getDeterministicGradient, formatDate, getToday } from '../../lib/utils';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const login = useAppStore((s) => s.login);
  const logout = useAppStore((s) => s.logout);
  const states = useAppStore((s) => s.states);
  const trainers = useAppStore((s) => s.trainers);
  const schools = useAppStore((s) => s.schools);
  const addTrainer = useAppStore((s) => s.addTrainer);
  const updateTrainer = useAppStore((s) => s.updateTrainer);
  const deleteTrainer = useAppStore((s) => s.deleteTrainer);
  const getTodayAttendance = useAppStore((s) => s.getTodayAttendance);
  const getSchoolsByTrainer = useAppStore((s) => s.getSchoolsByTrainer);
  const appendSchoolsToTrainer = useAppStore((s) => s.appendSchoolsToTrainer);
  const addToast = useAppStore((s) => s.addToast);

  // Authentication State for /admin route
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('admin_authenticated') === 'true' || sessionStorage.getItem('admin_authenticated') === 'true';
  });
  const [adminPassInput, setAdminPassInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Dashboard Filters State
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<TrainerData | null>(null);
  const [deletingTrainer, setDeletingTrainer] = useState<TrainerData | null>(null);

  // Upload Schools Sheet Modal State (for existing trainer)
  const [uploadSchoolsTrainer, setUploadSchoolsTrainer] = useState<TrainerData | null>(null);
  const [sheetFileName, setSheetFileName] = useState('');
  const [parsedSchoolsList, setParsedSchoolsList] = useState<any[]>([]);
  const [sheetError, setSheetError] = useState('');
  const sheetInputRef = useRef<HTMLInputElement>(null);

  // New Trainer Form State (With state selection & optional school sheet upload)
  const [newTrainerName, setNewTrainerName] = useState('');
  const [newEmpId, setNewEmpId] = useState('');
  const [newTrainerState, setNewTrainerState] = useState('up');
  const [customStateName, setCustomStateName] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newTrainerSchoolsList, setNewTrainerSchoolsList] = useState<any[]>([]);
  const [newTrainerFileName, setNewTrainerFileName] = useState('');
  const [newTrainerFileError, setNewTrainerFileError] = useState('');
  const newTrainerInputRef = useRef<HTMLInputElement>(null);

  // Dynamic States List combining defaults, store states, and trainers' states
  const allStatesList = useMemo(() => {
    const map = new Map<string, string>();
    map.set('up', 'Uttar Pradesh');
    map.set('delhi', 'Delhi');
    map.set('goa', 'Goa');

    states.forEach((s) => {
      if (s.id && s.name) map.set(s.id, s.name);
    });

    trainers.forEach((t) => {
      if (t.stateId && !map.has(t.stateId)) {
        map.set(t.stateId, t.stateId.toUpperCase());
      }
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [states, trainers]);

  // Edit Trainer Form State
  const [editName, setEditName] = useState('');
  const [editEmpId, setEditEmpId] = useState('');
  const [editDistrict, setEditDistrict] = useState('');

  // Sheet File Select Handler (XLSX / CSV)
  const handleSheetFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSheetError('');
    if (!file) return;

    setSheetFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonRows.length === 0) {
        setSheetError('Uploaded sheet is empty. Please upload a sheet containing school rows.');
        setParsedSchoolsList([]);
        return;
      }

      // Map rows to School objects
      const parsed = jsonRows.map((row) => {
        const name = row['School Name'] || row['school_name'] || row['Name'] || row['School'] || Object.values(row)[0] || '';
        const udiseCode = String(row['UDISE Code'] || row['UDISE'] || row['udise_code'] || row['udise'] || 'N/A');
        const district = row['District'] || row['district'] || uploadSchoolsTrainer?.district || 'Kanpur Dehat';
        const block = row['Block'] || row['block'] || 'Block A';
        const address = row['Address'] || row['address'] || `${district}, Uttar Pradesh`;
        const principalName = row['Principal Name'] || row['principal_name'] || '';
        const principalContact = String(row['Principal Contact'] || row['principal_contact'] || '');
        const totalStudents = Number(row['Total Students'] || row['total_students'] || row['Students']) || 100;

        return {
          name: String(name).trim(),
          udiseCode: udiseCode.trim(),
          district: String(district).trim(),
          block: String(block).trim(),
          address: String(address).trim(),
          principalName: String(principalName).trim(),
          principalContact: principalContact.trim(),
          totalStudents
        };
      }).filter((s) => s.name.length > 0);

      if (parsed.length === 0) {
        setSheetError('Could not extract school names. Please check column headers.');
      } else {
        setParsedSchoolsList(parsed);
      }
    } catch (err) {
      console.error('Error reading Excel/CSV file:', err);
      setSheetError('Failed to parse file. Please upload a valid .xlsx, .xls or .csv file.');
    }
  };

  // Submit Append Schools
  const handleAppendSchoolsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadSchoolsTrainer || parsedSchoolsList.length === 0) {
      setSheetError('No valid schools parsed to add.');
      return;
    }

    appendSchoolsToTrainer(uploadSchoolsTrainer.id, parsedSchoolsList);
    setUploadSchoolsTrainer(null);
    setParsedSchoolsList([]);
    setSheetFileName('');
  };

  // Download Sample Excel Template
  const handleDownloadSampleTemplate = () => {
    const sampleData = [
      {
        'School Name': 'P.S. Akbarpur Primary School',
        'UDISE Code': '09260100101',
        'District': uploadSchoolsTrainer?.district || 'Kanpur Dehat',
        'Block': 'Akbarpur',
        'Address': 'Village Akburpur, UP',
        'Principal Name': 'Rajesh Kumar',
        'Principal Contact': '9876543210',
        'Total Students': 120
      },
      {
        'School Name': 'U.P.S. Rania Secondary School',
        'UDISE Code': '09260100205',
        'District': uploadSchoolsTrainer?.district || 'Kanpur Dehat',
        'Block': 'Rania',
        'Address': 'Rania Industrial Area, UP',
        'Principal Name': 'Sunita Devi',
        'Principal Contact': '9876543211',
        'Total Students': 150
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Schools');
    XLSX.writeFile(workbook, `Sample_Schools_Template_${uploadSchoolsTrainer?.name || 'Trainer'}.xlsx`);
  };

  const handleAdminAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const cleanPass = adminPassInput.trim();
    if (cleanPass === '7777' || cleanPass === '123456' || cleanPass === 'admin') {
      sessionStorage.setItem('admin_authenticated', 'true');
      login('admin');
      setIsAuthenticated(true);
      addToast('Admin Control Center unlocked successfully.', 'success');
    } else {
      setAuthError('Invalid Admin Password. Please try again.');
    }
  };

  // Handle Admin Exit
  const handleExitAdmin = () => {
    sessionStorage.removeItem('admin_authenticated');
    logout();
    navigate('/');
  };

  // Get list of unique districts (filtered by selected state)
  const districts = useMemo(() => {
    const setD = new Set<string>();
    const stateTrainers = selectedState === 'all' ? trainers : trainers.filter((t) => t.stateId === selectedState);
    stateTrainers.forEach((t) => {
      if (t.district) setD.add(t.district);
    });
    return Array.from(setD).sort();
  }, [trainers, selectedState]);

  // Filtered trainers list (by State, District, and Search)
  const filteredTrainers = useMemo(() => {
    return trainers.filter((t) => {
      const matchState = selectedState === 'all' || t.stateId === selectedState;
      const matchSearch =
        !search.trim() ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        t.district.toLowerCase().includes(search.toLowerCase());
      const matchDistrict = selectedDistrict === 'all' || t.district === selectedDistrict;
      return matchState && matchSearch && matchDistrict;
    });
  }, [trainers, search, selectedState, selectedDistrict]);

  // Attendance metrics
  const today = getToday();
  const checkedInCount = useMemo(() => {
    return trainers.filter((t) => {
      const att = getTodayAttendance(t.id);
      return att && att.status === 'present';
    }).length;
  }, [trainers, getTodayAttendance]);

  // Open Edit Modal
  const handleOpenEdit = (t: TrainerData) => {
    setEditingTrainer(t);
    setEditName(t.name);
    setEditEmpId(t.employeeId);
    setEditDistrict(t.district);
  };

  // School File Select Handler for New Trainer
  const handleNewTrainerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setNewTrainerFileError('');
    if (!file) return;

    setNewTrainerFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonRows.length === 0) {
        setNewTrainerFileError('Uploaded sheet is empty. Please upload a sheet containing school rows.');
        setNewTrainerSchoolsList([]);
        return;
      }

      // Map rows to School objects
      const parsed = jsonRows.map((row) => {
        const name = row['School Name'] || row['school_name'] || row['Name'] || row['School'] || Object.values(row)[0] || '';
        const udiseCode = String(row['UDISE Code'] || row['UDISE'] || row['udise_code'] || row['udise'] || 'N/A');
        const district = row['District'] || row['district'] || newDistrict || 'Central';
        const block = row['Block'] || row['block'] || 'Block A';
        const address = row['Address'] || row['address'] || `${district}, India`;
        const principalName = row['Principal Name'] || row['principal_name'] || '';
        const principalContact = String(row['Principal Contact'] || row['principal_contact'] || '');
        const totalStudents = Number(row['Total Students'] || row['total_students'] || row['Students']) || 100;

        return {
          name: String(name).trim(),
          udiseCode: udiseCode.trim(),
          district: String(district).trim(),
          block: String(block).trim(),
          address: String(address).trim(),
          principalName: String(principalName).trim(),
          principalContact: principalContact.trim(),
          totalStudents
        };
      }).filter((s) => s.name.length > 0);

      if (parsed.length === 0) {
        setNewTrainerFileError('Could not find any valid school rows in the sheet.');
        setNewTrainerSchoolsList([]);
        return;
      }

      setNewTrainerSchoolsList(parsed);
      addToast(`Successfully parsed ${parsed.length} schools from ${file.name}`, 'success');
    } catch (err: any) {
      console.error('Failed to parse excel sheet:', err);
      setNewTrainerFileError('Failed to parse sheet file. Please check file format.');
      setNewTrainerSchoolsList([]);
    }
  };

  // Submit Add Trainer (With State Selection & Optional Schools Upload)
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrainerName.trim() || !newEmpId.trim() || !newDistrict.trim()) return;

    const newId = `t-${Date.now()}`;
    let finalStateId = newTrainerState;

    if (newTrainerState === 'NEW_STATE') {
      if (!customStateName.trim()) {
        addToast('Please enter a valid new state name.', 'error');
        return;
      }
      const cleanName = customStateName.trim();
      const abbrev = cleanName.length >= 2 ? cleanName.slice(0, 2).toUpperCase() : cleanName.toUpperCase();
      finalStateId = cleanName.toLowerCase().replace(/\s+/g, '-');

      addTrainer({
        id: newId,
        name: newTrainerName.trim(),
        employeeId: newEmpId.trim(),
        district: newDistrict.trim(),
        stateId: finalStateId,
        newState: {
          name: cleanName,
          abbreviation: abbrev
        }
      });
    } else {
      addTrainer({
        id: newId,
        name: newTrainerName.trim(),
        employeeId: newEmpId.trim(),
        district: newDistrict.trim(),
        stateId: finalStateId
      });
    }

    if (newTrainerSchoolsList.length > 0) {
      appendSchoolsToTrainer(newId, newTrainerSchoolsList);
    }

    const schoolMsg = newTrainerSchoolsList.length > 0 ? ` with ${newTrainerSchoolsList.length} schools assigned` : '';
    addToast(`Trainer "${newTrainerName.trim()}" onboarded successfully${schoolMsg}.`, 'success');

    // Reset Form
    setNewTrainerName('');
    setNewEmpId('');
    setNewDistrict('');
    setNewTrainerState('up');
    setCustomStateName('');
    setNewTrainerSchoolsList([]);
    setNewTrainerFileName('');
    setNewTrainerFileError('');
    setIsAddModalOpen(false);
  };

  // Submit Edit Trainer
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrainer || !editName.trim() || !editEmpId.trim() || !editDistrict.trim()) return;

    updateTrainer(editingTrainer.id, {
      name: editName.trim(),
      employeeId: editEmpId.trim(),
      district: editDistrict.trim()
    });

    setEditingTrainer(null);
    addToast(`Updated trainer details for ${editName.trim()}`, 'success');
  };

  // Handle Permanent Delete Trainer Confirmation
  const handleConfirmDelete = async () => {
    if (!deletingTrainer) return;

    const name = deletingTrainer.name;
    const id = deletingTrainer.id;

    deleteTrainer(id);
    await deleteTrainerSheet(name);

    addToast(`Trainer "${name}" and their Google Sheet tab deleted permanently.`, 'info');
    setDeletingTrainer(null);
  };

  // ADMIN PASSWORD VERIFICATION PROMPT
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50 flex flex-col items-center justify-center p-6 text-slate-900 text-left select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative max-w-md w-full"
        >
          {/* Ambient background glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-400 rounded-3xl blur-lg opacity-30" />

          <div className="relative bg-white/95 border border-rose-200/80 rounded-3xl p-7 sm:p-8 backdrop-blur-xl shadow-xl shadow-rose-950/5 space-y-6">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                <Lock size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Admin Authentication</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Enter Admin password to access control center</p>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                <ShieldAlert size={16} className="text-red-600 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1.5">
                  Admin Access Password
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={adminPassInput}
                    onChange={(e) => setAdminPassInput(e.target.value)}
                    placeholder="Enter password (7777)"
                    className="w-full h-11 pl-10 pr-4 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="submit"
                  className="flex-1 h-11 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-xs font-black tracking-wider uppercase rounded-xl transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Unlock Admin</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </form>

            <div className="pt-3 border-t border-slate-200/80 text-center">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-xs font-bold text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                ← Back to Login Screen
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/40 via-slate-50 to-white text-slate-900 pb-16 select-none">
      
      {/* Top Navbar */}
      <header className="bg-white text-slate-900 sticky top-0 z-40 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center font-black text-white text-sm sm:text-base shadow-md shadow-red-500/25 shrink-0">
              AP
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black tracking-tight block truncate">AssociatePulse</span>
                <span className="hidden md:inline-block text-[10px] font-black uppercase bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                  Control Center
                </span>
              </div>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium hidden sm:block truncate">Uttar Pradesh Field Operations ERP</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-extrabold rounded-xl transition-all shadow-md shadow-red-500/20 cursor-pointer whitespace-nowrap"
            >
              <UserPlus size={16} className="shrink-0" />
              <span className="hidden sm:inline">Add New Trainer</span>
              <span className="sm:hidden">Add</span>
            </button>

            <button
              onClick={handleExitAdmin}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 hover:text-red-800 text-xs sm:text-sm font-extrabold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              title="Log Out Admin Session"
            >
              <LogOut size={15} className="shrink-0" />
              <span className="hidden sm:inline">Log Out Admin</span>
              <span className="sm:hidden">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
        
        {/* KPI Banner Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="bg-gradient-to-br from-red-600 to-red-700 text-white p-5 border-none shadow-lg shadow-red-600/20">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-red-100 uppercase tracking-wider block">Total Active Trainers</span>
                <span className="text-3xl font-black text-white block mt-1">{trainers.length}</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-red-100">
                <Users size={24} />
              </div>
            </div>
            <span className="text-xs font-semibold text-red-100 block mt-3">Full UP Project Associate Roster</span>
          </Card>

          <Card className="bg-white p-5 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Total Allocated Schools</span>
                <span className="text-3xl font-black text-slate-900 block mt-1">{schools.length}</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <School size={24} />
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500 block mt-3">Mapped 1-to-1 with Excel Allocation</span>
          </Card>

          <Card className="bg-white p-5 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Districts Covered</span>
                <span className="text-3xl font-black text-slate-900 block mt-1">{districts.length}</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Building2 size={24} />
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500 block mt-3">Across Uttar Pradesh State</span>
          </Card>

          <Card className="bg-white p-5 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Checked-In Today</span>
                <span className="text-3xl font-black text-emerald-600 block mt-1">{checkedInCount} / {trainers.length}</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CalendarCheck size={24} />
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500 block mt-3">Date: {formatDate(today, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </Card>
        </div>

        {/* Section Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users size={22} className="text-red-600" />
              <span>Manage All Trainers</span>
            </h2>
            <p className="text-sm font-semibold text-slate-500 mt-0.5">
              Select any trainer box below to view, edit, or access their full workspace.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-auto min-w-0 sm:min-w-[220px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search trainer name or district..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            {/* State Filter Dropdown */}
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict('all');
              }}
              className="w-full sm:w-auto px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer shadow-xs"
            >
              <option value="all">All States ({trainers.length} Trainers)</option>
              {allStatesList.map((st) => {
                const count = trainers.filter((t) => t.stateId === st.id).length;
                return (
                  <option key={st.id} value={st.id}>
                    {st.name} ({count} {count === 1 ? 'Trainer' : 'Trainers'})
                  </option>
                );
              })}
            </select>

            {/* District Filter Dropdown (Filtered dynamically after State Selection) */}
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer shadow-xs"
            >
              <option value="all">
                {selectedState === 'all'
                  ? `All Districts (${districts.length})`
                  : `Districts in ${selectedState === 'up' ? 'UP' : selectedState === 'delhi' ? 'Delhi' : 'Goa'} (${districts.length})`}
              </option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Trainers Boxes / Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrainers.map((trainer) => {
            const avatarGrad = getDeterministicGradient(trainer.name);
            const trainerSchoolsList = getSchoolsByTrainer(trainer.id);
            const att = getTodayAttendance(trainer.id);

            return (
              <Card
                key={trainer.id}
                className="relative overflow-hidden hover:shadow-xl transition-all duration-300 group border border-slate-200/90 rounded-2xl bg-white"
              >
                {/* Top decorative stripe */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-rose-400" />

                <div className="p-5 sm:p-6 space-y-4">
                  {/* Trainer Profile Header inside Box */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white font-black text-base shadow-sm shrink-0`}>
                        {getInitials(trainer.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight group-hover:text-red-600 transition-colors truncate">
                          {trainer.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="font-mono text-[11px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 whitespace-nowrap">
                            {trainer.employeeId}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 whitespace-nowrap">
                            <MapPin size={13} className="text-slate-400 shrink-0" />
                            {trainer.district}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Attendance status badge */}
                    <div className="shrink-0 whitespace-nowrap">
                      {att ? (
                        <Badge color={att.status === 'present' ? 'green' : 'amber'} dot>
                          {att.status === 'present' ? 'Present' : 'On Leave'}
                        </Badge>
                      ) : (
                        <Badge color="slate" dot>
                          Not Checked-In
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* School Allocation & Metadata info with Add Schools button */}
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs font-bold text-slate-700 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <School size={16} className="text-red-600 shrink-0" />
                      <span className="truncate">Allocated Schools:</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                        {trainerSchoolsList.length} Schools
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadSchoolsTrainer(trainer);
                          setSheetFileName('');
                          setParsedSchoolsList([]);
                          setSheetError('');
                        }}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                        title={`Upload sheet to add schools for ${trainer.name}`}
                      >
                        <Plus size={13} />
                        <span>Add Schools</span>
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    {/* View / Go Inside Trainer Workspace */}
                    <button
                      onClick={() => navigate(`/dashboard/state/${trainer.stateId}/trainer/${trainer.id}/attendance`)}
                      className="flex-1 h-10 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-black tracking-wide uppercase rounded-xl transition-all shadow-sm shadow-red-500/15 flex items-center justify-center gap-2 cursor-pointer"
                      title="Enter Trainer Workspace"
                    >
                      <span>View / Go Inside</span>
                      <ExternalLink size={14} className="shrink-0" />
                    </button>

                    {/* Edit Trainer Details */}
                    <button
                      onClick={() => handleOpenEdit(trainer)}
                      className="h-10 w-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center justify-center cursor-pointer shrink-0"
                      title="Edit Trainer Details"
                    >
                      <Edit size={16} />
                    </button>

                    {/* Delete Trainer */}
                    <button
                      onClick={() => setDeletingTrainer(trainer)}
                      className="h-10 w-10 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors flex items-center justify-center cursor-pointer shrink-0"
                      title="Delete Trainer Account"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                </div>
              </Card>
            );
          })}
        </div>

      </main>

      {/* MODAL 1: ADD NEW TRAINER MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-left border border-slate-200 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Add New Trainer</h3>
                    <p className="text-xs text-slate-500 font-semibold">Onboard a new Project Associate trainer</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                {/* Select State */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newTrainerState}
                    onChange={(e) => setNewTrainerState(e.target.value)}
                    className="w-full h-11 px-4 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer"
                  >
                    {allStatesList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                    <option value="NEW_STATE" className="font-extrabold text-red-600">
                      + Add New State...
                    </option>
                  </select>
                </div>

                {/* If New State option selected -> Enter State Name */}
                {newTrainerState === 'NEW_STATE' && (
                  <div className="p-3.5 bg-red-50/60 border border-red-200/80 rounded-2xl space-y-2">
                    <label className="block text-xs font-black text-red-800 uppercase tracking-wider">
                      New State Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customStateName}
                      onChange={(e) => setCustomStateName(e.target.value)}
                      placeholder="e.g. Rajasthan, Maharashtra, Punjab"
                      className="w-full h-10 px-3.5 text-sm font-bold bg-white border border-red-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                    />
                  </div>
                )}

                {/* Trainer Full Name */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trainer Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTrainerName}
                    onChange={(e) => setNewTrainerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full h-11 px-4 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>

                {/* Employee ID */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Employee ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmpId}
                    onChange={(e) => setNewEmpId(e.target.value)}
                    placeholder="e.g. EMP-UP-110"
                    className="w-full h-11 px-4 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
                  />
                </div>

                {/* Assigned District */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Assigned District <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    placeholder="e.g. Kanpur Dehat, Central Delhi, South Goa"
                    className="w-full h-11 px-4 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>

                {/* Upload Schools Sheet (Optional) */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                      Upload Initial Schools Sheet <span className="text-slate-400 font-normal text-[11px]">(optional)</span>
                    </label>
                  </div>

                  {/* Disclaimer & Sheet Format Box */}
                  <div className="p-3 bg-amber-50/60 border border-amber-200/90 rounded-2xl text-[11px] space-y-2 text-slate-700">
                    <div className="border-b border-amber-200/60 pb-1.5 font-black text-amber-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-amber-600 shrink-0" />
                      <span>Sheet Column Format</span>
                    </div>
                    <div className="bg-white/80 border border-amber-200/60 p-2 rounded-xl text-[10px] font-mono space-y-0.5 text-slate-800">
                      <div>• <strong className="text-red-600">School Name</strong> (Required)</div>
                      <div>• <strong className="text-red-600">UDISE Code</strong> (Required)</div>
                      <div>• <strong>District</strong> / <strong>Block</strong> / <strong>Principal Details</strong> (Optional)</div>
                    </div>
                  </div>

                  <input
                    ref={newTrainerInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleNewTrainerFileChange}
                    className="hidden"
                  />

                  <div
                    onClick={() => newTrainerInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-red-400 bg-slate-50/50 hover:bg-red-50/30 rounded-2xl p-4 text-center cursor-pointer transition-all group"
                  >
                    {newTrainerSchoolsList.length > 0 ? (
                      <div className="space-y-1">
                        <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
                        <span className="text-xs font-black text-emerald-700 block">
                          {newTrainerSchoolsList.length} Schools Parsed Ready!
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium block truncate">{newTrainerFileName}</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload size={22} className="mx-auto text-slate-400 group-hover:text-red-600 transition-colors" />
                        <span className="text-xs font-bold text-slate-700 group-hover:text-red-600 transition-colors block">
                          Click to upload initial schools (.xlsx, .xls, .csv)
                        </span>
                      </div>
                    )}
                  </div>

                  {newTrainerFileError && (
                    <p className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                      <ShieldAlert size={13} />
                      <span>{newTrainerFileError}</span>
                    </p>
                  )}
                </div>

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setNewTrainerSchoolsList([]);
                      setNewTrainerFileName('');
                    }}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black tracking-wider uppercase rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Save Trainer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DELETE TRAINER PERMANENT CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingTrainer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-left border border-slate-200 space-y-5"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Remove Trainer Permanently</h3>
                  <p className="text-xs text-rose-600 font-extrabold mt-0.5">Warning: Irreversible Operation</p>
                </div>
              </div>

              <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl space-y-2 text-xs text-slate-700">
                <p className="font-semibold leading-relaxed">
                  Are you sure you want to permanently remove trainer <strong className="text-rose-900 font-extrabold">{deletingTrainer.name}</strong> ({deletingTrainer.employeeId})?
                </p>
                <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1 font-medium pt-1">
                  <li>Permanently deletes their account & credentials</li>
                  <li>Deletes all {getSchoolsByTrainer(deletingTrainer.id).length} assigned schools from the roster</li>
                  <li>Dispatches request to remove their trainer tab from Google Sheets</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingTrainer(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black tracking-wider uppercase rounded-xl transition-all shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  Yes, Remove Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: EDIT TRAINER MODAL */}
      <AnimatePresence>
        {editingTrainer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-left border border-slate-200 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black">
                    <Edit size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Edit Trainer Details</h3>
                    <p className="text-xs text-slate-500 font-semibold">Modify profile details for {editingTrainer.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingTrainer(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trainer Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-11 px-4 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    required
                    value={editEmpId}
                    onChange={(e) => setEditEmpId(e.target.value)}
                    className="w-full h-11 px-4 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Assigned District
                  </label>
                  <input
                    type="text"
                    required
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    className="w-full h-11 px-4 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingTrainer(null)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black tracking-wider uppercase rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Update Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL 3: UPLOAD & ADD SCHOOLS SHEET FOR TRAINER */}
        {uploadSchoolsTrainer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 overflow-hidden relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <FileSpreadsheet className="text-red-600" size={20} />
                    <span>Add New Schools for {uploadSchoolsTrainer.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Upload Excel (.xlsx, .xls) or CSV sheet to append schools to this trainer.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setUploadSchoolsTrainer(null);
                    setParsedSchoolsList([]);
                    setSheetFileName('');
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAppendSchoolsSubmit} className="space-y-4">
                {/* Disclaimer & Required Column Format Text */}
                <div className="p-4 bg-amber-50/60 border border-amber-200/90 rounded-2xl text-xs space-y-2.5 text-slate-700">
                  <div className="border-b border-amber-200/60 pb-2">
                    <span className="font-black text-amber-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <ShieldAlert size={15} className="text-amber-600 shrink-0" />
                      <span>Disclaimer & Sheet Column Format</span>
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    Uploaded schools will automatically be appended to <strong className="text-slate-900 font-extrabold">{uploadSchoolsTrainer.name}</strong>&apos;s allocated school roster. Please ensure your Excel/CSV sheet contains the following column headers in Row 1:
                  </p>

                  <div className="bg-white/80 border border-amber-200/60 p-2.5 rounded-xl text-[11px] font-mono space-y-1 text-slate-800">
                    <div>• <strong className="text-red-600">School Name</strong> (Required)</div>
                    <div>• <strong className="text-red-600">UDISE Code</strong> (Required - 11 Digit Code)</div>
                    <div>• <strong>District</strong> (Optional - Defaults to {uploadSchoolsTrainer.district})</div>
                    <div>• <strong>Block</strong> (Optional - e.g. Akbarpur)</div>
                    <div>• <strong>Address</strong> / <strong>Principal Name</strong> / <strong>Contact</strong> (Optional)</div>
                  </div>
                </div>

                {/* Upload File Box */}
                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                    Select Excel / CSV Sheet <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={sheetInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleSheetFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => sheetInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 hover:border-red-500 rounded-2xl bg-white hover:bg-red-50/20 transition-all cursor-pointer text-xs font-bold text-slate-700"
                  >
                    <Upload size={24} className="text-red-600" />
                    <span>{sheetFileName ? `Selected: ${sheetFileName}` : 'Click to Upload Excel (.xlsx, .xls, .csv)'}</span>
                    <span className="text-[11px] font-normal text-slate-400">Click to browse spreadsheet from your computer</span>
                  </button>
                </div>

                {/* Parsing Status Feedback */}
                {sheetError && (
                  <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">
                    {sheetError}
                  </p>
                )}

                {parsedSchoolsList.length > 0 && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 font-semibold space-y-1">
                    <div className="flex items-center gap-2 font-black text-emerald-800">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>Parsed {parsedSchoolsList.length} schools successfully!</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 truncate pl-6">
                      Preview: {parsedSchoolsList.slice(0, 3).map(s => s.name).join(', ')}{parsedSchoolsList.length > 3 ? ` and ${parsedSchoolsList.length - 3} more...` : ''}
                    </div>
                  </div>
                )}

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadSchoolsTrainer(null);
                      setParsedSchoolsList([]);
                      setSheetFileName('');
                    }}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={parsedSchoolsList.length === 0}
                    className={`px-5 py-2.5 text-white text-xs font-black tracking-wider uppercase rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                      parsedSchoolsList.length > 0
                        ? 'bg-red-600 hover:bg-red-500'
                        : 'bg-slate-300 cursor-not-allowed text-slate-500'
                    }`}
                  >
                    <Plus size={15} />
                    <span>Append {parsedSchoolsList.length || 0} Schools</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
