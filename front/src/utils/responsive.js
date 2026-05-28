import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;
const READABILITY_SCALE = 1.06;

export const scale = (size) => (SCREEN_WIDTH / BASE_WIDTH) * size;
export const verticalScale = (size) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
export const moderateScale = (size, factor = 0.5) => {
    return size + (scale(size) - size) * factor;
};

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
export const appFont = (size, max = size + 2) => {
    const readable = size * READABILITY_SCALE;
    return PixelRatio.roundToNearestPixel(clamp(readable, size, max));
};

export const rf = (size, min = 12, max = 34) => {
    const scaled = moderateScale(size) * READABILITY_SCALE;
    const rounded = PixelRatio.roundToNearestPixel(scaled);
    return clamp(rounded, min, max);
};

export const isTablet = () => {
    const shortest = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT);
    return shortest >= 600;
};
