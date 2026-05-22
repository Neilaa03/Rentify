import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import storage from '../../utils/storage';
import { API_ENDPOINTS } from '../../constants/api';
import { COLORS } from '../../constants/colors';

const onlyDigits = (value) => String(value || '').replace(/\D/g, '').slice(0, 6);

const getVerifyEndpoint = ({ flow, reservationId }) => {
  if (flow === 'pickup') return API_ENDPOINTS.RESERVATIONS.PICKUP.VERIFY(reservationId);
  return null;
};

const HandoverVerifyScreen = ({ navigation, route }) => {
  const reservationId = route?.params?.reservationId;
  const flow = route?.params?.flow || 'pickup'; // 'pickup' | 'return'
  const tokenFromParams = route?.params?.token || null;
  const title = flow === 'return' ? 'Vérifier retour' : 'Vérifier récupération';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => onlyDigits(code).length === 6 && !loading, [code, loading]);

  const submit = async () => {
    if (!reservationId) return;
    const endpoint = getVerifyEndpoint({ flow, reservationId });
    if (!endpoint) {
      Alert.alert('Indisponible', 'Ce flux n’est pas encore disponible.');
      return;
    }

    try {
      setLoading(true);
      const token = tokenFromParams || (await storage.getItemAsync('userToken'));
      if (!token) throw new Error('Authentification requise');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: onlyDigits(code) }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Vérification impossible');

      Alert.alert('Succès', 'Validation effectuée.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Erreur', e.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[COLORS.bg, COLORS.bg2]} style={styles.container}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 44 }} />
      </SafeAreaView>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.lead}>Saisissez le code à 6 chiffres.</Text>

          <TextInput
            value={onlyDigits(code)}
            onChangeText={(v) => setCode(onlyDigits(v))}
            keyboardType="numeric"
            style={styles.input}
            placeholder="------"
            placeholderTextColor="rgba(255,255,255,0.45)"
            maxLength={6}
          />

          <TouchableOpacity onPress={submit} disabled={!canSubmit} activeOpacity={0.85} style={styles.buttonWrap}>
            <LinearGradient
              colors={canSubmit ? ['#4C6FFF', COLORS.primary] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Valider</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: 'rgba(21, 24, 55, 0.65)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  content: { flex: 1, padding: 16 },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  lead: { color: COLORS.textMuted, marginBottom: 14, lineHeight: 18 },
  input: {
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 6,
  },
  buttonWrap: { marginTop: 16 },
  button: { height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '800' },
});

export default HandoverVerifyScreen;

