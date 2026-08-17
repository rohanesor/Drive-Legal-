import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import {
  TYPOGRAPHY,
  BORDER_RADIUS,
  SHADOWS,
  GLASS,
} from '../constants/theme';
import { useThemeColors } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';
import { useAppMode } from '../hooks/useAppMode';
import { LocationMap, MapMarker, MapZone } from '../components/LocationMap';
import {
  MessageCircle,
  Calculator,
  MapPin,
  Phone,
  ShieldCheck,
  LocateFixed,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Maximize2,
  AlertTriangle,
  Server,
  Mic,
  Navigation,
} from 'lucide-react-native';

const FEATURES_STATIC = [
  {
    key: 'Chat',
    Icon: MessageCircle,
    iconBg: 'rgba(6, 182, 212, 0.1)',
    iconColorKey: 'cyan' as const,
    title: 'RoadMind AI',
    badge: 'AI Assistant',
    desc: 'Consult our on-device traffic law bot in English, Tamil, or Hindi. Gets verified database citations.',
    action: 'Launch Assistant',
    accentColorKey: 'cyan' as const,
  },
  {
    key: 'VoiceAssistant',
    Icon: Mic,
    iconBg: 'rgba(6, 182, 212, 0.15)',
    iconColorKey: 'cyan' as const,
    title: 'DriveTalk (Voice)',
    badge: 'Hands-Free',
    desc: 'Speak freely with RoadMind AI in hands-free mode. Displays high-contrast, driving-safe HUD.',
    action: 'Activate Voice Mode',
    accentColorKey: 'cyan' as const,
  },
  {
    key: 'Navigation',
    Icon: Navigation,
    iconBg: 'rgba(6, 182, 212, 0.1)',
    iconColorKey: 'cyan' as const,
    title: 'Safety Navigation',
    badge: 'Road Safety',
    desc: 'Plot safer route alternatives, view dynamic hazards, speed limit areas, and accident hot-spots on map.',
    action: 'Plan Route',
    accentColorKey: 'cyan' as const,
  },
  {
    key: 'Calculator',
    Icon: Calculator,
    iconBg: 'rgba(245, 158, 11, 0.1)',
    iconColorKey: 'warning' as const,
    title: 'FineIQ Calculator',
    badge: 'Offline',
    desc: 'Compute precise traffic fines with compounding fees, offense multipliers, and late payment penalties.',
    action: 'Calculate Fines',
    accentColorKey: 'warning' as const,
  },
  {
    key: 'Location',
    Icon: MapPin,
    iconBg: 'rgba(37, 99, 235, 0.1)',
    iconColorKey: 'primary' as const,
    title: 'Smart Jurisdiction Engine',
    badge: 'Location',
    desc: 'Configure state and municipal policies for law parsing and check local GPS border fences.',
    action: 'Explore Rules',
    accentColorKey: 'primary' as const,
  },
  {
    key: 'Emergency',
    Icon: Phone,
    iconBg: 'rgba(239, 68, 68, 0.1)',
    iconColorKey: 'error' as const,
    title: 'RoadSOS Direct',
    badge: 'Direct Dials',
    desc: 'Instant call triggers for Traffic Police, Ambulance, NHAI Road Assistance, and Towing.',
    action: 'View Contacts',
    accentColorKey: 'error' as const,
  },
];

const FeatureCard = ({
  feature,
  onPress,
  index,
  styles,
}: {
  feature: (typeof FEATURES_STATIC)[0] & { iconColor: string; accentColor: string };
  onPress: () => void;
  index: number;
  styles: any;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
    >
      <TouchableOpacity
        style={styles.featureCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Accent top strip */}
        <View
          style={[
            styles.cardAccentStrip,
            { backgroundColor: feature.accentColor },
          ]}
        />

        <View style={styles.featureCardContent}>
          <View style={styles.featureCardHeader}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: feature.iconBg },
              ]}
            >
              <feature.Icon size={26} color={feature.iconColor} />
            </View>
            <View style={styles.featureHeaderTexts}>
              <Text style={styles.featureCardTitle}>{feature.title}</Text>
              <View
                style={[
                  styles.featureCardBadge,
                  { borderColor: feature.iconColor },
                ]}
              >
                <Text
                  style={[
                    styles.featureCardBadgeText,
                    { color: feature.iconColor },
                  ]}
                >
                  {feature.badge}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.featureCardDescription}>{feature.desc}</Text>
          <View style={styles.cardFooter}>
            <Text
              style={[styles.cardFooterAction, { color: feature.iconColor }]}
            >
              {feature.action}
            </Text>
            <View
              style={[
                styles.cardFooterArrow,
                { backgroundColor: feature.iconBg },
              ]}
            >
              <ArrowRight size={14} color={feature.iconColor} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

import type { AppNavigationProp, AppRouteName, IconComponent } from '../types';

export const DashboardScreen = ({
  navigation,
}: {
  navigation: AppNavigationProp;
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const features = useMemo(() => {
    return FEATURES_STATIC.map((item) => ({
      ...item,
      iconColor: colors[item.iconColorKey],
      accentColor: colors[item.accentColorKey],
    }));
  }, [colors]);

  const { location, geoInfo, isLoading, isMocked, status } = useLocation();
  const { switchMode } = useAppMode();
  const activeAlert = useSelector(
    (state: RootState) => state.alerts.activeAlert,
  );

  const enforcementMarkers: MapMarker[] = useMemo(() => {
    if (!location) {
      return [];
    }
    const lat = location.latitude;
    const lng = location.longitude;
    return [
      {
        id: 'home_cam_1',
        type: 'warning',
        name: '📸 Speed Camera Zone',
        lat: lat + 0.003,
        lng: lng + 0.002,
      },
      {
        id: 'home_cam_2',
        type: 'warning',
        name: '📸 Red Light Camera',
        lat: lat - 0.002,
        lng: lng + 0.004,
      },
      {
        id: 'home_tow_1',
        type: 'rto',
        name: '🚫 Tow-Away Zone',
        lat: lat + 0.001,
        lng: lng - 0.003,
      },
      {
        id: 'home_park_1',
        type: 'warning',
        name: '🅿️ No Parking Zone',
        lat: lat - 0.004,
        lng: lng - 0.001,
      },
    ];
  }, [location]);

  const enforcementZones: MapZone[] = useMemo(() => {
    if (!location) {
      return [];
    }
    const lat = location.latitude;
    const lng = location.longitude;
    return [
      {
        id: 'home_speed_zone',
        type: 'speed_camera',
        name: '⚡ Speed Enforcement Zone',
        coords: [{ lat: lat + 0.003, lng: lng + 0.002 }],
        radius: 200,
        severity: 'high' as const,
      },
      {
        id: 'home_no_park',
        type: 'restricted_zone',
        name: '🚫 No Parking Area',
        coords: [{ lat: lat - 0.004, lng: lng - 0.001 }],
        radius: 150,
        severity: 'medium' as const,
      },
    ];
  }, [location]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const orbGlow = useRef(new Animated.Value(0)).current;
  const orbRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbGlow, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(orbGlow, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.timing(orbRotate, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: true,
      }),
    ).start();
  }, [orbGlow, orbRotate, pulseAnim]);

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'low':
        return styles.alert_low;
      case 'high':
        return styles.alert_high;
      case 'medium':
      default:
        return styles.alert_medium;
    }
  };

  const orbScale = orbGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.17],
  });

  const ringRotation = orbRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.navy} barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.logoBadge}>
            <ShieldCheck size={20} color={colors.cyan} />
          </View>
          <View>
            <Text style={styles.headerText}>RoadMind AI</Text>
            <Text style={styles.headerTagline}>Adaptive Legal Assistant</Text>
          </View>
        </View>
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.carModePill}
            onPress={() => switchMode('car')}
            activeOpacity={0.8}
          >
            <Text style={styles.carModePillText}>🚗 DriveCockpit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Full-Width Spacious Location Banner */}
        <TouchableOpacity
          style={styles.spaciousLocationBanner}
          onPress={() => navigation.navigate('Location')}
          activeOpacity={0.9}
        >
          <View style={styles.spaciousLocationHeader}>
            <LocateFixed
              size={16}
              color={isMocked ? colors.warning : colors.cyan}
            />
            <Text style={styles.spaciousLocationTitle}>
              SMART JURISDICTION ENGINE
            </Text>
            {isLoading ? (
              <ActivityIndicator
                size="small"
                color={colors.cyan}
                style={{ marginLeft: 'auto' }}
              />
            ) : (
              <View
                style={[
                  styles.statusDotMedium,
                  isMocked && { backgroundColor: colors.warning },
                ]}
              />
            )}
          </View>
          <Text style={styles.spaciousLocationText}>
            State: {geoInfo?.state || 'Unknown'} · RTO: {geoInfo?.rtoCode || 'None'}
          </Text>
          <Text style={styles.spaciousLocationTextSecondary}>
            Tap to override active region or select municipal rules manually.
          </Text>
        </TouchableOpacity>

        {/* AI Copilot Orb Card */}
        <TouchableOpacity
          style={styles.aiOrbCard}
          onPress={() => navigation.navigate('VoiceAssistant')}
          activeOpacity={0.9}
        >
          <View style={styles.aiCardContent}>
            <Animated.View
              style={[
                styles.aiOrbContainer,
                { transform: [{ scale: orbScale }] },
              ]}
            >
              {/* Rotating gradient ring */}
              <Animated.View
                style={[
                  styles.aiOrbRing,
                  { transform: [{ rotate: ringRotation }] },
                ]}
              />
              <View style={styles.aiOrbInner}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Sparkles size={24} color={colors.white} />
                </Animated.View>
              </View>
            </Animated.View>
            <View style={styles.aiTextContainer}>
              <Text style={styles.aiTitle}>RoadMind AI</Text>
              <Text style={styles.aiSubtitle}>
                Your predictive legal mobility co-pilot
              </Text>
              <View style={styles.aiStatusRow}>
                <View style={styles.aiStatusDot} />
                <Text style={styles.aiStatus}>Online & ready</Text>
              </View>
            </View>
            <View style={styles.aiArrowContainer}>
              <ChevronRight size={20} color={colors.white} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Enforcement Intelligence Map */}
        <View style={styles.mapWrapper}>
          <LocationMap
            currentLocation={
              location
                ? { lat: location.latitude, lng: location.longitude }
                : undefined
            }
            mapType="fineiq"
            markers={enforcementMarkers}
            zones={enforcementZones}
            height={160}
            interactive={true}
          />
          <TouchableOpacity
            style={styles.mapOverlayButton}
            onPress={() => navigation.navigate('Location')}
          >
            <Maximize2 size={16} color={colors.white} />
            <Text style={styles.mapOverlayText}>Enforcement HUD</Text>
          </TouchableOpacity>
        </View>

        {/* Active alerts */}
        {activeAlert ? (
          <TouchableOpacity
            style={[styles.alertBanner, getSeverityStyle(activeAlert.severity)]}
            onPress={() => navigation.navigate('Chat')}
            activeOpacity={0.9}
          >
            <View style={styles.alertIconContainer}>
              <AlertTriangle size={22} color={colors.white} />
            </View>
            <View style={styles.alertTextContainer}>
              <Text style={styles.alertTitleText}>
                Zone Alert: {activeAlert.zone_name}
              </Text>
              <Text style={styles.alertBodyText}>{activeAlert.message}</Text>
            </View>
            <ChevronRight size={18} color={colors.white} />
          </TouchableOpacity>
        ) : (
          <View style={styles.safeBanner}>
            <View style={styles.safeIconContainer}>
              <ShieldCheck size={18} color={colors.success} />
            </View>
            <Text style={styles.safeBannerText}>
              GPS Mode active. No speed limits or zone violations detected in
              your area.
            </Text>
          </View>
        )}

        {/* Section Label */}
        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>Core Features</Text>
          <View style={styles.featureCountBadge}>
            <Text style={styles.featureCountText}>{features.length}</Text>
          </View>
        </View>

        {features.map((f, index) => (
          <FeatureCard
            key={f.key}
            feature={f}
            index={index}
            styles={styles}
            onPress={() => navigation.navigate(f.key as AppRouteName)}
          />
        ))}

        <View style={styles.statusFooter}>
          <View style={styles.statusFooterDot} />
          <Server size={13} color={colors.textSecondary} />
          <Text style={styles.statusFooterText}>
            DriveLegal Production Build: 1.0.0 · Git Commit: 0a8e1b2
          </Text>
        </View>
      </ScrollView>

      {/* Floating Glowing Mic Button for driving-safe voice mode trigger */}
      <TouchableOpacity
        style={styles.floatingMicButton}
        onPress={() => navigation.navigate('VoiceAssistant')}
        activeOpacity={0.85}
      >
        <Mic size={24} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    backgroundColor: colors.navy,
    ...SHADOWS.strong,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 182, 212, 0.12)',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    ...GLASS.cyan,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: { ...TYPOGRAPHY.h3, color: colors.white, fontWeight: 'bold' },
  headerTagline: {
    ...TYPOGRAPHY.caption,
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  carModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  carModePillText: {
    ...TYPOGRAPHY.caption,
    color: '#00E5FF',
    fontWeight: 'bold',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...GLASS.light,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
  },
  locationText: {
    ...TYPOGRAPHY.caption,
    color: colors.white,
    fontWeight: '600',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  loadingOverlay: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  scrollContent: { padding: 20, paddingBottom: 40 },

  // AI TrafiAI Card - Enhanced
  aiOrbCard: {
    backgroundColor: colors.navy,
    borderRadius: BORDER_RADIUS.large,
    marginBottom: 16,
    ...SHADOWS.strong,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    overflow: 'hidden',
  },
  aiCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  aiOrbContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiOrbRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: 'rgba(6, 182, 212, 0.5)',
    borderRightColor: 'rgba(6, 182, 212, 0.2)',
  },
  aiOrbInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cyan,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  aiTextContainer: { flex: 1 },
  aiTitle: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  aiSubtitle: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 13, marginTop: 2 },
  aiStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  aiStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  aiStatus: { color: colors.textSecondary, fontSize: 11 },
  aiArrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    ...GLASS.light,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Map
  mapWrapper: {
    marginBottom: 16,
    borderRadius: BORDER_RADIUS.large,
    overflow: 'hidden',
    ...SHADOWS.subtle,
  },
  mapOverlayButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    ...GLASS.dark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.small,
  },
  mapOverlayText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '500',
  },

  // Safety / Alert
  safeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.lightSuccess,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: BORDER_RADIUS.large,
    padding: 16,
    marginBottom: 24,
  },
  safeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeBannerText: {
    ...TYPOGRAPHY.bodyMedium,
    color: colors.success,
    flex: 1,
    lineHeight: 20,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: BORDER_RADIUS.large,
    padding: 16,
    marginBottom: 24,
    ...SHADOWS.strong,
  },
  alert_low: { backgroundColor: colors.info },
  alert_medium: { backgroundColor: colors.warning },
  alert_high: { backgroundColor: colors.error },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTextContainer: { flex: 1 },
  alertTitleText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: 'bold',
    color: colors.white,
  },
  alertBodyText: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },

  // Feature cards
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionLabel: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  featureCountBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.lightPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureCountText: {
    ...TYPOGRAPHY.caption,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },

  featureCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    ...SHADOWS.subtle,
    overflow: 'hidden',
  },
  cardAccentStrip: {
    height: 3,
    width: '100%',
  },
  featureCardContent: {
    padding: 18,
  },
  featureCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureHeaderTexts: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureCardTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  featureCardBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
  },
  featureCardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  featureCardDescription: {
    ...TYPOGRAPHY.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardFooterAction: { ...TYPOGRAPHY.bodyMedium, fontWeight: '700' },
  cardFooterArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  statusFooterDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.success,
  },
  statusFooterText: { ...TYPOGRAPHY.caption, color: colors.textSecondary },
  floatingMicButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cyan,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.glow(colors.cyan),
    zIndex: 999,
  },
  spaciousLocationBanner: {
    ...GLASS.dark,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    padding: 16,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: 16,
    ...SHADOWS.glow(colors.cyan),
  },
  spaciousLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  spaciousLocationTitle: {
    ...TYPOGRAPHY.caption,
    color: colors.textSecondary,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  spaciousLocationText: {
    ...TYPOGRAPHY.bodyMedium,
    color: colors.white,
    fontWeight: '600',
  },
  spaciousLocationTextSecondary: {
    ...TYPOGRAPHY.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statusDotMedium: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginLeft: 'auto',
  },
});
