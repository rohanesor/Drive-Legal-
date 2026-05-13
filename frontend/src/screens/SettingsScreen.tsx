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
import { getStateName } from '../services/location';

// Available languages with native script display
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'hi', label: 'Hindi (हिंदी)' },
];

// Available Indian states
const STATES = ['TN', 'KN', 'AP', 'KL', 'MH', 'DL'];

export const SettingsScreen = () => {
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

  return (
    <ScrollView style={styles.container}>
      {/* Language Selection Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Language</Text>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.option,
              settings.language === lang.code && styles.optionSelected,
            ]}
            onPress={() => dispatch(setLanguage(lang.code as 'en' | 'ta' | 'hi'))}
          >
            <Text
              style={[
                styles.optionText,
                settings.language === lang.code && styles.optionTextSelected,
              ]}
            >
              {lang.label}
            </Text>
            {settings.language === lang.code && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* State Selection Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>State</Text>
        {STATES.map((state) => (
          <TouchableOpacity
            key={state}
            style={[
              styles.option,
              settings.state === state && styles.optionSelected,
            ]}
            onPress={() => dispatch(setState(state))}
          >
            <Text
              style={[
                styles.optionText,
                settings.state === state && styles.optionTextSelected,
              ]}
            >
              {getStateName(state)}
            </Text>
            {settings.state === state && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Toggle Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Location Alerts</Text>
          <Switch
            value={settings.locationAlertsEnabled}
            onValueChange={() => { dispatch(toggleLocationAlerts()); }}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Dark Mode</Text>
          <Switch
            value={settings.darkMode}
            onValueChange={() => { dispatch(toggleDarkMode()); }}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Show Disclaimer Every Response</Text>
          <Switch
            value={settings.showDisclaimerAlways}
            onValueChange={() => { dispatch(toggleDisclaimerAlways()); }}
          />
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          DriveLegal v1.0.0{'\n'}
          AI-powered traffic law assistant{'\n'}
          Fully offline - no internet required{'\n\n'}
          This information is for educational purposes only.{'\n'}
          For official advice, contact your local RTO.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#ffffff',
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  optionSelected: {
    backgroundColor: '#e0e7ff',
  },
  optionText: {
    fontSize: 16,
    color: '#4b5563',
  },
  optionTextSelected: {
    color: '#1e40af',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#1e40af',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowLabel: {
    fontSize: 16,
    color: '#4b5563',
    flex: 1,
    marginRight: 16,
  },
  aboutText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },
});
