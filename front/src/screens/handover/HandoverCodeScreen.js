import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import storage from '../../utils/storage';
import { API_ENDPOINTS } from '../../constants/api';
import { COLORS } from '../../constants/colors';

const formatCountdown = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const sec = String(totalSec % 60).padStart(2, '0');
  return `${min}:${sec}`;
};

const getGenerateEndpoint = ({ flow, reservationId }) => {
  if (flow === 'pickup') return API_ENDPOINTS.RESERVATIONS.PICKUP.GENERATE(reservationId);
  return null;
};

const HandoverCodeScreen = ({ navigation, route }) => {
  const reservationId = route?.params?.reservationId;
  const flow = route?.params?.flow || 'pickup'; // 'pickup' | 'return'
  const title = flow === 'return' ? 'Code de retour' : 'Code de récupération';

  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null); // { code, expiresAt, qrToken }
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const expiresMs = useMemo(() => {
    const iso = payload?.expiresAt;
    const ms = iso ? Date.parse(iso) : NaN;
    return Number.isFinite(ms) ? ms : NaN;
  }, [payload]);

  const remainingMs = useMemo(() => {
    if (!Number.isFinite(expiresMs)) return NaN;
    return Math.max(0, expiresMs - nowMs);
  }, [expiresMs, nowMs]);

  const generate = async () => {
    if (!reservationId) return;
    const endpoint = getGenerateEndpoint({ flow, reservationId });
    if (!endpoint) {
      Alert.alert('Indisponible', 'Ce flux n’est pas encore disponible.');
      return;
    }

    try {
      setLoading(true);
      const token = await storage.getItemAsync('userToken');
      if (!token) throw new Error('Authentification requise');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Impossible de générer le code');

      setPayload(data);
    } catch (e) {
      Alert.alert('Erreur', e.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId, flow]);

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
          <Text style={styles.lead}>Présentez ce code pour valider la remise du véhicule</Text>

          <View style={styles.codeBox}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.codeText}>{payload?.code || '— — — — — —'}</Text>
            )}
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.metaText}>Expire dans {formatCountdown(remainingMs)}</Text>
          </View>

          <TouchableOpacity onPress={generate} disabled={loading} activeOpacity={0.85} style={styles.buttonWrap}>
            <LinearGradient
              colors={['#4C6FFF', COLORS.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.button, loading && styles.buttonDisabled]}
            >
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.buttonText}>Regénérer</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.hint}>
            Pour votre sécurité, le code est valable quelques minutes. Vous pouvez le régénérer si besoin.
          </Text>
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
  lead: { color: COLORS.textMuted, marginBottom: 12 },
  codeBox: {
    borderRadius: 16,
    paddingVertical: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  metaText: { color: COLORS.textMuted },
  buttonWrap: { marginTop: 16 },
  button: {
    height: 48,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '800' },
  hint: { marginTop: 14, color: COLORS.textMuted, lineHeight: 18 },
});

export default HandoverCodeScreen;

