import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';
import ReservationCard from '../../components/cards/ReservationCard';
import OwnerBottomNavigation from '../../components/navigation/OwnerBottomNavigation';
import { getOwnerListings } from '../../services/owner';

const OwnerReservationsScreen = ({
  navigation,
  route,
  BottomNavigationComponent = OwnerBottomNavigation,
  title = 'Réservations',
}) => {
  const token = route?.params?.token;
  const user = route?.params?.user;

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');

  useFocusEffect(
    useCallback(() => {
      fetchReservations();
    }, [token, user?.id])
  );

  const fetchReservations = async () => {
    try {
      setLoading(true);
      if (!token || !user?.id) {
        setReservations([]);
        return;
      }

      const listings = await getOwnerListings({ token, ownerId: user.id });
      const listingById = {};
      (listings || []).forEach((l) => {
        if (l?.id) listingById[l.id] = l;
      });
      const listingIds = (listings || []).map((l) => l?.id).filter(Boolean);

      if (listingIds.length === 0) {
        setReservations([]);
        return;
      }

      const chunks = await Promise.all(
        listingIds.map(async (listingId) => {
          try {
            const response = await fetch(API_ENDPOINTS.RESERVATIONS.GET_LISTING(listingId), {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) return [];
            const data = await response.json();
            return Array.isArray(data) ? data : [];
          } catch (_e) {
            return [];
          }
        })
      );

      const all = chunks.flat();
      const normalized = all.map((reservation) => {
        const id = reservation?.listingId || reservation?.listing_id;
        const fallbackListing = id ? listingById[id] : null;
        if (!fallbackListing) return reservation;

        const current = reservation?.listing;
        if (!current) return { ...reservation, listing: fallbackListing };

        const mergedCar = (() => {
          const currentCar = current?.car || null;
          const fallbackCar = fallbackListing?.car || null;
          if (!currentCar) return fallbackCar;
          if (!fallbackCar) return currentCar;

          return {
            ...fallbackCar,
            ...currentCar,
            images:
              (Array.isArray(currentCar.images) && currentCar.images.length ? currentCar.images : null) ||
              fallbackCar.images ||
              [],
            carImages:
              (Array.isArray(currentCar.carImages) && currentCar.carImages.length ? currentCar.carImages : null) ||
              fallbackCar.carImages ||
              [],
          };
        })();

        return {
          ...reservation,
          listing: {
            ...fallbackListing,
            ...current,
            car: mergedCar,
          },
        };
      });
      normalized.sort((a, b) => {
        const aDate = new Date(a?.startDate || a?.start_date || a?.createdAt || 0).getTime();
        const bDate = new Date(b?.startDate || b?.start_date || b?.createdAt || 0).getTime();
        return bDate - aDate;
      });

      setReservations(normalized);
    } catch (error) {
      console.error('Error fetching owner reservations:', error);
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
    const end = reservation?.endDate || reservation?.end_date;
    const isPast = isReservationPast(end);
    return activeTab === 'upcoming' ? !isPast : isPast;
  });

  const onRefresh = () => {
    setRefreshing(true);
    fetchReservations();
  };

  const handleReservationPress = (reservation) => {
    const listing = reservation?.listing || reservation?.listing?.car || null;
    navigation.navigate('OwnerReservationDetails', { reservation, listing, token, user });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ImageBackground source={require('../../assets/background.png')} style={styles.background} resizeMode="cover">
          <SafeAreaView edges={['top', 'left', 'right']} style={styles.overlay}>
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
            <OwnerBottomNavigation navigation={navigation} route={route} active="reservations" />
          </SafeAreaView>
        </ImageBackground>
        <BottomNavigationComponent navigation={navigation} route={route} active="reservations" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground source={require('../../assets/background.png')} style={styles.background} resizeMode="cover">
        <SafeAreaView edges={['top', 'left', 'right']} style={[styles.overlay, { flex: 1 }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'upcoming' && styles.tabButtonActive]}
              onPress={() => setActiveTab('upcoming')}
            >
              <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>Upcoming</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'past' && styles.tabButtonActive]}
              onPress={() => setActiveTab('past')}
            >
              <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>Past</Text>
            </TouchableOpacity>
          </View>

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
                <Text style={styles.emptyText}>Aucune réservation sur vos annonces pour le moment.</Text>
              </View>
            ) : (
              filteredReservations.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  onPress={handleReservationPress}
                  compact
                />
              ))
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
          <OwnerBottomNavigation navigation={navigation} route={route} active="reservations" />
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
});

export default OwnerReservationsScreen;
