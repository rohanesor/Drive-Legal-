/**
 * SettingsScreen - User preferences and app configuration
 *
 * SETTINGS AVAILABLE:
 * 1. Language selection (English, Tamil, Hindi)
 * 2. State selection (manual override for GPS detection)
 * 3. Location Alerts toggle (start/stop background GPS monitoring)
 * 4. Dark Mode toggle
 * 5. Show Disclaimer Every Response toggle
 * 6. About section with app version and disclaimer
 *
 * All settings are saved to AsyncStorage for persistence across app restarts.
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import {
  setLanguage,
  setState,
  toggleDarkMode,
  toggleNotifications,
  toggleZoneAlertsNotification,
  toggleSpeedWarningsNotification,
  toggleRemindersNotification,
  toggleLocationAlerts,
  toggleDisclaimerAlways,
} from '../store/settingsSlice';
import { saveSettings } from '../services/storage';
import { getStateName } from '../services/locationService';
import {
  startLocationService,
  stopLocationService,
} from '../services/backgroundService';
import { useMemo } from 'react';
import {
  TYPOGRAPHY,
  BORDER_RADIUS,
  SHADOWS,
  GLASS,
} from '../constants/theme';
import { useThemeColors } from '../context/ThemeContext';
import {
  Settings as SettingsIcon,
  Languages,
  MapPin,
  SlidersHorizontal,
  Navigation,
  Moon,
  Info,
  ShieldCheck,
  AlertCircle,
  Check,
  Bell,
  Zap,
  AlertTriangle,
  Clock,
  CheckCircle,
  Mic,
} from 'lucide-react-native';

// Available languages with native script display
const LANGUAGES = [
  { code: 'en', label: 'English', script: 'EN', icon: 'language-outline' },
  { code: 'ta', label: 'Tamil (தமிழ்)', script: 'த', icon: 'language-outline' },
  {
    code: 'hi',
    label: 'Hindi (हिंदी)',
    script: 'हि',
    icon: 'language-outline',
  },
];

// Available Indian states
const STATES = ['TN', 'KN', 'AP', 'KL', 'MH', 'DL'];

import type { AppNavigationProp } from '../types';

export const SettingsScreen = ({
  navigation,
}: {
  navigation: AppNavigationProp;
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);

  useEffect(() => {
    saveSettings({
      language: settings.language,
      state: settings.state,
      darkMode: settings.darkMode,
      notificationsEnabled: settings.notificationsEnabled,
      zoneAlertsNotificationEnabled: settings.zoneAlertsNotificationEnabled,
      speedWarningsNotificationEnabled: settings.speedWarningsNotificationEnabled,
      remindersNotificationEnabled: settings.remindersNotificationEnabled,
      locationAlertsEnabled: settings.locationAlertsEnabled,
      showDisclaimerAlways: settings.showDisclaimerAlways,
    });
  }, [settings]);

  const handleToggleLocationAlerts = async () => {
    const newValue = !settings.locationAlertsEnabled;
    dispatch(toggleLocationAlerts());

    try {
      if (newValue) {
        await startLocationService();
      } else {
        await stopLocationService();
      }
    } catch (e) {
      console.error('Failed to toggle location service:', e);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.navy} barStyle="light-content" />

      {/* Premium Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <SettingsIcon size={20} color={colors.cyan} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSub}>Customize your experience</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Language Selection Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View
              style={[
                styles.sectionIcon,
                { backgroundColor: 'rgba(6, 182, 212, 0.08)' },
              ]}
            >
              <Languages size={18} color={colors.cyan} />
            </View>
            <Text style={styles.sectionTitle}>Language</Text>
          </View>
          <View style={styles.optionGrid}>
            {LANGUAGES.map((lang) => {
              const isSelected = settings.language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langOption,
                    isSelected && styles.langOptionSelected,
                  ]}
                  onPress={() =>
                    dispatch(setLanguage(lang.code as 'en' | 'ta' | 'hi'))
                  }
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.langScriptBadge,
                      isSelected && styles.langScriptBadgeSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.langScriptText,
                        isSelected && { color: colors.white },
                      ]}
                    >
                      {lang.script}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.langLabel,
                      isSelected && styles.langLabelSelected,
                    ]}
                  >
                    {lang.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkCircle}>
                      <Check size={14} color={colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* State Selection Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View
              style={[
                styles.sectionIcon,
                { backgroundColor: 'rgba(37, 99, 235, 0.08)' },
              ]}
            >
              <MapPin size={18} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>State Jurisdiction</Text>
          </View>
          <View style={styles.stateGrid}>
            {STATES.map((state) => {
              const isSelected = settings.state === state;
              return (
                <TouchableOpacity
                  key={state}
                  style={[
                    styles.stateChip,
                    isSelected && styles.stateChipSelected,
                  ]}
                  onPress={() => dispatch(setState(state))}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.stateChipCode,
                      isSelected && { color: colors.white },
                    ]}
                  >
                    {state}
                  </Text>
                  <Text
                    style={[
                      styles.stateChipName,
                      isSelected && { color: 'rgba(255, 255, 255, 0.8)' },
                    ]}
                  >
                    {getStateName(state)}
                  </Text>
                  {isSelected && (
                    <View style={styles.stateCheckmark}>
                      <CheckCircle size={18} color={colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Toggle Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View
              style={[
                styles.sectionIcon,
                { backgroundColor: 'rgba(245, 158, 11, 0.08)' },
              ]}
            >
              <SlidersHorizontal size={18} color={colors.warning} />
            </View>
            <Text style={styles.sectionTitle}>Preferences</Text>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Navigation size={18} color={colors.success} />
              <View style={styles.toggleTexts}>
                <Text style={styles.toggleLabel}>Location Alerts</Text>
                <Text style={styles.toggleSub}>GPS zone monitoring</Text>
              </View>
            </View>
            <Switch
              value={settings.locationAlertsEnabled}
              onValueChange={handleToggleLocationAlerts}
              trackColor={{
                false: colors.border,
                true: 'rgba(34, 197, 94, 0.3)',
              }}
              thumbColor={
                settings.locationAlertsEnabled ? colors.success : '#f4f3f4'
              }
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Bell size={18} color={colors.primary} />
              <View style={styles.toggleTexts}>
                <Text style={styles.toggleLabel}>Push Notifications</Text>
                <Text style={styles.toggleSub}>Receive local alert popups</Text>
              </View>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={() => {
                dispatch(toggleNotifications());
              }}
              trackColor={{
                false: colors.border,
                true: 'rgba(34, 197, 94, 0.3)',
              }}
              thumbColor={
                settings.notificationsEnabled ? colors.success : '#f4f3f4'
              }
            />
          </View>

          {settings.notificationsEnabled && (
            <>
              <View style={[styles.toggleRow, styles.subToggleRow]}>
                <View style={[styles.toggleInfo, { paddingLeft: 24 }]}>
                  <AlertTriangle size={16} color={colors.warning} />
                  <View style={styles.toggleTexts}>
                    <Text style={styles.toggleLabel}>Zone Alerts</Text>
                    <Text style={styles.toggleSub}>School & dangerous areas</Text>
                  </View>
                </View>
                <Switch
                  value={settings.zoneAlertsNotificationEnabled}
                  onValueChange={() => {
                    dispatch(toggleZoneAlertsNotification());
                  }}
                  trackColor={{
                    false: colors.border,
                    true: 'rgba(34, 197, 94, 0.3)',
                  }}
                  thumbColor={
                    settings.zoneAlertsNotificationEnabled ? colors.success : '#f4f3f4'
                  }
                />
              </View>

              <View style={[styles.toggleRow, styles.subToggleRow]}>
                <View style={[styles.toggleInfo, { paddingLeft: 24 }]}>
                  <Zap size={16} color={colors.error} />
                  <View style={styles.toggleTexts}>
                    <Text style={styles.toggleLabel}>Speed Warnings</Text>
                    <Text style={styles.toggleSub}>Overspeed notifications</Text>
                  </View>
                </View>
                <Switch
                  value={settings.speedWarningsNotificationEnabled}
                  onValueChange={() => {
                    dispatch(toggleSpeedWarningsNotification());
                  }}
                  trackColor={{
                    false: colors.border,
                    true: 'rgba(34, 197, 94, 0.3)',
                  }}
                  thumbColor={
                    settings.speedWarningsNotificationEnabled ? colors.success : '#f4f3f4'
                  }
                />
              </View>

              <View style={[styles.toggleRow, styles.subToggleRow]}>
                <View style={[styles.toggleInfo, { paddingLeft: 24 }]}>
                  <Clock size={16} color={colors.cyan} />
                  <View style={styles.toggleTexts}>
                    <Text style={styles.toggleLabel}>Reminders</Text>
                    <Text style={styles.toggleSub}>License and renewals</Text>
                  </View>
                </View>
                <Switch
                  value={settings.remindersNotificationEnabled}
                  onValueChange={() => {
                    dispatch(toggleRemindersNotification());
                  }}
                  trackColor={{
                    false: colors.border,
                    true: 'rgba(34, 197, 94, 0.3)',
                  }}
                  thumbColor={
                    settings.remindersNotificationEnabled ? colors.success : '#f4f3f4'
                  }
                />
              </View>
            </>
          )}

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Moon size={18} color={colors.cyan} />
              <View style={styles.toggleTexts}>
                <Text style={styles.toggleLabel}>Dark Mode</Text>
                <Text style={styles.toggleSub}>Reduce eye strain</Text>
              </View>
            </View>
            <Switch
              value={settings.darkMode}
              onValueChange={() => {
                dispatch(toggleDarkMode());
              }}
              trackColor={{
                false: colors.border,
                true: 'rgba(6, 182, 212, 0.3)',
              }}
              thumbColor={settings.darkMode ? colors.cyan : '#f4f3f4'}
            />
          </View>

          <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
            <View style={styles.toggleInfo}>
              <Info size={18} color={colors.warning} />
              <View style={styles.toggleTexts}>
                <Text style={styles.toggleLabel}>Show Disclaimer</Text>
                <Text style={styles.toggleSub}>Display on every response</Text>
              </View>
            </View>
            <Switch
              value={settings.showDisclaimerAlways}
              onValueChange={() => {
                dispatch(toggleDisclaimerAlways());
              }}
              trackColor={{
                false: colors.border,
                true: 'rgba(245, 158, 11, 0.3)',
              }}
              thumbColor={
                settings.showDisclaimerAlways ? colors.warning : '#f4f3f4'
              }
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.aboutSection}>
          <View style={styles.aboutHeader}>
            <View style={styles.aboutLogoBadge}>
              <ShieldCheck size={24} color={colors.cyan} />
            </View>
            <View>
              <Text style={styles.aboutAppName}>DriveLegal</Text>
              <View style={styles.versionRow}>
                <View style={styles.versionBadge}>
                  <Text style={styles.versionText}>v1.0.0</Text>
                </View>
                <Text style={styles.aboutEdition}>Production Build</Text>
              </View>
            </View>
          </View>

          <View style={styles.aboutDivider} />

          <Text style={styles.aboutText}>
            AI-powered traffic law assistant with offline-first architecture.
            All legal databases and computation engines run locally on your
            device.
          </Text>

          <View style={styles.aboutDisclaimer}>
            <AlertCircle size={14} color={colors.textWarning} />
            <Text style={styles.aboutDisclaimerText}>
              This information is for educational purposes only. For official
              advice, contact your local RTO.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 20,
    ...SHADOWS.strong,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 182, 212, 0.15)',
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
    ...GLASS.cyan,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: colors.white,
    fontWeight: 'bold',
  },
  headerSub: {
    ...TYPOGRAPHY.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  // Section styling
  section: {
    backgroundColor: colors.surface,
    marginBottom: 16,
    borderRadius: BORDER_RADIUS.large,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.subtle,
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
    color: colors.textPrimary,
    fontWeight: '700',
  },
  // Language options
  optionGrid: {
    gap: 8,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: colors.background,
    gap: 12,
  },
  langOptionSelected: {
    backgroundColor: colors.lightPrimary,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  langScriptBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langScriptBadgeSelected: {
    backgroundColor: colors.primary,
  },
  langScriptText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  langLabel: {
    ...TYPOGRAPHY.bodyLarge,
    color: colors.textSecondary,
    flex: 1,
  },
  langLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // State chips
  stateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stateChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: '30%',
    flexGrow: 1,
    alignItems: 'center',
  },
  stateChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...SHADOWS.medium,
  },
  stateChipCode: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  stateChipName: {
    ...TYPOGRAPHY.caption,
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 10,
  },
  stateCheckmark: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subToggleRow: {
    backgroundColor: 'rgba(0, 0, 0, 0.01)',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  toggleTexts: {
    flex: 1,
  },
  toggleLabel: {
    ...TYPOGRAPHY.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 15,
  },
  toggleSub: {
    ...TYPOGRAPHY.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  // About section
  aboutSection: {
    backgroundColor: colors.navy,
    borderRadius: BORDER_RADIUS.large,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.15)',
    ...SHADOWS.strong,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  aboutLogoBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    ...GLASS.cyan,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutAppName: {
    ...TYPOGRAPHY.h3,
    color: colors.white,
    fontWeight: 'bold',
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.small,
    ...GLASS.light,
  },
  versionText: {
    ...TYPOGRAPHY.caption,
    color: colors.cyan,
    fontWeight: '700',
    fontSize: 11,
  },
  aboutEdition: {
    ...TYPOGRAPHY.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  aboutDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 16,
  },
  aboutText: {
    ...TYPOGRAPHY.bodyMedium,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 22,
  },
  aboutDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  aboutDisclaimerText: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(245, 158, 11, 0.7)',
    lineHeight: 16,
    flex: 1,
  },
});
