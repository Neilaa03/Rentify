import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/admin';
import AdminBottomNavigation from '../../components/admin/AdminBottomNavigation';
import { AdminLogoutButton, ScreenHeader } from '../../components/admin/AdminUI';
import { useTranslation } from 'react-i18next';
import { getCurrentLocale } from '../../i18n';
import AppBackground from '../../components/layout/AppBackground';

const tabs = ['All', 'Pending', 'Verified'];

const norm = (v) => String(v || '').toLowerCase();

const statusLabel = (status) => {
  const s = norm(status);
  if (s.includes('approve') || s.includes('verif')) return 'Verified';
  if (s.includes('manual_review')) return 'Under review';
  return 'Pending';
};

const statusTone = (status) => {
  const s = norm(status);
  if (s.includes('approve') || s.includes('verif')) return styles.ok;
  if (s.includes('manual_review')) return styles.review;
  return styles.wait;
};

const isVerifiedDocument = (status) => {
  const s = norm(status);
  return s.includes('approve') || s.includes('verif');
};

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
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('owners');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [cars, setCars] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agenciesLoading, setAgenciesLoading] = useState(true);
  const [error, setError] = useState('');
  const [agenciesError, setAgenciesError] = useState('');

  const [detailsByCar, setDetailsByCar] = useState({});
  const [selectedCar, setSelectedCar] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [reviewingDocId, setReviewingDocId] = useState(null);
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [agencyModalVisible, setAgencyModalVisible] = useState(false);
  const [reviewingAgencyDocId, setReviewingAgencyDocId] = useState(null);

  const load = async () => {
    setLoading(true);
    setAgenciesLoading(true);

    const [carsResult, agenciesResult] = await Promise.allSettled([
      adminApi.cars({ search: '', limit: 80 }),
      adminApi.agencyDocuments(),
    ]);

    if (carsResult.status === 'fulfilled') {
      setCars(carsResult.value.data || []);
      setError('');
    } else {
      setError(carsResult.reason?.message || t('screens.admin.admincarsscreen.impossibleDeChargerLesDocuments'));
    }

    if (agenciesResult.status === 'fulfilled') {
      setAgencies(agenciesResult.value.data || []);
      setAgenciesError('');
    } else {
      setAgenciesError(agenciesResult.reason?.message || t('screens.admin.admincarsscreen.impossibleDeChargerLesDocuments'));
    }

    setLoading(false);
    setAgenciesLoading(false);
    return {
      cars: carsResult.status === 'fulfilled' ? carsResult.value.data || [] : [],
      agencies: agenciesResult.status === 'fulfilled' ? agenciesResult.value.data || [] : [],
    };
  };

  useEffect(() => { load(); }, []);

  const carsWithMeta = useMemo(() => {
    return (cars || []).map((c) => {
      const carStatus = norm(c.documentStatus || c.approval_status || 'pending');
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
    carsWithMeta.forEach((c) => {
      if (c.carStatus.includes('approve')) verified += 1;
      else pending += 1;
    });
    return { pending, verified };
  }, [carsWithMeta]);

  const agenciesWithMeta = useMemo(() => {
    return (agencies || []).map((row) => {
      const companyDocuments = Array.isArray(row.companyDocuments) ? row.companyDocuments : [];
      const managerDocuments = Array.isArray(row.managerDocuments) ? row.managerDocuments : [];
      const allDocs = [...companyDocuments, ...managerDocuments];
      const pending = allDocs.filter((doc) => {
        const s = norm(doc.status);
        return !s.includes('approve') && !s.includes('verif');
      }).length;
      const agencyStatus = pending > 0 ? 'pending' : 'approve';
      return {
        ...row,
        companyDocuments,
        managerDocuments,
        allDocs,
        pending,
        agencyStatus,
        agencyName: row?.agency?.companyName || 'Agence',
        managerName: row?.agency?.managerName || 'Gérant',
        registrationNumber: row?.agency?.registrationNumber || '',
      };
    });
  }, [agencies]);

  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = carsWithMeta.filter((c) => {
      const matchesStatus = activeTab === 'All'
        || (activeTab === 'Pending' && c.carStatus.includes('pending'))
        || (activeTab === 'Verified' && c.carStatus.includes('approve'));
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

  const filteredAgencies = useMemo(() => {
    const term = search.trim().toLowerCase();
    return agenciesWithMeta.filter((agency) => {
      const matchesStatus = activeTab === 'All'
        || (activeTab === 'Pending' && agency.agencyStatus.includes('pending'))
        || (activeTab === 'Verified' && agency.agencyStatus.includes('approve'));
      const matchesSearch = !term
        || agency.agencyName.toLowerCase().includes(term)
        || agency.managerName.toLowerCase().includes(term)
        || String(agency.registrationNumber || '').toLowerCase().includes(term)
        || String(agency.agency?.companyEmail || '').toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [agenciesWithMeta, search, activeTab]);

  const agencyStats = useMemo(() => {
    let pending = 0;
    let verified = 0;
    agenciesWithMeta.forEach((agency) => {
      if (agency.agencyStatus.includes('approve')) verified += 1;
      else pending += 1;
    });
    return { pending, verified };
  }, [agenciesWithMeta]);

  const openCarDocuments = async (car) => {
    setSelectedCar(car);
    setModalVisible(true);
    setReviewingDocId(null);

    if (detailsByCar[car.id]) return;
    try {
      const details = await adminApi.carDetails(car.id);
      setDetailsByCar((prev) => ({ ...prev, [car.id]: details }));
    } catch (e) {
      Alert.alert(t('screens.admin.admincarsscreen.erreur'), e.message || t('screens.admin.admincarsscreen.impossibleDeChargerLesDocuments'));
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
    return docs.map((doc, idx) => ({
      id: doc.id || `${carId}-${idx}`,
      type: doc.document_type || doc.type || 'Document',
      status: doc.status || 'pending',
      url: doc.document_url || doc.url || doc.file_url || doc.documentUrl || '',
      uploadedAt: doc.created_at || doc.updated_at || '',
      ocrResult: doc.ocr_result || doc.ocrResult || null,
    })).filter((doc) => norm(doc.status) !== 'rejected');
  };

  const reviewDocument = async (documentId, status) => {
    if (!selectedCar?.id) return;

    try {
      await adminApi.updateDocument(documentId, { status });
      setReviewingDocId(null);
      await refreshCarDetails(selectedCar.id);
      await load();
    } catch (e) {
      Alert.alert(t('screens.admin.admincarsscreen.erreur'), e.message || t('screens.admin.admincarsscreen.miseAJourDuDocumentImpossible'));
    }
  };

  const openAgencyDocuments = (agency) => {
    setSelectedAgency(agency);
    setAgencyModalVisible(true);
    setReviewingAgencyDocId(null);
  };

  const reviewAgencyDocument = async (documentId, status) => {
    if (!selectedAgency?.agency?.id) return;

    try {
      await adminApi.updateDocument(documentId, { status });
      setReviewingAgencyDocId(null);
      const refreshed = await load();
      const current = (refreshed?.agencies || []).find((row) => row?.agency?.id === selectedAgency?.agency?.id);
      if (current) setSelectedAgency(current);
    } catch (e) {
      Alert.alert(t('screens.admin.admincarsscreen.erreur'), e.message || t('screens.admin.admincarsscreen.miseAJourDuDocumentImpossible'));
    }
  };

  const openDocument = async (url) => {
    const candidates = buildFallbackUrls(url);
    if (!candidates.length) {
      Alert.alert(t('screens.admin.admincarsscreen.documentIndisponible'), t('screens.admin.admincarsscreen.ceDocumentNaPasDeLienExploitable'));
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

    Alert.alert(t('screens.admin.admincarsscreen.ouvertureImpossible'), lastErr?.message || t('screens.admin.admincarsscreen.leDocumentNePeutPasEtreOuvert'));
  };

  const updateCarStatus = async (carId, status) => {
    try {
      await adminApi.updateCar(carId, { approvalStatus: status });
      await load();
      setModalVisible(false);
    } catch (e) {
      Alert.alert(t('screens.admin.admincarsscreen.erreur'), e.message || t('screens.admin.admincarsscreen.miseAJourImpossible'));
    }
  };

  const visibleDocCount = activeSection === 'owners'
    ? grouped.reduce((acc, g) => acc + g.cars.length, 0)
    : filteredAgencies.length;
  const modalDocs = selectedCar ? resolveDocs(selectedCar.id) : [];
  const agencyModalDocs = selectedAgency
    ? [...selectedAgency.companyDocuments, ...selectedAgency.managerDocuments].filter((doc) => norm(doc.status) !== 'rejected')
    : [];
  const sectionStats = activeSection === 'owners' ? stats : agencyStats;
  const sectionError = activeSection === 'owners' ? error : agenciesError;

  return (
    <AppBackground contentStyle={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
          <ScreenHeader title={t('screens.admin.admincarsscreen.documents')} rightAction={<AdminLogoutButton navigation={navigation} />} />

          <View style={styles.sectionToggleRow}>
            <TouchableOpacity style={[styles.sectionToggle, activeSection === 'owners' && styles.sectionToggleActive]} onPress={() => { setActiveSection('owners'); setActiveTab('All'); }}>
              <Text style={[styles.sectionToggleText, activeSection === 'owners' && styles.sectionToggleTextActive]}>
                {t('screens.admin.admincarsscreen.sections.owners', { defaultValue: 'Owners' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sectionToggle, activeSection === 'agencies' && styles.sectionToggleActive]} onPress={() => { setActiveSection('agencies'); setActiveTab('All'); }}>
              <Text style={[styles.sectionToggleText, activeSection === 'agencies' && styles.sectionToggleTextActive]}>
                {t('screens.admin.admincarsscreen.sections.agencies', { defaultValue: 'Agencies' })}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <TopStat value={sectionStats.pending} label={t('screens.admin.admincarsscreen.pending', { defaultValue: 'Pending' })} tone="amber" icon="time-outline" />
            <TopStat value={sectionStats.verified} label={t('screens.admin.admincarsscreen.verified', { defaultValue: 'Verified' })} tone="green" icon="checkmark-circle-outline" />
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color="#8a91bf" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={activeSection === 'owners'
                ? t('screens.admin.admincarsscreen.typeProprietaire', { defaultValue: 'Search owner' })
                : t('screens.admin.admincarsscreen.rechercherAgence', { defaultValue: 'Search an agency' })}
              placeholderTextColor="#7078ab"
              style={styles.searchInput}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersRow}
            contentContainerStyle={styles.filtersRowContent}
          >
            {tabs.map((tab) => (
              <TouchableOpacity key={tab} style={[styles.filterChip, activeTab === tab && styles.filterChipActive]} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.filterText, activeTab === tab && styles.filterTextActive]}>{t(`screens.admin.admincarsscreen.tabs.${tab}`, { defaultValue: tab })}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

              <Text style={styles.countText}>
            {visibleDocCount}{' '}
            {activeSection === 'owners'
              ? t('screens.admin.admincarsscreen.vehiculesAVerifier', { defaultValue: 'vehicles to review' })
              : t('screens.admin.admincarsscreen.agencesAVerifier', { defaultValue: 'agencies to review' })}
          </Text>

          {!!sectionError ? <Text style={styles.error}>{sectionError}</Text> : null}
          {activeSection === 'owners' ? (
            <>
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
                            <Text style={styles.viewBtnText}>{t('screens.admin.admincarsscreen.voirDocs')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
              {loading ? <Text style={styles.loading}>{t('screens.admin.admincarsscreen.chargement')}</Text> : null}
            </>
          ) : (
            <>
              {filteredAgencies.map((agency) => (
                <View key={agency.agency.id} style={styles.groupCard}>
                  <Text style={styles.groupTitle}>{agency.agencyName}</Text>
                  <View style={styles.agencyMetaRow}>
                    <Text style={styles.docOwner}>{agency.managerName}</Text>
                    <Text style={[styles.statusText, statusTone(agency.agencyStatus)]}>{statusLabel(agency.agencyStatus)}</Text>
                  </View>
                  <Text style={styles.docMeta}>
                    {agency.registrationNumber || 'Registre indisponible'}
                    {' · '}
                    {agency.allDocs.length} document(s)
                  </Text>
                  <TouchableOpacity style={[styles.viewBtn, styles.agencyViewBtn]} onPress={() => openAgencyDocuments(agency)}>
                    <Text style={styles.viewBtnText}>{t('screens.admin.admincarsscreen.voirDocs')}</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {agenciesLoading ? <Text style={styles.loading}>{t('screens.admin.admincarsscreen.chargement')}</Text> : null}
            </>
          )}
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
              <TouchableOpacity onPress={() => { setModalVisible(false); setSelectedCar(null); setReviewingDocId(null); }}>
                <Ionicons name="close-outline" size={24} color="#dbe0ff" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              {selectedCar && !detailsByCar[selectedCar.id] ? <Text style={styles.loading}>{t('screens.admin.admincarsscreen.chargementDesDocuments')}</Text> : null}

              {selectedCar && detailsByCar[selectedCar.id] && modalDocs.length === 0 ? (
                <Text style={styles.error}>{t('screens.admin.admincarsscreen.aucunDocumentTrouvePourCeVehicule')}</Text>
              ) : null}

              {modalDocs.map((doc) => (
                <View key={doc.id} style={styles.modalDocRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalDocType}>{doc.type}</Text>
                    <Text style={[styles.statusText, statusTone(doc.status)]}>{statusLabel(doc.status)}</Text>
                    <Text style={styles.modalDocDate}>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString(getCurrentLocale()) : ''}</Text>
                    {doc.ocrResult ? (
                      <View style={styles.ocrBox}>
                        <Text style={styles.ocrLabel}>{t('screens.admin.admincarsscreen.ocr')}</Text>
                        <Text style={styles.ocrText}>
                          {doc.ocrResult.verification_reason || t('screens.admin.admincarsscreen.aucuneRaisonFournie')}
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
                      <Text style={styles.ocrEmpty}>{t('screens.admin.admincarsscreen.aucunResultatOcrDisponible')}</Text>
                    )}
                    <View style={styles.docActionsRow}>
                      {isVerifiedDocument(doc.status) ? (
                        reviewingDocId === doc.id ? (
                          <>
                            <TouchableOpacity
                              style={[styles.docActionBtn, styles.docRejectBtn]}
                              onPress={() => reviewDocument(doc.id, 'rejected')}
                            >
                              <Text style={styles.docActionText}>{t('screens.admin.admincarsscreen.rejeter')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.docActionBtn, styles.docDiscardBtn]}
                              onPress={() => setReviewingDocId(null)}
                            >
                              <Text style={styles.docActionText}>{t('screens.admin.admincarsscreen.annuler')}</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <TouchableOpacity
                            style={[styles.docActionBtn, styles.docReviewBtn, styles.docActionBtnFull]}
                            onPress={() => setReviewingDocId(doc.id)}
                          >
                            <Text style={styles.docActionText}>{t('screens.admin.admincarsscreen.changerEtat')}</Text>
                          </TouchableOpacity>
                        )
                      ) : (
                        <>
                          <TouchableOpacity
                            style={[styles.docActionBtn, styles.docRejectBtn]}
                            onPress={() => reviewDocument(doc.id, 'rejected')}
                          >
                            <Text style={styles.docActionText}>{t('screens.admin.admincarsscreen.rejeter')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.docActionBtn, styles.docAcceptBtn]}
                            onPress={() => reviewDocument(doc.id, 'approved')}
                          >
                            <Text style={styles.docActionText}>{t('screens.admin.admincarsscreen.accepter')}</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity style={styles.modalBtn} onPress={() => openDocument(doc.url)}>
                    <Text style={styles.modalBtnText}>{t('screens.admin.admincarsscreen.voir')}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

          </View>
        </View>
      </Modal>

      <Modal visible={agencyModalVisible} transparent animationType="slide" onRequestClose={() => setAgencyModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedAgency?.agencyName || 'Agence'}</Text>
                <Text style={styles.modalSub}>{selectedAgency?.managerName || ''}</Text>
              </View>
              <TouchableOpacity onPress={() => { setAgencyModalVisible(false); setSelectedAgency(null); setReviewingAgencyDocId(null); }}>
                <Ionicons name="close-outline" size={24} color="#dbe0ff" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              {selectedAgency && agencyModalDocs.length === 0 ? (
                <Text style={styles.error}>{t('screens.admin.admincarsscreen.aucunDocumentTrouvePourCeVehicule')}</Text>
              ) : null}

              {selectedAgency?.companyDocuments?.length ? <Text style={styles.sectionLabel}>{t('screens.admin.admincarsscreen.sections.agencyDocs', { defaultValue: 'Documents de l agence' })}</Text> : null}
              {selectedAgency?.companyDocuments?.map((doc) => (
                <View key={doc.id} style={styles.modalDocRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalDocType}>{doc.document_type || doc.type || 'Document'}</Text>
                    <Text style={[styles.statusText, statusTone(doc.status)]}>{statusLabel(doc.status)}</Text>
                    <Text style={styles.modalDocDate}>{doc.created_at ? new Date(doc.created_at).toLocaleString(getCurrentLocale()) : ''}</Text>
                    {doc.ocr_result ? (
                      <View style={styles.ocrBox}>
                        <Text style={styles.ocrLabel}>{t('screens.admin.admincarsscreen.ocr')}</Text>
                        <Text style={styles.ocrText}>{doc.ocr_result.verification_reason || t('screens.admin.admincarsscreen.aucuneRaisonFournie')}</Text>
                      </View>
                    ) : null}
                    <View style={styles.docActionsRow}>
                      {isVerifiedDocument(doc.status) ? (
                        reviewingAgencyDocId === doc.id ? (
                          <>
                            <TouchableOpacity style={[styles.docActionBtn, styles.docRejectBtn]} onPress={() => reviewAgencyDocument(doc.id, 'rejected')}>
                              <Text style={styles.docActionText}>{t('screens.admin.admincarsscreen.rejeter')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.docActionBtn, styles.docDiscardBtn]} onPress={() => setReviewingAgencyDocId(null)}>
                              <Text style={styles.docActionText}>{t('screens.admin.admincarsscreen.annuler')}</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <TouchableOpacity style={[styles.docActionBtn, styles.docReviewBtn, styles.docActionBtnFull]} onPress={() => setReviewingAgencyDocId(doc.id)}>
                            <Text style={styles.docActionText}>{t('screens.admin.admincarsscreen.changerEtat')}</Text>
                          </TouchableOpacity>
                        )
                      ) : (
                        <>
                          <TouchableOpacity style={[styles.docActionBtn, styles.docRejectBtn]} onPress={() => reviewAgencyDocument(doc.id, 'rejected')}>
                            <Text style={styles.docActionText}>{t('screens.admin.admincarsscreen.rejeter')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.docActionBtn, styles.docAcceptBtn]} onPress={() => reviewAgencyDocument(doc.id, 'approved')}>
                            <Text style={styles.docActionText}>{t('screens.admin.admincarsscreen.accepter')}</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity style={styles.modalBtn} onPress={() => openDocument(doc.document_url || doc.documentUrl || doc.url)}>
                    <Text style={styles.modalBtnText}>{t('screens.admin.admincarsscreen.voir')}</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {selectedAgency?.managerDocuments?.length ? <Text style={styles.sectionLabel}>{t('screens.admin.admincarsscreen.sections.managerDocs', { defaultValue: 'Documents du gerant' })}</Text> : null}
              {selectedAgency?.managerDocuments?.map((doc) => (
                <View key={doc.id} style={styles.modalDocRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalDocType}>{doc.document_type || doc.type || 'Document'}</Text>
                    <Text style={[styles.statusText, statusTone(doc.status)]}>{statusLabel(doc.status)}</Text>
                    <Text style={styles.modalDocDate}>{doc.created_at ? new Date(doc.created_at).toLocaleString(getCurrentLocale()) : ''}</Text>
                    {doc.ocr_result ? (
                      <View style={styles.ocrBox}>
                        <Text style={styles.ocrLabel}>{t('screens.admin.admincarsscreen.ocr')}</Text>
                        <Text style={styles.ocrText}>{doc.ocr_result.verification_reason || t('screens.admin.admincarsscreen.aucuneRaisonFournie')}</Text>
                      </View>
                    ) : null}
                    <View style={styles.docActionsRow}>
                      {isVerifiedDocument(doc.status) ? (
                        reviewingAgencyDocId === doc.id ? (
                          <>
                            <TouchableOpacity style={[styles.docActionBtn, styles.docRejectBtn]} onPress={() => reviewAgencyDocument(doc.id, 'rejected')}>
                              <Text style={styles.docActionText}>{t('screens.admin.admincarsscreen.rejeter')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.docActionBtn, styles.docDiscardBtn]} onPress={() => setReviewingAgencyDocId(null)}>
                              <Text style={styles.docActionText}>{t('screens.admin.admincarsscreen.annuler')}</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <TouchableOpacity style={[styles.docActionBtn, styles.docReviewBtn, styles.docActionBtnFull]} onPress={() => setReviewingAgencyDocId(doc.id)}>
                            <Text style={styles.docActionText}>{t('screens.admin.admincarsscreen.changerEtat')}</Text>
                          </TouchableOpacity>
                        )
                      ) : (
                        <>
                          <TouchableOpacity style={[styles.docActionBtn, styles.docRejectBtn]} onPress={() => reviewAgencyDocument(doc.id, 'rejected')}>
                            <Text style={styles.docActionText}>{t('screens.admin.admincarsscreen.rejeter')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.docActionBtn, styles.docAcceptBtn]} onPress={() => reviewAgencyDocument(doc.id, 'approved')}>
                            <Text style={styles.docActionText}>{t('screens.admin.admincarsscreen.accepter')}</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity style={styles.modalBtn} onPress={() => openDocument(doc.document_url || doc.documentUrl || doc.url)}>
                    <Text style={styles.modalBtnText}>{t('screens.admin.admincarsscreen.voir')}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AdminBottomNavigation navigation={navigation} route={route} active="documents" />
    </AppBackground>
  );
}

function TopStat({ value, label, tone, icon }) {
  const bg = tone === 'green' ? 'rgba(0,208,132,0.14)' : tone === 'red' ? 'rgba(255,77,109,0.14)' : 'rgba(255,176,32,0.14)';
  const border = tone === 'green' ? '#0f7f5d' : tone === 'red' ? '#923249' : '#8b641a';
  const color = tone === 'green' ? '#00d084' : tone === 'red' ? '#ff4d6d' : '#ffb020';
  return (
    <View style={[styles.topCard, { backgroundColor: bg, borderColor: border }]}> 
      <View style={styles.topStatRow}>
        <Ionicons name={icon || 'ellipse'} size={14} color={color} />
        <Text style={[styles.topValue, { color }]}>{value}</Text>
      </View>
      <Text style={[styles.topLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: 'transparent' },
  pageScroll: { flex: 1 },
  pageContent: { paddingBottom: 92 },
  title: { color: '#f2f4ff', fontSize: 36, fontWeight: '800', marginTop: 10, marginBottom: 14 },
  sectionToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  sectionToggle: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: '#2d3360', backgroundColor: '#171d44', paddingVertical: 10, alignItems: 'center' },
  sectionToggleActive: { backgroundColor: '#8f7dff', borderColor: '#8f7dff' },
  sectionToggleText: { color: '#9299c8', fontWeight: '800' },
  sectionToggleTextActive: { color: '#fff' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  topCard: { width: '48%', borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center' },
  topStatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topValue: { fontSize: 20, fontWeight: '800' },
  topLabel: { fontSize: 11, marginTop: 2 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f1433', borderWidth: 1, borderColor: '#2a2f57', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7, minHeight: 42, marginTop: 12 },
  searchInput: { flex: 1, color: '#dce1ff' },
  filtersRow: { marginTop: 12, marginBottom: 12 },
  filtersRowContent: { paddingVertical: 6, paddingRight: 8 },
  filterChip: { backgroundColor: '#171d44', borderRadius: 99, borderWidth: 1, borderColor: '#2d3360', paddingHorizontal: 14, height: 34, justifyContent: 'center', marginRight: 8 },
  filterChipActive: { backgroundColor: '#8f7dff', borderColor: '#8f7dff' },
  filterText: { color: '#9299c8', fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  countText: { color: '#7d84b1', marginTop: 2, marginBottom: 8 },
  content: { paddingTop: 0 },
  groupCard: { backgroundColor: '#0f1433', borderWidth: 1, borderColor: '#2b315c', borderRadius: 15, padding: 12, marginBottom: 10 },
  groupTitle: { color: '#9da7e0', fontWeight: '800', marginBottom: 8 },
  agencyMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  docItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#2b315c', borderRadius: 12, padding: 10, marginBottom: 8, backgroundColor: '#0b1030' },
  docLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 10 },
  docIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#1b214a', justifyContent: 'center', alignItems: 'center' },
  docTitle: { color: '#f1f4ff', fontWeight: '700' },
  docOwner: { color: '#7a82b2', fontSize: 12, marginTop: 2 },
  docMeta: { color: '#5f6798', fontSize: 11, marginTop: 2 },
  statusText: { fontWeight: '800', fontSize: 12 },
  viewBtn: { borderRadius: 8, borderWidth: 1, borderColor: '#4a5392', paddingHorizontal: 8, paddingVertical: 5 },
  agencyViewBtn: { alignSelf: 'flex-start', marginTop: 8 },
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
  sectionLabel: { color: '#8f9dff', fontWeight: '800', marginTop: 10, marginBottom: 8, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.8 },
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
  docReviewBtn: { backgroundColor: 'rgba(143,157,255,0.16)', borderColor: '#8f9dff' },
  docDiscardBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: '#4a5392' },
  docActionBtnFull: { flex: 1 },
  docActionText: { color: '#fff', fontWeight: '800' },
});
