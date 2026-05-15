import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchJson } from '../../services/api';

const OwnerCarsScreen = ({ navigation, route }) => {
  const token = route?.params?.token;
  const user = route?.params?.user;

  const [cars, setCars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadCars = useCallback(async () => {
    if (!token || !user?.id) {
      setError('Authentication required');
      setIsLoading(false);
      return;
    }

    try {
      const data = await fetchJson('/api/cars/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCars(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError('Failed to load cars');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [token, user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCars();
    setRefreshing(false);
  }, [loadCars]);

  useEffect(() => {
    loadCars();
  }, [loadCars]);

  const handleEditCar = (car) => {
    navigation.navigate('OwnerCarForm', {
      token,
      user,
      mode: 'edit',
      car,
    });
  };

  const handleAddCar = () => {
    navigation.navigate('OwnerCarForm', {
      token,
      user,
      mode: 'create',
    });
  };

  const renderCarCard = ({ item }) => {
    const primaryImage = (item.images || []).find(img => img.isPrimary);
    
    return (
    <TouchableOpacity
      style={styles.carCard}
      onPress={() => handleEditCar(item)}
      activeOpacity={0.7}
    >
      {primaryImage && (
        <Image
          source={{ uri: primaryImage.imageUrl }}
          style={styles.carImage}
        />
      )}
      
      <View style={styles.carOverlay}>
        <View style={styles.carHeader}>
          <View style={styles.carInfo}>
            <Text style={styles.carTitle}>
              {item.brand} {item.model}
            </Text>
            <Text style={styles.carYear}>{item.year}</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.carDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="color-palette" size={14} color={COLORS.gray} />
            <Text style={styles.detailText}>{item.color || 'N/A'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="flash" size={14} color={COLORS.gray} />
            <Text style={styles.detailText}>{item.fuelType || 'N/A'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="speedometer" size={14} color={COLORS.gray} />
            <Text style={styles.detailText}>{item.mileage || 0} km</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="car" size={64} color={COLORS.lightGray} />
      <Text style={styles.emptyTitle}>Aucun véhicule</Text>
      <Text style={styles.emptySubtitle}>
        Ajoutez votre premier véhicule pour commencer
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddCar}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Ajouter un véhicule</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={styles.loader}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Véhicules</Text>
        <TouchableOpacity
          style={styles.addIconButton}
          onPress={handleAddCar}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadCars}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : cars.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={cars}
          renderItem={renderCarCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  addIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  carCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    minHeight: 160,
  },
  carImage: {
    width: '100%',
    height: 160,
    position: 'absolute',
  },
  carOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 12, 36, 0.85)',
    padding: 16,
    justifyContent: 'space-between',
  },
  carHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  carInfo: {
    flex: 1,
  },
  carTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  carYear: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  carDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderColor,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
});

export default OwnerCarsScreen;
