import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminApi } from '../../services/admin';
import AdminBottomNavigation from '../../components/admin/AdminBottomNavigation';
import { AdminLogoutButton, Button, Card, Row, ScreenHeader, SearchBox, StatCard, StatusBadge } from '../../components/admin/AdminUI';

export default function AdminPaymentsScreen({ navigation, route }) {
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await adminApi.payments({ status, limit: 40 });
      setRows(data.data || []);
      setAnalytics(data.analytics || null);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScreenHeader kicker="ADMIN PANEL" title="Payments" rightAction={<AdminLogoutButton navigation={navigation} />} />
        <View style={styles.topActions}>
          <Button label="Reports" type="ghost" onPress={() => navigation.navigate('AdminReports', route?.params || {})} />
        </View>
        <SearchBox value={status} onChangeText={setStatus} placeholder="Status filter" />
        <Button label="Search" onPress={load} />
        <ScrollView contentContainerStyle={styles.content}>
          {analytics ? <View style={styles.grid}><StatCard label="Failed" value={analytics.failed} /><StatCard label="Revenue" value={`€${analytics.grossRevenue}`} /></View> : null}
          {loading ? <Text style={styles.muted}>Loading...</Text> : null}
          {!!error ? <Text style={styles.error}>{error}</Text> : null}
          <Card>
            {rows.map((p) => (
              <View key={p.id}>
                <Row title={`${p.id.slice(0, 8)} - €${p.amount}`} subtitle={p.payment_method || 'card'} right={<StatusBadge status={p.status} />} />
                {['completed', 'paid'].includes(p.status) ? <Button label="Refund" type="danger" onPress={async () => { await adminApi.refund({ paymentId: p.id, reason: 'Admin refund' }); load(); }} /> : null}
              </View>
            ))}
          </Card>
        </ScrollView>
      </View>
      <AdminBottomNavigation navigation={navigation} route={route} active="more" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0c24' },
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#0a0c24' },
  content: { paddingBottom: 98 },
  muted: { color: '#aab1dd' },
  error: { color: '#ff7f90', marginBottom: 8 },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  topActions: { flexDirection: 'row', marginBottom: 8 },
});
