import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');
const guidelineBaseWidth = 390;
const guidelineBaseHeight = 844;

const isTabletDevice = Math.min(width, height) >= 768;

export const isTablet = () => isTabletDevice;

export const scale = (size) => (width / guidelineBaseWidth) * size;

export const verticalScale = (size) => (height / guidelineBaseHeight) * size;

export const moderateScale = (size, factor = 0.5) => {
  const nextSize = size + (scale(size) - size) * factor;
  return Number(PixelRatio.roundToNearestPixel(nextSize).toFixed(2));
};

export const rf = (size, tabletSize = size) => {
  const baseSize = isTabletDevice ? tabletSize : size;
  return moderateScale(baseSize, 0.35);
};

export const appFont = (size, tabletSize = size) => rf(size, tabletSize);
