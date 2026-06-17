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
  Modal } from
'react-native';
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
import ReviewCard from '../../components/reviews/ReviewCard';
import ReviewForm from '../../components/reviews/ReviewForm';import { useTranslation } from "react-i18next";
import { getFriendlyError } from '../../utils/friendlyError';
import { getCurrentLocale } from '../../i18n';

const useStripeSafe = () => {
  if (Platform.OS === 'web') {
    return {
      initPaymentSheet: async () => ({ error: { message: 'Stripe is not supported on web' } }),
      presentPaymentSheet: async () => ({ error: { message: 'Stripe is not supported on web' } })
    };
  }

  try {
    const stripe = require('@stripe/stripe-react-native');
    return stripe.useStripe();
  } catch (e) {
    return {
      initPaymentSheet: async () => ({ error: { message: 'Stripe is not available' } }),
      presentPaymentSheet: async () => ({ error: { message: 'Stripe is not available' } })
    };
  }
};

const ReservationDetailsScreen = ({ navigation, route }) => {const { t } = useTranslation();
  const reservationIdParam = route?.params?.reservationId;
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

  const getReservationDetailsTarget = () => {
    const parent = navigation.getParent?.();
    const nextListing = listingFromApi || listingFromParams || reservation?.listing || null;
    const nextReservation = reservationState || reservationFromParams || reservation || null;
    return { parent, nextListing, nextReservation };
  };

  const goToReservationDetailsFromReservations = () => {
    const { parent, nextListing, nextReservation } = getReservationDetailsTarget();

    if (parent?.navigate) {
      parent.navigate('ReservationsTab', {
        screen: 'ReservationDetailsFromReservations',
        params: {
          reservation: nextReservation,
          listing: nextListing
        }
      });
      return;
    }

    navigation.navigate('ReservationDetailsFromReservations', {
      reservation: nextReservation,
      listing: nextListing
    });
  };

  const goToReservations = () => {
    const parent = navigation.getParent?.();
    const navigate = parent?.navigate || navigation.navigate;
    navigate('ReservationsTab', { screen: 'ReservationsList' });
    const originTab = route?.params?.originTab;
    const listingObject = route?.params?.listing;

    if (originTab === 'HomeTab' && parent?.navigate) {
      parent.navigate('HomeTab', {
        screen: 'ListingDetails',
        params: { listing: listingObject }
      });
      return;
    }

    if ((originTab === 'FavoritesTab' || originTab === 'SearchTab') && parent?.navigate) {
      parent.navigate('FavoritesTab', {
        screen: 'ListingDetailsFromFavorites',
        params: { listing: listingObject }
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
    Alert.alert(t("screens.reservations.reservationdetailsscreen.annulerLaReservation"), t("screens.reservations.reservationdetailsscreen.etesVousSurDeVouloirAnnulerCette"),


    [
    {
      text: 'Non',
      onPress: () => {},
      style: 'cancel'
    },
    {
      text: 'Oui, annuler',
      onPress: async () => {
        try {
          setActionLoading('cancel');
          const token = await storage.getItemAsync('userToken');
          if (!token) {
            Alert.alert(t("screens.reservations.reservationdetailsscreen.erreur"), t("screens.reservations.reservationdetailsscreen.veuillezVousReconnecter"));
            return;
          }

          const response = await fetch(API_ENDPOINTS.RESERVATIONS.CANCEL(reservation.id), {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de l\'annulation');
          }

          Alert.alert(t("screens.reservations.reservationdetailsscreen.succes"), t("screens.reservations.reservationdetailsscreen.reservationAnnuleeAvecSucces"), [
          {
            text: 'OK',
            onPress: () => goToReservations()
          }]
          );
        } catch (error) {
          console.error('Cancel error:', error);
          Alert.alert(t("screens.reservations.reservationdetailsscreen.erreur"), getFriendlyError(error, t));
        } finally {
          setActionLoading(null);
        }
      },
      style: 'destructive'
    }]

    );
  };

  const refreshPaymentStatus = async (token) => {
    if (!reservation?.id) return null;
    try {
      const response = await fetch(API_ENDPOINTS.PAYMENTS.GET_STATUS(reservation.id), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) return null;

      const payment = await response.json();
      if (payment?.paymentMethod) {
        setPaymentMethod(payment.paymentMethod);
      }
      setPaymentInfo(payment);
      if (
      payment?.status === 'completed' ||
      payment?.status === 'released' ||
      payment?.status === 'held_in_escrow' ||
      payment?.status === 'disputed' ||
      payment?.status === 'failed' ||
      payment?.status === 'pending_cash' ||
      payment?.status === 'pending' ||
      payment?.status === 'processing')
      {
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
        isEditing: true
      });
    } catch (error) {
      console.error('Edit dates error:', error);
      Alert.alert(t("screens.reservations.reservationdetailsscreen.erreur"), t("screens.reservations.reservationdetailsscreen.impossibleDaccederALediteurDeDates"));
    }
  };

  const isReservationActive = reservation?.status === 'reserved';
  const canResumePendingCardPayment =
  reservation?.status === 'reserved' &&
  paymentMethod === 'card' &&
  paymentStatus === 'pending';

  const showPaymentMethodSelector =
  isReservationActive && (
  paymentStatus === null || paymentStatus === 'failed');

  const showTermsSection =
  isReservationActive && (
  paymentStatus === null || paymentStatus === 'failed');

  const isCardEscrowActive =
  paymentMethod === 'card' &&
  ['held_in_escrow', 'released', 'disputed'].includes(paymentStatus);
  const hideCancelOnThisScreen = justCompletedCardPayment || isCardEscrowActive;

  const showActionBar = reservation?.status === 'reserved' && !hideCancelOnThisScreen;
  const showPayButton =
  reservation?.status === 'reserved' && (
  paymentStatus === null || paymentStatus === 'failed' || canResumePendingCardPayment);

  const showConfirmHandoverButton = paymentStatus === 'held_in_escrow' && !justCompletedCardPayment;

  const isCardEnabledForOwner = Boolean(ownerConnectStatus?.cardPaymentsAvailable);
  const disabledCardReason = isCardEnabledForOwner ?
  '' :
  'Paiement carte indisponible: le proprietaire n\'a pas encore configure ses paiements Stripe.';

  const paymentButtonLabel = canResumePendingCardPayment ? t("components.cards.reservationcard.finishPayment") :

  paymentStatus === 'failed' ?
  'Réessayer le paiement' :
  'Procéder au paiement';

  const refreshReservation = useCallback(async () => {
    if (!reservationFromParams?.id) return;
    try {
      const token = await storage.getItemAsync('userToken');
      if (!token) return;
      const res = await fetch(API_ENDPOINTS.RESERVATIONS.GET(reservationFromParams.id), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const json = await res.json();
      setReservationState(json || null);
    } catch (_e) {


      // ignore
    }}, [reservationFromParams?.id]);
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
          <TouchableOpacity onPress={goToReservations} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("screens.reservations.reservationdetailsscreen.recapitulatif")}</Text>
          <View style={{ width: 50 }} />
        </SafeAreaView>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#f6f8ff', fontSize: 16, fontWeight: '700', marginBottom: 8 }}>{t("screens.reservations.reservationdetailsscreen.reservationIntrouvable")}

          </Text>
          <Text style={{ color: '#8e95bf', textAlign: 'center' }}>{t("screens.reservations.reservationdetailsscreen.impossibleDafficherLesDetailsDeCetteReservation")}

          </Text>
        </View>
      </View>);

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
      }const token = await storage.getItemAsync('userToken');
      if (!token) return;

      try {
        const [accountRes, listingRes] = await Promise.all([
        fetch(API_ENDPOINTS.AUTH.ME, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        listingId ? fetch(API_ENDPOINTS.LISTINGS.GET(listingId)) : Promise.resolve(null)]
        );

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
      }};
    load();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  useEffect(() => {
    let cancelled = false;

    const loadReservation = async () => {
      if (reservation || !reservationIdParam) return;

      try {
        const token = await storage.getItemAsync('userToken');
        if (!token) return;

        const response = await fetch(API_ENDPOINTS.RESERVATIONS.GET(reservationIdParam), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) return;

        const data = await response.json();
        if (cancelled) return;

        setReservationState(data);
      } catch (error) {
        console.error('Reservation fetch error:', error);
      }
    };

    loadReservation();
    return () => {
      cancelled = true;
    };
  }, [reservationIdParam, reservation]);

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
            'Content-Type': 'application/json'
          }
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
      }};
    loadPaymentInfo();
    return () => {
      cancelled = true;
    };
  }, [reservation?.id, reservation?.status]);

  useEffect(() => {
    let cancelled = false;

    const loadOwnerConnectStatus = async () => {
      const ownerId = reservation?.listing?.car?.ownerId;
      if (!ownerId) return;

      try {
        const token = await storage.getItemAsync('userToken');
        if (!token) return;

        const response = await fetch(API_ENDPOINTS.PAYMENTS.CONNECT_STATUS(ownerId), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) return;
        const status = await response.json();
        if (cancelled) return;

        setOwnerConnectStatus(status || null);
        if (!status?.cardPaymentsAvailable && paymentMethod === 'card') {
          setPaymentMethod('cash');
        }
      } catch (_error) {


        // Keep UI usable with cash even if connect status fetch fails.
      }};
    loadOwnerConnectStatus();
    return () => {
      cancelled = true;
    };
  }, [reservation?.listing?.car?.ownerId, paymentMethod]);

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
        Alert.alert(t("screens.reservations.reservationdetailsscreen.conditionsRequises"), t("screens.reservations.reservationdetailsscreen.veuillezAccepterLesConditionsGeneralesPourContinuer"));
        return;
      }

      if (!paymentMethod) {
        Alert.alert(t("screens.reservations.reservationdetailsscreen.methodeDePaiementRequise"), t("screens.reservations.reservationdetailsscreen.veuillezSelectionnerUneMethodeDePaiement"));
        return;
      }

      setLoading(true);
      const token = await storage.getItemAsync('userToken');
      if (!token) {
        Alert.alert(t("screens.reservations.reservationdetailsscreen.erreur"), t("screens.reservations.reservationdetailsscreen.authentificationRequiseVeuillezVousConnecter"));
        return;
      }

      if (paymentMethod === 'cash') {
        await handleCashPayment(token);
      } else if (paymentMethod === 'card') {
        await handleCardPayment(token);
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(t("screens.reservations.reservationdetailsscreen.erreur"), getFriendlyError(error, t));
    } finally {
      setLoading(false);
    }
  };

  const waitForPaymentConfirmation = async (token) => {
    const maxAttempts = 15;

    for (let i = 0; i < maxAttempts; i++) {
      const payment = await refreshPaymentStatus(token);

      console.log('Polling payment:', payment);

      if (
        payment?.status === 'completed' ||
        payment?.status === 'paid'
      ) {
        return {
          success: true
        };
      }

      if (payment?.status === 'failed') {
        return {
          success: false,
          failed: true
        };
      }

      // wait 2 sec
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return {
      success: false,
      timeout: true
    };
  };

  const handleCardPayment = async (token) => {
    try {
      const paymentIntentResponse = await fetch(API_ENDPOINTS.PAYMENTS.CREATE_CARD_PAYMENT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reservationId: reservation.id,
          amount: safeTotalPrice,
          currency: 'eur'
        })
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
        merchantDisplayName: t("screens.client.landingscreen.rentify"),
        paymentIntentClientSecret: paymentData.clientSecret,
        allowsDelayedPaymentMethods: false
      });

      if (initResult.error) {
        throw new Error(initResult.getFriendlyError(error, t));
      }

      // Present PaymentSheet
      const result = await presentPaymentSheet();
      if (result.error) {
        setPaymentStatus('failed');
        throw new Error(result.getFriendlyError(error, t));
      }

      setPaymentStatus('processing');

      const paymentResult = await waitForPaymentConfirmation(token);
      const goBackToPrevious = () => navigation.navigate('ReservationsTab', { screen: 'ReservationDetails', params: { reservationId: reservation.id } });

      if (paymentResult.success) {
        setPaymentStatus('held_in_escrow');
        setJustCompletedCardPayment(true);
        Alert.alert(t("screens.reservations.reservationdetailsscreen.paiementSecurise"), t("screens.reservations.reservationdetailsscreen.votrePaiementEstMaintenantSecuriseEnEscrow"),


        [
        {
          text: 'OK',
          onPress: () => refreshPaymentStatus(token)
        }]

        );
        return;
      }

      if (paymentResult.failed) {
        setPaymentStatus('failed');
        throw new Error('Le paiement a échoué. Veuillez réessayer.');
      }

      setPaymentStatus('pending');
      Alert.alert(t("screens.reservations.reservationdetailsscreen.paiementEnCours"), t("screens.reservations.reservationdetailsscreen.lePaiementEstToujoursEnCoursDe")


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
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reservationId: reservation.id,
          amount: safeTotalPrice
        })
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

      Alert.alert(t("screens.reservations.reservationdetailsscreen.reservationConfirmee"), t("screens.reservations.reservationdetailsscreen.votreReservationEstConfirmeeLePaiementEn"),


      [
      {
        text: 'OK',
        onPress: () => goToReservations()
      }]

      );
    } catch (error) {
      console.error('Cash payment error:', error);
      throw error;
    }
  };

  const handleConfirmHandover = async () => {
    try {
      const token = await storage.getItemAsync('userToken');
      if (!token) {
        Alert.alert(t("screens.reservations.reservationdetailsscreen.erreur"), t("screens.reservations.reservationdetailsscreen.authentificationRequiseVeuillezVousConnecter"));
        return;
      }

      const response = await fetch(API_ENDPOINTS.RESERVATIONS.CONFIRM_HANDOVER(reservation.id), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Impossible de confirmer la remise');
      }

      setPaymentStatus('released');
      setPaymentInfo((prev) => ({ ...(prev || {}), status: 'released' }));
      Alert.alert(t("screens.reservations.reservationdetailsscreen.succes"), t("screens.reservations.reservationdetailsscreen.laRemiseDuVehiculeAEteConfirmee"));
    } catch (error) {
      Alert.alert(t("screens.reservations.reservationdetailsscreen.erreur"), getFriendlyError(error, t));
    }
  };

  const handleDisputeHandover = async () => {
    try {
      const token = await storage.getItemAsync('userToken');
      if (!token) {
        Alert.alert(t("screens.reservations.reservationdetailsscreen.erreur"), t("screens.reservations.reservationdetailsscreen.authentificationRequiseVeuillezVousConnecter"));
        return;
      }

      const response = await fetch(API_ENDPOINTS.RESERVATIONS.DISPUTE(reservation.id), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'client_reported_issue' })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Impossible de déclarer un litige');
      }

      setPaymentStatus('disputed');
      setPaymentInfo((prev) => ({ ...(prev || {}), status: 'disputed' }));
      Alert.alert(t("screens.reservations.reservationdetailsscreen.litigeEnregistre"), t("screens.reservations.reservationdetailsscreen.lePaiementResteBloqueJusquaLaResolution"));
    } catch (error) {
      Alert.alert(t("screens.reservations.reservationdetailsscreen.erreur"), getFriendlyError(error, t));
    }
  };

  const formatPrice = (value) => value.toLocaleString(getCurrentLocale());
  const formatDate = (date) => new Date(date).toLocaleDateString(getCurrentLocale());

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

  const canLeaveReview = reservation?.status === 'finished';
  const canAddAnotherReview = canLeaveReview && (Array.isArray(reviews) ? reviews.length : 0) < 5;

  const fetchReview = useCallback(async () => {
    if (!reservation?.id) return;
    try {
      setReviewLoading(true);
      const token = await storage.getItemAsync('userToken');
      if (!token) return;

      const res = await fetch(API_ENDPOINTS.REVIEWS.RESERVATION_GET(reservation.id), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors du chargement de l’avis');
      }
      const json = await res.json();
      setReviews(Array.isArray(json) ? json : json ? [json] : []);
    } catch (e) {
      console.error('fetchReview error:', e);
    } finally {
      setReviewLoading(false);
    }
  }, [reservation?.id]);

  const submitReview = useCallback(
    async ({ rating, comment }) => {
      if (!reservation?.id) return;
      try {
        setReviewSubmitting(true);
        const token = await storage.getItemAsync('userToken');
        if (!token) {
          Alert.alert(t("screens.reservations.reservationdetailsscreen.erreur"), t("screens.reservations.reservationdetailsscreen.veuillezVousReconnecter"));
          return;
        }

        const res = await fetch(API_ENDPOINTS.REVIEWS.RESERVATION_CREATE(reservation.id), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ rating, comment })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Erreur lors de l’envoi de l’avis');
        }

        const json = await res.json();
        setReviews((prev) => [json, ...(Array.isArray(prev) ? prev : [])].filter(Boolean));
        setReviewModalOpen(false);
        Alert.alert(t("screens.reservations.reservationdetailsscreen.merci"), t("screens.reservations.reservationdetailsscreen.votreAvisAEteEnvoye"));
      } catch (e) {
        console.error('submitReview error:', e);
        Alert.alert(t("screens.reservations.reservationdetailsscreen.erreur"), getFriendlyError(e, t));
      } finally {
        setReviewSubmitting(false);
      }
    },
    [reservation?.id]
  );

  useFocusEffect(
    useCallback(() => {
      fetchReview();
    }, [fetchReview])
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          onPress={goToReservations}
          style={styles.backButton}>
          
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("screens.reservations.reservationdetailsscreen.recapitulatif")}</Text>
        <View style={{ width: 50 }} />
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never">
        

        {/* Vehicle Card */}
        <View style={styles.vehicleCard}>
          {imageUri ?
          <ImageBackground
            source={{ uri: imageUri }}
            style={styles.vehicleImage}
            imageStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
            
              <View style={styles.imageOverlay} />
            </ImageBackground> :

          <View style={[styles.vehicleImage, styles.vehicleImagePlaceholder]}>
              <Ionicons name="car-outline" size={50} color="#8f6cff" />
            </View>
          }

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
                <Text style={styles.metaText}>{seats}{t("screens.reservations.reservationdetailsscreen.places")}</Text>
              </View>
            </View>

          </View>
        </View>

        {/* Dates Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithButton}>
            <Text style={styles.sectionTitle}>{t("screens.reservations.reservationdetailsscreen.periodeDeLocation")}</Text>
            {isReservationActive &&
            <TouchableOpacity
              onPress={handleEditDates}
              disabled={actionLoading !== null}
              activeOpacity={0.8}>
              
                <LinearGradient
                colors={['#a566ff', '#8f6cff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.editDateButton}>
                
                  <Ionicons name="pencil-outline" size={16} color="#fff" />
                  <Text style={styles.editDateButtonText}>{t("screens.reservations.reservationdetailsscreen.modifier")}</Text>
                </LinearGradient>
              </TouchableOpacity>
            }
          </View>
          
          <View style={styles.datesContainer}>
            <View style={styles.dateBox}>
              <Text style={styles.dateBoxLabel}>{t("screens.reservations.reservationdetailsscreen.depart")}</Text>
              <Text style={styles.dateBoxValue}>{formatDate(startDate)}</Text>
              <Text style={styles.dateBoxTime}>08:00</Text>
            </View>

            <View style={styles.dateSeparator}>
              <View style={styles.dateSeparatorLine} />
              <Text style={styles.dateSeparatorDays}>{totalDays}{t("screens.reservations.reservationdetailsscreen.j")}</Text>
              <View style={styles.dateSeparatorLine} />
            </View>

            <View style={styles.dateBox}>
              <Text style={styles.dateBoxLabel}>{t("screens.reservations.reservationdetailsscreen.retour")}</Text>
              <Text style={styles.dateBoxValue}>{formatDate(endDate)}</Text>
              <Text style={styles.dateBoxTime}>18:00</Text>
            </View>
          </View>
        </View>

        {/* Driver Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("screens.reservations.reservationdetailsscreen.informationsDuConducteur")}</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("screens.reservations.reservationdetailsscreen.nomComplet")}</Text>
              <Text style={styles.infoValue}>
                {account?.firstName || account?.first_name || account?.lastName || account?.last_name ?
                `${account?.firstName || account?.first_name || ''} ${account?.lastName || account?.last_name || ''}`.trim() :
                '—'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("screens.reservations.reservationdetailsscreen.telephone")}</Text>
              <Text style={styles.infoValue}>{account?.phone || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Conditions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("screens.reservations.reservationdetailsscreen.conditionsDeLocation")}</Text>
          
          <View style={styles.conditionsList}>
            <View style={styles.conditionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#23d49f" />
              <View style={styles.conditionContent}>
                <Text style={styles.conditionTitle}>{t("screens.reservations.reservationdetailsscreen.assuranceIncluse")}</Text>
                <Text style={styles.conditionDesc}>{t("screens.reservations.reservationdetailsscreen.couvertureComplete")}</Text>
              </View>
            </View>

            <View style={styles.conditionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#23d49f" />
              <View style={styles.conditionContent}>
                <Text style={styles.conditionTitle}>{t("screens.reservations.reservationdetailsscreen.kilometrageIllimite")}</Text>
                <Text style={styles.conditionDesc}>{t("screens.reservations.reservationdetailsscreen.aucuneLimiteDeKm")}</Text>
              </View>
            </View>

            <View style={styles.conditionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#23d49f" />
              <View style={styles.conditionContent}>
                <Text style={styles.conditionTitle}>{t("screens.reservations.reservationdetailsscreen.assistance247")}</Text>
                <Text style={styles.conditionDesc}>{t("screens.reservations.reservationdetailsscreen.supportDisponible")}</Text>
              </View>
            </View>
          </View>
        </View>

        {reservation?.status === 'pickup_pending' &&
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("screens.reservations.reservationdetailsscreen.recuperation")}</Text>
            <TouchableOpacity
            onPress={() => navigation.navigate('PickupCode', { reservationId: reservation.id, flow: 'pickup' })}
            activeOpacity={0.85}
            style={styles.pickupActionWrap}>
            
              <LinearGradient
              colors={['#4C6FFF', COLORS.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.pickupAction}>
              
                <Ionicons name="key-outline" size={18} color="#fff" />
                <Text style={styles.pickupActionText}>{t("screens.reservations.reservationdetailsscreen.voirLeCodeDeRecuperation")}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.pickupHintText}>{t("screens.reservations.reservationdetailsscreen.disponibleUniquementDansLes24hAvantLe")}

          </Text>
          </View>
        }

        {reservation?.status === 'return_pending' &&
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("screens.reservations.reservationdetailsscreen.retour")}</Text>
            <TouchableOpacity
            onPress={() => navigation.navigate('ReturnVerify', { reservationId: reservation.id, flow: 'return' })}
            activeOpacity={0.85}
            style={styles.pickupActionWrap}>
            
              <LinearGradient
              colors={['#4C6FFF', COLORS.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.pickupAction}>
              
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.pickupActionText}>{t("screens.reservations.reservationdetailsscreen.verifierLeQrCodeDeRetour")}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.pickupHintText}>{t("screens.reservations.reservationdetailsscreen.disponibleUniquementDansLes24hAvantLa")}

          </Text>
          </View>
        }

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("screens.reservations.reservationdetailsscreen.detailDuPrix")}</Text>
          
          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceRowLabel}>
                {totalDays}{t("screens.reservations.reservationdetailsscreen.jour")}
                {totalDays > 1 ? 's' : ''}
              </Text>
              <Text style={styles.priceRowValue}>
                {Math.round(rentalSubtotal).toLocaleString(getCurrentLocale())}{t("screens.reservations.reservationdetailsscreen.da")}
              </Text>
            </View>

            <View style={styles.dividerSmall} />

            <View style={styles.priceRow}>
              <Text style={styles.priceRowLabel}>{t("screens.reservations.reservationdetailsscreen.fraisDeLivraison")}</Text>
              <Text style={styles.priceRowValue}>
                {Math.round(deliveryFee).toLocaleString(getCurrentLocale())}{t("screens.reservations.reservationdetailsscreen.da")}
              </Text>
            </View>

            <View style={styles.dividerSmall} />

            <View style={styles.priceRow}>
              <Text style={styles.priceRowLabel}>{t("screens.reservations.reservationdetailsscreen.fraisDeService")}</Text>
              <Text style={styles.priceRowValue}>
                {serviceFee.toLocaleString(getCurrentLocale())}{t("screens.reservations.reservationdetailsscreen.da")}
              </Text>
            </View>

            <View style={styles.dividerSmall} />

            <View style={[styles.priceRow, styles.totalPriceRow]}>
              <Text style={styles.totalPriceLabel}>{t("screens.reservations.reservationdetailsscreen.prixTotal")}</Text>
              <Text style={styles.totalPriceValue}>
                {formatPrice(safeTotalPrice)}{t("screens.reservations.reservationdetailsscreen.da")}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Status Display */}
        {paymentStatus && paymentInfo &&
        <PaymentStatusDisplay
          status={paymentStatus}
          amount={safeTotalPrice}
          paymentMethod={paymentMethod} />

        }

        {justCompletedCardPayment && paymentStatus === 'held_in_escrow' &&
        <View style={styles.escrowInfoCard}>
            <Text style={styles.escrowInfoTitle}>{t("screens.reservations.reservationdetailsscreen.paiementConfirme")}</Text>
            <Text style={styles.escrowInfoText}>{t("screens.reservations.reservationdetailsscreen.votrePaiementEstSecuriseEnEscrowRendez")}
            <Text style={styles.escrowInfoStrong}>{t("screens.reservations.reservationdetailsscreen.mesReservations")}</Text>{t("screens.reservations.reservationdetailsscreen.pourConfirmerLaRemiseDuVehiculeUne")}
          </Text>
            <TouchableOpacity onPress={goToReservationDetailsFromReservations} activeOpacity={0.85} style={styles.escrowInfoButton}>
              <Text style={styles.escrowInfoButtonText}>{t("screens.reservations.reservationdetailsscreen.voirMaReservation")}</Text>
            </TouchableOpacity>
          </View>
        }

        {showConfirmHandoverButton &&
        <View style={styles.escrowActionCard}>
            <Text style={styles.escrowActionTitle}>{t("screens.reservations.reservationdetailsscreen.paiementSecuriseEnEscrow")}</Text>
            <Text style={styles.escrowActionText}>{t("screens.reservations.reservationdetailsscreen.confirmezSeulementQuandVousAvezBienRecu")}

          </Text>
            <View style={styles.escrowActionRow}>
              <TouchableOpacity onPress={handleDisputeHandover} activeOpacity={0.85} style={styles.escrowGhostButton}>
                <Text style={styles.escrowGhostButtonText}>{t("screens.reservations.reservationdetailsscreen.signalerUnLitige")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmHandover} activeOpacity={0.85} style={styles.escrowPrimaryButton}>
                <Text style={styles.escrowPrimaryButtonText}>{t("screens.reservations.reservationdetailsscreen.confirmerCarRecu")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        }

        {/* Payment Method Selector */}
        {showPaymentMethodSelector &&
        <PaymentMethodSelector
          selectedMethod={paymentMethod}
          onMethodSelect={setPaymentMethod}
          isCardEnabled={isCardEnabledForOwner}
          disabledCardReason={disabledCardReason} />

        }

        {/* Review Section (finished reservations) */}
        {canLeaveReview && reservation?.status !== 'cancelled' &&
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("screens.reservations.reservationdetailsscreen.avis")}</Text>
            {reviewLoading ?
          <View style={styles.reviewLoadingRow}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.reviewLoadingText}>{t("screens.reservations.reservationdetailsscreen.chargement")}</Text>
              </View> :
          Array.isArray(reviews) && reviews.length ?
          <View style={{ marginTop: 6 }}>
                {reviews.map((r) =>
            <ReviewCard key={r.id} review={r} />
            )}
              </View> :
          null}

            {!reviewLoading && canAddAnotherReview ?
          <>
                <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setReviewModalOpen(true)}
              style={styles.reviewButtonWrap}>
              
                  <LinearGradient
                colors={[COLORS.secondary, COLORS.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.reviewButton}>
                
                    <Ionicons name="chatbox-ellipses-outline" size={18} color="#fff" />
                    <Text style={styles.reviewButtonText}>{t("screens.reservations.reservationdetailsscreen.donnerMonAvis")}</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={styles.reviewLimitHint}>
                  {5 - (Array.isArray(reviews) ? reviews.length : 0)}{t("screens.reservations.reservationdetailsscreen.avisRestantS")}
            </Text>

                <Modal
              visible={reviewModalOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setReviewModalOpen(false)}>
              
                  <View style={styles.reviewModalBackdrop}>
                    <View style={styles.reviewModalCard}>
                      <View style={styles.reviewModalHeader}>
                        <Text style={styles.reviewModalTitle}>{t("screens.reservations.reservationdetailsscreen.votreAvis")}</Text>
                        <TouchableOpacity
                      onPress={() => setReviewModalOpen(false)}
                      activeOpacity={0.8}
                      style={styles.reviewModalClose}
                      disabled={reviewSubmitting}>
                      
                          <Ionicons name="close" size={22} color="#fff" />
                        </TouchableOpacity>
                      </View>
                      <ReviewForm submitting={reviewSubmitting} onSubmit={submitReview} />
                    </View>
                  </View>
                </Modal>
              </> :
          !reviewLoading && canLeaveReview && !canAddAnotherReview ?
          <Text style={styles.reviewLimitReachedText}>{t("screens.reservations.reservationdetailsscreen.limiteAtteinte5Avis")}</Text> :
          null}
          </View>
        }

      {/* Terms & Conditions */}
      {showTermsSection &&
        <View style={styles.termsSection}>
          <TouchableOpacity
            onPress={() => setTermsAccepted((v) => !v)}
            activeOpacity={0.8}
            style={styles.termsCheckbox}>
            
            <Ionicons
              name={termsAccepted ? 'checkbox' : 'square-outline'}
              size={20}
              color={termsAccepted ? '#23d49f' : '#a566ff'} />
            
            <Text style={styles.termsText}>{t("screens.reservations.reservationdetailsscreen.jaccepteLes")}
              {' '}
              <Text style={styles.termsLink}>{t("screens.reservations.reservationdetailsscreen.conditionsGenerales")}</Text>{t("screens.reservations.reservationdetailsscreen.etLa")}
              <Text style={styles.termsLink}>{t("screens.reservations.reservationdetailsscreen.politiqueDeConfidentialite")}</Text>
            </Text>
          </TouchableOpacity>
        </View>
        }


        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Payment Button */}
      {showActionBar &&
      <View style={styles.paymentBar}>
          <TouchableOpacity
          onPress={handleCancelReservation}
          disabled={actionLoading !== null}
          activeOpacity={0.8}
          style={styles.cancelButtonWrapper}>
          
            <LinearGradient
            colors={['#ff6b6b', '#ee5a52']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
            styles.paymentCancelButton,
            actionLoading === 'cancel' && styles.actionButtonLoading]
            }>
            
              {actionLoading === 'cancel' ?
            <ActivityIndicator color="#fff" size="small" /> :

            <>
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>{t("screens.reservations.reservationdetailsscreen.annuler")}</Text>
                </>
            }
            </LinearGradient>
          </TouchableOpacity>

          {showPayButton &&
        <TouchableOpacity
          onPress={handlePayment}
          disabled={
          loading ||
          !paymentMethod ||
          !termsAccepted && !canResumePendingCardPayment
          }
          style={[
          styles.paymentButtonWrapper,
          !termsAccepted && !canResumePendingCardPayment || loading || !paymentMethod ? styles.paymentButtonWrapperDisabled : null]
          }>
          
              <LinearGradient
            colors={!termsAccepted || loading || !paymentMethod ? ['#3a3f66', '#2b2f52'] : [COLORS.secondary, COLORS.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.paymentButton}>
            
                {loading ?
            <ActivityIndicator color="#fff" size="small" /> :

            <Text style={styles.paymentButtonText}>
                    {paymentButtonLabel}
                  </Text>
            }
              </LinearGradient>
            </TouchableOpacity>
        }
        </View>
      }
    </View>);

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1228'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#151837',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 156, 233, 0.2)'
  },
  backButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    color: '#f6f8ff',
    fontSize: 18,
    fontWeight: '700'
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#0f1228'
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 140
  },
  vehicleCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#151837',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)'
  },
  vehicleImage: {
    height: 200,
    backgroundColor: '#0f1228',
    justifyContent: 'center',
    alignItems: 'center'
  },
  vehicleImagePlaceholder: {
    backgroundColor: 'rgba(143, 108, 255, 0.1)'
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)'
  },
  vehicleInfo: {
    padding: 16
  },
  vehicleBrand: {
    color: '#8e95bf',
    fontSize: 12,
    marginBottom: 4
  },
  vehicleModel: {
    color: '#f6f8ff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12
  },
  vehicleSpecs: {
    flexDirection: 'row',
    gap: 8
  },
  specBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(143, 108, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  specText: {
    color: '#a566ff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4
  },
  vehicleMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    marginBottom: 8
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metaText: {
    color: '#8e95bf',
    fontSize: 13,
    fontWeight: '500'
  },
  paymentButtonWrapperDisabled: {
    opacity: 0.75
  },
  section: {
    marginBottom: 24
  },
  pickupActionWrap: {
    marginTop: 6
  },
  pickupAction: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  pickupActionText: {
    color: '#fff',
    fontWeight: '900'
  },
  pickupHintText: {
    marginTop: 10,
    color: '#8e95bf',
    fontSize: 12,
    lineHeight: 16
  },
  sectionTitle: {
    color: '#f6f8ff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12
  },
  sectionHeaderWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  editDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  editDateButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600'
  },
  datesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  dateBox: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)',
    alignItems: 'center'
  },
  dateBoxLabel: {
    color: '#8e95bf',
    fontSize: 12,
    marginBottom: 4
  },
  dateBoxValue: {
    color: '#f6f8ff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4
  },
  dateBoxTime: {
    color: '#a566ff',
    fontSize: 11,
    fontWeight: '600'
  },
  dateSeparator: {
    alignItems: 'center',
    gap: 4
  },
  dateSeparatorLine: {
    width: 20,
    height: 1,
    backgroundColor: 'rgba(148, 156, 233, 0.2)'
  },
  dateSeparatorDays: {
    color: '#a566ff',
    fontSize: 12,
    fontWeight: '700'
  },
  infoCard: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)'
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  infoLabel: {
    color: '#8e95bf',
    fontSize: 14
  },
  infoValue: {
    color: '#f6f8ff',
    fontSize: 14,
    fontWeight: '600'
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(148, 156, 233, 0.1)',
    marginHorizontal: 16
  },
  dividerSmall: {
    height: 1,
    backgroundColor: 'rgba(148, 156, 233, 0.1)',
    marginVertical: 8
  },
  conditionsList: {
    gap: 12
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(35, 212, 159, 0.1)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(35, 212, 159, 0.2)'
  },
  conditionContent: {
    flex: 1
  },
  conditionTitle: {
    color: '#f6f8ff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2
  },
  conditionDesc: {
    color: '#8e95bf',
    fontSize: 12
  },
  priceBreakdown: {
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)'
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  priceRowLabel: {
    color: '#8e95bf',
    fontSize: 14
  },
  priceRowValue: {
    color: '#f6f8ff',
    fontSize: 14,
    fontWeight: '600'
  },
  totalPriceRow: {
    marginTop: 8,
    paddingTop: 8
  },
  totalPriceLabel: {
    color: '#f6f8ff',
    fontSize: 16,
    fontWeight: '700'
  },
  totalPriceValue: {
    color: '#a566ff',
    fontSize: 20,
    fontWeight: '800'
  },
  termsSection: {
    backgroundColor: 'rgba(143, 108, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(143, 108, 255, 0.1)'
  },
  reviewLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8
  },
  reviewLoadingText: {
    color: '#8e95bf',
    fontSize: 13,
    fontWeight: '600'
  },
  reviewNotReadyText: {
    color: '#8e95bf',
    fontSize: 13,
    lineHeight: 18
  },
  reviewLimitHint: {
    marginTop: 8,
    color: '#8e95bf',
    fontSize: 12,
    fontWeight: '600'
  },
  reviewLimitReachedText: {
    color: '#8e95bf',
    fontSize: 13,
    lineHeight: 18
  },
  reviewButtonWrap: {
    marginTop: 4
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    borderRadius: 12
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900'
  },
  reviewModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 16,
    justifyContent: 'center'
  },
  reviewModalCard: {
    borderRadius: 16,
    backgroundColor: '#0f1228',
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)',
    padding: 14
  },
  reviewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  reviewModalTitle: {
    color: '#f6f8ff',
    fontSize: 16,
    fontWeight: '900'
  },
  reviewModalClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(148, 156, 233, 0.12)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  termsText: {
    flex: 1,
    color: '#8e95bf',
    fontSize: 12,
    lineHeight: 18
  },
  termsLink: {
    color: '#a566ff',
    fontWeight: '600'
  },
  escrowActionCard: {
    backgroundColor: 'rgba(79, 140, 255, 0.12)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(79, 140, 255, 0.22)'
  },
  escrowActionTitle: {
    color: '#f6f8ff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8
  },
  escrowActionText: {
    color: '#c9d2ff',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14
  },
  escrowActionRow: {
    flexDirection: 'row',
    gap: 10
  },
  escrowGhostButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(246,248,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)'
  },
  escrowGhostButtonText: {
    color: '#f6f8ff',
    fontSize: 13,
    fontWeight: '700'
  },
  escrowPrimaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#23d49f'
  },
  escrowPrimaryButtonText: {
    color: '#0d1227',
    fontSize: 13,
    fontWeight: '800'
  },
  escrowInfoCard: {
    backgroundColor: 'rgba(35, 212, 159, 0.10)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(35, 212, 159, 0.22)'
  },
  escrowInfoTitle: {
    color: '#f6f8ff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8
  },
  escrowInfoText: {
    color: '#c9d2ff',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12
  },
  escrowInfoStrong: {
    color: '#ffffff',
    fontWeight: '800'
  },
  escrowInfoButton: {
    backgroundColor: '#23d49f',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  escrowInfoButtonText: {
    color: '#0d1227',
    fontWeight: '900'
  },
  actionButtonsSection: {
    marginBottom: 24,
    paddingHorizontal: 8
  },
  actionSectionTitle: {
    color: '#f6f8ff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 8
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12
  },
  actionButtonWrapper: {
    flex: 1
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  },
  actionButtonLoading: {
    opacity: 0.9
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
    paddingVertical: 12
  },
  cancelButtonWrapper: {
    flex: 0
  },
  paymentCancelButton: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  paymentLabel: {
    color: '#8e95bf',
    fontSize: 12
  },
  paymentAmount: {
    color: '#a566ff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4
  },
  paymentButtonWrapper: {
    flex: 1
  },
  paymentButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800'
  }
});

export default ReservationDetailsScreen;
