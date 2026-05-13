import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { API_ENDPOINTS } from '../constants/api';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
                // alert("Login successful!");
                const targetRoute = data?.user?.role === 'owner' ? 'OwnerDashboard' : 'Home';
                navigation.reset({
                    index: 0,
                    routes: [{ name: targetRoute, params: { token: data?.token, user: data?.user } }],
                });
            } else {
                // BACKEND ERROR:
                console.log("Login failed:", data.error);
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
        }
    };

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('../assets/background.png')}
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
                            secureTextEntry
                        />
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
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
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
