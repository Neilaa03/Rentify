import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ImageBackground, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import storage from '../../utils/storage';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';
import AuthHeader from '../../components/auth/AuthHeader';
import AuthInputField from '../../components/auth/AuthInputField';
import AuthGradientButton from '../../components/auth/AuthGradientButton';
import { isTablet, moderateScale, rf } from '../../utils/responsive';

const LoginScreen = ({ navigation }) => {
    const tabletLayout = isTablet();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({
        email: '',
        password: '',
        form: '',
    });

    const clearError = (key) => {
        if (!errors[key]) return;
        setErrors((prev) => ({ ...prev, [key]: '' }));
    };

    const handleLogin = async () => {
        setLoading(true);
        console.log("Login button pressed");

        const nextErrors = { email: '', password: '', form: '' };
        const trimmedEmail = email.trim();

        // 1. Basic validation
        if (!trimmedEmail) nextErrors.email = "Please enter your email.";
        if (!password) nextErrors.password = "Please enter your password.";

        if (nextErrors.email || nextErrors.password) {
            setErrors(nextErrors);
            return;
        }

        setErrors({ email: '', password: '', form: '' });

        console.log("Email:", trimmedEmail);
        console.log("API Endpoint:", API_ENDPOINTS.AUTH.LOGIN);

        try {
            // 2. Send POST request to backend
            console.log("Sending fetch request...");
            const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: trimmedEmail,
                    password: password,
                }),
            });

            console.log("Response status:", response.status);
            console.log("Response ok:", response.ok);

            const data = await response.json();
            console.log("Response data:", data);

            if (response.ok) {
                // SUCCESS: data contains your user info and JWT token
                console.log("Login successful!", data);
                // Save token to SecureStore
                if (data.token) {
                    await storage.setItemAsync('userToken', data.token);
                    console.log('Token saved to storage');
                }

                const userParams = { token: data?.token, user: data?.user };
                const isOwner = data?.user?.role === 'owner';
                const isAdmin = data?.user?.role === 'admin';
                    
                // Always refresh profile from backend so we have full name + phone reliably
                try {
                    if (data.token) {
                        const meRes = await fetch(API_ENDPOINTS.AUTH.ME, {
                            headers: { Authorization: `Bearer ${data.token}` },
                        });
                        const meJson = meRes.ok ? await meRes.json() : null;
                        const rawUser = meJson?.user || data.user || null;
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
                    }
                } catch (e) {
                    // Non-blocking
                }
                if (isAdmin) {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'AdminDashboard', params: userParams }],
                    });
                } else if (isOwner) {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'OwnerDashboard', params: userParams }],
                    });

                } else {
                    navigation.reset({
                        index: 0,
                        routes: [
                            {
                                name: 'ClientApp',
                                params: {
                                    screen: 'HomeTab',
                                    params: userParams,
                                },
                            },
                        ],
                    });
                }
            
            } else {
                // BACKEND ERROR:
                console.log("Login failed:", data?.error);
                const message = data?.error || "We couldn't log you in. Please try again.";
                const lower = String(message).toLowerCase();
                const mentionsEmail = lower.includes('email');
                const mentionsPassword = lower.includes('password');
                if (mentionsEmail && !mentionsPassword) setErrors({ email: message, password: '', form: '' });
                else if (mentionsPassword && !mentionsEmail) setErrors({ email: '', password: message, form: '' });
                else setErrors({ email: '', password: '', form: "Invalid email or password." });
            }
        } catch (error) {
            // NETWORK ERROR
            console.error("Fetch error:", error);
            setErrors({
                email: '',
                password: '',
                form: "We couldn't reach the server. Please try again.",
            });
        }finally {
   setLoading(false);
}
    };

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
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <ScrollView
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View
                                style={[
                                    styles.content,
                                    {
                                        maxWidth: tabletLayout ? 520 : '100%',
                                        width: '100%',
                                        alignSelf: 'center',
                                    },
                                ]}
                            >
                                <AuthHeader
                                    title="Welcome Back"
                                    subtitle="Log in to continue your journey with Rentify"
                                />

                                <View style={styles.form}>
                                    <AuthInputField
                                        label="Email Address"
                                        error={errors.email}
                                        inputStyle={[email.trim() ? styles.inputFilled : null]}
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

                                    <AuthInputField
                                        label="Password"
                                        error={errors.password}
                                        inputStyle={[password ? styles.inputFilled : null]}
                                        placeholder="••••••••"
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            clearError('password');
                                            clearError('form');
                                        }}
                                        secureTextEntry
                                    />

                                    <TouchableOpacity style={styles.forgotPassword}>
                                        <Text style={styles.forgotText}>Forgot Password?</Text>
                                    </TouchableOpacity>

                                    {!!errors.form && <Text style={styles.formErrorText}>{errors.form}</Text>}

                                    <AuthGradientButton label="Login" onPress={handleLogin} disabled={loading} />
                                </View>

                                <View style={styles.footer}>
                                    <Text style={styles.footerText}>Don't have an account? </Text>
                                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                        <Text style={styles.linkText}>Sign Up</Text>
                                    </TouchableOpacity>
                                </View>
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
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: moderateScale(20),
    },
    keyboardAvoid: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: moderateScale(24),
    },
    content: {},
    form: { width: '100%' },
    inputFilled: {
        backgroundColor: 'rgba(230, 215, 255, 0.26)',
        borderColor: 'rgba(166, 110, 255, 0.35)',
    },
    formErrorText: {
        marginBottom: moderateScale(14),
        color: 'rgba(255, 92, 92, 0.95)',
        fontSize: rf(13, 12, 15),
        lineHeight: rf(18, 16, 22),
        textAlign: 'center',
    },
    forgotPassword: { alignSelf: 'flex-end', marginBottom: moderateScale(26) },
    forgotText: { color: COLORS.primary, fontSize: rf(14, 12, 16) },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: moderateScale(30),
        flexWrap: 'wrap',
    },
    footerText: { color: '#aaa' },
    linkText: { color: COLORS.secondary, fontWeight: 'bold' }
});

export default LoginScreen;
