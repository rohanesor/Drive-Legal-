import { useCallback, useRef } from 'react';
import { useAppMode } from './useAppMode';
import { Animated } from 'react-native';

export const usePerformance = () => {
  const { preferences, isCar } = useAppMode();
  const isReducedAnimation = preferences.reducedAnimations || isCar;

  /**
   * Safe animation configuration wrapper.
   * Returns instant timings if reducedAnimations is active, preventing frame drops.
   */
  const adaptiveAnimation = useCallback((
    value: Animated.Value | Animated.ValueXY,
    config: Animated.TimingAnimationConfig
  ): Animated.CompositeAnimation => {
    if (isReducedAnimation) {
      return Animated.timing(value, {
        ...config,
        duration: 0,               // Force instant rendering on old SoCs
        useNativeDriver: true,      // Bypass bridge threads
      });
    }
    return Animated.timing(value, {
      ...config,
      useNativeDriver: true,
    });
  }, [isReducedAnimation]);

  /**
   * Throttles execution of rapid event triggers (e.g. scroll updates)
   */
  const useThrottledCallback = <A extends any[]>(
    callback: (...args: A) => void,
    delayMs: number
  ) => {
    const lastCalledRef = useRef<number>(0);
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    return useCallback((...args: A) => {
      const now = Date.now();
      if (now - lastCalledRef.current >= delayMs) {
        lastCalledRef.current = now;
        callbackRef.current(...args);
      }
    }, [delayMs]);
  };

  return {
    isReducedAnimation,
    adaptiveAnimation,
    useThrottledCallback,
  };
};

export default usePerformance;
