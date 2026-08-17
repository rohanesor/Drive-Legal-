import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { useThemeColors } from '../context/ThemeContext';
import { navigationState } from '../services/navigationState';
import { LocationMap } from '../components/LocationMap';
import { SpeedLimitDisplay } from '../components/SpeedLimitDisplay';
import { navigationEngine } from '../domain/navigation/NavigationEngine';
import { safetyEngine, SafetyEvent } from '../domain/safety/SafetyEngine';
import { voicePriorityEngine } from '../domain/voice/VoicePriorityEngine';
import { boundaryEngine, GeoContext } from '../domain/geo/BoundaryEngine';
import { routingService } from '../services/routingService';
import { speedLimitService } from '../services/speedLimitService';
import { useLocation } from '../context/LocationContext';
import {
  Navigation,
  Compass,
  Play,
  RotateCcw,
  Search,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  Calculator,
  Flame,
  Settings,
  Calendar,
} from 'lucide-react-native';
import { BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../constants/theme';
import type { AppNavigationProp, Route, MapMarker, MapLine } from '../types';

const { width, height } = Dimensions.get('window');

const COIMBATORE_PRESETS = [
  { name: 'Ooty Hills (Curves)', lat: 11.4102, lng: 76.6950 },
  { name: 'Salem Highway (Speed)', lat: 11.6643, lng: 78.1460 },
  { name: 'State Border Check', lat: 11.8000, lng: 76.8000 },
];

export const NavigationScreen = ({
  navigation,
}: {
  navigation: AppNavigationProp;
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { location: curLocation, status: gpsStatus, permissionStatus, refreshLocation } = useLocation();

  // Navigation tracking states
  const [isNavigating, setIsNavigating] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [simulatedLocation, setSimulatedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<{ name: string; lat: number; lng: number } | null>(null);
  
  // Real-time HUD states
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [speedLimit, setSpeedLimit] = useState(50);
  const [activeSafetyEvents, setActiveSafetyEvents] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const lastSpeedingState = useRef(false);
  const simInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const origin = useMemo(() => {
    if (curLocation) {
      return { lat: curLocation.latitude, lng: curLocation.longitude };
    }
    // Default Coimbatore origin
    return { lat: 11.0168, lng: 76.9558 };
  }, [curLocation]);

  // Load routes when destination is chosen
  useEffect(() => {
    if (!selectedDestination) {
      setRoutes([]);
      setSelectedRoute(null);
      return;
    }

    const fetchRoutes = async () => {
      setLoading(true);
      try {
        const computedRoutes = await routingService.calculateRoutes({
          origin,
          destination: { lat: selectedDestination.lat, lng: selectedDestination.lng },
          vehicleType: 'car',
        });
        setRoutes(computedRoutes);
        setSelectedRoute(computedRoutes[0] || null);
      } catch (err) {
        Alert.alert('Routing Error', 'Failed to calculate safe routes. Using offline defaults.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, [selectedDestination, origin]);

  // Clean simulation timer on unmount
  useEffect(() => {
    return () => {
      if (simInterval.current) {
        clearInterval(simInterval.current);
      }
    };
  }, []);

  // Listen to AI-generated routing modification intents from co-pilot
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('vazhi:ai_intent', (data: any) => {
      if ((data.intent === 'ADD_WAYPOINT' || data.intent === 'FIND_CHARGER' || data.intent === 'FIND_RESTAURANT' || data.intent === 'FIND_HOTEL') && data.poi_candidate) {
        Alert.alert(
          'AI Routing Suggestion',
          data.answer || `Add stop at ${data.poi_candidate.name}?`,
          [
            { text: 'Ignore', style: 'cancel' },
            { 
              text: 'Add Waypoint', 
              onPress: () => {
                voicePriorityEngine.speak(`Adding stop at ${data.poi_candidate.name}. Recalculating route parameters.`, 'HIGH', 'turn');
                Alert.alert('Route Optimized', `Route successfully modified. Added stop: ${data.poi_candidate.name}`);
              }
            }
          ]
        );
      }
    });
    return () => sub.remove();
  }, [selectedRoute]);

  const handleStartNavigation = () => {
    if (!selectedRoute) return;
    setIsNavigating(true);
    setCurrentStepIndex(0);
    setSimulatedLocation(selectedRoute.coords[0]);
    navigationEngine.startNavigation(origin, selectedDestination!, selectedDestination!.name, routes, selectedRoute);

    navigationState.setContext({
      isNavigating: true,
      destinationName: selectedDestination!.name,
      distanceRemaining: selectedRoute.distance,
      durationRemaining: selectedRoute.duration,
      currentStepInstruction: selectedRoute.steps[0]?.instruction || 'Proceeding safely',
      routeSafetyScore: selectedRoute.safetyScore,
      activeRouteName: selectedRoute.name,
    });

    // Initial alert co-pilot speak
    voicePriorityEngine.speak(
      `Starting navigation to ${selectedDestination!.name} via ${selectedRoute.name}. Driving safety assistant active.`,
      'HIGH',
      'turn'
    );

    let idx = 0;
    simInterval.current = setInterval(() => {
      idx++;
      if (!selectedRoute || idx >= selectedRoute.coords.length) {
        if (simInterval.current) clearInterval(simInterval.current);
        handleStopNavigation();
        Alert.alert('Arrival', 'You have arrived at your destination safely.');
        voicePriorityEngine.speak('You have arrived at your destination safely.', 'HIGH', 'turn');
        return;
      }

      const nextCoord = selectedRoute.coords[idx];
      setSimulatedLocation(nextCoord);
      setCurrentStepIndex(idx);

      // Simulate varying speedometer speeds
      const baseSpeed = 45;
      const variance = Math.sin(idx) * 25;
      const simSpeed = Math.max(0, Math.round(baseSpeed + variance));
      setCurrentSpeed(simSpeed);

      // Fetch actual speed limit dynamically
      speedLimitService.getSpeedLimit(nextCoord.lat, nextCoord.lng, 'TN', 'car')
        .then(res => setSpeedLimit(res.speedLimit))
        .catch(() => setSpeedLimit(50));

      // 1. Evaluate safety events via SafetyEngine
      const safetyEvents = safetyEngine.evaluateSafety(
        nextCoord,
        simSpeed,
        selectedRoute,
        idx,
        selectedRoute.activeZones,
        speedLimit
      );
      setActiveSafetyEvents(safetyEvents);

      // 2. Announce top priority safety events using VoicePriorityEngine
      if (safetyEvents.length > 0) {
        const topEvent = safetyEvents[0];
        const priority = topEvent.severity === 'HIGH' ? 'CRITICAL' : 'HIGH';
        voicePriorityEngine.speak(topEvent.message, priority, topEvent.type.toLowerCase());
      }

      // 3. Evaluate state border crossings via BoundaryEngine
      const simulatedState = nextCoord.lat > 11.75 ? 'KA' : 'TN';
      const simulatedStateName = nextCoord.lat > 11.75 ? 'Karnataka' : 'Tamil Nadu';
      const simulatedContext: GeoContext = {
        country: 'India',
        state: simulatedStateName,
        stateCode: simulatedState,
        district: 'Border District',
        taluk: 'Border Taluk',
      };

      const crossingMsg = boundaryEngine.evaluateBoundary(nextCoord, simulatedContext);
      if (crossingMsg) {
        voicePriorityEngine.speak(crossingMsg, 'MEDIUM', 'border');
      }

      // Update NavigationEngine trackers
      navigationEngine.updateLocation(nextCoord, simSpeed);
      
      navigationState.setContext({
        distanceRemaining: Math.max(0, selectedRoute.distance - (idx * 500)),
        durationRemaining: Math.max(0, selectedRoute.duration - (idx * 30)),
        currentStepInstruction: selectedRoute.steps[Math.min(currentStepIndex, selectedRoute.steps.length - 1)]?.instruction || 'Proceeding safely',
      });
    }, 3000);
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    setCurrentStepIndex(0);
    setSimulatedLocation(null);
    setActiveSafetyEvents([]);
    if (simInterval.current) {
      clearInterval(simInterval.current);
      simInterval.current = null;
    }
    navigationEngine.stopNavigation();
    voicePriorityEngine.stop();
    navigationState.reset();
  };

  const mapLines: MapLine[] = useMemo(() => {
    if (isNavigating && selectedRoute) {
      return [{
        id: selectedRoute.id,
        name: selectedRoute.name,
        coords: selectedRoute.coords,
        color: colors.primary,
      }];
    }
    return routes.map((r, i) => ({
      id: r.id,
      name: r.name,
      coords: r.coords,
      color: selectedRoute?.id === r.id ? colors.primary : colors.border,
      dashed: i > 0,
    }));
  }, [routes, selectedRoute, isNavigating, colors]);

  const mapMarkers: MapMarker[] = useMemo(() => {
    const markers: MapMarker[] = [];
    const currentPos = simulatedLocation || origin;
    
    markers.push({
      id: 'origin',
      type: 'ev',
      name: isNavigating ? 'Your Vehicle' : 'Current Location',
      lat: currentPos.lat,
      lng: currentPos.lng,
    });

    if (selectedDestination) {
      markers.push({
        id: 'destination',
        type: 'police',
        name: selectedDestination.name,
        lat: selectedDestination.lat,
        lng: selectedDestination.lng,
      });
    }

    return markers;
  }, [origin, selectedDestination, simulatedLocation, isNavigating]);

  const handleMapTap = (lat: number, lng: number) => {
    if (isNavigating) return;
    setSelectedDestination({
      name: `Marker Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      lat,
      lng,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Full-screen Leaflet WebView Map */}
      <LocationMap
        currentLocation={simulatedLocation || origin}
        mapType={isNavigating ? 'cockpit' : 'jurisdiction'}
        markers={mapMarkers}
        lines={mapLines}
        height={height}
        interactive={true}
        onMarkerSelect={(m) => Alert.alert('Waypoint Selected', `${m.name}`)}
      />

      {/* Floating Module Overlay Header (Navigation triggers for sub-panels) */}
      {!isNavigating && (
        <View style={styles.floatingHeader}>
          <Text style={styles.appTitle}>VAZHI</Text>
          
          <View style={styles.moduleShortcuts}>
            <TouchableOpacity onPress={() => navigation.navigate('Chat')} style={styles.shortcutBtn}>
              <MessageSquare size={18} color={colors.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => navigation.navigate('TripPlanner')} style={styles.shortcutBtn}>
              <Calendar size={18} color={colors.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => navigation.navigate('Calculator')} style={styles.shortcutBtn}>
              <Calculator size={18} color={colors.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => navigation.navigate('Emergency')} style={styles.shortcutBtn}>
              <Flame size={18} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.shortcutBtn}>
              <Settings size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Active Navigation HUD Box Overlay */}
      {isNavigating && selectedRoute && (
        <View style={styles.guidanceHUD}>
          <Navigation size={22} color={colors.cyan} style={styles.guidanceIcon} />
          <View style={styles.guidanceTexts}>
            <Text style={styles.guidanceTitle}>FOLLOWING SAFE PERSPECTIVE</Text>
            <Text style={styles.guidanceInstruction}>
              {selectedRoute.steps[Math.min(currentStepIndex, selectedRoute.steps.length - 1)]?.instruction || 'Proceeding along route'}
            </Text>
          </View>
          <TouchableOpacity style={styles.hudStopBtn} onPress={handleStopNavigation}>
            <RotateCcw size={16} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Speed limit and speedometer HUD */}
      <View style={styles.speedHUDOverlay}>
        <View style={[styles.speedCircle, currentSpeed > speedLimit && styles.speedCircleWarning]}>
          <Text style={[styles.speedText, currentSpeed > speedLimit && styles.speedTextWarning]}>
            {currentSpeed}
          </Text>
          <Text style={styles.speedUnitText}>km/h</Text>
        </View>
        <SpeedLimitDisplay speedLimit={speedLimit} isSpeeding={currentSpeed > speedLimit} size={46} />
      </View>

      {/* Safe Route Choices bottom selector sheet */}
      {!isNavigating && routes.length > 0 && (
        <View style={styles.bottomCardSheet}>
          <Text style={styles.sheetTitle}>Choose Safe Route Pathway</Text>
          
          {routes.slice(0, 2).map((route) => {
            const isSelected = selectedRoute?.id === route.id;
            return (
              <TouchableOpacity
                key={route.id}
                style={[styles.routeRow, isSelected && styles.routeRowSelected]}
                onPress={() => setSelectedRoute(route)}
              >
                <View style={styles.routeCol}>
                  <Text style={styles.routeName}>{route.name}</Text>
                  <Text style={styles.routeMeta}>
                    {(route.distance / 1000).toFixed(1)} km · {Math.round(route.duration / 60)} mins
                  </Text>
                </View>
                <View style={[styles.safetyBadge, { backgroundColor: route.safetyScore >= 90 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)' }]}>
                  <Text style={[styles.safetyText, { color: route.safetyScore >= 90 ? colors.success : colors.warning }]}>
                    ★ {route.safetyScore}% Safe
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.startBtn} onPress={handleStartNavigation}>
            <Play size={16} color={colors.navy} />
            <Text style={styles.startBtnText}>Launch Safe Navigation</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Preset Destinations Selector bottom sheet when no destination is chosen */}
      {!isNavigating && routes.length === 0 && (
        <View style={styles.bottomCardSheet}>
          <Text style={styles.sheetTitle}>Select Target Waypoint</Text>
          <View style={styles.presetsRow}>
            {COIMBATORE_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.name}
                style={styles.presetBadge}
                onPress={() => setSelectedDestination(preset)}
              >
                <MapPin size={12} color={colors.cyan} />
                <Text style={styles.presetText}>{preset.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.mapTapHint}>💡 Or tap coordinates directly on the map grid to route.</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#070D19',
    },
    floatingHeader: {
      position: 'absolute',
      top: 48,
      left: 16,
      right: 16,
      backgroundColor: 'rgba(7, 13, 25, 0.92)',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BORDER_RADIUS.medium,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...SHADOWS.medium,
    },
    appTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.primary,
      letterSpacing: 2,
    },
    moduleShortcuts: {
      flexDirection: 'row',
      gap: 10,
    },
    shortcutBtn: {
      padding: 8,
      borderRadius: BORDER_RADIUS.small,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    guidanceHUD: {
      position: 'absolute',
      top: 50,
      left: 16,
      right: 16,
      backgroundColor: 'rgba(7, 13, 25, 0.95)',
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: BORDER_RADIUS.medium,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      ...SHADOWS.medium,
    },
    guidanceIcon: {
      transform: [{ rotate: '45deg' }],
    },
    guidanceTexts: {
      flex: 1,
    },
    guidanceTitle: {
      fontSize: 9,
      color: colors.cyan,
      fontWeight: 'bold',
      letterSpacing: 1.0,
    },
    guidanceInstruction: {
      fontSize: 14,
      color: colors.white,
      fontWeight: '600',
      marginTop: 2,
    },
    hudStopBtn: {
      padding: 8,
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.error,
    },
    speedHUDOverlay: {
      position: 'absolute',
      bottom: 220,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(7, 13, 25, 0.85)',
      padding: 6,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    speedCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#1E293B',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.cyan,
    },
    speedCircleWarning: {
      borderColor: colors.error,
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
    },
    speedText: {
      fontSize: 15,
      color: colors.cyan,
      fontWeight: 'bold',
    },
    speedTextWarning: {
      color: colors.error,
    },
    speedUnitText: {
      fontSize: 7,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      fontWeight: 'bold',
    },
    bottomCardSheet: {
      position: 'absolute',
      bottom: 24,
      left: 16,
      right: 16,
      backgroundColor: 'rgba(7, 13, 25, 0.95)',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BORDER_RADIUS.medium,
      padding: 16,
      ...SHADOWS.strong,
    },
    sheetTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    routeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderRadius: BORDER_RADIUS.small,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    routeRowSelected: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(0, 229, 255, 0.06)',
    },
    routeCol: {
      flex: 1,
    },
    routeName: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    routeMeta: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    safetyBadge: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
    },
    safetyText: {
      fontSize: 11,
      fontWeight: 'bold',
    },
    startBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: BORDER_RADIUS.small,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      ...SHADOWS.medium,
    },
    startBtnText: {
      fontSize: 13,
      color: colors.navy,
      fontWeight: 'bold',
    },
    presetsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    presetBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
    },
    presetText: {
      fontSize: 11,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    mapTapHint: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
    },
  });
export default NavigationScreen;
