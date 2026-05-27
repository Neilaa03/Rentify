import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { rf, moderateScale } from '../../utils/responsive';

const AuthHeader = ({ title, subtitle }) => {
    return (
        <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
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
        color: '#fff',
    },
    subtitle: {
        marginTop: moderateScale(8),
        fontSize: rf(15, 13, 18),
        lineHeight: rf(22, 18, 26),
        color: '#AAA',
    },
});

export default AuthHeader;
