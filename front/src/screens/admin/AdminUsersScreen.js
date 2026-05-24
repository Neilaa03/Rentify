import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminApi } from '../../services/admin';
import AdminBottomNavigation from '../../components/admin/AdminBottomNavigation';
import { Button, Card, Row, ScreenHeader, SearchBox, StatusBadge } from '../../components/admin/AdminUI';

export default function AdminUsersScreen({ navigation, route }) {
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await adminApi.users({ search, limit: 40 });
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
        <ScreenHeader kicker="ADMIN PANEL" title="Users" />
        <SearchBox value={search} onChangeText={setSearch} placeholder="Search by email or name" />
        <Button label="Search" onPress={load} />
        <ScrollView contentContainerStyle={styles.content}>
          {loading ? <Text style={styles.muted}>Loading...</Text> : null}
          {!!error ? <Text style={styles.error}>{error}</Text> : null}
          <Card>
            {rows.map((u) => (
              <View key={u.id}>
                <Row title={`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email} subtitle={u.email} right={<StatusBadge status={u.role} />} />
                <View style={styles.actions}>
                  <Button label={u.is_active ? 'Suspend' : 'Reactivate'} type={u.is_active ? 'danger' : 'ghost'} onPress={async () => { await adminApi.updateUser(u.id, { isActive: !u.is_active }); load(); }} />
                </View>
              </View>
            ))}
          </Card>
        </ScrollView>
      </View>
      <AdminBottomNavigation navigation={navigation} route={route} active="users" />
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
