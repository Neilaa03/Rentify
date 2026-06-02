import React, { useCallback, useMemo, useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ListingCard from '../../components/cards/ListingCard';
import { toUiListing } from '../../services/listings';
import { useFavorites } from '../../contexts/FavoritesContext';import { useTranslation } from "react-i18next";

const FavoritesScreen = ({ navigation }) => {const { t } = useTranslation();
  const { refreshFavorites, isFavorite, toggleFavorite, favoriteIds } = useFavorites();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const visibleItems = useMemo(() => {
    const rows = Array.isArray(items) ? items : [];
    if (!(favoriteIds instanceof Set) || favoriteIds.size === 0) return [];
    return rows.filter((listing) => favoriteIds.has(listing?.id));
  }, [favoriteIds, items]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await refreshFavorites();
      const mapped = (res?.items || []).map(toUiListing);
      setItems(mapped);
    } catch (err) {
      setError(err.message || 'Impossible de charger les favoris');
    } finally {
      setLoading(false);
    }
  }, [refreshFavorites]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const content = useMemo(() => {
    if (loading) return <Text style={styles.stateText}>{t("screens.client.favoritesscreen.chargement")}</Text>;
    if (error) return <Text style={styles.stateText}>{error}</Text>;
    if (!visibleItems.length) return <Text style={styles.stateText}>{t("screens.client.favoritesscreen.aucunFavoriPourLeMoment")}</Text>;

    return (
      <View style={styles.list}>
        {visibleItems.map((listing) =>
        <ListingCard
          key={listing.id}
          listing={listing}
          isFavorite={isFavorite(listing.id)}
          onToggleFavorite={() => toggleFavorite(listing.id)}
          onPress={() => navigation.navigate('ListingDetailsFromFavorites', { listing })} />

        )}
      </View>);

  }, [error, isFavorite, loading, navigation, toggleFavorite, visibleItems]);

  return (
    <View style={styles.container}>
      <ImageBackground source={require('../../assets/background.png')} style={styles.background} resizeMode="cover">
        <SafeAreaView style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("screens.client.favoritesscreen.favoris")}</Text>
            <TouchableOpacity style={styles.headerButton} onPress={load} activeOpacity={0.85}>
              <Ionicons name="refresh-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {content}
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>);

};

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  overlay: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 6
  },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7, 9, 25, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)'
  },
  scrollContent: { paddingBottom: 120, paddingTop: 10 },
  list: { paddingBottom: 10 },
  stateText: { color: '#cfd4ff', textAlign: 'center', paddingVertical: 24, fontWeight: '600' }
});

export default FavoritesScreen;