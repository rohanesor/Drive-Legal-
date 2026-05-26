import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, GLASS } from '../constants/theme';
import { getStateName } from '../services/locationService';
import { Gauge, Zap, HardHat, UserCheck, CreditCard, ShieldCheck, AlertTriangle, Package, FileText, MapPin, FolderOpen, Smartphone, Wine, Calculator, Wallet, SlidersHorizontal, Repeat, Bus, Clock, List, AlertCircle, Sparkles, ChevronRight, CheckSquare, Square } from 'lucide-react-native';
import { executeQuery } from '../services/pythonBridge';

interface Violation {
  id: string;
  name: string;
  section: string;
  baseFine: number;
  subsequentFineMultiplier: number;
  Icon: any;
}

const VIOLATION_MAP: Record<string, { name: string; Icon: any }> = {
  speeding: { name: 'Over Speeding', Icon: Gauge },
  traffic_signal: { name: 'Signal Jump / Red Light', Icon: Zap },
  no_helmet: { name: 'No Helmet / Seatbelt Rider', Icon: HardHat },
  no_seatbelt: { name: 'Seatbelt Missing', Icon: UserCheck },
  no_license: { name: 'Driving Without License', Icon: CreditCard },
  no_insurance: { name: 'No Valid Insurance', Icon: ShieldCheck },
  dangerous_driving: { name: 'Dangerous Driving', Icon: AlertTriangle },
  overloading: { name: 'Overloading Vehicle', Icon: Package },
  no_registration: { name: 'Driving Without Registration', Icon: FileText },
  parking_violation: { name: 'Wrong Parking / Obstruction', Icon: MapPin },
  no_documents: { name: 'Missing Required Documents', Icon: FolderOpen },
  mobile_usage: { name: 'Mobile Phone Use While Driving', Icon: Smartphone },
  drunk_driving: { name: 'Drunk Driving', Icon: Wine },
};

const parseFine = (fineText: string | null | undefined): number => {
  if (!fineText) return 0;
  const match = fineText.replace(/,/g, '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

export const ChallanCalculatorScreen = ({ navigation }: any) => {
  const userState = useSelector((state: RootState) => state.settings.state);

  // Calculator selections
  const [violations, setViolations] = useState<Violation[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubsequent, setIsSubsequent] = useState(false);
  const [isCommercial, setIsCommercial] = useState(false);
  const [isLatePayment, setIsLatePayment] = useState(false);
  const [loading, setLoading] = useState(true);

  // Computed Values
  const [totalFine, setTotalFine] = useState(0);
  const [baseSum, setBaseSum] = useState(0);
  const [subsequentAddition, setSubsequentAddition] = useState(0);
  const [commercialAddition, setCommercialAddition] = useState(0);
  const [lateFeeAddition, setLateFeeAddition] = useState(0);

  // Animations
  const totalPulse = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const loadingScale = useRef(new Animated.Value(0.9)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;

  // Shimmer animation for total card
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  // Loading entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(loadingScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(loadingOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // Pulse total on change
  useEffect(() => {
    if (totalFine > 0) {
      Animated.sequence([
        Animated.timing(totalPulse, { toValue: 1.06, duration: 150, useNativeDriver: true }),
        Animated.spring(totalPulse, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
  }, [totalFine]);

  // Fetch penalties on mount or when state selection changes
  useEffect(() => {
    const fetchPenalties = async () => {
      setLoading(true);
      setSelectedIds([]); // Clear selection when state changes
      try {
        const response = await executeQuery({
          action: 'get_penalties',
          state: userState,
          language: 'en',
        } as any);
        if (response.status === 'success' && (response as any).penalties) {
          const dbPenalties = (response as any).penalties;
          const mappedViolations: Violation[] = dbPenalties.map((p: any) => {
            const mapInfo = VIOLATION_MAP[p.violation_type] || {
              name: p.violation_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
              Icon: AlertTriangle,
            };
            const baseFine = parseFine(p.first_offense);
            const secondFine = parseFine(p.second_offense);
            const subsequentFineMultiplier = baseFine > 0 ? (secondFine || baseFine) / baseFine : 1.0;
            
            // Format section nicely
            const sectionText = p.section ? p.section.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Motor Vehicles Act';

            return {
              id: p.id,
              name: mapInfo.name,
              section: sectionText.startsWith('Mv') ? sectionText.replace('Mv', 'MV') : sectionText,
              baseFine,
              subsequentFineMultiplier,
              Icon: mapInfo.Icon,
            };
          });
          setViolations(mappedViolations);
        } else {
          setViolations([]);
        }
      } catch (error) {
        console.error('Error fetching penalties:', error);
        setViolations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPenalties();
  }, [userState]);

  // Recalculate totals whenever selection or toggles change
  useEffect(() => {
    let base = 0;
    let subsequent = 0;

    selectedIds.forEach((id) => {
      const v = violations.find((item) => item.id === id);
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
  }, [selectedIds, isSubsequent, isCommercial, isLatePayment, violations]);

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

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.03, 0.1, 0.03],
  });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.navy} barStyle="light-content" />

      {/* Premium Header bar */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Calculator size={22} color={COLORS.cyan} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Challan Calculator</Text>
            <Text style={styles.headerSub}>
              <MapPin size={11} color={COLORS.cyan} /> {getStateName(userState)} Jurisdiction
            </Text>
          </View>
        </View>
        <View style={styles.headerBadge}>
          <ShieldCheck size={12} color={COLORS.success} />
          <Text style={styles.headerBadgeText}>Verified</Text>
        </View>
      </View>

      {loading ? (
        <Animated.View style={[styles.container, styles.loadingContainer, {
          opacity: loadingOpacity,
          transform: [{ scale: loadingScale }],
        }]}>
          <View style={styles.loadingOrbOuter}>
            <View style={styles.loadingOrbInner}>
              <ActivityIndicator size="large" color={COLORS.cyan} />
            </View>
          </View>
          <Text style={styles.loadingTitle}>Loading Traffic Laws</Text>
          <Text style={styles.loadingText}>{getStateName(userState)} penalty database</Text>
        </Animated.View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Animated Total Display Card with shimmer */}
          <Animated.View style={[styles.totalCard, { transform: [{ scale: totalPulse }] }]}>
            {/* Shimmer overlay */}
            <Animated.View style={[styles.shimmerOverlay, { opacity: shimmerOpacity }]} />
            
            <View style={styles.totalCardHeader}>
              <View style={styles.totalCardIcon}>
                <Wallet size={18} color={COLORS.cyan} />
              </View>
              <Text style={styles.totalLabel}>ESTIMATED FINE TOTAL</Text>
            </View>
            
            <Text style={styles.totalValue}>₹{totalFine.toLocaleString()}</Text>
            
            {selectedIds.length > 0 && (
              <View style={styles.breakdownContainer}>
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelRow}>
                    <View style={[styles.breakdownDot, { backgroundColor: COLORS.primary }]} />
                    <Text style={styles.breakdownLabel}>Base Violations</Text>
                  </View>
                  <Text style={styles.breakdownVal}>₹{baseSum.toLocaleString()}</Text>
                </View>
                {isSubsequent && subsequentAddition > 0 && (
                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelRow}>
                      <View style={[styles.breakdownDot, { backgroundColor: COLORS.warning }]} />
                      <Text style={styles.breakdownLabel}>Repeat Offense Multiplier</Text>
                    </View>
                    <Text style={[styles.breakdownVal, { color: COLORS.warning }]}>+₹{subsequentAddition.toLocaleString()}</Text>
                  </View>
                )}
                {isCommercial && commercialAddition > 0 && (
                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelRow}>
                      <View style={[styles.breakdownDot, { backgroundColor: COLORS.pending }]} />
                      <Text style={styles.breakdownLabel}>Commercial Surcharge</Text>
                    </View>
                    <Text style={[styles.breakdownVal, { color: COLORS.pending }]}>+₹{commercialAddition.toLocaleString()}</Text>
                  </View>
                )}
                {isLatePayment && lateFeeAddition > 0 && (
                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelRow}>
                      <View style={[styles.breakdownDot, { backgroundColor: COLORS.error }]} />
                      <Text style={styles.breakdownLabel}>Late Penalty (10%)</Text>
                    </View>
                    <Text style={[styles.breakdownVal, { color: COLORS.error }]}>+₹{lateFeeAddition.toLocaleString()}</Text>
                  </View>
                )}
              </View>
            )}

            {selectedIds.length === 0 && (
              <Text style={styles.totalHint}>Select violations below to calculate fines</Text>
            )}
          </Animated.View>

          {/* Adjustments & compounding toggles */}
          <View style={styles.adjustmentsContainer}>
            <View style={styles.sectionHeader}>
              <SlidersHorizontal size={18} color={COLORS.cyan} />
              <Text style={styles.sectionTitle}>Compounding Rules</Text>
            </View>
            
            <View style={styles.rowToggle}>
              <View style={styles.toggleIconContainer}>
                <Repeat size={18} color={COLORS.warning} />
              </View>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>Subsequent Offense</Text>
                <Text style={styles.toggleSub}>State-specific repeat-offender multipliers</Text>
              </View>
              <Switch
                value={isSubsequent}
                onValueChange={setIsSubsequent}
                trackColor={{ false: COLORS.border, true: 'rgba(245, 158, 11, 0.3)' }}
                thumbColor={isSubsequent ? COLORS.warning : '#f4f3f4'}
              />
            </View>

            <View style={styles.rowToggle}>
              <View style={styles.toggleIconContainer}>
                <Bus size={18} color={COLORS.primary} />
              </View>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>Commercial Vehicle</Text>
                <Text style={styles.toggleSub}>Flat +₹1,000 commercial enforcement penalty</Text>
              </View>
              <Switch
                value={isCommercial}
                onValueChange={setIsCommercial}
                trackColor={{ false: COLORS.border, true: 'rgba(37, 99, 235, 0.3)' }}
                thumbColor={isCommercial ? COLORS.primary : '#f4f3f4'}
              />
            </View>

            <View style={[styles.rowToggle, { borderBottomWidth: 0 }]}>
              <View style={styles.toggleIconContainer}>
                <Clock size={18} color={COLORS.error} />
              </View>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>Late Payment (&gt;30 Days)</Text>
                <Text style={styles.toggleSub}>10% compounding fee penalty</Text>
              </View>
              <Switch
                value={isLatePayment}
                onValueChange={setIsLatePayment}
                trackColor={{ false: COLORS.border, true: 'rgba(239, 68, 68, 0.3)' }}
                thumbColor={isLatePayment ? COLORS.error : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Violations Select checklist */}
          <View style={styles.sectionHeader}>
            <List size={18} color={COLORS.cyan} />
            <Text style={styles.sectionTitle}>Select Traffic Violations</Text>
            {violations.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{selectedIds.length}/{violations.length}</Text>
              </View>
            )}
          </View>
          
          {violations.length === 0 ? (
            <View style={styles.noViolationsContainer}>
              <View style={styles.noViolationsIcon}>
                <AlertCircle size={36} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.noViolationsTitle}>No Laws Found</Text>
              <Text style={styles.loadingText}>No structured laws found for {getStateName(userState)} in the local database.</Text>
            </View>
          ) : (
            violations.map((violation) => {
              const isSelected = selectedIds.includes(violation.id);
              return (
                <TouchableOpacity
                  key={violation.id}
                  style={[
                    styles.violationItem,
                    isSelected && styles.violationItemSelected,
                  ]}
                  onPress={() => toggleViolation(violation.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.violationMain}>
                    <View style={[
                      styles.violationIconCircle,
                      isSelected && styles.violationIconCircleSelected,
                    ]}>
                      <violation.Icon
                        size={20}
                        color={isSelected ? COLORS.primary : COLORS.textSecondary}
                      />
                    </View>
                    
                    <View style={styles.violationInfo}>
                      <Text style={[
                        styles.violationName,
                        isSelected && { color: COLORS.primary },
                      ]}>{violation.name}</Text>
                      <View style={styles.violationSubRow}>
                        <Text style={styles.violationSection}>{violation.section}</Text>
                        <View style={styles.fineBadge}>
                          <Text style={[
                            styles.violationFine,
                            isSelected && { color: COLORS.primary },
                          ]}>₹{violation.baseFine.toLocaleString()}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.violationRight}>
                      {isSelected ? (
                        <CheckSquare size={24} color={COLORS.primary} />
                      ) : (
                        <Square size={24} color={COLORS.border} />
                      )}
                    </View>
                  </View>

                  {/* AI Consult strip */}
                  {isSelected && (
                    <TouchableOpacity
                      style={styles.aiConsultStrip}
                      onPress={() => handleConsultAI(violation.name)}
                      activeOpacity={0.7}
                    >
                      <Sparkles size={14} color={COLORS.cyan} />
                      <Text style={styles.aiConsultText}>Ask TrafiAI about this violation</Text>
                      <ChevronRight size={14} color={COLORS.cyan} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  loadingOrbOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  loadingOrbInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginTop: 8,
  },
  loadingText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  noViolationsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  noViolationsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noViolationsTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.textPrimary,
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
    color: COLORS.cyan,
    marginTop: 2,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
    ...GLASS.light,
  },
  headerBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Premium Total Card
  totalCard: {
    backgroundColor: COLORS.navy,
    borderRadius: BORDER_RADIUS.large,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    ...SHADOWS.strong,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.15)',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 182, 212, 0.5)',
    borderRadius: BORDER_RADIUS.large,
  },
  totalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  totalCardIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalLabel: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '700',
    letterSpacing: 1.5,
    fontSize: 11,
  },
  totalValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.white,
    marginVertical: 8,
    letterSpacing: -1,
  },
  totalHint: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 4,
  },
  breakdownContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 14,
    marginTop: 10,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  breakdownLabel: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  breakdownVal: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
  // Adjustments Section
  adjustmentsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 24,
    ...SHADOWS.subtle,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.lightPrimary,
  },
  countBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  rowToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  toggleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  toggleSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 1,
    fontSize: 11,
  },
  // Violation Cards
  violationItem: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    ...SHADOWS.subtle,
    overflow: 'hidden',
  },
  violationItemSelected: {
    borderColor: 'rgba(37, 99, 235, 0.35)',
    backgroundColor: COLORS.lightPrimary,
    ...SHADOWS.medium,
  },
  violationMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  violationIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  violationIconCircleSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  violationInfo: {
    flex: 1,
  },
  violationName: {
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  violationSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  violationSection: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  fineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.small,
    backgroundColor: COLORS.background,
  },
  violationFine: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontSize: 12,
  },
  violationRight: {
    paddingLeft: 4,
  },
  aiConsultStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(37, 99, 235, 0.12)',
    backgroundColor: 'rgba(6, 182, 212, 0.04)',
  },
  aiConsultText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.cyan,
    fontWeight: '600',
    flex: 1,
    fontSize: 12,
  },
});
