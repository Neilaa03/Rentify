import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminApi } from '../../services/admin';
import AdminBottomNavigation from '../../components/admin/AdminBottomNavigation';
import { Button, Card, Row, ScreenHeader, SearchBox, StatusBadge } from '../../components/admin/AdminUI';

export default function AdminCarsScreen({ navigation, route }) {
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await adminApi.cars({ search, limit: 40 });
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
        <ScreenHeader kicker="ADMIN PANEL" title="Cars" />
        <SearchBox value={search} onChangeText={setSearch} placeholder="Search brand/model" />
        <Button label="Search" onPress={load} />
        <ScrollView contentContainerStyle={styles.content}>
          {loading ? <Text style={styles.muted}>Loading...</Text> : null}
          {!!error ? <Text style={styles.error}>{error}</Text> : null}
          <Card>
            {rows.map((c) => (
              <View key={c.id}>
                <Row title={`${c.brand} ${c.model}`} subtitle={c.registration_number || 'No registration'} right={<StatusBadge status={c.approval_status || 'pending'} />} />
                <Text style={styles.subline}>
                  {c.company?.company_name ? `Company: ${c.company.company_name}` : `Owner: ${c.owner?.first_name || ''} ${c.owner?.last_name || ''}`}
                </Text>
                <View style={styles.actions}>
                  <Button label="Approve" onPress={async () => { await adminApi.updateCar(c.id, { approvalStatus: 'approved' }); load(); }} />
                  <Button label="Reject" type="danger" onPress={async () => { await adminApi.updateCar(c.id, { approvalStatus: 'rejected' }); load(); }} />
                  <Button label={c.is_hidden ? 'Unhide' : 'Hide'} type="ghost" onPress={async () => { await adminApi.updateCar(c.id, { isHidden: !c.is_hidden }); load(); }} />
                  <Button label="View Docs" type="ghost" onPress={async () => {
                    const d = await adminApi.carDetails(c.id);
                    const docs = (d.documents || []).map((x) => `${x.document_type}: ${x.status}`).join('\n') || 'No documents';
                    Alert.alert('Car Documents', `Owner: ${d.owner?.first_name || ''} ${d.owner?.last_name || ''}\n${d.company?.company_name ? `Company: ${d.company.company_name}\n` : ''}Documents:\n${docs}`);
                  }} />
                </View>
              </View>
            ))}
          </Card>
        </ScrollView>
      </View>
      <AdminBottomNavigation navigation={navigation} route={route} active="cars" />
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
  subline: { color: '#aab1dd', marginTop: 2, fontSize: 12 },
});
