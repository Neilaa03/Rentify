import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  deleteOwnerListing,
  getOwnerListings,
  toggleListingPublication,
} from '../../services/owner';
import { fetchJson } from '../../services/api';
import OwnerBottomNavigation from '../../components/navigation/OwnerBottomNavigation';
import AppBackground from '../../components/layout/AppBackground';

const badgeByTone = {
  green: { color: '#21d4a7', backgroundColor: 'rgba(33,212,167,0.16)' },
  blue: { color: '#4f8cff', backgroundColor: 'rgba(79,140,255,0.16)' },
  amber: { color: '#ffb347', backgroundColor: 'rgba(255,179,71,0.16)' },
};

const statusFilters = [
  { key: 'all', label: 'Toutes' },
  { key: 'published', label: 'Publiées' },
  { key: 'unpublished', label: 'Non publiées' },
];

const sortModes = [
  { key: 'recent', label: 'Récentes' },
  { key: 'car_asc', label: 'Voiture A-Z' },
  { key: 'car_desc', label: 'Voiture Z-A' },
];

const OwnerListingsScreen = ({
  navigation,
  route,
  BottomNavigationComponent = OwnerBottomNavigation,
  title = 'Mes annonces',
}) => {
  const token = route?.params?.token;
  const user = route?.params?.user;

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');
  const [carImages, setCarImages] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortMode, setSortMode] = useState('recent');
  const [carFilterVisible, setCarFilterVisible] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState('all');

  const loadListings = useCallback(async () => {
    if (!token || !user?.id) return;

    try {
      setError('');
      const data = await getOwnerListings({ token, ownerId: user.id });
      setListings(data);
      
      // Fetch primary images for each unique car
      const images = {};
      const uniqueCarIds = [...new Set(data.map(item => item.carId).filter(Boolean))];
      
      await Promise.all(
        uniqueCarIds.map(async (carId) => {
          try {
            const carImagesData = await fetchJson(`/api/car-images?carId=${carId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const primaryImage = (Array.isArray(carImagesData) ? carImagesData : []).find(
              (img) => img.isPrimary
            );
            if (primaryImage) {
              images[carId] = primaryImage.imageUrl;
            }
          } catch (_err) {
            // Silently fail for image loading
          }
        })
      );
      setCarImages(images);
    } catch (err) {
      setError(err.message || 'Erreur chargement annonces');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadListings();
  };

  const availableCars = useMemo(() => {
    const map = new Map();
    listings.forEach((item) => {
      if (!item?.carId) return;
      if (!map.has(item.carId)) {
        map.set(item.carId, {
          id: item.carId,
          label: `${item.brand || ''} ${item.model || ''}`.trim() || item.title || 'Voiture',
        });
      }
    });
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }, [listings]);

  const filteredListings = useMemo(() => {
    const statusMatches = (item) => {
      if (statusFilter === 'published') return Boolean(item.isActive);
      if (statusFilter === 'unpublished') return !item.isActive;
      return true;
    };

    const carMatches = (item) => selectedCarId === 'all' || String(item.carId) === String(selectedCarId);

    const sortCarLabel = (item) => `${item.brand || ''} ${item.model || ''}`.trim().toLowerCase();

    return [...listings]
      .filter((item) => statusMatches(item) && carMatches(item))
      .sort((a, b) => {
        if (sortMode === 'car_asc') return sortCarLabel(a).localeCompare(sortCarLabel(b), 'fr');
        if (sortMode === 'car_desc') return sortCarLabel(b).localeCompare(sortCarLabel(a), 'fr');
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [listings, selectedCarId, sortMode, statusFilter]);

  const handleDelete = (listing) => {
    Alert.alert(
      'Supprimer',
      `Êtes-vous sûr de vouloir supprimer l'annonce "${listing.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOwnerListing({ token, listingId: listing.id });
              loadListings();
            } catch (err) {
              console.error(err);
              Alert.alert('Erreur', 'Impossible de supprimer l\'annonce. Réessayez plus tard.');
            }
          },
        },
      ]
    );
  };

  const handleTogglePublish = async (listing) => {
    if (!listing.isActive && listing.state !== 'ready_to_publish') {
      Alert.alert(
        'Publication bloquée',
        'Vous devez valider carte grise, assurance et contrôle technique avant publication.'
      );
      return;
    }

    await toggleListingPublication({
      token,
      listingId: listing.id,
      shouldPublish: !listing.isActive,
    });
    loadListings();
  };

  return (
    <AppBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('OwnerListingForm', { token, user, mode: 'create_listing' })}
          >
            <Ionicons name="add" size={22} color="#8f7dff" />
          </TouchableOpacity>
        </View>

        <View style={styles.filtersCard}>
          <View style={styles.filterRow}>
            {statusFilters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[styles.chip, statusFilter === filter.key && styles.chipActive]}
                onPress={() => setStatusFilter(filter.key)}
              >
                <Text style={[styles.chipText, statusFilter === filter.key && styles.chipTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterActionsRow}>
            <TouchableOpacity style={styles.filterBtn} onPress={() => setCarFilterVisible(true)}>
              <Ionicons name="car-outline" size={16} color="#dce1ff" />
              <Text style={styles.filterBtnText}>
                {selectedCarId === 'all'
                  ? 'Toutes les voitures'
                  : availableCars.find((car) => String(car.id) === String(selectedCarId))?.label || 'Voiture'}
              </Text>
              <Ionicons name="chevron-down-outline" size={16} color="#aab1dd" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => {
                const currentIndex = sortModes.findIndex((item) => item.key === sortMode);
                const next = sortModes[(currentIndex + 1) % sortModes.length];
                setSortMode(next.key);
              }}
            >
              <Ionicons name="swap-vertical-outline" size={16} color="#dce1ff" />
              <Text style={styles.filterBtnText}>
                {sortModes.find((item) => item.key === sortMode)?.label || 'Récentes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#8f7dff" />
          </View>
        ) : (
          <FlatList
            data={filteredListings}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8f7dff" />}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucune annonce ne correspond à ces filtres.</Text>}
            ListHeaderComponent={error ? <Text style={styles.errorText}>{error}</Text> : null}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const badgeStyle = badgeByTone[item.stateTone] || badgeByTone.amber;
              return (
                <View style={styles.card}>
                  {carImages[item.carId] && (
                    <Image
                      source={{ uri: carImages[item.carId] }}
                      style={styles.cardImage}
                    />
                  )}
                  
                  <View style={styles.cardContent}>
                    <View style={styles.cardTop}>
                      <View>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.subtitle}>
                          {item.brand} {item.model} - {item.city}
                        </Text>
                      </View>
                      <Text style={[styles.badge, badgeStyle]}>{item.stateLabel}</Text>
                    </View>

                    <Text style={styles.price}>{Number(item.pricePerDay || 0).toLocaleString('fr-FR')} DA / jour</Text>

                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => navigation.navigate('OwnerListingForm', { token, user, mode: 'edit', listing: item })}
                      >
                        <Text style={styles.actionText}>Modifier</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                        <Text style={[styles.actionText, { color: '#ff8a9e' }]}>Supprimer</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.publishBtn, !item.isActive && item.state !== 'ready_to_publish' && styles.publishBtnDisabled]}
                        onPress={() => handleTogglePublish(item)}
                      >
                        <Text style={styles.publishText}>{item.isActive ? 'Dépublier' : 'Publier'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

      <Modal visible={carFilterVisible} transparent animationType="fade" onRequestClose={() => setCarFilterVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrer par voiture</Text>
              <TouchableOpacity onPress={() => setCarFilterVisible(false)} style={styles.iconBtn}>
                <Ionicons name="close-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modalOption, selectedCarId === 'all' && styles.modalOptionActive]}
              onPress={() => {
                setSelectedCarId('all');
                setCarFilterVisible(false);
              }}
            >
              <Text style={[styles.modalOptionText, selectedCarId === 'all' && styles.modalOptionTextActive]}>Toutes les voitures</Text>
            </TouchableOpacity>

            <FlatList
              data={availableCars}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalOption, String(selectedCarId) === String(item.id) && styles.modalOptionActive]}
                  onPress={() => {
                    setSelectedCarId(item.id);
                    setCarFilterVisible(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, String(selectedCarId) === String(item.id) && styles.modalOptionTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <BottomNavigationComponent navigation={navigation} route={route} active="listings" />
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 96 },
  errorText: { color: '#ff8a9e', marginBottom: 8 },
  emptyText: { color: '#aab1dd', marginTop: 20 },
  filtersCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(143, 150, 255, 0.16)',
    backgroundColor: 'rgba(17, 19, 41, 0.9)',
    padding: 12,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(146,151,214,0.25)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipActive: {
    backgroundColor: '#8f7dff',
    borderColor: '#8f7dff',
  },
  chipText: { color: '#b9c0e6', fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: '#fff' },
  filterActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(146,151,214,0.25)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  filterBtnText: {
    flex: 1,
    color: '#dce1ff',
    fontWeight: '600',
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 6, 18, 0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '75%',
    backgroundColor: '#0f1433',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(143, 150, 255, 0.18)',
    padding: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: { color: '#fff', fontWeight: '800', fontSize: 18 },
  modalOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(146,151,214,0.2)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  modalOptionActive: {
    backgroundColor: 'rgba(143, 125, 255, 0.18)',
    borderColor: '#8f7dff',
  },
  modalOptionText: { color: '#dce1ff', fontWeight: '600' },
  modalOptionTextActive: { color: '#fff' },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(143, 150, 255, 0.14)',
    backgroundColor: '#111329',
    overflow: 'hidden',
    marginBottom: 10,
  },
  cardImage: {
    width: '100%',
    height: 140,
  },
  cardContent: {
    padding: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { color: '#fff', fontWeight: '700', fontSize: 16, maxWidth: 220 },
  subtitle: { color: '#9ea4cf', marginTop: 2 },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  price: { color: '#8f7dff', fontWeight: '800', marginTop: 10 },
  actions: { marginTop: 12, flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(146,151,214,0.25)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionText: { color: '#d8dcf7', fontWeight: '600' },
  publishBtn: {
    flex: 1.3,
    borderRadius: 10,
    backgroundColor: '#8f7dff',
    paddingVertical: 10,
    alignItems: 'center',
  },
  publishBtnDisabled: {
    opacity: 0.45,
  },
  publishText: { color: '#fff', fontWeight: '700' },
});

export default OwnerListingsScreen;
