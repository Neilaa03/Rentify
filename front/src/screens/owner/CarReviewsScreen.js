import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View } from
'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';
import RatingStars from '../../components/reviews/RatingStars';
import ReviewCard from '../../components/reviews/ReviewCard';import { useTranslation } from "react-i18next";
import { getFriendlyError } from '../../utils/friendlyError';

const roundToHalf = (value) => Math.round(value * 2) / 2;

const OwnerCarReviewsScreen = ({ navigation, route }) => {const { t } = useTranslation();
  const token = route?.params?.token;
  const carId = route?.params?.carId;
  const car = route?.params?.car;

  const [sortBy, setSortBy] = useState('createdAt'); // createdAt | rating
  const [sortOrder, setSortOrder] = useState('desc'); // asc | desc
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  const reviewCount = Number(summary?.reviewCount || 0) || 0;
  const averageRounded = useMemo(() => roundToHalf(Number(summary?.averageRating || 0) || 0), [summary?.averageRating]);

  const title = useMemo(() => {
    const label = car ? `${car.brand || ''} ${car.model || ''}`.trim() : '';
    return label ? `Avis · ${label}` : t("screens.client.profilescreen.avis");
  }, [car]);

  const fetchAll = useCallback(async () => {
    if (!carId) return;
    try {
      setError('');
      const query = `?page=1&limit=50&sortBy=${encodeURIComponent(sortBy)}&sortOrder=${encodeURIComponent(sortOrder)}`;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const [summaryRes, listRes] = await Promise.all([
      fetch(API_ENDPOINTS.REVIEWS.CAR_SUMMARY(carId), { headers }),
      fetch(`${API_ENDPOINTS.REVIEWS.CAR_LIST(carId)}${query}`, { headers })]
      );

      if (summaryRes.ok) {
        const json = await summaryRes.json();
        setSummary(json || null);
      }

      if (!listRes.ok) {
        const err = await listRes.json().catch(() => ({}));
        throw new Error(err.error || 'Impossible de charger les avis');
      }
      const json = await listRes.json();
      setItems(Array.isArray(json?.items) ? json.items : []);
    } catch (e) {
      setError(getFriendlyError(e, t));
      setItems([]);
    }
  }, [carId, sortBy, sortOrder, token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchAll();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const toggleOrder = () => setSortOrder((prev) => prev === 'desc' ? 'asc' : 'desc');

  const orderLabel = useMemo(() => {
    if (sortBy === 'rating') return sortOrder === 'desc' ? 'Meilleures notes' : 'Moins bonnes';
    return sortOrder === 'desc' ? 'Most recent' : 'Plus anciens';
  }, [sortBy, sortOrder]);

  const renderItem = ({ item }) => <ReviewCard review={item} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.iconBtnPlaceholder} />
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.filtersRow}>
          <View style={styles.pillsRow}>
            <TouchableOpacity
              onPress={() => setSortBy('createdAt')}
              activeOpacity={0.85}
              style={[styles.pill, sortBy === 'createdAt' && styles.pillActive]}>
              
              <Text style={[styles.pillText, sortBy === 'createdAt' && styles.pillTextActive]}>{t("screens.owner.carreviewsscreen.date")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSortBy('rating')}
              activeOpacity={0.85}
              style={[styles.pill, sortBy === 'rating' && styles.pillActive]}>
              
              <Text style={[styles.pillText, sortBy === 'rating' && styles.pillTextActive]}>{t("screens.owner.carreviewsscreen.note")}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={toggleOrder} activeOpacity={0.85} style={styles.orderButton}>
            <LinearGradient
              colors={['rgba(143, 108, 255, 0.20)', 'rgba(143, 108, 255, 0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.orderButtonInner}>
              
              <Ionicons name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} size={16} color="#fff" />
              <Text style={styles.orderButtonText}>{orderLabel}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {loading ?
        <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.centerText}>{t("screens.owner.carreviewsscreen.chargement")}</Text>
          </View> :
        error ?
        <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View> :

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
          <View style={styles.center}>
                <Text style={styles.centerText}>{t("screens.owner.carreviewsscreen.aucunAvis")}</Text>
              </View>
          } />

        }
      </View>
    </SafeAreaView>);

};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f1228' },
  container: { flex: 1, backgroundColor: '#0f1228', paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(148, 156, 233, 0.16)',
    marginBottom: 12
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 156, 233, 0.10)'
  },
  iconBtnPlaceholder: {
    width: 44,
    height: 44
  },
  headerTitle: { flex: 1, marginHorizontal: 12, color: '#fff', fontSize: 18, fontWeight: '900' },
  filtersRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
  pillsRow: { flexDirection: 'row', gap: 10 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 156, 233, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.16)'
  },
  pillActive: { backgroundColor: 'rgba(143, 108, 255, 0.22)', borderColor: 'rgba(143, 108, 255, 0.35)' },
  pillText: { color: '#cfd3ff', fontSize: 12, fontWeight: '800' },
  pillTextActive: { color: '#fff' },
  orderButton: { flex: 1, alignItems: 'flex-end' },
  orderButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(143, 108, 255, 0.22)',
    minWidth: 160
  },
  orderButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  listContent: { paddingBottom: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { marginTop: 10, color: '#8e95bf', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  errorText: { color: '#ff6b6b', fontSize: 13, fontWeight: '800', textAlign: 'center' }
});

export default OwnerCarReviewsScreen;
