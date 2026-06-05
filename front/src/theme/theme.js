import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationLightTheme } from '@react-navigation/native';

export const THEME_STORAGE_KEY = 'rentify.themeMode';

export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

export const BRAND_COLORS = {
  primary: '#8A2BE2',
  secondary: '#284091',
  accent: '#7000FF',
  highlight: '#4C6FFF',
  success: '#23D49F',
  danger: '#EB5757',
  warning: '#FFB347',
};

const DARK = {
  mode: THEME_MODES.DARK,
  isDark: true,
  colors: {
    ...BRAND_COLORS,
    background: '#0B1020',
    backgroundAlt: '#0F1635',
    surface: 'rgba(255,255,255,0.06)',
    surfaceStrong: '#151B36',
    surfaceElevated: '#1A203F',
    card: '#111329',
    cardBorder: 'rgba(143,150,255,0.14)',
    border: 'rgba(148,156,233,0.18)',
    text: '#F6F8FF',
    textMuted: '#8E95BF',
    textSoft: '#C9D2FF',
    icon: '#AEB4D6',
    overlay: 'rgba(5, 6, 22, 0.72)',
    overlaySoft: 'rgba(10, 12, 28, 0.35)',
    modalBackdrop: 'rgba(3, 5, 16, 0.72)',
    inputBackground: 'rgba(255,255,255,0.06)',
    inputBorder: 'rgba(255,255,255,0.18)',
    tabBar: '#0F1228',
    tabBarBorder: 'rgba(255,255,255,0.08)',
    shadow: '#000',
    white: '#FFFFFF',
  },
};

const LIGHT = {
  mode: THEME_MODES.LIGHT,
  isDark: false,
  colors: {
    ...BRAND_COLORS,
    background: 'transparent',
    backgroundAlt: 'transparent',
    surface: 'rgba(225,216,247,0.58)',
    surfaceStrong: '#E1D8F7',
    surfaceElevated: '#D8CAF3',
    card: '#E1D8F7',
    cardBorder: 'rgba(117, 94, 171, 0.18)',
    border: 'rgba(117, 94, 171, 0.18)',
    text: '#11162B',
    textMuted: '#5D678E',
    textSoft: '#394268',
    icon: '#5A6387',
    overlay: 'transparent',
    overlaySoft: 'rgba(225,216,247,0.18)',
    modalBackdrop: 'rgba(14, 18, 40, 0.42)',
    inputBackground: 'rgba(225,216,247,0.82)',
    inputBorder: 'rgba(117, 94, 171, 0.22)',
    tabBar: 'rgba(225,216,247,0.92)',
    tabBarBorder: 'rgba(117, 94, 171, 0.12)',
    shadow: '#8790B6',
    white: '#FFFFFF',
  },
};

export const THEMES = {
  light: LIGHT,
  dark: DARK,
};

export const createTheme = (mode = THEME_MODES.SYSTEM, scheme = THEME_MODES.DARK) => {
  const resolvedMode = mode === THEME_MODES.SYSTEM ? (scheme === THEME_MODES.LIGHT ? THEME_MODES.LIGHT : THEME_MODES.DARK) : mode;
  const theme = resolvedMode === THEME_MODES.LIGHT ? LIGHT : DARK;
  const navBase = resolvedMode === THEME_MODES.LIGHT ? NavigationLightTheme : NavigationDarkTheme;

  return {
    ...theme,
    mode,
    resolvedMode,
    navigationTheme: {
      ...navBase,
      colors: {
        ...navBase.colors,
        primary: BRAND_COLORS.primary,
        background: theme.colors.background,
        card: theme.colors.surfaceStrong,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: BRAND_COLORS.primary,
      },
    },
  };
};

export const withAlpha = (hex, alpha) => {
  const normalized = String(hex || '').replace('#', '').trim();
  if (![3, 4, 6, 8].includes(normalized.length)) return `rgba(0,0,0,${alpha})`;

  const expand = normalized.length <= 4
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;
  const rgbHex = expand.slice(0, 6);
  const r = parseInt(rgbHex.slice(0, 2), 16);
  const g = parseInt(rgbHex.slice(2, 4), 16);
  const b = parseInt(rgbHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
