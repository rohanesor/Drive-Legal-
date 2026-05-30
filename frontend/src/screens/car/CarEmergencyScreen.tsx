import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar, 
  Linking, 
  ActivityIndicator,
  Platform,
  Alert,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CAR_COLORS, CAR_TYPOGRAPHY, CAR_SPACING } from '../../constants/theme';
import { ArrowLeft, Phone, Navigation, Shield, Heart, Flame, AlertTriangle, Compass } from 'lucide-react-native';
import { useLocation } from '../../context/LocationContext';
import { 
  discoverNearbyEmergencies, 
  fetchOSMReverseGeocode, 
  EmergencyLocation, 
  GeocodedAddress 
} from '../../services/emergencyService';

export const CarEmergencyScreen = () => {
  const navigation = useNavigation();
  const { location, geoInfo } = useLocation();

  // States
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<GeocodedAddress | null>(null);
  const [nearestPolice, setNearestPolice] = useState<EmergencyLocation | null>(null);
  const [nearestHospital, setNearestHospital] = useState<EmergencyLocation | null>(null);
  const [nearestFire, setNearestFire] = useState<EmergencyLocation | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const scanEmergencyHubs = async () => {
      setLoading(true);
      try {
        const lat = location?.latitude || 11.0168;
        const lng = location?.longitude || 76.9558;

        // 1. Reverse Geocode state
        if (geoInfo) {
          setAddress({
            city: geoInfo.city || geoInfo.district || 'Coimbatore',
            state: geoInfo.state || 'Tamil Nadu',
            country: 'India'
          });
        } else {
          const geocoded = await fetchOSMReverseGeocode(lat, lng);
          setAddress(geocoded);
        }

        // 2. Discover nearest entities within 10 km scan bounds
        const discovered = await discoverNearbyEmergencies(lat, lng, 10);
        setIsOffline(discovered.length === 0);

        // Sort out specific nearest targets
        const police = discovered.find(e => e.type === 'police') || null;
        const hospital = discovered.find(e => e.type === 'hospital') || null;
        const fire = discovered.find(e => e.type === 'fire') || null;

        setNearestPolice(police);
        setNearestHospital(hospital);
        setNearestFire(fire);
      } catch (e) {
        console.warn('Car SOS scan failed:', e);
        setIsOffline(true);
      } finally {
        setLoading(false);
      }
    };

    scanEmergencyHubs();
  }, [location, geoInfo]);

  const handleDial = (number: string) => {
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert('Unsupported', 'Voice calls not supported on this vehicle infotainment dashboard.');
    });
  };

  const handleNavigate = (em: EmergencyLocation) => {
    const latLng = `${em.lat},${em.lng}`;
    const label = encodeURIComponent(em.name);
    
    const url = Platform.select({
      ios: `maps://0,0?q=${label}@${latLng}`,
      android: `geo:0,0?q=${latLng}(${label})`
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${em.lat},${em.lng}`);
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* HEADER SECTION */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color={CAR_COLORS.danger} size={24} />
          <Text style={styles.headerText}>BACK</Text>
        </TouchableOpacity>
        
        <View style={styles.telemetryBox}>
          <Compass size={14} color={CAR_COLORS.accent} />
          <Text style={styles.telemetryText}>
            {address ? `${address.city.toUpperCase()} • JURISDICTION STATE ${address.state.toUpperCase()}` : 'COIMBATORE • JURISDICTION STATE TN'}
          </Text>
        </View>

        <Text style={styles.headerTitle}>ROADSOS HUD</Text>
      </View>

      {/* OFFLINE STATUS BANNER */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <AlertTriangle size={16} color="#FFD600" />
          <Text style={styles.offlineText}>
            OFFLINE FALLBACK STATE • DISPLAYING NEAREST CACHED HOTLINES
          </Text>
        </View>
      )}

      {/* MAIN CAR HUD DISCOVERY BODY */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={CAR_COLORS.danger} />
            <Text style={styles.loadingText}>SCANNING 10KM EMERGENCY SPECTRUM...</Text>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            
            {/* 🚔 POLICE CARD */}
            <View style={[styles.sosCard, { borderColor: '#3B82F633' }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
                  <Shield size={24} color="#3B82F6" />
                </View>
                <View style={styles.infoBox}>
                  <Text style={styles.cardCategory}>🚔 NEAREST POLICE FORCE</Text>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {nearestPolice ? nearestPolice.name : 'State Traffic Police Direct'}
                  </Text>
                  <Text style={styles.cardAddress} numberOfLines={1}>
                    {nearestPolice ? nearestPolice.address : 'Compounded highway safety force'}
                  </Text>
                </View>
                {nearestPolice && (
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>{nearestPolice.distance} KM</Text>
                  </View>
                )}
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={[styles.sosButton, styles.callBtn]}
                  onPress={() => handleDial(nearestPolice?.phone || '100')}
                >
                  <Phone size={22} color="#00E5FF" />
                  <Text style={[styles.btnText, { color: '#00E5FF' }]}>DIAL CALL</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.sosButton, styles.navBtn, { backgroundColor: '#3B82F6' }]}
                  onPress={() => nearestPolice ? handleNavigate(nearestPolice) : handleDial('100')}
                >
                  <Navigation size={22} color="#FFFFFF" />
                  <Text style={[styles.btnText, { color: '#FFFFFF' }]}>NAVIGATE</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 🏥 HOSPITAL CARD */}
            <View style={[styles.sosCard, { borderColor: '#10B98133' }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
                  <Heart size={24} color="#10B981" />
                </View>
                <View style={styles.infoBox}>
                  <Text style={styles.cardCategory}>🏥 NEAREST MEDICAL TRAUMA</Text>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {nearestHospital ? nearestHospital.name : 'Municipal General Hospital'}
                  </Text>
                  <Text style={styles.cardAddress} numberOfLines={1}>
                    {nearestHospital ? nearestHospital.address : '24/7 medical response center'}
                  </Text>
                </View>
                {nearestHospital && (
                  <View style={[styles.distanceBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Text style={[styles.distanceText, { color: '#10B981' }]}>{nearestHospital.distance} KM</Text>
                  </View>
                )}
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={[styles.sosButton, styles.callBtn]}
                  onPress={() => handleDial(nearestHospital?.phone || '108')}
                >
                  <Phone size={22} color="#00E5FF" />
                  <Text style={[styles.btnText, { color: '#00E5FF' }]}>DIAL CALL</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.sosButton, styles.navBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => nearestHospital ? handleNavigate(nearestHospital) : handleDial('108')}
                >
                  <Navigation size={22} color="#FFFFFF" />
                  <Text style={[styles.btnText, { color: '#FFFFFF' }]}>NAVIGATE</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 🚒 FIRE BRIGADE CARD */}
            <View style={[styles.sosCard, { borderColor: '#EF444433' }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}>
                  <Flame size={24} color="#EF4444" />
                </View>
                <View style={styles.infoBox}>
                  <Text style={styles.cardCategory}>🚒 NEAREST FIRE STATION</Text>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {nearestFire ? nearestFire.name : 'Municipal Fire Brigade'}
                  </Text>
                  <Text style={styles.cardAddress} numberOfLines={1}>
                    {nearestFire ? nearestFire.address : 'Rescue and emergency patrol'}
                  </Text>
                </View>
                {nearestFire && (
                  <View style={[styles.distanceBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <Text style={[styles.distanceText, { color: '#EF4444' }]}>{nearestFire.distance} KM</Text>
                  </View>
                )}
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={[styles.sosButton, styles.callBtn]}
                  onPress={() => handleDial(nearestFire?.phone || '101')}
                >
                  <Phone size={22} color="#00E5FF" />
                  <Text style={[styles.btnText, { color: '#00E5FF' }]}>DIAL CALL</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.sosButton, styles.navBtn, { backgroundColor: '#EF4444' }]}
                  onPress={() => nearestFire ? handleNavigate(nearestFire) : handleDial('101')}
                >
                  <Navigation size={22} color="#FFFFFF" />
                  <Text style={[styles.btnText, { color: '#FFFFFF' }]}>NAVIGATE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.circularSosButton, { backgroundColor: '#FF1744' }]}
          onPress={() => handleDial('112')}
        >
          <Phone color="#FFFFFF" size={32} />
          <Text style={styles.circularSosLabel}>112 UNIFIED SOS</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.circularSosButton, { backgroundColor: '#F59E0B' }]}
          onPress={() => handleDial('1033')}
        >
          <Navigation color="#FFFFFF" size={32} />
          <Text style={styles.circularSosLabel}>1033 HIGHWAY HELP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: CAR_SPACING.padding,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    gap: 4,
  },
  headerText: {
    color: CAR_COLORS.danger,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  telemetryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0C1424',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E3255',
  },
  telemetryText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: CAR_COLORS.danger,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 214, 0, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 214, 0, 0.25)',
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
  },
  offlineText: {
    color: '#FFD600',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  scrollContent: {
    paddingVertical: 12,
  },
  loadingBox: {
    paddingVertical: 64,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cardsContainer: {
    gap: 16,
  },

  // Huge Car SOS Cards
  sosCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    flex: 1,
  },
  cardCategory: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  cardAddress: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  distanceBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  distanceText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '900',
  },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1.5,
    borderTopColor: '#1A293E',
    paddingTop: 12,
  },
  sosButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 8,
    gap: 8,
  },
  callBtn: {
    backgroundColor: '#111C31',
    borderWidth: 1.5,
    borderColor: '#1F3456',
  },
  navBtn: {
    elevation: 4,
  },
  btnText: {
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // Infotainment footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    height: 80,
    marginTop: 12,
  },
  circularSosButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    gap: 10,
    elevation: 8,
  },
  circularSosLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

export default CarEmergencyScreen;
