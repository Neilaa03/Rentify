import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminApi } from '../../services/admin';
import AdminBottomNavigation from '../../components/admin/AdminBottomNavigation';
import { Card, Row, ScreenHeader, StatCard, StatusBadge } from '../../components/admin/AdminUI';

export default function AdminDashboardScreen({ navigation, route }) {
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    adminApi.dashboard().then((data) => setState({ loading: false, error: '', data })).catch((e) => setState({ loading: false, error: e.message, data: null }));
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScreenHeader kicker="ADMIN PANEL" title="Dashboard" />
        <ScrollView contentContainerStyle={styles.content}>
          {state.loading ? <Text style={styles.muted}>Loading...</Text> : null}
          {!!state.error ? <Text style={styles.error}>{state.error}</Text> : null}
          {state.data ? (
            <>
              <View style={styles.grid}>
                <StatCard label="Total Users" value={state.data.totals.users} />
                <StatCard label="Total Cars" value={state.data.totals.cars} />
                <StatCard label="Reservations" value={state.data.totals.reservations} />
                <StatCard label="Revenue" value={`€${state.data.totals.revenue}`} />
              </View>
              <Card>
                <Text style={styles.sectionTitle}>Pending Car Approvals</Text>
                <Text style={styles.big}>{state.data.totals.pendingCarApprovals}</Text>
              </Card>
              <Card>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                {state.data.recentActivity.map((a, idx) => <Row key={`${a.at}-${idx}`} title={`${a.type} - €${a.amount || 0}`} subtitle={new Date(a.at).toLocaleString()} right={<StatusBadge status={a.status} />} />)}
              </Card>
            </>
          ) : null}
        </ScrollView>
      </View>
      <AdminBottomNavigation navigation={navigation} route={route} active="dashboard" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0c24' },
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#0a0c24' },
  content: { paddingBottom: 98 },
  muted: { color: '#aab1dd' },
  error: { color: '#ff7f90', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  sectionTitle: { color: '#fff', fontWeight: '700', marginBottom: 8 },
  big: { color: '#8f7dff', fontWeight: '800', fontSize: 24 },
});
