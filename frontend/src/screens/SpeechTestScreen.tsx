import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Platform,
  DeviceEventEmitter,
  NativeModules,
} from 'react-native';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, GLASS } from '../constants/theme';
import { Mic, ArrowLeft, RefreshCw, Layers, ShieldCheck, Activity, Award, FileText } from 'lucide-react-native';
import { useLocation } from '../context/LocationContext';

const { DriveLegalSpeechRecognizer } = NativeModules;

interface LogEntry {
  id: string;
  timestamp: string;
  language: string;
  transcript: string;
  confidence: number | null;
  confidenceText: 'High' | 'Medium' | 'Low' | 'N/A';
}

export const SpeechTestScreen = ({ navigation }: any) => {
  const { geoInfo } = useLocation();

  // Test settings
  const [selectedLang, setSelectedLang] = useState<'en-US' | 'en-IN' | 'ta-IN' | 'hi-IN'>('en-IN');
  const [listening, setListening] = useState(false);
  const [voiceState, setVoiceState] = useState<'READY' | 'LISTENING' | 'RESULTS' | 'ERROR'>('READY');
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);

  // Diagnostics Comparison logs
  const [testLogs, setTestLogs] = useState<LogEntry[]>([]);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isListeningRef = useRef(false);

  useEffect(() => {
    // Setup listener loops
    const onStart = DeviceEventEmitter.addListener('onSpeechStart', () => {
      setVoiceState('LISTENING');
    });

    const onPartial = DeviceEventEmitter.addListener('onSpeechPartialResults', (e) => {
      const match = e.value && e.value[0];
      if (match) {
        setTranscript(match);
        if (e.confidence !== undefined) {
          setConfidence(Math.round(e.confidence * 100));
        }
      }
    });

    const onResults = DeviceEventEmitter.addListener('onSpeechResults', (e) => {
      const match = e.value && e.value[0];
      const score = e.confidence !== undefined ? Math.round(e.confidence * 100) : null;
      
      setTranscript(match || 'No speech detected');
      setConfidence(score);
      setDetectedLang(e.langCode || selectedLang);
      setVoiceState('RESULTS');
      setListening(false);
      isListeningRef.current = false;

      // Add to comparison matrix log
      if (match) {
        const confText = getConfidenceClassification(score);
        const newLog: LogEntry = {
          id: String(Date.now()),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          language: e.langCode || selectedLang,
          transcript: match,
          confidence: score,
          confidenceText: confText,
        };
        setTestLogs(prev => [newLog, ...prev]);
      }
    });

    const onError = DeviceEventEmitter.addListener('onSpeechError', (e) => {
      console.log('Test Screen speech error:', e);
      if (e.code === 5 && transcript.length > 0) {
        // Suppress trailing error 5
        return;
      }
      setTranscript(prev => prev || `Error code ${e.code}: ${e.message}`);
      setVoiceState('ERROR');
      setListening(false);
      isListeningRef.current = false;
    });

    return () => {
      onStart.remove();
      onPartial.remove();
      onResults.remove();
      onError.remove();
      if (DriveLegalSpeechRecognizer && isListeningRef.current) {
        DriveLegalSpeechRecognizer.stopListening().catch(() => {});
      }
    };
  }, [selectedLang, transcript]);

  // Pulse animation loop
  useEffect(() => {
    let anim: Animated.CompositeAnimation;
    if (listening) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
        ])
      );
      anim.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [listening]);

  const toggleListening = async () => {
    if (listening) {
      try {
        if (DriveLegalSpeechRecognizer) {
          await DriveLegalSpeechRecognizer.stopListening();
        }
        setListening(false);
        isListeningRef.current = false;
      } catch (err) {
        console.error('Error stopping test listening:', err);
      }
    } else {
      setTranscript('');
      setConfidence(null);
      setDetectedLang(null);
      setVoiceState('READY');
      setListening(true);
      isListeningRef.current = true;

      try {
        if (DriveLegalSpeechRecognizer) {
          await DriveLegalSpeechRecognizer.startListening(selectedLang);
        } else {
          setTranscript('DriveLegalSpeechRecognizer native module missing');
          setListening(false);
          isListeningRef.current = false;
        }
      } catch (err: any) {
        setTranscript(`Failed to initialize: ${err.message}`);
        setListening(false);
        isListeningRef.current = false;
      }
    }
  };

  const getConfidenceClassification = (score: number | null): 'High' | 'Medium' | 'Low' | 'N/A' => {
    if (score === null || score === 0) return 'N/A';
    if (score >= 85) return 'High';
    if (score >= 50) return 'Medium';
    return 'Low';
  };

  const getConfidenceColor = (classification: string) => {
    switch (classification) {
      case 'High': return '#10B981';
      case 'Medium': return '#F59E0B';
      case 'Low': return '#EF4444';
      default: return '#64748B';
    }
  };

  const clearLogs = () => {
    setTestLogs([]);
  };

  const activeConfClass = getConfidenceClassification(confidence);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.navy} barStyle="light-content" />

      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>STT Diagnostic Lab</Text>
          <Text style={styles.headerSub}>Test regional locale recognition quality</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Engine Information Card */}
        <View style={styles.engineCard}>
          <View style={styles.engineRow}>
            <View style={styles.engineBadge}>
              <ShieldCheck size={18} color={COLORS.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.engineTitle}>ACTIVE SPEECH ENGINE</Text>
              <Text style={styles.engineText}>
                Android Native `SpeechRecognizer` (Google System Speech Services) linked with offline multilingual libraries.
              </Text>
            </View>
          </View>
        </View>

        {/* Locale Selection Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. SELECT REGIONAL TEST LOCALE</Text>
          <View style={styles.localeGrid}>
            {(['en-US', 'en-IN', 'ta-IN', 'hi-IN'] as const).map(lang => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.localeOption,
                  selectedLang === lang && styles.localeOptionSelected,
                ]}
                onPress={() => setSelectedLang(lang)}
              >
                <Text
                  style={[
                    styles.localeCode,
                    selectedLang === lang && { color: '#000000' },
                  ]}
                >
                  {lang}
                </Text>
                <Text
                  style={[
                    styles.localeLabel,
                    selectedLang === lang && { color: 'rgba(0, 0, 0, 0.7)' },
                  ]}
                >
                  {lang === 'en-US' ? 'US English' :
                   lang === 'en-IN' ? 'Indian English' :
                   lang === 'ta-IN' ? 'Tamil (தமிழ்)' : 'Hindi (हिंदी)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Diagnostic Test Recorder Area */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. DIALOGUE TEST TRANSMITTER</Text>
          
          <View style={styles.testOrbContainer}>
            <Animated.View
              style={[
                styles.glowingOrb,
                listening && { transform: [{ scale: pulseAnim }], opacity: 0.15 },
              ]}
            />
            <TouchableOpacity
              style={[
                styles.micBtn,
                listening ? { backgroundColor: '#EF4444' } : { backgroundColor: COLORS.cyan },
              ]}
              onPress={toggleListening}
              activeOpacity={0.8}
            >
              <Mic size={30} color={listening ? '#FFFFFF' : '#000000'} />
            </TouchableOpacity>
            
            <Text style={styles.statusLabel}>
              {listening ? 'Microphone active. Speak clearly...' :
               voiceState === 'RESULTS' ? 'Speech processed.' :
               voiceState === 'ERROR' ? 'Process failed.' : 'Ready to listen.'}
            </Text>
          </View>

          {/* Test Metadata Displays */}
          <View style={styles.metaRow}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>CONFIDENCE</Text>
              <View style={[
                styles.confBadge,
                { backgroundColor: getConfidenceColor(activeConfClass) + '15', borderColor: getConfidenceColor(activeConfClass) + '30' }
              ]}>
                <Text style={[styles.confText, { color: getConfidenceColor(activeConfClass) }]}>
                  {activeConfClass} {confidence !== null ? `(${confidence}%)` : ''}
                </Text>
              </View>
            </View>

            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>ENGINE LANGUAGE</Text>
              <Text style={styles.metaValue}>
                {detectedLang || 'None detected'}
              </Text>
            </View>
          </View>

          {/* Raw transcript output box */}
          <Text style={styles.metaLabel}>RAW CAPTURED TRANSCRIPT</Text>
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptText}>
              {transcript || 'Awaiting speech input... Click the microphone above to begin testing.'}
            </Text>
          </View>
        </View>

        {/* Diagnostics Comparison Matrix Log */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { flex: 1, marginBottom: 0 }]}>
              3. LOCALE ACCURACIES (COMPARISON MATRIX)
            </Text>
            {testLogs.length > 0 && (
              <TouchableOpacity onPress={clearLogs}>
                <Text style={styles.clearText}>Clear Logs</Text>
              </TouchableOpacity>
            )}
          </View>

          {testLogs.length === 0 ? (
            <View style={styles.emptyLogsBox}>
              <FileText size={24} color="#334155" />
              <Text style={styles.emptyLogsText}>
                No test transcripts recorded yet. Perform speech diagnostics above.
              </Text>
            </View>
          ) : (
            <View style={styles.logsList}>
              {testLogs.map(log => (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <View style={styles.logPill}>
                      <Text style={styles.logPillText}>{log.language}</Text>
                    </View>
                    <Text style={styles.logTime}>{log.timestamp}</Text>
                    <View style={[
                      styles.logConfBadge,
                      { backgroundColor: getConfidenceColor(log.confidenceText) + '15', borderColor: getConfidenceColor(log.confidenceText) + '30' }
                    ]}>
                      <Text style={[styles.logConfText, { color: getConfidenceColor(log.confidenceText) }]}>
                        {log.confidenceText} ({log.confidence}%)
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.logTranscript}>"{log.transcript}"</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 18,
    ...SHADOWS.strong,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 182, 212, 0.15)',
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  headerSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  engineCard: {
    backgroundColor: '#070C16',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.15)',
    borderRadius: BORDER_RADIUS.medium,
    padding: 14,
    ...SHADOWS.glow('rgba(0, 229, 255, 0.03)'),
  },
  engineRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  engineBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  engineTitle: {
    color: COLORS.cyan,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  engineText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
    lineHeight: 14,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearText: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: 'bold',
  },
  localeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  localeOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: BORDER_RADIUS.medium,
    padding: 12,
    alignItems: 'center',
  },
  localeOptionSelected: {
    backgroundColor: COLORS.cyan,
    borderColor: COLORS.cyan,
    ...SHADOWS.glow('rgba(0, 229, 255, 0.15)'),
  },
  localeCode: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.white,
  },
  localeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    marginTop: 3,
  },
  testOrbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
    height: 120,
    position: 'relative',
  },
  glowingOrb: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EF4444',
  },
  micBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    zIndex: 5,
  },
  statusLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 14,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 10,
  },
  metaBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: BORDER_RADIUS.medium,
    padding: 10,
  },
  metaLabel: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  confBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  confText: {
    fontSize: 11,
    fontWeight: '900',
  },
  metaValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  transcriptBox: {
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: BORDER_RADIUS.medium,
    padding: 14,
    minHeight: 60,
    justifyContent: 'center',
  },
  transcriptText: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  emptyLogsBox: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
  },
  emptyLogsText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    maxWidth: '80%',
  },
  logsList: {
    gap: 10,
  },
  logCard: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: BORDER_RADIUS.medium,
    padding: 12,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  logPill: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  logPillText: {
    color: '#CBD5E1',
    fontSize: 9,
    fontWeight: '900',
  },
  logTime: {
    color: '#475569',
    fontSize: 10,
    fontWeight: 'bold',
    flex: 1,
  },
  logConfBadge: {
    borderWidth: 0.5,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  logConfText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  logTranscript: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    fontStyle: 'italic',
  },
});
