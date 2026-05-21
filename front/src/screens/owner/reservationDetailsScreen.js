import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';
import { calculateReservationPrice } from '../../utils/reservationUtils';

const OwnerReservationDetailsScreen = ({ navigation, route }) => {
  const reservationFromParams = route?.params?.reservation;
  const listingFromParams = route?.params?.listing;
  const token = route?.params?.token;

  const [loading, setLoading] = useState(false);
  const [listingFromApi, setListingFromApi] = useState(null);
  const [reservationState, setReservationState] = useState(reservationFromParams || null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

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

  const safeTotalPrice = Number(reservation?.totalPrice || 0);
  const computed = calculateReservationPrice(listing, startRaw, endRaw);
  const basePrice = computed.basePrice || safeTotalPrice;
  const serviceFee = computed.serviceFee || 0;

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
      cancelled: 'Annulé',
    };
    return labels[status] || status || '—';
  };

  const status = reservation?.status;

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
    Alert.alert('Mettre à jour le statut', 'Choisissez un statut', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmé', onPress: () => updateStatus('confirmed') },
      { text: 'En attente (pickup)', onPress: () => updateStatus('pickup_pending') },
      { text: 'Annulé', style: 'destructive', onPress: () => updateStatus('cancelled') },
    ]);
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
          <Text style={styles.sectionTitle}>Informations client</Text>

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
              <Text style={styles.priceRowValue}>{formatPrice(basePrice)} DA</Text>
            </View>

            <View style={styles.dividerSmall} />

            <View style={[styles.priceRow, styles.totalPriceRow]}>
              <Text style={styles.totalPriceLabel}>Prix total</Text>
              <Text style={styles.totalPriceValue}>{formatPrice(safeTotalPrice)} DA</Text>
            </View>
          </View>

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
              <Text style={styles.infoValue}>{getStatusLabel(status)}</Text>
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
