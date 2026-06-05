import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { rf, moderateScale } from '../../utils/responsive';
import { useTheme } from '../../contexts/ThemeContext';

const AuthHeader = ({ title, subtitle }) => {
    const { colors } = useTheme();
    return (
        <View style={styles.header}>
            <Text style={[styles.title, { color: colors.white }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.82)' }]}>{subtitle}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        marginBottom: moderateScale(28),
    },
    title: {
        fontSize: rf(30, 24, 38),
        fontWeight: '700',
    },
    subtitle: {
        marginTop: moderateScale(8),
        fontSize: rf(15, 13, 18),
        lineHeight: rf(22, 18, 26),
    },
});

export default AuthHeader;
