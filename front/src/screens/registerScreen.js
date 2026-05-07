import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ImageBackground, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { API_ENDPOINTS } from '../constants/api';

const RegisterScreen = ({ navigation }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState(null);

    const handleRegister = async () => {
        console.log("Register button pressed");
        
        // 1. Basic validation
        if (!firstName || !lastName || !email || !phone || !password || !confirmPassword || !selectedRole) {
            alert("Please fill in all fields and select a role");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            alert("Password must be at least 6 characters long");
            return;
        }

        console.log("Email:", email);
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
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    phone: phone,
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
                alert("Registration successful! Redirecting to login...");
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                });
            } else {
                // BACKEND ERROR
                console.log("Registration failed:", data.error);
                alert(data.error || "Registration failed");
            }
        } catch (error) {
            // NETWORK ERROR
            console.error("Fetch error:", error);
            alert("Cannot connect to server. Ensure your backend is running.");
        }
    };

    const roles = [
        { id: 'client', label: 'Client', icon: 'person' },
        { id: 'owner', label: 'Vehicle Owner', icon: 'car' },
        { id: 'company', label: 'Company', icon: 'business' },
    ];

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('../assets/background.png')}
                style={styles.background}
                resizeMode="cover"
            >
                <SafeAreaView style={styles.overlay}>
                    <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
                        <TouchableOpacity 
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={28} color="#fff" />
                        </TouchableOpacity>

                        <View style={styles.header}>
                            <Text style={styles.title}>Create Account</Text>
                            <Text style={styles.subtitle}>Join Rentify and start your journey</Text>
                        </View>

                        <View style={styles.form}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>First Name</Text>
                                <TextInput 
                                    style={styles.input}
                                    placeholder="John"
                                    placeholderTextColor="#666"
                                    value={firstName}
                                    onChangeText={setFirstName}
                                    autoCapitalize="words"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Last Name</Text>
                                <TextInput 
                                    style={styles.input}
                                    placeholder="Doe"
                                    placeholderTextColor="#666"
                                    value={lastName}
                                    onChangeText={setLastName}
                                    autoCapitalize="words"
                                />
                            </View>

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
                                <Text style={styles.label}>Phone Number</Text>
                                <TextInput 
                                    style={styles.input}
                                    placeholder="+1 (555) 000-0000"
                                    placeholderTextColor="#666"
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
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

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Confirm Password</Text>
                                <TextInput 
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor="#666"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
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
                                            onPress={() => setSelectedRole(role.id)}
                                        >
                                            <View style={[
                                                styles.roleIconContainer,
                                                selectedRole === role.id && styles.roleIconContainerActive
                                            ]}>
                                                <Ionicons 
                                                    name={role.icon} 
                                                    size={32} 
                                                    color={selectedRole === role.id ? '#fff' : '#666'}
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
                            </View>

                            <TouchableOpacity onPress={handleRegister}>
                                <LinearGradient
                                    colors={[COLORS.secondary, COLORS.primary]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.registerButton}
                                >
                                    <Text style={styles.buttonText}>Create Account</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.linkText}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
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
        paddingHorizontal: 24,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    scrollView: {
        flex: 1,
        paddingVertical: 20,
    },
    backButton: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    header: { marginBottom: 30 },
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
    rolesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    roleButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        marginHorizontal: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    roleButtonActive: {
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(166, 110, 255, 0.2)',
    },
    roleIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    roleIconContainerActive: {
        backgroundColor: COLORS.primary,
    },
    roleLabel: { 
        color: '#666', 
        fontSize: 12, 
        fontWeight: '500',
        textAlign: 'center',
    },
    roleLabelActive: {
        color: '#fff',
    },
    registerButton: { height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30, marginBottom: 20 },
    footerText: { color: '#aaa' },
    linkText: { color: COLORS.secondary, fontWeight: 'bold' }
});

export default RegisterScreen;
