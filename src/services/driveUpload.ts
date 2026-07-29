import { logActivity } from './googleSheets';

export interface DriveUploadOptions {
  trainerName: string;
  state?: string;
  district?: string;
  schoolName?: string;
  date: string; // YYYY-MM-DD or DD/MM/YYYY
  file: File;
  onProgress: (progress: number) => void;
}

export interface DriveFile {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
  path: string;
  url: string;
}

export function uploadToDrive({
  trainerName,
  state = 'UP',
  district = '',
  schoolName,
  date,
  file,
  onProgress
}: DriveUploadOptions): Promise<DriveFile> {
  return new Promise((resolve, reject) => {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    let progress = 0;

    const interval = setInterval(() => {
      progress = Math.min(progress + 25, 90);
      onProgress(progress);
    }, 150);

    const reader = new FileReader();

    reader.onload = async () => {
      clearInterval(interval);
      onProgress(95);

      const base64Data = reader.result as string;

      const dateParts = date.split('-');
      const formattedDate = dateParts.length === 3 && dateParts[0].length === 4
        ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
        : date;

      try {
        await logActivity({
          trainerName,
          state,
          district,
          schoolName,
          activityType: 'MEDIA_UPLOAD',
          dateStr: formattedDate,
          photoBase64: base64Data,
          photoName: file.name,
          details: `Uploaded media: ${file.name}`
        });

        onProgress(100);

        resolve({
          id: 'drive-' + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: `${sizeMB} MB`,
          type: file.type || 'image/jpeg',
          uploadedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          path: `Drive / ${trainerName} / ${formattedDate.replace(/\//g, '-')} / ${file.name}`,
          url: URL.createObjectURL(file)
        });
      } catch (err) {
        clearInterval(interval);
        reject(err);
      }
    };

    reader.onerror = (error) => {
      clearInterval(interval);
      reject(error);
    };

    reader.readAsDataURL(file);
  });
}

export function deleteFromDrive(_fileId: string): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 400);
  });
}
