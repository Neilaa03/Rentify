import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/admin';
import AdminBottomNavigation from '../../components/admin/AdminBottomNavigation';

const toneColor = {
  blue: '#58a6ff',
  green: '#00d084',
  amber: '#ffb020',
  red: '#ff4d6d',
};

const formatDA = (value) => `${Number(value || 0).toLocaleString('fr-FR')} DA`;

export default function AdminDashboardScreen({ navigation, route }) {
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    adminApi.dashboard()
      .then((data) => setState({ loading: false, error: '', data }))
      .catch((e) => setState({ loading: false, error: e.message, data: null }));
  }, []);

  const counters = useMemo(() => {
    const totals = state.data?.totals || {};
    const reportsOpen = Number(totals.openReports || totals.pendingReports || 0);
    const docsPending = Number(totals.pendingCarApprovals || totals.pendingDocuments || 0);
    const users = Number(totals.users || 0);
    const revenue = Number(totals.revenue || 0);
    return { reportsOpen, docsPending, users, revenue };
  }, [state.data]);

  const quickActions = [
    { key: 'docs', title: 'Docs en attente', value: counters.docsPending, tone: 'amber', icon: 'document-text-outline', to: 'AdminCars' },
    { key: 'reports', title: 'Signalements ouverts', value: counters.reportsOpen, tone: 'red', icon: 'flag-outline', to: 'AdminReports' },
    { key: 'users', title: 'Comptes a verifier', value: Math.max(0, counters.users - 1), tone: 'blue', icon: 'people-outline', to: 'AdminUsers' },
    { key: 'activity', title: 'Comptes signales', value: counters.reportsOpen, tone: 'green', icon: 'alert-circle-outline', to: 'AdminReservations' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>ADMINISTRATION</Text>
            <Text style={styles.title}>Tableau de bord</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!!state.error ? <Text style={styles.error}>{state.error}</Text> : null}
          <View style={styles.alertBox}>
            <Ionicons name="warning-outline" size={16} color={toneColor.amber} />
            <Text style={styles.alertText}>{counters.docsPending} documents en attente · {counters.reportsOpen} signalements ouverts</Text>
          </View>

          <View style={styles.grid}>
            <StatCard icon="people-outline" value={counters.users} label="Utilisateurs" sub="proprietaires" tone="blue" />
            <StatCard icon="trending-up-outline" value={formatDA(counters.revenue)} label="Revenus totaux" sub="reservations" tone="green" />
            <StatCard icon="document-text-outline" value={counters.docsPending} label="Docs en attente" sub="a verifier" tone="amber" />
            <StatCard icon="flag-outline" value={counters.reportsOpen} label="Signalements" sub="en cours" tone="red" />
          </View>

          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.grid}>
            {quickActions.map((item) => (
              <TouchableOpacity key={item.key} style={styles.quickCard} onPress={() => navigation.navigate(item.to, route?.params || {})}>
                <View style={[styles.iconChip, { backgroundColor: `${toneColor[item.tone]}22` }]}>
                  <Ionicons name={item.icon} size={16} color={toneColor[item.tone]} />
                </View>
                <Text style={[styles.quickValue, { color: toneColor[item.tone] }]}>{item.value}</Text>
                <Text style={styles.quickLabel}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resume de la plateforme</Text>
            <SummaryLine label="Comptes verifies" value={Math.max(0, counters.users - counters.docsPending)} tone="green" />
            <SummaryLine label="Comptes en attente" value={counters.docsPending} tone="amber" />
            <SummaryLine label="Comptes signales" value={counters.reportsOpen} tone="red" />
            <SummaryLine label="Comptes suspendus" value={0} tone="blue" />
          </View>

          {state.loading ? <Text style={styles.loading}>Chargement...</Text> : null}
        </ScrollView>
      </View>
      <AdminBottomNavigation navigation={navigation} route={route} active="dashboard" />
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label, sub, tone }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.iconChip, { backgroundColor: `${toneColor[tone]}22` }]}>
        <Ionicons name={icon} size={16} color={toneColor[tone]} />
      </View>
      <Text style={styles.statValue}>{String(value)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statSub, { color: toneColor[tone] }]}>{sub}</Text>
    </View>
  );
}

function SummaryLine({ label, value, tone }) {
  const width = `${Math.min(100, Math.max(6, Number(value || 0) * 8))}%`;
  return (
    <View style={styles.summaryLineWrap}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={[styles.summaryValue, { color: toneColor[tone] }]}>{value}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width, backgroundColor: toneColor[tone] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070a1f' },
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#070a1f' },
  headerRow: { marginTop: 8, marginBottom: 12 },
  kicker: { color: '#7d78b6', fontWeight: '700', letterSpacing: 1.1, fontSize: 11 },
  title: { color: '#f2f4ff', fontSize: 34, fontWeight: '800', marginTop: 4 },
  content: { paddingBottom: 94 },
  alertBox: { borderRadius: 12, borderWidth: 1, borderColor: '#6d4f1f', backgroundColor: 'rgba(255,176,32,0.08)', paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  alertText: { color: '#ffc35c', fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48.5%', backgroundColor: '#0e1232', borderWidth: 1, borderColor: '#2a2f57', borderRadius: 14, padding: 12, marginBottom: 10 },
  iconChip: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statValue: { color: '#ecf0ff', fontSize: 28, fontWeight: '800', marginTop: 10 },
  statLabel: { color: '#9ea5ce', fontSize: 13, marginTop: 4 },
  statSub: { fontSize: 12, marginTop: 4, fontWeight: '700' },
  sectionTitle: { color: '#f1f2ff', fontSize: 28, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  quickCard: { width: '48.5%', backgroundColor: '#0e1232', borderWidth: 1, borderColor: '#2a2f57', borderRadius: 14, padding: 12, marginBottom: 10 },
  quickValue: { fontSize: 31, fontWeight: '800', marginTop: 10 },
  quickLabel: { color: '#8d94c2', marginTop: 4 },
  summaryCard: { backgroundColor: '#10163a', borderWidth: 1, borderColor: '#2a2f57', borderRadius: 14, padding: 14, marginTop: 6 },
  summaryTitle: { color: '#f2f4ff', fontSize: 20, fontWeight: '700', marginBottom: 10 },
  summaryLineWrap: { marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { color: '#98a0c9' },
  summaryValue: { fontWeight: '800' },
  barTrack: { height: 5, backgroundColor: '#1a2045', borderRadius: 99, overflow: 'hidden' },
  barFill: { height: '100%' },
  error: { color: '#ff7f90', marginBottom: 8 },
  loading: { color: '#8d94c2', marginTop: 8 },
});
