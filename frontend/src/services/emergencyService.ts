import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import type {
  EmergencyLocation,
  EmergencyLocationType,
  GeocodedAddress,
} from '../types';

export type { EmergencyLocation, GeocodedAddress } from '../types';

type OSMTags = Record<string, string | undefined>;

interface OverpassElement {
  id: string | number;
  type: string;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: OSMTags;
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const CACHE_KEY_LOCATIONS = 'roadsos_cached_emergency_locations';
const CACHE_KEY_ADDRESS = 'roadsos_cached_geocoded_address';

// Haversine formula to compute distance in km between two lat/lng pairs
export const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

// Formats the address of Overpass elements dynamically from street, suburb, etc.
const formatOSMAddress = (tags: OSMTags): string => {
  const parts: string[] = [];
  if (tags['addr:housenumber']) {
    parts.push(tags['addr:housenumber']);
  }
  if (tags['addr:street']) {
    parts.push(tags['addr:street']);
  }
  if (tags['addr:suburb']) {
    parts.push(tags['addr:suburb']);
  }
  if (tags['addr:city']) {
    parts.push(tags['addr:city']);
  }
  if (tags['addr:state']) {
    parts.push(tags['addr:state']);
  }
  if (tags['addr:postcode']) {
    parts.push(tags['addr:postcode']);
  }

  if (parts.length > 0) {
    return parts.join(', ');
  }

  // Fallback to tags if no structured address is specified
  if (tags.operator) {
    return `Operated by ${tags.operator}`;
  }
  if (tags.brand) {
    return tags.brand;
  }
  return 'Address Details not specified';
};

// Requests Expo location permissions and returns coordinates
export const requestGPSCoordinates = async (): Promise<{
  lat: number;
  lng: number;
  accuracy: 'high' | 'medium' | 'low';
}> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('GPS Location permissions denied.');
  }

  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const accValue = loc.coords.accuracy || 0;
  let accuracyText: 'high' | 'medium' | 'low' = 'high';
  if (accValue > 50) {
    accuracyText = 'low';
  } else if (accValue > 15) {
    accuracyText = 'medium';
  }

  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    accuracy: accuracyText,
  };
};

// Reverse geocoding via Nominatim OpenStreetMap
export const fetchOSMReverseGeocode = async (
  lat: number,
  lng: number,
): Promise<GeocodedAddress> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VazhiRoadSOS/1.0',
      },
    });
    const data = (await response.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        suburb?: string;
        state?: string;
        country?: string;
      };
    };

    if (data && data.address) {
      const addr = data.address;
      const city =
        addr.city || addr.town || addr.village || addr.suburb || 'Coimbatore';
      const state = addr.state || 'Tamil Nadu';
      const country = addr.country || 'India';

      const geocoded = { city, state, country };
      await AsyncStorage.setItem(CACHE_KEY_ADDRESS, JSON.stringify(geocoded));
      return geocoded;
    }

    throw new Error('Address details not returned');
  } catch (e) {
    // Fallback to cache if error
    const cached = await AsyncStorage.getItem(CACHE_KEY_ADDRESS);
    if (cached) {
      return JSON.parse(cached);
    }
    return { city: 'Coimbatore', state: 'Tamil Nadu', country: 'India' };
  }
};

// Query Overpass interpreter for nearby emergency locations
export const discoverNearbyEmergencies = async (
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<EmergencyLocation[]> => {
  const radiusMeters = radiusKm * 1000;
  const query = `
    [out:json][timeout:20];
    (
      node["amenity"="police"](around:${radiusMeters},${lat},${lng});
      way["amenity"="police"](around:${radiusMeters},${lat},${lng});
      
      node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      
      node["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
      way["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
      
      node["amenity"="fire_station"](around:${radiusMeters},${lat},${lng});
      way["amenity"="fire_station"](around:${radiusMeters},${lat},${lng});
      
      node["amenity"="charging_station"](around:${radiusMeters},${lat},${lng});
      way["amenity"="charging_station"](around:${radiusMeters},${lat},${lng});
      
      node["office"="government"]["government"="transport"](around:${radiusMeters},${lat},${lng});
      way["office"="government"]["government"="transport"](around:${radiusMeters},${lat},${lng});
    );
    out center;
  `;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'VazhiRoadSOS/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Overpass returned status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.elements) {
      return [];
    }

    const results: EmergencyLocation[] = data.elements
      .map((el: OverpassElement) => {
        const itemLat = el.lat ?? el.center?.lat ?? null;
        const itemLng = el.lon ?? el.center?.lon ?? null;

        if (!itemLat || !itemLng) {
          return null;
        }

        const tags: OSMTags = el.tags || {};
        let type: EmergencyLocationType = 'police';

        if (tags.amenity === 'police') {
          type = 'police';
        } else if (tags.amenity === 'hospital' || tags.amenity === 'clinic') {
          type = 'hospital';
        } else if (tags.amenity === 'fire_station') {
          type = 'fire';
        } else if (tags.amenity === 'charging_station') {
          type = 'charging_station';
        } else if (
          tags.office === 'government' &&
          tags.government === 'transport'
        ) {
          type = 'rto';
        }

        const name =
          tags.name ||
          tags.operator ||
          tags.brand ||
          `${type.replace('_', ' ').toUpperCase()} Service`;
        const distance = calculateHaversineDistance(lat, lng, itemLat, itemLng);
        const address = formatOSMAddress(tags);
        const phone = tags.phone || tags['contact:phone'] || undefined;

        return {
          id: `${el.type}_${el.id}`,
          type,
          name,
          lat: itemLat,
          lng: itemLng,
          distance,
          address,
          phone,
        };
      })
      .filter(
        (item: EmergencyLocation | null): item is EmergencyLocation =>
          item !== null,
      );

    // Sort by nearest first
    results.sort((a, b) => a.distance - b.distance);

    // Cache results
    await AsyncStorage.setItem(CACHE_KEY_LOCATIONS, JSON.stringify(results));

    return results;
  } catch (error) {
    console.warn('Overpass fetch failed, loading local cached backup:', error);
    // Load from local Cache
    const cached = await AsyncStorage.getItem(CACHE_KEY_LOCATIONS);
    if (cached) {
      const parsed = JSON.parse(cached) as EmergencyLocation[];
      // Re-calculate distances based on current coordinates if caching is used
      return parsed
        .map((item) => ({
          ...item,
          distance: calculateHaversineDistance(lat, lng, item.lat, item.lng),
        }))
        .sort((a, b) => a.distance - b.distance);
    }
    return [];
  }
};
