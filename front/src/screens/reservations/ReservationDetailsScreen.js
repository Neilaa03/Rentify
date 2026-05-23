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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import storage from '../../utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';
import { calculateReservationPrice } from '../../utils/reservationUtils';
import PaymentMethodSelector from '../../components/payment/PaymentMethodSelector';
import PaymentStatusDisplay from '../../components/payment/PaymentStatusDisplay';

const useStripeSafe = () => {
  if (Platform.OS === 'web') {
    return {
      initPaymentSheet: async () => ({ error: { message: 'Stripe is not supported on web' } }),
      presentPaymentSheet: async () => ({ error: { message: 'Stripe is not supported on web' } }),
    };
  }

  try {
    const stripe = require('@stripe/stripe-react-native');
    return stripe.useStripe();
  } catch (e) {
    return {
      initPaymentSheet: async () => ({ error: { message: 'Stripe is not available' } }),
      presentPaymentSheet: async () => ({ error: { message: 'Stripe is not available' } }),
    };
  }
};

const ReservationDetailsScreen = ({ navigation, route }) => {
  const reservationFromParams = route?.params?.reservation;
  const listingFromParams = route?.params?.listing;
  const resumeCardPayment = !!route?.params?.resumeCardPayment;
  const { initPaymentSheet, presentPaymentSheet } = useStripeSafe();
  
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [account, setAccount] = useState(null);
  const [listingFromApi, setListingFromApi] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // 'cancel' | 'edit' | null
  const [paymentMethod, setPaymentMethod] = useState(null); // null | 'card' | 'cash'
  const [paymentStatus, setPaymentStatus] = useState(null); // null | 'pending' | 'completed' | 'failed' | 'pending_cash'
  const [paymentInfo, setPaymentInfo] = useState(null); // stores payment response data
  const [reservationState, setReservationState] = useState(reservationFromParams || null);

  const reservation = reservationState || reservationFromParams;

  const goBackToPrevious = () => {
    const parent = navigation.getParent?.();
    const originTab = route?.params?.originTab;
    const listingObject = route?.params?.listing;

    if (originTab === 'HomeTab' && parent?.navigate) {
      parent.navigate('HomeTab', {
        screen: 'ListingDetails',
        params: { listing: listingObject },
      });
      return;
    }

    if ((originTab === 'FavoritesTab' || originTab === 'SearchTab') && parent?.navigate) {
      parent.navigate('FavoritesTab', {
        screen: 'ListingDetailsFromFavorites',
        params: { listing: listingObject },
      });
      return;
    }

    if (navigation.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    if (parent?.navigate) {
      parent.navigate('ReservationsTab', { screen: 'ReservationsList' });
      return;
    }
  };

  const handleCancelReservation = async () => {
    Alert.alert(
      'Annuler la réservation',
      'Êtes-vous sûr de vouloir annuler cette réservation ? Cette action est irréversible.',
      [
        {
          text: 'Non',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Oui, annuler',
          onPress: async () => {
            try {
              setActionLoading('cancel');
              const token = await storage.getItemAsync('userToken');
              if (!token) {
                Alert.alert('Erreur', 'Veuillez vous reconnecter');
                return;
              }

              const response = await fetch(API_ENDPOINTS.RESERVATIONS.CANCEL(reservation.id), {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur lors de l\'annulation');
              }

              Alert.alert('Succès', 'Réservation annulée avec succès', [
                {
                  text: 'OK',
                  onPress: () => goBackToPrevious(),
                },
              ]);
            } catch (error) {
              console.error('Cancel error:', error);
              Alert.alert('Erreur', error.message || 'Une erreur est survenue');
            } finally {
              setActionLoading(null);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const refreshPaymentStatus = async (token) => {
    if (!reservation?.id) return null;
    try {
      const response = await fetch(API_ENDPOINTS.PAYMENTS.GET_STATUS(reservation.id), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) return null;

      const payment = await response.json();
      if (payment?.paymentMethod) {
        setPaymentMethod(payment.paymentMethod);
      }
      setPaymentInfo(payment);
      if (payment?.status === 'completed' || payment?.status === 'failed' || payment?.status === 'pending_cash' || payment?.status === 'pending') {
        setPaymentStatus(payment.status);
      } else {
        setPaymentStatus(null);
      }

      return payment;
    } catch (e) {
      console.error('refreshPaymentStatus error:', e);
      return null;
    }
  };

  const handleEditDates = async () => {
    try {
      navigation.navigate('ReservationDatePickerFromReservations', {
        reservation,
        listing: listingFromApi || listingFromParams,
        isEditing: true,
      });
    } catch (error) {
      console.error('Edit dates error:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à l\'éditeur de dates');
    }
  };

  const isReservationActive = reservation?.status === 'reserved';
  const canResumePendingCardPayment =
    reservation?.status === 'reserved' &&
    paymentMethod === 'card' &&
    paymentStatus === 'pending';

  const showPaymentMethodSelector =
    isReservationActive &&
    (paymentStatus === null || paymentStatus === 'failed');

  const showTermsSection =
    isReservationActive &&
    (paymentStatus === null || paymentStatus === 'failed');

  const showActionBar = reservation?.status === 'reserved';
  const showPayButton =
    reservation?.status === 'reserved' &&
    (paymentStatus === null || paymentStatus === 'failed' || canResumePendingCardPayment);

  const paymentButtonLabel = canResumePendingCardPayment
    ? 'Finish payment'
    : paymentStatus === 'failed'
    ? 'Réessayer le paiement'
    : 'Procéder au paiement';

  const refreshReservation = useCallback(async () => {
    if (!reservationFromParams?.id) return;
    try {
      const token = await storage.getItemAsync('userToken');
      if (!token) return;
      const res = await fetch(API_ENDPOINTS.RESERVATIONS.GET(reservationFromParams.id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setReservationState(json || null);
    } catch (_e) {
      // ignore
    }
  }, [reservationFromParams?.id]);

  useFocusEffect(
    useCallback(() => {
      // Ensures status updates (e.g. pickup verified -> active) are visible immediately.
      refreshReservation();
    }, [refreshReservation])
  );

  if (!reservation) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.header}>
          <TouchableOpacity onPress={goBackToPrevious} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Récapitulatif</Text>
          <View style={{ width: 50 }} />
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
      try {
        const cachedProfile = await storage.getItemAsync('userProfile');
        if (!cancelled && cachedProfile) setAccount(JSON.parse(cachedProfile));
      } catch (e) {
        // Ignore parse errors.
      }

      const token = await storage.getItemAsync('userToken');
      if (!token) return;

      try {
        const [accountRes, listingRes] = await Promise.all([
          fetch(API_ENDPOINTS.AUTH.ME, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          listingId ? fetch(API_ENDPOINTS.LISTINGS.GET(listingId)) : Promise.resolve(null),
        ]);

        if (!cancelled && accountRes?.ok) {
          const accountJson = await accountRes.json();
          setAccount(accountJson?.user || null);
        }

        if (!cancelled && listingRes?.ok) {
          const listingJson = await listingRes.json();
          setListingFromApi(listingJson || null);
        }
      } catch (e) {
        // Ignore fetch errors; screen can still render from params.
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  useEffect(() => {
    let cancelled = false;

    const loadPaymentInfo = async () => {
      if (reservation?.status !== 'reserved') return;

      try {
        const token = await storage.getItemAsync('userToken');
        if (!token) return;

        const response = await fetch(API_ENDPOINTS.PAYMENTS.GET_STATUS(reservation.id), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) return;
        const payment = await response.json();
        if (cancelled) return;

        if (payment?.paymentMethod) {
          setPaymentMethod(payment.paymentMethod);
        }
        setPaymentInfo(payment);
        if (payment?.status === 'completed' || payment?.status === 'failed' || payment?.status === 'pending_cash' || payment?.status === 'pending') {
          setPaymentStatus(payment.status);
        } else {
          setPaymentStatus(null);
        }
      } catch (e) {
        // Ignore status fetch errors; user can still retry payment.
      }
    };

    loadPaymentInfo();
    return () => {
      cancelled = true;
    };
  }, [reservation?.id, reservation?.status]);

  useEffect(() => {
    if (!resumeCardPayment) return;
    if (!canResumePendingCardPayment) return;
    if (loading) return;
    handlePayment();
  }, [resumeCardPayment, canResumePendingCardPayment, loading]);

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
    listing?.car?.car_images?.find((i) => i?.is_primary && i?.image_url)?.image_url ||
    listing?.car?.car_images?.find((i) => i?.image_url)?.image_url ||
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
  const city = listing?.city || listing?.car?.city || '';
  const pricePerDay =
    listing?.pricePerDay ||
    listing?.price_per_day ||
    listing?.price ||
    listing?.car?.pricePerDay ||
    0;

  const handlePayment = async () => {
    try {
      if (!termsAccepted && !canResumePendingCardPayment) {
        Alert.alert('Conditions requises', 'Veuillez accepter les conditions générales pour continuer.');
        return;
      }

      if (!paymentMethod) {
        Alert.alert('Méthode de paiement requise', 'Veuillez sélectionner une méthode de paiement.');
        return;
      }

      setLoading(true);
      const token = await storage.getItemAsync('userToken');
      if (!token) {
        Alert.alert('Erreur', 'Authentification requise. Veuillez vous connecter.');
        return;
      }

      if (paymentMethod === 'cash') {
        await handleCashPayment(token);
      } else if (paymentMethod === 'card') {
        await handleCardPayment(token);
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  const handleCardPayment = async (token) => {
    try {
      const paymentIntentResponse = await fetch(API_ENDPOINTS.PAYMENTS.CREATE_CARD_PAYMENT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          reservationId: reservation.id,
          amount: safeTotalPrice,
          currency: 'eur',
        }),
      });

      if (!paymentIntentResponse.ok) {
        let errorMessage = 'Failed to initialize card payment';
        try {
          const errorData = await paymentIntentResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${paymentIntentResponse.status}`;
        }
        throw new Error(errorMessage);
      }

      const paymentData = await paymentIntentResponse.json();
      if (!paymentData?.clientSecret) {
        throw new Error('Stripe clientSecret not returned by server');
      }

      setPaymentInfo(paymentData);
      setPaymentStatus('pending');

      // Initialize PaymentSheet
      const initResult = await initPaymentSheet({
        merchantDisplayName: 'Rentify',
        paymentIntentClientSecret: paymentData.clientSecret,
        allowsDelayedPaymentMethods: false,
      });

      if (initResult.error) {
        throw new Error(initResult.error.message || 'Failed to initialize payment sheet');
      }

      // Present PaymentSheet
      const result = await presentPaymentSheet();
      if (result.error) {
        setPaymentStatus('failed');
        throw new Error(result.error.message || 'Payment failed');
      }

      const refreshed = await refreshPaymentStatus(token);
      if (refreshed?.status === 'completed' || refreshed?.status === 'paid') {
        setPaymentStatus('completed');
        Alert.alert(
          'Paiement réussi',
          'Votre paiement a été traité avec succès. Votre réservation est confirmée!',
          [
            {
              text: 'OK',
              onPress: () => goBackToPrevious(),
            },
          ]
        );
        return;
      }

      if (refreshed?.status === 'failed') {
        setPaymentStatus('failed');
        throw new Error('Le paiement a échoué. Veuillez réessayer.');
      }

      setPaymentStatus('pending');
      Alert.alert(
        'Paiement en cours',
        'Le paiement a été initié. Le statut sera mis à jour dès que possible.',
        [
          {
            text: 'OK',
            onPress: () => {},
          },
        ]
      );
    } catch (error) {
      console.error('Card payment error:', error);
      setPaymentStatus('failed');
      throw error;
    }
  };

  const handleCashPayment = async (token) => {
    try {
      const cashPaymentResponse = await fetch(API_ENDPOINTS.PAYMENTS.CREATE_CASH_PAYMENT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          reservationId: reservation.id,
          amount: safeTotalPrice,
        }),
      });

      if (!cashPaymentResponse.ok) {
        let errorMessage = 'Failed to create cash payment';
        try {
          const errorData = await cashPaymentResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${cashPaymentResponse.status}`;
        }
        throw new Error(errorMessage);
      }

      const cashData = await cashPaymentResponse.json();
      setPaymentInfo(cashData);
      setPaymentStatus('pending_cash');

      Alert.alert(
        'Réservation confirmée',
        'Votre réservation est confirmée. Le paiement en espèces sera effectué lors de la récupération du véhicule.',
        [
          {
            text: 'OK',
            onPress: () => goBackToPrevious(),
          },
        ]
      );
    } catch (error) {
      console.error('Cash payment error:', error);
      throw error;
    }
  };

  const formatPrice = (value) => value.toLocaleString('fr-FR');
  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');

  const rentalSubtotal = useMemo(() => {
    const computed = calculateReservationPrice(listing || {}, startRaw, endRaw, { deliveryFee: 0 });
    return Number.isFinite(computed) ? computed : 0;
  }, [listing, startRaw, endRaw]);

  const deliveryFee = useMemo(() => {
    const fee =
      reservation?.pickup?.deliveryFee ??
      reservation?.pickup?.delivery_fee ??
      0;
    const normalized = Number(fee || 0);
    return Number.isFinite(normalized) ? Math.max(0, normalized) : 0;
  }, [reservation]);

  const serviceFee = useMemo(() => {
    return Math.round(rentalSubtotal * 0.1);
  }, [rentalSubtotal]);

  const safeTotalPrice = useMemo(
    () => rentalSubtotal + deliveryFee + serviceFee,
    [rentalSubtotal, deliveryFee, serviceFee]
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          onPress={goBackToPrevious}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Récapitulatif</Text>
        <View style={{ width: 50 }} />
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
      >

        {/* Vehicle Card */}
        <View style={styles.vehicleCard}>
          {imageUri ? (
            <ImageBackground
              source={{ uri: imageUri }}
              style={styles.vehicleImage}
              imageStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
            >
              <View style={styles.imageOverlay} />
            </ImageBackground>
          ) : (
            <View style={[styles.vehicleImage, styles.vehicleImagePlaceholder]}>
              <Ionicons name="car-outline" size={50} color="#8f6cff" />
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

        {/* Dates Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithButton}>
            <Text style={styles.sectionTitle}>Période de location</Text>
            {isReservationActive && (
              <TouchableOpacity
                onPress={handleEditDates}
                disabled={actionLoading !== null}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#a566ff', '#8f6cff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.editDateButton}
                >
                  <Ionicons name="pencil-outline" size={16} color="#fff" />
                  <Text style={styles.editDateButtonText}>Modifier</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
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

        {/* Driver Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations du conducteur</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom complet</Text>
              <Text style={styles.infoValue}>
                {account?.firstName || account?.first_name || account?.lastName || account?.last_name
                  ? `${account?.firstName || account?.first_name || ''} ${account?.lastName || account?.last_name || ''}`.trim()
                  : '—'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>{account?.phone || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Conditions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conditions de location</Text>
          
          <View style={styles.conditionsList}>
            <View style={styles.conditionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#23d49f" />
              <View style={styles.conditionContent}>
                <Text style={styles.conditionTitle}>Assurance incluse</Text>
                <Text style={styles.conditionDesc}>Couverture complète</Text>
              </View>
            </View>

            <View style={styles.conditionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#23d49f" />
              <View style={styles.conditionContent}>
                <Text style={styles.conditionTitle}>Kilométrage illimité</Text>
                <Text style={styles.conditionDesc}>Aucune limite de km</Text>
              </View>
            </View>

            <View style={styles.conditionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#23d49f" />
              <View style={styles.conditionContent}>
                <Text style={styles.conditionTitle}>Assistance 24/7</Text>
                <Text style={styles.conditionDesc}>Support disponible</Text>
              </View>
            </View>
          </View>
        </View>

        {reservation?.status === 'pickup_pending' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Récupération</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('PickupCode', { reservationId: reservation.id, flow: 'pickup' })}
              activeOpacity={0.85}
              style={styles.pickupActionWrap}
            >
              <LinearGradient
                colors={['#4C6FFF', COLORS.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.pickupAction}
              >
                <Ionicons name="key-outline" size={18} color="#fff" />
                <Text style={styles.pickupActionText}>Voir le code de récupération</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.pickupHintText}>
              Disponible uniquement dans les 24h avant le début de la réservation.
            </Text>
          </View>
        )}

        {reservation?.status === 'return_pending' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Retour</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ReturnVerify', { reservationId: reservation.id, flow: 'return' })}
              activeOpacity={0.85}
              style={styles.pickupActionWrap}
            >
              <LinearGradient
                colors={['#4C6FFF', COLORS.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.pickupAction}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.pickupActionText}>Vérifier le QR code de retour</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.pickupHintText}>
              Disponible uniquement dans les 24h avant la fin de la réservation.
            </Text>
          </View>
        )}

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détail du prix</Text>
          
          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceRowLabel}>
                {totalDays} jour
                {totalDays > 1 ? 's' : ''}
              </Text>
              <Text style={styles.priceRowValue}>
                {Math.round(rentalSubtotal).toLocaleString('fr-FR')} DA
              </Text>
            </View>

            <View style={styles.dividerSmall} />

            <View style={styles.priceRow}>
              <Text style={styles.priceRowLabel}>Frais de livraison</Text>
              <Text style={styles.priceRowValue}>
                {Math.round(deliveryFee).toLocaleString('fr-FR')} DA
              </Text>
            </View>

            <View style={styles.dividerSmall} />

            <View style={styles.priceRow}>
              <Text style={styles.priceRowLabel}>Frais de service</Text>
              <Text style={styles.priceRowValue}>
                {serviceFee.toLocaleString('fr-FR')} DA
              </Text>
            </View>

            <View style={styles.dividerSmall} />

            <View style={[styles.priceRow, styles.totalPriceRow]}>
              <Text style={styles.totalPriceLabel}>Prix total</Text>
              <Text style={styles.totalPriceValue}>
                {formatPrice(safeTotalPrice)} DA
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Status Display */}
        {paymentStatus && paymentInfo && (
          <PaymentStatusDisplay
            status={paymentStatus}
            amount={safeTotalPrice}
            paymentMethod={paymentMethod}
          />
        )}

        {/* Payment Method Selector */}
        {showPaymentMethodSelector && (
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onMethodSelect={setPaymentMethod}
          />
        )}

      {/* Terms & Conditions */}
      {showTermsSection && (
        <View style={styles.termsSection}>
          <TouchableOpacity
            onPress={() => setTermsAccepted((v) => !v)}
            activeOpacity={0.8}
            style={styles.termsCheckbox}
          >
            <Ionicons
              name={termsAccepted ? 'checkbox' : 'square-outline'}
              size={20}
              color={termsAccepted ? '#23d49f' : '#a566ff'}
            />
            <Text style={styles.termsText}>
              J'accepte les{' '}
              <Text style={styles.termsLink}>conditions générales</Text> et la
              <Text style={styles.termsLink}> politique de confidentialité</Text>
            </Text>
          </TouchableOpacity>
        </View>
      )}


        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Payment Button */}
      {showActionBar && (
        <View style={styles.paymentBar}>
          <TouchableOpacity
            onPress={handleCancelReservation}
            disabled={actionLoading !== null}
            activeOpacity={0.8}
            style={styles.cancelButtonWrapper}
          >
            <LinearGradient
              colors={['#ff6b6b', '#ee5a52']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.paymentCancelButton,
                actionLoading === 'cancel' && styles.actionButtonLoading,
              ]}
            >
              {actionLoading === 'cancel' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Annuler</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {showPayButton && (
            <TouchableOpacity
              onPress={handlePayment}
              disabled={
                loading ||
                !paymentMethod ||
                (!termsAccepted && !canResumePendingCardPayment)
              }
              style={[
                styles.paymentButtonWrapper,
                (!termsAccepted && !canResumePendingCardPayment) || loading || !paymentMethod ? styles.paymentButtonWrapperDisabled : null,
              ]}
            >
              <LinearGradient
                colors={!termsAccepted || loading || !paymentMethod ? ['#3a3f66', '#2b2f52'] : [COLORS.secondary, COLORS.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.paymentButton}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.paymentButtonText}>
                    {paymentButtonLabel}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1228',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#151837',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 156, 233, 0.2)',
  },
  backButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#f6f8ff',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#0f1228',
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 140,
  },
  vehicleCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#151837',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)',
  },
  vehicleImage: {
    height: 200,
    backgroundColor: '#0f1228',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleImagePlaceholder: {
    backgroundColor: 'rgba(143, 108, 255, 0.1)',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  vehicleInfo: {
    padding: 16,
  },
  vehicleBrand: {
    color: '#8e95bf',
    fontSize: 12,
    marginBottom: 4,
  },
  vehicleModel: {
    color: '#f6f8ff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  vehicleSpecs: {
    flexDirection: 'row',
    gap: 8,
  },
  specBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(143, 108, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  specText: {
    color: '#a566ff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  vehicleMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#8e95bf',
    fontSize: 13,
    fontWeight: '500',
  },
  paymentButtonWrapperDisabled: {
    opacity: 0.75,
  },
  section: {
    marginBottom: 24,
  },
  pickupActionWrap: {
    marginTop: 6,
  },
  pickupAction: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pickupActionText: {
    color: '#fff',
    fontWeight: '900',
  },
  pickupHintText: {
    marginTop: 10,
    color: '#8e95bf',
    fontSize: 12,
    lineHeight: 16,
  },
  sectionTitle: {
    color: '#f6f8ff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionHeaderWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editDateButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  datesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateBox: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)',
    alignItems: 'center',
  },
  dateBoxLabel: {
    color: '#8e95bf',
    fontSize: 12,
    marginBottom: 4,
  },
  dateBoxValue: {
    color: '#f6f8ff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateBoxTime: {
    color: '#a566ff',
    fontSize: 11,
    fontWeight: '600',
  },
  dateSeparator: {
    alignItems: 'center',
    gap: 4,
  },
  dateSeparatorLine: {
    width: 20,
    height: 1,
    backgroundColor: 'rgba(148, 156, 233, 0.2)',
  },
  dateSeparatorDays: {
    color: '#a566ff',
    fontSize: 12,
    fontWeight: '700',
  },
  infoCard: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoLabel: {
    color: '#8e95bf',
    fontSize: 14,
  },
  infoValue: {
    color: '#f6f8ff',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(148, 156, 233, 0.1)',
    marginHorizontal: 16,
  },
  dividerSmall: {
    height: 1,
    backgroundColor: 'rgba(148, 156, 233, 0.1)',
    marginVertical: 8,
  },
  conditionsList: {
    gap: 12,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(35, 212, 159, 0.1)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(35, 212, 159, 0.2)',
  },
  conditionContent: {
    flex: 1,
  },
  conditionTitle: {
    color: '#f6f8ff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  conditionDesc: {
    color: '#8e95bf',
    fontSize: 12,
  },
  priceBreakdown: {
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRowLabel: {
    color: '#8e95bf',
    fontSize: 14,
  },
  priceRowValue: {
    color: '#f6f8ff',
    fontSize: 14,
    fontWeight: '600',
  },
  totalPriceRow: {
    marginTop: 8,
    paddingTop: 8,
  },
  totalPriceLabel: {
    color: '#f6f8ff',
    fontSize: 16,
    fontWeight: '700',
  },
  totalPriceValue: {
    color: '#a566ff',
    fontSize: 20,
    fontWeight: '800',
  },
  termsSection: {
    backgroundColor: 'rgba(143, 108, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(143, 108, 255, 0.1)',
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  termsText: {
    flex: 1,
    color: '#8e95bf',
    fontSize: 12,
    lineHeight: 18,
  },
  termsLink: {
    color: '#a566ff',
    fontWeight: '600',
  },
  actionButtonsSection: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actionSectionTitle: {
    color: '#f6f8ff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButtonWrapper: {
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  actionButtonLoading: {
    opacity: 0.9,
  },
  paymentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#151837',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 156, 233, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelButtonWrapper: {
    flex: 0,
  },
  paymentCancelButton: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  paymentLabel: {
    color: '#8e95bf',
    fontSize: 12,
  },
  paymentAmount: {
    color: '#a566ff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  paymentButtonWrapper: {
    flex: 1,
  },
  paymentButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default ReservationDetailsScreen;
