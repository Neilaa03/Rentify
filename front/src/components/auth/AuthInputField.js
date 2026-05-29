import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { moderateScale, rf } from '../../utils/responsive';

const AuthInputField = ({
    label,
    error,
    containerStyle,
    inputStyle,
    ...textInputProps
}) => {
    return (
        <View style={[styles.container, containerStyle]}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                {...textInputProps}
                style={[styles.input, error ? styles.inputError : null, inputStyle]}
                placeholderTextColor="rgba(255,255,255,0.6)"
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: moderateScale(18),
    },
    label: {
        color: '#fff',
        marginBottom: moderateScale(8),
        fontSize: rf(14, 12, 16),
        fontWeight: '500',
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderRadius: moderateScale(12),
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(13),
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        fontSize: rf(15, 13, 18),
    },
    inputError: {
        borderColor: 'rgba(255, 92, 92, 0.9)',
    },
    errorText: {
        marginTop: moderateScale(8),
        color: 'rgba(255, 92, 92, 0.95)',
        fontSize: rf(12, 11, 14),
        lineHeight: rf(16, 14, 20),
    },
});

export default AuthInputField;
