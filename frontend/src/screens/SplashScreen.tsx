import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { MapPin, Calculator, MessageCircle, WifiOff, ShieldCheck, CheckCircle, ArrowRight } from 'lucide-react-native';
import { AppIntroAnimation } from '../components/AppIntroAnimation';

const { width } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    title: 'Smart Location Search',
    description: 'Instantly discover state-specific traffic laws, municipal rules, and active speed zones automatically via GPS.',
    Icon: MapPin,
    color: COLORS.primary,
  },
  {
    title: 'Offline Challan Calculator',
    description: 'Determine exact compounding penalties, offense multipliers, and commercial surcharges without internet access.',
    Icon: Calculator,
    color: COLORS.warning,
  },
  {
    title: 'Verified AI Chatbot',
    description: 'Ask traffic law questions in English, Tamil, or Hindi and get answers backed by real, tamper-proof legal citations.',
    Icon: MessageCircle,
    color: COLORS.cyan,
  },
  {
    title: 'Offline-First Operations',
    description: 'All local SQLite database rules, zone geometries, and template engines are stored locally on your device.',
    Icon: WifiOff,
    color: COLORS.success,
  },
];

export const SplashScreen = ({ navigation }: any) => {
  const [showIntro, setShowIntro] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const roadAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Show the intro animation first
  if (showIntro) {
    return <AppIntroAnimation onFinish={() => setShowIntro(false)} />;
  }

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(roadAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(roadAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const handleNext = () => {
    if (currentSlide < ONBOARDING_DATA.length - 1) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentSlide(currentSlide + 1);
        slideAnim.setValue(50);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, friction: 6, useNativeDriver: true }),
        ]).start();
      });
    } else {
      navigation.replace('Mobile');
    }
  };

  const handleSkip = () => {
    navigation.replace('Mobile');
  };

  const roadTranslateX = roadAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.6],
    outputRange: [0.15, 0.4],
  });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.navy} barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.miniLogo}>
            <ShieldCheck size={16} color={COLORS.cyan} />
          </View>
          <Text style={styles.logoText}>DriveLegal</Text>
        </View>
        {currentSlide < ONBOARDING_DATA.length - 1 && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.visualContainer}>
        <Animated.View style={[styles.glowEmblemContainer, { opacity: glowOpacity }]}>
          <View style={styles.glowPulseOuter} />
          <View style={styles.glowPulseInner} />
        </Animated.View>
        <View style={styles.shieldLogo}>
          {React.createElement(ONBOARDING_DATA[currentSlide].Icon, {
            size: 64,
            color: ONBOARDING_DATA[currentSlide].color,
          })}
        </View>
        <View style={styles.roadLinesContainer}>
          <Animated.View style={[styles.roadLineLeft, { transform: [{ translateX: roadTranslateX }] }]} />
          <View style={[styles.roadLineCenter, { backgroundColor: ONBOARDING_DATA[currentSlide].color }]} />
          <Animated.View style={[styles.roadLineRight, { transform: [{ translateX: Animated.multiply(roadTranslateX, -1) }] }]} />
        </View>
      </View>

      <Animated.View
        style={[
          styles.contentContainer,
          { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
        ]}
      >
        <Text style={styles.slideTitle}>{ONBOARDING_DATA[currentSlide].title}</Text>
        <Text style={styles.slideDescription}>{ONBOARDING_DATA[currentSlide].description}</Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.dotContainer}>
          {ONBOARDING_DATA.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                currentSlide === idx
                  ? [styles.dotActive, { backgroundColor: ONBOARDING_DATA[idx].color }]
                  : styles.dotInactive,
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: ONBOARDING_DATA[currentSlide].color }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>
            {currentSlide === ONBOARDING_DATA.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          {currentSlide === ONBOARDING_DATA.length - 1 ? (
            <CheckCircle size={18} color={COLORS.white} />
          ) : (
            <ArrowRight size={18} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    height: 70,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniLogo: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: BORDER_RADIUS.small,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  logoText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.small,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skipText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  visualContainer: {
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowEmblemContainer: {
    position: 'absolute',
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowPulseOuter: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  glowPulseInner: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(6, 182, 212, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.06)',
  },
  shieldLogo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  roadLinesContainer: {
    position: 'absolute',
    bottom: 0,
    width: 120,
    height: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    opacity: 0.25,
  },
  roadLineLeft: {
    width: 3,
    height: '100%',
    backgroundColor: COLORS.white,
    transform: [{ skewX: '-20deg' }],
  },
  roadLineCenter: {
    width: 4,
    height: '100%',
    borderRadius: 2,
  },
  roadLineRight: {
    width: 3,
    height: '100%',
    backgroundColor: COLORS.white,
    transform: [{ skewX: '20deg' }],
  },
  contentContainer: {
    flex: 0.8,
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  slideTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '700',
  },
  slideDescription: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    height: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderColor: COLORS.navy,
    backgroundColor: COLORS.navy,
  },
  dotContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  dotInactive: {
    width: 8,
    backgroundColor: COLORS.textSecondary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BORDER_RADIUS.medium,
    ...SHADOWS.medium,
  },
  actionButtonText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.white,
    fontWeight: 'bold',
  },
});
