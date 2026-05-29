import React, { useEffect, useMemo, useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ImageBackground,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import storage from '../../utils/storage';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';
import AuthHeader from '../../components/auth/AuthHeader';
import AuthInputField from '../../components/auth/AuthInputField';
import AuthGradientButton from '../../components/auth/AuthGradientButton';
import { isTablet, moderateScale, rf } from '../../utils/responsive';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = ({ navigation }) => {
    const tabletLayout = isTablet();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [errors, setErrors] = useState({
        email: '',
        password: '',
        form: '',
    });

    const googleClientId = useMemo(
        () => process?.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
        []
    );

    const redirectUri = useMemo(
        () => AuthSession.makeRedirectUri({ scheme: 'rentify', useProxy: true }),
        []
    );

    const [googleRequest, googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest({
        // For Expo Go + AuthSession proxy, Expo expects an "expoClientId".
        // Using the same web client id works for many setups; native builds can provide android/ios ids too.
        expoClientId: googleClientId,
        webClientId: googleClientId,
        androidClientId: process?.env?.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
        iosClientId: process?.env?.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
        redirectUri,
    });

    const clearError = (key) => {
        if (!errors[key]) return;
        setErrors((prev) => ({ ...prev, [key]: '' }));
    };

    const handleAuthSuccess = async (data) => {
        if (data?.token) {
            await storage.setItemAsync('userToken', data.token);
        }

        const userParams = { token: data?.token, user: data?.user };
        const isOwner = data?.user?.role === 'owner';
        const isAdmin = data?.user?.role === 'admin';

        try {
            if (data?.token) {
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
        } catch {
            // Non-blocking.
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
    };

    const handleLogin = async () => {
        const nextErrors = { email: '', password: '', form: '' };
        const trimmedEmail = email.trim();

        if (!trimmedEmail) nextErrors.email = 'Please enter your email.';
        if (!password) nextErrors.password = 'Please enter your password.';

        if (nextErrors.email || nextErrors.password) {
            setErrors(nextErrors);
            return;
        }

        setLoading(true);
        setErrors({ email: '', password: '', form: '' });

        try {
            const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: trimmedEmail,
                    password,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                await handleAuthSuccess(data);
            } else {
                const message = data?.error || "We couldn't log you in. Please try again.";

                if (data?.error === 'EMAIL_NOT_VERIFIED') {
                    navigation.navigate('VerifyEmail', { email: trimmedEmail });
                    setErrors({
                        email: '',
                        password: '',
                        form: 'Please verify your email first.',
                    });
                    return;
                }

                const lower = String(message).toLowerCase();
                const mentionsEmail = lower.includes('email');
                const mentionsPassword = lower.includes('password');

                if (mentionsEmail && !mentionsPassword) {
                    setErrors({ email: message, password: '', form: '' });
                } else if (mentionsPassword && !mentionsEmail) {
                    setErrors({ email: '', password: message, form: '' });
                } else {
                    setErrors({ email: '', password: '', form: 'Invalid email or password.' });
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
            setErrors({
                email: '',
                password: '',
                form: "We couldn't reach the server. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (!googleClientId) {
            setErrors({ email: '', password: '', form: 'Missing Google Client ID (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).' });
            return;
        }
        try {
            setErrors({ email: '', password: '', form: '' });
            await googlePromptAsync({ useProxy: true });
        } catch (e) {
            setErrors({ email: '', password: '', form: 'Google sign-in failed to start.' });
        }
    };

    useEffect(() => {
        const run = async () => {
            if (googleResponse?.type !== 'success') return;
            const idToken = googleResponse?.params?.id_token;
            if (!idToken) {
                setErrors({ email: '', password: '', form: 'Google sign-in failed.' });
                return;
            }

            setGoogleLoading(true);
            setErrors({ email: '', password: '', form: '' });
            try {
                const res = await fetch(API_ENDPOINTS.AUTH.GOOGLE, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken }),
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok) {
                    await handleAuthSuccess(data);
                } else {
                    const detail = data?.message ? ` (${data.message})` : '';
                    setErrors({ email: '', password: '', form: `${data?.error || 'Google sign-in failed.'}${detail}` });
                }
            } catch (e) {
                setErrors({ email: '', password: '', form: "We couldn't reach the server. Please try again." });
            } finally {
                setGoogleLoading(false);
            }
        };
        run();
    }, [googleResponse]);

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

                                    <View style={styles.inputContainer}>
                                        <Text style={styles.label}>Password</Text>
                                        <View>
                                            <TextInput
                                                style={[
                                                    styles.input,
                                                    password ? styles.inputFilled : null,
                                                    errors.password ? styles.inputError : null,
                                                ]}
                                                placeholder="••••••••"
                                                placeholderTextColor="rgba(255,255,255,0.6)"
                                                value={password}
                                                onChangeText={(text) => {
                                                    setPassword(text);
                                                    clearError('password');
                                                    clearError('form');
                                                }}
                                                secureTextEntry={!showPassword}
                                            />
                                            <TouchableOpacity
                                                onPress={() => setShowPassword((v) => !v)}
                                                style={styles.eyeButton}
                                                accessibilityRole="button"
                                                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                <Ionicons
                                                    name={showPassword ? 'eye-off' : 'eye'}
                                                    size={20}
                                                    color="rgba(255,255,255,0.8)"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                        {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                                    </View>

                                    <TouchableOpacity
                                        style={styles.forgotPassword}
                                        onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() })}
                                    >
                                        <Text style={styles.forgotText}>Forgot Password?</Text>
                                    </TouchableOpacity>

                                    {!!errors.form && <Text style={styles.formErrorText}>{errors.form}</Text>}

                                    <AuthGradientButton label="Login" onPress={handleLogin} disabled={loading} />

                                    <TouchableOpacity
                                        style={[styles.googleButton, (!googleRequest || googleLoading) ? styles.googleButtonDisabled : null]}
                                        onPress={handleGoogleLogin}
                                        disabled={!googleRequest || googleLoading}
                                    >
                                        <Ionicons name="logo-google" size={18} color="#fff" />
                                        <Text style={styles.googleButtonText}>
                                            {googleLoading ? 'Signing in…' : 'Continue with Google'}
                                        </Text>
                                    </TouchableOpacity>
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
    inputContainer: {
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
        paddingRight: moderateScale(46),
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        fontSize: rf(15, 13, 18),
    },
    eyeButton: {
        position: 'absolute',
        right: moderateScale(12),
        top: moderateScale(10),
        height: moderateScale(36),
        width: moderateScale(36),
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputFilled: {
        backgroundColor: 'rgba(230, 215, 255, 0.26)',
        borderColor: 'rgba(166, 110, 255, 0.35)',
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
    linkText: { color: COLORS.secondary, fontWeight: 'bold' },
    googleButton: {
        marginTop: moderateScale(12),
        height: moderateScale(48),
        borderRadius: moderateScale(12),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        backgroundColor: 'rgba(255,255,255,0.12)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleButtonDisabled: {
        opacity: 0.6,
    },
    googleButtonText: {
        marginLeft: moderateScale(10),
        color: '#fff',
        fontWeight: '700',
        fontSize: rf(14, 12, 16),
    },
});

export default LoginScreen;
