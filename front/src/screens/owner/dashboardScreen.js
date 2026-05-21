import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getOwnerDashboardData } from '../../services/owner';
import OwnerBottomNavigation from '../../components/navigation/navigationOwner';
import MessageIconButton from '../../components/MessageIconButton';

const toneStyles = {
  green: { color: '#21d4a7', bg: 'rgba(33,212,167,0.16)' },
  blue: { color: '#4f8cff', bg: 'rgba(79,140,255,0.16)' },
  amber: { color: '#ffb347', bg: 'rgba(255,179,71,0.16)' },
};

const StatCard = ({ icon, title, value }) => (
  <View style={styles.statCard}>
    <View style={styles.statIconWrap}>
      <Ionicons name={icon} size={16} color="#8f7dff" />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

const OwnerDashboardScreen = ({ navigation, route }) => {
  const token = route?.params?.token;
  const user = route?.params?.user;

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState({
    stats: {
      totalCars: 0,
      published: 0,
      readyToPublish: 0,
      pendingDocs: 0,
      estimatedRevenueDA: 0,
    },
    activity: [],
  });

  const loadData = useCallback(async () => {
    if (!token || !user?.id) return;

    try {
      setError('');
      const data = await getOwnerDashboardData({ token, ownerId: user.id });
      setDashboard(data);
    } catch (err) {
      setError(err.message || 'Impossible de charger le tableau de bord');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>ESPACE PROPRIETAIRE</Text>
            <Text style={styles.title}>Bonjour, {user?.first_name || 'Owner'} 👋</Text>
          </View>
          <MessageIconButton navigation={navigation} mode="owner_clients" style={styles.inboxBtn} iconSize={20} />
        </View>

        {isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#8f7dff" />
          </View>
        ) : (
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8f7dff" />}
            contentContainerStyle={styles.content}
          >
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.grid}>
              <StatCard icon="car-outline" title="Mes vehicules" value={dashboard.stats.totalCars} />
              <StatCard icon="checkmark-circle-outline" title="Publiees" value={dashboard.stats.published} />
              <StatCard icon="time-outline" title="Pretes" value={dashboard.stats.readyToPublish} />
              <StatCard
                icon="cash-outline"
                title="Revenus estimés"
                value={`${dashboard.stats.estimatedRevenueDA.toLocaleString('fr-FR')} DA`}
              />
            </View>

            <View style={styles.quickRow}>
              <TouchableOpacity
                style={[styles.quickCard, styles.primaryQuickCard]}
                onPress={() => navigation.navigate('OwnerCars', { token, user })}
              >
                <Ionicons name="car-outline" size={24} color="#fff" />
                <Text style={styles.quickTitle}>Mes véhicules</Text>
                <Text style={styles.quickSubtitle}>Gérer mes voitures</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => navigation.navigate('OwnerListings', { token, user })}
              >
                <Ionicons name="list-outline" size={24} color="#8f7dff" />
                <Text style={styles.quickTitle}>Mes annonces</Text>
                <Text style={styles.quickSubtitle}>Gérer et publier</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Activité récente</Text>
            </View>

            {dashboard.activity.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Aucune activité pour le moment.</Text>
              </View>
            ) : (
              dashboard.activity.map((item) => {
                const tone = toneStyles[item.stateTone] || toneStyles.amber;
                return (
                  <View key={item.id} style={styles.activityCard}>
                    <View>
                      <Text style={styles.activityTitle}>{item.title}</Text>
                      <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
                    </View>
                    <View style={styles.rightActivity}>
                      <Text style={[styles.badge, { color: tone.color, backgroundColor: tone.bg }]}>{item.stateLabel}</Text>
                      <Text style={styles.activityPrice}>{Number(item.pricePerDay || 0).toLocaleString('fr-FR')} DA</Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
      <OwnerBottomNavigation navigation={navigation} route={route} active="dashboard" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0c24' },
  container: {
    flex: 1,
    backgroundColor: '#0a0c24',
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 8,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kicker: { color: '#8f7dff', fontSize: 12, letterSpacing: 1.2, fontWeight: '700' },
  title: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 6 },
  logoutBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logoutText: { color: '#b8bddf', fontWeight: '600' },
  inboxBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(18, 21, 46, 0.65)',
  },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 96 },
  errorText: { color: '#ff7f90', marginBottom: 10 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(21,23,58,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(146,151,214,0.2)',
    borderRadius: 16,
    padding: 10,
    minHeight: 82,
  },
  statIconWrap: {
    width: 25,
    height: 25,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(143,125,255,0.18)',
    marginBottom: 8,
  },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statTitle: { color: '#bcc1e2', marginTop: 2, fontSize: 12 },
  quickRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  quickCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(146,151,214,0.2)',
    backgroundColor: 'rgba(21,23,58,0.9)',
  },
  primaryQuickCard: {
    backgroundColor: COLORS.primary,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  quickTitle: { color: '#fff', fontSize: 22 / 1.7, fontWeight: '700', marginTop: 10 },
  quickSubtitle: { color: '#ced2f1', marginTop: 4 },
  sectionHeader: { marginTop: 18, marginBottom: 10 },
  sectionTitle: { color: '#fff', fontWeight: '700', fontSize: 30 / 1.6 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(146,151,214,0.2)',
    backgroundColor: 'rgba(21,23,58,0.9)',
    padding: 16,
  },
  emptyText: { color: '#aab1dd' },
  activityCard: {
    backgroundColor: 'rgba(21,23,58,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(146,151,214,0.2)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  activitySubtitle: { color: '#8f95c0', marginTop: 3 },
  rightActivity: { alignItems: 'flex-end' },
  badge: { fontSize: 12, fontWeight: '700', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  activityPrice: { color: '#8f7dff', fontWeight: '800', marginTop: 7 },
});

export default OwnerDashboardScreen;
