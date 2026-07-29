export interface LocationResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  city?: string;
  state?: string;
  country?: string;
  source: 'gps' | 'ip';
}

/**
 * Attempts to get precise browser GPS position.
 * If permission is denied or times out, falls back to IP-based geolocation.
 */
export async function getLiveLocation(): Promise<LocationResult> {
  // 1. Try Browser GPS Geolocation first
  try {
    const gpsPosition = await getGPSCoordinates();
    const lat = gpsPosition.coords.latitude;
    const lng = gpsPosition.coords.longitude;

    // Try reverse geocoding to get city/state name
    const addressDetails = await reverseGeocode(lat, lng);

    return {
      lat,
      lng,
      formattedAddress: addressDetails.formattedAddress || `${addressDetails.city || 'Detected Area'}, ${addressDetails.state || ''}`,
      city: addressDetails.city,
      state: addressDetails.state,
      country: addressDetails.country || 'India',
      source: 'gps'
    };
  } catch (gpsError) {
    console.warn('GPS location unavailable/denied, attempting IP location fallback...', gpsError);
  }

  // 2. Fallback to IP Geolocation
  return await getIPLocation();
}

/**
 * Prompts user for browser Geolocation with 8s timeout
 */
function getGPSCoordinates(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation API not supported by browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000
      }
    );
  });
}

/**
 * Reverse geocodes lat/lng into human readable City, State, Address
 */
async function reverseGeocode(lat: number, lng: number): Promise<{
  formattedAddress?: string;
  city?: string;
  state?: string;
  country?: string;
}> {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (response.ok) {
      const data = await response.json();
      const city = data.city || data.locality || data.principalSubdivision;
      const state = data.principalSubdivision || data.countrySubdivisionCode;
      const country = data.countryName;
      const formattedAddress = [city, state, country].filter(Boolean).join(', ');

      return { formattedAddress, city, state, country };
    }
  } catch (e) {
    console.warn('Reverse geocoding failed:', e);
  }

  return {};
}

/**
 * Fallback IP-based geolocation
 */
async function getIPLocation(): Promise<LocationResult> {
  try {
    const res = await fetch('https://ipapi.co/json');
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        const city = data.city || 'Detected Location';
        const state = data.region || data.region_code || '';
        const country = data.country_name || 'India';
        const formattedAddress = `${city}${state ? `, ${state}` : ''}, ${country}`;

        return {
          lat: Number(data.latitude),
          lng: Number(data.longitude),
          formattedAddress,
          city,
          state,
          country,
          source: 'ip'
        };
      }
    }
  } catch (e) {
    console.warn('Primary IP geolocation failed, trying backup API:', e);
  }

  // Backup IP API
  try {
    const res = await fetch('https://ip-api.com/json');
    if (res.ok) {
      const data = await res.json();
      if (data.lat && data.lon) {
        const city = data.city || 'Detected Location';
        const state = data.regionName || '';
        const country = data.country || 'India';
        const formattedAddress = `${city}${state ? `, ${state}` : ''}, ${country}`;

        return {
          lat: Number(data.lat),
          lng: Number(data.lon),
          formattedAddress,
          city,
          state,
          country,
          source: 'ip'
        };
      }
    }
  } catch (e) {
    console.error('All IP location services failed:', e);
  }

  // Ultimate fallback (default center)
  return {
    lat: 28.6139,
    lng: 77.2090,
    formattedAddress: 'New Delhi, India',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    source: 'ip'
  };
}
