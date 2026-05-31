import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AgencyBottomNavigation from '../../components/navigation/AgencyBottomNavigation';
import { AgencyCard, Badge, PillRow, SectionTitle, VehicleCard } from '../../components/agency/AgencyPrimitives';
import { getAgencyVehicles, toggleAgencyVehicleVisibility } from '../../services/agency';

const statusFilters = [
  { key: 'ALL', label: 'Tous' },
  { key: 'AVAILABLE', label: 'En ligne' },
  { key: 'MAINTENANCE', label: 'Hors ligne' },
];

const sortFilters = [
  { key: 'popular', label: 'Popularité' },
  { key: 'price_asc', label: 'Prix ↑' },
  { key: 'price_desc', label: 'Prix ↓' },
  { key: 'rating', label: 'Note' },
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

  return (
    <ImageBackground source={require('../../assets/background.png')} style={styles.background} resizeMode="cover">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.page}>
          <SectionTitle
            kicker={mode === 'listings' ? 'LISTINGS' : 'FLEET'}
            title={mode === 'listings' ? 'Annonces de l’agence' : 'Flotte & véhicules'}
            subtitle="Gestion premium, visibilité publique et statuts des documents"
            right={<Badge label={`${items.length} véhicules`} toneKey="blue" />}
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
              <PillRow
                items={sortFilters}
                activeKey={state.sort}
                onSelect={(sort) => setState((prev) => ({ ...prev, sort }))}
              />

              <AgencyCard style={styles.countsCard}>
                <View style={styles.countsRow}>
                  <Text style={styles.countText}>Disponibles: {Number(counters.available || 0)}</Text>
                  <Text style={styles.countText}>Loués: {Number(counters.rented || 0)}</Text>
                  <Text style={styles.countText}>Maintenance: {Number(counters.maintenance || 0)}</Text>
                </View>
              </AgencyCard>

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
  metricsCard: { padding: 14, marginBottom: 12 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countsCard: { padding: 14, marginBottom: 12 },
  countsRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  countText: { color: '#C9D0EB', fontWeight: '800', fontSize: 12 },
  empty: { color: '#A5AECF', fontStyle: 'italic', marginTop: 10, marginBottom: 20 },
});
