import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/admin';
import AdminBottomNavigation from '../../components/admin/AdminBottomNavigation';
import { AdminLogoutButton, ScreenHeader } from '../../components/admin/AdminUI';
import { useTranslation } from 'react-i18next';
import { getCurrentLocale } from '../../i18n';

const ROLE_TABS = [
  { key: 'owners', roles: ['owner'] },
  { key: 'company', roles: ['companyManager'] },
  { key: 'users', roles: ['client'] },
];

const DOCUMENT_FILTERS = [
  { key: 'all', statuses: [] },
  { key: 'pending', statuses: ['PENDING'] },
  { key: 'verified', statuses: ['VERIFIED'] },
];

export default function AdminUsersScreen({ navigation, route }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [activeRole, setActiveRole] = useState('owners');
  const [activeDocumentStatus, setActiveDocumentStatus] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailsByUser, setDetailsByUser] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await adminApi.users({ search, limit: 80 });
      setRows(data.data || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openUserDocuments = async (user) => {
    setSelectedUser(user);
    setModalVisible(true);
    if (detailsByUser[user.id]) return;

    try {
      const details = await adminApi.userDetails(user.id);
      setDetailsByUser((prev) => ({ ...prev, [user.id]: details }));
    } catch (e) {
      Alert.alert(t('screens.admin.adminusersscreen.erreur'), e.message || t('screens.admin.adminusersscreen.impossibleDeChargerLesDocuments'));
    }
  };

  const resolveDocs = (userId) => {
    const docs = detailsByUser[userId]?.documents || [];
    const resolved = docs.map((doc, idx) => ({
      id: doc.id || `${userId}-${idx}`,
      type: doc.document_type || doc.type || 'Document',
      status: doc.status || 'pending',
      url: doc.document_url || doc.url || doc.file_url || doc.documentUrl || '',
      uploadedAt: doc.created_at || doc.updated_at || '',
      ocrResult: doc.ocr_result || doc.ocrResult || null,
    }));

    return resolved.sort((a, b) => {
      if (a.type === 'identity_card' && b.type !== 'identity_card') return -1;
      if (b.type === 'identity_card' && a.type !== 'identity_card') return 1;
      return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0);
    });
  };

  const formatDocType = (type, translator) => {
    switch (String(type || '').toLowerCase()) {
      case 'identity_card':
        return translator('screens.admin.adminusersscreen.identityCard');
      case 'passport':
        return translator('screens.admin.adminusersscreen.passport');
      case 'driver_license':
        return translator('screens.admin.adminusersscreen.driverLicense');
      default:
        return type || 'Document';
    }
  };

  const formatRoleLabel = (role) => {
    switch (String(role || '').toLowerCase()) {
      case 'owner':
        return t('screens.admin.adminusersscreen.roles.owner');
      case 'companymanager':
        return t('screens.admin.adminusersscreen.roles.company');
      case 'client':
        return t('screens.admin.adminusersscreen.roles.client');
      default:
        return String(role || t('screens.admin.adminusersscreen.roles.unknown'));
    }
  };

  const formatDocumentStatusLabel = (status) => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'VERIFIED') return t('screens.admin.adminusersscreen.documentStatuses.verified');
    return t('screens.admin.adminusersscreen.documentStatuses.pending');
  };

  const reviewDocument = async (documentId, status) => {
    if (!selectedUser?.id) return;

    try {
      await adminApi.updateDocument(documentId, { status });
      const details = await adminApi.userDetails(selectedUser.id);
      setDetailsByUser((prev) => ({ ...prev, [selectedUser.id]: details }));
    } catch (e) {
      Alert.alert(t('screens.admin.adminusersscreen.erreur'), e.message || t('screens.admin.adminusersscreen.miseAJourDuDocumentImpossible'));
    }
  };

  const openDocument = async (url) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert(t('screens.admin.adminusersscreen.erreur'), e.message || t('screens.admin.adminusersscreen.impossibleDouvrirLeDocument'));
    }
  };

  const list = useMemo(() => {
    let items = [...rows];
    const selectedRole = ROLE_TABS.find((f) => f.key === activeRole);
    const selectedDocumentStatus = DOCUMENT_FILTERS.find((f) => f.key === activeDocumentStatus);
    if (selectedRole?.roles?.length) {
      items = items.filter((u) => selectedRole.roles.includes(String(u.role || '').toLowerCase()));
    }
    if (selectedDocumentStatus?.statuses?.length) {
      items = items.filter((u) => selectedDocumentStatus.statuses.includes(String(u.documentStatus || 'PENDING').toUpperCase()));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((u) => (`${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(q) || String(u.email || '').toLowerCase().includes(q)));
    }
    return items;
  }, [rows, search, activeRole, activeDocumentStatus]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
          <ScreenHeader title={t('screens.admin.adminusersscreen.comptesUtilisateurs')} rightAction={<AdminLogoutButton navigation={navigation} />} />

          <View style={styles.sectionToggleRow}>
            {ROLE_TABS.map((tab) => (
              <TouchableOpacity key={tab.key} style={[styles.sectionToggle, activeRole === tab.key && styles.sectionToggleActive]} onPress={() => setActiveRole(tab.key)}>
                <Text style={[styles.sectionToggleText, activeRole === tab.key && styles.sectionToggleTextActive]}>
                  {t(`screens.admin.adminusersscreen.roles.${tab.key}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color="#8a91bf" />
            <TextInput value={search} onChangeText={setSearch} placeholder={t('screens.admin.adminusersscreen.rechercher')} placeholderTextColor="#7078ab" style={styles.searchInput} />
          </View>

          <Text style={styles.sectionLabel}>{t('screens.admin.adminusersscreen.sections.documents')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            persistentScrollbar={false}
            style={styles.filtersRow}
            contentContainerStyle={styles.filtersRowContent}
          >
            {DOCUMENT_FILTERS.map((f) => (
              <TouchableOpacity key={f.key} style={[styles.filterChip, activeDocumentStatus === f.key && styles.filterChipActive]} onPress={() => setActiveDocumentStatus(f.key)}>
                <Text style={[styles.filterText, activeDocumentStatus === f.key && styles.filterTextActive]}>{t(`screens.admin.adminusersscreen.documentStatuses.${f.key}`)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.countText}>{list.length} {t('screens.admin.adminusersscreen.comptes')}</Text>

          {!!error ? <Text style={styles.error}>{error}</Text> : null}
          {list.map((u) => {
            const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
            const initials = (u.first_name?.[0] || u.email?.[0] || 'U').toUpperCase() + (u.last_name?.[0] || '').toUpperCase();
            const documentStatus = String(u.documentStatus || 'PENDING').toUpperCase();
            return (
              <View key={u.id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.initials}><Text style={styles.initialsText}>{initials}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{fullName}</Text>
                    <Text style={styles.userEmail}>{u.email}</Text>
                    <View style={styles.userTags}>
                      <Text style={styles.roleTag}>{formatRoleLabel(u.role)}</Text>
                      <Text style={[styles.documentTag, documentStatus === 'VERIFIED' ? styles.documentTagVerified : styles.documentTagPending]}>
                        {formatDocumentStatusLabel(documentStatus)}
                      </Text>
                      <Text style={styles.documentCountTag}>
                        {u.documentCount || 0} {t('screens.admin.adminusersscreen.documents')}
                      </Text>
                      <Text style={styles.dateTag}>{u.created_at ? new Date(u.created_at).toLocaleDateString(getCurrentLocale()) : ''}</Text>
                    </View>
                    <TouchableOpacity style={styles.docsBtn} onPress={() => openUserDocuments(u)}>
                      <Text style={styles.docsBtnText}>{t('screens.admin.adminusersscreen.voirDocs')}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={[styles.statusBadge, { backgroundColor: u.is_active ? 'rgba(0,208,132,0.2)' : 'rgba(255,176,32,0.2)' }]} onPress={async () => { await adminApi.updateUser(u.id, { isActive: !u.is_active }); load(); }}>
                    <Text style={[styles.statusText, { color: u.is_active ? '#00d084' : '#ffb020' }]}>{u.is_active ? t('screens.admin.adminusersscreen.active') : t('screens.admin.adminusersscreen.inactive')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          {loading ? <Text style={styles.loading}>{t('screens.admin.adminusersscreen.chargement')}</Text> : null}
        </ScrollView>
      </View>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedUser ? `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.email : 'Documents'}</Text>
                <Text style={styles.modalSub}>
                  {selectedUser ? `${formatRoleLabel(selectedUser.role)} · ${selectedUser.documentStatus ? formatDocumentStatusLabel(selectedUser.documentStatus) : t('screens.admin.adminusersscreen.documentStatuses.pending')}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-outline" size={24} color="#dbe0ff" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              {selectedUser && !detailsByUser[selectedUser.id] ? <Text style={styles.loading}>{t('screens.admin.adminusersscreen.chargementDesDocuments')}</Text> : null}

              {selectedUser && detailsByUser[selectedUser.id] && resolveDocs(selectedUser.id).length === 0 ? (
                <Text style={styles.error}>{t('screens.admin.adminusersscreen.aucunDocumentTrouvePourCetUtilisateur')}</Text>
              ) : null}

              {resolveDocs(selectedUser?.id).map((doc) => (
                <View key={doc.id} style={styles.docRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.docTypeRow}>
                      <Text style={styles.docType}>{formatDocType(doc.type, t)}</Text>
                      {String(doc.type || '').toLowerCase() === 'identity_card' ? (
                        <Text style={styles.identityBadge}>{t('screens.admin.adminusersscreen.identityDocument')}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.docDate}>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString(getCurrentLocale()) : ''}</Text>
                    <Text style={[styles.docStatus, doc.status === 'approved' ? styles.docStatusOk : doc.status === 'rejected' ? styles.docStatusBad : styles.docStatusWait]}>
                      {doc.status === 'approved' ? t('screens.admin.adminusersscreen.documentReviewStatus.approved') : doc.status === 'rejected' ? t('screens.admin.adminusersscreen.documentReviewStatus.rejected') : t('screens.admin.adminusersscreen.documentReviewStatus.pending')}
                    </Text>
                  </View>
                  <View style={styles.docActions}>
                    <TouchableOpacity style={styles.viewDocBtn} onPress={() => openDocument(doc.url)}>
                      <Text style={styles.viewDocText}>{t('screens.admin.adminusersscreen.voir')}</Text>
                    </TouchableOpacity>
                    {doc.status === 'approved' ? (
                      <TouchableOpacity style={styles.toggleBtn} onPress={() => reviewDocument(doc.id, 'rejected')}>
                        <Text style={styles.toggleText}>{t('screens.admin.adminusersscreen.rejeter')}</Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => reviewDocument(doc.id, 'rejected')}>
                          <Text style={styles.toggleText}>{t('screens.admin.adminusersscreen.rejeter')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.acceptBtn} onPress={() => reviewDocument(doc.id, 'approved')}>
                          <Text style={styles.toggleText}>{t('screens.admin.adminusersscreen.accepter')}</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AdminBottomNavigation navigation={navigation} route={route} active="users" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070a1f' },
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#070a1f' },
  pageScroll: { flex: 1 },
  pageContent: { paddingBottom: 92 },
  title: { color: '#f2f4ff', fontSize: 36, fontWeight: '800', marginTop: 10, marginBottom: 14 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f1433', borderWidth: 1, borderColor: '#2a2f57', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7, minHeight: 42 },
  searchInput: { flex: 1, color: '#dce1ff' },
  sectionToggleRow: { flexDirection: 'row', backgroundColor: '#11163a', borderRadius: 16, padding: 4, borderWidth: 1, borderColor: '#2b315c', marginTop: 10, marginBottom: 10 },
  sectionToggle: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  sectionToggleActive: { backgroundColor: '#8f7dff' },
  sectionToggleText: { color: '#98a0cd', fontWeight: '800', fontSize: 13 },
  sectionToggleTextActive: { color: '#fff' },
  filtersRow: { marginTop: 4, marginBottom: 12, scrollbarWidth: 'thin' },
  filtersRowContent: { paddingVertical: 6, paddingRight: 8 },
  sectionLabel: { color: '#aab1dd', marginTop: 2, marginBottom: 2, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  filterChip: { backgroundColor: '#171d44', borderRadius: 99, borderWidth: 1, borderColor: '#2d3360', paddingHorizontal: 14, height: 34, justifyContent: 'center', marginRight: 8 },
  filterChipActive: { backgroundColor: '#8f7dff', borderColor: '#8f7dff' },
  filterText: { color: '#9299c8', fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  countText: { color: '#7d84b1', marginTop: 2, marginBottom: 8 },
  content: { paddingTop: 0 },
  userCard: { backgroundColor: '#0f1433', borderWidth: 1, borderColor: '#2b315c', borderRadius: 15, padding: 12, marginBottom: 10 },
  userHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  initials: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#8f9dff', justifyContent: 'center', alignItems: 'center' },
  initialsText: { color: '#fff', fontWeight: '800' },
  userName: { color: '#f1f4ff', fontWeight: '800', fontSize: 16 },
  userEmail: { color: '#7980ae', marginTop: 2, fontSize: 12 },
  userTags: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  docsBtn: { marginTop: 8, alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, borderColor: '#4a5392', paddingHorizontal: 10, paddingVertical: 5 },
  docsBtnText: { color: '#d4daff', fontSize: 11, fontWeight: '700' },
  roleTag: { color: '#00d084', backgroundColor: 'rgba(0,208,132,0.18)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, fontWeight: '700', fontSize: 11, textTransform: 'capitalize' },
  documentTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, fontWeight: '700', fontSize: 11 },
  documentTagVerified: { color: '#00d084', backgroundColor: 'rgba(0,208,132,0.18)' },
  documentTagPending: { color: '#ffb020', backgroundColor: 'rgba(255,176,32,0.18)' },
  documentCountTag: { color: '#92a0d7', backgroundColor: 'rgba(146,160,215,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, fontWeight: '700', fontSize: 11 },
  dateTag: { color: '#7e85b2', fontSize: 11 },
  statusBadge: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontWeight: '700', fontSize: 11 },
  loading: { color: '#8d94c2', marginTop: 8 },
  error: { color: '#ff7f90', marginBottom: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(4,7,20,0.7)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '82%', backgroundColor: '#10163a', borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, borderColor: '#2b315c', padding: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: '#f2f4ff', fontWeight: '800', fontSize: 18 },
  modalSub: { color: '#8790bf', marginTop: 2 },
  docRow: { borderWidth: 1, borderColor: '#2b315c', borderRadius: 12, padding: 10, backgroundColor: '#0b1030', marginBottom: 8 },
  docTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  docType: { color: '#e9edff', fontWeight: '700' },
  identityBadge: { color: '#8f7dff', backgroundColor: 'rgba(143,125,255,0.14)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, fontSize: 10, fontWeight: '800' },
  docDate: { color: '#6e76a6', fontSize: 11, marginTop: 3 },
  docStatus: { marginTop: 6, fontWeight: '800', fontSize: 12 },
  docStatusOk: { color: '#00d084' },
  docStatusBad: { color: '#ff4d6d' },
  docStatusWait: { color: '#ffb020' },
  docActions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  viewDocBtn: { borderRadius: 8, borderWidth: 1, borderColor: '#4a5392', paddingHorizontal: 10, paddingVertical: 6 },
  viewDocText: { color: '#dbe0ff', fontWeight: '700', fontSize: 11 },
  toggleBtn: { borderRadius: 8, borderWidth: 1, borderColor: '#8f9dff', backgroundColor: 'rgba(143,157,255,0.16)', paddingHorizontal: 10, paddingVertical: 6 },
  rejectBtn: { borderRadius: 8, borderWidth: 1, borderColor: '#8f3247', backgroundColor: 'rgba(255,77,109,0.16)', paddingHorizontal: 10, paddingVertical: 6 },
  acceptBtn: { borderRadius: 8, borderWidth: 1, borderColor: '#197c5c', backgroundColor: 'rgba(0,208,132,0.16)', paddingHorizontal: 10, paddingVertical: 6 },
  toggleText: { color: '#fff', fontWeight: '700', fontSize: 11 },
});
