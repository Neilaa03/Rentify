import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import AgencyBottomNavigation from '../../components/navigation/AgencyBottomNavigation';
import { AgencyCard, Badge, SectionTitle } from '../../components/agency/AgencyPrimitives';
import { getAgencyDocuments, uploadAgencyDocument } from '../../services/agency';
import { deleteDocument } from '../../services/owner';

const requiredCompanyDocs = [
  {
    key: 'business_registration',
    label: 'Registre de commerce',
    subtitle: 'Document légal de l’entreprise',
    icon: 'business-outline',
    uploadType: 'business_registration',
  },
  {
    key: 'nif',
    label: 'NIF / NIS',
    subtitle: 'Numéro fiscal de l’agence',
    icon: 'hash-outline',
    uploadType: 'nif',
  },
  {
    key: 'manager_identity',
    label: "Carte d'identité du gérant",
    subtitle: 'Identité du responsable légal',
    icon: 'person-outline',
    uploadType: 'identity_card',
  },
  {
    key: 'professional_insurance',
    label: 'Assurance professionnelle',
    subtitle: 'Couverture légale de l’activité',
    icon: 'shield-checkmark-outline',
    uploadType: 'professional_insurance',
  },
];

const statusMeta = {
  VERIFIED: { label: 'Vérifié', tone: 'green', icon: 'checkmark-circle-outline' },
  REJECTED: { label: 'Rejeté', tone: 'red', icon: 'close-circle-outline' },
  PENDING: { label: 'En vérification', tone: 'amber', icon: 'time-outline' },
  MISSING: { label: 'Manquant', tone: 'neutral', icon: 'alert-circle-outline' },
};

const getStatusMeta = (status) => statusMeta[status] || statusMeta.MISSING;

const normalize = (value) => String(value || '').trim();

const pickDocument = (documents, { type, companyId, userId, carId }) =>
  (documents || []).find((doc) => {
    if (doc.documentType !== type) return false;
    if (companyId) return doc.companyId === companyId;
    if (userId) return doc.userId === userId;
    if (carId) return doc.carId === carId;
    return true;
  }) || null;

const buildDocStatus = (doc, fallback = null) => {
  if (!doc) return fallback || 'MISSING';
  if (doc.status === 'VERIFIED') return 'VERIFIED';
  if (doc.status === 'REJECTED') return 'REJECTED';
  return 'PENDING';
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR');
};

const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const inferMimeType = (file) => {
  const explicit = String(file?.mimeType || '').toLowerCase();
  if (allowedMimeTypes.includes(explicit)) return explicit;
  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
};

const RequirementCard = ({ item, status, fileLabel, doc, busy = false, onPress, onUpload, onView, onDelete }) => {
  const meta = getStatusMeta(status);
  const canUpload = Boolean(item.uploadType && onUpload && status !== 'VERIFIED');
  const handleView = onView || (doc?.documentUrl ? () => Linking.openURL(doc.documentUrl) : null);
  const canView = Boolean(handleView);
  const canDelete = Boolean(onDelete);
  const ocrReason = doc?.ocrResult?.verificationReason || '';
  const ocrStatus = doc?.ocrResult?.verificationStatus || '';
  const ocrConfidence = doc?.ocrResult?.confidenceScore;
  const reviewedAt = formatDate(doc?.reviewedAt);
  const hasOcr = Boolean(doc?.ocrResult);

  return (
    <TouchableOpacity style={styles.requirementCard} activeOpacity={0.86} onPress={onPress}>
      <View style={styles.requirementIcon}>
        <Ionicons name={item.icon} size={18} color="#AAB3D6" />
      </View>

      <View style={styles.requirementBody}>
        <View style={styles.requirementTopRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.requirementTitle}>{item.label}</Text>
            <Text style={styles.requirementSubtitle}>{item.subtitle}</Text>
          </View>
          <Badge label={meta.label} toneKey={meta.tone} icon={meta.icon} />
        </View>

        <View style={styles.requirementDivider} />

        <Text style={[styles.requirementFile, status === 'MISSING' && styles.requirementMissing]}>
          {fileLabel || 'Aucun document soumis'}
        </Text>
        <Text style={styles.requirementHint}>
          {status === 'VERIFIED'
            ? 'Document vérifié et verrouillé'
            : status === 'REJECTED'
              ? 'Document refusé, une nouvelle version est attendue'
              : status === 'PENDING'
                ? 'Document soumis, en attente de vérification'
                : 'Document obligatoire non soumis'}
        </Text>

        {hasOcr ? (
          <View style={[styles.ocrBlock, status === 'REJECTED' && styles.ocrBlockRejected, status === 'VERIFIED' && styles.ocrBlockVerified]}>
            <Text style={styles.ocrLabel}>
              {status === 'VERIFIED' ? 'Document vérifié' : status === 'REJECTED' ? 'Document rejeté' : 'Contrôle OCR'}
            </Text>
            {ocrReason ? <Text style={styles.ocrReason}>{ocrReason}</Text> : <Text style={styles.ocrReasonMuted}>Aucune raison fournie.</Text>}
            <Text style={styles.ocrMeta}>{`Statut OCR: ${ocrStatus || 'N/A'}`}</Text>
            <Text style={styles.ocrMeta}>{`Confiance: ${ocrConfidence != null ? `${Number(ocrConfidence).toFixed(1)}%` : 'N/A'}`}</Text>
            {reviewedAt ? <Text style={styles.ocrMeta}>{`Révisé le: ${reviewedAt}`}</Text> : null}
          </View>
        ) : null}

        {(canUpload || canView || canDelete) ? (
          <View style={styles.actionRow}>
            {canUpload ? (
              <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]} onPress={onUpload} disabled={busy}>
                <Ionicons name={status === 'MISSING' ? 'cloud-upload-outline' : 'create-outline'} size={14} color="#fff" />
                <Text style={styles.actionBtnText}>{status === 'MISSING' ? 'Téléverser' : 'Mettre à jour'}</Text>
              </TouchableOpacity>
            ) : null}
            {canView ? (
              <TouchableOpacity style={styles.actionBtn} onPress={handleView} disabled={busy}>
                <Ionicons name="eye-outline" size={14} color="#D9DFFF" />
                <Text style={styles.actionBtnTextSecondary}>Voir</Text>
              </TouchableOpacity>
            ) : null}
            {canDelete ? (
              <TouchableOpacity style={styles.actionBtn} onPress={onDelete} disabled={busy}>
                <Ionicons name="trash-outline" size={14} color="#FF8FA3" />
                <Text style={styles.actionBtnTextDanger}>Supprimer</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export default function AgencyDocumentsScreen({ navigation, route }) {
  const token = route?.params?.token;
  const user = route?.params?.user;

  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    error: '',
    data: null,
  });
  const [busyKey, setBusyKey] = useState('');

  const load = useCallback(async () => {
    if (!token) {
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: 'Session requise' }));
      return;
    }

    try {
      const data = await getAgencyDocuments({ token });
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: '', data }));
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: error.message || 'Impossible de charger les documents' }));
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setState((prev) => ({ ...prev, refreshing: true }));
    await load();
  };

  const agency = state.data?.agency || {};
  const documents = Array.isArray(state.data?.documents) ? state.data.documents : [];
  const counters = state.data?.counters || {};
  const managerId = route?.params?.user?.id;

  const agencyDocs = useMemo(() => documents.filter((doc) => doc.companyId || doc.userId), [documents]);

  const companyCards = useMemo(() => requiredCompanyDocs.map((item) => {
    const doc = pickDocument(agencyDocs, {
      type: item.key,
      companyId: agency.id,
      userId: managerId,
      carId: null,
    }) || pickDocument(agencyDocs, { type: item.uploadType, companyId: agency.id, userId: managerId, carId: null });
    const status = buildDocStatus(doc);

    const fileLabel = doc?.documentUrl
      ? doc.documentUrl.split('/').pop()
      : '';

    return { item, status, fileLabel, doc };
  }), [agency.id, agencyDocs, managerId]);

  const openDocument = useCallback(async (doc) => {
    if (!doc?.documentUrl) return;
    try {
      await Linking.openURL(doc.documentUrl);
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible d’ouvrir le document');
    }
  }, []);

  const selectAndUpload = useCallback(async (item) => {
    if (!item.uploadType) {
      Alert.alert('Document non téléversable', 'Ce document est lié aux informations de profil et n’a pas encore de fichier téléversable.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: allowedMimeTypes,
        copyToCacheDirectory: true,
      });

      if (result?.canceled) return;

      const asset = Array.isArray(result?.assets) ? result.assets[0] : result;
      const uri = asset?.uri;
      const name = asset?.name;
      const mimeType = inferMimeType(asset);

      if (!uri || !name) return;

      if (!allowedMimeTypes.includes(mimeType)) {
        Alert.alert('Format non autorisé', 'Choisissez un fichier PDF ou une image (JPG, PNG, WEBP).');
        return;
      }

      setBusyKey(item.key);
      await uploadAgencyDocument({
        token,
        documentType: item.uploadType,
        file: {
          uri,
          name,
          type: mimeType,
        },
      });
      await load();
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de téléverser le document');
    } finally {
      setBusyKey('');
    }
  }, [load, token]);

  const removeDocument = useCallback((doc, item) => {
    if (!doc?.id) return;
    Alert.alert(
      'Supprimer le document',
      `Voulez-vous supprimer "${item.label}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusyKey(item.key);
              await deleteDocument({ token, documentId: doc.id });
              await load();
            } catch (error) {
              Alert.alert('Erreur', error.message || 'Suppression impossible');
            } finally {
              setBusyKey('');
            }
          },
        },
      ]
    );
  }, [load, token]);

  return (
    <ImageBackground source={require('../../assets/background.png')} style={styles.background} resizeMode="cover">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.page}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('AgencyProfile', { token, user })}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>DOCUMENTS</Text>
              <Text style={styles.title}>Documents de l’agence</Text>
              <Text style={styles.subtitle}>Suivi des documents de l’entreprise</Text>
            </View>
          </View>

          {state.loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#A78BFF" />
            </View>
          ) : (
            <ScrollView
              refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={onRefresh} tintColor="#A78BFF" />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}
            >
              {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

              <AgencyCard style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Badge label={`✅ ${Number(counters.verified || 0)} vérifiés`} toneKey="green" />
                  <Badge label={`⏳ ${Number(counters.pending || 0)} en attente`} toneKey="amber" />
                  <Badge label={`⛔ ${Number(counters.rejected || 0)} rejetés`} toneKey="red" />
                </View>
              </AgencyCard>

              <SectionTitle
                title="Dossiers obligatoires"
                subtitle="Chaque document requis est affiché avec son état actuel"
              />
              <View style={styles.sectionList}>
                {companyCards.map(({ item, status, fileLabel, doc }) => (
                  <RequirementCard
                    key={item.key}
                    item={item}
                    status={status}
                    fileLabel={fileLabel}
                    doc={doc}
                    busy={busyKey === item.key}
                    onPress={() => {
                      if (doc?.documentUrl) {
                        openDocument(doc);
                        return;
                      }
                      selectAndUpload(item);
                    }}
                    onUpload={item.uploadType ? () => selectAndUpload(item) : null}
                    onView={doc?.documentUrl ? () => openDocument(doc) : null}
                    onDelete={doc?.id ? () => removeDocument(doc, item) : null}
                  />
                ))}
              </View>
            </ScrollView>
          )}
        </View>
        <AgencyBottomNavigation navigation={navigation} route={route} active="profile" />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#0D0E15' },
  safeArea: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  content: { paddingBottom: 102 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  kicker: { color: '#8E95BF', fontSize: 11, fontWeight: '900', letterSpacing: 1.3, marginBottom: 4 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900' },
  subtitle: { color: '#A5AECF', marginTop: 5, fontSize: 13, lineHeight: 18, maxWidth: '88%' },
  error: { color: '#FF8FA3', marginBottom: 12, fontWeight: '700' },
  summaryCard: { padding: 14, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 8, alignItems: 'center' },
  sectionList: { gap: 12, marginBottom: 14 },
  requirementCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 20,
    padding: 14,
    backgroundColor: 'rgba(14,15,26,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  requirementIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  requirementBody: { flex: 1, minWidth: 0 },
  requirementTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  requirementTitle: { color: '#F5F7FF', fontWeight: '900', fontSize: 15 },
  requirementSubtitle: { color: '#97A0C7', marginTop: 3, fontSize: 12, lineHeight: 17 },
  requirementDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 12,
    marginBottom: 10,
  },
  requirementFile: { color: '#DCE2FF', fontWeight: '800', fontSize: 12 },
  requirementMissing: { color: '#FFB347' },
  requirementHint: { color: '#97A0C7', fontSize: 11, marginTop: 4, lineHeight: 16 },
  ocrBlock: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ocrBlockRejected: {
    backgroundColor: 'rgba(255,23,68,0.08)',
    borderColor: 'rgba(255,23,68,0.24)',
  },
  ocrBlockVerified: {
    backgroundColor: 'rgba(0,230,118,0.08)',
    borderColor: 'rgba(0,230,118,0.24)',
  },
  ocrLabel: { color: '#DCE2FF', fontWeight: '900', fontSize: 12, marginBottom: 6 },
  ocrReason: { color: '#F5F7FF', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  ocrReasonMuted: { color: '#97A0C7', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  ocrMeta: { color: '#AAB3D6', fontSize: 11, lineHeight: 16, marginTop: 4 },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  primaryBtn: {
    backgroundColor: 'rgba(124,77,255,0.82)',
    borderColor: 'rgba(124,77,255,0.35)',
  },
  actionBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  actionBtnTextSecondary: { color: '#D9DFFF', fontWeight: '900', fontSize: 12 },
  actionBtnTextDanger: { color: '#FF8FA3', fontWeight: '900', fontSize: 12 },
  empty: { color: '#A5AECF', fontStyle: 'italic', paddingVertical: 10 },
  footerCard: { padding: 16, marginBottom: 14 },
  footerStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  footerStat: { color: '#D9DFFF', fontWeight: '800', fontSize: 12 },
  footerHint: { color: '#97A0C7', marginTop: 8, fontSize: 12, lineHeight: 18 },
});
