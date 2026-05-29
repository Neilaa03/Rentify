import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { moderateScale, rf } from '../../utils/responsive';

const AuthGradientButton = ({ label, onPress, disabled }) => {
    return (
        <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.9}>
            <LinearGradient
                colors={[COLORS.secondary, COLORS.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.button, disabled ? styles.disabled : null]}
            >
                <Text style={styles.buttonText}>{label}</Text>
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        minHeight: moderateScale(52),
        borderRadius: moderateScale(12),
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: rf(17, 15, 20),
        fontWeight: '700',
    },
});

export default AuthGradientButton;
