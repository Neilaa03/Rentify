import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { moderateScale, rf } from '../../utils/responsive';
import { useTheme } from '../../contexts/ThemeContext';

const AuthInputField = ({
    label,
    error,
    containerStyle,
    inputStyle,
    ...textInputProps
}) => {
    const { colors } = useTheme();
    const isFilled = String(textInputProps?.value || '').trim().length > 0;
    return (
        <View style={[styles.container, containerStyle]}>
            <Text style={[styles.label, { color: colors.white }]}>{label}</Text>
            <TextInput
                {...textInputProps}
                style={[
                    styles.input,
                    styles.inputBase,
                    isFilled && styles.inputFilled,
                    error ? { borderColor: colors.danger } : null,
                    inputStyle
                ]}
                placeholderTextColor="rgba(255,255,255,0.72)"
            />
            {!!error && <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: moderateScale(18),
    },
    label: {
        marginBottom: moderateScale(8),
        fontSize: rf(14, 12, 16),
        fontWeight: '500',
    },
    input: {
        borderRadius: moderateScale(12),
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(13),
        borderWidth: 1,
        fontSize: rf(15, 13, 18),
    },
    inputBase: {
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderColor: 'rgba(255,255,255,0.3)',
    },
    inputFilled: {
        backgroundColor: 'rgba(225, 216, 247, 0.82)',
        borderColor: 'rgba(117, 94, 171, 0.22)',
    },
    errorText: {
        marginTop: moderateScale(8),
        fontSize: rf(12, 11, 14),
        lineHeight: rf(16, 14, 20),
    },
});

export default AuthInputField;
