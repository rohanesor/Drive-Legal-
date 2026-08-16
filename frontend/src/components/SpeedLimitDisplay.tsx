import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Easing } from 'react-native';
import { CAR_COLORS } from '../constants/theme';

interface SpeedLimitDisplayProps {
  speedLimit: number;
  isSpeeding: boolean;
  size?: number;
}

export const SpeedLimitDisplay: React.FC<SpeedLimitDisplayProps> = ({
  speedLimit,
  isSpeeding,
  size = 48,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (isSpeeding) {
      // Create a continuous pulsing animation for overspeed warnings
      animation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 600,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.1,
              duration: 600,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 600,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.0,
              duration: 600,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      animation.start();
    } else {
      // Reset values if not speeding
      pulseAnim.setValue(1);
      scaleAnim.setValue(1);
    }

    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [isSpeeding, pulseAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      {isSpeeding && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: size + 6,
              height: size + 6,
              borderRadius: (size + 6) / 2,
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.2],
                outputRange: [0.6, 0],
              }),
            },
          ]}
        />
      )}
      <Animated.View
        style={[
          styles.sign,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: isSpeeding ? CAR_COLORS.danger : '#E0E0E0',
            borderWidth: Math.max(3, size * 0.08),
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text
          style={[
            styles.number,
            {
              fontSize: Math.round(size * 0.36),
              color: isSpeeding ? CAR_COLORS.danger : '#000000',
            },
          ]}
        >
          {speedLimit}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sign: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  number: {
    fontWeight: '900',
    textAlign: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: CAR_COLORS.danger,
    backgroundColor: 'transparent',
  },
});
