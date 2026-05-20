import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  StatusBar,
} from 'react-native';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface Contact {
  id: string;
  name: string;
  number: string;
  description: string;
  icon: string;
  color: string;
}

const EMERGENCY_CONTACTS: Contact[] = [
  {
    id: 'police',
    name: 'Traffic Police Helpline',
    number: '103',
    description: 'Direct line for reporting accidents, signaling issues, or requesting municipal traffic help.',
    icon: 'shield-outline',
    color: COLORS.primary,
  },
  {
    id: 'national',
    name: 'National Emergency Number',
    number: '112',
    description: 'Unified single emergency response number for police, fire department, and healthcare.',
    icon: 'alert-circle-outline',
    color: COLORS.error,
  },
  {
    id: 'ambulance',
    name: 'Medical Ambulance Support',
    number: '102',
    description: 'National ambulance hotline for urgent medical transportation and paramedic support.',
    icon: 'medical-outline',
    color: COLORS.success,
  },
  {
    id: 'nhai',
    name: 'NHAI Highway Assistance',
    number: '1033',
    description: 'National Highways Authority of India helpline for towing, highway patrolling, and accidents.',
    icon: 'navigate-outline',
    color: COLORS.warning,
  },
  {
    id: 'towing',
    name: 'Roadside Towing Help',
    number: '1800-419-2000',
    description: 'Commercial 24/7 vehicle towing service and roadside mechanical breakdown assistance.',
    icon: 'car-outline',
    color: COLORS.primary,
  },
];

export const EmergencyScreen = () => {
  const handleCall = (number: string, name: string) => {
    const url = `tel:${number}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (!supported) {
          Alert.alert('Calling Not Supported', `Dialer is not supported on this device. Call number directly: ${number}`);
        } else {
          Alert.alert(
            'Confirm Call',
            `Would you like to call ${name} (${number})?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Call Now', onPress: () => Linking.openURL(url) },
            ]
          );
        }
      })
      .catch((err) => console.error('An error occurred checking dialer support', err));
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.navy} barStyle="light-content" />

      {/* Header bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency Services</Text>
        <Text style={styles.headerSub}>Instant tap-to-dial hotlines for highway and legal safety</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.alertCard}>
          <Ionicons name="warning" size={24} color={COLORS.textWarning} />
          <Text style={styles.alertCardText}>
            Use these numbers only in case of active roadside emergencies, accidents, or official towing requests.
          </Text>
        </View>

        {EMERGENCY_CONTACTS.map((contact) => (
          <TouchableOpacity
            key={contact.id}
            style={styles.contactCard}
            onPress={() => handleCall(contact.number, contact.name)}
            activeOpacity={0.9}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: contact.color + '15' }]}>
                <Ionicons name={contact.icon as any} size={24} color={contact.color} />
              </View>
              
              <View style={styles.cardInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={[styles.contactNumber, { color: contact.color }]}>{contact.number}</Text>
              </View>

              <View style={styles.callIconBadge}>
                <Ionicons name="call" size={18} color={COLORS.white} />
              </View>
            </View>

            <Text style={styles.contactDesc}>{contact.description}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.noticeContainer}>
          <Ionicons name="information-circle" size={16} color={COLORS.textSecondary} />
          <Text style={styles.noticeText}>
            Local helpline availability can vary based on network service provider and state jurisdiction boundaries.
          </Text>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    ...SHADOWS.medium,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  headerSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.lightWarning,
    borderWidth: 1,
    borderColor: COLORS.borderWarning,
    borderRadius: BORDER_RADIUS.medium,
    padding: 14,
    marginBottom: 20,
  },
  alertCardText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textWarning,
    flex: 1,
    lineHeight: 18,
  },
  contactCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  contactName: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  contactNumber: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: 'bold',
    marginTop: 2,
  },
  callIconBadge: {
    backgroundColor: COLORS.success,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.subtle,
  },
  contactDesc: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  noticeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
  },
  noticeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    flex: 1,
  },
});
