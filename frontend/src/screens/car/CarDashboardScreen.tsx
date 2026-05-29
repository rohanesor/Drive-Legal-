import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar, 
  Alert, 
  Animated, 
  Easing, 
  Platform,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from '../../context/LocationContext';
import { useAppMode } from '../../hooks/useAppMode';
import { dismissAlert, addAlert } from '../../store/alertSlice';
import { RootState } from '../../store';
import { CAR_COLORS, CAR_TYPOGRAPHY, CAR_SPACING } from '../../constants/theme';
import { LocationMap, MapMarker, MapZone, MapLine } from '../../components/LocationMap';
import { 
  Mic, 
  MapPin, 
  AlertOctagon, 
  Phone, 
  Scale, 
  ArrowLeft, 
  CheckCircle,
  Wrench,
  Play,
  RotateCcw,
  Navigation as NavIcon,
  Compass,
  Activity,
  Shield,
  Map,
  Grid,
  Heart,
  Sliders
} from 'lucide-react-native';
import * as Haptic from 'react-native'; 



// Coimbatore base coordinates for GPS/simulation tracking
const BASE_LAT = 11.0168;
const BASE_LNG = 76.9558;

// Dynamic simulation coordinate checklist (Coimbatore City Loop)
const SIMULATED_ROUTE = [
  { latitude: 11.0168, longitude: 76.9558, heading: 42, speed: 25, limit: 40, label: 'Cross Cut Road (Drive Active)' },
  { latitude: 11.0175, longitude: 76.9565, heading: 45, speed: 38, limit: 40, label: 'Approaching Speed Cam' },
  { latitude: 11.0182, longitude: 76.9572, heading: 48, speed: 45, limit: 40, label: '⚠️ Speeding Infraction', event: 'speed_camera' },
  { latitude: 11.0190, longitude: 76.9580, heading: 52, speed: 56, limit: 40, label: 'Speed Camera Warning active', event: 'speed_camera' },
  { latitude: 11.0198, longitude: 76.9588, heading: 55, speed: 44, limit: 40, label: 'Slowing down, camera passed' },
  { latitude: 11.0205, longitude: 76.9595, heading: 60, speed: 35, limit: 40, label: 'Entering Sector 4' },
  { latitude: 11.0212, longitude: 76.9602, heading: 65, speed: 22, limit: 20, label: '🏥 Hospital Zone - strictly no honking', event: 'hospital_zone' },
  { latitude: 11.0218, longitude: 76.9608, heading: 70, speed: 15, limit: 20, label: 'Hospital Silent Zone active', event: 'hospital_zone' },
  { latitude: 11.0225, longitude: 76.9615, heading: 80, speed: 28, limit: 50, label: 'Approaching Inter-State Border' },
  { latitude: 11.0232, longitude: 76.9622, heading: 85, speed: 42, limit: 50, label: '🗺️ Crossed border into Karnataka', event: 'state_border' },
  { latitude: 11.0240, longitude: 76.9630, heading: 90, speed: 48, limit: 50, label: 'Active Jurisdiction changed', event: 'state_border' }
];

export const CarDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { switchMode } = useAppMode();
  const { location, geoInfo } = useLocation();

  // Active warning alerts
  const activeAlert = useSelector((state: RootState) => state.alerts.activeAlert);

  // Speed parameters
  const gpsSpeed = location && location.speed && location.speed > 0 
    ? Math.round(location.speed * 3.6) 
    : 0;

  // Cockpit map location state (replaces WebView postMessage)
  const [cockpitLocation, setCockpitLocation] = useState<{ lat: number; lng: number; heading?: number }>({ lat: BASE_LAT, lng: BASE_LNG, heading: 42 });

  // Cockpit map markers and lines
  const [cockpitMarkers] = useState<MapMarker[]>([
    { id: 'school_zone_1', type: 'warning', name: '🏥 School Silent Zone: 20 km/h', lat: 11.0212, lng: 76.9602 },
    { id: 'tow_zone_1', type: 'warning', name: '⚠️ Towing Area', lat: 11.0150, lng: 76.9530 },
    { id: 'toll_1', type: 'ev', name: '🎟️ FASTag Toll Gate', lat: 11.0225, lng: 76.9615 },
  ]);
  const [cockpitLines] = useState<MapLine[]>([
    { id: 'state_border_1', name: '🗺️ TN-KA State Border Line', coords: [
      { lat: 11.0230, lng: 76.9500 }, { lat: 11.0232, lng: 76.9622 }, { lat: 11.0235, lng: 76.9750 }
    ], color: '#FF1744', dashed: true },
  ]);

  // Dynamic States
  const [demoSpeed, setDemoSpeed] = useState(0);
  const [speedLimit, setSpeedLimit] = useState(40);
  const [activeTabOverlay, setActiveTabOverlay] = useState<'none' | 'parking' | 'fine' | 'debug' | 'alerts'>('none');
  const [simulatedRouteActive, setSimulatedRouteActive] = useState<string | null>(null);
  const [simStep, setSimStep] = useState(0);
  const [routeTrail, setRouteTrail] = useState<{ latitude: number, longitude: number }[]>([
    { latitude: BASE_LAT, longitude: BASE_LNG }
  ]);

  // Telemetry sensor calculations
  const [telemetry, setTelemetry] = useState({
    bearing: 42,
    direction: 'NE',
    altitude: 411,
    satellites: 12,
    lat: BASE_LAT,
    lng: BASE_LNG
  });

  // Alert pulsing animations
  const alertPulse = useRef(new Animated.Value(1)).current;

  // Auto speed drift parameters
  const currentSpeed = gpsSpeed > 0 ? gpsSpeed : demoSpeed;
  const isSpeeding = currentSpeed > speedLimit;

  // Pulse effect loops
  useEffect(() => {
    let alertLoop: Animated.CompositeAnimation | null = null;
    if (isSpeeding || activeAlert) {
      alertLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(alertPulse, { toValue: 1.05, duration: 600, useNativeDriver: true }),
          Animated.timing(alertPulse, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ])
      );
      alertLoop.start();
    } else {
      alertPulse.setValue(1);
    }
    return () => {
      if (alertLoop) alertLoop.stop();
    };
  }, [isSpeeding, activeAlert]);

  // Real GPS tracking integration
  useEffect(() => {
    if (location && location.latitude && location.longitude && !simulatedRouteActive) {
      const lat = location.latitude;
      const lng = location.longitude;
      const heading = location.heading || 0;
      
      // Update telemetry
      setTelemetry(prev => ({
        ...prev,
        lat: lat,
        lng: lng,
        bearing: Math.round(heading),
        altitude: location.altitude ? Math.round(location.altitude) : prev.altitude,
      }));

      // Animate marker coordinates
      setCockpitLocation({ lat, lng, heading: Math.round(heading) });

      // Append route trail
      setRouteTrail(prev => {
        const last = prev[prev.length - 1];
        const dist = Math.hypot(last.latitude - lat, last.longitude - lng);
        if (dist > 0.0001) { // Only append if user moved at least 10 meters to save battery
          return [...prev, { latitude: lat, longitude: lng }];
        }
        return prev;
      });
    }
  }, [location, simulatedRouteActive]);

  // Smooth vector marker translation animation
  const animateCarMarker = (lat: number, lng: number, bearing: number) => {
    setCockpitLocation({ lat, lng, heading: bearing });
  };

  // Run automated GPS simulation loops
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (simulatedRouteActive) {
      interval = setInterval(() => {
        setSimStep(prevStep => {
          const nextStep = prevStep + 1;
          if (nextStep >= SIMULATED_ROUTE.length) {
            setRouteTrail([{ latitude: BASE_LAT, longitude: BASE_LNG }]);
            animateCarMarker(BASE_LAT, BASE_LNG, 42);
            return 0;
          }

          const node = SIMULATED_ROUTE[nextStep];
          setDemoSpeed(node.speed);
          setSpeedLimit(node.limit);

          // Update sensor telemetry
          setTelemetry(prev => ({
            ...prev,
            lat: node.latitude,
            lng: node.longitude,
            bearing: node.heading,
            direction: node.heading > 67.5 && node.heading <= 112.5 ? 'E' : 'NE'
          }));

          // Animate native car marker
          animateCarMarker(node.latitude, node.longitude, node.heading);

          // Append to route trail
          setRouteTrail(prev => [...prev, { latitude: node.latitude, longitude: node.longitude }]);

          // Proactive dynamic alerts trigger
          if (node.event === 'speed_camera') {
            dispatch(addAlert({
              id: 'mock_speed_alert',
              zone_type: 'speed_camera',
              zone_name: 'Cross Cut Road',
              message: '⚠️ Speed limit exceeded! Active speed camera ahead.',
              suggested_query: 'What is the speeding fine in Tamil Nadu?',
              severity: 'high',
              timestamp: Date.now(),
              dismissed: false,
            }));
          } else if (node.event === 'hospital_zone') {
            dispatch(addAlert({
              id: 'mock_hospital_alert',
              zone_type: 'hospital_zone',
              zone_name: 'CMC Hospital Area',
              message: '🏥 Hospital Zone. Speed limit restricted to 20 km/h. Strictly NO honking.',
              suggested_query: 'What is the fine for honking in a silent zone?',
              severity: 'high',
              timestamp: Date.now(),
              dismissed: false,
            }));
          } else if (node.event === 'state_border') {
            dispatch(addAlert({
              id: 'mock_border_alert',
              zone_type: 'state_border',
              zone_name: 'Entering Karnataka',
              message: '🗺️ Crossed border into Karnataka. Motor Vehicle law revisions are active.',
              suggested_query: 'What are the main rule changes in Karnataka?',
              severity: 'medium',
              timestamp: Date.now(),
              dismissed: false,
            }));
          }

          return nextStep;
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [simulatedRouteActive]);

  const triggerHapticFeedback = () => {
    try {
      if (Haptic.Platform.OS === 'android') {
        Haptic.Vibration.vibrate(45);
      }
    } catch (e) {}
  };

  const handleQuickActionPress = (action: () => void) => {
    triggerHapticFeedback();
    action();
  };

  // Launch Simulated Drive Scenarios
  const startSimulation = () => {
    triggerHapticFeedback();
    dispatch(dismissAlert());
    setRouteTrail([{ latitude: BASE_LAT, longitude: BASE_LNG }]);
    setSimStep(0);
    setSimulatedRouteActive('Coimbatore City Loop');
    setDemoSpeed(SIMULATED_ROUTE[0].speed);
    setSpeedLimit(SIMULATED_ROUTE[0].limit);
    
    // Update marker at base Coimbatore coordinates
    animateCarMarker(BASE_LAT, BASE_LNG, 42);
  };

  const resetSimulation = () => {
    triggerHapticFeedback();
    setSimulatedRouteActive(null);
    setSimStep(0);
    setDemoSpeed(0);
    setSpeedLimit(40);
    dispatch(dismissAlert());
    setRouteTrail([{ latitude: BASE_LAT, longitude: BASE_LNG }]);
    animateCarMarker(BASE_LAT, BASE_LNG, 42);
  };

  const currentJurisdiction = simulatedRouteActive && SIMULATED_ROUTE[simStep].event === 'state_border'
    ? 'Chamarajanagar, KN'
    : geoInfo 
      ? `${geoInfo.city || geoInfo.district || 'Coimbatore'}, ${geoInfo.stateCode || 'TN'}` 
      : 'Coimbatore, TN';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* HEADER SECTION */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => handleQuickActionPress(() => {
            Alert.alert(
              'Exit Car Mode?',
              'Are you sure you want to switch back to Mobile Mode?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Exit Mode', onPress: () => switchMode('mobile') }
              ]
            );
          })}
        >
          <ArrowLeft color={CAR_COLORS.accent} size={20} />
          <Text style={styles.headerText}>MOBILE MODE</Text>
        </TouchableOpacity>

        <View style={styles.brandTitleContainer}>
          <Text style={styles.brandAccent}>DRIVE</Text>
          <Text style={styles.brandTitle}>COCKPIT</Text>
        </View>

        {/* Simulation Control Trigger */}
        <TouchableOpacity
          style={[
            styles.debugPill,
            { borderColor: simulatedRouteActive ? CAR_COLORS.success : '#262626' }
          ]}
          onPress={() => handleQuickActionPress(() => setActiveTabOverlay(activeTabOverlay === 'debug' ? 'none' : 'debug'))}
        >
          <Wrench color={simulatedRouteActive ? CAR_COLORS.success : CAR_COLORS.textSecondary} size={15} />
          <Text style={[
            styles.debugPillText,
            { color: simulatedRouteActive ? CAR_COLORS.success : CAR_COLORS.textSecondary }
          ]}>
            {simulatedRouteActive ? 'SIM ACTIVE' : 'SIMULATE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* SECTION 1: LIVE NAVIGATION GOOGLE-MAPS STYLE MAP (35% HEIGHT) */}
      <View style={styles.mapWrapper}>
        <LocationMap
          currentLocation={{ lat: cockpitLocation.lat, lng: cockpitLocation.lng, heading: cockpitLocation.heading }}
          mapType="cockpit"
          markers={cockpitMarkers}
          lines={cockpitLines}
          height={Dimensions.get('window').height * 0.35}
          interactive={true}
          forceWebView={true}
        />

        {/* Small live telemetry overlay badge */}
        <View style={styles.mapStatusBadge}>
          <Activity size={12} color={CAR_COLORS.accent} />
          <Text style={styles.mapStatusText}>
            GPS FIXED • SATS {telemetry.satellites}
          </Text>
        </View>
      </View>

      {/* SECTION 2: SPEEDOMETER CARD */}
      <View style={styles.dashboardGrid}>
        <View style={[
          styles.speedometerCard,
          { borderColor: isSpeeding ? CAR_COLORS.danger : '#1E293B' }
        ]}>
          <View style={styles.speedCol}>
            <Text style={styles.speedLabel}>SPEED</Text>
            <Text style={[
              styles.speedNumber,
              { color: isSpeeding ? CAR_COLORS.danger : '#FFFFFF' }
            ]}>
              {currentSpeed}
            </Text>
            <Text style={styles.speedUnit}>km/h</Text>
          </View>
          
          <View style={styles.limitCol}>
            <View style={[
              styles.circularSpeedLimitSign,
              isSpeeding && { borderColor: CAR_COLORS.danger }
            ]}>
              <Text style={[styles.speedLimitNumberText, isSpeeding && { color: CAR_COLORS.danger }]}>
                {speedLimit}
              </Text>
            </View>
            <Text style={styles.speedLimitLabel}>MAX LIMIT</Text>
          </View>
        </View>
      </View>

      {/* SECTION 3: DRIVESHIELD ALERTS PANEL */}
      <View style={styles.advisoryWrapper}>
        <Animated.View style={[
          styles.advisoryPanel,
          { 
            borderColor: isSpeeding 
              ? CAR_COLORS.danger 
              : activeAlert 
                ? CAR_COLORS.warning 
                : '#1E293B',
            backgroundColor: isSpeeding 
              ? 'rgba(255, 23, 68, 0.08)' 
              : activeAlert 
                ? 'rgba(255, 214, 0, 0.05)' 
                : '#0A0A0C',
            transform: [{ scale: alertPulse }]
          }
        ]}>
          {isSpeeding ? (
            <View style={styles.advisoryContentRow}>
              <AlertOctagon color={CAR_COLORS.danger} size={22} />
              <View style={styles.advisoryTextBox}>
                <Text style={[styles.advisoryTitle, { color: CAR_COLORS.danger }]}>DRIVESHIELD SPEED ALERT</Text>
                <Text style={styles.advisoryDesc}>exceeding {speedLimit} km/h legal limit. Slow down!</Text>
              </View>
            </View>
          ) : activeAlert ? (
            <TouchableOpacity 
              style={styles.advisoryContentRow}
              onPress={() => handleQuickActionPress(() => navigation.navigate('CarAlert', activeAlert))}
              activeOpacity={0.9}
            >
              <AlertOctagon color={CAR_COLORS.warning} size={22} />
              <View style={styles.advisoryTextBox}>
                <Text style={[styles.advisoryTitle, { color: CAR_COLORS.warning }]}>
                  {activeAlert.zone_name.toUpperCase()} ZONE
                </Text>
                <Text style={styles.advisoryDesc}>{activeAlert.message}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.advisoryContentRow}>
              <CheckCircle color={CAR_COLORS.success} size={22} />
              <View style={styles.advisoryTextBox}>
                <Text style={[styles.advisoryTitle, { color: CAR_COLORS.success }]}>DRIVESHIELD ACTIVE</Text>
                <Text style={styles.advisoryDesc}>Location: {currentJurisdiction}. Speed bounds normal.</Text>
              </View>
            </View>
          )}
        </Animated.View>
      </View>

      {/* SECTION 4: QUICK ACTIONS ROW (ANDROID AUTO STYLE HUD FOOTER) */}
      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={[styles.circularActionButton, { backgroundColor: CAR_COLORS.accent }]}
          onPress={() => handleQuickActionPress(() => navigation.navigate('CarVoice'))}
        >
          <Mic color="#000000" size={28} />
          <Text style={styles.buttonLabel}>TALK</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.circularActionButton, 
            { backgroundColor: '#111827', borderColor: activeTabOverlay === 'parking' ? CAR_COLORS.accent : '#1F2937', borderWidth: 2 }
          ]}
          onPress={() => handleQuickActionPress(() => setActiveTabOverlay(activeTabOverlay === 'parking' ? 'none' : 'parking'))}
        >
          <MapPin color={CAR_COLORS.accent} size={28} />
          <Text style={styles.buttonLabel}>PARK</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.circularActionButton, 
            { backgroundColor: '#111827', borderColor: activeTabOverlay === 'fine' ? CAR_COLORS.accent : '#1F2937', borderWidth: 2 }
          ]}
          onPress={() => handleQuickActionPress(() => setActiveTabOverlay(activeTabOverlay === 'fine' ? 'none' : 'fine'))}
        >
          <Scale color={CAR_COLORS.accent} size={28} />
          <Text style={styles.buttonLabel}>FINEIQ</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.circularActionButton, { backgroundColor: CAR_COLORS.danger }]}
          onPress={() => handleQuickActionPress(() => navigation.navigate('CarEmergency'))}
        >
          <Phone color="#FFFFFF" size={28} />
          <Text style={styles.buttonLabel}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* ────────────────────────────────────────────────────────
          Bottom sheet and simulation modals
         ──────────────────────────────────────────────────────── */}
      
      {activeTabOverlay === 'debug' && (
        <View style={styles.overlayBottomCard}>
          <View style={styles.overlayHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Wrench color={CAR_COLORS.accent} size={20} />
              <Text style={styles.overlayTitle}>RoadMind Simulation Hub</Text>
            </View>
            <TouchableOpacity 
              style={styles.closeOverlayButton}
              onPress={() => handleQuickActionPress(() => setActiveTabOverlay('none'))}
            >
              <Text style={styles.closeOverlayText}>DISMISS</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.overlayIntro}>Select an automotive route simulation to test real-time Google Maps coordinates & alerts:</Text>
          
          <View style={styles.simButtonsContainer}>
            <TouchableOpacity 
              style={[styles.simButton, { borderColor: CAR_COLORS.accent }]}
              onPress={() => {
                setActiveTabOverlay('none');
                startSimulation();
              }}
            >
              <Play size={16} color={CAR_COLORS.accent} />
              <View>
                <Text style={styles.simButtonText}>Coimbatore City Loop Run</Text>
                <Text style={styles.simButtonSub}>Fires speeding cams, silent hospital zones & border laws</Text>
              </View>
            </TouchableOpacity>
          </View>

          {simulatedRouteActive && (
            <TouchableOpacity 
              style={styles.resetSimBtn}
              onPress={resetSimulation}
            >
              <RotateCcw size={16} color="#FFFFFF" />
              <Text style={styles.resetSimText}>TERMINATE ACTIVE SIMULATION</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* FineIQ quick panel */}
      {activeTabOverlay === 'fine' && (
        <View style={styles.overlayBottomCard}>
          <View style={styles.overlayHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Scale color={CAR_COLORS.accent} size={20} />
              <Text style={styles.overlayTitle}>FineIQ Reference Table</Text>
            </View>
            <TouchableOpacity 
              style={styles.closeOverlayButton}
              onPress={() => handleQuickActionPress(() => setActiveTabOverlay('none'))}
            >
              <Text style={styles.closeOverlayText}>DISMISS</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.fineListItem}>
            <Text style={styles.fineListTitle}>Driving without Helmet / Belt</Text>
            <Text style={styles.fineListCost}>₹1,000</Text>
          </View>
          <View style={styles.fineListItem}>
            <Text style={styles.fineListTitle}>Jump Red Traffic Signal</Text>
            <Text style={styles.fineListCost}>₹500</Text>
          </View>
          <View style={styles.fineListItem}>
            <Text style={styles.fineListTitle}>Speed Infraction (LMV)</Text>
            <Text style={styles.fineListCost}>₹1,000</Text>
          </View>
          <View style={styles.fineListItem}>
            <Text style={styles.fineListTitle}>Using Mobile While Driving</Text>
            <Text style={styles.fineListCost}>₹5,000</Text>
          </View>
        </View>
      )}

      {/* Local parking rules panel */}
      {activeTabOverlay === 'parking' && (
        <View style={styles.overlayBottomCard}>
          <View style={styles.overlayHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MapPin color={CAR_COLORS.accent} size={20} />
              <Text style={styles.overlayTitle}>Local Parking Guidelines</Text>
            </View>
            <TouchableOpacity 
              style={styles.closeOverlayButton}
              onPress={() => handleQuickActionPress(() => setActiveTabOverlay('none'))}
            >
              <Text style={styles.closeOverlayText}>DISMISS</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.parkingRuleBullet}>📍 Strict towing restrictions inside commercial streets.</Text>
          <Text style={styles.parkingRuleBullet}>📍 Wrong-side stopping fee: ₹500 + dynamic towing charges.</Text>
          <Text style={styles.parkingRuleBullet}>📍 No stopping within 15 meters of designated silent hospital zones.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    height: 52,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
  },
  headerText: {
    color: CAR_COLORS.accent,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  brandTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandAccent: {
    color: CAR_COLORS.accent,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    marginLeft: 3,
    letterSpacing: 1,
  },
  debugPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 4,
  },
  debugPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Map 35% height Section
  mapWrapper: {
    height: '35%',
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    position: 'relative',
    marginVertical: 4,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapStatusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  mapStatusText: {
    color: CAR_COLORS.accent,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  mapIconMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  carCursorContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carCursorInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderWidth: 2,
    borderColor: '#00E5FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  navArrowStyle: {
    transform: [{ rotate: '180deg' }],
  },

  // Speedometer section
  dashboardGrid: {
    width: '100%',
  },
  speedometerCard: {
    flexDirection: 'row',
    backgroundColor: '#0A0A0E',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 84,
  },
  speedCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  speedLabel: {
    color: CAR_COLORS.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  speedNumber: {
    fontSize: 48,
    fontWeight: '900',
  },
  speedUnit: {
    color: CAR_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  limitCol: {
    alignItems: 'center',
  },
  circularSpeedLimitSign: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 4.5,
    borderColor: '#FF1744',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  speedLimitNumberText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
  },
  speedLimitLabel: {
    color: CAR_COLORS.textSecondary,
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // DriveShield Alert panels
  advisoryWrapper: {
    width: '100%',
  },
  advisoryPanel: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 14,
    height: 58,
    justifyContent: 'center',
  },
  advisoryContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  advisoryTextBox: {
    flex: 1,
  },
  advisoryTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  advisoryDesc: {
    color: '#D1D5DB',
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 1,
  },

  // Bottom action bar targets
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 80,
  },
  circularActionButton: {
    width: CAR_SPACING.touchTarget - 12,
    height: CAR_SPACING.touchTarget - 12,
    borderRadius: (CAR_SPACING.touchTarget - 12) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // Modal sheets
  overlayBottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0A0E17',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 2.5,
    borderTopColor: CAR_COLORS.accent,
    padding: 16,
    elevation: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  overlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 10,
    marginBottom: 10,
  },
  overlayTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  closeOverlayButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  closeOverlayText: {
    color: CAR_COLORS.accent,
    fontSize: 10,
    fontWeight: 'bold',
  },
  overlayIntro: {
    color: '#A3A3A3',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 12,
  },
  simButtonsContainer: {
    gap: 10,
    marginBottom: 8,
  },
  simButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#050912',
    gap: 10,
  },
  simButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  simButtonSub: {
    color: '#666666',
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
  },
  resetSimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CAR_COLORS.danger,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
    gap: 6,
  },
  resetSimText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0.5,
  },

  fineListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1E293B',
  },
  fineListTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  fineListCost: {
    color: CAR_COLORS.accent,
    fontSize: 11,
    fontWeight: '900',
  },
  parkingRuleBullet: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '500',
    marginVertical: 4,
    lineHeight: 16,
  },
});

export default CarDashboardScreen;
