import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';

const VerifyEmailScreen = ({ navigation, route }) => {
  const [status, setStatus] = useState('idle'); // idle | verifying | verified | failed
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const paramEmail = route?.params?.email || '';

  const webQuery = useMemo(() => {
    if (Platform.OS !== 'web') return { email: '', token: '' };
    const search = globalThis?.window?.location?.search || '';
    const params = new URLSearchParams(search);
    return { email: params.get('email') || '', token: params.get('token') || '' };
  }, []);

  const email = (webQuery.email || paramEmail || '').trim();
  const token = (webQuery.token || '').trim();

  useEffect(() => {
    const run = async () => {
      if (!email || !token) return;
      setStatus('verifying');
      setMessage('');
      try {
        const url = `${API_ENDPOINTS.AUTH.VERIFY_EMAIL}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setStatus('verified');
          setMessage('Your email is verified. You can log in now.');
        } else {
          setStatus('failed');
          setMessage(data?.reason ? `Verification failed: ${data.reason}` : 'Verification failed.');
        }
      } catch (e) {
        setStatus('failed');
        setMessage("Couldn't reach the server.");
      }
    };
    run();
  }, [email, token]);

  const handleResend = async () => {
    if (!email) {
      setMessage('Enter your email from the login screen to resend the verification link.');
      return;
    }
    setSending(true);
    setMessage('');
    try {
      const res = await fetch(API_ENDPOINTS.AUTH.RESEND_VERIFICATION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setMessage(data?.message || 'Verification email sent.');
      else setMessage(data?.error || 'Failed to resend verification email.');
    } catch (e) {
      setMessage("Couldn't reach the server.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          {email ? `We sent a verification link to ${email}.` : 'We sent a verification link to your email.'}
        </Text>

        {status === 'verifying' && (
          <View style={styles.row}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.statusText}>Verifying…</Text>
          </View>
        )}

        {!!message && <Text style={styles.message}>{message}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleResend} disabled={sending}>
          <Text style={styles.buttonText}>{sending ? 'Sending…' : 'Resend verification email'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => Linking.openURL('mailto:')}
        >
          <Text style={styles.buttonText}>Open email app</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.link}>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  statusText: { color: 'rgba(255,255,255,0.8)' },
  message: { color: 'rgba(255,255,255,0.9)', marginTop: 8, marginBottom: 12 },
  button: { backgroundColor: COLORS.primary, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  link: { marginTop: 14, alignSelf: 'center' },
  linkText: { color: COLORS.secondary, fontWeight: '700' },
});

export default VerifyEmailScreen;
