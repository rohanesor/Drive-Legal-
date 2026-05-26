/**
 * Theme constants matching the DriveLegal Brand Identity & Design System.
 */

export const COLORS = {
  // Primary Colors
  primary: '#2563EB',      // Trust & Authority Blue
  navy: '#0F172A',         // Legal/Government Deep Navy
  cyan: '#06B6D4',         // AI & Automation Smart Cyan
  success: '#22C55E',      // Approved/Valid Success Green

  // Semantic Colors
  warning: '#F59E0B',      // Warning
  error: '#EF4444',        // Error/Fine
  pending: '#F97316',      // Pending
  info: '#3B82F6',         // Information

  // Neutral Colors
  background: '#F8FAFC',   // Off-white slate background
  surface: '#FFFFFF',      // Card / Sheet backgrounds
  border: '#E2E8F0',       // Subtle borders
  textPrimary: '#0F172A',  // Heavy navy for titles/primary text
  textSecondary: '#64748B',// Cool slate-grey for captions/subtext

  // Utility
  white: '#FFFFFF',
  black: '#000000',

  // Light semantic backgrounds
  lightPrimary: '#eff6ff',   // Light blue (primary @ 6%)
  lightSuccess: '#f0fdf4',   // Light green
  lightError: '#fef2f2',     // Light red
  lightWarning: '#fef3c7',   // Light amber background
  borderWarning: '#fde68a',  // Amber border
  textWarning: '#92400e',    // Amber/dark text

  // Semantic red shades
  redLight: '#fecaca',
  redBorder: '#fca5a5',
  redDark: '#991b1b',
  orangeLight: '#fed7aa',
  orangeBorder: '#fdba74',
  orangeDark: '#9a3412',
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
};
