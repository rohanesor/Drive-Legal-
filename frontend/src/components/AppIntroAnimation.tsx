import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from 'react-native';
import { COLORS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

interface AppIntroAnimationProps {
  onFinish: () => void;
}

export const AppIntroAnimation = ({ onFinish }: AppIntroAnimationProps) => {
  // Core logo animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;

  // Shield ring animations
  const ring1Scale = useRef(new Animated.Value(0)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Scale = useRef(new Animated.Value(0)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;

  // Text animations
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;

  // Scan line animation
  const scanY = useRef(new Animated.Value(-1)).current;
  const scanOpacity = useRef(new Animated.Value(0)).current;

  // Road lines
  const roadLeft = useRef(new Animated.Value(0)).current;
  const roadRight = useRef(new Animated.Value(0)).current;
  const roadCenter = useRef(new Animated.Value(0)).current;

  // Final exit animation
  const screenScale = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  // Glow pulse animation
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start the cinematic sequence
    Animated.sequence([
      // Phase 1: Logo burst in (0ms → 600ms)
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),

      // Phase 2: Rings pulse out (600ms → 1100ms)
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ring1Scale, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(100),
          Animated.timing(ring2Scale, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(ring3Scale, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.timing(ring1Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(100),
          Animated.timing(ring2Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(ring3Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
      ]),

      // Phase 3: Scan line across logo (1100ms → 1400ms)
      Animated.parallel([
        Animated.timing(scanOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(scanY, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // Phase 4: Text reveal (1700ms → 2200ms)
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(150),
          Animated.parallel([
            Animated.timing(taglineOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(taglineTranslateY, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          ]),
        ]),
      ]),

      // Phase 5: Hold + glow pulse (2200ms → 2900ms)
      Animated.delay(700),

      // Phase 6: Road lines fly in (2900ms → 3200ms)
      Animated.parallel([
        Animated.timing(roadLeft, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(80),
          Animated.timing(roadCenter, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(160),
          Animated.timing(roadRight, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),

      // Phase 7: Hold (3200ms → 3600ms)
      Animated.delay(400),

      // Phase 8: Cinematic exit — zoom in and fade out (3600ms → 4000ms)
      Animated.parallel([
        Animated.timing(screenScale, {
          toValue: 1.12,
          duration: 500,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 450,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onFinish();
    });

    // Continuous glow pulse (runs in parallel with sequence above)
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const logoRotateInterpolated = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '0deg'],
  });

  const scanTranslateY = scanY.interpolate({
    inputRange: [-1, 1],
    outputRange: [-60, 60],
  });

  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.9],
  });

  const glowScale = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const roadLeftTranslate = roadLeft.interpolate({
    inputRange: [0, 1],
    outputRange: [width / 2, 0],
  });

  const roadRightTranslate = roadRight.interpolate({
    inputRange: [0, 1],
    outputRange: [-width / 2, 0],
  });

  const roadCenterOpacity = roadCenter;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: screenOpacity,
          transform: [{ scale: screenScale }],
        },
      ]}
    >
      <StatusBar backgroundColor="#000000" barStyle="light-content" />

      {/* Background grid lines (subtle) */}
      <View style={styles.gridOverlay} pointerEvents="none">
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={[styles.gridLine, { top: `${i * 14.3}%` as any }]} />
        ))}
      </View>

      {/* Central logo area */}
      <View style={styles.centerContainer}>
        {/* Outermost glow ring */}
        <Animated.View
          style={[
            styles.ring,
            styles.ring3,
            {
              opacity: ring3Opacity,
              transform: [{ scale: ring3Scale }],
            },
          ]}
        />

        {/* Middle ring */}
        <Animated.View
          style={[
            styles.ring,
            styles.ring2,
            {
              opacity: ring2Opacity,
              transform: [{ scale: ring2Scale }],
            },
          ]}
        />

        {/* Inner ring */}
        <Animated.View
          style={[
            styles.ring,
            styles.ring1,
            {
              opacity: ring1Opacity,
              transform: [{ scale: ring1Scale }],
            },
          ]}
        />

        {/* Logo shell with glow pulse */}
        <Animated.View
          style={[
            styles.logoGlow,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />

        {/* Main logo circle */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { rotate: logoRotateInterpolated }],
            },
          ]}
        >
          {/* Shield shape made with nested views */}
          <View style={styles.shieldOuter}>
            <View style={styles.shieldInner}>
              {/* D letter mark */}
              <Text style={styles.logoLetter}>DL</Text>
            </View>
          </View>

          {/* Scan line */}
          <Animated.View
            style={[
              styles.scanLine,
              {
                opacity: scanOpacity,
                transform: [{ translateY: scanTranslateY }],
              },
            ]}
          />
        </Animated.View>

        {/* App name */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          <Text style={styles.appName}>
            <Text style={styles.appNameDrive}>Drive</Text>
            <Text style={styles.appNameLegal}>Legal</Text>
          </Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          style={[
            styles.taglineContainer,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          <View style={styles.taglineLine} />
          <Text style={styles.tagline}>AI-Powered Traffic Law</Text>
          <View style={styles.taglineLine} />
        </Animated.View>
      </View>

      {/* Road animation lines */}
      <View style={styles.roadContainer} pointerEvents="none">
        <Animated.View
          style={[
            styles.roadLine,
            styles.roadLineLeft,
            { transform: [{ translateX: roadLeftTranslate }] },
          ]}
        />
        <Animated.View
          style={[styles.roadLine, styles.roadLineCenter, { opacity: roadCenterOpacity }]}
        />
        <Animated.View
          style={[
            styles.roadLine,
            styles.roadLineRight,
            { transform: [{ translateX: roadRightTranslate }] },
          ]}
        />
      </View>

      {/* Version badge */}
      <Animated.View style={[styles.versionBadge, { opacity: taglineOpacity }]}>
        <Text style={styles.versionText}>v1.0</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(6, 182, 212, 0.04)',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Rings
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
  },
  ring1: {
    width: 140,
    height: 140,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    backgroundColor: 'rgba(6, 182, 212, 0.04)',
  },
  ring2: {
    width: 190,
    height: 190,
    borderColor: 'rgba(6, 182, 212, 0.18)',
    backgroundColor: 'transparent',
  },
  ring3: {
    width: 250,
    height: 250,
    borderColor: 'rgba(6, 182, 212, 0.08)',
    backgroundColor: 'transparent',
  },
  // Glow halo
  logoGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
  },
  // Logo
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0A0A0A',
    borderWidth: 2,
    borderColor: '#00E5FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  shieldOuter: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldInner: {
    width: 48,
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    fontSize: 20,
    fontWeight: '900',
    color: '#00E5FF',
    letterSpacing: 1,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(0, 229, 255, 0.8)',
  },
  // Text
  textContainer: {
    marginTop: 28,
    alignItems: 'center',
  },
  appName: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 2,
  },
  appNameDrive: {
    color: '#FFFFFF',
  },
  appNameLegal: {
    color: '#00E5FF',
  },
  taglineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  taglineLine: {
    width: 28,
    height: 1,
    backgroundColor: 'rgba(0, 229, 255, 0.4)',
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(0, 229, 255, 0.75)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  // Road lines
  roadContainer: {
    position: 'absolute',
    bottom: height * 0.1,
    left: 0,
    right: 0,
    height: 3,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  roadLine: {
    flex: 1,
    height: 1,
    marginHorizontal: 4,
    borderRadius: 1,
  },
  roadLineLeft: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  roadLineCenter: {
    backgroundColor: 'rgba(0, 229, 255, 0.5)',
    height: 2,
  },
  roadLineRight: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  // Version
  versionBadge: {
    position: 'absolute',
    bottom: 32,
    right: 28,
  },
  versionText: {
    fontSize: 11,
    color: 'rgba(163, 163, 163, 0.5)',
    fontWeight: '500',
    letterSpacing: 1,
  },
});
