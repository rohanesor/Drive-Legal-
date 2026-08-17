/**
 * tokens.ts — Vazhi Design System Tokens.
 * 
 * Defines colors, typography, spacing, border radius, and dynamic theme tokens
 * tailored for driver-safe readability and high contrast navigation cockpit UI.
 */

export const VAZHI_TOKENS = {
  colors: {
    bgDark: '#0A0F1D',
    bgCard: '#131C31',
    bgElevated: '#1D2A47',
    mint: '#00FFC2',
    cyan: '#00E5FF',
    amber: '#FFB800',
    red: '#FF4D4D',
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#2A3B5C',
    overlay: 'rgba(10, 15, 29, 0.85)',
  },
  typography: {
    fontFamily: 'System',
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 22,
      xxl: 28,
      hero: 34,
    },
    weights: {
      regular: '400' as const,
      medium: '600' as const,
      bold: '700' as const,
      heavy: '900' as const,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 20,
    full: 9999,
  },
};
