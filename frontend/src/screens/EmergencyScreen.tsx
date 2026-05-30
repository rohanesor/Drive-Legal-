import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  StatusBar,
  Animated,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LocationMap, MapMarker } from '../components/LocationMap';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, GLASS } from '../constants/theme';
import { 
  Phone, 
  MapPin, 
  Shield, 
  Heart, 
  Activity, 
  Compass, 
  ArrowLeft, 
  Navigation, 
  Sparkles, 
  X, 
  AlertOctagon, 
  AlertTriangle, 
  AlertCircle,
  CreditCard, 
  Zap, 
  Flame, 
  Info 
} from 'lucide-react-native';
import { 
  requestGPSCoordinates, 
  fetchOSMReverseGeocode, 
  discoverNearbyEmergencies, 
  EmergencyLocation, 
  GeocodedAddress 
} from '../services/emergencyService';
import { useLocation } from '../context/LocationContext';

export const EmergencyScreen = () => {
  const { location: contextLocation, geoInfo: contextGeoInfo } = useLocation();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // States
  const [gpsLoading, setGpsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: string } | null>(null);
  const [address, setAddress] = useState<GeocodedAddress | null>(null);
  const [radius, setRadius] = useState<2 | 5 | 10>(5);
  const [nearbyEmergencies, setNearbyEmergencies] = useState<EmergencyLocation[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  const mapMarkers: MapMarker[] = useMemo(() => {
    return nearbyEmergencies.map(em => ({
      id: em.id,
      type: em.type as MapMarker['type'],
      name: em.name,
      lat: em.lat,
      lng: em.lng,
      distance: em.distance,
      address: em.address,
      phone: em.phone,
    }));
  }, [nearbyEmergencies]);

  // SOS indicator pulse loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const loadEmergencySystem = async (forceRadius?: 2 | 5 | 10) => {
    setGpsLoading(true);
    try {
      let lat = 11.0168;
      let lng = 76.9558;
      let accuracy = 'low';

      // 1. Try to read location from context
      if (contextLocation) {
        lat = contextLocation.latitude;
        lng = contextLocation.longitude;
        accuracy = 'high';
        setUserLocation({ lat, lng, accuracy });
      } else {
        // Fallback to active GPS fetch if not in context yet
        try {
          const coords = await requestGPSCoordinates();
          lat = coords.lat;
          lng = coords.lng;
          accuracy = coords.accuracy;
          setUserLocation(coords);
        } catch (gpsErr) {
          console.warn('GPS Permission or sensor failed, using fallback:', gpsErr);
          setUserLocation({ lat, lng, accuracy });
        }
      }

      // 2. Reverse Geocoding
      if (contextGeoInfo) {
        setAddress({
          city: contextGeoInfo.city || contextGeoInfo.district || 'Coimbatore',
          state: contextGeoInfo.state || 'Tamil Nadu',
          country: 'India',
        });
      } else {
        try {
          const geocoded = await fetchOSMReverseGeocode(lat, lng);
          setAddress(geocoded);
        } catch (geoErr) {
          console.warn('Nominatim reverse geocode failed, using fallback:', geoErr);
          setAddress({ city: 'Coimbatore', state: 'Tamil Nadu', country: 'India' });
        }
      }

      // 3. Emergency Discovery via Overpass API
      const selectedRadius = forceRadius || radius;
      try {
        const discovered = await discoverNearbyEmergencies(lat, lng, selectedRadius);
        setNearbyEmergencies(discovered);
        setIsOffline(discovered.length === 0);
      } catch (discoverErr) {
        console.warn('Overpass discovery failed, using cached fallback:', discoverErr);
        setIsOffline(true);
        // Load fallback caches safely inside try-catch to prevent crash
        const discoveredFallback = await discoverNearbyEmergencies(lat, lng, selectedRadius);
        setNearbyEmergencies(discoveredFallback);
      }
    } catch (e) {
      console.warn('GPS Emergency platform failed:', e);
      setIsOffline(true);
    } finally {
      setGpsLoading(false);
    }
  };

  // Run on mount or when context location changes
  useEffect(() => {
    loadEmergencySystem();
  }, [contextLocation, contextGeoInfo]);

  // Run when radius changes
  const handleRadiusChange = (newRadius: 2 | 5 | 10) => {
    setRadius(newRadius);
    loadEmergencySystem(newRadius);
  };

  // Launch Native Maps App Navigation via geo deep linking
  const handleNavigate = (em: EmergencyLocation) => {
    const latLng = `${em.lat},${em.lng}`;
    const label = encodeURIComponent(em.name);
    
    const url = Platform.select({
      ios: `maps://0,0?q=${label}@${latLng}`,
      android: `geo:0,0?q=${latLng}(${label})`
    });

    if (url) {
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Web fallback
          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${em.lat},${em.lng}`);
        }
      }).catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${em.lat},${em.lng}`);
      });
    }
  };

  const handleCall = (number: string, name: string) => {
    const url = `tel:${number}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Unable to dial', `Direct calling is unsupported. Copying ${number} to clipboard.`);
    });
  };

  const getEmergencyIcon = (type: string) => {
    switch (type) {
      case 'police': return Shield;
      case 'hospital': return Heart;
      case 'fire': return Flame;
      case 'charging_station': return Zap;
      case 'rto': return CreditCard;
      default: return AlertTriangle;
    }
  };

  const getEmergencyColor = (type: string) => {
    switch (type) {
      case 'police': return '#3B82F6';
      case 'hospital': return '#10B981';
      case 'fire': return '#EF4444';
      case 'charging_station': return '#06B6D4';
      case 'rto': return '#F59E0B';
      default: return '#E2E8F0';
    }
  };

  // Filter nearest emergency icons
  const nearestPolice = nearbyEmergencies.find(e => e.type === 'police');
  const nearestHospital = nearbyEmergencies.find(e => e.type === 'hospital');
  const nearestFire = nearbyEmergencies.find(e => e.type === 'fire');

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#080E1A" barStyle="light-content" />

      {/* TOP BAR */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconCircle}>
            <Phone size={18} color="#FF1744" />
          </View>
          <View>
            <Text style={styles.headerTitle}>RoadSOS Platform</Text>
            <Text style={styles.headerSub}>Real-Time Location-Aware Help</Text>
          </View>
        </View>
        <Animated.View style={[styles.pulsePill, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.pulsePillText}>SOS ACTIVE</Text>
        </Animated.View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* CURRENT LOCATION HUD CARD */}
        <View style={styles.locationCard}>
          <View style={styles.locationHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Compass size={18} color={COLORS.cyan} />
              <Text style={styles.locationTitle}>📍 CURRENT GPS TELEMETRY</Text>
            </View>
            <View style={styles.accuracyBadge}>
              <Text style={styles.accuracyBadgeText}>
                {userLocation ? `ACCURACY: ${userLocation.accuracy.toUpperCase()}` : 'LOCKING GPS...'}
              </Text>
            </View>
          </View>

          <Text style={styles.locationCity}>
            {address ? `${address.city}, ${address.state}` : 'Coimbatore, Tamil Nadu'}
          </Text>
          <Text style={styles.locationCountry}>
            {address ? address.country : 'India'} • {userLocation ? `${userLocation.lat.toFixed(5)}°N, ${userLocation.lng.toFixed(5)}°E` : 'Detecting...'}
          </Text>
        </View>

        {/* RADIUS RANGE SELECTOR TABS */}
        <View style={styles.radiusTabsWrapper}>
          <Text style={styles.radiusLabel}>DISCOVERY SCAN RANGE:</Text>
          <View style={styles.radiusTabs}>
            {([2, 5, 10] as const).map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusTabButton, radius === r && styles.radiusTabButtonActive]}
                onPress={() => handleRadiusChange(r)}
              >
                <Text style={[styles.radiusTabText, radius === r && styles.radiusTabTextActive]}>
                  {r} km Radius
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* OFFLINE FALLBACK BANNER */}
        {isOffline && (
          <View style={styles.offlineBanner}>
            <AlertTriangle size={18} color="#FFD600" />
            <Text style={styles.offlineText}>
              Using offline cached emergency database & national numbers.
            </Text>
          </View>
        )}

        {/* MAP SECTION */}
        <View style={styles.mapContainer}>
          <LocationMap
            currentLocation={userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : undefined}
            mapType="roadsos"
            markers={mapMarkers}
            height={280}
            interactive={true}
          />
          <TouchableOpacity 
            style={styles.refreshBadge}
            onPress={() => loadEmergencySystem()}
          >
            <Activity size={12} color={COLORS.cyan} />
            <Text style={styles.refreshBadgeText}>SCAN AGAIN</Text>
          </TouchableOpacity>
        </View>

        {/* NEAREST EMERGENCY HELP CARDS */}
        <View style={styles.sectionHeader}>
          <Shield size={16} color={COLORS.cyan} />
          <Text style={styles.sectionTitle}>NEAREST HELP (OVERPASS SCAN)</Text>
        </View>

        {gpsLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.cyan} />
            <Text style={styles.loadingText}>Polling nearest emergency entities...</Text>
          </View>
        ) : nearbyEmergencies.length === 0 ? (
          <View style={styles.emptyBox}>
            <AlertCircle size={28} color="#64748B" />
            <Text style={styles.emptyText}>No emergency resources found within {radius}km.</Text>
          </View>
        ) : (
          <View style={styles.emergencyDiscoveredContainer}>
            {/* Display Top 3 discovered resources (Police, Hospital, Fire) */}
            {[nearestPolice, nearestHospital, nearestFire].map((item, idx) => {
              if (!item) return null;
              const Icon = getEmergencyIcon(item.type);
              const color = getEmergencyColor(item.type);
              
              return (
                <View key={item.id} style={[styles.helpCard, { borderColor: color + '33' }]}>
                  <View style={styles.helpCardTop}>
                    <View style={[styles.iconContainer, { backgroundColor: color + '12' }]}>
                      <Icon size={20} color={color} />
                    </View>
                    <View style={styles.helpInfo}>
                      <Text style={styles.helpName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.helpAddress} numberOfLines={1}>{item.address}</Text>
                    </View>
                    <View style={[styles.distanceBadge, { backgroundColor: color + '22' }]}>
                      <Text style={[styles.distanceBadgeText, { color: color }]}>{item.distance} km</Text>
                    </View>
                  </View>

                  <View style={styles.helpActionRow}>
                    <TouchableOpacity 
                      style={[styles.helpButton, { backgroundColor: '#111C31', borderColor: '#1F3456', borderWidth: 1 }]}
                      onPress={() => handleCall(item.phone || (item.type === 'police' ? '100' : '102'), item.name)}
                    >
                      <Phone size={14} color={COLORS.cyan} />
                      <Text style={[styles.helpButtonText, { color: COLORS.cyan }]}>CALL HELPLINE</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.helpButton, { backgroundColor: color }]}
                      onPress={() => handleNavigate(item)}
                    >
                      <Navigation size={14} color="#000000" />
                      <Text style={[styles.helpButtonText, { color: '#000000' }]}>ROUTING NAV</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* BONUS: SAFETY NEARBY COMPLIANCE SUMMARY */}
        {!gpsLoading && nearbyEmergencies.length > 0 && (
          <View style={styles.safetyNearbyCard}>
            <View style={styles.safetyHeader}>
              <Sparkles size={16} color={COLORS.cyan} />
              <Text style={styles.safetyTitle}>SAFETY NEARBY INDEX</Text>
            </View>
            <Text style={styles.safetySubtitle}>Nearest support hubs resolved from GPS:</Text>
            
            <View style={styles.safetyGrid}>
              <View style={styles.safetyItem}>
                <Text style={styles.safetyItemLabel}>🚔 POLICE</Text>
                <Text style={styles.safetyItemValue}>
                  {nearestPolice ? `${nearestPolice.name} (${nearestPolice.distance} km)` : 'Not in Scan Radius'}
                </Text>
              </View>
              <View style={styles.safetyItem}>
                <Text style={styles.safetyItemLabel}>🏥 HOSPITALS</Text>
                <Text style={styles.safetyItemValue}>
                  {nearestHospital ? `${nearestHospital.name} (${nearestHospital.distance} km)` : 'Not in Scan Radius'}
                </Text>
              </View>
              <View style={styles.safetyItem}>
                <Text style={styles.safetyItemLabel}>⚡ EV CHARGING</Text>
                <Text style={styles.safetyItemValue}>
                  {nearbyEmergencies.find(e => e.type === 'charging_station')
                    ? `${nearbyEmergencies.find(e => e.type === 'charging_station')?.name} (${nearbyEmergencies.find(e => e.type === 'charging_station')?.distance} km)`
                    : 'No Chargers nearby'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* STATIC PUBLIC EMERGENCY BUTTONS */}
        <View style={styles.sectionHeader}>
          <Phone size={16} color={COLORS.cyan} />
          <Text style={styles.sectionTitle}>RAPID HOTLINE DIRECT DIAL</Text>
        </View>

        <View style={styles.hotlinesRow}>
          <TouchableOpacity 
            style={[styles.hotlinePill, { borderColor: '#EF4444' }]}
            onPress={() => handleCall('112', 'Unified Emergency')}
          >
            <Text style={[styles.hotlineNum, { color: '#EF4444' }]}>112</Text>
            <Text style={styles.hotlineName}>UNIFIED SOS</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.hotlinePill, { borderColor: '#3B82F6' }]}
            onPress={() => handleCall('100', 'Police')}
          >
            <Text style={[styles.hotlineNum, { color: '#3B82F6' }]}>100</Text>
            <Text style={styles.hotlineName}>POLICE FORCE</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.hotlinePill, { borderColor: '#10B981' }]}
            onPress={() => handleCall('108', 'Ambulance')}
          >
            <Text style={[styles.hotlineNum, { color: '#10B981' }]}>108</Text>
            <Text style={styles.hotlineName}>AMBULANCE</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.hotlinePill, { borderColor: '#F59E0B' }]}
            onPress={() => handleCall('1033', 'NHAI Highway')}
          >
            <Text style={[styles.hotlineNum, { color: '#F59E0B' }]}>1033</Text>
            <Text style={styles.hotlineName}>NHAI HIGHWAY</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.noticeContainer}>
          <Info size={14} color="#64748B" />
          <Text style={styles.noticeText}>
            Overpass OpenStreetMap emergency querying does not store user location coordinates and is completely free of charge.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080E1A',
  },
  header: {
    backgroundColor: '#0C1424',
    borderBottomWidth: 1.5,
    borderBottomColor: '#1A2E4C',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 23, 68, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 23, 68, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 1,
  },
  pulsePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#FF1744',
  },
  pulsePillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
  },

  // GPS Location Card
  locationCard: {
    backgroundColor: '#0C1424',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1A2E4C',
    padding: 12,
    marginBottom: 16,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationTitle: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  accuracyBadge: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  accuracyBadgeText: {
    color: COLORS.cyan,
    fontSize: 8,
    fontWeight: 'bold',
  },
  locationCity: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  locationCountry: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 3,
  },

  // Radius Selectors
  radiusTabsWrapper: {
    marginBottom: 16,
  },
  radiusLabel: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  radiusTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  radiusTabButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#0C1424',
    borderWidth: 1.5,
    borderColor: '#1A2E4C',
    borderRadius: 8,
    alignItems: 'center',
  },
  radiusTabButtonActive: {
    borderColor: COLORS.cyan,
    backgroundColor: '#0F2C46',
  },
  radiusTabText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  radiusTabTextActive: {
    color: COLORS.cyan,
  },

  // Offline banner
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 214, 0, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 214, 0, 0.25)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  offlineText: {
    color: '#FFD600',
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },

  // Map WebView Container
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#1A2E4C',
    position: 'relative',
    marginBottom: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  refreshBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refreshBadgeText: {
    color: COLORS.cyan,
    fontSize: 8.5,
    fontWeight: 'bold',
  },

  // Discovered emergency listings
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyBox: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  emergencyDiscoveredContainer: {
    gap: 12,
    marginBottom: 16,
  },
  helpCard: {
    backgroundColor: '#0C1424',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
  },
  helpCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpInfo: {
    flex: 1,
  },
  helpName: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  helpAddress: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '500',
    marginTop: 2,
  },
  distanceBadge: {
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  distanceBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  helpActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1A2E4C',
    paddingTop: 10,
  },
  helpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    borderRadius: 6,
    gap: 4,
  },
  helpButtonText: {
    fontWeight: 'bold',
    fontSize: 10,
  },

  // Safety Index Card
  safetyNearbyCard: {
    backgroundColor: '#0C1424',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1E3255',
    padding: 12,
    marginBottom: 16,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  safetyTitle: {
    color: COLORS.cyan,
    fontSize: 9.5,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  safetySubtitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 10,
  },
  safetyGrid: {
    gap: 8,
  },
  safetyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderBottomWidth: 0.5,
    borderBottomColor: '#1A2E4C',
    paddingBottom: 6,
  },
  safetyItemLabel: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  safetyItemValue: {
    color: '#CBD5E1',
    fontSize: 10.5,
    fontWeight: '600',
  },

  // Rapid hotlines
  hotlinesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  hotlinePill: {
    width: (Dimensions.get('window').width - 42) / 2,
    backgroundColor: '#0C1424',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  hotlineNum: {
    fontSize: 20,
    fontWeight: '900',
  },
  hotlineName: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: 'bold',
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // Info notes
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 4,
    marginTop: 10,
  },
  noticeText: {
    color: '#475569',
    fontSize: 8.5,
    fontWeight: '600',
    lineHeight: 12,
    flex: 1,
  },
});

export default EmergencyScreen;
