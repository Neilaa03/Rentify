import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/admin';
import AdminBottomNavigation from '../../components/admin/AdminBottomNavigation';

const tabs = ['Tous', 'En attente', 'Verifies', 'Rejetes'];

const norm = (v) => String(v || '').toLowerCase();

const statusLabel = (status) => {
  const s = norm(status);
  if (s.includes('approve') || s.includes('verif')) return 'Verifie';
  if (s.includes('reject')) return 'Rejete';
  if (s.includes('manual_review')) return 'En revision';
  return 'En attente';
};

const statusTone = (status) => {
  const s = norm(status);
  if (s.includes('approve') || s.includes('verif')) return styles.ok;
  if (s.includes('reject')) return styles.bad;
  if (s.includes('manual_review')) return styles.review;
  return styles.wait;
};

const isRejectedStatus = (status) => norm(status).includes('reject');

const normalizeDocUrl = (url) => {
  if (!url) return '';
  let clean = String(url).trim();
  if (!clean.startsWith('http')) clean = `https://${clean.replace(/^\/+/, '')}`;
  const withoutQuery = clean.split('?')[0];
  // Some PDF files are stored under /image/upload and fail in mobile browser.
  if (clean.includes('res.cloudinary.com') && withoutQuery.toLowerCase().endsWith('.pdf') && clean.includes('/image/upload/')) {
    return clean.replace('/image/upload/', '/raw/upload/');
  }
  return clean;
};

const buildFallbackUrls = (url) => {
  const list = [];
  const normalized = normalizeDocUrl(url);
  if (normalized) list.push(normalized);
  if (normalized.includes('res.cloudinary.com')) {
    if (normalized.includes('/image/upload/')) list.push(normalized.replace('/image/upload/', '/raw/upload/'));
    if (normalized.includes('/raw/upload/')) list.push(normalized.replace('/raw/upload/', '/image/upload/'));
  }
  return [...new Set(list)];
};

export default function AdminCarsScreen({ navigation, route }) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Tous');
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [detailsByCar, setDetailsByCar] = useState({});
  const [selectedCar, setSelectedCar] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await adminApi.cars({ search, limit: 80 });
      setCars(data.data || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const carsWithMeta = useMemo(() => {
    return (cars || []).map((c) => {
      const carStatus = norm(c.approval_status || 'pending');
      const ownerName = c.company?.company_name || `${c.owner?.first_name || ''} ${c.owner?.last_name || ''}`.trim() || 'Utilisateur inconnu';
      return {
        ...c,
        ownerName,
        carStatus,
        displayName: `${c.brand || ''} ${c.model || ''}`.trim() || 'Vehicule',
      };
    });
  }, [cars]);

  const stats = useMemo(() => {
    let pending = 0;
    let verified = 0;
    let rejected = 0;
    carsWithMeta.forEach((c) => {
      if (c.carStatus.includes('approve')) verified += 1;
      else if (c.carStatus.includes('reject')) rejected += 1;
      else pending += 1;
    });
    return { pending, verified, rejected };
  }, [carsWithMeta]);

  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = carsWithMeta.filter((c) => {
      const matchesStatus = activeTab === 'Tous'
        || (activeTab === 'En attente' && c.carStatus.includes('pending'))
        || (activeTab === 'Verifies' && c.carStatus.includes('approve'))
        || (activeTab === 'Rejetes' && c.carStatus.includes('reject'));
      const matchesSearch = !term
        || c.ownerName.toLowerCase().includes(term)
        || c.displayName.toLowerCase().includes(term)
        || String(c.registration_number || '').toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });

    const map = {};
    filtered.forEach((c) => {
      if (!map[c.ownerName]) map[c.ownerName] = { ownerName: c.ownerName, cars: [] };
      map[c.ownerName].cars.push(c);
    });

    return Object.values(map);
  }, [carsWithMeta, search, activeTab]);

  const openCarDocuments = async (car) => {
    setSelectedCar(car);
    setModalVisible(true);

    if (detailsByCar[car.id]) return;
    try {
      const details = await adminApi.carDetails(car.id);
      setDetailsByCar((prev) => ({ ...prev, [car.id]: details }));
    } catch (e) {
      Alert.alert('Erreur', e.message || 'Impossible de charger les documents');
    }
  };

  const refreshCarDetails = async (carId) => {
    const details = await adminApi.carDetails(carId);
    setDetailsByCar((prev) => ({ ...prev, [carId]: details }));
    return details;
  };

  const resolveDocs = (carId) => {
    const d = detailsByCar[carId];
    const docs = d?.documents || [];
    return docs
      .filter((doc) => !isRejectedStatus(doc.status))
      .map((doc, idx) => ({
      id: doc.id || `${carId}-${idx}`,
      type: doc.document_type || doc.type || 'Document',
      status: doc.status || 'pending',
      url: doc.document_url || doc.url || doc.file_url || doc.documentUrl || '',
      uploadedAt: doc.created_at || doc.updated_at || '',
      ocrResult: doc.ocr_result || doc.ocrResult || null,
      }));
  };

  const reviewDocument = async (documentId, status) => {
    if (!selectedCar?.id) return;

    try {
      await adminApi.updateDocument(documentId, { status });
      await refreshCarDetails(selectedCar.id);
      await load();
    } catch (e) {
      Alert.alert('Erreur', e.message || 'Mise à jour du document impossible');
    }
  };

  const openDocument = async (url) => {
    const candidates = buildFallbackUrls(url);
    if (!candidates.length) {
      Alert.alert('Document indisponible', "Ce document n'a pas de lien exploitable.");
      return;
    }

    let lastErr = null;
    for (const candidate of candidates) {
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const opened = window.open(candidate, '_blank', 'noopener,noreferrer');
          if (opened) return;
        }

        const supported = await Linking.canOpenURL(candidate);
        if (!supported) continue;
        await Linking.openURL(candidate);
        return;
      } catch (e) {
        lastErr = e;
      }
    }

    Alert.alert('Ouverture impossible', lastErr?.message || 'Le document ne peut pas etre ouvert sur cet appareil.');
  };

  const updateCarStatus = async (carId, status) => {
    try {
      await adminApi.updateCar(carId, { approvalStatus: status });
      await load();
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Erreur', e.message || 'Mise a jour impossible');
    }
  };

  const visibleDocCount = grouped.reduce((acc, g) => acc + g.cars.length, 0);
  const modalDocs = selectedCar ? resolveDocs(selectedCar.id) : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Documents</Text>

        <View style={styles.statsRow}>
          <TopStat value={stats.pending} label="En attente" tone="amber" />
          <TopStat value={stats.verified} label="Verifies" tone="green" />
          <TopStat value={stats.rejected} label="Rejetes" tone="red" />
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#8a91bf" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Type, proprietaire..." placeholderTextColor="#7078ab" style={styles.searchInput} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
          {tabs.map((tab) => (
            <TouchableOpacity key={tab} style={[styles.filterChip, activeTab === tab && styles.filterChipActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.filterText, activeTab === tab && styles.filterTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.countText}>{visibleDocCount} vehicules a verifier</Text>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!!error ? <Text style={styles.error}>{error}</Text> : null}
          {grouped.map((group) => (
            <View key={group.ownerName} style={styles.groupCard}>
              <Text style={styles.groupTitle}>{group.ownerName}</Text>
              {group.cars.map((car) => {
                const loadedDetails = detailsByCar[car.id];
                const visibleDocs = resolveDocs(car.id);
                const docsCount = visibleDocs.length;
                return (
                  <View key={car.id} style={styles.docItem}>
                    <View style={styles.docLeft}>
                      <View style={styles.docIcon}><Ionicons name="car-sport-outline" size={16} color="#a8b0e2" /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docTitle}>{car.displayName}</Text>
                        <Text style={styles.docOwner}>{car.registration_number || 'Immatriculation indisponible'}</Text>
                        <Text style={styles.docMeta}>{loadedDetails ? `${docsCount} document(s)` : 'Touchez pour charger les documents'}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                      <Text style={[styles.statusText, statusTone(car.carStatus)]}>{statusLabel(car.carStatus)}</Text>
                      <TouchableOpacity style={styles.viewBtn} onPress={() => openCarDocuments(car)}>
                        <Text style={styles.viewBtnText}>Voir docs</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
          {loading ? <Text style={styles.loading}>Chargement...</Text> : null}
        </ScrollView>
      </View>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedCar?.displayName || 'Documents'}</Text>
                <Text style={styles.modalSub}>{selectedCar?.ownerName || ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-outline" size={24} color="#dbe0ff" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              {selectedCar && !detailsByCar[selectedCar.id] ? <Text style={styles.loading}>Chargement des documents...</Text> : null}

              {selectedCar && detailsByCar[selectedCar.id] && modalDocs.length === 0 ? (
                <Text style={styles.error}>Aucun document trouve pour ce vehicule.</Text>
              ) : null}

              {modalDocs.map((doc) => (
                <View key={doc.id} style={styles.modalDocRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalDocType}>{doc.type}</Text>
                    <Text style={[styles.statusText, statusTone(doc.status)]}>{statusLabel(doc.status)}</Text>
                    <Text style={styles.modalDocDate}>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString('fr-FR') : ''}</Text>
                    {doc.ocrResult ? (
                      <View style={styles.ocrBox}>
                        <Text style={styles.ocrLabel}>OCR</Text>
                        <Text style={styles.ocrText}>
                          {doc.ocrResult.verification_reason || 'Aucune raison fournie'}
                        </Text>
                        <Text style={styles.ocrMeta}>
                          {`Statut OCR: ${statusLabel(doc.ocrResult.verification_status)}`}
                        </Text>
                        <Text style={styles.ocrMeta}>
                          {`Confiance: ${doc.ocrResult.confidence_score != null ? `${Number(doc.ocrResult.confidence_score).toFixed(1)}%` : 'N/A'}`}
                        </Text>
                        {doc.ocrResult.extracted_full_name ? <Text style={styles.ocrMeta}>{`Nom: ${doc.ocrResult.extracted_full_name}`}</Text> : null}
                        {doc.ocrResult.extracted_document_number ? <Text style={styles.ocrMeta}>{`Numero: ${doc.ocrResult.extracted_document_number}`}</Text> : null}
                        {doc.ocrResult.extracted_expiration_date ? <Text style={styles.ocrMeta}>{`Expiration: ${doc.ocrResult.extracted_expiration_date}`}</Text> : null}
                      </View>
                    ) : (
                      <Text style={styles.ocrEmpty}>Aucun resultat OCR disponible.</Text>
                    )}
                    <View style={styles.docActionsRow}>
                      <TouchableOpacity
                        style={[styles.docActionBtn, styles.docRejectBtn]}
                        onPress={() => reviewDocument(doc.id, 'rejected')}
                      >
                        <Text style={styles.docActionText}>Rejeter</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.docActionBtn, styles.docAcceptBtn]}
                        onPress={() => reviewDocument(doc.id, 'approved')}
                      >
                        <Text style={styles.docActionText}>Accepter</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.modalBtn} onPress={() => openDocument(doc.url)}>
                    <Text style={styles.modalBtnText}>Voir</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

          </View>
        </View>
      </Modal>

      <AdminBottomNavigation navigation={navigation} route={route} active="documents" />
    </SafeAreaView>
  );
}

function TopStat({ value, label, tone }) {
  const bg = tone === 'green' ? 'rgba(0,208,132,0.14)' : tone === 'red' ? 'rgba(255,77,109,0.14)' : 'rgba(255,176,32,0.14)';
  const border = tone === 'green' ? '#0f7f5d' : tone === 'red' ? '#923249' : '#8b641a';
  const color = tone === 'green' ? '#00d084' : tone === 'red' ? '#ff4d6d' : '#ffb020';
  return (
    <View style={[styles.topCard, { backgroundColor: bg, borderColor: border }]}> 
      <Text style={[styles.topValue, { color }]}>{value}</Text>
      <Text style={[styles.topLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070a1f' },
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#070a1f' },
  title: { color: '#f2f4ff', fontSize: 36, fontWeight: '800', marginTop: 10, marginBottom: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  topCard: { width: '32%', borderWidth: 1, borderRadius: 12, paddingVertical: 9, alignItems: 'center' },
  topValue: { fontSize: 22, fontWeight: '800' },
  topLabel: { fontSize: 12, marginTop: 2 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f1433', borderWidth: 1, borderColor: '#2a2f57', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  searchInput: { flex: 1, color: '#dce1ff' },
  filtersRow: { marginTop: 12, marginBottom: 8, maxHeight: 42 },
  filterChip: { backgroundColor: '#171d44', borderRadius: 99, borderWidth: 1, borderColor: '#2d3360', paddingHorizontal: 14, height: 34, justifyContent: 'center', marginRight: 8 },
  filterChipActive: { backgroundColor: '#8f7dff', borderColor: '#8f7dff' },
  filterText: { color: '#9299c8', fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  countText: { color: '#7d84b1', marginTop: 2, marginBottom: 8 },
  content: { paddingBottom: 92 },
  groupCard: { backgroundColor: '#0f1433', borderWidth: 1, borderColor: '#2b315c', borderRadius: 15, padding: 12, marginBottom: 10 },
  groupTitle: { color: '#9da7e0', fontWeight: '800', marginBottom: 8 },
  docItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#2b315c', borderRadius: 12, padding: 10, marginBottom: 8, backgroundColor: '#0b1030' },
  docLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 10 },
  docIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#1b214a', justifyContent: 'center', alignItems: 'center' },
  docTitle: { color: '#f1f4ff', fontWeight: '700' },
  docOwner: { color: '#7a82b2', fontSize: 12, marginTop: 2 },
  docMeta: { color: '#5f6798', fontSize: 11, marginTop: 2 },
  statusText: { fontWeight: '800', fontSize: 12 },
  viewBtn: { borderRadius: 8, borderWidth: 1, borderColor: '#4a5392', paddingHorizontal: 8, paddingVertical: 5 },
  viewBtnText: { color: '#d4daff', fontSize: 11, fontWeight: '700' },
  ok: { color: '#00d084' },
  bad: { color: '#ff4d6d' },
  review: { color: '#ffb020' },
  wait: { color: '#ffb020' },
  loading: { color: '#8d94c2', marginTop: 8 },
  error: { color: '#ff7f90', marginBottom: 8 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(4,7,20,0.7)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '82%', backgroundColor: '#10163a', borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, borderColor: '#2b315c', padding: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: '#f2f4ff', fontWeight: '800', fontSize: 18 },
  modalSub: { color: '#8790bf', marginTop: 2 },
  modalDocRow: { borderWidth: 1, borderColor: '#2b315c', borderRadius: 12, padding: 10, backgroundColor: '#0b1030', marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalDocType: { color: '#e9edff', fontWeight: '700', marginBottom: 4 },
  modalDocDate: { color: '#6e76a6', fontSize: 11, marginTop: 3 },
  ocrBox: { marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: '#141a43', borderWidth: 1, borderColor: '#2b315c', gap: 4 },
  ocrLabel: { color: '#cfd6ff', fontWeight: '800', fontSize: 12 },
  ocrText: { color: '#f1f4ff', fontSize: 12, lineHeight: 17 },
  ocrMeta: { color: '#aab2da', fontSize: 11, lineHeight: 16 },
  ocrEmpty: { color: '#7680b2', fontSize: 11, marginTop: 8 },
  modalBtn: { borderRadius: 8, borderWidth: 1, borderColor: '#4a5392', paddingHorizontal: 10, paddingVertical: 6 },
  modalBtnText: { color: '#dbe0ff', fontWeight: '700' },
  docActionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  docActionBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  docRejectBtn: { backgroundColor: 'rgba(255,77,109,0.16)', borderColor: '#8f3247' },
  docAcceptBtn: { backgroundColor: 'rgba(0,208,132,0.16)', borderColor: '#197c5c' },
  docActionText: { color: '#fff', fontWeight: '800' },
});
