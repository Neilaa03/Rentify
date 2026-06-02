import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import storage from '../../utils/storage';
import { API_ENDPOINTS } from '../../constants/api';
import { COLORS } from '../../constants/colors';import { useTranslation } from "react-i18next";
import { getFriendlyError } from '../../utils/friendlyError';

const onlyDigits = (value) => String(value || '').replace(/\D/g, '').slice(0, 6);

const useCameraSafe = () => {
  if (Platform.OS === 'web') {
    return { CameraView: null, useCameraPermissions: null };
  }
  try {
    const cam = require('expo-camera');
    return {
      CameraView: cam?.CameraView || null,
      useCameraPermissions: cam?.useCameraPermissions || null
    };
  } catch (_e) {
    return { CameraView: null, useCameraPermissions: null };
  }
};

const getVerifyEndpoint = ({ flow, reservationId }) => {
  if (flow === 'return') return API_ENDPOINTS.RESERVATIONS.RETURN.VERIFY(reservationId);
  return API_ENDPOINTS.RESERVATIONS.PICKUP.VERIFY(reservationId);
};

const HandoverVerifyScreen = ({ navigation, route }) => {const { t } = useTranslation();
  const reservationId = route?.params?.reservationId;
  const flow = route?.params?.flow || 'pickup'; // pickup | return
  const tokenFromParams = route?.params?.token || null;
  const title = flow === 'return' ? 'Vérifier retour' : 'Vérifier récupération';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('qr'); // 'qr' | 'code'
  const [scannerOpen, setScannerOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const { CameraView, useCameraPermissions } = useCameraSafe();
  const cameraPermTuple = typeof useCameraPermissions === 'function' ? useCameraPermissions() : [null, async () => ({ granted: false })];
  const permission = cameraPermTuple[0];
  const requestPermission = cameraPermTuple[1];
  const scanHandledRef = useRef(false);

  const canSubmit = useMemo(() => onlyDigits(code).length === 6 && !loading, [code, loading]);

  const submit = async ({ code: codeValue, qrToken } = {}) => {
    if (!reservationId) return;
    const endpoint = getVerifyEndpoint({ flow, reservationId });
    if (!endpoint) {
      Alert.alert(t("screens.handover.handoververifyscreen.indisponible"), t("screens.handover.handoververifyscreen.ceFluxNestPasEncoreDisponible"));
      return;
    }

    try {
      setLoading(true);
      const token = tokenFromParams || (await storage.getItemAsync('userToken'));
      if (!token) throw new Error('Authentification requise');

      const body =
      qrToken && String(qrToken).trim() ?
      { qrToken: String(qrToken).trim() } :
      { code: onlyDigits(codeValue ?? code) };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Vérification impossible');

      setSuccessOpen(true);
    } catch (e) {
      Alert.alert(t("screens.handover.handoververifyscreen.erreur"), getFriendlyError(e, t));
    } finally {
      setLoading(false);
    }
  };

  const openScanner = async () => {
    if (!CameraView) {
      Alert.alert(t("screens.handover.handoververifyscreen.indisponible"), t("screens.handover.handoververifyscreen.leScannerQrNestPasDisponibleInstallez"));
      return;
    }
    scanHandledRef.current = false;
    const granted = permission?.granted;
    if (!granted) {
      const res = await requestPermission();
      const ok = res?.granted || res?.status === 'granted';
      if (!ok) {
        Alert.alert(t("screens.handover.handoververifyscreen.permissionRequise"), t("screens.handover.handoververifyscreen.autorisezLaccesALaCameraPourScanner"));
        return;
      }
    }
    setScannerOpen(true);
  };

  const onBarcodeScanned = (event) => {
    if (scanHandledRef.current) return;
    const value = event?.data;
    if (!value) return;
    scanHandledRef.current = true;
    setScannerOpen(false);
    submit({ qrToken: value });
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
          {mode === 'qr' ?
          <>
              <Text style={styles.lead}>{t("screens.handover.handoververifyscreen.scannezDabordLeQrCodeSiCa")}</Text>

              <TouchableOpacity onPress={openScanner} disabled={loading} activeOpacity={0.85} style={styles.buttonWrap}>
                <LinearGradient
                colors={['#4C6FFF', COLORS.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.button, loading && styles.buttonDisabled]}>
                
                  <Ionicons name="scan-outline" size={18} color="#fff" />
                  <Text style={styles.buttonText}>{t("screens.handover.handoververifyscreen.scannerLeQrCode")}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setMode('code')} activeOpacity={0.85} style={styles.altLinkWrap}>
                <Text style={styles.altLink}>{t("screens.handover.handoververifyscreen.saisirLeCodeA6Chiffres")}</Text>
              </TouchableOpacity>
            </> :

          <>
              <Text style={styles.lead}>{t("screens.handover.handoververifyscreen.saisissezLeCodeA6Chiffres")}</Text>

              <TextInput
              value={onlyDigits(code)}
              onChangeText={(v) => setCode(onlyDigits(v))}
              keyboardType="numeric"
              style={styles.input}
              placeholder="------"
              placeholderTextColor="rgba(255,255,255,0.45)"
              maxLength={6} />
            

              <TouchableOpacity onPress={() => submit({ code })} disabled={!canSubmit} activeOpacity={0.85} style={styles.buttonWrap}>
                <LinearGradient
                colors={canSubmit ? ['#4C6FFF', COLORS.primary] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.08)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}>
                
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("screens.handover.handoververifyscreen.valider")}</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setMode('qr')} activeOpacity={0.85} style={styles.altLinkWrap}>
                <Text style={styles.altLink}>{t("screens.handover.handoververifyscreen.scannerLeQrCode")}</Text>
              </TouchableOpacity>
            </>
          }
        </View>
      </View>

      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={styles.scannerContainer}>
          <SafeAreaView style={styles.scannerHeader}>
            <TouchableOpacity onPress={() => setScannerOpen(false)} style={styles.scannerClose}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>{t("screens.handover.handoververifyscreen.scannerQr")}</Text>
            <View style={{ width: 44 }} />
          </SafeAreaView>

          <View style={styles.scannerBody}>
            {CameraView ?
            <CameraView style={StyleSheet.absoluteFillObject} onBarcodeScanned={onBarcodeScanned} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} /> :

            <View style={styles.scannerFallback}>
                <Text style={styles.scannerFallbackText}>{t("screens.handover.handoververifyscreen.scannerIndisponible")}</Text>
              </View>
            }
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
              <Text style={styles.scannerHint}>{t("screens.handover.handoververifyscreen.alignezLeQrCodeDansLeCadre")}</Text>
              <TouchableOpacity onPress={() => {setScannerOpen(false);setMode('code');}} activeOpacity={0.85} style={styles.scannerAltButton}>
                <Text style={styles.scannerAltButtonText}>{t("screens.handover.handoververifyscreen.saisirLeCodeALaPlace")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={successOpen} animationType="fade" onRequestClose={() => setSuccessOpen(false)}>
        <View style={styles.successBackdrop}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark" size={30} color="#0f1228" />
            </View>
            <Text style={styles.successTitle}>{t("screens.handover.handoververifyscreen.validationEffectuee")}</Text>
            <Text style={styles.successSubtitle}>{t("screens.handover.handoververifyscreen.laRecuperationAEteConfirmeeAvecSucces")}</Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setSuccessOpen(false);
                navigation.goBack();
              }}
              style={{ marginTop: 14 }}>
              
              <LinearGradient colors={['#4C6FFF', COLORS.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.successButton}>
                <Text style={styles.successButtonText}>{t("screens.handover.handoververifyscreen.retour")}</Text>
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
    letterSpacing: 6
  },
  buttonWrap: { marginTop: 16 },
  button: { height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '800' },
  altLinkWrap: { marginTop: 12, alignItems: 'center' },
  altLink: { color: '#cdd2ff', fontWeight: '800' },
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.35)'
  },
  scannerClose: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)'
  },
  scannerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  scannerBody: { flex: 1 },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18
  },
  scannerFrame: {
    width: 260,
    height: 260,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(0,0,0,0.10)'
  },
  scannerHint: { marginTop: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  scannerAltButton: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)'
  },
  scannerAltButtonText: { color: '#fff', fontWeight: '800' },
  scannerFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scannerFallbackText: { color: '#fff' },
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

export default HandoverVerifyScreen;
