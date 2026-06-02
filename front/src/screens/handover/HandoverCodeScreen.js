import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import storage from '../../utils/storage';
import { API_ENDPOINTS } from '../../constants/api';
import { COLORS } from '../../constants/colors';import { useTranslation } from "react-i18next";

const formatCountdown = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const sec = String(totalSec % 60).padStart(2, '0');
  return `${min}:${sec}`;
};

const getGenerateEndpoint = ({ flow, reservationId }) => {
  if (flow === 'return') return API_ENDPOINTS.RESERVATIONS.RETURN.GENERATE(reservationId);
  return API_ENDPOINTS.RESERVATIONS.PICKUP.GENERATE(reservationId);
};
const getPayloadEndpoint = ({ flow, reservationId }) => {
  if (flow === 'return') return API_ENDPOINTS.RESERVATIONS.RETURN.PAYLOAD(reservationId);
  return API_ENDPOINTS.RESERVATIONS.PICKUP.PAYLOAD(reservationId);
};

const HandoverCodeScreen = ({ navigation, route }) => {const { t } = useTranslation();
  const reservationId = route?.params?.reservationId;
  const flow = route?.params?.flow || 'pickup'; // pickup | return
  const title = flow === 'return' ? 'Code de retour' : 'Code de récupération';

  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null); // { code, expiresAt, qrToken, qrDataUrl }
  const [nowMs, setNowMs] = useState(Date.now());
  const [mode, setMode] = useState('qr'); // 'qr' | 'code'
  const canShowQr = Boolean(payload?.qrDataUrl);
  const [verifiedAt, setVerifiedAt] = useState(null);

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
    if (!reservationId) {
      Alert.alert(t("screens.handover.handovercodescreen.erreur"), t("screens.handover.handovercodescreen.reservationidManquant"));
      return;
    }
    const endpoint = getGenerateEndpoint({ flow, reservationId });

    try {
      setLoading(true);
      const token = await storage.getItemAsync('userToken');
      if (!token) throw new Error('Authentification requise');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Impossible de générer le code');

      setPayload(data);
      setVerifiedAt(null);
    } catch (e) {
      Alert.alert(t("screens.handover.handovercodescreen.erreur"), e.message || t("screens.reservations.reservationdatepickerscreen.uneErreurEstSurvenue"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  // Poll pickup payload status so the renter gets immediate feedback when the owner validates.
  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const poll = async () => {
      if (!reservationId) return;
      try {
        const token = await storage.getItemAsync('userToken');
        if (!token) return;

        const res = await fetch(getPayloadEndpoint({ flow, reservationId }), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg = String(body?.error || '');
          // If the API is still on the old behavior (payload forbidden once not pickup_pending),
          // treat it as "already validated" so the renter still gets the success UX.
          if (msg.includes('payload is only available when status is')) {
            if (!cancelled) setVerifiedAt(new Date().toISOString());
            return;
          }
          return;
        }
        const json = await res.json();
        if (cancelled) return;
        if (json?.verifiedAt) {
          setVerifiedAt(json.verifiedAt);
        }
      } catch (_e) {


        // ignore
      } finally {if (!cancelled) timer = setTimeout(poll, 2000);}
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [flow, reservationId]);

  // Do not auto-redirect; wait for user to confirm in the modal.

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
          <Text style={styles.lead}>{t("screens.handover.handovercodescreen.presentezCeCodePourValiderLaRemise")}</Text>

          <View style={styles.modeTabs}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setMode('qr')}
              style={[styles.modeTab, mode === 'qr' && styles.modeTabActive]}>
              
              <Text style={[styles.modeTabText, mode === 'qr' && styles.modeTabTextActive]}>{t("screens.handover.handovercodescreen.qr")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setMode('code')}
              style={[styles.modeTab, mode === 'code' && styles.modeTabActive]}>
              
              <Text style={[styles.modeTabText, mode === 'code' && styles.modeTabTextActive]}>{t("screens.handover.handovercodescreen.code")}</Text>
            </TouchableOpacity>
          </View>

          {mode === 'qr' && canShowQr ?
          <View style={styles.qrBox}>
              {loading ?
            <ActivityIndicator color="#fff" /> :

            <View style={styles.qrInner}>
                  <Image source={{ uri: payload?.qrDataUrl }} style={styles.qrImage} resizeMode="contain" />
                </View>
            }
              <Text style={styles.qrHint}>{t("screens.handover.handovercodescreen.scannezCeQrCodeCoteProprietaire")}</Text>
              <TouchableOpacity onPress={() => setMode('code')} activeOpacity={0.85} style={styles.altLinkWrap}>
                <Text style={styles.altLink}>{t("screens.handover.handovercodescreen.utiliserLeCodeA6Chiffres")}</Text>
              </TouchableOpacity>
            </View> :
          mode === 'qr' && !canShowQr ?
          <View style={styles.qrBox}>
              <Ionicons name="qr-code-outline" size={40} color="rgba(255,255,255,0.7)" />
              <Text style={styles.qrHint}>{t("screens.handover.handovercodescreen.qrIndisponiblePourLeMomentUtilisezLe")}

            </Text>
              <TouchableOpacity onPress={() => setMode('code')} activeOpacity={0.85} style={styles.altLinkWrap}>
                <Text style={styles.altLink}>{t("screens.handover.handovercodescreen.utiliserLeCodeA6Chiffres")}</Text>
              </TouchableOpacity>
            </View> :

          <View style={styles.codeBox}>
              {loading ?
            <ActivityIndicator color="#fff" /> :

            <Text style={styles.codeText}>{payload?.code || '— — — — — —'}</Text>
            }
              {canShowQr ?
            <TouchableOpacity onPress={() => setMode('qr')} activeOpacity={0.85} style={styles.altLinkWrap}>
                  <Text style={styles.altLink}>{t("screens.handover.handovercodescreen.utiliserLeQrCode")}</Text>
                </TouchableOpacity> :
            null}
            </View>
          }

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{t("screens.handover.handovercodescreen.expireDans")}{formatCountdown(remainingMs)}</Text>
          </View>

          <TouchableOpacity onPress={generate} disabled={loading} activeOpacity={0.85} style={styles.buttonWrap}>
            <LinearGradient
              colors={['#4C6FFF', COLORS.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.button, loading && styles.buttonDisabled]}>
              
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.buttonText}>{t("screens.handover.handovercodescreen.regenerer")}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.hint}>{t("screens.handover.handovercodescreen.pourVotreSecuriteLeCodeEstValable")}

          </Text>
        </View>
      </View>

      <Modal transparent visible={Boolean(verifiedAt)} animationType="fade">
        <View style={styles.successBackdrop}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark" size={30} color="#0f1228" />
            </View>
            <Text style={styles.successTitle}>{t("screens.handover.handovercodescreen.recuperationValidee")}</Text>
            <Text style={styles.successSubtitle}>{t("screens.handover.handovercodescreen.leProprietaireAConfirmeLaRemiseDu")}</Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setVerifiedAt(null);
                navigation.goBack();
              }}
              style={{ marginTop: 14 }}>
              
              <LinearGradient colors={['#4C6FFF', COLORS.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.successButton}>
                <Text style={styles.successButtonText}>{t("screens.handover.handovercodescreen.retourAuxDetails")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>);

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
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  content: { flex: 1, padding: 16 },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  lead: { color: COLORS.textMuted, marginBottom: 12 },
  modeTabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12
  },
  modeTab: {
    flex: 1,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  modeTabActive: {
    backgroundColor: 'rgba(143,108,255,0.18)',
    borderColor: 'rgba(143,108,255,0.55)'
  },
  modeTabText: { color: 'rgba(255,255,255,0.72)', fontWeight: '900' },
  modeTabTextActive: { color: '#fff' },
  codeBox: {
    borderRadius: 16,
    paddingVertical: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  codeText: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: 3 },
  qrBox: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  qrInner: {
    padding: 10,
    borderRadius: 18,
    backgroundColor: '#ffffff'
  },
  qrImage: { width: 210, height: 210 },
  qrHint: { marginTop: 10, color: COLORS.textMuted, textAlign: 'center' },
  altLinkWrap: { marginTop: 12 },
  altLink: { color: '#cdd2ff', fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  metaText: { color: COLORS.textMuted },
  buttonWrap: { marginTop: 16 },
  button: {
    height: 48,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '800' },
  hint: { marginTop: 14, color: COLORS.textMuted, lineHeight: 18 },
  successBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18
  },
  successCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 20,
    backgroundColor: '#151738',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 18,
    alignItems: 'center'
  },
  successIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#2ECC71',
    alignItems: 'center',
    justifyContent: 'center'
  },
  successTitle: { marginTop: 12, color: '#fff', fontSize: 18, fontWeight: '900' },
  successSubtitle: { marginTop: 6, color: 'rgba(255,255,255,0.70)', textAlign: 'center', lineHeight: 18 },
  successButton: { height: 46, paddingHorizontal: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  successButtonText: { color: '#fff', fontWeight: '900' }
});

export default HandoverCodeScreen;