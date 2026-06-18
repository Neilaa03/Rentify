import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AgencyBottomNavigation from '../../components/navigation/AgencyBottomNavigation';
import { AgencyCard, Badge, MetricCard, ProgressRow, RequestRow, SectionTitle } from '../../components/agency/AgencyPrimitives';
import { getAgencyDashboard } from '../../services/agency';import { useTranslation } from "react-i18next";
import { getFriendlyError } from '../../utils/friendlyError';
import { getCurrentLocale } from '../../i18n';
import { useTheme } from '../../contexts/ThemeContext';
import AppBackground from '../../components/layout/AppBackground';

const toneMap = ['purple', 'blue', 'green', 'amber'];

export default function AgencyDashboardScreen({ navigation, route }) {const { t } = useTranslation();
  const { colors } = useTheme();
  const token = route?.params?.token;
  const user = route?.params?.user;

  const [state, setState] = useState({ loading: true, refreshing: false, error: '', data: null });

  const load = useCallback(async () => {
    if (!token) {
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: 'Session requise' }));
      return;
    }
    try {
      const data = await getAgencyDashboard({ token });
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: '', data }));
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: getFriendlyError(error, t) }));
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setState((prev) => ({ ...prev, refreshing: true }));
    await load();
  };

  const agency = state.data?.agency || {};
  const counters = state.data?.counters || {};
  const metrics = state.data?.monthlyMetrics || {};
  const latestRequests = state.data?.latestRequests || [];
  const completion = Number(agency.completionPercentage || 0);
  const vehicles = Array.isArray(state.data?.vehicles) ? state.data.vehicles : [];
  const verifiedDocs = vehicles.reduce((sum, vehicle) => sum + (vehicle.documents || []).filter((doc) => doc.status === 'VERIFIED').length, 0);
  const documentTotal = vehicles.reduce((sum, vehicle) => sum + (vehicle.documents || []).length, 0);
  const isVerified = String(agency.verificationStatus || '').toUpperCase() === 'VERIFIED';
  const verificationLabel = isVerified ? 'AGENCY VERIFIED' : ' APPROVAL PENDING';
  const verificationTone = isVerified ? 'green' : 'amber';

  // Calculate aggregate statistics from vehicles
  const totalViews = vehicles.reduce((sum, vehicle) => sum + (Number(vehicle.viewCount) || Number(vehicle.views) || 0), 0);
  const totalReservations = vehicles.reduce((sum, vehicle) => sum + (Number(vehicle.totalReservations) || 0), 0);
  const totalReviews = vehicles.reduce((sum, vehicle) => sum + (Number(vehicle.reviewCount) || Number(vehicle.reviews?.length) || 0), 0);
  const averageRating = vehicles.length > 0 ?
  (vehicles.reduce((sum, vehicle) => sum + (Number(vehicle.averageRating) || 0), 0) / vehicles.length).toFixed(1) :
  0;

  return (
    <AppBackground contentStyle={styles.safeArea}>
      <View style={styles.overlay}>
        <View style={styles.page}>
          <View style={styles.header}>
            <View style={styles.headerTextBlock}>
              <Text style={[styles.kicker, { color: colors.primary }]}>{t("screens.agency.agencydashboardscreen.agencyOwner")}</Text>
              <Text style={[styles.title, { color: colors.white }]}>{agency.commercialName || 'Espace agence'}</Text>
              <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.82)' }]}>{t("screens.agency.agencydashboardscreen.bienvenue")}{user?.first_name || user?.firstName || 'manager'}{t("screens.agency.agencydashboardscreen.gestionPremiumDesVehicules")}</Text>
            </View>
            <Badge
                label={verificationLabel}
                toneKey={verificationTone}
                fullWidth
                style={[styles.verificationBadge, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]} />
              
          </View>

          {state.loading ?
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View> :

            <ScrollView
              refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}>
              
              {state.error ? <Text style={[styles.error, { color: colors.danger }]}>{state.error}</Text> : null}

              {agency.verificationStatus === 'PENDING' || agency.verificationStatus === 'INCOMPLETE' ?
              <AgencyCard style={styles.banner}>
                  <View style={styles.bannerRow}>
                    <View style={[styles.bannerIcon, { backgroundColor: `${colors.warning}22` }]}>
                      <Ionicons name="time-outline" size={18} color="#FFB347" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bannerTitle, { color: colors.text }]}>{t("screens.agency.agencydashboardscreen.enAttenteDeVerification")}</Text>
                      <Text style={[styles.bannerText, { color: colors.textMuted }]}>{t("screens.agency.agencydashboardscreen.votreDossierEstEnCoursDeRevue")}</Text>
                    </View>
                  </View>
                </AgencyCard> :
              null}

              <View style={styles.metricsGrid}>
                <MetricCard label={t("screens.agency.agencydashboardscreen.totalVehicules")} value={Number(counters.totalVehicles || 0)} icon="car-sport-outline" toneKey="purple" />
                <MetricCard label={t("screens.agency.agencydashboardscreen.disponibles")} value={Number(counters.availableVehicles || 0)} icon="checkmark-circle-outline" toneKey="green" />
                <MetricCard label={t("screens.agency.agencydashboardscreen.loues")} value={Number(counters.rentedVehicles || 0)} icon="timer-outline" toneKey="amber" />
                <MetricCard label={t("screens.agency.agencydashboardscreen.revenus")} value={`${Number(counters.monthlyRevenue || 0).toLocaleString(getCurrentLocale())} DA`} icon="cash-outline" toneKey="blue" />
              </View>

              <AgencyCard style={styles.statsCard}>
                <SectionTitle kicker="PERFORMANCE" />
                <View style={styles.statsRow}>
                  <View style={[styles.statItem, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
                    <View style={styles.statIcon}>
                      <Ionicons name="eye-outline" size={16} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{totalViews.toLocaleString(getCurrentLocale())}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t("screens.agency.agencydashboardscreen.vues")}</Text>
                  </View>
                  <View style={[styles.statItem, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
                    <View style={styles.statIcon}>
                      <Ionicons name="calendar-outline" size={16} color={colors.success} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.success }]}>{totalReservations.toLocaleString(getCurrentLocale())}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t("screens.agency.agencydashboardscreen.reservations")}</Text>
                  </View>
                  <View style={[styles.statItem, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
                    <View style={styles.statIcon}>
                      <Ionicons name="star-outline" size={16} color={colors.warning} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.warning }]}>{averageRating}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t("screens.agency.agencydashboardscreen.evaluation")}</Text>
                  </View>
                </View>
              </AgencyCard>

              <AgencyCard style={styles.card}>
                <SectionTitle kicker="ACTIVITE" title={t("screens.agency.agencydashboardscreen.dernieresDemandes")} subtitle={t("screens.agency.agencydashboardscreen.lesTroisDernieresReservationsDeVotreFlotte")} />
                {latestRequests.length ? latestRequests.map((request) => <RequestRow key={request.id} item={request} />) : <Text style={styles.empty}>{t("screens.agency.agencydashboardscreen.aucuneDemandeRecente")}</Text>}
              </AgencyCard>
            </ScrollView>
            }
        </View>
      </View>
        <AgencyBottomNavigation navigation={navigation} route={route} active="dashboard" />
    </AppBackground>);

}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#0a0c24' },
  safeArea: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(2,3,14,0.58)' },
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  header: { marginBottom: 16, gap: 12 },
  headerTextBlock: { width: '100%' },
  kicker: { color: '#8E95BF', fontSize: 11, fontWeight: '900', letterSpacing: 1.3, marginBottom: 4 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900' },
  subtitle: { color: '#A5AECF', marginTop: 5, fontSize: 13, lineHeight: 18, maxWidth: '92%' },
  verificationBadge: { marginTop: 10, width: '100%' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 102 },
  error: { color: '#FF8FA3', marginBottom: 12, fontWeight: '700' },
  banner: { padding: 16, marginBottom: 14 },
  bannerRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  bannerIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,145,0,0.14)' },
  bannerTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  bannerText: { color: '#A5AECF', marginTop: 4, lineHeight: 18 },
  card: { padding: 16, marginBottom: 14 },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#8f7dff' },
  progressCaption: { color: '#A5AECF', marginTop: 8, fontSize: 12, fontWeight: '700' },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  statsCard: { padding: 12, marginBottom: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: -36 },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(143,125,255,0.1)', borderWidth: 1, borderColor: 'rgba(143,125,255,0.2)' },
  statIcon: { marginBottom: 6 },
  statValue: { color: '#8f7dff', fontSize: 14, fontWeight: '900', marginBottom: 2 },
  statLabel: { color: '#8E95BF', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  empty: { color: '#A5AECF', fontStyle: 'italic', paddingVertical: 10 }
});
