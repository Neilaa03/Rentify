import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminApi } from '../../services/admin';
import AdminBottomNavigation from '../../components/admin/AdminBottomNavigation';
import { Button, Card, Row, ScreenHeader, SearchBox, StatusBadge } from '../../components/admin/AdminUI';

export default function AdminReportsScreen({ navigation, route }) {
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await adminApi.reports({ status, limit: 40 });
      setRows(data.data || []);
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
        <ScreenHeader kicker="ADMIN PANEL" title="Reports" />
        <SearchBox value={status} onChangeText={setStatus} placeholder="Status filter" />
        <Button label="Search" onPress={load} />
        <ScrollView contentContainerStyle={styles.content}>
          {loading ? <Text style={styles.muted}>Loading...</Text> : null}
          {!!error ? <Text style={styles.error}>{error}</Text> : null}
          <Card>
            {rows.map((r) => (
              <View key={r.id}>
                <Row title={r.reason || 'Report'} subtitle={r.description || 'No description'} right={<StatusBadge status={r.status} />} />
                <View style={styles.actions}>
                  <Button label="Dismiss" type="ghost" onPress={async () => { await adminApi.updateReport(r.id, 'rejected'); load(); }} />
                  <Button label="Resolve" onPress={async () => { await adminApi.updateReport(r.id, 'resolved'); load(); }} />
                </View>
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginBottom: 8 },
});
