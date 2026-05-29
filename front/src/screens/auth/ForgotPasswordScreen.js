import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';

const ForgotPasswordScreen = ({ navigation, route }) => {
  const initialEmail = useMemo(() => String(route?.params?.email || '').trim(), [route?.params?.email]);
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    const trimmedEmail = email.trim();
    setMessage('');
    setError('');
    if (!trimmedEmail) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(data?.message || 'If this email exists, a password reset link has been sent.');
      } else {
        setError(data?.error || 'Failed to request password reset.');
      }
    } catch (e) {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Forgot password</Text>
        <Text style={styles.subtitle}>Enter your email and we’ll send you a reset link.</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="rgba(255,255,255,0.55)"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(t) => setEmail(t)}
        />

        {!!error && <Text style={styles.messageError}>{error}</Text>}
        {!!message && <Text style={styles.messageOk}>{message}</Text>}

        <TouchableOpacity onPress={submit} disabled={loading} style={{ marginTop: 10 }}>
          <LinearGradient
            colors={[COLORS.secondary, COLORS.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send reset link</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
          <Text style={styles.linkText}>Back to login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1228', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 16, lineHeight: 20 },
  input: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', backgroundColor: 'rgba(255,255,255,0.06)' },
  button: { borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  messageError: { color: 'rgba(255, 92, 92, 0.95)', marginTop: 10 },
  messageOk: { color: 'rgba(126, 231, 135, 0.95)', marginTop: 10 },
  link: { marginTop: 14, alignSelf: 'center' },
  linkText: { color: COLORS.secondary, fontWeight: '700' },
});

export default ForgotPasswordScreen;

