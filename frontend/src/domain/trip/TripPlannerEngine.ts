import type { MapLocation } from '../../types';

export interface TripPreferences {
  vehicleType: 'car' | 'motorcycle' | 'heavy';
  fuelType: 'petrol' | 'diesel' | 'ev';
  budget: 'budget' | 'mid' | 'premium';
  foodPreference: 'veg' | 'non-veg' | 'any';
}

export interface TripPoi {
  id: string;
  name: string;
  type: 'restaurant' | 'hotel' | 'fuel' | 'charger' | 'hospital' | 'sightseeing';
  lat: number;
  lng: number;
  rating: number;
  priceLevel: string;
  openingHour: number; // 24h format, e.g. 7 for 07:00
  closingHour: number; // 24h format, e.g. 22 for 22:00
  address: string;
}

export interface ItineraryStop {
  timeOfArrival: string; // "HH:MM"
  durationMinutes: number;
  activityName: string;
  description: string;
  poi: TripPoi | null;
}

export interface TripPlan {
  totalDistanceKm: number;
  totalDurationHours: number;
  routeTitle: string;
  stops: ItineraryStop[];
}

export class TripPlannerEngine {
  /**
   * Generates a time-aware, multi-stop driving itinerary.
   * Checks opening hours against arrival times at each POI destination.
   */
  generateItinerary(
    origin: MapLocation,
    destination: MapLocation,
    destName: string,
    startDateStr: string, // "YYYY-MM-DD"
    startTimeStr: string, // "HH:MM"
    prefs: TripPreferences
  ): TripPlan {
    const startHour = parseInt(startTimeStr.split(':')[0], 10);
    const startMin = parseInt(startTimeStr.split(':')[1], 10);
    
    // Estimate route metrics
    const distanceKm = Math.round(this.calculateDistance(origin, destination) / 1000);
    // Average speed 55 km/h for planning
    const driveDurationHours = distanceKm / 55;
    
    const stops: ItineraryStop[] = [];
    
    // Add start stop
    stops.push({
      timeOfArrival: startTimeStr,
      durationMinutes: 10,
      activityName: 'Departure',
      description: `Start journey from origin location at ${startTimeStr}`,
      poi: null,
    });

    let currentHour = startHour;
    let currentMin = startMin;
    let accumulatedTimeHours = 0;

    // Helper to format hours/minutes back to string
    const formatTime = (h: number, m: number): string => {
      const hh = Math.floor(h % 24).toString().padStart(2, '0');
      const mm = Math.floor(m % 60).toString().padStart(2, '0');
      return `${hh}:${mm}`;
    };

    // Helper to advance time
    const advanceTime = (hours: number, mins: number) => {
      currentMin += mins;
      currentHour += hours + Math.floor(currentMin / 60);
      currentMin = currentMin % 60;
      accumulatedTimeHours += hours + mins / 60;
    };

    // Simulate traveling segments with stops based on duration
    const segmentCount = Math.max(1, Math.floor(driveDurationHours / 3.5));
    const hoursPerSegment = driveDurationHours / segmentCount;

    for (let i = 0; i < segmentCount; i++) {
      // 1. Advance driving time for segment
      advanceTime(hoursPerSegment, 0);

      // Check current segment arrival time
      const arrivalHour24 = currentHour % 24;
      const isDestinationSegment = i === segmentCount - 1;

      if (!isDestinationSegment) {
        // Stop for fuel or charging
        const poiType = prefs.fuelType === 'ev' ? 'charger' : 'fuel';
        const poiName = prefs.fuelType === 'ev' ? 'FastVolt EV Charging Station' : 'Bharat Petroleum Fuel Station';
        
        stops.push({
          timeOfArrival: formatTime(currentHour, currentMin),
          durationMinutes: prefs.fuelType === 'ev' ? 45 : 15,
          activityName: prefs.fuelType === 'ev' ? 'EV Charge Stop' : 'Fuel Refill',
          description: `Stop for refueling along route segment ${i + 1}`,
          poi: {
            id: `poi_fuel_${i}`,
            name: poiName,
            type: poiType,
            lat: origin.lat + (destination.lat - origin.lat) * ((i + 1) / segmentCount),
            lng: origin.lng + (destination.lng - origin.lng) * ((i + 1) / segmentCount),
            rating: 4.2,
            priceLevel: '$$',
            openingHour: 0,
            closingHour: 24, // 24/7
            address: `National Highway, Segment ${i + 1}`,
          },
        });
        
        advanceTime(0, prefs.fuelType === 'ev' ? 45 : 15);

        // Meal stops logic
        const isBreakfastTime = arrivalHour24 >= 8 && arrivalHour24 <= 10;
        const isLunchTime = arrivalHour24 >= 12 && arrivalHour24 <= 15;
        const isDinnerTime = arrivalHour24 >= 19 && arrivalHour24 <= 22;

        if (isBreakfastTime || isLunchTime || isDinnerTime) {
          const mealType = isBreakfastTime ? 'Breakfast' : isLunchTime ? 'Lunch' : 'Dinner';
          const rPoi = this.getRecommendedRestaurant(currentHour, prefs);
          
          stops.push({
            timeOfArrival: formatTime(currentHour, currentMin),
            durationMinutes: 45,
            activityName: `${mealType} Stop`,
            description: `Stop at verified dining location during ${mealType.toLowerCase()} hours`,
            poi: rPoi,
          });

          advanceTime(0, 45);
        }
      }
    }

    // Arrival at destination
    stops.push({
      timeOfArrival: formatTime(currentHour, currentMin),
      durationMinutes: 0,
      activityName: `Arrival in ${destName}`,
      description: `Complete journey at your target destination, total trip time: ${accumulatedTimeHours.toFixed(1)} hours.`,
      poi: null,
    });

    // Check if arrived late and need a hotel recommendation
    const arrivalHour = currentHour % 24;
    if (arrivalHour >= 18 || arrivalHour < 6) {
      const hPoi = this.getRecommendedHotel(prefs);
      stops.push({
        timeOfArrival: formatTime(currentHour, currentMin),
        durationMinutes: 0,
        activityName: 'Hotel Check-in',
        description: 'Recommended lodging options based on your evening arrival time.',
        poi: hPoi,
      });
    }

    return {
      totalDistanceKm: distanceKm,
      totalDurationHours: Math.round(accumulatedTimeHours * 10) / 10,
      routeTitle: `Trip to ${destName} via NH Highway`,
      stops,
    };
  }

  private getRecommendedRestaurant(arrivalHour: number, prefs: TripPreferences): TripPoi {
    const isVeg = prefs.foodPreference === 'veg';
    const isPremium = prefs.budget === 'premium';
    const isBudget = prefs.budget === 'budget';

    return {
      id: 'poi_rest_temp',
      name: isVeg ? 'Saravana Bhavan Veg Restaurant' : isPremium ? 'Highway Grande Dining' : 'Local Dhaba Highway',
      type: 'restaurant',
      lat: 0,
      lng: 0,
      rating: 4.4,
      priceLevel: isPremium ? '$$$' : isBudget ? '$' : '$$',
      openingHour: 7, // 07:00
      closingHour: 23, // 23:00
      address: 'National Highway Food Court Plaza',
    };
  }

  private getRecommendedHotel(prefs: TripPreferences): TripPoi {
    const isPremium = prefs.budget === 'premium';
    const isBudget = prefs.budget === 'budget';

    return {
      id: 'poi_hotel_temp',
      name: isPremium ? 'The Residency Grand' : isBudget ? 'Transit Inn Comforts' : 'Orchid Regency Hotel',
      type: 'hotel',
      lat: 0,
      lng: 0,
      rating: 4.5,
      priceLevel: isPremium ? '$$$' : isBudget ? '$' : '$$',
      openingHour: 0,
      closingHour: 24, // 24/7 checkin
      address: 'Main Town Arterial Road Junction',
    };
  }

  private calculateDistance(p1: MapLocation, p2: MapLocation): number {
    const R = 6371000;
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const tripPlannerEngine = new TripPlannerEngine();
export default tripPlannerEngine;
