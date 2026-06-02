import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Linking, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import AgencyBottomNavigation from '../../components/navigation/AgencyBottomNavigation';
import { AgencyCard, Badge, SectionTitle } from '../../components/agency/AgencyPrimitives';
import { getAgencyDocuments } from '../../services/agency';
import { deleteDocument, uploadDocument } from '../../services/owner';import { useTranslation } from "react-i18next";

const requiredCompanyDocs = [
{
  key: 'business_registration',
  label: 'Registre de commerce',
  subtitle: 'Document légal de l’entreprise',
  icon: 'business-outline',
  uploadType: 'business_registration'
},
{
  key: 'nif',
  label: 'NIF / NIS',
  subtitle: 'Numéro fiscal de l’agence',
  icon: 'hash-outline',
  uploadType: 'nif'
},
{
  key: 'manager_identity',
  label: "Carte d'identité du gérant",
  subtitle: 'Identité du responsable légal',
  icon: 'person-outline',
  uploadType: 'identity_card'
},
{
  key: 'professional_insurance',
  label: 'Assurance professionnelle',
  subtitle: 'Couverture légale de l’activité',
  icon: 'shield-checkmark-outline',
  uploadType: 'professional_insurance'
}];


const statusMeta = {
  VERIFIED: { label: 'Vérifié', tone: 'green', icon: 'checkmark-circle-outline' },
  REJECTED: { label: 'Rejeté', tone: 'red', icon: 'close-circle-outline' },
  PENDING: { label: 'En vérification', tone: 'amber', icon: 'time-outline' },
  MISSING: { label: 'Manquant', tone: 'neutral', icon: 'alert-circle-outline' }
};

const getStatusMeta = (status) => statusMeta[status] || statusMeta.MISSING;

const normalize = (value) => String(value || '').trim();

const pickDocument = (documents, { type, companyId, userId, carId }) =>
(documents || []).find((doc) => {
  if (doc.documentType !== type) return false;
  if (userId) return doc.userId === userId;
  if (companyId) return doc.companyId === companyId;
  if (carId) return doc.carId === carId;
  return true;
}) || null;

const buildDocStatus = (doc, fallback = null) => {
  if (!doc) return fallback || 'MISSING';
  const normalized = String(doc.status || '').toUpperCase();
  if (normalized === 'VERIFIED' || normalized === 'APPROVED') return 'VERIFIED';
  if (normalized === 'REJECTED') return 'REJECTED';
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
  const explicit = String(file?.mimeType || file?.type || '').toLowerCase();
  if (allowedMimeTypes.includes(explicit)) return explicit;
  const source = String(file?.name || file?.uri || '').toLowerCase();
  if (source.endsWith('.pdf')) return 'application/pdf';
  if (source.endsWith('.png')) return 'image/png';
  if (source.endsWith('.webp')) return 'image/webp';
  if (source.endsWith('.jpg') || source.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
};

const buildFallbackName = (documentType, mimeType) => {
  if (mimeType === 'application/pdf') return `${documentType}.pdf`;
  if (mimeType === 'image/png') return `${documentType}.png`;
  if (mimeType === 'image/webp') return `${documentType}.webp`;
  return `${documentType}.jpg`;
};

const RequirementCard = ({ item, status, fileLabel, doc, busy = false, onPress, onUpload, onView, onDelete }) => {const { t } = useTranslation();
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
          {status === 'VERIFIED' ?
          'Document vérifié et verrouillé' :
          status === 'REJECTED' ?
          'Document refusé, une nouvelle version est attendue' :
          status === 'PENDING' ?
          'Document soumis, en attente de vérification' :
          'Document obligatoire non soumis'}
        </Text>

        {hasOcr ?
        <View style={[styles.ocrBlock, status === 'REJECTED' && styles.ocrBlockRejected, status === 'VERIFIED' && styles.ocrBlockVerified]}>
            <Text style={styles.ocrLabel}>
              {status === 'VERIFIED' ? 'Document vérifié' : status === 'REJECTED' ? t("screens.client.profilescreen.documentRejete") : 'Contrôle OCR'}
            </Text>
            {ocrReason ? <Text style={styles.ocrReason}>{ocrReason}</Text> : <Text style={styles.ocrReasonMuted}>{t("screens.agency.agencydocumentsscreen.aucuneRaisonFournie")}</Text>}
            <Text style={styles.ocrMeta}>{`Statut OCR: ${ocrStatus || 'N/A'}`}</Text>
            <Text style={styles.ocrMeta}>{`Confiance: ${ocrConfidence != null ? `${Number(ocrConfidence).toFixed(1)}%` : 'N/A'}`}</Text>
            {reviewedAt ? <Text style={styles.ocrMeta}>{`Révisé le: ${reviewedAt}`}</Text> : null}
          </View> :
        null}

        {canUpload || canView || canDelete ?
        <View style={styles.actionRow}>
            {canUpload ?
          <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn, busy && styles.actionBtnDisabled]} onPress={onUpload} disabled={busy}>
                {busy ?
            <ActivityIndicator size="small" color="#fff" /> :

            <Ionicons name={status === 'MISSING' ? 'cloud-upload-outline' : 'create-outline'} size={14} color="#fff" />
            }
                <Text style={[styles.actionBtnText, busy && styles.actionBtnTextDisabled]}>{status === 'MISSING' ? 'Téléverser' : t("screens.owner.reservationdetailsscreen.mettreAJour")}</Text>
              </TouchableOpacity> :
          null}
            {canView ?
          <TouchableOpacity style={[styles.actionBtn, busy && styles.actionBtnDisabled]} onPress={handleView} disabled={busy}>
                <Ionicons name="eye-outline" size={14} color="#D9DFFF" />
                <Text style={[styles.actionBtnTextSecondary, busy && styles.actionBtnTextDisabled]}>{t("screens.agency.agencydocumentsscreen.voir")}</Text>
              </TouchableOpacity> :
          null}
            {canDelete ?
          <TouchableOpacity style={[styles.actionBtn, busy && styles.actionBtnDisabled]} onPress={onDelete} disabled={busy}>
                <Ionicons name="trash-outline" size={14} color="#FF8FA3" />
                <Text style={[styles.actionBtnTextDanger, busy && styles.actionBtnTextDisabled]}>{t("screens.agency.agencydocumentsscreen.supprimer")}</Text>
              </TouchableOpacity> :
          null}
          </View> :
        null}
      </View>
    </TouchableOpacity>);

};

export default function AgencyDocumentsScreen({ navigation, route }) {const { t } = useTranslation();
  const token = route?.params?.token;
  const user = route?.params?.user;

  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    error: '',
    data: null
  });
  const [busyKey, setBusyKey] = useState('');
  const [, setStagedDocuments] = useState({});

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
    const lookup = item.uploadType === 'identity_card' ?
    { type: item.uploadType, userId: managerId, companyId: null, carId: null } :
    { type: item.uploadType, companyId: agency.id, userId: null, carId: null };

    const doc = pickDocument(agencyDocs, lookup) || pickDocument(agencyDocs, {
      type: item.key,
      companyId: item.uploadType === 'identity_card' ? null : agency.id,
      userId: item.uploadType === 'identity_card' ? managerId : null,
      carId: null
    });
    const status = buildDocStatus(doc);

    const fileLabel = doc?.documentUrl ?
    doc.documentUrl.split('/').pop() :
    '';

    return { item, status, fileLabel, doc };
  }), [agency.id, agencyDocs, managerId]);

  const openDocument = useCallback(async (doc) => {
    if (!doc?.documentUrl) return;
    try {
      await Linking.openURL(doc.documentUrl);
    } catch (error) {
      Alert.alert(t("screens.agency.agencydocumentsscreen.erreur"), error.message || 'Impossible d’ouvrir le document');
    }
  }, []);

  const selectAndUpload = useCallback(async (item) => {
    if (!item.uploadType) {
      Alert.alert(t("screens.agency.agencydocumentsscreen.documentNonTeleversable"), t("screens.agency.agencydocumentsscreen.ceDocumentEstLieAuxInformationsDe"));
      return;
    }
    if (item.uploadType === 'identity_card' && !managerId) {
      Alert.alert(t("screens.agency.agencydocumentsscreen.erreur"), t("screens.agency.agencydocumentsscreen.idUtilisateurManquantVeuillezVousReconnecter"));
      return;
    }

    if (!agency?.id && item.uploadType !== 'identity_card') {
      Alert.alert(t("screens.agency.agencydocumentsscreen.erreur"), t("screens.agency.agencydocumentsscreen.idAgenceManquantVeuillezReessayer"));
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: allowedMimeTypes,
        copyToCacheDirectory: true
      });

      if (result?.canceled) return;

      const asset = Array.isArray(result?.assets) ? result.assets[0] : result;
      const uri = asset?.uri;
      let mimeType = asset?.mimeType || asset?.type || 'application/octet-stream';
      mimeType = String(mimeType).toLowerCase().trim();
      const name = asset?.name || buildFallbackName(item.uploadType, mimeType);

      if (!uri) return;

      if (!allowedMimeTypes.includes(mimeType)) {
        Alert.alert(t("screens.agency.agencydocumentsscreen.formatNonAutorise"), t("screens.agency.agencydocumentsscreen.choisissezUnFichierPdfOuUneImage"));
        return;
      }

      const staged = {
        uri,
        name,
        mimeType,
        file: asset?.file || null
      };

      setStagedDocuments((prev) => ({ ...prev, [item.key]: staged }));
      setBusyKey(item.key);

      console.log('Starting upload with:', {
        documentType: item.uploadType,
        userId: item.uploadType === 'identity_card' ? managerId : undefined,
        companyId: item.uploadType === 'identity_card' ? undefined : agency.id
      });

      await uploadDocument({
        token,
        documentType: item.uploadType,
        file: {
          uri: staged.uri,
          name: staged.name,
          type: staged.mimeType,
          file: staged.file
        },
        ownerKey: item.uploadType === 'identity_card' ? 'userId' : 'companyId',
        ownerValue: item.uploadType === 'identity_card' ? managerId : agency.id
      });

      console.log('Upload completed, reloading documents');
      await load();
    } catch (error) {
      console.error('Document upload error:', error);
      const errorMessage = error?.message || error?.error || JSON.stringify(error) || 'Impossible de téléverser le document';
      Alert.alert(t("screens.agency.agencydocumentsscreen.erreur"), errorMessage);
    } finally {
      setStagedDocuments((prev) => {
        const updated = { ...prev };
        delete updated[item.key];
        return updated;
      });
      setBusyKey('');
    }
  }, [agency.id, load, managerId, token]);

  const removeDocument = useCallback((doc, item) => {
    if (!doc?.id) return;
    Alert.alert(t("screens.agency.agencydocumentsscreen.supprimerLeDocument"),

    `Voulez-vous supprimer "${item.label}" ?`,
    [
    { text: t("screens.agency.agencyprofilescreen.annuler"), style: 'cancel' },
    {
      text: t("screens.agency.agencydocumentsscreen.supprimer"),
      style: 'destructive',
      onPress: async () => {
        try {
          setBusyKey(item.key);
          await deleteDocument({ token, documentId: doc.id });
          await load();
        } catch (error) {
          Alert.alert(t("screens.agency.agencydocumentsscreen.erreur"), error.message || 'Suppression impossible');
        } finally {
          setBusyKey('');
        }
      }
    }]

    );
  }, [load, token]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="#0a0c24" />
      <ImageBackground source={require('../../assets/background.png')} style={styles.background} resizeMode="cover" blurRadius={2}>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
          <View style={styles.overlay}>
          <View style={styles.page}>
          <View style={styles.headerSpacer} />

          {state.loading ?
              <View style={styles.centered}>
              <ActivityIndicator size="large" color="#A78BFF" />
            </View> :

              <ScrollView
                refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={onRefresh} tintColor="#A78BFF" />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}>
                
              <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('AgencyProfile', { token, user })}>
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kicker}>{t("screens.agency.agencydocumentsscreen.documents")}</Text>
                  <Text style={styles.title}>{t("screens.agency.agencydocumentsscreen.documentsDeLagence")}</Text>
                  <Text style={styles.subtitle}>{t("screens.agency.agencydocumentsscreen.suiviDesDocumentsDeLentreprise")}</Text>
                </View>
              </View>

              {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

              <SectionTitle
                  title={t("screens.agency.agencydocumentsscreen.dossiersObligatoires")}
                  subtitle={t("screens.agency.agencydocumentsscreen.chaqueDocumentRequisEstAfficheAvecSon")} />
                
              <View style={styles.sectionList}>
                {companyCards.map(({ item, status, fileLabel, doc }) =>
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
                    onDelete={doc?.id ? () => removeDocument(doc, item) : null} />

                  )}
              </View>
            </ScrollView>
              }
          </View>
          </View>
          <AgencyBottomNavigation navigation={navigation} route={route} active="profile" />
        </SafeAreaView>
      </ImageBackground>
    </View>);

}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0c24' },
  background: { flex: 1, backgroundColor: '#0a0c24' },
  safeArea: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(2,3,14,0.58)' },
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  content: { paddingBottom: 102 },
  headerSpacer: { height: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
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
    borderColor: 'rgba(255,255,255,0.08)'
  },
  requirementIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)'
  },
  requirementBody: { flex: 1, minWidth: 0 },
  requirementTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  requirementTitle: { color: '#F5F7FF', fontWeight: '900', fontSize: 15 },
  requirementSubtitle: { color: '#97A0C7', marginTop: 3, fontSize: 12, lineHeight: 17 },
  requirementDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 12,
    marginBottom: 10
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
    borderColor: 'rgba(255,255,255,0.08)'
  },
  ocrBlockRejected: {
    backgroundColor: 'rgba(255,23,68,0.08)',
    borderColor: 'rgba(255,23,68,0.24)'
  },
  ocrBlockVerified: {
    backgroundColor: 'rgba(0,230,118,0.08)',
    borderColor: 'rgba(0,230,118,0.24)'
  },
  ocrLabel: { color: '#DCE2FF', fontWeight: '900', fontSize: 12, marginBottom: 6 },
  ocrReason: { color: '#F5F7FF', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  ocrReasonMuted: { color: '#97A0C7', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  ocrMeta: { color: '#AAB3D6', fontSize: 11, lineHeight: 16, marginTop: 4 },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12
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
    borderColor: 'rgba(255,255,255,0.08)'
  },
  primaryBtn: {
    backgroundColor: 'rgba(124,77,255,0.82)',
    borderColor: 'rgba(124,77,255,0.35)'
  },
  actionBtnDisabled: {
    opacity: 0.5
  },
  actionBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  actionBtnTextSecondary: { color: '#D9DFFF', fontWeight: '900', fontSize: 12 },
  actionBtnTextDanger: { color: '#FF8FA3', fontWeight: '900', fontSize: 12 },
  actionBtnTextDisabled: { opacity: 0.6 },
  empty: { color: '#A5AECF', fontStyle: 'italic', paddingVertical: 10 },
  footerCard: { padding: 16, marginBottom: 14 },
  footerStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  footerStat: { color: '#D9DFFF', fontWeight: '800', fontSize: 12 },
  footerHint: { color: '#97A0C7', marginTop: 8, fontSize: 12, lineHeight: 18 }
});