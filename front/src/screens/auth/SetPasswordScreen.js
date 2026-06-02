import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';
import storage from '../../utils/storage';import { useTranslation } from "react-i18next";

const SetPasswordScreen = ({ navigation, route }) => {const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState(route?.params?.token || '');

  const allowSkip = useMemo(() => route?.params?.allowSkip !== false, [route?.params?.allowSkip]);

  useEffect(() => {
    const load = async () => {
      if (token) return;
      const t = await storage.getItemAsync('userToken');
      if (t) setToken(t);
    };
    load();
  }, [token]);

  const goNext = async () => {
    const t = token || (await storage.getItemAsync('userToken'));
    if (!t) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }

    try {
      const meRes = await fetch(API_ENDPOINTS.AUTH.ME, {
        headers: { Authorization: `Bearer ${t}` }
      });
      const meJson = meRes.ok ? await meRes.json() : null;
      const user = meJson?.user || null;
      if (!user) throw new Error('Unable to load account');

      const role = user.role;
      const params = { token: t, user };
      if (role === 'admin') {
        navigation.reset({ index: 0, routes: [{ name: 'AdminDashboard', params }] });
      } else if (role === 'owner') {
        navigation.reset({ index: 0, routes: [{ name: 'OwnerDashboard', params }] });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'ClientApp', params: { screen: 'HomeTab', params } }]
        });
      }
    } catch {
      navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
    }
  };

  const submit = async () => {
    setError('');
    setMessage('');

    if (!token) {
      setError('Session expired. Please log in again.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.AUTH.SET_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password, confirmPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to set password.');
        return;
      }
      setMessage('Password saved.');
      setTimeout(goNext, 350);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{t("screens.auth.setpasswordscreen.setAPassword")}</Text>
        <Text style={styles.subtitle}>{t("screens.auth.setpasswordscreen.optionalAddAPasswordSoYouCan")}

        </Text>

        <View style={styles.field}>
          <TextInput
            style={styles.input}
            placeholder={t("screens.auth.setpasswordscreen.password")}
            placeholderTextColor="rgba(255,255,255,0.55)"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword} />
          
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          placeholder={t("screens.auth.setpasswordscreen.confirmPassword")}
          placeholderTextColor="rgba(255,255,255,0.55)"
          secureTextEntry={!showPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword} />
        

        {!!error && <Text style={styles.messageError}>{error}</Text>}
        {!!message && <Text style={styles.messageOk}>{message}</Text>}

        <TouchableOpacity onPress={submit} disabled={loading} style={{ marginTop: 12 }}>
          <LinearGradient
            colors={[COLORS.secondary, COLORS.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}>
            
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("screens.auth.setpasswordscreen.savePassword")}</Text>}
          </LinearGradient>
        </TouchableOpacity>

        {allowSkip &&
        <TouchableOpacity onPress={goNext} style={styles.link}>
            <Text style={styles.linkText}>{t("screens.auth.setpasswordscreen.skipForNow")}</Text>
          </TouchableOpacity>
        }
      </View>
    </SafeAreaView>);

};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1228', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 16, lineHeight: 20 },
  field: { position: 'relative' },
  input: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', backgroundColor: 'rgba(255,255,255,0.06)', paddingRight: 44 },
  eyeButton: { position: 'absolute', right: 10, top: 10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  button: { borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  messageError: { color: 'rgba(255, 92, 92, 0.95)', marginTop: 10 },
  messageOk: { color: 'rgba(126, 231, 135, 0.95)', marginTop: 10 },
  link: { marginTop: 14, alignSelf: 'center' },
  linkText: { color: COLORS.secondary, fontWeight: '700' }
});

export default SetPasswordScreen;
