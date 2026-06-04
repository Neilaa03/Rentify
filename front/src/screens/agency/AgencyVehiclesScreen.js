import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AgencyBottomNavigation from '../../components/navigation/AgencyBottomNavigation';
import { AgencyCard, Badge, PillRow, SectionTitle, VehicleCard } from '../../components/agency/AgencyPrimitives';
import { getAgencyVehicles, toggleAgencyVehicleVisibility } from '../../services/agency';import { useTranslation } from "react-i18next";
import { getFriendlyError } from '../../utils/friendlyError';
import { useTheme } from '../../contexts/ThemeContext';
import AppBackground from '../../components/layout/AppBackground';

const statusFilters = [
{ key: 'ALL', labelKey: 'screens.agency.agencyvehiclesscreen.tous' },
{ key: 'AVAILABLE', labelKey: 'screens.agency.agencyvehiclesscreen.enLigne' },
{ key: 'HIDDEN', labelKey: 'screens.agency.agencyvehiclesscreen.horsLigne' }];


const getSortValue = (item, sortKey) => {
  if (sortKey === 'price_asc') return Number(item.listing?.pricePerDay || 0);
  if (sortKey === 'price_desc') return -Number(item.listing?.pricePerDay || 0);
  if (sortKey === 'rating') return -Number(item.averageRating || 0);
  return -(Number(item.totalReservations || 0) * 10 + Number(item.favoritesCount || 0));
};

export default function AgencyVehiclesScreen({ navigation, route }) {const { t } = useTranslation();
  const { colors } = useTheme();
  const token = route?.params?.token;
  const user = route?.params?.user;
  const mode = route?.params?.mode || (route?.name === 'AgencyListings' ? 'listings' : 'fleet');

  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    error: '',
    data: null,
    status: 'ALL',
    sort: 'popular'
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
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: getFriendlyError(error, t) }));
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
      Alert.alert(t("screens.agency.agencyvehiclesscreen.erreur"), getFriendlyError(error, t));
    }
  };

  const onEdit = (vehicle) => {
    const routeName = mode === 'listings' ? 'OwnerListingForm' : 'OwnerCarForm';
    const params = mode === 'listings' ?
    { token, user, mode: 'edit', listing: vehicle.listing || { car: vehicle } } :
    { token, user, mode: 'edit_car', car: vehicle };
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
    <AppBackground contentStyle={styles.safeArea}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={styles.page}>
          <View style={styles.headerSpacer} />

          {state.loading ?
              <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View> :

              <ScrollView
                refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}>
                
              <SectionTitle
                  kicker={mode === 'listings' ? 'LISTINGS' : 'FLEET'}
                  title={mode === 'listings' ? 'Annonces de l’agence' : 'Flotte & véhicules'}
                  subtitle={t("screens.agency.agencyvehiclesscreen.gestionVisibilitePubliqueEtStatuts")}
                  kickerStyle={{ color: colors.white }}
                  titleStyle={{ color: colors.white }}
                  subtitleStyle={{ color: 'rgba(255,255,255,0.82)' }}
                  right={
                  <TouchableOpacity style={styles.addButton} onPress={onAdd}>
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addButtonText}>{mode === 'listings' ? t("screens.agency.agencyvehiclesscreen.ajouterUneAnnonce") : t("screens.owner.carsscreen.ajouterUnVehicule")}</Text>
                  </TouchableOpacity>
                  } />
                

              {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

              <PillRow
                  items={statusFilters.map((item) => ({ ...item, label: t(item.labelKey) }))}
                  activeKey={state.status}
                  onSelect={(status) => setState((prev) => ({ ...prev, status }))} />
                

              <AgencyCard style={styles.countsCard}>
                <View style={styles.countsRow}>
                  <Text style={styles.countText}>{t("screens.agency.agencyvehiclesscreen.disponibles")}{Number(counters.available || 0)}</Text>
                  <Text style={styles.countText}>{t("screens.agency.agencyvehiclesscreen.loues")}{Number(counters.rented || 0)}</Text>
                  <Text style={styles.countText}>{t("screens.agency.agencyvehiclesscreen.nonPublies")}{Number(counters.hidden || 0)}</Text>
                </View>
                <Text style={styles.countHint}>{t("screens.agency.agencyvehiclesscreen.lesVehiculesSansDocumentsObligatoiresRestentMasques")}</Text>
              </AgencyCard>

              {items.length ? items.map((item) =>
                <VehicleCard
                  key={item.id}
                  item={item}
                  onToggleVisibility={onToggleVisibility}
                  onEdit={onEdit} />

                ) : <Text style={styles.empty}>{t("screens.agency.agencyvehiclesscreen.aucunVehiculeTrouve")}</Text>}
            </ScrollView>
              }
          </View>
          </View>
          <AgencyBottomNavigation navigation={navigation} route={route} active={mode === 'listings' ? 'listings' : 'fleet'} />
    </AppBackground>);

}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0c24' },
  background: { flex: 1, backgroundColor: '#0a0c24' },
  safeArea: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(2,3,14,0.58)' },
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  content: { paddingBottom: 102 },
  headerSpacer: { height: 8 },
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
    borderColor: 'rgba(255,255,255,0.12)'
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    flexShrink: 1
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(41,121,255,0.95)',
    paddingVertical: 14,
    borderRadius: 18,
    marginBottom: 12
  },
  primaryActionText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  empty: { color: '#A5AECF', fontStyle: 'italic', marginTop: 10, marginBottom: 20 }
});
