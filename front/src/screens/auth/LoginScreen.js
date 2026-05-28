import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ImageBackground, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import storage from '../../utils/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
                if (data?.error === 'EMAIL_NOT_VERIFIED') {
                    navigation.navigate('VerifyEmail', { email: trimmedEmail });
                    Alert.alert('Verify your email', 'Please verify your email address before logging in.');
                    setErrors({ email: '', password: '', form: 'Please verify your email first.' });
                    return;
                }
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
                <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Log in to continue your journey with Rentify</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput 
                            style={[
                                styles.input,
                                email.trim() ? styles.inputFilled : null,
                                errors.email ? styles.inputError : null
                            ]}
                            placeholder="example@mail.com"
                            placeholderTextColor="rgba(255,255,255,0.6)"
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                clearError('email');
                                clearError('form');
                            }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput 
                            style={[
                                styles.input,
                                password ? styles.inputFilled : null,
                                errors.password ? styles.inputError : null
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
                        {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                    </View>

                    <TouchableOpacity style={styles.forgotPassword}>
                        <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    {!!errors.form && <Text style={styles.formErrorText}>{errors.form}</Text>}

                    <TouchableOpacity onPress={handleLogin}>
                        <LinearGradient
                            colors={[COLORS.secondary, COLORS.primary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.loginButton}
                        >
                            <Text style={styles.buttonText}>Login</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                        <Text style={styles.linkText}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
                </View>
                </SafeAreaView>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1 },
    overlay: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
    content: { marginTop: -64 },
    header: { marginBottom: 40 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
    subtitle: { fontSize: 16, color: '#aaa', marginTop: 8 },
    form: { width: '100%' },
    inputContainer: { marginBottom: 20 },
    label: { color: '#fff', marginBottom: 8, fontSize: 14, fontWeight: '500' },
    input: {
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderRadius: 12,
        padding: 16,
        paddingRight: 46,
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    eyeButton: {
        position: 'absolute',
        right: 14,
        top: 38,
        height: 36,
        width: 36,
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
        marginTop: 8,
        color: 'rgba(255, 92, 92, 0.95)',
        fontSize: 12,
        lineHeight: 16,
    },
    formErrorText: {
        marginBottom: 16,
        color: 'rgba(255, 92, 92, 0.95)',
        fontSize: 13,
        lineHeight: 18,
        textAlign: 'center',
    },
    forgotPassword: { alignSelf: 'flex-end', marginBottom: 30 },
    forgotText: { color: COLORS.primary, fontSize: 14 },
    loginButton: { height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
    footerText: { color: '#aaa' },
    linkText: { color: COLORS.secondary, fontWeight: 'bold' }
});

export default LoginScreen;
