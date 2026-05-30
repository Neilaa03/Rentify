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
import Constants from 'expo-constants';

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

    const useProxy = useMemo(() => {
        const ownership = Constants?.appOwnership;
        return ownership === 'expo' || ownership === 'guest';
    }, []);

    const googleClientId = useMemo(() => {
        const webClientId = process?.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
        const androidClientId = process?.env?.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
        const iosClientId = process?.env?.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

        if (Platform.OS === 'android' && !useProxy) return androidClientId || webClientId;
        if (Platform.OS === 'ios' && !useProxy) return iosClientId || webClientId;
        return webClientId;
    }, [useProxy]);

    const proxyProjectFullName = useMemo(() => {
        const owner =
            Constants?.expoConfig?.owner ||
            Constants?.manifest2?.extra?.expoClient?.owner ||
            process?.env?.EXPO_PUBLIC_EXPO_OWNER ||
            process?.env?.EXPO_PUBLIC_EXPO_USERNAME ||
            '';
        const slug = Constants?.expoConfig?.slug || Constants?.manifest2?.extra?.expoClient?.slug || 'rentify';
        return owner ? `@${owner}/${slug}` : '';
    }, [useProxy]);

    const redirectUri = useMemo(() => {
        // Expo Go cannot receive a browser redirect to `exp://` from Google OAuth directly.
        // We must use the Expo AuthSession proxy. In that flow, the *returnUrl* is the deep link,
        // while the *OAuth redirect_uri* is `https://auth.expo.io/@owner/slug`.
        if (useProxy) return AuthSession.getDefaultReturnUrl();
        return AuthSession.makeRedirectUri({ scheme: 'rentify' });
    }, [useProxy]);

    useEffect(() => {
        console.log('[GoogleAuth] appOwnership:', Constants?.appOwnership);
        console.log('[GoogleAuth] useProxy:', useProxy);
        console.log('[GoogleAuth] redirectUri:', redirectUri);
        if (useProxy) console.log('[GoogleAuth] proxyProjectFullName:', proxyProjectFullName || '(missing)');
    }, [redirectUri, useProxy, proxyProjectFullName]);

    const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');
    const [googleRequest, googleResponse, googlePromptAsync] = AuthSession.useAuthRequest(
        {
            clientId: googleClientId,
            redirectUri,
            responseType: AuthSession.ResponseType.IdToken,
            scopes: ['openid', 'profile', 'email'],
            extraParams: {
                prompt: 'select_account',
            },
        },
        discovery
    );

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
        const initialProvider = String(data?.user?.authProvider || data?.user?.auth_provider || '').toLowerCase();
        const shouldOfferPasswordSetup = (provider) => String(provider || '').toLowerCase() === 'google';

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
                        authProvider: rawUser.authProvider || rawUser.auth_provider || '',
                    };

                    await storage.setItemAsync('userProfile', JSON.stringify(normalized));

                    // If the account was created via Google-only sign-in, offer setting a password.
                    if (shouldOfferPasswordSetup(normalized.authProvider || initialProvider)) {
                        navigation.navigate('SetPassword', { token: data?.token, allowSkip: true });
                        return;
                    }
                }
            }
        } catch {
            // Non-blocking.
        }

        if (shouldOfferPasswordSetup(initialProvider)) {
            navigation.navigate('SetPassword', { token: data?.token, allowSkip: true });
            return;
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
            setErrors({ email: '', password: '', form: 'Missing Google Client ID. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and for builds, also ANDROID/IOS client IDs).' });
            return;
        }
        try {
            setErrors({ email: '', password: '', form: '' });
            if (useProxy) {
                if (!proxyProjectFullName) {
                    setErrors({ email: '', password: '', form: 'Expo AuthSession proxy needs your project full name (@owner/slug). Set EXPO_PUBLIC_EXPO_OWNER to your Expo username and restart.' });
                    return;
                }
                // Manual proxy flow for Expo Go:
                // - Google must redirect to https://auth.expo.io/@owner/slug (web-allowed redirect)
                // - Expo proxy then forwards back to the app deep link return URL (exp://...).
                const proxyRedirectUrl = `https://auth.expo.io/${proxyProjectFullName}`;
                const returnUrl = AuthSession.getDefaultReturnUrl();
                if (!discovery?.authorizationEndpoint) {
                    setErrors({ email: '', password: '', form: 'Google sign-in is not ready yet. Please try again.' });
                    return;
                }

                const authUrl = `${discovery?.authorizationEndpoint}?` +
                    new URLSearchParams({
                        client_id: googleClientId,
                        redirect_uri: proxyRedirectUrl,
                        response_type: AuthSession.ResponseType.IdToken,
                        scope: ['openid', 'profile', 'email'].join(' '),
                        prompt: 'select_account',
                        nonce: String(Date.now()),
                    }).toString();

                const startUrl = `${proxyRedirectUrl}/start?` +
                    new URLSearchParams({ authUrl, returnUrl }).toString();

                const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);
                if (result.type !== 'success' || !result.url) return;

                const extractParam = (url, key) => {
                    try {
                        const [, fragment = ''] = String(url).split('#');
                        const [base, query = ''] = String(url).split('?');
                        const params = new URLSearchParams(query);
                        const fragParams = new URLSearchParams(fragment);
                        return fragParams.get(key) || params.get(key) || '';
                    } catch {
                        return '';
                    }
                };
                const idToken = extractParam(result.url, 'id_token');
                if (!idToken) {
                    setErrors({ email: '', password: '', form: 'Google sign-in failed.' });
                    return;
                }

                // Mirror the hook-based flow by reusing the existing effect handler expectation.
                // Trigger the same backend call directly here.
                setGoogleLoading(true);
                try {
                    const res = await fetch(API_ENDPOINTS.AUTH.GOOGLE, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idToken }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok) await handleAuthSuccess(data);
                    else {
                        const detail = data?.message ? ` (${data.message})` : '';
                        setErrors({ email: '', password: '', form: `${data?.error || 'Google sign-in failed.'}${detail}` });
                    }
                } finally {
                    setGoogleLoading(false);
                }
            } else {
                await googlePromptAsync();
            }
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
