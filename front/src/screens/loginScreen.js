import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { API_ENDPOINTS } from '../constants/api';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        console.log("Login button pressed");
        
        // 1. Basic validation
        if (!email || !password) {
            alert("Please enter both email and password");
            return;
        }

        console.log("Email:", email);
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
                    email: email,
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
                alert("Login successful!");
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Home' }],
                });
            } else {
                // BACKEND ERROR:
                console.log("Login failed:", data.error);
                alert(data.error || "Login failed");
            }
        } catch (error) {
            // NETWORK ERROR
            console.error("Fetch error:", error);
            alert("Cannot connect to server. Ensure your backend is running.");
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
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Log in to continue your journey with Rentify</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="example@mail.com"
                            placeholderTextColor="#666"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="#666"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity style={styles.forgotPassword}>
                        <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>

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
                </SafeAreaView>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1 },
    overlay: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
    header: { marginBottom: 40 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
    subtitle: { fontSize: 16, color: '#aaa', marginTop: 8 },
    form: { width: '100%' },
    inputContainer: { marginBottom: 20 },
    label: { color: '#fff', marginBottom: 8, fontSize: 14, fontWeight: '500' },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
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