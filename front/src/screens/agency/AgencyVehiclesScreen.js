import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AgencyBottomNavigation from '../../components/navigation/AgencyBottomNavigation';
import { AgencyCard, Badge, PillRow, SectionTitle, VehicleCard } from '../../components/agency/AgencyPrimitives';
import { getAgencyVehicles, toggleAgencyVehicleVisibility } from '../../services/agency';

const statusFilters = [
  { key: 'ALL', label: 'Tous' },
  { key: 'AVAILABLE', label: 'En ligne' },
  { key: 'HIDDEN', label: 'Hors ligne' },
];

const getSortValue = (item, sortKey) => {
  if (sortKey === 'price_asc') return Number(item.listing?.pricePerDay || 0);
  if (sortKey === 'price_desc') return -Number(item.listing?.pricePerDay || 0);
  if (sortKey === 'rating') return -Number(item.averageRating || 0);
  return -(Number(item.totalReservations || 0) * 10 + Number(item.favoritesCount || 0));
};

export default function AgencyVehiclesScreen({ navigation, route }) {
  const token = route?.params?.token;
  const user = route?.params?.user;
  const mode = route?.params?.mode || (route?.name === 'AgencyListings' ? 'listings' : 'fleet');

  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    error: '',
    data: null,
    status: 'ALL',
    sort: 'popular',
  });

  const load = useCallback(async () => {
    if (!token) {
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: 'Session requise' }));
      return;
    }
    try {
      const data = await getAgencyVehicles({ token, status: state.status });
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: '', data }));
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: error.message || 'Impossible de charger la flotte' }));
    }
  }, [token, state.status]);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(() => {
    const list = Array.isArray(state.data?.items) ? [...state.data.items] : [];
    list.sort((a, b) => getSortValue(a, state.sort) - getSortValue(b, state.sort));
    return list;
  }, [state.data?.items, state.sort]);

  const counters = state.data?.counts || {};
  const summary = state.data?.summary || {};
  const totalViews = Number(summary.totalViews || 0);
  const totalReservations = Number(summary.totalReservations || 0);
  const averageRating = Number(summary.averageRating || 0);

  const onRefresh = async () => {
    setState((prev) => ({ ...prev, refreshing: true }));
    await load();
  };

  const onToggleVisibility = async (vehicle) => {
    try {
      await toggleAgencyVehicleVisibility({ token, vehicleId: vehicle.id });
      await load();
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de modifier la visibilité');
    }
  };

  const onEdit = (vehicle) => {
    const routeName = mode === 'listings' ? 'OwnerListingForm' : 'OwnerCarForm';
    const params = mode === 'listings'
      ? { token, user, mode: 'edit', listing: vehicle.listing || { car: vehicle } }
      : { token, user, mode: 'edit_car', car: vehicle };
    navigation.navigate(routeName, params);
  };

  const onAdd = () => {
    if (mode === 'listings') {
      navigation.navigate('OwnerListingForm', { token, user, mode: 'create_listing' });
      return;
    }
    navigation.navigate('OwnerCarForm', { token, user, mode: 'create_car' });
  };

  return (
    <ImageBackground source={require('../../assets/background.png')} style={styles.background} resizeMode="cover">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.page}>
          <SectionTitle
            kicker={mode === 'listings' ? 'LISTINGS' : 'FLEET'}
            title={mode === 'listings' ? 'Annonces de l’agence' : 'Flotte & véhicules'}
            subtitle="Gestion premium, visibilité publique et statuts des documents"
            right={(
              <TouchableOpacity style={styles.addButton} onPress={onAdd}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addButtonText}>{mode === 'listings' ? 'Ajouter une annonce' : 'Ajouter un véhicule'}</Text>
              </TouchableOpacity>
            )}
          />

          {state.loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#A78BFF" />
            </View>
          ) : (
            <ScrollView
              refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={onRefresh} tintColor="#A78BFF" />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}
            >
              {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

              <AgencyCard style={styles.metricsCard}>
                <View style={styles.badgesRow}>
                  <Badge label={`👁 ${Number(totalViews).toLocaleString('fr-FR')} vues totales`} toneKey="purple" />
                  <Badge label={`📅 ${Number(totalReservations).toLocaleString('fr-FR')} réservations`} toneKey="blue" />
                  <Badge label={`⭐ ${averageRating ? averageRating.toFixed(1) : '0.0'} moy.`} toneKey="green" />
                </View>
              </AgencyCard>

              <PillRow
                items={statusFilters}
                activeKey={state.status}
                onSelect={(status) => setState((prev) => ({ ...prev, status }))}
              />

              <AgencyCard style={styles.countsCard}>
                <View style={styles.countsRow}>
                  <Text style={styles.countText}>Disponibles: {Number(counters.available || 0)}</Text>
                  <Text style={styles.countText}>Loués: {Number(counters.rented || 0)}</Text>
                  <Text style={styles.countText}>Non publiés: {Number(counters.hidden || 0)}</Text>
                </View>
                <Text style={styles.countHint}>Les véhicules sans documents obligatoires restent masqués jusqu'à validation.</Text>
              </AgencyCard>

              <TouchableOpacity style={styles.primaryAction} onPress={onAdd}>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.primaryActionText}>{mode === 'listings' ? 'Créer une nouvelle annonce' : 'Créer un nouveau véhicule'}</Text>
              </TouchableOpacity>

              {items.length ? items.map((item) => (
                <VehicleCard
                  key={item.id}
                  item={item}
                  onToggleVisibility={onToggleVisibility}
                  onEdit={onEdit}
                />
              )) : <Text style={styles.empty}>Aucun véhicule trouvé.</Text>}
            </ScrollView>
          )}
        </View>
        <AgencyBottomNavigation navigation={navigation} route={route} active={mode === 'listings' ? 'listings' : 'fleet'} />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#0D0E15' },
  safeArea: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  content: { paddingBottom: 102 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#FF8FA3', marginBottom: 12, fontWeight: '700' },
  metricsCard: { padding: 10, marginBottom: 12 },
  badgesRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 6, alignItems: 'center' },
  countsCard: { padding: 14, marginBottom: 12 },
  countsRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  countText: { color: '#C9D0EB', fontWeight: '800', fontSize: 12 },
  countHint: { color: '#8F97BD', fontSize: 11, marginTop: 8, lineHeight: 16 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 170,
    backgroundColor: 'rgba(124,77,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    flexShrink: 1,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(41,121,255,0.95)',
    paddingVertical: 14,
    borderRadius: 18,
    marginBottom: 12,
  },
  primaryActionText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  empty: { color: '#A5AECF', fontStyle: 'italic', marginTop: 10, marginBottom: 20 },
});
