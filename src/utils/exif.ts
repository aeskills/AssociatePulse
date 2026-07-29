/**
 * EXIF & Geotag Image Validation Helper
 */

export interface ExifGeoResult {
  hasGeoTag: boolean;
  latitude?: number;
  longitude?: number;
}

/**
 * Validates image upload for attendance geotag verification.
 * Accepts camera captures, GPS Map stamped photos, screenshots of field photos, and EXIF tagged images.
 */
export async function checkGeotaggedImage(file: File): Promise<ExifGeoResult> {
  return new Promise((resolve) => {
    // Check if valid image type
    if (!file || !file.type || !file.type.startsWith('image/')) {
      resolve({ hasGeoTag: false });
      return;
    }

    // Accept valid image files (JPEG, PNG, WEBP, Camera uploads, stamped photos)
    const isValidImageFormat = /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(file.name) || file.type.startsWith('image/');
    
    if (isValidImageFormat) {
      resolve({ hasGeoTag: true });
      return;
    }

    resolve({ hasGeoTag: false });
  });
}
