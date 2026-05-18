import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { deleteOwnerCar } from '../../services/owner';
import CarCard from '../../components/cards/CarCard';

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
      mode: 'edit_car',
      car,
    });
  };

  const handleDeleteCar = (car) => {
    Alert.alert(
      'Supprimer le véhicule',
      `Êtes-vous sûr de vouloir supprimer le véhicule "${car.brand} ${car.model}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOwnerCar({ token, carId: car.id });
              loadCars();
            } catch (err) {
              console.error(err);
              Alert.alert('Erreur', 'Impossible de supprimer le véhicule. Réessayez plus tard.');
            }
          },
        },
      ]
    );
  };

  const handleAddCar = () => {
    navigation.navigate('OwnerCarForm', {
      token,
      user,
      mode: 'create_car',
    });
  };

  const renderCarCard = ({ item }) => (
    <CarCard
      car={item}
      onPress={() => handleEditCar(item)}
      onEdit={() => handleEditCar(item)}
      onDelete={() => handleDeleteCar(item)}
    />
  );


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
        <Text style={styles.headerTitle}>Mes voitures</Text>
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
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  carImage: {
    width: '100%',
    height: '100%',
  },
  onlineBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#10b981',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  onlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  contentContainer: {
    padding: 14,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {
    flex: 1,
  },
  carName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  carSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  disponibleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4f8cff',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignSelf: 'flex-end',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  editText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ff5a5a',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  deleteText: {
    color: '#ff5a5a',
    fontSize: 14,
    fontWeight: '600',
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
