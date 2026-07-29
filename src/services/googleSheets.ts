export interface ActivityPayload {
  trainerName: string;
  state: string;
  district?: string;
  activityType: string;
  details?: string;
  
  // Date & Attendance fields
  dateStr?: string; // DD/MM/YYYY
  isNewVisit?: boolean;
  status?: 'present' | 'absent' | 'on_leave';
  leaveReason?: string;
  checkIn?: string | null;
  checkOut?: string | null;
  workingHours?: string;
  clockInLocation?: string;
  clockOutLocation?: string;
  photoBase64?: string; // Base64 geotagged photo to save to Drive
  photoName?: string; // e.g. "Present"

  // School Report fields
  schoolName?: string;
  udiseCode?: string;
  visitStartTime?: string;
  principalName?: string;
  principalContact?: string;
  totalTeachers?: number;
  totalStudents?: number;
  totalWorkingComputers?: number;
  internetFacility?: string;
  smartClass?: string;
  schoolRemark?: string;

  // Rating fields
  ratingInfra?: number;
  ratingMgmt?: number;
  ratingEngagement?: number;
  ratingRemark?: string;

  // EOD Feedback fields
  overallExperience?: string;
  mood?: string;
  highlight?: string;
  lowlight?: string;
  challenges?: string;
  hasComplaint?: boolean;
  complaintDetails?: string;
  suggestions?: string;
}

/**
 * Dispatches Operational Logs (attendance, checkout, inspection details, feedback reports)
 * directly to a Google Sheets Apps Script Web App URL with dual GET/POST fallback.
 */
export async function logActivity(activity: ActivityPayload): Promise<void> {
  const webhookUrl =
    import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL ||
    'https://script.google.com/macros/s/AKfycbwVv8EOlF3PLLvtHlMeouYWs_wRqJUrTQBxzAk_GSOH-Vqouf8QEgasnNdg_uSh5WM6/exec';

  if (!webhookUrl) {
    console.warn('Google Sheets Webhook URL not configured. Activity logged locally only:', activity);
    return;
  }

  try {
    const payload = {
      timestamp: new Date().toLocaleString('en-IN'),
      ...activity
    };

    const jsonString = JSON.stringify(payload);

    // 1. Try POST with text/plain
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: jsonString
    });

    // 2. Dual Fallback GET for non-photo requests to guarantee sync without CORS issues
    if (!activity.photoBase64 || activity.photoBase64.length < 2000) {
      const getUrl = `${webhookUrl}?payload=${encodeURIComponent(jsonString)}`;
      fetch(getUrl, { mode: 'no-cors' }).catch(() => {});
    }

    console.log('Synced activity to Google Sheets & Drive:', activity.activityType);
  } catch (error) {
    console.error('Failed to sync activity to Google Sheets:', error);
  }
}

/**
 * Sends a request to Google Sheets webhook to delete the tab/sheet corresponding to a removed trainer.
 */
export async function deleteTrainerSheet(trainerName: string, state: string = 'UP'): Promise<void> {
  await logActivity({
    trainerName,
    state,
    activityType: 'DELETE_TRAINER_TAB',
    details: `Permanently remove trainer tab for ${trainerName}`
  });
}

/**
 * Fetches live matrix data for a trainer directly from Google Sheets
 */
export async function fetchLiveTrainerData(trainerName: string, state: string, dateStr?: string) {
  const webhookUrl =
    import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL ||
    'https://script.google.com/macros/s/AKfycbwVv8EOlF3PLLvtHlMeouYWs_wRqJUrTQBxzAk_GSOH-Vqouf8QEgasnNdg_uSh5WM6/exec';
  if (!webhookUrl) return null;

  try {
    const url = `${webhookUrl}?action=get_trainer_data&trainerName=${encodeURIComponent(trainerName)}&state=${encodeURIComponent(state)}${dateStr ? `&dateStr=${encodeURIComponent(dateStr)}` : ''}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        if (json.allVisits && Array.isArray(json.allVisits)) {
          return {
            ...json.data,
            allVisits: json.allVisits
          };
        }
        return json.data;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch live data from Google Sheets:', e);
  }
  return null;
}

export async function fetchLiveSchoolReport(schoolName: string, udiseCode?: string) {
  const webhookUrl =
    import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL ||
    'https://script.google.com/macros/s/AKfycbwVv8EOlF3PLLvtHlMeouYWs_wRqJUrTQBxzAk_GSOH-Vqouf8QEgasnNdg_uSh5WM6/exec';
  if (!webhookUrl) return null;

  try {
    const url = `${webhookUrl}?action=get_school_report_data&schoolName=${encodeURIComponent(schoolName)}&udiseCode=${encodeURIComponent(udiseCode || '')}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        return json.data;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch school report data:', e);
  }
  return null;
}
