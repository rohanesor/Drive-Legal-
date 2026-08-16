import React, { createContext, useContext, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { createColors, CAR_COLORS, colorsLight } from '../constants/theme';
import type { RootState } from '../store';

type ThemeColors = typeof colorsLight;

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: colorsLight,
  isDark: false,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const darkMode = useSelector((state: RootState) => state.settings.darkMode);
  const mode = useSelector((state: RootState) => state.appMode.mode);

  const contextValue = useMemo(() => {
    const isCarMode = mode === 'car';
    const isDark = darkMode || isCarMode;
    const colors = isCarMode ? (CAR_COLORS as unknown as ThemeColors) : createColors(darkMode);

    return {
      colors,
      isDark,
    };
  }, [darkMode, mode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeColors = () => {
  const { colors } = useContext(ThemeContext);
  return colors;
};

export const useTheme = () => {
  return useContext(ThemeContext);
};
