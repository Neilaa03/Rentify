import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ImageBackground, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';

const RegisterScreen = ({ navigation }) => {
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
                // alert("Registration successful! Redirecting to login...");
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'ClientApp' }],
                });
            } else {
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
        { id: 'company', label: 'Company', icon: 'business' },
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
                            <Text style={styles.title}>Create Account</Text>
                            <Text style={styles.subtitle}>Join Rentify and start your journey</Text>
                        </View>

                        <View style={styles.form}>
                            <View style={styles.nameRow}>
                                <View style={[styles.inputContainer, styles.halfInput, styles.halfInputLeft]}>
                                    <Text style={styles.label}>First Name</Text>
                                    <TextInput 
                                        style={[styles.input, errors.firstName ? styles.inputError : null]}
                                        placeholder="John"
                                        placeholderTextColor="rgba(255,255,255,0.6)"
                                        value={firstName}
                                        onChangeText={(text) => {
                                            setFirstName(text);
                                            clearError('firstName');
                                            clearError('form');
                                        }}
                                        autoCapitalize="words"
                                    />
                                    {!!errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                                </View>

                                <View style={[styles.inputContainer, styles.halfInput, styles.halfInputRight]}>
                                    <Text style={styles.label}>Last Name</Text>
                                    <TextInput 
                                        style={[styles.input, errors.lastName ? styles.inputError : null]}
                                        placeholder="Doe"
                                        placeholderTextColor="rgba(255,255,255,0.6)"
                                        value={lastName}
                                        onChangeText={(text) => {
                                            setLastName(text);
                                            clearError('lastName');
                                            clearError('form');
                                        }}
                                        autoCapitalize="words"
                                    />
                                    {!!errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Email Address</Text>
                                <TextInput 
                                    style={[styles.input, errors.email ? styles.inputError : null]}
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
                                <Text style={styles.label}>Phone Number</Text>
                                <TextInput 
                                    style={[styles.input, errors.phone ? styles.inputError : null]}
                                    placeholder="+1 (555) 000-0000"
                                    placeholderTextColor="rgba(255,255,255,0.6)"
                                    value={phone}
                                    onChangeText={(text) => {
                                        setPhone(text);
                                        clearError('phone');
                                        clearError('form');
                                    }}
                                    keyboardType="phone-pad"
                                />
                                {!!errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
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
                                                    size={32}
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
                                <Text style={styles.label}>Password</Text>
                                <TextInput 
                                    style={[styles.input, errors.password ? styles.inputError : null]}
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

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Confirm Password</Text>
                                <TextInput 
                                    style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
                                    placeholder="••••••••"
                                    placeholderTextColor="rgba(255,255,255,0.6)"
                                    value={confirmPassword}
                                    onChangeText={(text) => {
                                        setConfirmPassword(text);
                                        clearError('confirmPassword');
                                        clearError('form');
                                    }}
                                    secureTextEntry
                                />
                                {!!errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                                {!!errors.form && <Text style={styles.errorText}>{errors.form}</Text>}
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
        paddingHorizontal: 24,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    keyboardAvoid: { flex: 1 },
    scrollView: {
        flex: 1,
        paddingVertical: 20,
    },
    scrollContent: {
        paddingBottom: 28,
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
    nameRow: {
        flexDirection: 'row',
        width: '100%',
    },
    halfInput: {
        flex: 1,
    },
    halfInputLeft: {
        marginRight: 8,
    },
    halfInputRight: {
        marginLeft: 8,
    },
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
    inputError: {
        borderColor: 'rgba(255, 92, 92, 0.9)',
    },
    errorText: {
        marginTop: 8,
        color: 'rgba(255, 92, 92, 0.95)',
        fontSize: 12,
        lineHeight: 16,
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
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    roleButtonActive: {
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(166, 110, 255, 0.2)',
    },
    roleIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    roleIconContainerActive: {
        backgroundColor: COLORS.primary,
    },
    roleLabel: { 
        color: 'rgba(255,255,255,0.75)',
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
