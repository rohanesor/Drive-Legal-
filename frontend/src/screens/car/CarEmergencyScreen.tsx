import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CAR_COLORS, CAR_TYPOGRAPHY, CAR_SPACING } from '../../constants/theme';
import { ArrowLeft, Phone } from 'lucide-react-native';

export const CarEmergencyScreen = () => {
  const navigation = useNavigation();

  const handleDial = (number: string) => {
    Linking.openURL(`tel:${number}`).catch((err) => {
      console.error('Failed to dial emergency number:', err);
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color={CAR_COLORS.danger} size={28} />
          <Text style={styles.headerText}>BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🚨 SOS DIALER</Text>
        <View style={styles.spacer} />
      </View>

      {/* Massive buttons list */}
      <View style={styles.sosContainer}>
        <TouchableOpacity 
          style={[styles.sosRow, { borderColor: CAR_COLORS.danger }]}
          onPress={() => handleDial('100')}
        >
          <View style={styles.sosLabelCol}>
            <Text style={styles.sosNumber}>100</Text>
            <Text style={styles.sosName}>POLICE EMERGENCY</Text>
          </View>
          <View style={[styles.dialCircle, { backgroundColor: CAR_COLORS.danger }]}>
            <Phone color="#FFFFFF" size={32} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.sosRow, { borderColor: '#EAB308' }]}
          onPress={() => handleDial('102')}
        >
          <View style={styles.sosLabelCol}>
            <Text style={[styles.sosNumber, { color: '#EAB308' }]}>102</Text>
            <Text style={styles.sosName}>AMBULANCE SERVICE</Text>
          </View>
          <View style={[styles.dialCircle, { backgroundColor: '#EAB308' }]}>
            <Phone color="#000000" size={32} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.sosRow, { borderColor: CAR_COLORS.accent }]}
          onPress={() => handleDial('101')}
        >
          <View style={styles.sosLabelCol}>
            <Text style={[styles.sosNumber, { color: CAR_COLORS.accent }]}>101</Text>
            <Text style={styles.sosName}>FIRE DEPT BRIGADE</Text>
          </View>
          <View style={[styles.dialCircle, { backgroundColor: CAR_COLORS.accent }]}>
            <Phone color="#000000" size={32} />
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.disclaimerText}>
        ⚠️ Double tap or click any row to call instantly from vehicle SIM card.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CAR_COLORS.background,
    padding: CAR_SPACING.padding,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  headerText: {
    color: CAR_COLORS.danger,
    fontSize: CAR_TYPOGRAPHY.status.fontSize,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  headerTitle: {
    color: CAR_COLORS.danger,
    fontSize: CAR_TYPOGRAPHY.title.fontSize,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  spacer: {
    width: 80,
  },
  sosContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
    marginVertical: 40,
  },
  sosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 3,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: '#0A0A0A',
  },
  sosLabelCol: {
    flex: 1,
  },
  sosNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: CAR_COLORS.danger,
  },
  sosName: {
    fontSize: 16,
    color: '#E2E8F0',
    fontWeight: 'bold',
    marginTop: 4,
    letterSpacing: 1,
  },
  dialCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerText: {
    color: CAR_COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
});

export default CarEmergencyScreen;
