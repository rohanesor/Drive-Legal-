import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setState } from '../store/settingsSlice';
import { useLocation } from '../context/LocationContext';
import { getJurisdictionLabel } from '../services/locationService';
import { STATES } from '../constants/states';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, GLASS } from '../constants/theme';
import { LocationMap, MapLine, MapZone } from '../components/LocationMap';
import { Map, LocateFixed, ShieldCheck, Building2, Navigation, AlertTriangle, ArrowLeftRight, Search, XCircle, Check, MapPin, ChevronRight } from 'lucide-react-native';

const TN_DISTRICTS = [
  'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore',
  'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram',
  'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam',
  'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram',
  'Ranipet', 'Salem', 'Sivagangai', 'Tenkasi', 'Thanjavur',
  'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur',
  'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore',
  'Viluppuram', 'Virudhunagar',
];

export const LocationScreen = ({ navigation }: any) => {
  const dispatch = useDispatch();
  const {
    location,
    geoInfo,
    isLoading: loading,
    error: locError,
    refreshLocation,
    setManualLocation,
    isMocked,
    status
  } = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const error = locError || localError;
  const detectedState = geoInfo?.state || null;
  const detectedCity = geoInfo?.city || null;
  const detectedDistrict = geoInfo?.district || null;

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    // Pulse animation for status indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const handleDetectLocation = async () => {
    setLocalError(null);
    await refreshLocation(true);
  };

  const handleManualSelect = (stateCode: string) => {
    setManualLocation(stateCode);
    dispatch(setState(stateCode));
    setLocalError(null);
  };

  const filteredStates = useMemo(() => {
    if (!searchQuery) return STATES;
    const q = searchQuery.toLowerCase();
    return STATES.filter(
      s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const stateDetail = useMemo(() => {
    if (!detectedState) return null;
    return {
      name: geoInfo?.state || '',
      code: detectedState,
      districtCount: detectedState === 'TN' ? TN_DISTRICTS.length : null,
    };
  }, [detectedState, geoInfo]);

  const boundaryLines: MapLine[] = useMemo(() => {
    if (detectedState === 'TN') {
      return [
        {
          id: 'tn-kn-border',
          name: 'TN–KN State Border',
          coords: [
            { lat: 12.9716, lng: 77.5946 },
            { lat: 12.3051, lng: 76.6551 },
            { lat: 11.6643, lng: 76.6950 },
            { lat: 11.0168, lng: 76.9558 },
          ],
          color: '#FF1744',
          dashed: true,
        },
      ];
    }
    if (detectedState === 'KN') {
      return [
        {
          id: 'kn-tn-border',
          name: 'KN–TN State Border',
          coords: [
            { lat: 12.9716, lng: 77.5946 },
            { lat: 12.3051, lng: 76.6551 },
            { lat: 11.6643, lng: 76.6950 },
            { lat: 11.0168, lng: 76.9558 },
          ],
          color: '#A855F7',
          dashed: true,
        },
      ];
    }
    return [];
  }, [detectedState]);

  const legalZones: MapZone[] = useMemo(() => {
    if (!location) return [];
    return [
      {
        id: 'school-zone-nearby',
        type: 'school_zone',
        name: 'School Zone – Speed Limit 25 km/h',
        coords: [{ lat: location.latitude, lng: location.longitude }],
        radius: 500,
        severity: 'medium',
      },
    ];
  }, [location]);

  const handleDistrictSelect = (district: string) => {
    dispatch(setState(detectedState || 'TN'));
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.navy} barStyle="light-content" />

      {/* Premium Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Map size={20} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Jurisdiction</Text>
            <Text style={styles.headerSub}>Location & GPS Configuration</Text>
          </View>
        </View>
        {detectedState && (
          <View style={styles.headerStateBadge}>
            <Animated.View style={[styles.statusDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.headerStateText}>{detectedState}</Text>
          </View>
        )}
      </View>

      <Animated.ScrollView
        style={[styles.scrollContainer, { opacity: fadeIn }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Map Section */}
        <View style={styles.mapSection}>
          <LocationMap
            currentLocation={location ? { lat: location.latitude, lng: location.longitude } : undefined}
            height={220}
            interactive={true}
            mapType="jurisdiction"
            lines={boundaryLines}
            zones={legalZones}
          />

          {/* Jurisdiction Breadcrumb */}
          <View style={styles.jurisdictionBreadcrumb}>
            <Text style={styles.breadcrumbText}>🇮🇳 India</Text>
            <Text style={styles.breadcrumbSeparator}>›</Text>
            <Text style={styles.breadcrumbText}>{detectedState || 'Detecting...'}</Text>
            <Text style={styles.breadcrumbSeparator}>›</Text>
            <Text style={styles.breadcrumbText}>{detectedDistrict || 'Detecting...'}</Text>
            <Text style={styles.breadcrumbSeparator}>›</Text>
            <Text style={styles.breadcrumbText}>{detectedCity || 'Detecting...'}</Text>
          </View>

          {/* Legal Rules Card */}
          <View style={styles.legalRulesCard}>
            <Text style={styles.legalRulesTitle}>Rules Active In This Region</Text>
            <View style={styles.legalRule}>
              <Text style={styles.legalRuleEmoji}>🪖</Text>
              <View style={styles.legalRuleContent}>
                <Text style={styles.legalRuleName}>Helmet Required</Text>
                <Text style={styles.legalRuleDesc}>Mandatory for two-wheelers under MV Act Section 194D</Text>
              </View>
            </View>
            <View style={styles.legalRule}>
              <Text style={styles.legalRuleEmoji}>🔕</Text>
              <View style={styles.legalRuleContent}>
                <Text style={styles.legalRuleName}>Mobile Usage</Text>
                <Text style={styles.legalRuleDesc}>Prohibited while driving under Section 184(c)</Text>
              </View>
            </View>
            <View style={styles.legalRule}>
              <Text style={styles.legalRuleEmoji}>💺</Text>
              <View style={styles.legalRuleContent}>
                <Text style={styles.legalRuleName}>Seatbelt</Text>
                <Text style={styles.legalRuleDesc}>Mandatory for all occupants under Section 194B</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Detection Section */}
        <View style={styles.detectSection}>
          <TouchableOpacity
            style={styles.detectButton}
            onPress={handleDetectLocation}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <View style={styles.detectButtonIcon}>
                  <LocateFixed size={20} color={COLORS.white} />
                </View>
                <Text style={styles.detectButtonText}>Detect My Location</Text>
                <ChevronRight size={16} color="rgba(255, 255, 255, 0.5)" />
              </>
            )}
          </TouchableOpacity>

          {/* Glassmorphic location acquisition status telemetry card */}
          {status && status !== 'Ready' && (
            <View style={[
              styles.telemetryCard,
              (status === 'Permission Denied' || status === 'GPS Disabled' || status === 'Location Timeout') && styles.telemetryCardError,
              status === 'Reverse Geocode Failed' && styles.telemetryCardWarning
            ]}>
              <View style={styles.telemetryHeader}>
                {loading && (status === 'Requesting Permission' || status === 'Acquiring GPS' || status === 'Determining Jurisdiction') ? (
                  <ActivityIndicator size="small" color={COLORS.cyan} style={styles.telemetrySpinner} />
                ) : (
                  <Animated.View style={[
                    styles.statusDot, 
                    { transform: [{ scale: pulseAnim }] },
                    (status === 'Permission Denied' || status === 'GPS Disabled' || status === 'Location Timeout') && { backgroundColor: COLORS.error },
                    status === 'Reverse Geocode Failed' && { backgroundColor: COLORS.warning },
                    status === 'GPS Acquired' && { backgroundColor: COLORS.success }
                  ]} />
                )}
                <Text style={[
                  styles.telemetryTitle,
                  (status === 'Permission Denied' || status === 'GPS Disabled' || status === 'Location Timeout') && { color: COLORS.error },
                  status === 'Reverse Geocode Failed' && { color: COLORS.warning },
                  status === 'GPS Acquired' && { color: COLORS.success }
                ]}>
                  {status}
                </Text>
              </View>
              <Text style={[
                styles.telemetryDesc,
                (status === 'Permission Denied' || status === 'GPS Disabled' || status === 'Location Timeout') && { color: 'rgba(239, 68, 68, 0.85)' },
                status === 'Reverse Geocode Failed' && { color: 'rgba(245, 158, 11, 0.95)' }
              ]}>
                {status === 'Requesting Permission' && "🔐 Requesting location permissions..."}
                {status === 'Acquiring GPS' && "📡 Acquiring GPS signal (balanced accuracy)..."}
                {status === 'GPS Acquired' && "🎯 GPS signal acquired!"}
                {status === 'Determining Jurisdiction' && "🗺️ Querying OpenStreetMap for legal boundaries..."}
                {status === 'Permission Denied' && "🔐 Permission Denied. Smart Jurisdiction Engine requires location permissions to query local traffic rules."}
                {status === 'GPS Disabled' && "🛰️ GPS Disabled. System location sensors are inactive. Please enable Location in settings."}
                {status === 'Location Timeout' && "⏳ Unable to acquire GPS signal. Using cached fallback."}
                {status === 'Reverse Geocode Failed' && "⚠️ Geocoding query timed out. Displaying coordinates with default local boundaries."}
              </Text>
            </View>
          )}

          {/* Glassmorphic jurisdiction status badge */}
          {stateDetail && (
            <View style={styles.detectedCard}>
              <View style={styles.detectedHeader}>
                <View style={styles.detectedIconBadge}>
                  <ShieldCheck size={20} color={COLORS.cyan} />
                </View>
                <View style={styles.detectedTexts}>
                  <Text style={styles.detectedLabel}>Active Jurisdiction</Text>
                  <Text style={styles.detectedName}>
                    {detectedCity
                      ? `India → ${stateDetail.name} → ${detectedCity}`
                      : detectedDistrict
                      ? `India → ${stateDetail.name} → ${detectedDistrict}`
                      : `India → ${stateDetail.name} → (Detecting...)`}
                  </Text>
                </View>
                <View style={styles.jurisdictionBadge}>
                  <Text style={styles.jurisdictionCode}>{stateDetail.code}</Text>
                </View>
              </View>

              <View style={styles.detectedMeta}>
                {stateDetail.districtCount && (
                  <View style={styles.metaItem}>
                    <Building2 size={14} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>{stateDetail.districtCount} districts</Text>
                  </View>
                )}
                {location && (
                  <View style={styles.metaItem}>
                    <Navigation size={14} color={COLORS.cyan} />
                    <Text style={[styles.metaText, styles.coordText]}>
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {error && !['Permission Denied', 'GPS Disabled', 'Location Timeout'].includes(status) && (
            <View style={styles.errorContainer}>
              <AlertTriangle size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Manual State Selection */}
        <View style={styles.manualSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(37, 99, 235, 0.08)' }]}>
              <ArrowLeftRight size={18} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Change State</Text>
              <Text style={styles.sectionSub}>Fines and rules vary by state jurisdiction</Text>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Search size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search state..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <XCircle size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {filteredStates.map((state) => {
            const isSelected = detectedState === state.code;
            return (
              <TouchableOpacity
                key={state.code}
                style={[
                  styles.stateButton,
                  isSelected && styles.stateButtonSelected,
                ]}
                onPress={() => handleManualSelect(state.code)}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.stateCodeBadge,
                  isSelected && styles.stateCodeBadgeSelected,
                ]}>
                  <Text style={[
                    styles.stateCode,
                    isSelected && styles.stateCodeSelected,
                  ]}>{state.code}</Text>
                </View>
                <Text
                  style={[
                    styles.stateButtonText,
                    isSelected && styles.stateButtonTextSelected,
                  ]}
                >
                  {state.name}
                </Text>
                {isSelected && (
                  <View style={styles.selectedCheckmark}>
                    <Check size={14} color={COLORS.white} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.strong,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(37, 99, 235, 0.15)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  headerStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
    ...GLASS.light,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  headerStateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    fontWeight: '700',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Map
  mapSection: {
    padding: 16,
    paddingBottom: 0,
  },
  // Detection Section
  detectSection: {
    padding: 16,
    margin: 16,
    marginBottom: 8,
    borderRadius: BORDER_RADIUS.large,
    backgroundColor: COLORS.surface,
    ...SHADOWS.subtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.medium,
    ...SHADOWS.medium,
  },
  detectButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectButtonText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '700',
    flex: 1,
  },
  // Glassmorphic jurisdiction card
  detectedCard: {
    marginTop: 14,
    backgroundColor: COLORS.navy,
    borderRadius: BORDER_RADIUS.medium,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.15)',
  },
  detectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detectedIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    ...GLASS.cyan,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectedTexts: {
    flex: 1,
  },
  detectedLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detectedName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 2,
  },
  jurisdictionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.small,
    ...GLASS.light,
  },
  jurisdictionCode: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.cyan,
  },
  detectedMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  coordText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: COLORS.cyan,
    fontSize: 11,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: BORDER_RADIUS.small,
    backgroundColor: COLORS.lightError,
    borderWidth: 1,
    borderColor: COLORS.redBorder,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    flex: 1,
  },
  // Manual Selection
  manualSection: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: BORDER_RADIUS.large,
    padding: 18,
    ...SHADOWS.subtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.medium,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  stateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.medium,
    marginBottom: 4,
    gap: 12,
  },
  stateButtonSelected: {
    backgroundColor: COLORS.lightPrimary,
  },
  stateCodeBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stateCodeBadgeSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stateCode: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  stateCodeSelected: {
    color: COLORS.white,
  },
  stateButtonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    flex: 1,
  },
  stateButtonTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  selectedCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Jurisdiction Breadcrumb
  jurisdictionBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.2)',
    borderRadius: BORDER_RADIUS.medium,
    padding: 10,
    marginTop: 10,
  },
  breadcrumbText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  breadcrumbSeparator: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 6,
    opacity: 0.5,
  },
  // Legal Rules Card
  legalRulesCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.medium,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.2)',
  },
  legalRulesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  legalRule: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  legalRuleEmoji: {
    fontSize: 18,
    marginTop: 1,
  },
  legalRuleContent: {
    flex: 1,
  },
  legalRuleName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  legalRuleDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  telemetryCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.15)',
  },
  telemetryCardError: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  telemetryCardWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  telemetrySpinner: {
    marginRight: 2,
  },
  telemetryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.cyan,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  telemetryDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
