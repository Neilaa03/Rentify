import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  ImageBackground,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';
import { calculateReservationPrice } from '../../utils/reservationUtils';
import { getThread } from '../../services/messages';

const OwnerReservationDetailsScreen = ({ navigation, route }) => {
  const reservationFromParams = route?.params?.reservation;
  const listingFromParams = route?.params?.listing;
  const token = route?.params?.token;

  const [loading, setLoading] = useState(false);
  const [listingFromApi, setListingFromApi] = useState(null);
  const [reservationState, setReservationState] = useState(reservationFromParams || null);
  const [chatStatus, setChatStatus] = useState({ checked: false, hasMessages: false });
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(reservationFromParams?.status || 'reserved');

  const goBack = () => navigation.goBack();

  if (!reservationFromParams) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Récapitulatif</Text>
          </View>
          <View style={{ width: 40 }} />
        </SafeAreaView>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#f6f8ff', fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
            Réservation introuvable
          </Text>
          <Text style={{ color: '#8e95bf', textAlign: 'center' }}>
            Impossible d’afficher les détails de cette réservation.
          </Text>
        </View>
      </View>
    );
  }

  const reservation = reservationState || reservationFromParams;
  const reservationListing = reservation?.listing || reservation?.listing?.car || null;
  const listing = listingFromApi || listingFromParams || reservationListing || {};

  const listingId =
    reservation?.listingId ||
    reservation?.listing_id ||
    listingFromParams?.id ||
    listingFromParams?.listingId ||
    reservation?.listing?.id ||
    null;

  const refreshReservation = useCallback(async () => {
    if (!token || !reservationFromParams?.id) return;
    try {
      const res = await fetch(API_ENDPOINTS.RESERVATIONS.GET(reservationFromParams.id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setReservationState(json || null);
    } catch (_e) {}
  }, [reservationFromParams?.id, token]);

  const refreshPaymentInfo = useCallback(async () => {
    if (!token || !reservationFromParams?.id) return;
    try {
      const paymentRes = await fetch(API_ENDPOINTS.PAYMENTS.GET_STATUS(reservationFromParams.id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!paymentRes.ok) return;
      const paymentJson = await paymentRes.json();
      setPaymentInfo(paymentJson || null);
    } catch (_e) {}
  }, [reservationFromParams?.id, token]);

  useFocusEffect(
    useCallback(() => {
      refreshReservation();
      refreshPaymentInfo();
    }, [refreshPaymentInfo, refreshReservation])
  );

  useEffect(() => {
    const otherUserId = reservation?.renter?.id || reservation?.renter_id;
    if (!otherUserId) return;

    let cancelled = false;
    (async () => {
      try {
        const thread = await getThread({ otherUserId });
        if (cancelled) return;
        setChatStatus({ checked: true, hasMessages: Array.isArray(thread) && thread.length > 0 });
      } catch (_err) {
        if (cancelled) return;
        setChatStatus({ checked: true, hasMessages: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reservation?.renter?.id, reservation?.renter_id]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!token || !reservationFromParams?.id) return;
      try {
        const res = await fetch(API_ENDPOINTS.RESERVATIONS.GET(reservationFromParams.id), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled && res.ok) {
          const json = await res.json();
          setReservationState(json || null);
        }
      } catch (_e) {
        // Non-blocking; can render from params.
      }

      if (!token || !listingId) return;
      try {
        const listingRes = await fetch(API_ENDPOINTS.LISTINGS.GET(listingId), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled && listingRes.ok) {
          const listingJson = await listingRes.json();
          setListingFromApi(listingJson || null);
        }
      } catch (_e) {
        // Non-blocking; can render from params.
      }

      // Fetch payment information
      if (!token || !reservationFromParams?.id) return;
      try {
        const paymentRes = await fetch(API_ENDPOINTS.PAYMENTS.GET_STATUS(reservationFromParams.id), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled && paymentRes.ok) {
          const paymentJson = await paymentRes.json();
          setPaymentInfo(paymentJson || null);
        }
      } catch (_e) {
        // Non-blocking; can render without payment info.
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [listingId, token, reservationFromParams?.id]);

  const startRaw =
    reservation?.startDate ||
    reservation?.from ||
    reservation?.start_date ||
    reservation?.fromDate;
  const endRaw =
    reservation?.endDate ||
    reservation?.to ||
    reservation?.end_date ||
    reservation?.toDate;

  const startDate = new Date(startRaw);
  const endDate = new Date(endRaw);
  const totalDays = useMemo(() => {
    if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) return 1;
    if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) return 1;
    const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const diffDays = Math.round((endMidnight - startMidnight) / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
  }, [startRaw, endRaw]);

  const imageUri =
    listing?.image ||
    listing?.imageUrl ||
    listing?.car?.carImages?.find((i) => i?.is_primary && i?.image_url)?.image_url ||
    listing?.car?.carImages?.find((i) => i?.image_url)?.image_url ||
    listing?.car?.carImages?.find((i) => i?.isPrimary && i?.imageUrl)?.imageUrl ||
    listing?.car?.carImages?.find((i) => i?.imageUrl)?.imageUrl ||
    listing?.car?.car_images?.find((i) => i?.is_primary && i?.image_url)?.image_url ||
    listing?.car?.car_images?.find((i) => i?.image_url)?.image_url ||
    listing?.car?.car_images?.find((i) => i?.isPrimary && i?.imageUrl)?.imageUrl ||
    listing?.car?.car_images?.find((i) => i?.imageUrl)?.imageUrl ||
    listing?.car?.images?.find((i) => i?.isPrimary && i?.imageUrl)?.imageUrl ||
    listing?.car?.images?.find((i) => i?.imageUrl)?.imageUrl ||
    null;

  const brand = listing?.brand || listing?.car?.brand || '';
  const model = listing?.model || listing?.car?.model || '';
  const year = listing?.year || listing?.car?.year || '—';
  const seats =
    listing?.seats ||
    listing?.car?.seats ||
    reservation?.seats ||
    reservation?.listing?.car?.seats ||
    '—';
  const city = listing?.city || listing?.location || listing?.car?.city || '';

  const rentalSubtotal = calculateReservationPrice(listing || {}, startRaw, endRaw, { deliveryFee: 0 });
  const deliveryFee = Number(reservation?.pickup?.deliveryFee ?? reservation?.pickup?.delivery_fee ?? 0) || 0;
  const safeTotalPrice = Number(reservation?.totalPrice || 0) || Math.max(0, rentalSubtotal + deliveryFee);

  const formatDate = (date) => {
    try {
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (_e) {
      return '—';
    }
  };

  const formatPrice = (value) => Math.round(Number(value || 0)).toLocaleString('fr-FR');

  const getStatusLabel = (status) => {
    const labels = {
      reserved: 'Réservé',
      confirmed: 'Confirmé',
      pickup_pending: 'En attente de récupération',
      return_pending: 'En attente de retour',
      refund_pending: 'Remboursement en attente',
      refunded: 'Remboursé',
      payment_pending: 'Paiement en attente',
      active: 'Actif',
      finished: 'Terminé',
      cancelled: 'Annulé',
    };
    return labels[status] || status || '—';
  };

  const status = reservation?.status;

  const getStatusColor = (value) => {
    const map = {
      reserved: '#F4C430', // jaune
      pickup_pending: '#FF8C00', // orange
      return_pending: '#FF8C00', // orange
      payment_pending: '#FF8C00', // orange
      confirmed: '#6EC1FF', // light blue
      active: '#2ECC71', // green
      cancelled: '#FF4D4F', // red
      finished: '#3B1B78', // dark purple
    };
    return map[value] || '#cfd4ff';
  };

  const STATUS_OPTIONS = useMemo(
    () => [
      { value: 'confirmed', label: 'Confirmé' },
      { value: 'reserved', label: 'Réservé' },
      { value: 'payment_pending', label: 'En attente (paiement)' },
      { value: 'pickup_pending', label: 'En attente (pickup)' },
      { value: 'active', label: 'Actif' },
      { value: 'return_pending', label: 'En attente (retour)' },
      { value: 'refund_pending', label: 'Remboursement en attente' },
      { value: 'refunded', label: 'Remboursé' },
      { value: 'finished', label: 'Terminé' },
      { value: 'cancelled', label: 'Annulé' },
    ],
    []
  );

  const handleStatusInfo = () => {
    Alert.alert('Statut', getStatusLabel(status));
  };

  const updateStatus = async (nextStatus) => {
    if (!reservation?.id) return;
    if (!token) {
      Alert.alert('Erreur', 'Veuillez vous reconnecter');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.RESERVATIONS.UPDATE_STATUS(reservation.id), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Impossible de mettre à jour le statut');

      const updated = json?.result || json;
      setReservationState((prev) => ({ ...(prev || reservation), ...(updated || {}), status: updated?.status || nextStatus }));
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const openStatusPicker = () => {
    setPendingStatus(status || 'reserved');
    setStatusModalOpen(true);
  };

  const closeStatusPicker = () => setStatusModalOpen(false);

  const confirmStatusChange = async () => {
    await updateStatus(pendingStatus);
    setStatusModalOpen(false);
  };

  const confirmCashPayment = async () => {
    if (!reservation?.id) return;
    if (!token) {
      Alert.alert('Erreur', 'Veuillez vous reconnecter');
      return;
    }
    try {
      setConfirmingPayment(true);
      const res = await fetch(API_ENDPOINTS.PAYMENTS.CONFIRM_CASH_PAYMENT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reservationId: reservation.id }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Impossible de confirmer le paiement');

      Alert.alert('Succès', 'Paiement en espèces confirmé');
      
      // Refresh the reservation state
      setPaymentInfo((prev) => prev ? { ...prev, status: 'completed' } : null);
      setReservationState((prev) => ({ ...(prev || reservation), status: 'confirmed' }));
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible de confirmer le paiement');
    } finally {
      setConfirmingPayment(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Récapitulatif</Text>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.imageSection}>
          {imageUri ? (
            <ImageBackground source={{ uri: imageUri }} style={styles.vehicleImage} resizeMode="cover">
              <LinearGradient colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.82)']} style={styles.imageOverlay} />
            </ImageBackground>
          ) : (
            <View style={[styles.vehicleImage, { backgroundColor: '#1c1f3f', alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="car-sport-outline" size={46} color="rgba(255,255,255,0.8)" />
            </View>
          )}

          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleBrand}>{brand || '—'}</Text>
            <Text style={styles.vehicleModel}>{model || '—'}</Text>

            <View style={styles.vehicleMetaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={16} color="#a566ff" />
                <Text style={styles.metaText}>{city || '—'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={16} color="#a566ff" />
                <Text style={styles.metaText}>{seats} places</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderWithButton}>
            <Text style={styles.sectionTitle}>Période de location</Text>
          </View>

          <View style={styles.datesContainer}>
            <View style={styles.dateBox}>
              <Text style={styles.dateBoxLabel}>Départ</Text>
              <Text style={styles.dateBoxValue}>{formatDate(startDate)}</Text>
              <Text style={styles.dateBoxTime}>08:00</Text>
            </View>

            <View style={styles.dateSeparator}>
              <View style={styles.dateSeparatorLine} />
              <Text style={styles.dateSeparatorDays}>{totalDays}j</Text>
              <View style={styles.dateSeparatorLine} />
            </View>

            <View style={styles.dateBox}>
              <Text style={styles.dateBoxLabel}>Retour</Text>
              <Text style={styles.dateBoxValue}>{formatDate(endDate)}</Text>
              <Text style={styles.dateBoxTime}>18:00</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderWithButton}>
            <Text style={styles.sectionTitle}>Informations client</Text>
            <TouchableOpacity
              onPress={() => {
                const otherUserId = reservation?.renter?.id || reservation?.renter_id;
                if (!otherUserId) return;
                navigation.navigate('Chat', { otherUserId, otherUser: reservation?.renter || { id: otherUserId } });
              }}
              activeOpacity={0.85}
              style={[
                styles.messageClientBtn,
                chatStatus.checked && !chatStatus.hasMessages ? styles.messageClientBtnNew : null,
              ]}
            >
              <Ionicons
                name={chatStatus.checked && !chatStatus.hasMessages ? 'sparkles-outline' : 'chatbubble-ellipses-outline'}
                size={19}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          {chatStatus.checked && !chatStatus.hasMessages ? (
            <Text style={styles.chatHint}>Aucun message avec ce client pour le moment.</Text>
          ) : null}

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom complet</Text>
              <Text style={styles.infoValue}>
                {reservation?.renter?.firstName ||
                reservation?.renter?.lastName ||
                reservation?.renter?.first_name ||
                reservation?.renter?.last_name
                  ? `${reservation?.renter?.firstName || reservation?.renter?.first_name || ''} ${
                      reservation?.renter?.lastName || reservation?.renter?.last_name || ''
                    }`.trim()
                  : '—'}
              </Text>
            </View>
            <View style={styles.dividerSmall} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>{reservation?.renter?.phone || '—'}</Text>
            </View>
          </View>
        </View>


        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détail du prix</Text>

          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceRowLabel}>
                {totalDays} jour{totalDays > 1 ? 's' : ''}
              </Text>
              <Text style={styles.priceRowValue}>{formatPrice(rentalSubtotal)} DA</Text>
            </View>

            <View style={styles.dividerSmall} />

            <View style={styles.priceRow}>
              <Text style={styles.priceRowLabel}>Frais de livraison</Text>
              <Text style={styles.priceRowValue}>{formatPrice(deliveryFee)} DA</Text>
            </View>

            <View style={styles.dividerSmall} />

            <View style={[styles.priceRow, styles.totalPriceRow]}>
              <Text style={styles.totalPriceLabel}>Prix total</Text>
              <Text style={styles.totalPriceValue}>{formatPrice(safeTotalPrice)} DA</Text>
            </View>
          </View>

          {paymentInfo?.paymentMethod === 'card' ? (
            <View style={styles.escrowStatusCard}>
              <View style={styles.escrowStatusHeader}>
                <Ionicons
                  name={
                    paymentInfo?.status === 'released'
                      ? 'checkmark-done-circle'
                      : paymentInfo?.status === 'disputed'
                      ? 'alert-circle'
                      : 'shield-checkmark'
                  }
                  size={20}
                  color={
                    paymentInfo?.status === 'released'
                      ? '#21d4a7'
                      : paymentInfo?.status === 'disputed'
                      ? '#ffb347'
                      : '#4f8cff'
                  }
                />
                <Text style={styles.escrowStatusTitle}>Escrow carte</Text>
              </View>
              <Text style={styles.escrowStatusText}>
                {paymentInfo?.status === 'held_in_escrow'
                  ? 'Les fonds sont bloqués en attendant la confirmation du client.'
                  : paymentInfo?.status === 'released'
                  ? 'Les fonds ont été transférés au compte Stripe connecté du propriétaire.'
                  : paymentInfo?.status === 'disputed'
                  ? 'Le paiement est bloqué dans un litige en attente de résolution.'
                  : paymentInfo?.status === 'pending'
                  ? 'Le paiement carte est en cours de validation Stripe.'
                  : 'Statut de paiement carte indisponible.'}
              </Text>
            </View>
          ) : null}

          {paymentInfo?.paymentMethod === 'cash' && (
            <View style={styles.cashPaymentAlert}>
              <View style={styles.cashPaymentAlertContent}>
                <Ionicons name="cash-outline" size={20} color="#a566ff" />
                <View style={styles.cashPaymentAlertText}>
                  <Text style={styles.cashPaymentAlertTitle}>Paiement à la récupération</Text>
                  <Text style={styles.cashPaymentAlertDescription}>
                    {paymentInfo?.status === 'pending_cash'
                      ? 'En attente de confirmation du paiement en espèces'
                      : 'Paiement en espèces confirmé'}
                  </Text>
                </View>
              </View>

              {paymentInfo?.status === 'pending_cash' && (
                <TouchableOpacity
                  style={styles.confirmPaymentButton}
                  onPress={confirmCashPayment}
                  disabled={confirmingPayment}
                >
                  {confirmingPayment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.confirmPaymentButtonText}>Confirmer le paiement</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {status === 'pickup_pending' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Récupération</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('OwnerPickupVerify', { reservationId: reservation?.id, token, flow: 'pickup' })}
              activeOpacity={0.85}
              style={styles.handoverActionWrap}
            >
              <LinearGradient
                colors={['#4C6FFF', '#8f6cff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.handoverAction}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.handoverActionText}>Vérifier le code de récupération</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.handoverHint}>
              Disponible uniquement dans les 24h avant le début de la réservation.
            </Text>
          </View>
        ) : null}

        {status === 'return_pending' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Retour</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('OwnerReturnCode', { reservationId: reservation?.id, flow: 'return' })}
              activeOpacity={0.85}
              style={styles.handoverActionWrap}
            >
              <LinearGradient
                colors={['#4C6FFF', '#8f6cff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.handoverAction}
              >
                <Ionicons name="qr-code-outline" size={18} color="#fff" />
                <Text style={styles.handoverActionText}>Afficher le QR code de retour</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.handoverHint}>
              Disponible uniquement dans les 24h avant la fin de la réservation.
            </Text>
          </View>
        ) : null}


        <View style={styles.section}>
          <View style={styles.sectionHeaderWithButton}>
            <Text style={styles.sectionTitle}>Statut</Text>
            <TouchableOpacity onPress={openStatusPicker} activeOpacity={0.8}>
              <LinearGradient colors={['#a566ff', '#8f6cff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statusButton}>
                <Ionicons name="sync-outline" size={16} color="#fff" />
                <Text style={styles.statusButtonText}>Mettre à jour</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Actuel</Text>
              <Text style={[styles.infoValue, { color: getStatusColor(status) }]}>{getStatusLabel(status)}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : null}

      <Modal transparent visible={statusModalOpen} animationType="fade" onRequestClose={closeStatusPicker}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mettre à jour le statut</Text>
            <Text style={styles.modalSubtitle}>Choisissez un statut, puis confirmez.</Text>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {STATUS_OPTIONS.map((opt) => {
                const selected = pendingStatus === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    activeOpacity={0.85}
                    onPress={() => setPendingStatus(opt.value)}
                    style={[styles.modalOption, selected && styles.modalOptionSelected]}
                  >
                    <View style={[styles.modalRadio, selected && styles.modalRadioSelected]}>
                      {selected ? <View style={styles.modalRadioDot} /> : null}
                    </View>
                    <Text style={styles.modalOptionText}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 10 }} />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={closeStatusPicker} activeOpacity={0.85} style={styles.modalButtonGhost}>
                <Text style={styles.modalButtonGhostText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmStatusChange}
                disabled={!pendingStatus || loading}
                activeOpacity={0.85}
                style={[styles.modalButtonPrimary, (!pendingStatus || loading) && styles.modalButtonDisabled]}
              >
                <Text style={styles.modalButtonPrimaryText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f1228',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  scrollView: {
    flex: 1,
  },
  imageSection: {
    backgroundColor: '#0f1228',
    paddingBottom: 16,
  },
  vehicleImage: {
    height: 240,
    width: '100%',
    backgroundColor: '#1c1f3f',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  vehicleInfo: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  vehicleBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a566ff',
  },
  vehicleModel: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginTop: 4,
  },
  vehicleMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaText: {
    fontSize: 14,
    color: '#d6dbff',
    marginLeft: 6,
    fontWeight: '500',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeaderWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  messageClientBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#8f6cff',
  },
  messageClientBtnNew: {
    backgroundColor: 'rgba(47, 123, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(47, 123, 255, 0.55)',
  },
  chatHint: { marginTop: -6, marginBottom: 10, color: '#8e95bf', fontSize: 12 },
  datesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(21, 24, 55, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(165, 102, 255, 0.2)',
  },
  dateBox: {
    flex: 1,
    alignItems: 'center',
  },
  dateBoxLabel: {
    fontSize: 12,
    color: '#8e95bf',
    fontWeight: '600',
  },
  dateBoxValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    marginTop: 6,
  },
  dateBoxTime: {
    fontSize: 12,
    color: '#a566ff',
    fontWeight: '600',
    marginTop: 4,
  },
  dateSeparator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  dateSeparatorLine: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dateSeparatorDays: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    marginVertical: 6,
  },
  infoCard: {
    backgroundColor: 'rgba(21, 24, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(165, 102, 255, 0.2)',
    overflow: 'hidden',
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    color: '#8e95bf',
    fontWeight: '600',
  },
  infoValue: {
    color: '#fff',
    fontWeight: '800',
  },
  priceBreakdown: {
    backgroundColor: 'rgba(21, 24, 55, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(165, 102, 255, 0.2)',
  },
  escrowStatusCard: {
    marginTop: 16,
    backgroundColor: 'rgba(79, 140, 255, 0.12)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(79, 140, 255, 0.2)',
  },
  escrowStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  escrowStatusTitle: {
    color: '#f6f8ff',
    fontSize: 14,
    fontWeight: '800',
  },
  escrowStatusText: {
    color: '#c9d2ff',
    fontSize: 12,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRowLabel: {
    color: '#cdd2ff',
    fontWeight: '600',
  },
  priceRowValue: {
    color: '#fff',
    fontWeight: '800',
  },
  dividerSmall: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 12,
  },
  totalPriceRow: {},
  totalPriceLabel: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
  totalPriceValue: {
    color: '#a566ff',
    fontWeight: '900',
    fontSize: 16,
  },
  handoverActionWrap: {
    marginTop: 10,
  },
  handoverAction: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  handoverActionText: {
    color: '#fff',
    fontWeight: '900',
  },
  handoverHint: {
    marginTop: 10,
    color: '#aeb4e6',
    fontSize: 12,
    lineHeight: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,3,14,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#fff',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 18,
    backgroundColor: '#151738',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 16,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  modalSubtitle: { color: 'rgba(255,255,255,0.65)', marginTop: 6, marginBottom: 12 },
  modalList: { maxHeight: 360 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  modalOptionSelected: {
    borderColor: 'rgba(143,108,255,0.85)',
    backgroundColor: 'rgba(143,108,255,0.10)',
  },
  modalRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalRadioSelected: { borderColor: '#8f6cff' },
  modalRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#8f6cff' },
  modalOptionText: { color: '#fff', fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalButtonGhost: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  modalButtonGhostText: { color: '#fff', fontWeight: '800' },
  modalButtonPrimary: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8f6cff',
  },
  modalButtonPrimaryText: { color: '#fff', fontWeight: '900' },
  modalButtonDisabled: { opacity: 0.6 },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusButtonText: { color: '#fff', fontWeight: '800' },
  cashPaymentAlert: {
    marginTop: 16,
    backgroundColor: 'rgba(165, 102, 255, 0.12)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(165, 102, 255, 0.35)',
  },
  cashPaymentAlertContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cashPaymentAlertText: {
    flex: 1,
    justifyContent: 'center',
  },
  cashPaymentAlertTitle: {
    color: '#a566ff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  cashPaymentAlertDescription: {
    color: '#cdd2ff',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  confirmPaymentButton: {
    marginTop: 12,
    backgroundColor: 'rgba(165, 102, 255, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(165, 102, 255, 0.5)',
  },
  confirmPaymentButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default OwnerReservationDetailsScreen;
