/**
 * Theme constants matching the DriveLegal Brand Identity & Design System.
 */

import { colorsLight } from './colorsLight';
import { colorsDark } from './colorsDark';

export { colorsLight, colorsDark };

export const COLORS = colorsLight;

export const createColors = (isDark: boolean) => {
  return isDark ? colorsDark : colorsLight;
};


export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: COLORS.textPrimary,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const, // SemiBold
    color: COLORS.textPrimary,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const, // SemiBold
    color: COLORS.textPrimary,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: 'normal' as const,
    color: COLORS.textPrimary,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    color: COLORS.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const, // Medium
    color: COLORS.textSecondary,
  },
};

export const SHADOWS = {
  subtle: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  strong: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  }),
};

export const BORDER_RADIUS = {
  small: 6,
  medium: 12,
  large: 20,
  xl: 28,
  round: 9999,
};

/**
 * Glassmorphism presets for premium UI elements.
 * Apply as background + border styles on Views.
 */
export const GLASS = {
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  dark: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cyan: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.18)',
  },
  frosted: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
};

/**
 * Gradient color stops for LinearGradient components
 * (used as reference since RN doesn't support CSS gradients natively).
 */
export const GRADIENTS = {
  cyanBlue: ['#06B6D4', '#2563EB'],
  navyCyan: ['#0F172A', '#164E63'],
  successMint: ['#22C55E', '#06B6D4'],
  warningAmber: ['#F59E0B', '#F97316'],
  errorRose: ['#EF4444', '#E11D48'],
  darkNavy: ['#0F172A', '#1E293B'],
  premiumDark: ['#0F172A', '#0C1426', '#070D19'],
  cyberpunkNeon: ['#A855F7', '#06B6D4'],
  teslaCore: ['#DC2626', '#0A0A0A'],
  electricViolet: ['#6366F1', '#A855F7'],
};

export const CAR_COLORS = {
  background: '#000000', // Pure black for OLED power savings & high contrast
  surface: '#0A0A0A', // High-contrast dark grey surface
  surfaceHover: '#161616', // High-contrast touch feedback state
  text: '#FFFFFF', // Maximum contrast white text
  textSecondary: '#A3A3A3', // Muted gray subtexts
  accent: '#00E5FF', // High-visibility cyan
  warning: '#FFD600', // Vibrant safety yellow
  danger: '#FF1744', // Brilliant emergency red
  success: '#00E676', // High-contrast valid green
  border: '#262626', // Dark, defined borders

  // Aliases for compatibility with shared mobile components
  primary: '#00E5FF',
  navy: '#000000',
  cyan: '#00E5FF',
  error: '#FF1744',
  pending: '#FFD600',
  info: '#00E5FF',
  textPrimary: '#FFFFFF',
  white: '#FFFFFF',
  black: '#000000',
  lightPrimary: 'rgba(0, 229, 255, 0.1)',
  lightSuccess: 'rgba(0, 230, 118, 0.1)',
  lightError: 'rgba(255, 23, 68, 0.1)',
  lightWarning: 'rgba(255, 214, 0, 0.1)',
  borderWarning: 'rgba(255, 214, 0, 0.2)',
  textWarning: '#FFD600',
  redLight: 'rgba(255, 23, 68, 0.15)',
  redBorder: 'rgba(255, 23, 68, 0.25)',
  redDark: '#FF1744',
  orangeLight: 'rgba(255, 214, 0, 0.15)',
  orangeBorder: 'rgba(255, 214, 0, 0.25)',
  orangeDark: '#FFD600',
};

export const CAR_TYPOGRAPHY = {
  speed: { fontSize: 72, fontWeight: '900' as const }, // High-glance speed display
  alert: { fontSize: 24, fontWeight: '800' as const }, // Crucial alert texts
  title: { fontSize: 20, fontWeight: '700' as const }, // Glanceable screen titles
  label: { fontSize: 18, fontWeight: '700' as const }, // Glanceable buttons / action labels
  status: { fontSize: 14, fontWeight: '600' as const }, // Small badge statuses
};

export const CAR_SPACING = {
  touchTarget: 80, // Massive tactile touch target sizing
  buttonGap: 16,
  padding: 24,
};
