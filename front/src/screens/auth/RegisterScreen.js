import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ImageBackground, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import storage from '../../utils/storage';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';
import AuthHeader from '../../components/auth/AuthHeader';
import AuthInputField from '../../components/auth/AuthInputField';
import AuthGradientButton from '../../components/auth/AuthGradientButton';
import { isTablet, moderateScale, rf } from '../../utils/responsive';

const RegisterScreen = ({ navigation }) => {
    const tabletLayout = isTablet();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState(null);
    const [errors, setErrors] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: '',
        password: '',
        confirmPassword: '',
        form: '',
    });

    const clearError = (key) => {
        if (!errors[key]) return;
        setErrors((prev) => ({ ...prev, [key]: '' }));
    };

    const normalizeRole = (role) => String(role || '').trim().toLowerCase();

    const handleRegister = async () => {
        console.log("Register button pressed");

        const nextErrors = {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            role: '',
            password: '',
            confirmPassword: '',
            form: '',
        };

        const trimmedFirstName = firstName.trim();
        const trimmedLastName = lastName.trim();
        const trimmedEmail = email.trim();
        const trimmedPhone = phone.trim();

        // 1. Basic validation
        if (!trimmedFirstName) nextErrors.firstName = "Please enter your first name.";
        if (!trimmedLastName) nextErrors.lastName = "Please enter your last name.";
        if (!trimmedEmail) nextErrors.email = "Please enter your email.";
        if (!trimmedPhone) nextErrors.phone = "Please enter your phone number.";
        if (!selectedRole) nextErrors.role = "Please select a role.";
        if (!password) nextErrors.password = "Please create a password.";
        if (!confirmPassword) nextErrors.confirmPassword = "Please confirm your password.";

        if (password && password.length < 6) nextErrors.password = "Use at least 6 characters.";
        if (password && confirmPassword && password !== confirmPassword) {
            nextErrors.confirmPassword = "Passwords don't match.";
        }

        const hasErrors = Object.values(nextErrors).some(Boolean);
        if (hasErrors) {
            setErrors(nextErrors);
            return;
        }

        setErrors({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            role: '',
            password: '',
            confirmPassword: '',
            form: '',
        });

        console.log("Email:", trimmedEmail);
        console.log("API Endpoint:", API_ENDPOINTS.AUTH.REGISTER);

        try {
            // 2. Send POST request to backend
            console.log("Sending fetch request...");
            const response = await fetch(API_ENDPOINTS.AUTH.REGISTER, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: trimmedFirstName,
                    lastName: trimmedLastName,
                    email: trimmedEmail,
                    phone: trimmedPhone,
                    password: password,
                    confirmPassword: confirmPassword,
                    role: selectedRole,
                }),
            });

            console.log("Response status:", response.status);
            console.log("Response ok:", response.ok);

            const data = await response.json();
            console.log("Response data:", data);

            if (response.ok) {
                // SUCCESS
                console.log("Registration successful!", data);
                // Some backends return no token on register. In that case,
                // immediately log in to create a fresh authenticated session.
                let sessionToken = data?.token;
                let sessionUser = data?.user;
                if (!sessionToken) {
                    const loginResponse = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: trimmedEmail,
                            password: password,
                        }),
                    });

                    const loginData = await loginResponse.json();
                    if (!loginResponse.ok || !loginData?.token || !loginData?.user) {
                        throw new Error(
                            loginData?.error || 'Account created, but automatic login failed. Please log in.'
                        );
                    }
                    sessionToken = loginData.token;
                    sessionUser = loginData.user;
                }

                if (sessionToken) {
                    await storage.setItemAsync('userToken', sessionToken);
                }

                const rawUser = sessionUser || null;
                if (rawUser) {
                    const normalized = {
                        id: rawUser.id,
                        email: rawUser.email,
                        firstName: rawUser.firstName || rawUser.first_name || '',
                        lastName: rawUser.lastName || rawUser.last_name || '',
                        phone: rawUser.phone || '',
                        role: rawUser.role,
                        isVerified: rawUser.isVerified ?? rawUser.is_verified,
                        isActive: rawUser.isActive ?? rawUser.is_active,
                    };
                    await storage.setItemAsync('userProfile', JSON.stringify(normalized));
                }

                const userParams = { token: sessionToken, user: sessionUser };
                const role = normalizeRole(sessionUser?.role || selectedRole);
                const isOwner = role === 'owner';
                const isAdmin = role === 'admin';
                const isClient = role === 'client';

                if (isClient) { 
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'ClientApp', params: { screen: 'HomeTab', params: userParams } }],
                });
            } else if (isOwner) {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'OwnerDashboard', params: userParams }],
                });
            } else if (isAdmin) {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'AdminDashboard', params: userParams }],
                });
            } else {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'ClientApp', params: { screen: 'HomeTab', params: userParams } }],
                });
            }}
            else {
                // BACKEND ERROR
                console.log("Registration failed:", data.error);
                const message = data?.error || "We couldn't create your account. Please try again.";
                const lower = String(message).toLowerCase();
                if (lower.includes('email')) setErrors((prev) => ({ ...prev, email: message }));
                else if (lower.includes('phone')) setErrors((prev) => ({ ...prev, phone: message }));
                else if (lower.includes('password')) setErrors((prev) => ({ ...prev, password: message }));
                else setErrors((prev) => ({ ...prev, form: message }));
            }
        } catch (error) {
            // NETWORK ERROR
            console.error("Fetch error:", error);
            setErrors((prev) => ({
                ...prev,
                form: "We couldn't reach the server. Please try again.",
            }));
        }
    };

    const roles = [
        { id: 'client', label: 'Client', icon: 'person' },
        { id: 'owner', label: 'Vehicle Owner', icon: 'car' },
        { id: 'companyManager', label: 'Company', icon: 'business' },
    ];

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('../../assets/background.png')}
                style={styles.background}
                resizeMode="cover"
            >
                <SafeAreaView style={styles.overlay}>
                    <KeyboardAvoidingView
                        style={styles.keyboardAvoid}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
                    >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <TouchableOpacity 
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={28} color="#fff" />
                        </TouchableOpacity>

                        <View style={styles.header}>
                            <AuthHeader
                                title="Create Account"
                                subtitle="Join Rentify and start your journey"
                            />
                        </View>

                        <View
                            style={[
                                styles.form,
                                {
                                    maxWidth: tabletLayout ? 620 : '100%',
                                    alignSelf: 'center',
                                },
                            ]}
                        >
                            <View style={styles.nameRow}>
                                <View style={[styles.inputContainer, styles.halfInput, styles.halfInputLeft]}>
                                    <AuthInputField
                                        label="First Name"
                                        error={errors.firstName}
                                        placeholder="John"
                                        value={firstName}
                                        onChangeText={(text) => {
                                            setFirstName(text);
                                            clearError('firstName');
                                            clearError('form');
                                        }}
                                        autoCapitalize="words"
                                    />
                                </View>

                                <View style={[styles.inputContainer, styles.halfInput, styles.halfInputRight]}>
                                    <AuthInputField
                                        label="Last Name"
                                        error={errors.lastName}
                                        placeholder="Doe"
                                        value={lastName}
                                        onChangeText={(text) => {
                                            setLastName(text);
                                            clearError('lastName');
                                            clearError('form');
                                        }}
                                        autoCapitalize="words"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <AuthInputField
                                    label="Email Address"
                                    error={errors.email}
                                    placeholder="example@mail.com"
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        clearError('email');
                                        clearError('form');
                                    }}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <AuthInputField
                                    label="Phone Number"
                                    error={errors.phone}
                                    placeholder="+1 (555) 000-0000"
                                    value={phone}
                                    onChangeText={(text) => {
                                        setPhone(text);
                                        clearError('phone');
                                        clearError('form');
                                    }}
                                    keyboardType="phone-pad"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Select Your Role</Text>
                                <View style={styles.rolesContainer}>
                                    {roles.map((role) => (
                                        <TouchableOpacity
                                            key={role.id}
                                            style={[
                                                styles.roleButton,
                                                selectedRole === role.id && styles.roleButtonActive
                                            ]}
                                            onPress={() => {
                                                setSelectedRole(role.id);
                                                clearError('role');
                                                clearError('form');
                                            }}
                                        >
                                            <View style={[
                                                styles.roleIconContainer,
                                                selectedRole === role.id && styles.roleIconContainerActive
                                            ]}>
                                                <Ionicons
                                                    name={role.icon}
                                                    size={moderateScale(26)}
                                                    color={selectedRole === role.id ? '#fff' : 'rgba(255,255,255,0.75)'}
                                                />
                                            </View>
                                            <Text style={[
                                                styles.roleLabel,
                                                selectedRole === role.id && styles.roleLabelActive
                                            ]}>
                                                {role.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                {!!errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
                            </View>

                            <View style={styles.inputContainer}>
                                <AuthInputField
                                    label="Password"
                                    error={errors.password}
                                    placeholder="••••••••"
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        clearError('password');
                                        clearError('form');
                                    }}
                                    secureTextEntry
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <AuthInputField
                                    label="Confirm Password"
                                    error={errors.confirmPassword}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChangeText={(text) => {
                                        setConfirmPassword(text);
                                        clearError('confirmPassword');
                                        clearError('form');
                                    }}
                                    secureTextEntry
                                />
                                {!!errors.form && <Text style={styles.errorText}>{errors.form}</Text>}
                            </View>

                            <AuthGradientButton label="Create Account" onPress={handleRegister} />
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.linkText}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1 },
    overlay: { 
        flex: 1, 
        paddingHorizontal: moderateScale(20),
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    keyboardAvoid: { flex: 1 },
    scrollView: {
        flex: 1,
        paddingVertical: moderateScale(18),
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: moderateScale(24),
    },
    backButton: {
        width: moderateScale(46),
        aspectRatio: 1,
        borderRadius: moderateScale(12),
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: moderateScale(18),
    },
    header: { marginBottom: moderateScale(4) },
    form: { width: '100%' },
    nameRow: {
        flexDirection: 'row',
        width: '100%',
        flexWrap: 'wrap',
    },
    halfInput: {
        flexGrow: 1,
        flexBasis: 160,
    },
    halfInputLeft: {
        marginRight: moderateScale(6),
    },
    halfInputRight: {
        marginLeft: moderateScale(6),
    },
    inputContainer: { marginBottom: moderateScale(2) },
    label: { color: '#fff', marginBottom: moderateScale(8), fontSize: rf(14, 12, 16), fontWeight: '500' },
    errorText: {
        marginTop: moderateScale(8),
        color: 'rgba(255, 92, 92, 0.95)',
        fontSize: rf(12, 11, 14),
        lineHeight: rf(16, 14, 20),
    },
    rolesContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginBottom: moderateScale(8),
    },
    roleButton: {
        width: '31%',
        minWidth: 92,
        alignItems: 'center',
        paddingVertical: moderateScale(14),
        marginHorizontal: moderateScale(4),
        marginBottom: moderateScale(8),
        borderRadius: moderateScale(12),
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    roleButtonActive: {
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(166, 110, 255, 0.2)',
    },
    roleIconContainer: {
        width: moderateScale(50),
        aspectRatio: 1,
        borderRadius: moderateScale(12),
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: moderateScale(8),
    },
    roleIconContainerActive: {
        backgroundColor: COLORS.primary,
    },
    roleLabel: { 
        color: 'rgba(255,255,255,0.75)',
        fontSize: rf(12, 11, 14), 
        fontWeight: '500',
        textAlign: 'center',
    },
    roleLabelActive: {
        color: '#fff',
    },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: moderateScale(28), marginBottom: moderateScale(16), flexWrap: 'wrap' },
    footerText: { color: '#aaa' },
    linkText: { color: COLORS.secondary, fontWeight: 'bold' }
});

export default RegisterScreen;
