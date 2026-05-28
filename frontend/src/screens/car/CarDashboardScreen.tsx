import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from '../../context/LocationContext';
import { useAppMode } from '../../hooks/useAppMode';
import { dismissAlert, addAlert } from '../../store/alertSlice';
import { RootState } from '../../store';
import { CAR_COLORS, CAR_TYPOGRAPHY, CAR_SPACING } from '../../constants/theme';
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
  RotateCcw
} from 'lucide-react-native';
import * as Haptic from 'react-native'; 

export const CarDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { switchMode } = useAppMode();
  const { location, geoInfo } = useLocation();

  // Active zone alert
  const activeAlert = useSelector((state: RootState) => state.alerts.activeAlert);

  // Speed telemetry
  const gpsSpeed = location && location.speed && location.speed > 0 
    ? Math.round(location.speed * 3.6) 
    : 0;

  // Debug Simulated Drive States
  const [demoSpeed, setDemoSpeed] = useState(0);
  const [speedLimit, setSpeedLimit] = useState(40);
  const [activeTabOverlay, setActiveTabOverlay] = useState<'none' | 'parking' | 'fine' | 'debug'>('none');
  const [simulatedRoute, setSimulatedRoute] = useState<string | null>(null);

  // Driving parameters evaluation
  const currentSpeed = gpsSpeed > 0 ? gpsSpeed : demoSpeed;
  const isSpeeding = currentSpeed > speedLimit;

  // Auto speed calculation for simulated driving
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gpsSpeed === 0 && !simulatedRoute) {
      // Small drift for normal mock display
      interval = setInterval(() => {
        setDemoSpeed((prev) => {
          if (prev >= 45) return 0;
          return prev + 5;
        });
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [gpsSpeed, simulatedRoute]);

  const triggerHapticFeedback = () => {
    try {
      if (Haptic.Platform.OS === 'android') {
        Haptic.Vibration.vibrate(40);
      }
    } catch (e) {}
  };

  const handleQuickActionPress = (action: () => void) => {
    triggerHapticFeedback();
    action();
  };

  // Launch Simulated Drive Scenarios
  const startSimulation = (type: 'speed' | 'border' | 'hospital') => {
    triggerHapticFeedback();
    dispatch(dismissAlert());

    if (type === 'speed') {
      setSimulatedRoute('City Speeding Route');
      setSpeedLimit(40);
      setDemoSpeed(25);
      
      // Accelerate step-by-step to simulate speeding infraction
      setTimeout(() => setDemoSpeed(35), 1000);
      setTimeout(() => setDemoSpeed(45), 2000);
      setTimeout(() => {
        setDemoSpeed(55);
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
      }, 3000);

    } else if (type === 'border') {
      setSimulatedRoute('State Border Crossing');
      setSpeedLimit(50);
      setDemoSpeed(48);

      setTimeout(() => {
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
      }, 1500);

    } else if (type === 'hospital') {
      setSimulatedRoute('Hospital Silent Zone');
      setSpeedLimit(20);
      setDemoSpeed(15);

      setTimeout(() => {
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
      }, 1500);
    }
  };

  const resetSimulation = () => {
    triggerHapticFeedback();
    setSimulatedRoute(null);
    setDemoSpeed(0);
    setSpeedLimit(40);
    dispatch(dismissAlert());
  };

  const currentJurisdiction = simulatedRoute === 'State Border Crossing'
    ? 'Chamarajanagar, KN'
    : geoInfo 
      ? `${geoInfo.city || geoInfo.district || 'Coimbatore'}, ${geoInfo.stateCode || 'TN'}` 
      : 'Coimbatore, TN';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* 1. Header Status Bar */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => handleQuickActionPress(() => {
            Alert.alert(
              'Exit Car Mode?',
              'Are you sure you want to switch back to Mobile Mode?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Exit', onPress: () => switchMode('mobile') }
              ]
            );
          })}
        >
          <ArrowLeft color={CAR_COLORS.accent} size={28} />
          <Text style={[styles.headerText, { color: CAR_COLORS.accent }]}>EXIT</Text>
        </TouchableOpacity>
        
        <View style={styles.locationBadge}>
          <MapPin color={CAR_COLORS.accent} size={18} />
          <Text style={styles.locationText}>{currentJurisdiction}</Text>
        </View>

        {/* Wow Feature: Simulated Drive pill in header */}
        <TouchableOpacity
          style={[
            styles.debugPill,
            { borderColor: simulatedRoute ? CAR_COLORS.success : CAR_COLORS.accent }
          ]}
          onPress={() => handleQuickActionPress(() => setActiveTabOverlay(activeTabOverlay === 'debug' ? 'none' : 'debug'))}
        >
          <Wrench color={simulatedRoute ? CAR_COLORS.success : CAR_COLORS.accent} size={18} />
          <Text style={[
            styles.debugPillText,
            { color: simulatedRoute ? CAR_COLORS.success : CAR_COLORS.accent }
          ]}>
            {simulatedRoute ? 'SIM ACTIVE' : 'SIMULATE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Main HUD speedometer Display */}
      <View style={styles.hudContainer}>
        <View style={styles.speedometer}>
          <Text style={styles.speedLabel}>SPEED</Text>
          <Text style={[
            styles.speedValue, 
            { color: isSpeeding ? CAR_COLORS.danger : CAR_COLORS.success }
          ]}>
            {currentSpeed}
          </Text>
          <Text style={styles.speedUnit}>km/h</Text>
          <Text style={styles.limitLabel}>LIMIT {speedLimit}</Text>
        </View>

        {/* Glowing safety HUD alert banner */}
        <View style={[
          styles.advisoryPanel,
          { 
            borderColor: isSpeeding 
              ? CAR_COLORS.danger 
              : activeAlert 
                ? CAR_COLORS.warning 
                : CAR_COLORS.border,
            backgroundColor: isSpeeding 
              ? 'rgba(255,23,68,0.1)' 
              : activeAlert 
                ? 'rgba(255,214,0,0.06)' 
                : '#0A0A0A'
          }
        ]}>
          {isSpeeding ? (
            <View style={styles.advisoryContent}>
              <AlertOctagon color={CAR_COLORS.danger} size={32} />
              <Text style={[styles.advisoryTitle, { color: CAR_COLORS.danger }]}>🚨 SPEED LIMIT EXCEEDED 🚨</Text>
              <Text style={styles.advisorySub}>Please slow down to match the speed limit.</Text>
            </View>
          ) : activeAlert ? (
            <TouchableOpacity 
              style={styles.advisoryContent}
              onPress={() => dispatch(dismissAlert())}
            >
              <AlertOctagon color={CAR_COLORS.warning} size={32} />
              <Text style={[styles.advisoryTitle, { color: CAR_COLORS.warning }]}>
                {activeAlert.zone_name.toUpperCase()} AHEAD
              </Text>
              <Text style={styles.advisorySub}>{activeAlert.message}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.advisoryContent}>
              <CheckCircle color={CAR_COLORS.success} size={32} />
              <Text style={[styles.advisoryTitle, { color: CAR_COLORS.success }]}>ROAD CLEAR</Text>
              <Text style={styles.advisorySub}>Drive safely. No immediate alerts detected.</Text>
            </View>
          )}
        </View>
      </View>

      {/* 3. Debug simulated drive center panels */}
      {activeTabOverlay === 'debug' && (
        <View style={styles.overlayPanel}>
          <View style={styles.overlayHeader}>
            <Text style={styles.overlayTitle}>🐞 Drive Simulation Center</Text>
            <TouchableOpacity 
              style={styles.closeOverlayButton}
              onPress={() => handleQuickActionPress(() => setActiveTabOverlay('none'))}
            >
              <Text style={styles.closeOverlayText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.simButtonsContainer}>
            <TouchableOpacity 
              style={[styles.simButton, { borderColor: CAR_COLORS.danger }]}
              onPress={() => startSimulation('speed')}
            >
              <Play size={16} color={CAR_COLORS.danger} />
              <Text style={styles.simButtonText}>City Speeding Run</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.simButton, { borderColor: CAR_COLORS.accent }]}
              onPress={() => startSimulation('border')}
            >
              <Play size={16} color={CAR_COLORS.accent} />
              <Text style={styles.simButtonText}>Border Cross (TN/KN)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.simButton, { borderColor: CAR_COLORS.warning }]}
              onPress={() => startSimulation('hospital')}
            >
              <Play size={16} color={CAR_COLORS.warning} />
              <Text style={styles.simButtonText}>Hospital Silent Zone</Text>
            </TouchableOpacity>
          </View>

          {simulatedRoute && (
            <TouchableOpacity 
              style={styles.resetSimBtn}
              onPress={resetSimulation}
            >
              <RotateCcw size={16} color="#FFFFFF" />
              <Text style={styles.resetSimText}>RESET SIMULATION</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 4. Normal UI informational drawers (Fines/Parking) */}
      {activeTabOverlay === 'parking' && (
        <View style={styles.overlayPanel}>
          <View style={styles.overlayHeader}>
            <Text style={styles.overlayTitle}>🅿️ Local Parking Rules</Text>
            <TouchableOpacity 
              style={styles.closeOverlayButton}
              onPress={() => handleQuickActionPress(() => setActiveTabOverlay('none'))}
            >
              <Text style={styles.closeOverlayText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.overlayBody}>
            <Text style={styles.overlayText}>• No parking within 15 meters of intersections.</Text>
            <Text style={styles.overlayText}>• Fine for wrong parking: ₹500 (1st offense).</Text>
            <Text style={styles.overlayText}>• Towing charges apply in designated commercial spots.</Text>
            <Text style={[styles.overlayText, { color: CAR_COLORS.accent, marginTop: 8 }]}>
              💡 Say "Can I park here?" to check current spot.
            </Text>
          </View>
        </View>
      )}

      {activeTabOverlay === 'fine' && (
        <View style={styles.overlayPanel}>
          <View style={styles.overlayHeader}>
            <Text style={styles.overlayTitle}>⚖️ Quick Fine Reference</Text>
            <TouchableOpacity 
              style={styles.closeOverlayButton}
              onPress={() => handleQuickActionPress(() => setActiveTabOverlay('none'))}
            >
              <Text style={styles.closeOverlayText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.overlayBody}>
            <Text style={styles.overlayText}>• Speed Limit Infraction: ₹500 to ₹1,000</Text>
            <Text style={styles.overlayText}>• Driving without Helmet: ₹1,000 + 3-month license suspension</Text>
            <Text style={styles.overlayText}>• Signal Jump: ₹500 (1st offense)</Text>
            <Text style={[styles.overlayText, { color: CAR_COLORS.accent, marginTop: 8 }]}>
              💡 Say "Helmet fine?" or use Challan Calculator on Mobile.
            </Text>
          </View>
        </View>
      )}

      {/* 5. Touch button action footer rows */}
      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={[styles.circularButton, { backgroundColor: CAR_COLORS.accent }]}
          onPress={() => handleQuickActionPress(() => navigation.navigate('CarVoice'))}
        >
          <Mic color="#000000" size={32} />
          <Text style={styles.buttonLabel}>TALK</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.circularButton, 
            { 
              backgroundColor: '#1E293B',
              borderColor: activeTabOverlay === 'parking' ? CAR_COLORS.accent : 'transparent',
              borderWidth: 2
            }
          ]}
          onPress={() => handleQuickActionPress(() => setActiveTabOverlay(activeTabOverlay === 'parking' ? 'none' : 'parking'))}
        >
          <MapPin color={CAR_COLORS.accent} size={32} />
          <Text style={styles.buttonLabel}>PARK</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.circularButton, 
            { 
              backgroundColor: '#1E293B',
              borderColor: activeTabOverlay === 'fine' ? CAR_COLORS.accent : 'transparent',
              borderWidth: 2
            }
          ]}
          onPress={() => handleQuickActionPress(() => setActiveTabOverlay(activeTabOverlay === 'fine' ? 'none' : 'fine'))}
        >
          <Scale color={CAR_COLORS.accent} size={32} />
          <Text style={styles.buttonLabel}>FINES</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.circularButton, { backgroundColor: CAR_COLORS.danger }]}
          onPress={() => handleQuickActionPress(() => navigation.navigate('CarEmergency'))}
        >
          <Phone color="#FFFFFF" size={32} />
          <Text style={styles.buttonLabel}>SOS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CAR_COLORS.background,
    paddingHorizontal: CAR_SPACING.padding,
    paddingBottom: CAR_SPACING.padding,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    height: 60,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0F172A',
    borderRadius: 8,
  },
  headerText: {
    fontSize: CAR_TYPOGRAPHY.status.fontSize,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CAR_COLORS.border,
  },
  locationText: {
    color: CAR_COLORS.text,
    fontSize: CAR_TYPOGRAPHY.status.fontSize,
    fontWeight: CAR_TYPOGRAPHY.status.fontWeight,
    marginLeft: 6,
  },
  debugPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  debugPillText: {
    fontSize: CAR_TYPOGRAPHY.status.fontSize,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  hudContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  speedometer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  speedLabel: {
    color: CAR_COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  speedValue: {
    fontSize: CAR_TYPOGRAPHY.speed.fontSize,
    fontWeight: CAR_TYPOGRAPHY.speed.fontWeight,
    lineHeight: 80,
  },
  speedUnit: {
    color: CAR_COLORS.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  limitLabel: {
    color: '#00E5FF',
    fontSize: 16,
    fontWeight: '900',
    backgroundColor: 'rgba(0,229,255,0.08)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    marginTop: 8,
  },
  advisoryPanel: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
  },
  advisoryContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  advisoryTitle: {
    fontSize: CAR_TYPOGRAPHY.title.fontSize,
    fontWeight: '900',
    marginTop: 8,
    letterSpacing: 1,
  },
  advisorySub: {
    color: CAR_COLORS.text,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
  },
  overlayPanel: {
    backgroundColor: '#0C1426',
    borderWidth: 2,
    borderColor: CAR_COLORS.accent,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  overlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 8,
    marginBottom: 8,
  },
  overlayTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeOverlayButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  closeOverlayText: {
    color: CAR_COLORS.accent,
    fontWeight: 'bold',
  },
  overlayBody: {
    paddingVertical: 4,
  },
  overlayText: {
    color: '#E2E8F0',
    fontSize: 15,
    marginVertical: 3,
    fontWeight: '500',
  },
  simButtonsContainer: {
    flexDirection: 'column',
    gap: 12,
    marginVertical: 8,
  },
  simButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0A0A0A',
    gap: 10,
  },
  simButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetSimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CAR_COLORS.danger,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
    gap: 8,
  },
  resetSimText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 90,
  },
  circularButton: {
    width: CAR_SPACING.touchTarget,
    height: CAR_SPACING.touchTarget,
    borderRadius: CAR_SPACING.touchTarget / 2,
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
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
  },
});

export default CarDashboardScreen;
