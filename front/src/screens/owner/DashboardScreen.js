import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View } from
'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getOwnerDashboardData } from '../../services/owner';
import OwnerBottomNavigation from '../../components/navigation/OwnerBottomNavigation';
import MessageIconButton from '../../components/messaging/MessageIconButton';
import NotificationIconButton from '../../components/notifications/NotificationIconButton';
import AppBackground from '../../components/layout/AppBackground';import { useTranslation } from "react-i18next";
import { Badge } from '../../components/agency/AgencyPrimitives';
import { getFriendlyError } from '../../utils/friendlyError';
import { getCurrentLocale } from '../../i18n';
import { useTheme } from '../../contexts/ThemeContext';

const toneStyles = {
  green: { color: '#21d4a7', bg: 'rgba(33,212,167,0.16)' },
  blue: { color: '#4f8cff', bg: 'rgba(79,140,255,0.16)' },
  amber: { color: '#ffb347', bg: 'rgba(255,179,71,0.16)' }
};

const OWNER_CARD_BG = '#111329';
const OWNER_CARD_BORDER = 'rgba(143, 150, 255, 0.14)';

const StatCard = ({ icon, title, value }) => {
  const { colors } = useTheme();
  return <View style={[styles.statCard, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
    <View style={styles.statIconWrap}>
      <Ionicons name={icon} size={16} color={colors.primary} />
    </View>
    <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    <Text style={[styles.statTitle, { color: colors.textMuted }]}>{title}</Text>
  </View>;
};


const OwnerDashboardScreen = ({ navigation, route }) => {const { t } = useTranslation();
  const { colors } = useTheme();
  const token = route?.params?.token;
  const user = route?.params?.user;
  const accountVerified = Boolean(user?.isVerified ?? user?.is_verified);
  const verificationLabel = accountVerified
    ? t('screens.owner.dashboardscreen.verificationBadgeVerified')
    : t('screens.owner.dashboardscreen.verificationBadgePending');
  const verificationTone = accountVerified ? 'green' : 'amber';

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState({
    stats: {
      totalCars: 0,
      published: 0,
      readyToPublish: 0,
      pendingDocs: 0,
      estimatedRevenueDA: 0
    },
    activity: []
  });

  const loadData = useCallback(async () => {
    if (!token || !user?.id) return;

    try {
      setError('');
      const data = await getOwnerDashboardData({ token, ownerId: user.id });
      setDashboard(data);
    } catch (err) {
      setError(getFriendlyError(err, t));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const loadConnectStatus = async () => {
      if (!token || !user?.id) return;
      try {
        const response = await fetch(API_ENDPOINTS.PAYMENTS.CONNECT_STATUS(user.id), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) return;
        const status = await response.json();
        setConnectStatus(status || null);
      } catch (_e) {

        // ignore
      }};
    loadConnectStatus();
  }, [token, user?.id]);

  const configureStripePayouts = async () => {
    if (!token) {
      const msg = 'Session expirée. Reconnectez-vous puis réessayez.';
      setError(msg);
      Alert.alert(t("screens.owner.dashboardscreen.configurerStripe"), msg);
      return;
    }
    if (!user?.id) {
      const msg = 'Utilisateur introuvable. Rechargez la page.';
      setError(msg);
      Alert.alert(t("screens.owner.dashboardscreen.configurerStripe"), msg);
      return;
    }

    try {
      setConnectLoading(true);
      const response = await fetch(API_ENDPOINTS.PAYMENTS.CONNECT_ONBOARDING_LINK, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Impossible de configurer Stripe');
      }
      const payload = await response.json();
      const url = payload?.onboardingUrl;
      if (!url) throw new Error('Lien Stripe indisponible');
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error('Impossible d’ouvrir le lien Stripe sur cet appareil');
      }
      await Linking.openURL(url);

      const statusResponse = await fetch(API_ENDPOINTS.PAYMENTS.CONNECT_STATUS(user.id), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        setConnectStatus(status || null);
      }
    } catch (e) {
      const msg = getFriendlyError(e, t);
      setError(msg);
      Alert.alert(t("screens.owner.dashboardscreen.configurerStripe"), msg);
    } finally {
      setConnectLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <AppBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.kicker, { color: colors.primary }]}>{t("screens.owner.dashboardscreen.espaceProprietaire")}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{t("screens.owner.dashboardscreen.bonjour")}{user?.first_name || 'Owner'}{t("screens.owner.dashboardscreen.text")}</Text>
          </View>
          <View style={styles.headerActions}>
            <NotificationIconButton
              navigation={navigation}
              style={styles.notificationButton}
              iconSize={24}
              routeParams={{ user: route?.params?.user }} />
            
            <MessageIconButton navigation={navigation} mode="owner_clients" style={styles.inboxBtn} iconSize={20} />
          </View>
        </View>

        <Badge
            label={verificationLabel}
            toneKey={verificationTone}
            fullWidth
            textStyle={styles.verificationBadgeText}
            style={[styles.verificationBadge, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}
          />

        {isLoading ?
        <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View> :

        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={styles.content}>
          
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.grid}>
              <StatCard icon="car-outline" title={t("screens.owner.dashboardscreen.mesVehicules")} value={dashboard.stats.totalCars} />
              <StatCard icon="checkmark-circle-outline" title={t("screens.owner.dashboardscreen.publiees")} value={dashboard.stats.published} />
              <StatCard icon="time-outline" title={t("screens.owner.dashboardscreen.pretes")} value={dashboard.stats.readyToPublish} />
              <StatCard
              icon="cash-outline"
              title={t("screens.owner.dashboardscreen.revenusEstimes")}
              value={`${dashboard.stats.estimatedRevenueDA.toLocaleString(getCurrentLocale())} DA`} />
            
            </View>

            <View style={styles.quickRow}>
              <TouchableOpacity
              style={[styles.quickCard, styles.primaryQuickCard, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => navigation.navigate('OwnerCars', { token, user })}>
              
                <Ionicons name="car-outline" size={24} color={colors.white} />
                <Text style={[styles.quickTitle, { color: colors.white }]}>{t("screens.owner.dashboardscreen.mesVehicules2")}</Text>
                <Text style={[styles.quickSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>{t("screens.owner.dashboardscreen.gererMesVoitures")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}
              onPress={() => navigation.navigate('OwnerListings', { token, user })}>
              
                <Ionicons name="list-outline" size={24} color={colors.primary} />
                <Text style={[styles.quickTitle, { color: colors.text }]}>{t("screens.owner.dashboardscreen.mesAnnonces")}</Text>
                <Text style={[styles.quickSubtitle, { color: colors.textMuted }]}>{t("screens.owner.dashboardscreen.gererEtPublier")}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.connectCard, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
              <View style={styles.connectCardHeader}>
                <Ionicons name="card-outline" size={20} color={colors.primary} />
                <Text style={[styles.connectTitle, { color: colors.text }]}>{t("screens.owner.dashboardscreen.paiementsCarteProprietaire")}</Text>
              </View>
              <Text style={[styles.connectText, { color: colors.textMuted }]}>
                {connectStatus?.cardPaymentsAvailable ?
              'Votre compte Stripe est pret. Les clients peuvent payer par carte.' :
              'Configurez Stripe pour recevoir les paiements carte des clients.'}
              </Text>
              <View style={styles.balanceRow}>
                <View style={[styles.balanceChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.balanceValue, { color: colors.text }]}>
                    {Number(connectStatus?.pendingBalance || 0).toLocaleString(getCurrentLocale())}{t("screens.owner.dashboardscreen.da")}
                </Text>
                  <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>{t("screens.owner.dashboardscreen.enAttente")}</Text>
                </View>
                <View style={[styles.balanceChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.balanceValue, { color: colors.text }]}>
                    {Number(connectStatus?.availableBalance || 0).toLocaleString(getCurrentLocale())}{t("screens.owner.dashboardscreen.da")}
                </Text>
                  <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>{t("screens.owner.dashboardscreen.disponible")}</Text>
                </View>
              </View>
              <TouchableOpacity
              onPress={configureStripePayouts}
              disabled={connectLoading}
              style={[styles.connectBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}>
              
                {connectLoading ?
              <ActivityIndicator color={colors.white} size="small" /> :

              <Text style={[styles.connectBtnText, { color: colors.white }]}>
                    {connectStatus?.cardPaymentsAvailable ? 'Mettre a jour Stripe' : t("screens.owner.dashboardscreen.configurerStripe")}
                  </Text>
              }
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("screens.owner.dashboardscreen.activiteRecente")}</Text>
            </View>

            {dashboard.activity.length === 0 ?
          <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>{t("screens.owner.dashboardscreen.aucuneActivitePourLeMoment")}</Text>
              </View> :

          dashboard.activity.map((item) => {
            const tone = toneStyles[item.stateTone] || toneStyles.amber;
            return (
              <View key={item.id} style={[styles.activityCard, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
                    <View>
                      <Text style={[styles.activityTitle, { color: colors.text }]}>{item.title}</Text>
                      <Text style={[styles.activitySubtitle, { color: colors.textMuted }]}>{item.subtitle}</Text>
                    </View>
                    <View style={styles.rightActivity}>
                      <Text style={[styles.badge, { color: tone.color, backgroundColor: tone.bg }]}>{item.stateLabel}</Text>
                      <Text style={[styles.activityPrice, { color: colors.primary }]}>{Number(item.pricePerDay || 0).toLocaleString(getCurrentLocale())}{t("screens.owner.dashboardscreen.da")}</Text>
                    </View>
                  </View>);

          })
          }
          </ScrollView>
        }
      </View>
      <OwnerBottomNavigation navigation={navigation} route={route} active="dashboard" />
    </AppBackground>);

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 16
  },
  header: {
    marginTop: 8,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  headerTextBlock: { flex: 1, minWidth: 0 },
  kicker: { color: '#8f7dff', fontSize: 12, letterSpacing: 1.2, fontWeight: '700' },
  title: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 6 },
  verificationBadge: {
    width: '100%',
    minHeight: 42,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 18
  },
  verificationBadgeText: {
    fontSize: 12
  },
  verificationSubtitle: {
    color: '#A5AECF',
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12
  },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  logoutBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
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
    backgroundColor: 'rgba(18, 21, 46, 0.65)'
  },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 96 },
  errorText: { color: '#ff7f90', marginBottom: 10 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10
  },
  statCard: {
    width: '48%',
    backgroundColor: OWNER_CARD_BG,
    borderWidth: 1,
    borderColor: OWNER_CARD_BORDER,
    borderRadius: 22,
    padding: 10,
    minHeight: 82
  },
  statIconWrap: {
    width: 25,
    height: 25,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(143,125,255,0.18)',
    marginBottom: 8
  },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statTitle: { color: '#bcc1e2', marginTop: 2, fontSize: 12 },
  quickRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  quickCard: {
    flex: 1,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: OWNER_CARD_BORDER,
    backgroundColor: OWNER_CARD_BG
  },
  primaryQuickCard: {
    backgroundColor: COLORS.primary,
    borderColor: 'rgba(255,255,255,0.22)'
  },
  quickTitle: { color: '#fff', fontSize: 22 / 1.7, fontWeight: '700', marginTop: 10 },
  quickSubtitle: { color: '#ced2f1', marginTop: 4 },
  connectCard: {
    marginTop: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: OWNER_CARD_BORDER,
    backgroundColor: OWNER_CARD_BG,
    padding: 14
  },
  connectCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  connectTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  connectText: { color: '#bcc1e2', marginTop: 8, fontSize: 12, lineHeight: 18 },
  balanceRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10
  },
  balanceChip: {
    flex: 1,
    backgroundColor: 'rgba(143,125,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(143,125,255,0.18)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  balanceValue: { color: '#fff', fontWeight: '800', fontSize: 14 },
  balanceLabel: { color: '#bcc1e2', fontSize: 11, marginTop: 2 },
  connectBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#8f7dff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 140,
    alignItems: 'center'
  },
  connectBtnText: { color: '#fff', fontWeight: '700' },
  sectionHeader: { marginTop: 18, marginBottom: 10 },
  sectionTitle: { color: '#fff', fontWeight: '700', fontSize: 30 / 1.6 },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: OWNER_CARD_BORDER,
    backgroundColor: OWNER_CARD_BG,
    padding: 16
  },
  emptyText: { color: '#aab1dd' },
  activityCard: {
    backgroundColor: OWNER_CARD_BG,
    borderWidth: 1,
    borderColor: OWNER_CARD_BORDER,
    borderRadius: 22,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  activityTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  activitySubtitle: { color: '#8f95c0', marginTop: 3 },
  rightActivity: { alignItems: 'flex-end' },
  badge: { fontSize: 12, fontWeight: '700', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  activityPrice: { color: '#8f7dff', fontWeight: '800', marginTop: 7 },
  notificationButton: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center'
  },

  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ff4d4f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },

  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700'
  }
});

export default OwnerDashboardScreen;
