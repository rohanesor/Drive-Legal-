import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Alert,
  NativeModules,
} from 'react-native';
import { useLocation } from '../context/LocationContext';
import { routingService } from '../services/routingService';
import { navigationState } from '../services/navigationState';
import { speedLimitService } from '../services/speedLimitService';
import { SpeedLimitDisplay } from '../components/SpeedLimitDisplay';
import { useThemeColors } from '../context/ThemeContext';
import { LocationMap, MapMarker, MapLine, MapZone } from '../components/LocationMap';
import {
  MapPin,
  Search,
  Compass,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  Navigation,
  Info,
} from 'lucide-react-native';
import type { AppNavigationProp, Route, MapLocation } from '../types';
import { TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../constants/theme';

// Preset locations in Coimbatore for navigation search bootstrapping
const COIMBATORE_PRESETS = [
  { name: 'Gandhipuram Bus Stand', lat: 11.0183, lng: 76.9686 },
  { name: 'Coimbatore Railway Station', lat: 10.9989, lng: 76.9625 },
  { name: 'Coimbatore International Airport', lat: 11.0303, lng: 77.0434 },
  { name: 'Integrated Court Complex', lat: 11.0028, lng: 76.9744 },
];

export const NavigationScreen = ({
  navigation,
}: {
  navigation: AppNavigationProp;
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const { location: curLocation, status: gpsStatus, permissionStatus, refreshLocation } = useLocation();

  // Search & Navigation states
  const [searchText, setSearchText] = useState('');
  const [selectedDestination, setSelectedDestination] = useState<typeof COIMBATORE_PRESETS[0] | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [simulatedLocation, setSimulatedLocation] = useState<MapLocation | null>(null);

  // Speed Limit Awareness states
  const [speedLimit, setSpeedLimit] = useState(50); // Default to 50 km/h
  const [speedLimitSource, setSpeedLimitSource] = useState<'osm' | 'default' | 'cached' | 'unknown'>('default');
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const lastSpeedingState = useRef(false);

  // Default coordinate fallback if GPS not loaded
  const origin: MapLocation = useMemo(() => {
    if (curLocation) {
      return { lat: curLocation.latitude, lng: curLocation.longitude };
    }
    return { lat: 11.0168, lng: 76.9558 }; // Coimbatore default
  }, [curLocation]);

  // Compute speeding status
  const isSpeeding = useMemo(() => {
    return speedLimit > 0 && currentSpeed > speedLimit;
  }, [currentSpeed, speedLimit]);

  // Query speed limit for current GPS location if not navigating
  useEffect(() => {
    if (isNavigating) return;
    if (!origin || (origin.lat === 11.0168 && origin.lng === 76.9558)) return;

    const queryLimit = async () => {
      try {
        const res = await speedLimitService.getSpeedLimit(origin.lat, origin.lng, 'TN', 'car');
        setSpeedLimit(res.speedLimit);
        setSpeedLimitSource(res.source);
      } catch (err) {
        setSpeedLimit(0);
        setSpeedLimitSource('unknown');
      }
    };
    queryLimit();
  }, [origin, isNavigating]);

  // Track GPS speed when not navigating
  useEffect(() => {
    if (isNavigating) return;
    if (curLocation && curLocation.speed !== undefined && curLocation.speed !== null) {
      // GPS speed is in m/s, convert to km/h
      setCurrentSpeed(Math.round(curLocation.speed * 3.6));
    } else {
      setCurrentSpeed(0);
    }
  }, [curLocation, isNavigating]);

  // Trigger audio alert when speeding starts
  useEffect(() => {
    if (isSpeeding && !lastSpeedingState.current) {
      const warningText = `Warning: Speed limit is ${speedLimit} km/h. Your current speed is ${currentSpeed} km/h. Please slow down.`;
      const { DriveLegalTTS } = NativeModules;
      if (DriveLegalTTS) {
        try {
          DriveLegalTTS.speak(warningText);
        } catch (e) {
          console.warn('[Speed Awareness] TTS speak failed:', e);
        }
      } else {
        console.log('[Speed Awareness] Speak Alert:', warningText);
      }
    }
    lastSpeedingState.current = isSpeeding;
  }, [isSpeeding, speedLimit, currentSpeed]);

  // Load routes when destination is selected
  useEffect(() => {
    if (!selectedDestination) {
      setRoutes([]);
      setSelectedRoute(null);
      return;
    }

    const fetchRoutes = async () => {
      setLoading(true);
      try {
        const destCoords = { lat: selectedDestination.lat, lng: selectedDestination.lng };
        const computedRoutes = await routingService.calculateRoutes({
          origin,
          destination: destCoords,
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

  // Handle Simulated Navigation timer
  useEffect(() => {
    if (!isNavigating || !selectedRoute) {
      setSimulatedLocation(null);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStepIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= selectedRoute.coords.length) {
          clearInterval(interval);
          setIsNavigating(false);
          navigationState.reset();
          Alert.alert('Arrival', 'You have arrived at your destination safely.');
          return prevIndex;
        }
        
        // Move simulated location marker forward along coordinate sequence
        const nextCoord = selectedRoute.coords[nextIndex];
        setSimulatedLocation(nextCoord);

        // Fetch speed limit dynamically for simulated location
        speedLimitService.getSpeedLimit(nextCoord.lat, nextCoord.lng, 'TN', 'car')
          .then(res => {
            setSpeedLimit(res.speedLimit);
            setSpeedLimitSource(res.source);
          })
          .catch(() => {
            setSpeedLimit(0);
            setSpeedLimitSource('unknown');
          });

        // Simulate fluctuating speedometer speed (e.g. 25km/h to 65km/h)
        const baseSpeed = 45;
        const variance = Math.sin(nextIndex) * 20;
        const simSpeed = Math.round(baseSpeed + variance);
        setCurrentSpeed(simSpeed);

        // Calculate stats for AI contextual lookup
        const remainingSteps = selectedRoute.steps.slice(Math.min(nextIndex, selectedRoute.steps.length - 1));
        const distanceRemaining = remainingSteps.reduce((acc, step) => acc + step.distance, 0);
        const durationRemaining = remainingSteps.reduce((acc, step) => acc + step.duration, 0);
        const currentStepInstruction = selectedRoute.steps[Math.min(nextIndex, selectedRoute.steps.length - 1)]?.instruction || '';

        navigationState.setContext({
          distanceRemaining,
          durationRemaining,
          currentStepInstruction
        });

        return nextIndex;
      });
    }, 3000); // Progress along route every 3 seconds

    return () => clearInterval(interval);
  }, [isNavigating, selectedRoute]);

  const handleStartNavigation = () => {
    if (!selectedRoute) return;
    setIsNavigating(true);
    setCurrentStepIndex(0);
    setSimulatedLocation(selectedRoute.coords[0]);

    // Share initial navigation frame details with global tracker
    navigationState.setContext({
      isNavigating: true,
      destinationName: selectedDestination?.name || 'Destination',
      distanceRemaining: selectedRoute.distance,
      durationRemaining: selectedRoute.duration,
      currentStepInstruction: selectedRoute.steps[0]?.instruction || '',
      routeSafetyScore: selectedRoute.safetyScore,
      activeRouteName: selectedRoute.name
    });
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    setCurrentStepIndex(0);
    setSimulatedLocation(null);
    navigationState.reset();
  };

  // Convert Route coordinates to MapLine structures
  const mapLines: MapLine[] = useMemo(() => {
    if (isNavigating && selectedRoute) {
      // Return route line
      return [{
        id: selectedRoute.id,
        name: selectedRoute.name,
        coords: selectedRoute.coords,
        color: colors.primary,
      }];
    }
    
    // Draw all routes in comparison mode (Recommended vs Alternative)
    return routes.map((r, i) => ({
      id: r.id,
      name: r.name,
      coords: r.coords,
      color: selectedRoute?.id === r.id ? colors.primary : colors.border,
      dashed: i > 0,
    }));
  }, [routes, selectedRoute, isNavigating, colors]);

  // Convert markers to MapMarker structure
  const mapMarkers: MapMarker[] = useMemo(() => {
    const markers: MapMarker[] = [];
    
    // 1. Add current location or simulated vehicle pointer
    const currentPos = simulatedLocation || origin;
    markers.push({
      id: 'origin',
      type: 'ev',
      name: isNavigating ? 'Your Vehicle' : 'Current Location',
      lat: currentPos.lat,
      lng: currentPos.lng,
    });

    // 2. Add destination marker
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

  // Intercept map taps to select destination directly
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
      <StatusBar backgroundColor={colors.navy} barStyle="light-content" />

      {/* Map HUD Frame */}
      <View style={styles.mapFrame}>
        <LocationMap
          currentLocation={simulatedLocation || origin}
          mapType="jurisdiction"
          markers={mapMarkers}
          lines={mapLines}
          height={320}
          interactive={true}
        />
        
        {/* Navigation Guidance overlay */}
        {isNavigating && selectedRoute && (
          <View style={styles.guidanceHUD}>
            <Navigation size={24} color={colors.cyan} style={styles.guidanceIcon} />
            <View style={styles.guidanceTexts}>
              <Text style={styles.guidanceTitle}>Navigation Active</Text>
              <Text style={styles.guidanceInstruction}>
                {selectedRoute.steps[Math.min(currentStepIndex, selectedRoute.steps.length - 1)]?.instruction || 'Proceeding along safe route'}
              </Text>
            </View>
            <TouchableOpacity style={styles.hudStopBtn} onPress={handleStopNavigation}>
              <RotateCcw size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Speedometer & Speed Limit Display Overlay */}
        <View style={styles.speedHUDOverlay}>
          <View style={[styles.speedCircle, isSpeeding && styles.speedCircleWarning]}>
            <Text style={[styles.speedText, isSpeeding && styles.speedTextWarning]}>
              {currentSpeed}
            </Text>
            <Text style={styles.speedUnitText}>km/h</Text>
          </View>
          {speedLimit > 0 ? (
            <SpeedLimitDisplay speedLimit={speedLimit} isSpeeding={isSpeeding} size={50} />
          ) : (
            <View style={styles.unknownSpeedSign}>
              <Text style={styles.unknownSpeedText}>LIMIT</Text>
              <Text style={styles.unknownSpeedTextSub}>N/A</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollContent}>
        {/* Location Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Compass size={18} color={colors.cyan} />
            <Text style={styles.infoLabel}>GPS Status:</Text>
            <Text style={styles.infoValue}>{gpsStatus}</Text>
          </View>
          <View style={styles.infoRow}>
            <Info size={18} color={colors.primary} />
            <Text style={styles.infoLabel}>Accuracy:</Text>
            <Text style={styles.infoValue}>
              {permissionStatus === 'granted' ? 'High (GPS Locked)' : 'Low (Permission Denied)'}
            </Text>
            {permissionStatus !== 'granted' && (
              <TouchableOpacity onPress={() => refreshLocation(true)} style={styles.refreshBtn}>
                <Text style={styles.refreshBtnText}>Authorize</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Destination Selection Section */}
        {!isNavigating && (
          <>
            <View style={styles.sectionHeader}>
              <Search size={18} color={colors.textPrimary} />
              <Text style={styles.sectionTitle}>Select Destination</Text>
            </View>

            {/* Presets List */}
            <View style={styles.presetsContainer}>
              {COIMBATORE_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.name}
                  style={[
                    styles.presetBadge,
                    selectedDestination?.name === preset.name && styles.presetBadgeSelected,
                  ]}
                  onPress={() => setSelectedDestination(preset)}
                >
                  <MapPin size={12} color={selectedDestination?.name === preset.name ? colors.white : colors.cyan} />
                  <Text
                    style={[
                      styles.presetText,
                      selectedDestination?.name === preset.name && styles.presetTextSelected,
                    ]}
                  >
                    {preset.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dynamic Map Pin Indicator */}
            <View style={styles.mapTapInstructions}>
              <Text style={styles.instructionText}>
                💡 Tap anywhere on the map grid above to set a custom waypoint destination directly.
              </Text>
            </View>
          </>
        )}

        {/* Route comparison and start panel */}
        {loading && <ActivityIndicator size="large" color={colors.cyan} style={styles.loader} />}

        {!loading && routes.length > 0 && !isNavigating && (
          <View style={styles.routesContainer}>
            <Text style={styles.sectionSubTitle}>Safe Route Choices</Text>
            {routes.map((route) => {
              const isSelected = selectedRoute?.id === route.id;
              const isHighSafety = route.safetyScore >= 90;

              return (
                <TouchableOpacity
                  key={route.id}
                  style={[styles.routeCard, isSelected && styles.routeCardSelected]}
                  onPress={() => setSelectedRoute(route)}
                >
                  <View style={styles.routeHeader}>
                    <Text style={styles.routeName}>{route.name}</Text>
                    <View
                      style={[
                        styles.safetyBadge,
                        { backgroundColor: isHighSafety ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)' },
                      ]}
                    >
                      {isHighSafety ? (
                        <ShieldCheck size={14} color={colors.success} />
                      ) : (
                        <AlertTriangle size={14} color={colors.warning} />
                      )}
                      <Text
                        style={[
                          styles.safetyText,
                          { color: isHighSafety ? colors.success : colors.warning },
                        ]}
                      >
                        {route.safetyScore}% Safety Score
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.routeStats}>
                    Distance: {(route.distance / 1000).toFixed(1)} km  |  Est. Time: {Math.round(route.duration / 60)} mins
                  </Text>

                  {route.riskFactors.length > 0 && (
                    <View style={styles.riskContainer}>
                      {route.riskFactors.map((risk, index) => (
                        <Text key={index} style={styles.riskItem}>
                          ⚠️ {risk}
                        </Text>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Action buttons */}
            <TouchableOpacity style={styles.startBtn} onPress={handleStartNavigation}>
              <Play size={18} color={colors.navy} />
              <Text style={styles.startBtnText}>Start Safe Navigation</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    mapFrame: {
      position: 'relative',
      height: 320,
      width: '100%',
      backgroundColor: colors.navy,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    guidanceHUD: {
      position: 'absolute',
      top: 16,
      left: 16,
      right: 16,
      backgroundColor: 'rgba(7, 13, 25, 0.9)',
      borderWidth: 1,
      borderColor: 'rgba(6, 182, 212, 0.3)',
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
      ...TYPOGRAPHY.caption,
      color: colors.cyan,
      fontWeight: 'bold',
      letterSpacing: 1.0,
      textTransform: 'uppercase',
    },
    guidanceInstruction: {
      ...TYPOGRAPHY.bodyLarge,
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
      bottom: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: 'rgba(7, 13, 25, 0.85)',
      padding: 8,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    speedCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
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
      fontSize: 18,
      color: colors.cyan,
      fontWeight: 'bold',
    },
    speedTextWarning: {
      color: colors.error,
    },
    speedUnitText: {
      fontSize: 8,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      fontWeight: 'bold',
    },
    unknownSpeedSign: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 3,
      borderColor: '#94A3B8',
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    unknownSpeedText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#475569',
    },
    unknownSpeedTextSub: {
      fontSize: 8,
      color: '#64748B',
    },
    contentScroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      gap: 16,
    },
    infoCard: {
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BORDER_RADIUS.medium,
      padding: 12,
      gap: 8,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    infoLabel: {
      ...TYPOGRAPHY.bodyMedium,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    infoValue: {
      ...TYPOGRAPHY.bodyMedium,
      color: colors.cyan,
      fontWeight: 'bold',
    },
    refreshBtn: {
      marginLeft: 'auto',
      backgroundColor: 'rgba(6, 182, 212, 0.12)',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.cyan,
    },
    refreshBtnText: {
      ...TYPOGRAPHY.caption,
      color: colors.cyan,
      fontWeight: 'bold',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
    },
    sectionTitle: {
      ...TYPOGRAPHY.bodyLarge,
      color: colors.textPrimary,
      fontWeight: 'bold',
    },
    presetsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    presetBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
    },
    presetBadgeSelected: {
      backgroundColor: colors.cyan,
      borderColor: colors.cyan,
    },
    presetText: {
      ...TYPOGRAPHY.caption,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    presetTextSelected: {
      color: colors.navy,
      fontWeight: 'bold',
    },
    mapTapInstructions: {
      backgroundColor: 'rgba(6, 182, 212, 0.05)',
      padding: 10,
      borderRadius: BORDER_RADIUS.small,
      borderWidth: 1,
      borderColor: 'rgba(6, 182, 212, 0.15)',
    },
    instructionText: {
      ...TYPOGRAPHY.caption,
      color: colors.cyan,
      lineHeight: 14,
    },
    loader: {
      marginVertical: 24,
    },
    routesContainer: {
      gap: 12,
      marginTop: 8,
    },
    sectionSubTitle: {
      ...TYPOGRAPHY.bodyMedium,
      color: colors.textPrimary,
      fontWeight: 'bold',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    routeCard: {
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BORDER_RADIUS.medium,
      padding: 16,
      gap: 8,
    },
    routeCardSelected: {
      borderColor: colors.cyan,
      backgroundColor: 'rgba(6, 182, 212, 0.05)',
    },
    routeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    routeName: {
      ...TYPOGRAPHY.bodyLarge,
      color: colors.white,
      fontWeight: 'bold',
    },
    safetyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 4,
    },
    safetyText: {
      ...TYPOGRAPHY.caption,
      fontWeight: 'bold',
    },
    routeStats: {
      ...TYPOGRAPHY.caption,
      color: colors.textPrimary,
    },
    riskContainer: {
      marginTop: 4,
      gap: 4,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.06)',
    },
    riskItem: {
      ...TYPOGRAPHY.caption,
      color: colors.warning,
      lineHeight: 14,
    },
    startBtn: {
      backgroundColor: colors.cyan,
      paddingVertical: 14,
      borderRadius: BORDER_RADIUS.medium,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
      ...SHADOWS.medium,
    },
    startBtnText: {
      ...TYPOGRAPHY.bodyLarge,
      color: colors.navy,
      fontWeight: 'bold',
    },
  });
