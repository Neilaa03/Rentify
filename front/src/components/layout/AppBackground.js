import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

const BACKGROUND_IMAGE = require('../../assets/background.png');

export default function AppBackground({ children, overlayStyle, contentStyle }) {
  const { colors } = useTheme();
  return (
    <ImageBackground source={BACKGROUND_IMAGE} style={styles.background} resizeMode="cover">
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.overlay, { backgroundColor: colors.overlay }, overlayStyle]}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  content: { flex: 1 },
});
