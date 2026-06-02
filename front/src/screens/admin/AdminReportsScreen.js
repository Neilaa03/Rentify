import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/admin';
import AdminBottomNavigation from '../../components/admin/AdminBottomNavigation';
import { AdminLogoutButton, ScreenHeader } from '../../components/admin/AdminUI';

const tabs = ['Tous', 'Ouverts', 'En cours', 'Resolus', 'Clotures'];

const normalize = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('resolve')) return 'Resolus';
  if (s.includes('reject') || s.includes('close')) return 'Clotures';
  if (s.includes('progress') || s.includes('review')) return 'En cours';
  return 'Ouverts';
};

export default function AdminReportsScreen({ navigation, route }) {
  const [rows, setRows] = useState([]);
  const [active, setActive] = useState('Tous');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await adminApi.reports({ limit: 60 });
      setRows(data.data || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => rows.filter((r) => active === 'Tous' || normalize(r.status) === active), [rows, active]);
  const counts = useMemo(() => ({
    open: rows.filter((r) => normalize(r.status) === 'Ouverts').length,
    progress: rows.filter((r) => normalize(r.status) === 'En cours').length,
    resolved: rows.filter((r) => normalize(r.status) === 'Resolus').length,
    closed: rows.filter((r) => normalize(r.status) === 'Clotures').length,
  }), [rows]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
          <ScreenHeader title="Signalements" rightAction={<AdminLogoutButton navigation={navigation} />} />

          <View style={styles.alertBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#ff4d6d" />
            <Text style={styles.alertText}>{counts.open} signalements ouverts necessitant une action</Text>
          </View>

          <View style={styles.topStats}>
            <Stat value={counts.open} label="Ouvert" tone="#ff4d6d" icon="alert-circle-outline" />
            <Stat value={counts.progress} label="En cours" tone="#ffb020" icon="time-outline" />
            <Stat value={counts.resolved} label="Resolu" tone="#00d084" icon="checkmark-circle-outline" />
            <Stat value={counts.closed} label="Cloture" tone="#8f9dff" icon="lock-closed-outline" />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow} contentContainerStyle={styles.filtersRowContent}>
            {tabs.map((tab) => (
              <TouchableOpacity key={tab} style={[styles.filterChip, active === tab && styles.filterChipActive]} onPress={() => setActive(tab)}>
                <Text style={[styles.filterText, active === tab && styles.filterTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {!!error ? <Text style={styles.error}>{error}</Text> : null}
          {visible.map((r) => {
            const status = normalize(r.status);
            const cardIcon = status === 'Ouverts'
              ? 'alert-circle-outline'
              : status === 'En cours'
                ? 'time-outline'
                : status === 'Resolus'
                  ? 'checkmark-circle-outline'
                  : 'lock-closed-outline';
            return (
              <View key={r.id} style={[styles.reportCard, status === 'Ouverts' ? styles.reportOpen : null]}>
                <View style={styles.tagsRow}>
                  <View style={styles.cardIcon}>
                    <Ionicons name={cardIcon} size={14} color={status === 'Ouverts' ? '#ff4d6d' : status === 'En cours' ? '#ffb020' : status === 'Resolus' ? '#00d084' : '#8f9dff'} />
                  </View>
                  <Text style={styles.reason}>{r.reason || 'Signalement'}</Text>
                  <Text style={[styles.status, status === 'Ouverts' ? styles.statusOpen : status === 'En cours' ? styles.statusProgress : status === 'Resolus' ? styles.statusResolved : styles.statusClosed]}>{status}</Text>
                </View>
                <Text style={styles.reportTitle}>{r.reporter_name || 'Utilisateur'} -> {r.target_name || 'Compte'}</Text>
                <Text style={styles.reportDesc} numberOfLines={2}>{r.description || 'Aucune description.'}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={async () => { await adminApi.updateReport(r.id, 'rejected'); load(); }}>
                    <Text style={styles.actionText}>Cloturer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={async () => { await adminApi.updateReport(r.id, 'resolved'); load(); }}>
                    <Text style={styles.actionText}>Resoudre</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          {loading ? <Text style={styles.loading}>Chargement...</Text> : null}
        </ScrollView>
      </View>
      <AdminBottomNavigation navigation={navigation} route={route} active="reports" />
    </SafeAreaView>
  );
}

function Stat({ value, label, tone, icon }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statRow}>
        <Ionicons name={icon} size={14} color={tone} />
        <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070a1f' },
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#070a1f' },
  pageScroll: { flex: 1 },
  pageContent: { paddingBottom: 92 },
  title: { color: '#f2f4ff', fontSize: 36, fontWeight: '800', marginTop: 10, marginBottom: 14 },
  alertBox: { borderRadius: 12, borderWidth: 1, borderColor: '#6f2838', backgroundColor: 'rgba(255,77,109,0.08)', paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  alertText: { color: '#ff7d95', fontSize: 13, fontWeight: '600' },
  topStats: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: { width: '23%', backgroundColor: '#0f1433', borderWidth: 1, borderColor: '#2b315c', borderRadius: 12, alignItems: 'center', paddingVertical: 7, paddingHorizontal: 6 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#7d84b1', fontSize: 10, marginTop: 2, textAlign: 'center' },
  filtersRow: { marginTop: 12, marginBottom: 12 },
  filtersRowContent: { paddingVertical: 6, paddingRight: 8 },
  filterChip: { backgroundColor: '#171d44', borderRadius: 99, borderWidth: 1, borderColor: '#2d3360', paddingHorizontal: 14, height: 34, justifyContent: 'center', marginRight: 8 },
  filterChipActive: { backgroundColor: '#8f7dff', borderColor: '#8f7dff' },
  filterText: { color: '#9299c8', fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  content: { paddingTop: 10 },
  reportCard: { backgroundColor: '#0f1433', borderWidth: 1, borderColor: '#2b315c', borderRadius: 14, padding: 10, marginBottom: 8 },
  reportOpen: { borderColor: '#7f3042' },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardIcon: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#1b214a', justifyContent: 'center', alignItems: 'center' },
  reason: { color: '#ff9a59', backgroundColor: 'rgba(255,154,89,0.14)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, fontWeight: '700', fontSize: 11 },
  status: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, fontWeight: '700', fontSize: 11 },
  statusOpen: { color: '#ff4d6d', backgroundColor: 'rgba(255,77,109,0.14)' },
  statusProgress: { color: '#ffb020', backgroundColor: 'rgba(255,176,32,0.14)' },
  statusResolved: { color: '#00d084', backgroundColor: 'rgba(0,208,132,0.14)' },
  statusClosed: { color: '#8f9dff', backgroundColor: 'rgba(143,157,255,0.14)' },
  reportTitle: { color: '#f1f4ff', fontWeight: '700' },
  reportDesc: { color: '#8b93c2', marginTop: 5 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { borderWidth: 1, borderColor: '#3b4272', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  actionPrimary: { borderColor: '#00a86d', backgroundColor: 'rgba(0,208,132,0.16)' },
  actionText: { color: '#d7dcff', fontWeight: '700', fontSize: 12 },
  loading: { color: '#8d94c2', marginTop: 8 },
  error: { color: '#ff7f90', marginBottom: 8 },
});
