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
  toggleLocationAlerts,
  toggleDisclaimerAlways,
} from '../store/settingsSlice';
import { saveSettings } from '../services/storage';
import { getStateName } from '../services/locationService';
import { startLocationService, stopLocationService } from '../services/backgroundService';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, GLASS } from '../constants/theme';
import { Settings as SettingsIcon, Languages, MapPin, SlidersHorizontal, Navigation, Moon, Info, ShieldCheck, AlertCircle, Check, CheckCircle, Mic } from 'lucide-react-native';

// Available languages with native script display
const LANGUAGES = [
  { code: 'en', label: 'English', script: 'EN', icon: 'language-outline' },
  { code: 'ta', label: 'Tamil (தமிழ்)', script: 'த', icon: 'language-outline' },
  { code: 'hi', label: 'Hindi (हिंदी)', script: 'हि', icon: 'language-outline' },
];

// Available Indian states
const STATES = ['TN', 'KN', 'AP', 'KL', 'MH', 'DL'];

export const SettingsScreen = ({ navigation }: any) => {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);

  useEffect(() => {
    saveSettings({
      language: settings.language,
      state: settings.state,
      darkMode: settings.darkMode,
      notificationsEnabled: settings.notificationsEnabled,
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
      console.error("Failed to toggle location service:", e);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.navy} barStyle="light-content" />

      {/* Premium Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <SettingsIcon size={20} color={COLORS.cyan} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSub}>Customize your experience</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Language Selection Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(6, 182, 212, 0.08)' }]}>
              <Languages size={18} color={COLORS.cyan} />
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
                  onPress={() => dispatch(setLanguage(lang.code as 'en' | 'ta' | 'hi'))}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.langScriptBadge,
                    isSelected && styles.langScriptBadgeSelected,
                  ]}>
                    <Text style={[
                      styles.langScriptText,
                      isSelected && { color: COLORS.white },
                    ]}>{lang.script}</Text>
                  </View>
                  <Text style={[
                    styles.langLabel,
                    isSelected && styles.langLabelSelected,
                  ]}>{lang.label}</Text>
                  {isSelected && (
                    <View style={styles.checkCircle}>
                      <Check size={14} color={COLORS.white} />
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
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(37, 99, 235, 0.08)' }]}>
              <MapPin size={18} color={COLORS.primary} />
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
                  <Text style={[
                    styles.stateChipCode,
                    isSelected && { color: COLORS.white },
                  ]}>{state}</Text>
                  <Text style={[
                    styles.stateChipName,
                    isSelected && { color: 'rgba(255, 255, 255, 0.8)' },
                  ]}>{getStateName(state)}</Text>
                  {isSelected && (
                    <View style={styles.stateCheckmark}>
                      <CheckCircle size={18} color={COLORS.white} />
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
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.08)' }]}>
              <SlidersHorizontal size={18} color={COLORS.warning} />
            </View>
            <Text style={styles.sectionTitle}>Preferences</Text>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Navigation size={18} color={COLORS.success} />
              <View style={styles.toggleTexts}>
                <Text style={styles.toggleLabel}>Location Alerts</Text>
                <Text style={styles.toggleSub}>GPS zone monitoring</Text>
              </View>
            </View>
            <Switch
              value={settings.locationAlertsEnabled}
              onValueChange={handleToggleLocationAlerts}
              trackColor={{ false: COLORS.border, true: 'rgba(34, 197, 94, 0.3)' }}
              thumbColor={settings.locationAlertsEnabled ? COLORS.success : '#f4f3f4'}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Moon size={18} color={COLORS.cyan} />
              <View style={styles.toggleTexts}>
                <Text style={styles.toggleLabel}>Dark Mode</Text>
                <Text style={styles.toggleSub}>Reduce eye strain</Text>
              </View>
            </View>
            <Switch
              value={settings.darkMode}
              onValueChange={() => { dispatch(toggleDarkMode()); }}
              trackColor={{ false: COLORS.border, true: 'rgba(6, 182, 212, 0.3)' }}
              thumbColor={settings.darkMode ? COLORS.cyan : '#f4f3f4'}
            />
          </View>


          <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
            <View style={styles.toggleInfo}>
              <Info size={18} color={COLORS.warning} />
              <View style={styles.toggleTexts}>
                <Text style={styles.toggleLabel}>Show Disclaimer</Text>
                <Text style={styles.toggleSub}>Display on every response</Text>
              </View>
            </View>
            <Switch
              value={settings.showDisclaimerAlways}
              onValueChange={() => { dispatch(toggleDisclaimerAlways()); }}
              trackColor={{ false: COLORS.border, true: 'rgba(245, 158, 11, 0.3)' }}
              thumbColor={settings.showDisclaimerAlways ? COLORS.warning : '#f4f3f4'}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.aboutSection}>
          <View style={styles.aboutHeader}>
            <View style={styles.aboutLogoBadge}>
              <ShieldCheck size={24} color={COLORS.cyan} />
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
            All legal databases and computation engines run locally on your device.
          </Text>

          <View style={styles.aboutDisclaimer}>
            <AlertCircle size={14} color={COLORS.textWarning} />
            <Text style={styles.aboutDisclaimerText}>
              This information is for educational purposes only. For official advice, contact your local RTO.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
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
  },
  // Section styling
  section: {
    backgroundColor: COLORS.surface,
    marginBottom: 16,
    borderRadius: BORDER_RADIUS.large,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.textPrimary,
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
    backgroundColor: COLORS.background,
    gap: 12,
  },
  langOptionSelected: {
    backgroundColor: COLORS.lightPrimary,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  langScriptBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langScriptBadgeSelected: {
    backgroundColor: COLORS.primary,
  },
  langScriptText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  langLabel: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.textSecondary,
    flex: 1,
  },
  langLabelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
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
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: '30%',
    flexGrow: 1,
    alignItems: 'center',
  },
  stateChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOWS.medium,
  },
  stateChipCode: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  stateChipName: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
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
    borderBottomColor: COLORS.border,
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
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 15,
  },
  toggleSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  // About section
  aboutSection: {
    backgroundColor: COLORS.navy,
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
    color: COLORS.white,
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
    color: COLORS.cyan,
    fontWeight: '700',
    fontSize: 11,
  },
  aboutEdition: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
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
