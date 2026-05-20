import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
} from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { getStateName } from '../services/location';
import Ionicons from 'react-native-vector-icons/Ionicons';

const FEATURES = [
  {
    key: 'Chat',
    icon: 'chatbubble-ellipses',
    iconBg: 'rgba(6, 182, 212, 0.1)',
    iconColor: COLORS.cyan,
    title: 'Ask TrafiAI',
    badge: 'AI Assistant',
    desc: 'Consult our on-device traffic law bot in English, Tamil, or Hindi. Gets verified database citations.',
    action: 'Launch Assistant',
  },
  {
    key: 'Calculator',
    icon: 'calculator',
    iconBg: 'rgba(245, 158, 11, 0.1)',
    iconColor: COLORS.warning,
    title: 'Challan Calculator',
    badge: 'Offline',
    desc: 'Compute precise traffic fines with compounding fees, offense multipliers, and late payment penalties.',
    action: 'Calculate Fines',
  },
  {
    key: 'Location',
    icon: 'map',
    iconBg: 'rgba(37, 99, 235, 0.1)',
    iconColor: COLORS.primary,
    title: 'Jurisdiction Rules',
    badge: 'Location',
    desc: 'Configure state and municipal policies for law parsing and check local GPS border fences.',
    action: 'Explore Rules',
  },
  {
    key: 'Emergency',
    icon: 'call',
    iconBg: 'rgba(239, 68, 68, 0.1)',
    iconColor: COLORS.error,
    title: 'Emergency Services',
    badge: 'Direct Dials',
    desc: 'Instant call triggers for Traffic Police, Ambulance, NHAI Road Assistance, and Towing.',
    action: 'View Contacts',
  },
];

export const DashboardScreen = ({ navigation }: any) => {
  const userState = useSelector((state: RootState) => state.settings.state);
  const activeAlert = useSelector((state: RootState) => state.alerts.activeAlert);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const orbGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbGlow, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(orbGlow, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'low': return styles.alert_low;
      case 'high': return styles.alert_high;
      case 'medium': default: return styles.alert_medium;
    }
  };

  const orbSize = orbGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [48, 56],
  });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.navy} barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.cyan} />
          </View>
          <Text style={styles.headerText}>DriveLegal</Text>
        </View>
        <TouchableOpacity
          style={styles.locationBadge}
          onPress={() => navigation.navigate('Location')}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={14} color={COLORS.cyan} />
          <Text style={styles.locationText}>{getStateName(userState)}</Text>
          <View style={styles.statusDot} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* AI TrafiAI Avatar Card */}
        <TouchableOpacity
          style={styles.aiCard}
          onPress={() => navigation.navigate('Chat')}
          activeOpacity={0.95}
        >
          <View style={styles.aiCardContent}>
            <Animated.View style={[styles.aiOrbContainer, { width: orbSize, height: orbSize }]}>
              <View style={styles.aiOrbInner}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Ionicons name="sparkles" size={24} color={COLORS.white} />
                </Animated.View>
              </View>
            </Animated.View>
            <View style={styles.aiTextContainer}>
              <Text style={styles.aiTitle}>TrafiAI</Text>
              <Text style={styles.aiSubtitle}>Your AI traffic law assistant</Text>
              <Text style={styles.aiStatus}>
                <Ionicons name="ellipse" size={8} color={COLORS.success} /> Online & ready
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
          </View>
        </TouchableOpacity>

        {/* Active alerts */}
        {activeAlert ? (
          <TouchableOpacity
            style={[styles.alertBanner, getSeverityStyle(activeAlert.severity)]}
            onPress={() => navigation.navigate('Chat')}
            activeOpacity={0.9}
          >
            <Ionicons name="warning" size={24} color={COLORS.white} />
            <View style={styles.alertTextContainer}>
              <Text style={styles.alertTitleText}>Zone Alert: {activeAlert.zone_name}</Text>
              <Text style={styles.alertBodyText}>{activeAlert.message}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.white} />
          </TouchableOpacity>
        ) : (
          <View style={styles.safeBanner}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.success} />
            <Text style={styles.safeBannerText}>
              GPS Mode active. No speed limits or zone violations detected in your area.
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Core Features</Text>

        {FEATURES.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={styles.featureCard}
            onPress={() => navigation.navigate(f.key)}
            activeOpacity={0.95}
          >
            <View style={styles.featureCardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: f.iconBg }]}>
                <Ionicons name={f.icon as any} size={28} color={f.iconColor} />
              </View>
              <View style={styles.featureHeaderTexts}>
                <Text style={styles.featureCardTitle}>{f.title}</Text>
                <Text style={[styles.featureCardBadge, { color: f.iconColor, borderColor: f.iconColor }]}>
                  {f.badge}
                </Text>
              </View>
            </View>
            <Text style={styles.featureCardDescription}>{f.desc}</Text>
            <View style={styles.cardFooter}>
              <Text style={[styles.cardFooterAction, { color: f.iconColor }]}>{f.action}</Text>
              <Ionicons name="arrow-forward" size={16} color={f.iconColor} />
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.statusFooter}>
          <Ionicons name="server-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.statusFooterText}>Offline DB: Active | Engine Version: 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    backgroundColor: COLORS.navy, ...SHADOWS.medium,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    padding: 6, borderRadius: BORDER_RADIUS.small,
  },
  headerText: { ...TYPOGRAPHY.h3, color: COLORS.white, fontWeight: 'bold' },
  locationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round, borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  locationText: { ...TYPOGRAPHY.caption, color: COLORS.white, fontWeight: '600' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  scrollContent: { padding: 20, paddingBottom: 40 },

  // AI TrafiAI Card
  aiCard: {
    backgroundColor: COLORS.navy,
    borderRadius: BORDER_RADIUS.medium,
    marginBottom: 16,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  aiCardContent: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14,
  },
  aiOrbContainer: {
    borderRadius: 9999, backgroundColor: 'rgba(6, 182, 212, 0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  aiOrbInner: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.cyan,
    justifyContent: 'center', alignItems: 'center',
  },
  aiTextContainer: { flex: 1 },
  aiTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  aiSubtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  aiStatus: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },

  // Safety / Alert
  safeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.lightSuccess, borderWidth: 1, borderColor: COLORS.success,
    borderRadius: BORDER_RADIUS.medium, padding: 14, marginBottom: 24,
  },
  safeBannerText: {
    ...TYPOGRAPHY.bodyMedium, color: COLORS.success, flex: 1, lineHeight: 20,
  },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: BORDER_RADIUS.medium, padding: 16, marginBottom: 24, ...SHADOWS.medium,
  },
  alert_low: { backgroundColor: COLORS.info },
  alert_medium: { backgroundColor: COLORS.warning },
  alert_high: { backgroundColor: COLORS.error },
  alertTextContainer: { flex: 1 },
  alertTitleText: { ...TYPOGRAPHY.bodyLarge, fontWeight: 'bold', color: COLORS.white },
  alertBodyText: { ...TYPOGRAPHY.caption, color: 'rgba(255, 255, 255, 0.9)', marginTop: 2 },

  // Feature cards
  sectionLabel: { ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  featureCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1, borderColor: COLORS.border, padding: 18, marginBottom: 16, ...SHADOWS.subtle,
  },
  featureCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconContainer: { width: 48, height: 48, borderRadius: BORDER_RADIUS.medium, justifyContent: 'center', alignItems: 'center' },
  featureHeaderTexts: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  featureCardTitle: { ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.textPrimary },
  featureCardBadge: { ...TYPOGRAPHY.caption, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: BORDER_RADIUS.small, fontSize: 10, fontWeight: '600' },
  featureCardDescription: { ...TYPOGRAPHY.bodyMedium, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardFooterAction: { ...TYPOGRAPHY.bodyMedium, fontWeight: '700' },
  statusFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 20 },
  statusFooterText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
});
