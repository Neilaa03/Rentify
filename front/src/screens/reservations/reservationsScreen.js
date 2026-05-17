import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import storage from '../../utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';
import ReservationCard from '../../components/cards/ReservationCard';

const ReservationsScreen = ({ navigation }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');

  // Fetch reservations when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchReservations();
    }, [])
  );

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const token = await storage.getItemAsync('userToken');
      
      const response = await fetch(API_ENDPOINTS.RESERVATIONS.GET_USER, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch reservations: ${response.status}`);
      }

      const data = await response.json();
      setReservations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      Alert.alert('Erreur', 'Impossible de charger les réservations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const isReservationPast = (endDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return end < today;
  };

  const filteredReservations = reservations.filter((reservation) => {
    const isPast = isReservationPast(reservation.endDate || reservation.end_date);
    return activeTab === 'upcoming' ? !isPast : isPast;
  });

  const onRefresh = () => {
    setRefreshing(true);
    fetchReservations();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'reserved':
        return COLORS.primary; // purple
      case 'confirmed':
        return '#23d49f'; // green
      case 'pickup_pending':
        return '#ffa500'; // orange
      case 'cancelled':
        return '#ff6b6b'; // red
      default:
        return COLORS.muted;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      reserved: 'Réservé',
      confirmed: 'Confirmé',
      pickup_pending: 'En attente de récupération',
      cancelled: 'Annulé',
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleReservationPress = (reservation) => {
    // Navigate to reservation details within the Reservations tab stack.
    const listing = reservation?.listing || reservation?.listing?.car || null;
    navigation.navigate('ReservationDetails', { reservation, listing });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={require('../../assets/background.png')}
          style={styles.background}
          resizeMode="cover"
        >
          <SafeAreaView style={styles.overlay}>
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          </SafeAreaView>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/background.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <SafeAreaView style={[styles.overlay, { flex: 1 }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Mes Réservations</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Tab Filters */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'upcoming' && styles.tabButtonActive]}
              onPress={() => setActiveTab('upcoming')}
            >
              <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
                Upcoming
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'past' && styles.tabButtonActive]}
              onPress={() => setActiveTab('past')}
            >
              <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
                Past
              </Text>
            </TouchableOpacity>
          </View>

          {/* Reservations List */}
          <ScrollView
            style={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
          >
            {filteredReservations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="calendar-outline" size={56} color="#7c3aed" />
                </View>
                <Text style={styles.emptyTitle}>Aucune réservation</Text>
                <Text style={styles.emptyText}>Vous n'avez pas encore de réservation. Commencez à explorer nos véhicules disponibles!</Text>
              </View>
              ) : (
              filteredReservations.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  onPress={handleReservationPress}
                />
              ))
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(2,3,14,0.62)',
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  tabButton: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
    shadowColor: '#7c3aed',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b91ba',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  reservationCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(21, 24, 55, 0.8)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(165, 102, 255, 0.2)',
    height: 140,
  },
  carImage: {
    width: 140,
    height: 140,
    backgroundColor: COLORS.cardBackground,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vehicleInfo: {
    flex: 1,
  },
  carName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  carYear: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },

});

export default ReservationsScreen;
