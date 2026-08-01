import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import statesData from '../data/states.json';
import trainersData from '../data/trainers.json';
import schoolsData from '../data/schools.json';
import attendanceData from '../data/attendance.json';
import feedbackData from '../data/feedback.json';
import { getToday, getCurrentFormattedTime, calculateWorkingHours } from '../lib/utils';
import { logActivity } from '../services/googleSheets';
import { getLiveLocation, type LocationResult } from '../utils/geolocation';

export interface StateData {
  id: string;
  name: string;
  abbreviation: string;
  trainerCount: number;
  color: string;
}

export interface TrainerData {
  id: string;
  stateId: string;
  name: string;
  employeeId: string;
  district: string;
  assignedSchools: string[];
  lastVisit: string;
}

export interface SchoolData {
  id: string;
  stateId: string;
  name: string;
  schoolId: string;
  udiseCode: string;
  district: string;
  block: string;
  village: string;
  address: string;
  principalName: string;
  principalContact: string;
  totalStudents: number;
  assignedTrainer: string;
  schoolStatus: string;
  latitude: number;
  longitude: number;
}

export interface AttendanceRecord {
  id: string;
  trainerId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: string;
  status: 'present' | 'absent' | 'on_leave';
  schoolName?: string;
  geoTag: { lat: number; lng: number; address?: string } | null;
  clockInLocation?: { lat: number; lng: number; address?: string } | null;
  clockOutLocation?: { lat: number; lng: number; address?: string } | null;
  photoUrl?: string;
  leaveReason?: string;
  autoClockedOut?: boolean;
  studentsTrained?: number;
  uploadedMedia?: UploadedMediaItem[];
}

export interface UploadedMediaItem {
  id: string;
  name: string;
  size: string;
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
  thumbnailUrl?: string;
  drivePath?: string;
}

export interface FeedbackRecord {
  id: string;
  trainerId: string;
  date: string;
  highlight: string;
  lowlight: string;
  challenges: string;
  hasComplaint: boolean;
  complaintCategory?: string;
  complaintSeverity?: string;
  complaintDescription?: string;
  suggestions?: string;
  overallExperience: string;
  mood: string;
}

export interface RatingRecord {
  trainerId: string;
  schoolId: string;
  ratings: Record<string, number>;
  comment?: string;
  overallRating: number;
  timestamp: string;
}

export interface SchoolDetailsRecord {
  schoolId: string;
  principalName: string;
  principalContact: string;
  spoc1Name?: string;
  spoc1Contact?: string;
  spoc2Name?: string;
  spoc2Contact?: string;
  totalTeachers: number;
  totalStudents: number;
  totalWorkingComputers: number;
  internetFacility: string; // 'WiFi' | 'LAN Connection' | 'Dongle'
  smartClass: string; // 'Yes' | 'No'
  remark?: string;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface AppNotification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface AppState {
  // Session Settings
  userRole: 'admin' | 'trainer';
  activeTrainerId: string | null;
  activeStateId: string | null;
  activeSchoolId: string | null;
  
  // Database Models
  states: StateData[];
  trainers: TrainerData[];
  schools: SchoolData[];
  attendance: AttendanceRecord[];
  feedback: FeedbackRecord[];
  ratings: RatingRecord[];
  schoolInspectionDetails: SchoolDetailsRecord[];
  
  // App UI layers
  toasts: ToastItem[];
  notifications: AppNotification[];
  
  // Active Visit & Live Geolocation Tracking
  liveLocation: LocationResult | null;
  isLocating: boolean;
  detectLiveLocation: () => Promise<LocationResult>;
  activeVisit: {
    schoolId: string | null;
    startTime: string | null;
    timerActive: boolean;
    locationCaptured: { lat: number; lng: number } | null;
  };

  // Multi-visit tracking (persisted)
  currentVisitNumber: number;
  todayCompletedVisits: Array<{
    visitNum: number;
    schoolName: string;
    checkIn: string;
    checkOut: string;
    workingHours: string;
  }>;
  visitDate: string | null; // YYYY-MM-DD to reset visits on new day

  // Actions
  login: (role: 'admin' | 'trainer', trainerId?: string | null) => void;
  logout: () => void;
  selectState: (stateId: string | null) => void;
  selectTrainer: (trainerId: string | null) => void;
  selectSchool: (schoolId: string | null) => void;
  
  // Monthly Calendar schedule mapping (trainerId -> YYYY-MM-DD -> schoolId | schoolIds[])
  monthlySchedule: Record<string, Record<string, string | string[]>>;
  setMonthlySchool: (trainerId: string, date: string, schoolIds: string | string[]) => void;

  // Attendance actions
  markAttendance: (
    trainerId: string,
    status: 'present' | 'absent' | 'on_leave',
    geoTag?: { lat: number; lng: number; address?: string } | null,
    photoUrl?: string,
    leaveReason?: string,
    schoolName?: string
  ) => void;
  checkOut: (trainerId: string, geoTag?: { lat: number; lng: number; address?: string } | null) => void;
  autoCheckOutYesterday: (trainerId: string) => boolean;
  resetTodayAttendance: (trainerId: string) => void;
  saveStudentsTrained: (trainerId: string, count: number) => void;
  saveUploadedMedia: (trainerId: string, items: UploadedMediaItem[]) => void;
  
  // Visit actions
  startVisit: (schoolId: string, lat: number, lng: number) => void;
  endVisit: () => void;
  
  // Data submission actions
  saveInspectionDetails: (details: SchoolDetailsRecord) => void;
  saveRating: (trainerId: string, schoolId: string, ratings: Record<string, number>, comment?: string) => void;
  addFeedback: (fb: Omit<FeedbackRecord, 'id' | 'trainerId' | 'date'>) => void;
  addTrainer: (trainer: { 
    id?: string;
    name: string; 
    employeeId: string; 
    district: string; 
    stateId: string;
    newState?: { name: string; abbreviation: string };
  }) => void;
  updateTrainer: (id: string, updatedData: Partial<TrainerData>) => void;
  deleteTrainer: (id: string) => void;
  appendSchoolsToTrainer: (trainerId: string, newSchoolsData: Partial<SchoolData>[]) => void;
  
  // System actions
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  addNotification: (message: string) => void;
  markNotificationsRead: () => void;
  
  // Helper getters
  getTrainersByState: (stateId: string) => TrainerData[];
  getSchoolsByTrainer: (trainerId: string) => SchoolData[];
  getTodayAttendance: (trainerId: string) => AttendanceRecord | undefined;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      userRole: null,
      activeTrainerId: null,
  activeStateId: null,
  activeSchoolId: null,

  states: statesData as StateData[],
  trainers: trainersData as TrainerData[],
  schools: schoolsData as SchoolData[],
  attendance: [],
  feedback: [],
  ratings: [],
  schoolInspectionDetails: [],

  liveLocation: null,
  isLocating: false,

  detectLiveLocation: async () => {
    set({ isLocating: true });
    try {
      const loc = await getLiveLocation();
      set({ liveLocation: loc, isLocating: false });
      return loc;
    } catch (e) {
      console.error('Failed to detect live location:', e);
      set({ isLocating: false });
      throw e;
    }
  },

  toasts: [],
  notifications: [
    { id: 'notif-1', message: 'System initialization complete.', timestamp: '10:00 AM', read: false }
  ],

  activeVisit: {
    schoolId: null,
    startTime: null,
    timerActive: false,
    locationCaptured: null
  },

  currentVisitNumber: 1,
  todayCompletedVisits: [],
  visitDate: null,

  login: (role, trainerId = null) => {
    if (role === 'admin') {
      localStorage.setItem('admin_authenticated', 'true');
      localStorage.removeItem('trainer_authenticated');
      sessionStorage.setItem('admin_authenticated', 'true');
      sessionStorage.removeItem('trainer_authenticated');
      set({
        userRole: 'admin',
        activeTrainerId: null
      });
      get().addNotification('Admin Control session activated.');
    } else {
      const tid = trainerId || 't-manish';
      localStorage.setItem('trainer_authenticated', tid);
      localStorage.removeItem('admin_authenticated');
      sessionStorage.setItem('trainer_authenticated', tid);
      sessionStorage.removeItem('admin_authenticated');
      set({
        userRole: 'trainer',
        activeTrainerId: tid
      });
      get().addToast('Logged in successfully as Field Trainer', 'success');
      get().addNotification(`Trainer session started for ${tid}.`);
      get().detectLiveLocation();
    }
  },

  logout: () => {
    localStorage.removeItem('admin_authenticated');
    localStorage.removeItem('trainer_authenticated');
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('trainer_authenticated');
    set({
      userRole: null,
      activeTrainerId: null,
      activeStateId: null,
      activeSchoolId: null,
      activeVisit: { schoolId: null, startTime: null, timerActive: false, locationCaptured: null }
    });
    get().addToast('Logged out successfully', 'info');
  },

  selectState: (stateId) => set({ activeStateId: stateId }),
  selectTrainer: (trainerId) => set({ activeTrainerId: trainerId }),
  monthlySchedule: {},

  setMonthlySchool: (trainerId, date, schoolIds) => {
    set((state) => {
      const prevTrainerSched = state.monthlySchedule[trainerId] || {};
      return {
        monthlySchedule: {
          ...state.monthlySchedule,
          [trainerId]: {
            ...prevTrainerSched,
            [date]: schoolIds
          }
        }
      };
    });
  },

  autoCheckOutYesterday: (trainerId) => {
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    const records = get().attendance;
    const idx = records.findIndex(r => r.trainerId === trainerId && r.date === yesterdayStr);

    if (idx !== -1 && records[idx].checkIn && !records[idx].checkOut) {
      const updated = {
        ...records[idx],
        checkOut: '18:00:00',
        workingHours: '8.0',
        autoClockedOut: true
      };
      const nextAtt = [...records];
      nextAtt[idx] = updated;
      set({ attendance: nextAtt });
      return true; // Indicates yesterday was auto-clocked out
    }
    return false;
  },

  resetTodayAttendance: (trainerId) => {
    const today = getToday();
    set((state) => ({
      attendance: state.attendance.filter((r) => !(r.trainerId === trainerId && r.date === today)),
      feedback: state.feedback.filter((f) => !(f.trainerId === trainerId && f.date === today))
    }));
    get().addToast("Today's log reset successfully.", "info");
  },

  saveStudentsTrained: (trainerId, count) => {
    const today = getToday();
    set((state) => ({
      attendance: state.attendance.map((r) => {
        if (r.trainerId === trainerId && r.date === today) {
          return { ...r, studentsTrained: count };
        }
        return r;
      })
    }));
  },

  saveUploadedMedia: (trainerId, items) => {
    const today = getToday();
    set((state) => ({
      attendance: state.attendance.map((r) => {
        if (r.trainerId === trainerId && r.date === today) {
          return { ...r, uploadedMedia: items };
        }
        return r;
      })
    }));
  },

  markAttendance: (trainerId, status, geoTag = null, photoUrl, leaveReason, schoolName) => {
    const today = getToday();
    const records = get().attendance;
    const exists = records.find(r => r.trainerId === trainerId && r.date === today);

    if (exists) {
      get().addToast("Attendance already marked for today", "error");
      return;
    }

    const checkInTime = status === 'present' ? getCurrentFormattedTime() : null;
    const newRecord: AttendanceRecord = {
      id: 'att-' + Math.random().toString(36).substr(2, 9),
      trainerId,
      date: today,
      checkIn: checkInTime,
      checkOut: null,
      workingHours: '0',
      status,
      schoolName,
      geoTag,
      clockInLocation: geoTag,
      photoUrl,
      leaveReason
    };

    set(state => ({
      attendance: [...state.attendance, newRecord]
    }));

    get().addToast(`Clocked In successfully (${status.replace('_', ' ')})`, 'success');
    get().addNotification(`Trainer ${get().trainers.find(t => t.id === trainerId)?.name} clocked in.`);
    // logActivity is handled directly in components to ensure full payload parameters are populated.
  },

  checkOut: (trainerId, geoTag = null) => {
    const today = getToday();
    const records = get().attendance;
    const idx = records.findIndex(r => r.trainerId === trainerId && r.date === today);

    if (idx === -1) {
      get().addToast("Clock-in record not found for today", "error");
      return;
    }

    const record = records[idx];
    if (record.checkOut) {
      get().addToast("Already clocked out for today", "error");
      return;
    }

    const checkOutTime = getCurrentFormattedTime();
    const hoursStr = calculateWorkingHours(record.checkIn, checkOutTime);

    const updated = {
      ...record,
      checkOut: checkOutTime,
      clockOutLocation: geoTag || record.geoTag,
      workingHours: hoursStr
    };

    const nextAtt = [...records];
    nextAtt[idx] = updated;

    set({ attendance: nextAtt });
    get().addToast("Clocked Out successfully today", "success");
    get().addNotification(`Trainer ${get().trainers.find(t => t.id === trainerId)?.name} clocked out.`);

    // logActivity is handled directly in components to ensure full payload parameters are populated.
  },

  startVisit: (schoolId, lat, lng) => {
    set({
      activeVisit: {
        schoolId,
        startTime: new Date().toLocaleTimeString('en-IN'),
        timerActive: true,
        locationCaptured: { lat, lng }
      }
    });
    get().addToast("School visit timer started", "success");
    get().addNotification(`Visit started at ${get().schools.find(s => s.id === schoolId)?.name}`);

    // logActivity is handled directly in components to ensure full payload parameters are populated.
  },

  endVisit: () => {
    set(state => ({
      activeVisit: {
        ...state.activeVisit,
        timerActive: false
      }
    }));
    get().addToast("School visit completed", "success");
    // logActivity is handled directly in components to ensure full payload parameters are populated.
  },

  saveInspectionDetails: (details) => {
    const items = get().schoolInspectionDetails;
    const idx = items.findIndex(i => i.schoolId === details.schoolId);
    
    const nextItems = [...items];
    if (idx !== -1) {
      nextItems[idx] = details;
    } else {
      nextItems.push(details);
    }

    set({ schoolInspectionDetails: nextItems });
  },

  saveRating: (trainerId, schoolId, ratings, comment = '') => {
    const keys = Object.keys(ratings);
    const sum = keys.reduce((s, k) => s + ratings[k], 0);
    const overall = keys.length ? Number((sum / keys.length).toFixed(1)) : 0;

    const newRating = {
      trainerId,
      schoolId,
      ratings,
      comment,
      overallRating: overall,
      timestamp: new Date().toLocaleString()
    };

    set(state => ({
      ratings: [...state.ratings, newRating]
    }));

    get().addToast("School rating submitted successfully", "success");
    get().addNotification(`Submitted ratings for ${get().schools.find(s => s.id === schoolId)?.name}.`);
  },

  addFeedback: (fb) => {
    const today = getToday();
    const newFeedback: FeedbackRecord = {
      id: 'fb-' + Math.random().toString(36).substr(2, 9),
      trainerId: get().activeTrainerId || 't1',
      date: today,
      ...fb
    };

    set(state => ({
      feedback: [...state.feedback, newFeedback]
    }));

    get().addToast("End of Day report submitted successfully", "success");
    get().addNotification(`EOD report submitted by trainer.`);
    // logActivity is handled directly in components to ensure full payload parameters are populated.
  },

  addTrainer: (trainer) => {
    let targetStateId = trainer.stateId;

    // Dynamically insert state if a new branch is being onboarding
    if (trainer.newState) {
      const abbreviation = trainer.newState.abbreviation.toUpperCase();
      targetStateId = abbreviation.toLowerCase();
      
      const newBranch = {
        id: targetStateId,
        name: trainer.newState.name,
        abbreviation: abbreviation,
        trainerCount: 0,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
      };

      set(state => ({
        states: [...state.states, newBranch]
      }));
    }

    const id = trainer.id || ('t-' + Math.random().toString(36).substring(2, 9));
    const newTrainer = {
      id,
      stateId: targetStateId,
      name: trainer.name,
      employeeId: trainer.employeeId,
      district: trainer.district,
      assignedSchools: [],
      lastVisit: getToday()
    };

    // Add trainer and increment state count
    set(state => {
      const nextStates = state.states.map(s => {
        if (s.id === targetStateId) {
          return { ...s, trainerCount: s.trainerCount + 1 };
        }
        return s;
      });
      return {
        trainers: [...state.trainers, newTrainer],
        states: nextStates
      };
    });

    get().addToast(`Trainer ${trainer.name} registered successfully`, 'success');
    get().addNotification(`New trainer ${trainer.name} onboarded.`);
    // logActivity is handled directly in components to ensure full payload parameters are populated.
  },

  updateTrainer: (id, updatedData) => {
    set(state => ({
      trainers: state.trainers.map(t => (t.id === id ? { ...t, ...updatedData } : t))
    }));
    get().addToast(`Trainer profile updated successfully`, 'success');
  },

  deleteTrainer: (id) => {
    set(state => ({
      trainers: state.trainers.filter(t => t.id !== id)
    }));
    get().addToast(`Trainer account removed`, 'info');
  },

  appendSchoolsToTrainer: (trainerId, newSchoolsData) => {
    const trainer = get().trainers.find(t => t.id === trainerId);
    if (!trainer) return;

    const stateId = trainer.stateId || 'up';
    const createdSchools: SchoolData[] = newSchoolsData.map((sData, idx) => {
      const id = `sch-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`;
      return {
        id,
        stateId,
        name: sData.name || `School ${idx + 1}`,
        schoolId: sData.schoolId || `SCH-${Date.now()}-${idx}`,
        udiseCode: sData.udiseCode || 'N/A',
        district: sData.district || trainer.district || 'Kanpur Dehat',
        block: sData.block || 'Block A',
        village: sData.village || '',
        address: sData.address || `${sData.district || trainer.district}, UP`,
        principalName: sData.principalName || '',
        principalContact: sData.principalContact || '',
        totalStudents: Number(sData.totalStudents) || 100,
        assignedTrainer: trainerId,
        schoolStatus: sData.schoolStatus || 'Active',
        latitude: sData.latitude || 26.4499,
        longitude: sData.longitude || 80.3319
      };
    });

    const createdSchoolIds = createdSchools.map(s => s.id);

    set(state => ({
      schools: [...state.schools, ...createdSchools],
      trainers: state.trainers.map(t =>
        t.id === trainerId
          ? { ...t, assignedSchools: Array.from(new Set([...(t.assignedSchools || []), ...createdSchoolIds])) }
          : t
      )
    }));

    get().addToast(`Appended ${createdSchools.length} new schools to ${trainer.name}`, 'success');
    get().addNotification(`Admin added ${createdSchools.length} new schools for ${trainer.name}.`);
  },

  addToast: (message, type = 'success') => {
    const id = 'toast-' + Math.random().toString(36).substr(2, 9);
    set(state => {
      // Ignore if identical toast message is already active
      if (state.toasts.some(t => t.message === message)) {
        return state;
      }
      // Keep maximum 2 active toasts to prevent stacking
      const trimmed = state.toasts.length >= 2 ? state.toasts.slice(-1) : state.toasts;
      return {
        toasts: [...trimmed, { id, message, type }]
      };
    });
  },

  removeToast: (id) => set(state => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),

  addNotification: (message) => {
    const id = 'notif-' + Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    set(state => ({
      notifications: [{ id, message, timestamp, read: false }, ...state.notifications]
    }));
  },

  markNotificationsRead: () => set(state => ({
    notifications: state.notifications.map(n => ({ ...n, read: true }))
  })),

  getTrainersByState: (stateId) => {
    const list = get().trainers.filter(t => t.stateId === stateId);
    if (list.length > 0) return list;
    return (trainersData as TrainerData[]).filter(t => t.stateId === stateId);
  },

  getSchoolsByTrainer: (trainerId) => {
    const trainer = get().trainers.find(t => t.id === trainerId) || (trainersData as TrainerData[]).find(t => t.id === trainerId);
    if (trainer && trainer.assignedSchools && trainer.assignedSchools.length > 0) {
      const assignedSet = new Set(trainer.assignedSchools);
      const matched = get().schools.filter(s => assignedSet.has(s.id));
      if (matched.length > 0) return matched;
      return (schoolsData as SchoolData[]).filter(s => assignedSet.has(s.id));
    }
    return get().schools.filter(s => s.assignedTrainer === trainerId);
  },

      getTodayAttendance: (trainerId) => {
        const today = getToday();
        return get().attendance.find(r => r.trainerId === trainerId && r.date === today);
      }
    }),
    {
      name: 'trainer-pulse-v8',
      partialize: (state) => ({
        userRole: state.userRole,
        activeTrainerId: state.activeTrainerId,
        activeStateId: state.activeStateId,
        activeSchoolId: state.activeSchoolId,
        activeVisit: state.activeVisit,
        attendance: state.attendance,
        feedback: state.feedback,
        trainers: state.trainers,
        schools: state.schools,
        currentVisitNumber: state.currentVisitNumber,
        todayCompletedVisits: state.todayCompletedVisits,
        visitDate: state.visitDate
      })
    }
  )
);
export default useAppStore;
