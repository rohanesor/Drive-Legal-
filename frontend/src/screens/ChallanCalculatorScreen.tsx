import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
} from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { getStateName } from '../services/location';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface Violation {
  id: string;
  name: string;
  section: string;
  baseFine: number;
  subsequentFineMultiplier: number;
  icon: string;
}

const VIOLATIONS: Violation[] = [
  { id: 'helmet', name: 'No Helmet / Seatbelt Rider', section: 'MV Act §194D', baseFine: 1000, subsequentFineMultiplier: 1.5, icon: 'hardware-chip-outline' },
  { id: 'speeding', name: 'Over Speeding', section: 'MV Act §183', baseFine: 1000, subsequentFineMultiplier: 2.0, icon: 'speedometer-outline' },
  { id: 'signal', name: 'Signal Jump / Red Light', section: 'MV Act §177A', baseFine: 500, subsequentFineMultiplier: 3.0, icon: 'traffic-light-outline' },
  { id: 'parking', name: 'Wrong Parking / Obstruction', section: 'MV Act §122/177', baseFine: 500, subsequentFineMultiplier: 2.0, icon: 'map-outline' },
  { id: 'seatbelt', name: 'Seatbelt Missing', section: 'MV Act §194B', baseFine: 1000, subsequentFineMultiplier: 1.5, icon: 'accessibility-outline' },
  { id: 'phone', name: 'Mobile Phone Use While Driving', section: 'MV Act §184(c)', baseFine: 5000, subsequentFineMultiplier: 2.0, icon: 'phone-portrait-outline' },
  { id: 'drunk', name: 'Drunk Driving', section: 'MV Act §185', baseFine: 10000, subsequentFineMultiplier: 1.5, icon: 'warning-outline' },
  { id: 'license', name: 'Driving Without License', section: 'MV Act §181', baseFine: 5000, subsequentFineMultiplier: 1.0, icon: 'id-card-outline' },
  { id: 'insurance', name: 'No Valid Insurance', section: 'MV Act §196', baseFine: 2000, subsequentFineMultiplier: 2.0, icon: 'shield-checkmark-outline' },
  { id: 'pucc', name: 'Pollution Certificate Missing', section: 'MV Act §190(2)', baseFine: 10000, subsequentFineMultiplier: 1.0, icon: 'cloud-outline' },
];

export const ChallanCalculatorScreen = ({ navigation }: any) => {
  const userState = useSelector((state: RootState) => state.settings.state);

  // Calculator selections
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubsequent, setIsSubsequent] = useState(false);
  const [isCommercial, setIsCommercial] = useState(false);
  const [isLatePayment, setIsLatePayment] = useState(false);

  // Computed Values
  const [totalFine, setTotalFine] = useState(0);
  const [baseSum, setBaseSum] = useState(0);
  const [subsequentAddition, setSubsequentAddition] = useState(0);
  const [commercialAddition, setCommercialAddition] = useState(0);
  const [lateFeeAddition, setLateFeeAddition] = useState(0);

  // Recalculate totals whenever selection or toggles change
  useEffect(() => {
    let base = 0;
    let subsequent = 0;

    selectedIds.forEach((id) => {
      const v = VIOLATIONS.find((item) => item.id === id);
      if (v) {
        base += v.baseFine;
        if (isSubsequent) {
          subsequent += v.baseFine * (v.subsequentFineMultiplier - 1);
        }
      }
    });

    const commercial = isCommercial && selectedIds.length > 0 ? 1000 : 0;
    const subtotal = base + subsequent + commercial;
    const lateFee = isLatePayment ? Math.round(subtotal * 0.1) : 0;

    setBaseSum(base);
    setSubsequentAddition(subsequent);
    setCommercialAddition(commercial);
    setLateFeeAddition(lateFee);
    setTotalFine(subtotal + lateFee);
  }, [selectedIds, isSubsequent, isCommercial, isLatePayment]);

  const toggleViolation = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleConsultAI = (violationName: string) => {
    // Navigates to Chat screen and queries about the violation
    navigation.navigate('Chat', { initialQuery: `What is the law and compounding penalty details for ${violationName} in ${userState}?` });
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.navy} barStyle="light-content" />

      {/* Header bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Challan Calculator</Text>
        <Text style={styles.headerSub}>State Jurisdiction: {getStateName(userState)}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Animated Total Display Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Estimated Fine Total</Text>
          <Text style={styles.totalValue}>₹{totalFine.toLocaleString()}</Text>

          {selectedIds.length > 0 && (
            <View style={styles.breakdownContainer}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Base Violations:</Text>
                <Text style={styles.breakdownVal}>₹{baseSum.toLocaleString()}</Text>
              </View>
              {isSubsequent && subsequentAddition > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Subsequent Offense Multiplier:</Text>
                  <Text style={[styles.breakdownVal, { color: COLORS.pending }]}>+₹{subsequentAddition.toLocaleString()}</Text>
                </View>
              )}
              {isCommercial && commercialAddition > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Commercial Surcharge:</Text>
                  <Text style={[styles.breakdownVal, { color: COLORS.pending }]}>+₹{commercialAddition.toLocaleString()}</Text>
                </View>
              )}
              {isLatePayment && lateFeeAddition > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Late Penalty (10%):</Text>
                  <Text style={[styles.breakdownVal, { color: COLORS.error }]}>+₹{lateFeeAddition.toLocaleString()}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Adjustments & compounding toggles */}
        <View style={styles.adjustmentsContainer}>
          <Text style={styles.sectionTitle}>Compounding Rules & Multipliers</Text>
          
          <View style={styles.rowToggle}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleLabel}>Subsequent Offense</Text>
              <Text style={styles.toggleSub}>Applies state specific repeat-offender multipliers</Text>
            </View>
            <Switch value={isSubsequent} onValueChange={setIsSubsequent} />
          </View>

          <View style={styles.rowToggle}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleLabel}>Commercial Vehicle Surcharge</Text>
              <Text style={styles.toggleSub}>Adds flat +₹1,000 commercial enforcement penalty</Text>
            </View>
            <Switch value={isCommercial} onValueChange={setIsCommercial} />
          </View>

          <View style={styles.rowToggle}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleLabel}>Late Payment (&gt;30 Days)</Text>
              <Text style={styles.toggleSub}>Applies 10% late compounding fee penalty</Text>
            </View>
            <Switch value={isLatePayment} onValueChange={setIsLatePayment} />
          </View>
        </View>

        {/* Violations Select checklist */}
        <Text style={styles.sectionTitle}>Select Traffic Violations</Text>
        
        {VIOLATIONS.map((violation) => {
          const isSelected = selectedIds.includes(violation.id);
          return (
            <View
              key={violation.id}
              style={[
                styles.violationItem,
                isSelected && styles.violationItemSelected,
              ]}
            >
              <TouchableOpacity
                style={styles.violationButton}
                onPress={() => toggleViolation(violation.id)}
                activeOpacity={0.8}
              >
                <View style={styles.checkboxContainer}>
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={isSelected ? COLORS.primary : COLORS.textSecondary}
                  />
                </View>
                
                <View style={styles.violationInfo}>
                  <Text style={styles.violationName}>{violation.name}</Text>
                  <View style={styles.violationSubRow}>
                    <Text style={styles.violationSection}>{violation.section}</Text>
                    <Text style={styles.violationFine}>Base: ₹{violation.baseFine.toLocaleString()}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Consult AI Assistant button */}
              <TouchableOpacity
                style={styles.aiConsultButton}
                onPress={() => handleConsultAI(violation.name)}
                activeOpacity={0.7}
              >
                <Ionicons name="sparkles" size={16} color={COLORS.cyan} />
              </TouchableOpacity>
            </View>
          );
        })}

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
  totalCard: {
    backgroundColor: COLORS.navy,
    borderRadius: BORDER_RADIUS.medium,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  totalLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalValue: {
    ...TYPOGRAPHY.h1,
    fontSize: 42,
    color: COLORS.white,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  breakdownContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
    marginTop: 8,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  breakdownVal: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    fontWeight: '700',
  },
  adjustmentsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 24,
    ...SHADOWS.subtle,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  rowToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    ...TYPOGRAPHY.bodyLarge,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  toggleSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  violationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    ...SHADOWS.subtle,
    overflow: 'hidden',
  },
  violationItemSelected: {
    borderColor: 'rgba(37, 99, 235, 0.4)',
    backgroundColor: COLORS.lightPrimary,
  },
  violationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  violationInfo: {
    flex: 1,
  },
  violationName: {
    ...TYPOGRAPHY.bodyLarge,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  violationSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  violationSection: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  violationFine: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  aiConsultButton: {
    padding: 16,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
