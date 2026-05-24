import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminApi } from '../../services/admin';
import AdminBottomNavigation from '../../components/admin/AdminBottomNavigation';
import { Button, Card, Row, ScreenHeader, SearchBox, StatusBadge } from '../../components/admin/AdminUI';

export default function AdminReservationsScreen({ navigation, route }) {
  const [status, setStatus] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await adminApi.reservations({ status, ownerId, companyId, limit: 40 });
      setRows(data.data || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openDetails = async (reservationId) => {
    try {
      const d = await adminApi.reservationDetails(reservationId);
      const lines = [
        `Listing: ${d.listing?.title || 'N/A'}`,
        `Owner: ${d.owner ? `${d.owner.first_name || ''} ${d.owner.last_name || ''}`.trim() : 'N/A'}`,
        `Company: ${d.company?.company_name || 'N/A'}`,
        `Renter: ${d.renter ? `${d.renter.first_name || ''} ${d.renter.last_name || ''}`.trim() : 'N/A'}`,
        `Payment: ${d.payment ? `${d.payment.status} (€${d.payment.amount || 0})` : 'N/A'}`,
        `Pickup: ${d.pickup?.status || 'N/A'}`,
        `Owner docs: ${(d.ownerDocuments || []).map((x) => `${x.document_type}:${x.status}`).join(', ') || 'none'}`,
        `Car docs: ${(d.carDocuments || []).map((x) => `${x.document_type}:${x.status}`).join(', ') || 'none'}`,
      ];
      Alert.alert('Reservation details', lines.join('\n'));
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to load details');
    }
  };

  const suspendReservation = async (reservationId) => {
    try {
      await adminApi.suspendReservation(reservationId, 'Suspended after moderation review');
      load();
      Alert.alert('Suspended', 'Reservation suspended and notifications sent to owner and client.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to suspend reservation');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScreenHeader kicker="ADMIN PANEL" title="Bookings" />
        <SearchBox value={status} onChangeText={setStatus} placeholder="Status filter" />
        <SearchBox value={ownerId} onChangeText={setOwnerId} placeholder="Owner ID filter" />
        <SearchBox value={companyId} onChangeText={setCompanyId} placeholder="Company ID filter" />
        <Button label="Apply Filters" onPress={load} />
        <ScrollView contentContainerStyle={styles.content}>
          {loading ? <Text style={styles.muted}>Loading...</Text> : null}
          {!!error ? <Text style={styles.error}>{error}</Text> : null}
          <Card>
            {rows.map((r) => (
              <View key={r.id}>
                <Row
                  title={`${r.listing?.title || 'Booking'} - €${r.total_price}`}
                  subtitle={`${r.start_date} to ${r.end_date} • ${r.owner ? `${r.owner.first_name || ''} ${r.owner.last_name || ''}`.trim() : 'No owner'}`}
                  right={<StatusBadge status={r.status} />}
                />
                <View style={styles.actions}>
                  <Button label="View Details" type="ghost" onPress={() => openDetails(r.id)} />
                  <Button label="Suspend" type="danger" onPress={() => suspendReservation(r.id)} />
                </View>
              </View>
            ))}
          </Card>
        </ScrollView>
      </View>
      <AdminBottomNavigation navigation={navigation} route={route} active="reservations" />
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
