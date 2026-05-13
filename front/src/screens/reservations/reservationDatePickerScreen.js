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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import CustomCalendar from '../../components/customCalendar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';
import {
  parseLocalDate,
  formatLocalYmd,
  calculateReservationPrice,
  fetchListingAvailability,
  getListingAvailabilityWindow,
  isDateWithinAvailability,
  isDateReserved,
} from '../../utils/reservationUtils';

const ReservationDatePickerScreen = ({ navigation, route }) => {
  const { listing: initialListing } = route.params;
  const [listing, setListing] = useState(initialListing);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [markedDates, setMarkedDates] = useState({});
  const [reservedDates, setReservedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estimatedPrice, setEstimatedPrice] = useState(0);

  // Fetch full listing details and reserved dates
  useEffect(() => {
    fetchListingDetails();
  }, []);

  // Keep highlighted range in sync with user selection
  useEffect(() => {
    updateMarkedDates(startDate, endDate);
  }, [startDate, endDate]);

  const fetchListingDetails = async () => {
    try {
      console.log('Initial listing:', initialListing);
      console.log('Fetching from:', API_ENDPOINTS.LISTINGS.GET(initialListing.id));
      
      const token = await SecureStore.getItemAsync('userToken');
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
      setReservedDates(availability.blockedDates);
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
      Alert.alert('Date invalide', 'Vous ne pouvez pas sélectionner une date passée');
      return;
    }

    // Can't select reserved dates
    if (isDateReserved(dateStr, reservedDates)) {
      Alert.alert('Date indisponible', 'Cette date est déjà réservée');
      return;
    }

    // Check if date is within listing's availability window
    if (!isDateWithinAvailability(dateStr, listing)) {
      Alert.alert('Date indisponible', 'Cette date est en dehors de la période de disponibilité');
      return;
    }

    if (!startDate) {
      setStartDate(dateStr);
    } else if (!endDate) {
      const startLocal = parseLocalDate(startDate);
      if (startLocal && pressedDate < startLocal) {
        Alert.alert('Erreur', 'La date de fin doit être après la date de début');
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
    const price = calculateReservationPrice(listing, start, end);
    setEstimatedPrice(price);
  };

  const handleReserve = async () => {
    if (!startDate || !endDate) {
      Alert.alert('Erreur', 'Veuillez sélectionner une plage de dates');
      return;
    }

    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        Alert.alert('Erreur', 'Authentification requise. Veuillez vous connecter.');
        return;
      }
      const response = await fetch(API_ENDPOINTS.RESERVATIONS.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId: listing.id,
          startDate,
          endDate,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Navigate to reservation details with the created reservation
        navigation.navigate('ReservationDetails', {
          reservation: data,
          listing,
        });
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de créer la réservation');
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la création de la réservation');
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.headerTitle}>Sélectionner les dates</Text>
        <View style={{ width: 50 }} />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
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
            {!!listing.city && (
              <View style={styles.carMetaRow}>
                <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.carMetaText}>{listing.city}</Text>
              </View>
            )}
            <Text style={styles.carPrice}>
              {(parseFloat(listing.price_per_day || listing.pricePerDay || 0)).toLocaleString('fr-FR')} DA/jour
            </Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>Sélectionnez vos dates</Text>
          
          <View style={styles.legendContainer}>
            <View style={styles.legendChip}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.legendText}>Sélection</Text>
            </View>
            <View style={styles.legendChip}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(142, 149, 191, 0.6)' }]} />
              <Text style={styles.legendText}>Indisponible</Text>
            </View>
          </View>

          <CustomCalendar
            markedDates={markedDates}
            onDayPress={handleDayPress}
            minDate={minDateStr}
            maxDate={maxDateStr}
            disabledDates={reservedDates}
            locale="fr-FR"
            startFromMonday
          />
        </View>

        {/* Selected Dates Summary */}
        {(startDate || endDate) && (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Résumé</Text>
            
            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Départ</Text>
                <Text style={styles.dateValue}>
                  {startDate
                    ? (parseLocalDate(startDate)?.toLocaleDateString('fr-FR') || '-')
                    : '-'}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={COLORS.textMuted} />
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Retour</Text>
                <Text style={styles.dateValue}>
                  {endDate ? (parseLocalDate(endDate)?.toLocaleDateString('fr-FR') || '-') : '-'}
                </Text>
              </View>
            </View>

            {estimatedPrice > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Estimé</Text>
                <Text style={styles.priceValue}>
                  {estimatedPrice.toLocaleString('fr-FR')} DA
                </Text>
              </View>
            )}

            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Réinitialiser</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleReserve}
          disabled={!startDate || !endDate || loading}
          style={styles.reserveButtonWrapper}
        >
          <LinearGradient
            colors={
              startDate && endDate
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
              <Text style={styles.reserveButtonText}>Réserver Maintenant</Text>
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
    marginBottom: 18,
  },
  sectionTitle: {
    color: COLORS.text,
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
