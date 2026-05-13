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
  const { listing } = route.params;
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [markedDates, setMarkedDates] = useState({});
  const [reservedDates, setReservedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estimatedPrice, setEstimatedPrice] = useState(0);

  // Fetch reserved dates for this listing
  useEffect(() => {
    fetchReservedDates();
  }, []);

  const fetchReservedDates = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(
        API_ENDPOINTS.RESERVATIONS.GET_LISTING(listing.id),
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
            const start = new Date(reservation.start_date);
            const end = new Date(reservation.end_date);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              reserved.push(new Date(d).toISOString().split('T')[0]);
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
    
    // Mark reserved dates as blocked
    reservedDates.forEach(date => {
      marked[date] = {
        disabled: true,
        color: '#444a71',
        textColor: '#8e95bf',
      };
    });

    if (start) {
      marked[start] = {
        ...marked[start],
        selected: true,
        selectedColor: '#a566ff',
        startingDay: true,
      };
    }

    if (end) {
      marked[end] = {
        ...marked[end],
        selected: true,
        selectedColor: '#a566ff',
        endingDay: true,
      };

      // Mark dates in between
      const current = new Date(start);
      while (current < new Date(end)) {
        current.setDate(current.getDate() + 1);
        const dateStr = current.toISOString().split('T')[0];
        if (dateStr !== end) {
          marked[dateStr] = {
            ...marked[dateStr],
            selected: true,
            selectedColor: '#a566ff',
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

    // Apply monthly pricing
    if (remainingDays >= 30 && listing.pricePerMonth) {
      const months = Math.floor(remainingDays / 30);
      price += months * listing.pricePerMonth;
      remainingDays -= months * 30;
    }

    // Apply weekly pricing
    if (remainingDays >= 7 && listing.pricePerWeek) {
      const weeks = Math.floor(remainingDays / 7);
      price += weeks * listing.pricePerWeek;
      remainingDays -= weeks * 7;
    }

    // Apply daily pricing
    price += remainingDays * listing.pricePerDay;

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
              {listing.pricePerDay.toLocaleString('fr-FR')} DA/jour
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
  },
  carPreview: {
    flexDirection: 'row',
    backgroundColor: '#151837',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
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
    marginBottom: 100,
  },
  sectionTitle: {
    color: '#f6f8ff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
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
    paddingVertical: 12,
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
