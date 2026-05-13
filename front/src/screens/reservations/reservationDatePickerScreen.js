import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import CustomCalendar from '../../components/customCalendar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';

const ReservationDatePickerScreen = ({ navigation, route }) => {
  const { listing: initialListing } = route.params;
  const [listing, setListing] = useState(initialListing);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [markedDates, setMarkedDates] = useState({});
  const [reservedDates, setReservedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estimatedPrice, setEstimatedPrice] = useState(0);

  const parseLocalDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;

    if (typeof value === 'string') {
      const datePart = value.split('T')[0];
      const parts = datePart.split('-').map(Number);
      if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
        const [year, month, day] = parts;
        return new Date(year, month - 1, day);
      }
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatLocalYmd = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch full listing details and reserved dates
  useEffect(() => {
    fetchListingDetails();
  }, []);

  // Update marked dates when reserved dates change
  useEffect(() => {
    updateMarkedDates(null, null);
  }, [reservedDates, listing]);

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
    
    // Then fetch reserved dates
    await fetchReservedDates();
  };

  const fetchReservedDates = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(
        API_ENDPOINTS.RESERVATIONS.GET_LISTING(initialListing.id),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const reserved = [];
        data.forEach(reservation => {
          // Only mark confirmed and reserved dates as blocked
          if (['reserved', 'confirmed', 'pickup_pending'].includes(reservation.status)) {
            const start = parseLocalDate(reservation.start_date);
            const end = parseLocalDate(reservation.end_date);
            if (!start || !end) return;
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              const dateStr = formatLocalYmd(d);
              if (dateStr) reserved.push(dateStr);
            }
          }
        });
        setReservedDates(reserved);
      }
    } catch (error) {
      console.error('Error fetching reserved dates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayPress = (day) => {
    const dateStr = day.dateString;
    
    // Can't select past dates
    if (new Date(dateStr) < new Date(new Date().setHours(0, 0, 0, 0))) {
      Alert.alert('Date invalide', 'Vous ne pouvez pas sélectionner une date passée');
      return;
    }

    // Can't select reserved dates
    if (reservedDates.includes(dateStr)) {
      Alert.alert('Date indisponible', 'Cette date est déjà réservée');
      return;
    }

    if (!startDate) {
      setStartDate(dateStr);
      updateMarkedDates(dateStr, null);
    } else if (!endDate) {
      if (new Date(dateStr) < new Date(startDate)) {
        Alert.alert('Erreur', 'La date de fin doit être après la date de début');
        return;
      }
      setEndDate(dateStr);
      updateMarkedDates(startDate, dateStr);
      calculatePrice(startDate, dateStr);
    } else {
      // Reset selection
      setStartDate(dateStr);
      setEndDate(null);
      setEstimatedPrice(0);
      updateMarkedDates(dateStr, null);
    }
  };

  const updateMarkedDates = (start, end) => {
    const marked = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Support both API DTO (camelCase) and legacy/snake_case shapes.
    const availableFromRaw = listing?.availableFrom ?? listing?.available_from ?? null;
    const availableToRaw = listing?.availableTo ?? listing?.available_to ?? null;
    const availableFrom = parseLocalDate(availableFromRaw);
    const availableTo = parseLocalDate(availableToRaw);
    
    if (availableFrom) availableFrom.setHours(0, 0, 0, 0);
    if (availableTo) availableTo.setHours(23, 59, 59, 999);
    
    console.log('availableFrom:', availableFrom);
    console.log('availableTo:', availableTo);
    
    // Mark all dates in the calendar range
    for (let d = new Date(2020, 0, 1); d <= new Date(2030, 11, 31); d.setDate(d.getDate() + 1)) {
      const dateStr = formatLocalYmd(d);
      if (!dateStr) continue;
      const currentDate = new Date(d);
      currentDate.setHours(0, 0, 0, 0);
      
      if (currentDate < today) {
        // Past dates - disabled
        marked[dateStr] = {
          disabled: true,
          selectedColor: '#444a71',
          textColor: '#8e95bf',
        };
      } else if ((availableFrom && currentDate < availableFrom) || (availableTo && currentDate > availableTo)) {
        // Outside availability range - disabled
        marked[dateStr] = {
          disabled: true,
          selectedColor: '#444a71',
          textColor: '#8e95bf',
        };
      } else if (reservedDates.includes(dateStr)) {
        // Reserved dates - disabled
        marked[dateStr] = {
          disabled: true,
          selectedColor: '#444a71',
          textColor: '#8e95bf',
        };
      } else {
        // Available dates - light green
        marked[dateStr] = {
          selected: false,
          selectedColor: 'rgba(35, 212, 159, 0.3)',
          textColor: '#e8ecff',
        };
      }
    }

    if (start) {
      marked[start] = {
        ...marked[start],
        selected: true,
        selectedColor: '#a566ff',
        startingDay: true,
        textColor: '#fff',
      };
    }

    if (end) {
      marked[end] = {
        ...marked[end],
        selected: true,
        selectedColor: '#a566ff',
        endingDay: true,
        textColor: '#fff',
      };

      // Mark dates in between
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
            ...marked[dateStr],
            selected: true,
            selectedColor: '#a566ff',
            textColor: '#fff',
          };
        }
      }
    }

    setMarkedDates(marked);
  };

  const calculatePrice = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const totalDays = Math.ceil(
      (endDate - startDate) / (1000 * 60 * 60 * 24)
    );

    let price = 0;
    let remainingDays = totalDays;

    // Handle both camelCase and snake_case field names
    const pricePerDay = parseFloat(listing.price_per_day || listing.pricePerDay || 0);
    const pricePerWeek = parseFloat(listing.price_per_week || listing.pricePerWeek || 0);
    const pricePerMonth = parseFloat(listing.price_per_month || listing.pricePerMonth || 0);

    // Apply monthly pricing
    if (remainingDays >= 30 && pricePerMonth) {
      const months = Math.floor(remainingDays / 30);
      price += months * pricePerMonth;
      remainingDays -= months * 30;
    }

    // Apply weekly pricing
    if (remainingDays >= 7 && pricePerWeek) {
      const weeks = Math.floor(remainingDays / 7);
      price += weeks * pricePerWeek;
      remainingDays -= weeks * 7;
    }

    // Apply daily pricing
    price += remainingDays * pricePerDay;

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
    setMarkedDates({});
  };

  if (loading && reservedDates.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sélectionner les dates</Text>
        <View style={{ width: 50 }} />
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Car Info Preview */}
        <View style={styles.carPreview}>
          <View style={styles.carImage}>
            {listing.image ? (
              <View style={styles.imagePlaceholder} />
            ) : (
              <Ionicons name="car-outline" size={40} color="#8f6cff" />
            )}
          </View>
          <View style={styles.carInfo}>
            <Text style={styles.carBrand}>{listing.brand}</Text>
            <Text style={styles.carModel}>{listing.model}</Text>
            <Text style={styles.carPrice}>
              {(parseFloat(listing.price_per_day || listing.pricePerDay || 0)).toLocaleString('fr-FR')} DA/jour
            </Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>Sélectionnez vos dates</Text>
          
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#a566ff' }]} />
              <Text style={styles.legendText}>Dates sélectionnées</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#444a71' }]} />
              <Text style={styles.legendText}>Indisponible</Text>
            </View>
          </View>

          <CustomCalendar
            markedDates={markedDates}
            onDayPress={handleDayPress}
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
                    ? new Date(startDate).toLocaleDateString('fr-FR')
                    : '-'}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#8f6cff" />
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Retour</Text>
                <Text style={styles.dateValue}>
                  {endDate ? new Date(endDate).toLocaleDateString('fr-FR') : '-'}
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
                ? [COLORS.secondary, COLORS.primary]
                : ['#444a71', '#444a71']
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
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 20,
    backgroundColor: '#151837',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 156, 233, 0.2)',
  },
  backButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 27,
  },
  headerTitle: {
    color: '#f6f8ff',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  carPreview: {
    flexDirection: 'row',
    backgroundColor: '#151837',
    borderRadius: 12,
    padding: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)',
  },
  carImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#0f1228',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(143, 108, 255, 0.1)',
    borderRadius: 8,
  },
  carInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  carBrand: {
    color: '#8e95bf',
    fontSize: 12,
  },
  carModel: {
    color: '#f6f8ff',
    fontSize: 16,
    fontWeight: '700',
    marginVertical: 4,
  },
  carPrice: {
    color: '#a566ff',
    fontSize: 13,
    fontWeight: '600',
  },
  calendarSection: {
    marginBottom: 20,
  },
  summarySection: {
    marginBottom: 80,
  },
  sectionTitle: {
    color: '#f6f8ff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    color: '#8e95bf',
    fontSize: 12,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f1228',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  dateItem: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    color: '#8e95bf',
    fontSize: 12,
    marginBottom: 4,
  },
  dateValue: {
    color: '#f6f8ff',
    fontSize: 14,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(143, 108, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(143, 108, 255, 0.3)',
  },
  priceLabel: {
    color: '#8e95bf',
    fontSize: 14,
  },
  priceValue: {
    color: '#a566ff',
    fontSize: 18,
    fontWeight: '700',
  },
  clearButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#8f6cff',
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
    borderTopColor: 'rgba(148, 156, 233, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#8e95bf',
    fontSize: 16,
    fontWeight: '600',
  },
  reserveButtonWrapper: {
    flex: 1,
  },
  reserveButton: {
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reserveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ReservationDatePickerScreen;
