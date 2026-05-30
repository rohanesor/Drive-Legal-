import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Dimensions,
  NativeModules,
  PermissionsAndroid,
  DeviceEventEmitter,
  TextInput,
  Switch,
  ScrollView,
  ActivityIndicator,
  Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from '../../context/LocationContext';
import { useAppMode } from '../../hooks/useAppMode';
import { dismissAlert, addAlert } from '../../store/alertSlice';
import { RootState } from '../../store';
import { CAR_COLORS, CAR_TYPOGRAPHY, CAR_SPACING } from '../../constants/theme';
import { LocationMap, MapMarker, MapZone, MapLine } from '../../components/LocationMap';
import { executeQuery } from '../../services/pythonBridge';
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
  Volume2, 
  Circle, 
  AlertCircle, 
  Keyboard, 
  Send, 
  Sparkles, 
  RefreshCw,
  Info,
  Heart
} from 'lucide-react-native';

const { DriveLegalTTS, DriveLegalSpeechRecognizer } = NativeModules;

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

  // Active settings state
  const userState = useSelector((state: RootState) => state.settings.state) || 'TN';
  const userLanguage = useSelector((state: RootState) => state.settings.language) || 'en';

  // Active warning alerts
  const activeAlert = useSelector((state: RootState) => state.alerts.activeAlert);

  // Speed parameters
  const gpsSpeed = location && location.speed && location.speed > 0 
    ? Math.round(location.speed * 3.6) 
    : 0;

  // Cockpit map location state
  const [cockpitLocation, setCockpitLocation] = useState<{ lat: number; lng: number; heading?: number }>({ lat: BASE_LAT, lng: BASE_LNG, heading: 42 });

  // Safety facilities map markers surrounding simulated Coimbatore loop
  const [cockpitMarkers] = useState<MapMarker[]>([
    { id: 'police_station_coimbatore', type: 'police', name: '🚓 Gandhipuram CP Junction Police', lat: 11.0180, lng: 76.9560, address: 'Gandhipuram Junction, Coimbatore', phone: '0422-2300250' },
    { id: 'hospital_coimbatore', type: 'hospital', name: '🏥 Ganga Trauma Care Hospital', lat: 11.0210, lng: 76.9590, address: 'CMC Silent Zone Rd, Coimbatore', phone: '0422-2227000' },
    { id: 'ev_charging_coimbatore', type: 'ev', name: '🔌 GreenCharge EV Bay', lat: 11.0160, lng: 76.9540, address: 'Cross Cut Road Terminal' },
    { id: 'toll_coimbatore', type: 'border', name: '🎟️ FASTag NH Toll Gate', lat: 11.0225, lng: 76.9615 },
    { id: 'school_zone_coimbatore', type: 'warning', name: '🚸 St. Pauls Silent Zone: 20 km/h', lat: 11.0200, lng: 76.9585 }
  ]);

  const [cockpitZones] = useState<MapZone[]>([
    { id: 'car_speed_zone', type: 'speed_camera', name: '⚡ Speed Radar Zone', coords: [{ lat: 11.0190, lng: 76.9580 }], radius: 150, severity: 'high' },
    { id: 'car_no_park_zone', type: 'restricted_zone', name: '🚫 Towing Boundary', coords: [{ lat: 11.0150, lng: 76.9530 }], radius: 100, severity: 'medium' },
    { id: 'car_hospital_zone', type: 'school_zone', name: '🏥 Silent Hospital Zone', coords: [{ lat: 11.0212, lng: 76.9602 }], radius: 200, severity: 'medium' }
  ]);

  const [cockpitLines] = useState<MapLine[]>([
    { id: 'state_border_1', name: '🗺️ TN-KA State Border Line', coords: [
      { lat: 11.0230, lng: 76.9500 }, { lat: 11.0232, lng: 76.9622 }, { lat: 11.0235, lng: 76.9750 }
    ], color: '#FF1744', dashed: true },
  ]);

  // Dynamic Telemetry States
  const [demoSpeed, setDemoSpeed] = useState(0);
  const [speedLimit, setSpeedLimit] = useState(40);
  const [activeTabOverlay, setActiveTabOverlay] = useState<'none' | 'talk' | 'fine' | 'parking' | 'sos' | 'debug'>('none');
  const [simulatedRouteActive, setSimulatedRouteActive] = useState<string | null>(null);
  const [simStep, setSimStep] = useState(0);
  const [routeTrail, setRouteTrail] = useState<{ latitude: number, longitude: number }[]>([
    { latitude: BASE_LAT, longitude: BASE_LNG }
  ]);

  const [telemetry, setTelemetry] = useState({
    bearing: 42,
    direction: 'NE',
    altitude: 411,
    satellites: 12,
    lat: BASE_LAT,
    lng: BASE_LNG
  });

  // Animated scaling and glow values
  const alertPulse = useRef(new Animated.Value(1)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.15)).current;

  // Waveform Animated Ref Array (6 lines)
  const waveHeights = useRef(Array(6).fill(null).map(() => new Animated.Value(4))).current;

  const currentSpeed = gpsSpeed > 0 ? gpsSpeed : demoSpeed;
  const isSpeeding = currentSpeed > speedLimit;

  // ── VOICE ASSISTANT STATE & CONTROLS ──
  const [voiceState, setVoiceState] = useState<'READY' | 'LISTENING' | 'UNDERSTANDING' | 'RESPONDING' | 'RETRY'>('READY');
  const [userTranscript, setUserTranscript] = useState('');
  const [botResponseText, setBotResponseText] = useState('RoadMind AI co-driver Active.\nTap the mic and speak.');
  const [inputText, setInputText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [detectedLang, setDetectedLang] = useState('');
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [speechError, setSpeechError] = useState('');
  const [speechAvailable, setSpeechAvailable] = useState(true);
  const [isTestMode, setIsTestMode] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(1);
  const [sttLogs, setSttLogs] = useState<string[]>([]);
  const [autoListen, setAutoListen] = useState(false);

  const autoRetryCount = useRef(0);
  const hasTranscriptRef = useRef(false);
  const latestTranscriptRef = useRef('');
  const silenceTimerRef = useRef<any>(null);
  const isSpeakingCheckInterval = useRef<any>(null);
  const hasSubmittedRef = useRef(false);

  // ── FINEIQ DYNAMIC CHECKLIST CALCULATOR STATE ──
  const [checkedViolations, setCheckedViolations] = useState<{ [key: string]: boolean }>({
    speeding: false,
    helmet: false,
    seatbelt: false,
    license: false,
    insurance: false,
    drunk: false
  });

  // Pulse effect loops for alert warnings
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

  // Voice wave pulsing animations
  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;
    let glowLoop: Animated.CompositeAnimation | null = null;
    let waveAnimations: Animated.CompositeAnimation[] = [];

    if (voiceState === 'LISTENING') {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.15, duration: 600, useNativeDriver: true, easing: Easing.ease }),
          Animated.timing(pulseScale, { toValue: 1.0, duration: 600, useNativeDriver: true, easing: Easing.ease }),
        ])
      );
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.7, duration: 600, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.15, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseLoop.start();
      glowLoop.start();

      waveAnimations = waveHeights.map((val) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(val, { toValue: Math.random() * 32 + 10, duration: Math.random() * 250 + 150, useNativeDriver: false }),
            Animated.timing(val, { toValue: 4, duration: Math.random() * 250 + 150, useNativeDriver: false })
          ])
        );
      });
      waveAnimations.forEach(a => a.start());

    } else if (voiceState === 'RESPONDING') {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.08, duration: 800, useNativeDriver: true, easing: Easing.ease }),
          Animated.timing(pulseScale, { toValue: 1.0, duration: 800, useNativeDriver: true, easing: Easing.ease }),
        ])
      );
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulseLoop.start();
      glowLoop.start();

      waveAnimations = waveHeights.map((val) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(val, { toValue: Math.random() * 20 + 8, duration: Math.random() * 350 + 250, useNativeDriver: false }),
            Animated.timing(val, { toValue: 4, duration: Math.random() * 350 + 250, useNativeDriver: false })
          ])
        );
      });
      waveAnimations.forEach(a => a.start());

    } else {
      pulseScale.setValue(1);
      glowOpacity.setValue(0.15);
      waveHeights.forEach(val => val.setValue(4));
    }

    return () => {
      if (pulseLoop) pulseLoop.stop();
      if (glowLoop) glowLoop.stop();
      waveAnimations.forEach(a => a.stop());
    };
  }, [voiceState]);

  // Voice thinking steps generator
  useEffect(() => {
    let interval: any = null;
    if (voiceState === 'UNDERSTANDING') {
      setThinkingStep(1);
      interval = setInterval(() => {
        setThinkingStep(prev => (prev < 3 ? prev + 1 : 3));
      }, 950);
    } else {
      setThinkingStep(1);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [voiceState]);

  // GPS routing and telemetry synchronization
  useEffect(() => {
    if (location && location.latitude && location.longitude && !simulatedRouteActive) {
      const lat = location.latitude;
      const lng = location.longitude;
      const heading = location.heading || 0;
      
      setTelemetry(prev => ({
        ...prev,
        lat: lat,
        lng: lng,
        bearing: Math.round(heading),
        altitude: location.altitude ? Math.round(location.altitude) : prev.altitude,
      }));

      setCockpitLocation({ lat, lng, heading: Math.round(heading) });

      setRouteTrail(prev => {
        const last = prev[prev.length - 1];
        const dist = Math.hypot(last.latitude - lat, last.longitude - lng);
        if (dist > 0.0001) {
          return [...prev, { latitude: lat, longitude: lng }];
        }
        return prev;
      });
    }
  }, [location, simulatedRouteActive]);

  // JNI speech status mount checks
  useEffect(() => {
    const checkSpeechServices = async () => {
      try {
        if (DriveLegalSpeechRecognizer) {
          const available = await DriveLegalSpeechRecognizer.isSpeechServicesAvailable();
          setSpeechAvailable(available);
          addLog(available ? "Android Speech Services: ACTIVE" : "Android Speech Services: OFFLINE");
        } else {
          setSpeechAvailable(false);
          addLog("DriveLegalSpeechRecognizer Module not found.");
        }
      } catch (e) {
        setSpeechAvailable(false);
        addLog("Failed to query Speech Services.");
      }
    };
    checkSpeechServices();

    // Native JNI event listeners registration
    const onStart = DeviceEventEmitter.addListener('onSpeechStart', () => {
      addLog("Speech recognition ready. Microphone is listening.");
      setVoiceState('LISTENING');
    });

    const onBegan = DeviceEventEmitter.addListener('onSpeechBegan', () => {
      addLog("Speaking started: user voice energy detected.");
    });

    const onPartial = DeviceEventEmitter.addListener('onSpeechPartialResults', (e) => {
      const match = e.value && e.value[0];
      if (match) {
        hasTranscriptRef.current = true;
        latestTranscriptRef.current = match;
        setUserTranscript(match);
        addLog(`Partial: "${match}"`);
        if (e.confidence !== undefined) {
          setConfidenceScore(Math.round(e.confidence * 100));
        }
      }
    });

    const onResults = DeviceEventEmitter.addListener('onSpeechResults', (e) => {
      const match = e.value && e.value[0];
      if (match) {
        hasTranscriptRef.current = true;
        latestTranscriptRef.current = match;
        addLog(`Final match: "${match}"`);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        stopRecordingFlow(); // Auto-stop listening immediately on final results!
        autoRetryCount.current = 0;
        
        if (e.confidence !== undefined) {
          setConfidenceScore(Math.round(e.confidence * 100));
        }

        if (!hasSubmittedRef.current) {
          processSpeechText(match);
        }
      } else {
        addLog("Speech results empty.");
        if (!hasTranscriptRef.current && !hasSubmittedRef.current) {
          handleSpeechFailure("No match found.");
        }
      }
    });

    const onError = DeviceEventEmitter.addListener('onSpeechError', (e) => {
      addLog(`Speech Error [Code: ${e.code}]: ${e.message}`);
      // Treat as successful and submit if we got some transcript, or ignore trailing error code 5
      if (latestTranscriptRef.current.trim().length > 0 || hasSubmittedRef.current || e.code === 5) {
        autoRetryCount.current = 0;
        if (latestTranscriptRef.current.trim().length > 0 && !hasSubmittedRef.current) {
          processSpeechText(latestTranscriptRef.current);
        }
        return;
      }
      handleSpeechFailure(e.message, e.code);
    });

    return () => {
      onStart.remove();
      onBegan.remove();
      onPartial.remove();
      onResults.remove();
      onError.remove();
      stopSpeechPlayback();
      clearSpeechMonitoring();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [userLanguage]);

  // Dynamic route loop simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (simulatedRouteActive) {
      interval = setInterval(() => {
        setSimStep(prevStep => {
          const nextStep = prevStep + 1;
          if (nextStep >= SIMULATED_ROUTE.length) {
            setRouteTrail([{ latitude: BASE_LAT, longitude: BASE_LNG }]);
            setCockpitLocation({ lat: BASE_LAT, lng: BASE_LNG, heading: 42 });
            return 0;
          }

          const node = SIMULATED_ROUTE[nextStep];
          setDemoSpeed(node.speed);
          setSpeedLimit(node.limit);

          setTelemetry(prev => ({
            ...prev,
            lat: node.latitude,
            lng: node.longitude,
            bearing: node.heading,
            direction: node.heading > 67.5 && node.heading <= 112.5 ? 'E' : 'NE'
          }));

          setCockpitLocation({ lat: node.latitude, lng: node.longitude, heading: node.heading });
          setRouteTrail(prev => [...prev, { latitude: node.latitude, longitude: node.longitude }]);

          // Proactive dynamic alerts
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

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    const formatted = `[${time}] ${msg}`;
    console.log(formatted);
    setSttLogs(prev => [formatted, ...prev].slice(0, 10));
  };

  const clearSpeechMonitoring = () => {
    if (isSpeakingCheckInterval.current) {
      clearInterval(isSpeakingCheckInterval.current);
      isSpeakingCheckInterval.current = null;
    }
  };

  const stopSpeechPlayback = async () => {
    try {
      if (DriveLegalTTS) {
        await DriveLegalTTS.stop();
      }
    } catch (e) {
      console.error('Failed to stop TTS:', e);
    }
  };

  const requestAudioPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (hasPermission) return true;
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Access',
          message: 'RoadMind AI needs microphone access to listen to driver voice queries.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const handleOrbPress = async () => {
    if (voiceState === 'RESPONDING') {
      await stopSpeechPlayback();
      clearSpeechMonitoring();
      setVoiceState('READY');
      setBotResponseText('Muted. Tap mic to talk.');
      return;
    }

    if (voiceState === 'LISTENING') {
      await stopRecordingFlow();
      return;
    }

    await startRecordingFlow();
  };

  const startRecordingFlow = async () => {
    try {
      const hasPermission = await requestAudioPermission();
      if (!hasPermission) {
        handleSpeechFailure("Microphone permission denied.");
        return;
      }

      await stopSpeechPlayback();
      clearSpeechMonitoring();

      hasTranscriptRef.current = false;
      latestTranscriptRef.current = '';
      hasSubmittedRef.current = false;
      setVoiceState('LISTENING');
      setUserTranscript('Listening...');
      setBotResponseText('');
      setSpeechError('');

      if (DriveLegalSpeechRecognizer) {
        addLog(`Starting native listener in language: ${userLanguage}`);
        await DriveLegalSpeechRecognizer.startListening(userLanguage);
      } else {
        handleSpeechFailure("Native Speech Recognizer module missing.");
      }

    } catch (err: any) {
      handleSpeechFailure(err.message || "Failed to initialize Speech Recognizer.");
    }
  };

  const stopRecordingFlow = async () => {
    try {
      addLog("Stopping listener...");
      if (DriveLegalSpeechRecognizer) {
        await DriveLegalSpeechRecognizer.stopListening();
      }
    } catch (err) {
      console.error('Error stopping listener:', err);
    }
  };

  const handleSpeechFailure = (errorMsg: string, errorCode?: number) => {
    if (hasTranscriptRef.current && latestTranscriptRef.current.trim().length > 0) {
      return;
    }
    setVoiceState('RETRY');
    setSpeechError(errorMsg);
    setBotResponseText("Could not hear clearly. Tap to retry.");
  };

  // Keyword fast path lookup
  const getKeywordResponse = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("speed limit")) {
      return "📍 Speed Limit Regulations:\nUnder Section 112 of the Motor Vehicles Act, exceeding speed limits attracts a fine of ₹500 for light motor vehicles, and suspension for repeat offenses.";
    }
    if (lower.includes("helmet fine") || lower.includes("helmet") || lower.includes("ஹெல்மெட்") || lower.includes("हेलमेट")) {
      const helmetVal = currentJurisdiction.includes('Anaimalai') ? '₹1,000' : '₹500';
      return `🪖 Helmet Violation Fine:\nUnder Section 194D of the Motor Vehicles Act, riding without a helmet in ${currentJurisdiction.split(',')[0]} attracts a fine of ${helmetVal} and disqualification of your license for 3 months.`;
    }
    if (lower.includes("parking") || lower.includes("park") || lower.includes("பார்க்கிங்") || lower.includes("पार्किंग")) {
      return "🚗 Parking Regulations:\nParking in a designated 'No Parking' zone or causing obstruction attracts a fine of ₹500 under Section 122/177 of the Motor Vehicles Act, plus towing charges.";
    }
    if (lower.includes("police station") || lower.includes("police") || lower.includes("காவல் நிலையம்") || lower.includes("पुलिस")) {
      return "🚓 Police Assistance:\nThe nearest police station is situated 500 meters ahead at Gandhipuram Junction. Dial 100 for immediate emergency police dispatch.";
    }
    if (lower.includes("emergency") || lower.includes("sos") || lower.includes("accident") || lower.includes("உதவி") || lower.includes("आपातकालीन")) {
      return "🚨 Emergency SOS Active:\nEmergency response services notified. Dial 108 for ambulance or 112 for national emergency services. Proceed with safety.";
    }
    return null;
  };

  const processSpeechText = async (transcribedText: string) => {
    if (!transcribedText || transcribedText.trim().length === 0) return;
    if (hasSubmittedRef.current) return;
    try {
      hasSubmittedRef.current = true;
      hasTranscriptRef.current = true;
      setVoiceState('UNDERSTANDING');

      addLog(`STT: Transcript Received: "${transcribedText}"`);

      // 1. Local keyword routing bypass
      const keywordResponse = getKeywordResponse(transcribedText);
      if (keywordResponse) {
        addLog("Local Router: Keyword matched! Bypassing Python RAG.");
        addLog("RoadMind AI: Request Sent...");
        addLog("RoadMind AI: Response Received successfully (Fast-Path).");
        speakResponse(keywordResponse);
        return;
      }

      // 2. Python RAG Bridge Execution
      addLog("RoadMind AI: Request Sent...");
      const result = await executeQuery({
        action: 'query',
        text: transcribedText,
        language: userLanguage,
        concise_mode: true,
        location: {
          lat: cockpitLocation.lat,
          lng: cockpitLocation.lng,
          state: userState,
          city: geoInfo?.city || undefined,
          district: geoInfo?.district || undefined,
        }
      });

      if (result.status === 'success') {
        const textResponse = result.response_text || result.fallback_response_text || 'No matches found.';
        
        if (result.detected_language) {
          setDetectedLang(result.detected_language);
        }
        if (result.confidence !== undefined) {
          setConfidenceScore(Math.round(result.confidence * 100));
        }

        addLog("RoadMind AI: Response Received successfully.");
        speakResponse(textResponse);
      } else {
        setVoiceState('RETRY');
        setBotResponseText("I couldn't hear that clearly. Try again.");
      }
    } catch (e) {
      console.error('Voice processing failure:', e);
      setVoiceState('RETRY');
      setBotResponseText("Error processing speech.");
    }
  };

  const processTextQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    try {
      await stopSpeechPlayback();
      clearSpeechMonitoring();
      
      setVoiceState('UNDERSTANDING');
      setUserTranscript(queryText);
      setBotResponseText('Thinking...');
      
      const keywordResponse = getKeywordResponse(queryText);
      if (keywordResponse) {
        speakResponse(keywordResponse);
        return;
      }

      const result = await executeQuery({
        action: 'query',
        text: queryText,
        language: userLanguage,
        concise_mode: true,
        location: {
          lat: cockpitLocation.lat,
          lng: cockpitLocation.lng,
          state: userState,
          city: geoInfo?.city || undefined,
          district: geoInfo?.district || undefined,
        }
      });

      if (result.status === 'success') {
        const textResponse = result.response_text || result.fallback_response_text || 'No matches found.';
        speakResponse(textResponse);
      } else {
        setVoiceState('RETRY');
        setBotResponseText('Did not catch that. Tap to retry.');
      }
    } catch (e) {
      console.error('Text processing failure:', e);
      setVoiceState('RETRY');
      setBotResponseText('Network / DB Error.');
    }
  };

  const speakResponse = async (text: string) => {
    try {
      setVoiceState('RESPONDING');
      const conciseText = text.length > 110 
        ? text.substring(0, 107) + '...' 
        : text;

      setBotResponseText(conciseText);

      if (DriveLegalTTS) {
        await DriveLegalTTS.speak(conciseText, userLanguage);

        clearSpeechMonitoring();
        isSpeakingCheckInterval.current = setInterval(async () => {
          if (DriveLegalTTS) {
            const speaking = await DriveLegalTTS.isSpeaking();
            if (!speaking) {
              clearSpeechMonitoring();
              setVoiceState('READY');
            }
          }
        }, 400);
      } else {
        setVoiceState('READY');
      }
    } catch (e) {
      console.error('TTS execution failure:', e);
      setVoiceState('READY');
    }
  };

  const simulateSpeechTest = () => {
    addLog("[TEST-MODE] Starting simulated speech recognizer...");
    setVoiceState('LISTENING');
    setUserTranscript('Listening...');
    setBotResponseText('');
    setSpeechError('');
    
    setTimeout(() => {
      setUserTranscript('Helmet fine in Tamil...');
      addLog('[TEST-MODE] Partial result: "Helmet fine in Tamil"');
      
      setTimeout(() => {
        const testPhrase = "Helmet fine in Tamil Nadu";
        setUserTranscript(testPhrase);
        addLog(`[TEST-MODE] Speech ended. Final Result: "${testPhrase}"`);
        autoRetryCount.current = 0;
        processSpeechText(testPhrase);
      }, 1200);
    }, 1000);
  };

  // ── DYNAMIC CHALLAN CALCULATOR HELPERS ──
  const toggleViolation = (key: string) => {
    setCheckedViolations(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const currentJurisdiction = simulatedRouteActive && SIMULATED_ROUTE[simStep].event === 'state_border'
    ? 'Chamarajanagar, KN'
    : geoInfo 
      ? `${geoInfo.city || geoInfo.district || 'Coimbatore'}, ${geoInfo.stateCode || 'TN'}` 
      : 'Coimbatore, TN';

  const fineRates = useMemo(() => {
    const isCoimbatore = currentJurisdiction.includes('Coimbatore') || currentJurisdiction.includes('Anaimalai');
    return {
      speeding: 500,
      helmet: isCoimbatore ? 1000 : 500,
      seatbelt: 500,
      license: 5000,
      insurance: 2000,
      drunk: 10000
    };
  }, [currentJurisdiction]);

  const totalCalculatedFine = useMemo(() => {
    let sum = 0;
    Object.keys(checkedViolations).forEach(key => {
      if (checkedViolations[key]) {
        sum += fineRates[key as keyof typeof fineRates] || 0;
      }
    });
    return sum;
  }, [checkedViolations, fineRates]);

  const triggerHapticFeedback = () => {
    try {
      if (Platform.OS === 'android') {
        NativeModules.Vibration?.vibrate(45);
      }
    } catch (e) {}
  };

  const handleQuickActionPress = (panelName: 'none' | 'talk' | 'fine' | 'parking' | 'sos' | 'debug') => {
    triggerHapticFeedback();
    stopSpeechPlayback();
    clearSpeechMonitoring();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    if (activeTabOverlay === panelName) {
      setActiveTabOverlay('none');
    } else {
      setActiveTabOverlay(panelName);
      if (panelName === 'talk') {
        setTimeout(() => {
          startRecordingFlow();
        }, 300);
      }
    }
  };

  const handleDial = (number: string) => {
    triggerHapticFeedback();
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert('Unsupported', 'Voice calls not supported on this vehicle dashboard.');
    });
  };

  // Automated GPS Simulations
  const startSimulation = () => {
    triggerHapticFeedback();
    dispatch(dismissAlert());
    setRouteTrail([{ latitude: BASE_LAT, longitude: BASE_LNG }]);
    setSimStep(0);
    setSimulatedRouteActive('Coimbatore City Loop');
    setDemoSpeed(SIMULATED_ROUTE[0].speed);
    setSpeedLimit(SIMULATED_ROUTE[0].limit);
    setCockpitLocation({ lat: BASE_LAT, lng: BASE_LNG, heading: 42 });
  };

  const resetSimulation = () => {
    triggerHapticFeedback();
    setSimulatedRouteActive(null);
    setSimStep(0);
    setDemoSpeed(0);
    setSpeedLimit(40);
    dispatch(dismissAlert());
    setRouteTrail([{ latitude: BASE_LAT, longitude: BASE_LNG }]);
    setCockpitLocation({ lat: BASE_LAT, lng: BASE_LNG, heading: 42 });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* HEADER SECTION */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            stopSpeechPlayback();
            clearSpeechMonitoring();
            Alert.alert(
              'Exit Car Mode?',
              'Switch back to standard Mobile Mode?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Exit Mode', onPress: () => switchMode('mobile') }
              ]
            );
          }}
        >
          <ArrowLeft color={CAR_COLORS.accent} size={18} />
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
          onPress={() => handleQuickActionPress(activeTabOverlay === 'debug' ? 'none' : 'debug')}
        >
          <Wrench color={simulatedRouteActive ? CAR_COLORS.success : CAR_COLORS.textSecondary} size={14} />
          <Text style={[
            styles.debugPillText,
            { color: simulatedRouteActive ? CAR_COLORS.success : CAR_COLORS.textSecondary }
          ]}>
            {simulatedRouteActive ? 'SIM ACTIVE' : 'SIMULATE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* SECTION 1: LIVE ROADMAP CONSOLE (35% HEIGHT) */}
      <View style={styles.mapWrapper}>
        <LocationMap
          currentLocation={{ lat: cockpitLocation.lat, lng: cockpitLocation.lng, heading: cockpitLocation.heading }}
          mapType="cockpit"
          markers={cockpitMarkers}
          zones={cockpitZones}
          lines={cockpitLines}
          height={Dimensions.get('window').height * 0.35}
          interactive={true}
          forceWebView={true}
        />

        {/* Glassmorphic Region Insight Overlay Card */}
        <View style={styles.regionInsightCard}>
          <View style={styles.insightHeader}>
            <Info size={12} color={CAR_COLORS.accent} />
            <Text style={styles.insightTitle}>REGION INSIGHT</Text>
          </View>
          <Text style={styles.insightState}>{currentJurisdiction.split(',')[1]?.trim() === 'KN' ? 'Karnataka' : 'Tamil Nadu'}</Text>
          <View style={styles.insightRuleRow}>
            <Text style={styles.insightRuleBullet}>• 🪖 Helmet Mandatory</Text>
            <Text style={styles.insightRuleBullet}>• 🚗 Seatbelt Mandatory</Text>
          </View>
          <View style={styles.insightDivider} />
          <Text style={styles.insightDetails}>Nearest Police: 500m</Text>
          <Text style={styles.insightDetails}>Nearest Hospital: 1.2 km</Text>
          <View style={styles.riskBadge}>
            <Text style={styles.riskBadgeText}>Risk: LOW</Text>
          </View>
        </View>

        {/* Small live telemetry overlay badge */}
        <View style={styles.mapStatusBadge}>
          <Activity size={10} color={CAR_COLORS.accent} />
          <Text style={styles.mapStatusText}>
            GPS LOCKED • SATS {telemetry.satellites}
          </Text>
        </View>
      </View>

      {/* SECTION 2: SPEEDOMETER & TELEMETRY */}
      <View style={styles.dashboardGrid}>
        <View style={[
          styles.speedometerCard,
          { borderColor: isSpeeding ? CAR_COLORS.danger : '#1B263B' }
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

      {/* SECTION 3: PROACTIVE ADVISORY PANEL */}
      <View style={styles.advisoryWrapper}>
        <Animated.View style={[
          styles.advisoryPanel,
          { 
            borderColor: isSpeeding 
              ? CAR_COLORS.danger 
              : activeAlert 
                ? CAR_COLORS.warning 
                : '#1B263B',
            backgroundColor: isSpeeding 
              ? 'rgba(239, 68, 68, 0.12)' 
              : activeAlert 
                ? 'rgba(245, 158, 11, 0.08)' 
                : '#090A0D',
            transform: [{ scale: alertPulse }]
          }
        ]}>
          {isSpeeding ? (
            <View style={styles.advisoryContentRow}>
              <AlertOctagon color={CAR_COLORS.danger} size={20} />
              <View style={styles.advisoryTextBox}>
                <Text style={[styles.advisoryTitle, { color: CAR_COLORS.danger }]}>DRIVESHIELD SPEED LIMIT ALERT</Text>
                <Text style={styles.advisoryDesc} numberOfLines={1}>Exceeding local {speedLimit} km/h bound limit. Slow down immediately!</Text>
              </View>
            </View>
          ) : activeAlert ? (
            <View style={styles.advisoryContentRow}>
              <AlertOctagon color={CAR_COLORS.warning} size={20} />
              <View style={styles.advisoryTextBox}>
                <Text style={[styles.advisoryTitle, { color: CAR_COLORS.warning }]}>
                  {activeAlert.zone_name.toUpperCase()} ALERT ACTIVE
                </Text>
                <Text style={styles.advisoryDesc} numberOfLines={1}>{activeAlert.message}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.advisoryContentRow}>
              <CheckCircle color={CAR_COLORS.success} size={20} />
              <View style={styles.advisoryTextBox}>
                <Text style={[styles.advisoryTitle, { color: CAR_COLORS.success }]}>DRIVESHIELD ACTIVE</Text>
                <Text style={styles.advisoryDesc} numberOfLines={1}>Jurisdiction: {currentJurisdiction} • Speed bounds normal</Text>
              </View>
            </View>
          )}
        </Animated.View>
      </View>

      {/* SECTION 4: UNIFIED QUICK ACTION FOOTER (Tesla Inspired Touch Targets) */}
      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={[
            styles.circularActionButton, 
            { backgroundColor: activeTabOverlay === 'talk' ? CAR_COLORS.danger : CAR_COLORS.accent }
          ]}
          onPress={() => handleQuickActionPress('talk')}
        >
          <Mic color="#000000" size={26} />
          <Text style={[styles.buttonLabel, { color: '#000000' }]}>TALK</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.circularActionButton, 
            { backgroundColor: '#0B0F19', borderColor: activeTabOverlay === 'fine' ? CAR_COLORS.accent : '#1E293B', borderWidth: 2 }
          ]}
          onPress={() => handleQuickActionPress('fine')}
        >
          <Scale color={CAR_COLORS.accent} size={26} />
          <Text style={styles.buttonLabel}>FINEIQ</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.circularActionButton, 
            { backgroundColor: '#0B0F19', borderColor: activeTabOverlay === 'parking' ? CAR_COLORS.accent : '#1E293B', borderWidth: 2 }
          ]}
          onPress={() => handleQuickActionPress('parking')}
        >
          <Compass color={CAR_COLORS.accent} size={26} />
          <Text style={styles.buttonLabel}>RULES</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.circularActionButton, 
            { backgroundColor: activeTabOverlay === 'sos' ? '#8F1D2C' : CAR_COLORS.danger }
          ]}
          onPress={() => handleQuickActionPress('sos')}
        >
          <Phone color="#FFFFFF" size={26} />
          <Text style={[styles.buttonLabel, { color: '#FFFFFF' }]}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* ────────────────────────────────────────────────────────
          UNIFIED EXPANDABLE OVERLAYS & BOTTOM SHEETS
         ──────────────────────────────────────────────────────── */}

      {/* 1. RoadMind AI Voice Panel Overlay Sheet */}
      {activeTabOverlay === 'talk' && (
        <View style={styles.overlayBottomCard}>
          <View style={styles.overlayHeader}>
            <View style={styles.panelTitleRow}>
              <Mic color={CAR_COLORS.accent} size={18} />
              <Text style={styles.overlayTitle}>RoadMind AI Co-Driver</Text>
            </View>
            <View style={styles.telemetryBadge}>
              <Text style={styles.telemetryBadgeText}>
                🌍 Multilingual AI (EN, தமிழ், हिन्दी)
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.closeOverlayButton}
              onPress={() => handleQuickActionPress('none')}
            >
              <Text style={styles.closeOverlayText}>CLOSE</Text>
            </TouchableOpacity>
          </View>

          {/* Voice State HUD Display */}
          <View style={styles.voiceHUDContainer}>
            <View style={styles.stateIndicatorRow}>
              <View style={[
                styles.stateIndicatorPill,
                voiceState === 'LISTENING' && { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: CAR_COLORS.danger },
                voiceState === 'UNDERSTANDING' && { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: CAR_COLORS.success },
                voiceState === 'RESPONDING' && { backgroundColor: 'rgba(0, 255, 194, 0.15)', borderColor: CAR_COLORS.accent }
              ]}>
                <Circle size={8} fill={
                  voiceState === 'LISTENING' ? CAR_COLORS.danger :
                  voiceState === 'UNDERSTANDING' ? CAR_COLORS.success :
                  voiceState === 'RESPONDING' ? CAR_COLORS.accent : '#6B7280'
                } color="transparent" />
                <Text style={[
                  styles.stateIndicatorText,
                  voiceState === 'LISTENING' && { color: CAR_COLORS.danger },
                  voiceState === 'UNDERSTANDING' && { color: CAR_COLORS.success },
                  voiceState === 'RESPONDING' && { color: CAR_COLORS.accent }
                ]}>
                  {voiceState === 'READY' ? 'Ready' : 
                   voiceState === 'LISTENING' ? 'Listening' :
                   voiceState === 'UNDERSTANDING' ? 'Understanding' : 
                   voiceState === 'RESPONDING' ? 'Responding' : 'Retry'}
                </Text>
              </View>

              {/* Dynamic waveform pulsing bars */}
              <View style={styles.waveformContainer}>
                {waveHeights.map((val, idx) => (
                  <Animated.View key={idx} style={[
                    styles.waveformBar,
                    { height: val },
                    voiceState === 'LISTENING' && { backgroundColor: CAR_COLORS.danger },
                    voiceState === 'RESPONDING' && { backgroundColor: CAR_COLORS.accent },
                    voiceState === 'UNDERSTANDING' && { backgroundColor: CAR_COLORS.success },
                  ]} />
                ))}
              </View>
            </View>

            {/* Transcription window */}
            {userTranscript.length > 0 && userTranscript !== 'Listening...' && (
              <View style={styles.youSaidBox}>
                <Text style={styles.youSaidHeader}>You Said:</Text>
                <Text style={styles.youSaidContent}>{userTranscript}</Text>
              </View>
            )}

            {/* AI Advisor Response display */}
            <ScrollView style={styles.voiceScroll} nestedScrollEnabled={true}>
              {voiceState === 'UNDERSTANDING' ? (
                <View style={styles.thinkingStepsBox}>
                  <Text style={[styles.thinkingStepText, { color: '#22C55E' }]}>Voice Captured ✓</Text>
                  <View style={styles.thinkingStepRow}>
                    {thinkingStep >= 2 ? (
                      <Text style={[styles.thinkingStepText, { color: '#22C55E' }]}>Understanding Request ✓</Text>
                    ) : (
                      <>
                        <ActivityIndicator size="small" color={CAR_COLORS.accent} style={{ marginRight: 6 }} />
                        <Text style={[styles.thinkingStepText, { color: CAR_COLORS.accent }]}>Understanding Request...</Text>
                      </>
                    )}
                  </View>
                  <View style={styles.thinkingStepRow}>
                    {thinkingStep >= 3 ? (
                      <Text style={[styles.thinkingStepText, { color: '#22C55E' }]}>Generating Legal Guidance ✓</Text>
                    ) : thinkingStep === 2 ? (
                      <>
                        <ActivityIndicator size="small" color={CAR_COLORS.accent} style={{ marginRight: 6 }} />
                        <Text style={[styles.thinkingStepText, { color: CAR_COLORS.accent }]}>Generating Legal Guidance...</Text>
                      </>
                    ) : (
                      <Text style={[styles.thinkingStepText, { color: 'rgba(255,255,255,0.3)' }]}>Generating Legal Guidance...</Text>
                    )}
                  </View>
                </View>
              ) : voiceState === 'RETRY' ? (
                <View style={styles.thinkingStepsBox}>
                  <Text style={[styles.thinkingStepText, { color: '#FF9F43' }]}>⚠️ Did not catch that clearly.</Text>
                  <Text style={styles.voiceAdvisorText}>Please tap the microphone and speak again.</Text>
                </View>
              ) : (
                <Text style={styles.voiceAdvisorText}>
                  {botResponseText}
                </Text>
              )}
            </ScrollView>
          </View>

          {/* Quick suggestions Commands Bar - Larger, safer driving shortcut touch chips */}
          <View style={styles.suggestedQueriesRow}>
            {[
              { label: '🪖 Helmet Fine', query: 'helmet fine' },
              { label: '🏎️ Speed Limit', query: 'speed limit' },
              { label: '🚓 Police Station', query: 'police station' },
              { label: '🅿️ Can I Park Here', query: 'can I park here' },
              { label: '🚨 Emergency Help', query: 'emergency' }
            ].map((suggest, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => processTextQuery(suggest.query)}
              >
                <Text style={styles.suggestionChipText}>{suggest.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bottom Controls (No typing, massive voice microphone orb only) */}
          <View style={[styles.talkControlsFooter, { justifyContent: 'center' }]}>
            {/* Giant Microphone Orb */}
            <View style={styles.voiceOrbWrapper}>
              <Animated.View style={[
                styles.hudPulseGlow,
                { 
                  opacity: glowOpacity,
                  transform: [{ scale: pulseScale }]
                },
                voiceState === 'LISTENING' && { backgroundColor: CAR_COLORS.danger },
                voiceState === 'RESPONDING' && { backgroundColor: CAR_COLORS.accent },
                voiceState === 'UNDERSTANDING' && { backgroundColor: CAR_COLORS.success },
              ]} />
              <TouchableOpacity 
                style={[
                  styles.hudTouchOrb,
                  voiceState === 'LISTENING' && { backgroundColor: CAR_COLORS.danger },
                  voiceState === 'RESPONDING' && { backgroundColor: CAR_COLORS.accent },
                  voiceState === 'UNDERSTANDING' && { backgroundColor: '#1E293B' },
                ]}
                onPress={handleOrbPress}
              >
                {voiceState === 'UNDERSTANDING' ? (
                  <ActivityIndicator size="small" color={CAR_COLORS.accent} />
                ) : (
                  <Mic size={22} color={voiceState === 'LISTENING' ? '#FFFFFF' : '#000000'} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* 2. FineIQ Challan Calculator Panel Overlay Sheet */}
      {activeTabOverlay === 'fine' && (
        <View style={styles.overlayBottomCard}>
          <View style={styles.overlayHeader}>
            <View style={styles.panelTitleRow}>
              <Scale color={CAR_COLORS.accent} size={18} />
              <Text style={styles.overlayTitle}>FineIQ Challan Calculator</Text>
            </View>
            <TouchableOpacity 
              style={styles.closeOverlayButton}
              onPress={() => handleQuickActionPress('none')}
            >
              <Text style={styles.closeOverlayText}>DISMISS</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.overlayIntro}>
            Select active violations at your current location in <Text style={{ color: '#00E5FF', fontWeight: 'bold' }}>{currentJurisdiction}</Text>:
          </Text>

          <View style={styles.calculatorLayout}>
            {/* Checklist */}
            <View style={styles.checklistGrid}>
              {[
                { key: 'speeding', title: '🏎️ Speed Limit Violation', code: 'Sec 112' },
                { key: 'helmet', title: '🪖 Driving Without Helmet', code: 'Sec 194D' },
                { key: 'seatbelt', title: '🚗 Seatbelt Disregarded', code: 'Sec 194B' },
                { key: 'license', title: '📋 Driving Without License', code: 'Sec 181' },
                { key: 'insurance', title: '📄 Vehicle Without Insurance', code: 'Sec 196' },
                { key: 'drunk', title: '🍺 Drunk & Drive Offense', code: 'Sec 185' }
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.checklistRow,
                    checkedViolations[item.key] && { borderColor: CAR_COLORS.accent, backgroundColor: 'rgba(0, 229, 255, 0.04)' }
                  ]}
                  onPress={() => toggleViolation(item.key)}
                >
                  <View style={styles.violationTextCol}>
                    <Text style={styles.checkTitle}>{item.title}</Text>
                    <Text style={styles.checkCode}>{item.code}</Text>
                  </View>
                  <View style={styles.violationRateCol}>
                    <Text style={styles.checkPrice}>₹{fineRates[item.key as keyof typeof fineRates]}</Text>
                    <View style={[
                      styles.checkCircle,
                      checkedViolations[item.key] && { backgroundColor: CAR_COLORS.accent, borderColor: CAR_COLORS.accent }
                    ]}>
                      {checkedViolations[item.key] && <Text style={styles.checkTick}>✓</Text>}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Total fine display */}
            <View style={styles.calculatorTotalBox}>
              <Text style={styles.totalFineLabel}>TOTAL ACCUMULATED FINE</Text>
              <Text style={styles.totalFineValue}>₹{totalCalculatedFine.toLocaleString()}</Text>
              <Text style={styles.calculatorDisclaimer}>*Fine calculation structured specifically for local rules fallback.*</Text>
            </View>
          </View>
        </View>
      )}

      {/* 3. Smart Jurisdiction Panel Overlay Sheet */}
      {activeTabOverlay === 'parking' && (
        <View style={styles.overlayBottomCard}>
          <View style={styles.overlayHeader}>
            <View style={styles.panelTitleRow}>
              <Compass color={CAR_COLORS.accent} size={18} />
              <Text style={styles.overlayTitle}>Smart Jurisdiction & Local Rules</Text>
            </View>
            <TouchableOpacity 
              style={styles.closeOverlayButton}
              onPress={() => handleQuickActionPress('none')}
            >
              <Text style={styles.closeOverlayText}>DISMISS</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rulesContainer}>
            <View style={styles.rulesColumn}>
              <Text style={styles.columnHeaderTitle}>📍 CURRENT GEOGRAPHIC DETAILS</Text>
              <Text style={styles.ruleLocationText}>
                Active District: <Text style={{ color: '#00E5FF' }}>{currentJurisdiction}</Text>
              </Text>
              <Text style={styles.ruleLocationText}>
                State Administration: <Text style={{ color: '#00E5FF' }}>Tamil Nadu Motor Vehicles Department</Text>
              </Text>
              
              <Text style={[styles.columnHeaderTitle, { marginTop: 12 }]}>🚨 ENFORCED SILENT SILENCE ZONES</Text>
              <Text style={styles.parkingRuleBullet}>• CMC Silent Hospital Zone: Strictly no blowing horn, fine ₹1,000.</Text>
              <Text style={styles.parkingRuleBullet}>• St. Pauls School Zone: Speeding restricted to 20 km/h, fine ₹500.</Text>
            </View>

            <View style={styles.rulesColumn}>
              <Text style={styles.columnHeaderTitle}>📋 JURISDICTION RULES DETAILS</Text>
              <Text style={styles.parkingRuleBullet}>• Helmet Mandatory for both rider and pillion passenger.</Text>
              <Text style={styles.parkingRuleBullet}>• Tow-Away Restrictions apply on commercial shopping routes.</Text>
              <Text style={styles.parkingRuleBullet}>• Digital driving license valid through Digilocker integration.</Text>
              
              <Text style={[styles.columnHeaderTitle, { marginTop: 12 }]}>📞 LOCAL HELPLINES & HELPDESK</Text>
              <Text style={styles.parkingRuleBullet}>• Coimbatore North RTO Office: 0422-2442244</Text>
              <Text style={styles.parkingRuleBullet}>• State Highways Helpdesk Command: 1033</Text>
            </View>
          </View>
        </View>
      )}

      {/* 4. RoadSOS Emergency Panel Overlay Sheet */}
      {activeTabOverlay === 'sos' && (
        <View style={styles.overlayBottomCard}>
          <View style={styles.overlayHeader}>
            <View style={styles.panelTitleRow}>
              <Phone color={CAR_COLORS.danger} size={18} />
              <Text style={styles.overlayTitle}>RoadSOS Tactical Emergency Unit</Text>
            </View>
            <TouchableOpacity 
              style={styles.closeOverlayButton}
              onPress={() => handleQuickActionPress('none')}
            >
              <Text style={styles.closeOverlayText}>DISMISS</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sosLayout}>
            {/* Quick hotlines */}
            <View style={styles.emergencyActionsCol}>
              <Text style={styles.columnHeaderTitle}>⚡ EMERGENCY DISPATCH TRIGGERS</Text>
              <TouchableOpacity 
                style={[styles.sosCallPill, { backgroundColor: '#B91C1C' }]} 
                onPress={() => handleDial('108')}
              >
                <Heart size={22} color="#FFF" />
                <Text style={styles.sosCallPillText}>CALL 108 AMBULANCE TRAUMA</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.sosCallPill, { backgroundColor: '#1D4ED8' }]} 
                onPress={() => handleDial('100')}
              >
                <Shield size={22} color="#FFF" />
                <Text style={styles.sosCallPillText}>CALL 100 HIGHWAY POLICE FORCE</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.sosCallPill, { backgroundColor: '#C2410C' }]} 
                onPress={() => handleDial('1033')}
              >
                <NavIcon size={22} color="#FFF" />
                <Text style={styles.sosCallPillText}>CALL 1033 TOLL ROAD PATROL</Text>
              </TouchableOpacity>
            </View>

            {/* Nearby facilities */}
            <View style={styles.facilitiesCol}>
              <Text style={styles.columnHeaderTitle}>🏥 SCAN SPECTRUM: NEAREST HUBS</Text>
              
              <View style={styles.facilityCard}>
                <View style={styles.facilityHeaderRow}>
                  <Text style={styles.facilityType}>🏥 NEAREST MEDICAL TRAUMA</Text>
                  <Text style={styles.facilityDistance}>1.2 KM</Text>
                </View>
                <Text style={styles.facilityName}>Ganga Trauma Care Hospital</Text>
                <TouchableOpacity style={styles.facilityDialBtn} onPress={() => handleDial('0422-2227000')}>
                  <Phone size={14} color={CAR_COLORS.accent} />
                  <Text style={styles.facilityDialText}>DIAL Ganga Unit: 0422-2227000</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.facilityCard}>
                <View style={styles.facilityHeaderRow}>
                  <Text style={styles.facilityType}>🚓 NEAREST POLICE SECURITY</Text>
                  <Text style={styles.facilityDistance}>500 M</Text>
                </View>
                <Text style={styles.facilityName}>Gandhipuram Police Station</Text>
                <TouchableOpacity style={styles.facilityDialBtn} onPress={() => handleDial('0422-2300250')}>
                  <Phone size={14} color={CAR_COLORS.accent} />
                  <Text style={styles.facilityDialText}>DIAL Gandhipuram: 0422-2300250</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 5. Automated Simulation modal overlay */}
      {activeTabOverlay === 'debug' && (
        <View style={styles.overlayBottomCard}>
          <View style={styles.overlayHeader}>
            <View style={styles.panelTitleRow}>
              <Wrench color={CAR_COLORS.accent} size={18} />
              <Text style={styles.overlayTitle}>RoadMind Simulation Hub</Text>
            </View>
            <TouchableOpacity 
              style={styles.closeOverlayButton}
              onPress={() => handleQuickActionPress('none')}
            >
              <Text style={styles.closeOverlayText}>DISMISS</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.overlayIntro}>Select an automotive route simulation to test real-time GPS coordinates & alerts:</Text>
          
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
    gap: 4,
  },
  headerText: {
    color: CAR_COLORS.accent,
    fontSize: 10,
    fontWeight: 'bold',
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

  // Region Insight Overlay Card
  regionInsightCard: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(10, 14, 23, 0.85)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    padding: 10,
    width: 175,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  insightTitle: {
    color: CAR_COLORS.accent,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  insightState: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  insightRuleRow: {
    gap: 2,
    marginBottom: 4,
  },
  insightRuleBullet: {
    color: '#A3A3A3',
    fontSize: 8,
    fontWeight: '700',
  },
  insightDivider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 4,
  },
  insightDetails: {
    color: '#E2E8F0',
    fontSize: 8,
    fontWeight: '600',
    marginVertical: 1,
  },
  riskBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderWidth: 0.5,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginTop: 4,
  },
  riskBadgeText: {
    color: '#4ADE80',
    fontSize: 8,
    fontWeight: 'bold',
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
    fontSize: 9,
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

  // ── RESTRUCTURED OVERLAYS & SHEETS (TESLA / AUTO HUD) ──
  overlayBottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#070A10',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 3,
    borderTopColor: CAR_COLORS.accent,
    padding: 16,
    elevation: 25,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    zIndex: 100,
  },
  overlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#1B263B',
    paddingBottom: 10,
    marginBottom: 10,
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overlayTitle: {
    color: '#FFFFFF',
    fontSize: 16,
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

  // A. ROADMIND VOICE HUD STYLINGS
  voiceHUDContainer: {
    backgroundColor: '#020408',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 12,
    height: 154,
    justifyContent: 'space-between',
  },
  stateIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stateIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#4B5563',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  stateIndicatorText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveformBar: {
    width: 3.5,
    borderRadius: 1.75,
    backgroundColor: '#374151',
  },
  youSaidBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 6,
    marginVertical: 4,
  },
  youSaidHeader: {
    color: CAR_COLORS.accent,
    fontSize: 8,
    fontWeight: 'bold',
  },
  youSaidContent: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 1,
  },
  voiceScroll: {
    flex: 1,
    marginTop: 4,
  },
  thinkingStepsBox: {
    gap: 2,
  },
  thinkingStepText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  thinkingStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceAdvisorText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  suggestedQueriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  suggestionChip: {
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  suggestionChipText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '900',
  },
  talkControlsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
  },
  keyboardTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
  },
  keyboardToggleText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  testBtnActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CAR_COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  testBtnInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  testBtnText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  testBtnTextInactive: {
    color: CAR_COLORS.accent,
    fontSize: 9,
    fontWeight: '900',
  },
  voiceOrbWrapper: {
    position: 'relative',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hudPulseGlow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  hudTouchOrb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: CAR_COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    zIndex: 10,
  },

  textInputRow: {
    flexDirection: 'row',
    height: 42,
    marginTop: 8,
    gap: 8,
  },
  hudTextInput: {
    flex: 1,
    backgroundColor: '#020408',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '700',
  },
  hudSendBtn: {
    width: 42,
    backgroundColor: CAR_COLORS.accent,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // B. FINEIQ CHALLAN CALCULATOR STYLINGS
  calculatorLayout: {
    flexDirection: 'row',
    gap: 16,
  },
  checklistGrid: {
    flex: 1.4,
    gap: 8,
  },
  checklistRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#020408',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
  },
  violationTextCol: {
    flex: 1,
  },
  checkTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  checkCode: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 2,
  },
  violationRateCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkPrice: {
    color: CAR_COLORS.accent,
    fontSize: 13,
    fontWeight: '900',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkTick: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
  },
  calculatorTotalBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    height: 140,
    alignSelf: 'center',
  },
  totalFineLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  totalFineValue: {
    color: CAR_COLORS.accent,
    fontSize: 34,
    fontWeight: '900',
  },
  calculatorDisclaimer: {
    color: '#475569',
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },

  // C. SMART JURISDICTION RULES PANEL STYLINGS
  rulesContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  rulesColumn: {
    flex: 1,
    backgroundColor: '#020408',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
  },
  columnHeaderTitle: {
    color: CAR_COLORS.accent,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  ruleLocationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginVertical: 3,
  },
  parkingRuleBullet: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
    marginVertical: 3,
    lineHeight: 14,
  },

  // D. ROADSOS PANEL STYLINGS
  sosLayout: {
    flexDirection: 'row',
    gap: 16,
  },
  emergencyActionsCol: {
    flex: 1,
    gap: 10,
  },
  sosCallPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    elevation: 4,
  },
  sosCallPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  facilitiesCol: {
    flex: 1,
    gap: 10,
  },
  facilityCard: {
    backgroundColor: '#020408',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
  },
  facilityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  facilityType: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: 'bold',
  },
  facilityDistance: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: '900',
  },
  facilityName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    marginVertical: 4,
  },
  facilityDialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  facilityDialText: {
    color: CAR_COLORS.accent,
    fontSize: 10,
    fontWeight: 'bold',
  },

  // E. DEBUG SIMULATION WINDOW STYLINGS
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
  telemetryBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderColor: 'rgba(0, 229, 255, 0.2)',
    borderWidth: 0.5,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  telemetryBadgeText: {
    color: CAR_COLORS.accent,
    fontSize: 9,
    fontWeight: 'bold',
  },
});

export default CarDashboardScreen;
