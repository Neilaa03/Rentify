import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ImageBackground, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AgencyBottomNavigation from '../../components/navigation/AgencyBottomNavigation';
import { AgencyCard, Badge, RequestRow, SectionTitle } from '../../components/agency/AgencyPrimitives';
import { getAgencyRequests } from '../../services/agency';

const tabs = [
  { key: 'ALL', label: 'Toutes' },
  { key: 'PENDING', label: 'En attente' },
  { key: 'APPROVED', label: 'Approuvées' },
  { key: 'REJECTED', label: 'Refusées' },
];

export default function AgencyRequestsScreen({ navigation, route }) {
  const token = route?.params?.token;
  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    error: '',
    data: null,
    status: 'ALL',
    page: 1,
  });

  const load = useCallback(async (nextPage = 1, nextStatus = state.status, append = false) => {
    if (!token) {
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: 'Session requise' }));
      return;
    }
    try {
      const data = await getAgencyRequests({ token, page: nextPage, limit: 10, status: nextStatus });
      setState((prev) => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: '',
        data: append && prev.data
          ? {
              ...data,
              items: [...(prev.data.items || []), ...(data.items || [])],
            }
          : data,
        page: nextPage,
        status: nextStatus,
      }));
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: error.message || 'Impossible de charger les demandes' }));
    }
  }, [token]);

  useEffect(() => {
    load(1, 'ALL', false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = state.data?.items || [];
  const total = Number(state.data?.pagination?.total || items.length);
  const hasMore = items.length < total;

  const onRefresh = async () => {
    setState((prev) => ({ ...prev, refreshing: true }));
    await load(1, state.status, false);
  };

  const setTab = async (status) => {
    setState((prev) => ({ ...prev, loading: true, status }));
    await load(1, status, false);
  };

  const loadMore = async () => {
    if (!hasMore) return;
    await load(state.page + 1, state.status, true);
  };

  const totalLabel = useMemo(() => `${total} demandes au total`, [total]);

  return (
    <ImageBackground source={require('../../assets/background.png')} style={styles.background} resizeMode="cover">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.page}>
          <SectionTitle
            kicker="RÉSERVATIONS"
            title="Gestion des demandes"
            subtitle={totalLabel}
            right={<Badge label={`${items.length} affichées`} toneKey="blue" />}
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

              <AgencyCard style={styles.tabsCard}>
                <View style={styles.tabRow}>
                  {tabs.map((tab) => {
                    const active = state.status === tab.key;
                    return (
                      <TouchableOpacity key={tab.key} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(tab.key)}>
                        <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </AgencyCard>

              <Text style={styles.countText}>{total} demandes</Text>

              {items.length ? items.map((item) => <RequestRow key={item.id} item={item} />) : <Text style={styles.empty}>Aucune demande trouvée.</Text>}

              {hasMore ? (
                <TouchableOpacity style={styles.loadMore} onPress={loadMore}>
                  <Text style={styles.loadMoreText}>Charger plus</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          )}
        </View>
        <AgencyBottomNavigation navigation={navigation} route={route} active="requests" />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#0D0E15' },
  safeArea: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 102 },
  error: { color: '#FF8FA3', marginBottom: 12, fontWeight: '700' },
  tabsCard: { padding: 14, marginBottom: 10 },
  tabRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tab: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  tabActive: { backgroundColor: 'rgba(124,77,255,0.24)', borderColor: 'rgba(124,77,255,0.48)' },
  tabText: { color: '#95A0C8', fontWeight: '900', fontSize: 12 },
  tabTextActive: { color: '#fff' },
  countText: { color: '#A5AECF', fontWeight: '700', marginBottom: 12 },
  empty: { color: '#A5AECF', fontStyle: 'italic', marginTop: 8 },
  loadMore: { alignSelf: 'center', marginTop: 14, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(41,121,255,0.92)' },
  loadMoreText: { color: '#fff', fontWeight: '900' },
});
