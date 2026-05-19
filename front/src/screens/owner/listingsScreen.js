import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  deleteOwnerListing,
  getOwnerListings,
  toggleListingPublication,
} from '../../services/owner';
import { fetchJson } from '../../services/api';
import OwnerBottomNavigation from '../../components/navigation/navigationOwner';

const badgeByTone = {
  green: { color: '#21d4a7', backgroundColor: 'rgba(33,212,167,0.16)' },
  blue: { color: '#4f8cff', backgroundColor: 'rgba(79,140,255,0.16)' },
  amber: { color: '#ffb347', backgroundColor: 'rgba(255,179,71,0.16)' },
};

const OwnerListingsScreen = ({ navigation, route }) => {
  const token = route?.params?.token;
  const user = route?.params?.user;

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');
  const [carImages, setCarImages] = useState({});

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mes annonces</Text>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('OwnerListingForm', { token, user, mode: 'create_listing' })}
          >
            <Ionicons name="add" size={22} color="#8f7dff" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#8f7dff" />
          </View>
        ) : (
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8f7dff" />}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucune annonce.</Text>}
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
      <OwnerBottomNavigation navigation={navigation} route={route} active="listings" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0c24' },
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#0a0c24' },
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
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(146,151,214,0.2)',
    backgroundColor: 'rgba(21,23,58,0.9)',
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
