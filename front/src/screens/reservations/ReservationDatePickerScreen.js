import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import storage from '../../utils/storage';
import CustomCalendar from '../../components/reservation/CustomCalendar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';
import { getUserDocuments } from '../../services/owner';
import {
  parseLocalDate,
  formatLocalYmd,
  calculateReservationPrice,
  fetchListingAvailability,
  getListingAvailabilityWindow,
  isDateWithinAvailability,
  isDateReserved,
} from '../../utils/reservationUtils';
import { useTranslation } from 'react-i18next';
import { getCurrentLocale } from '../../i18n';

const ReservationDatePickerScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const DELIVERY_ADDRESS_REGEX = /^\d+\s+[A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Za-zÀ-ÿ'’.-]+)*\s+\d{4,5}\s+[A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Za-zÀ-ÿ'’.-]+)*$/u;
  const {
    listing: initialListing,
    selectedCity: selectedCityFromParams,
    reservation: reservationFromParams,
    isEditing,
  } = route.params;
  const [listing, setListing] = useState(initialListing);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [markedDates, setMarkedDates] = useState({});
  const [reservedDates, setReservedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [pickupMethod, setPickupMethod] = useState('owner_place');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [verificationState, setVerificationState] = useState({
    loading: true,
    verified: false,
    status: 'loading',
    document: null,
  });
  const selectedCity = selectedCityFromParams || initialListing?.city || '';

  const pickLatestDocument = (documents = []) =>
    [...documents].sort((a, b) => {
      const aTime = new Date(a?.updatedAt || a?.createdAt || a?.updated_at || a?.created_at || 0).getTime();
      const bTime = new Date(b?.updatedAt || b?.createdAt || b?.updated_at || b?.created_at || 0).getTime();
      return bTime - aTime;
    })[0] || null;

  const loadClientVerification = async () => {
    try {
      const token = await storage.getItemAsync('userToken');
      if (!token) {
        setVerificationState({ loading: false, verified: false, status: 'error', document: null });
        return;
      }

      let userId = '';
      let role = '';

      const cachedProfile = await storage.getItemAsync('userProfile');
      if (cachedProfile) {
        try {
          const parsed = JSON.parse(cachedProfile);
          userId = parsed?.id || '';
          role = String(parsed?.role || '').toLowerCase();
        } catch {
          // ignore cached parsing errors
        }
      }

      if (!userId) {
        const meResponse = await fetch(API_ENDPOINTS.AUTH.ME, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (meResponse.ok) {
          const meData = await meResponse.json().catch(() => ({}));
          userId = meData?.user?.id || '';
          role = String(meData?.user?.role || '').toLowerCase();
        }
      }

      if (!userId || role !== 'client') {
        setVerificationState({ loading: false, verified: true, status: 'not_required', document: null });
        return;
      }

      const docs = await getUserDocuments({
        token,
        userId,
        documentType: 'driver_license',
      });
      const latest = pickLatestDocument((Array.isArray(docs) ? docs : []).filter((doc) => doc.documentType === 'driver_license'));
      const verified = String(latest?.status || '').toLowerCase() === 'approved';
      setVerificationState({
        loading: false,
        verified,
        status: verified ? 'verified' : 'unverified',
        document: latest || null,
      });
    } catch {
      setVerificationState({ loading: false, verified: false, status: 'error', document: null });
    }
  };

  // Fetch full listing details and reserved dates
  useEffect(() => {
    fetchListingDetails();
  }, [initialListing.id, reservationFromParams?.id]);

  useEffect(() => {
    loadClientVerification();
  }, [initialListing.id]);

  // When editing an existing reservation, preload the current dates as the initial draft selection.
  useEffect(() => {
    if (!reservationFromParams) return;
    const existingStart =
      reservationFromParams.startDate ||
      reservationFromParams.start_date ||
      reservationFromParams.start_date?.split?.('T')?.[0] ||
      null;
    const existingEnd =
      reservationFromParams.endDate ||
      reservationFromParams.end_date ||
      reservationFromParams.end_date?.split?.('T')?.[0] ||
      null;
    if (existingStart) setStartDate(existingStart);
    if (existingEnd) setEndDate(existingEnd);
    setPickupMethod(
      reservationFromParams?.pickup?.pickupMethod ||
      reservationFromParams?.pickup?.pickup_method ||
      'owner_place'
    );
    setDeliveryAddress(
      reservationFromParams?.pickup?.pickupAddress ||
      reservationFromParams?.pickup?.pickup_address ||
      ''
    );
    if (existingStart && existingEnd) calculatePrice(existingStart, existingEnd);
  }, [isEditing, reservationFromParams]);

  // Keep highlighted range in sync with user selection
  useEffect(() => {
    updateMarkedDates(startDate, endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) calculatePrice(startDate, endDate);
  }, [pickupMethod]);

  const fetchListingDetails = async () => {
    try {
      console.log('Initial listing:', initialListing);
      console.log('Fetching from:', API_ENDPOINTS.LISTINGS.GET(initialListing.id));

      const token = await storage.getItemAsync('userToken');
      const response = await fetch(
        API_ENDPOINTS.LISTINGS.GET(initialListing.id),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      console.log('Listing fetch response status:', response.status);
      const data = await response.json();
      console.log('API returned data:', data);

      if (data) {
        setListing((current) => ({
          ...current,
          ...data,
          // Keep the UI-friendly flattened shape while still storing the raw payload.
          brand: data?.car?.brand ?? current?.brand,
          model: data?.car?.model ?? current?.model,
          year: data?.car?.year ?? current?.year,
          fuel: data?.car?.fuelType ?? current?.fuel,
          transmission: data?.car?.transmission ?? current?.transmission,
          seats: data?.car?.seats ?? current?.seats,
          mileageKm: data?.car?.mileage ?? current?.mileageKm,
          image:
            data?.car?.images?.find((img) => img?.isPrimary && img?.imageUrl)?.imageUrl ||
            data?.car?.images?.find((img) => img?.imageUrl)?.imageUrl ||
            current?.image,
          availableFrom: data?.availableFrom ?? data?.available_from ?? current?.availableFrom ?? current?.available_from,
          availableTo: data?.availableTo ?? data?.available_to ?? current?.availableTo ?? current?.available_to,
        }));
        console.log('Listing state updated');
      }
    } catch (error) {
      console.error('Error fetching listing details:', error);
    }

    // Fetch calendar availability (blocked dates + listing dates)
    try {
      const availability = await fetchListingAvailability(initialListing.id);
      const blocked = availability.blockedDates || [];

      if (isEditing && reservationFromParams) {
        const existingStart =
          reservationFromParams.startDate ||
          reservationFromParams.start_date ||
          reservationFromParams.start_date?.split?.('T')?.[0] ||
          null;
        const existingEnd =
          reservationFromParams.endDate ||
          reservationFromParams.end_date ||
          reservationFromParams.end_date?.split?.('T')?.[0] ||
          null;

        if (existingStart && existingEnd) {
          const excluded = new Set();
          const current = parseLocalDate(existingStart);
          const endLocal = parseLocalDate(existingEnd);
          if (current && endLocal) {
            while (current <= endLocal) {
              const dateStr = formatLocalYmd(current);
              if (dateStr) excluded.add(dateStr);
              current.setDate(current.getDate() + 1);
            }
          }
          setReservedDates(blocked.filter((d) => !excluded.has(d)));
        } else {
          setReservedDates(blocked);
        }
      } else {
        setReservedDates(blocked);
      }
    } catch (error) {
      console.error('Error fetching calendar availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayPress = (day) => {
    const dateStr = day.dateString;
    const pressedDate = parseLocalDate(dateStr);
    if (!pressedDate) return;

    // Can't select past dates
    const todayLocal = new Date();
    todayLocal.setHours(0, 0, 0, 0);
    if (pressedDate < todayLocal) {
      Alert.alert(t('screens.reservations.reservationdatepickerscreen.dateInvalide'), t('screens.reservations.reservationdatepickerscreen.vousNePouvezPasSelectionnerUneDate'));
      return;
    }

    // Can't select reserved dates
    if (isDateReserved(dateStr, reservedDates)) {
      Alert.alert(t('screens.reservations.reservationdatepickerscreen.dateIndisponible'), t('screens.reservations.reservationdatepickerscreen.cetteDateEstDejaReservee'));
      return;
    }

    // Check if date is within listing's availability window
    if (!isDateWithinAvailability(dateStr, listing)) {
      Alert.alert(t('screens.reservations.reservationdatepickerscreen.dateIndisponible'), t('screens.reservations.reservationdatepickerscreen.cetteDateEstEnDehorsDeLa'));
      return;
    }

    if (!startDate) {
      setStartDate(dateStr);
    } else if (!endDate) {
      const startLocal = parseLocalDate(startDate);
      if (startLocal && pressedDate < startLocal) {
        Alert.alert(t('screens.reservations.reservationdatepickerscreen.erreur'), t('screens.reservations.reservationdatepickerscreen.laDateDeFinDoitEtreApres'));
        return;
      }
      setEndDate(dateStr);
      calculatePrice(startDate, dateStr);
    } else {
      // Reset selection
      setStartDate(dateStr);
      setEndDate(null);
      setEstimatedPrice(0);
    }
  };

  const updateMarkedDates = (start, end) => {
    const marked = {};

    if (start) {
      marked[start] = {
        selected: true,
        startingDay: true,
        endingDay: !end,
      };
    }

    if (end) {
      marked[end] = {
        selected: true,
        endingDay: true,
      };

      const current = parseLocalDate(start);
      const endLocal = parseLocalDate(end);
      if (!current || !endLocal) {
        setMarkedDates(marked);
        return;
      }

      while (current < endLocal) {
        current.setDate(current.getDate() + 1);
        const dateStr = formatLocalYmd(current);
        if (!dateStr) continue;
        if (dateStr !== end) {
          marked[dateStr] = {
            inRange: true,
          };
        }
      }
    }

    setMarkedDates(marked);
  };

  const calculatePrice = (start, end) => {
    const deliveryFee = Number(listing?.deliveryFee ?? listing?.delivery_fee ?? 0);
    const price = calculateReservationPrice(listing, start, end, {
      deliveryFee: pickupMethod === 'renter_delivery' ? deliveryFee : 0,
    });
    setEstimatedPrice(price);
  };

  const goToReservationDetails = (reservationData) => {
    const parent = navigation.getParent?.();
    const navigator = parent?.navigate ? parent : navigation;
    if (navigator === parent) {
      parent.navigate('ReservationsTab', {
        screen: 'ReservationDetailsFromReservations',
        params: { reservation: reservationData, listing },
      });
      return;
    }
    navigation.navigate('ReservationDetailsFromReservations', { reservation: reservationData, listing });
  };

  const handlePrimaryAction = async () => {
    if (verificationState.status === 'unverified') {
      Alert.alert(
        t('screens.reservations.reservationdatepickerscreen.verificationRequiredTitle'),
        t('screens.reservations.reservationdatepickerscreen.verificationRequiredMessage'),
        [
          { text: t('screens.reservations.reservationdatepickerscreen.annuler'), style: 'cancel' },
          {
            text: t('screens.reservations.reservationdatepickerscreen.goToProfile'),
            onPress: () => {
              const parent = navigation.getParent?.();
              if (parent?.navigate) {
                parent.navigate('ProfileTab', { screen: 'Profile' });
                return;
              }
              navigation.navigate('Profile');
            },
          },
        ]
      );
      return;
    }

    if (!startDate || !endDate) {
      Alert.alert(t('screens.reservations.reservationdatepickerscreen.erreur'), t('screens.reservations.reservationdatepickerscreen.veuillezSelectionnerUnePlageDeDates'));
      return;
    }

    if (pickupMethod === 'renter_delivery' && !deliveryAddress.trim()) {
      Alert.alert(t('screens.reservations.reservationdatepickerscreen.adresseRequise'), t('screens.reservations.reservationdatepickerscreen.veuillezSaisirVotreAdresseDeLivraison'));
      return;
    }

    if (pickupMethod === 'renter_delivery' && !DELIVERY_ADDRESS_REGEX.test(deliveryAddress.trim())) {
      Alert.alert(
        t('screens.reservations.reservationdatepickerscreen.adresseInvalide'),
        t('screens.reservations.reservationdatepickerscreen.leFormatAttenduEst12RueExemple')
      );
      return;
    }

    try {
      setLoading(true);
      const token = await storage.getItemAsync('userToken');
      if (!token) {
        Alert.alert(t('screens.reservations.reservationdatepickerscreen.erreur'), t('screens.reservations.reservationdatepickerscreen.authentificationRequiseVeuillezVousConnecter'));
        return;
      }
      const isEditFlow = !!reservationFromParams?.id;
      const response = await fetch(
        isEditFlow
          ? API_ENDPOINTS.RESERVATIONS.UPDATE_DETAILS(reservationFromParams.id)
          : API_ENDPOINTS.RESERVATIONS.CREATE,
        {
          method: isEditFlow ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(
            isEditFlow
              ? {
                  startDate,
                  endDate,
                  pickupMethod,
                  pickupAddress: pickupMethod === 'renter_delivery' ? deliveryAddress.trim() : undefined,
                }
              : {
                  listingId: listing.id,
                  startDate,
                  endDate,
                  pickupMethod,
                  pickupAddress: pickupMethod === 'renter_delivery' ? deliveryAddress.trim() : undefined,
                }
          ),
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Keep the current date picker route in sync with the latest reservation state.
        navigation.setParams?.({
          reservation: data,
          isEditing: true,
        });

        if (isEditFlow) {
          goToReservationDetails(data);
          return;
        }

        Alert.alert(t('screens.reservations.reservationdatepickerscreen.reservationCreee'), t('screens.reservations.reservationdatepickerscreen.votreReservationEstEnAttenteDePaiement'), [
          {
            text: 'OK',
            onPress: () => goToReservationDetails(data),
          },
        ]);
      } else {
        Alert.alert(t('screens.reservations.reservationdatepickerscreen.erreur'), data.error || t('screens.reservations.reservationdatepickerscreen.impossibleDeCreerLaReservation'));
      }
    } catch (error) {
      console.error('Error saving reservation:', error);
      Alert.alert(t('screens.reservations.reservationdatepickerscreen.erreur'), t('screens.reservations.reservationdatepickerscreen.uneErreurEstSurvenue'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (isEditing) {
      if (navigation.canGoBack?.()) {
        navigation.goBack();
        return;
      }
      if (reservationFromParams) {
        goToReservationDetails(reservationFromParams);
        return;
      }
    }
    navigation.goBack();
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    setEstimatedPrice(0);
  };

  if (loading && reservedDates.length === 0) {
    return (
      <LinearGradient colors={[COLORS.bg, COLORS.bg2]} style={styles.container}>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const { from: availableFromStr, to: availableToStr } = getListingAvailabilityWindow(listing);
  const todayStr = formatLocalYmd(new Date());
  const minDateStr = availableFromStr && availableFromStr > todayStr ? availableFromStr : todayStr;
  const maxDateStr = availableToStr || null;

  return (
    <LinearGradient colors={[COLORS.bg, COLORS.bg2]} style={styles.container}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.reservations.reservationdatepickerscreen.selectionnerLesDates')}</Text>
        <View style={{ width: 50 }} />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {verificationState.status === 'unverified' ? (
          <View style={styles.verificationBanner}>
            <Ionicons name="shield-outline" size={18} color="#ffb347" />
            <View style={{ flex: 1 }}>
              <Text style={styles.verificationBannerTitle}>
                {t('screens.reservations.reservationdatepickerscreen.verificationRequiredTitle')}
              </Text>
              <Text style={styles.verificationBannerText}>
                {t('screens.reservations.reservationdatepickerscreen.verificationRequiredMessage')}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Car Info Preview */}
        <View style={styles.carPreview}>
          <View style={styles.carImage}>
            {listing.image ? (
              <Image source={{ uri: listing.image }} style={styles.carImageMedia} resizeMode="cover" />
            ) : (
              <View style={styles.carImageFallback}>
                <Ionicons name="car-outline" size={34} color={COLORS.primary} />
              </View>
            )}
          </View>
          <View style={styles.carInfo}>
            <Text style={styles.carBrand}>{listing.brand}</Text>
            <Text style={styles.carModel}>{listing.model}</Text>
            {!!selectedCity && (
              <View style={styles.carMetaRow}>
                <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.carMetaText}>{selectedCity}</Text>
              </View>
            )}
            <Text style={styles.carPrice}>
              {(parseFloat(listing.price_per_day || listing.pricePerDay || 0)).toLocaleString(getCurrentLocale())} {t('screens.reservations.reservationdatepickerscreen.daJour')}
            </Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>{t('screens.reservations.reservationdatepickerscreen.selectionnezVosDates')}</Text>

          <View style={styles.legendContainer}>
            <View style={styles.legendChip}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.legendText}>{t('screens.reservations.reservationdatepickerscreen.selection')}</Text>
            </View>
            <View style={styles.legendChip}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(142, 149, 191, 0.6)' }]} />
              <Text style={styles.legendText}>{t('screens.reservations.reservationdatepickerscreen.indisponible')}</Text>
            </View>
          </View>

          <CustomCalendar
            markedDates={markedDates}
            onDayPress={handleDayPress}
            minDate={minDateStr}
            maxDate={maxDateStr}
            disabledDates={reservedDates}
            locale={getCurrentLocale()}
            startFromMonday
          />
        </View>

        {listing ? (
          <View style={styles.pickupSection}>
            <Text style={styles.pickupTitle}>{t('screens.reservations.reservationdatepickerscreen.recuperation')}</Text>
            <View style={styles.pickupRow}>
              <TouchableOpacity
                onPress={() => {
                  setPickupMethod('owner_place');
                  setDeliveryAddress('');
                }}
                style={[styles.pickupOption, pickupMethod === 'owner_place' && styles.pickupOptionActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.pickupOptionText, pickupMethod === 'owner_place' && styles.pickupOptionTextActive]}>
                  {t('screens.reservations.reservationdatepickerscreen.chezLeProprietaire')}
                </Text>
                {listing?.pickupAddress ? (
                  <Text style={styles.pickupHint} numberOfLines={2}>{listing.pickupAddress}</Text>
                ) : (
                  <Text style={styles.pickupHint} numberOfLines={2}>{t('screens.reservations.reservationdatepickerscreen.adresseNonPrecisee')}</Text>
                )}
              </TouchableOpacity>

              {(() => {
                const fee = Number(listing?.deliveryFee ?? listing?.delivery_fee ?? 0);
                const deliveryAvailable = Number.isFinite(fee) && fee > 0;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      if (!deliveryAvailable) return;
                      setPickupMethod('renter_delivery');
                    }}
                    disabled={!deliveryAvailable}
                    style={[
                      styles.pickupOption,
                      pickupMethod === 'renter_delivery' && styles.pickupOptionActive,
                      !deliveryAvailable && styles.pickupOptionDisabled,
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.pickupOptionText, pickupMethod === 'renter_delivery' && styles.pickupOptionTextActive]}>
                      {t('screens.reservations.reservationdatepickerscreen.livraison')}
                    </Text>
                    <Text style={styles.pickupHint}>
                      {deliveryAvailable ? `+${fee.toLocaleString(getCurrentLocale())} DA` : t('common.unavailable')}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>

            {pickupMethod === 'renter_delivery' ? (
              <View style={styles.deliveryInputWrap}>
                <Text style={styles.deliveryLabel}>{t('screens.reservations.reservationdatepickerscreen.adresseDeLivraison')}</Text>
                <TextInput
                  style={styles.deliveryInput}
                  value={deliveryAddress}
                  onChangeText={(value) => setDeliveryAddress(value)}
                  placeholder={t('screens.reservations.reservationdatepickerscreen.exRueVille')}
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  multiline
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Selected Dates Summary */}
        {(startDate || endDate) && (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>{t('screens.reservations.reservationdatepickerscreen.resume')}</Text>

            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>{t('screens.reservations.reservationdatepickerscreen.depart')}</Text>
                <Text style={styles.dateValue}>
                  {startDate
                    ? (parseLocalDate(startDate)?.toLocaleDateString(getCurrentLocale()) || '-')
                    : '-'}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={COLORS.textMuted} />
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>{t('screens.reservations.reservationdatepickerscreen.retour')}</Text>
                <Text style={styles.dateValue}>
                  {endDate ? (parseLocalDate(endDate)?.toLocaleDateString(getCurrentLocale()) || '-') : '-'}
                </Text>
              </View>
            </View>

            {estimatedPrice > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{t('screens.reservations.reservationdatepickerscreen.estime')}</Text>
                <Text style={styles.priceValue}>
                  {estimatedPrice.toLocaleString(getCurrentLocale())} DA
                </Text>
              </View>
            )}

            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>{t('screens.reservations.reservationdatepickerscreen.reinitialiser')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          onPress={handleCancel}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelButtonText}>{t('screens.reservations.reservationdatepickerscreen.annuler')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePrimaryAction}
          disabled={!startDate || !endDate || loading || verificationState.status === 'unverified'}
          style={styles.reserveButtonWrapper}
        >
          <LinearGradient
            colors={
              startDate && endDate && verificationState.status !== 'unverified'
                ? ['#4C6FFF', COLORS.primary]
                : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.08)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.reserveButton}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.reserveButtonText}>
                {reservationFromParams?.id ? t('screens.reservations.reservationdatepickerscreen.confirmer') : t('screens.reservations.reservationdatepickerscreen.reserver')}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: 'rgba(21, 24, 55, 0.65)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 140,
  },
  verificationBanner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,179,71,0.35)',
    backgroundColor: 'rgba(255,179,71,0.12)',
    padding: 14,
    marginBottom: 14,
  },
  verificationBannerTitle: {
    color: '#ffd188',
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 4,
  },
  verificationBannerText: {
    color: '#ffe9be',
    lineHeight: 18,
    fontSize: 12,
  },
  carPreview: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 14,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  carImage: {
    width: 76,
    height: 76,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.18)',
    marginRight: 12,
  },
  carImageMedia: {
    width: '100%',
    height: '100%',
  },
  carImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  carBrand: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  carModel: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 6,
  },
  carMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  carMetaText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  carPrice: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  calendarSection: {
    marginBottom: 18,
  },
  summarySection: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    marginBottom: 18,
  },
  sectionTitle: {
    color: COLORS.text,
    marginBottom: 16,
    fontSize: 18,
    fontWeight: '700',
  },
  legendContainer: {
    flexDirection: 'row',
    marginTop: 18,
    marginBottom: 18,
    gap: 10,
    justifyContent: 'center',
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateItem: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  dateValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.28)',
  },
  priceLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  priceValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  pickupSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  pickupTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  pickupRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickupOption: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pickupOptionActive: {
    borderColor: 'rgba(143,108,255,0.8)',
    backgroundColor: 'rgba(143,108,255,0.18)',
  },
  pickupOptionDisabled: {
    opacity: 0.6,
  },
  pickupOptionText: {
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: 6,
  },
  pickupOptionTextActive: {
    color: '#fff',
  },
  pickupHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  deliveryInputWrap: {
    marginTop: 10,
  },
  deliveryLabel: {
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  deliveryInput: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#fff',
  },
  clearButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#151837',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 12,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -10 },
    elevation: Platform.OS === 'android' ? 10 : 0,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(142, 149, 191, 0.4)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#8e95bf',
    fontSize: 16,
    fontWeight: '700',
  },
  reserveButtonWrapper: {
    flex: 1,
  },
  reserveButton: {
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reserveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default ReservationDatePickerScreen;
