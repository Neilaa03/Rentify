import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/admin';
import AdminBottomNavigation from '../../components/admin/AdminBottomNavigation';import { useTranslation } from "react-i18next";

const tabs = ['Tout', 'Inscriptions', 'Reservations', 'Documents', 'Paiements'];

const pickType = (item) => {
  const t = String(item.type || item.status || '').toLowerCase();
  if (t.includes('inscript') || t.includes('user')) return 'Inscriptions';
  if (t.includes('reserv')) return 'Reservations';
  if (t.includes('doc')) return 'Documents';
  if (t.includes('pay') || t.includes('refund')) return 'Paiements';
  return 'Reservations';
};

export default function AdminReservationsScreen({ navigation, route }) {const { t } = useTranslation();
  const [active, setActive] = useState('Tout');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await adminApi.dashboard();
      const activity = (data.recentActivity || []).map((a, idx) => ({ ...a, _id: `${a.at || ''}-${idx}`, category: pickType(a) }));
      setEvents(activity);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {load();}, []);

  const visible = useMemo(() => events.filter((e) => active === 'Tout' || e.category === active), [events, active]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{t("screens.admin.adminreservationsscreen.journalDactivite")}</Text>

        <View style={styles.topStats}>
          <MiniStat icon="flash-outline" value={visible.length} label={t("screens.admin.adminreservationsscreen.aujourdhui")} />
          <MiniStat icon="list-outline" value={events.length} label={t("screens.admin.adminreservationsscreen.total")} />
          <MiniStat icon="calendar-outline" value={visible.filter((e) => e.category === t("screens.admin.adminreservationsscreen.reservations")).length} label={t("screens.admin.adminreservationsscreen.reservations")} />
          <MiniStat icon="cash-outline" value={visible.filter((e) => e.category === t("screens.admin.adminreservationsscreen.paiements")).length} label={t("screens.admin.adminreservationsscreen.paiements")} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
          {tabs.map((tab) =>
          <TouchableOpacity key={tab} style={[styles.filterChip, active === tab && styles.filterChipActive]} onPress={() => setActive(tab)}>
              <Text style={[styles.filterText, active === tab && styles.filterTextActive]}>{tab}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!!error ? <Text style={styles.error}>{error}</Text> : null}
          {visible.map((e) =>
          <View key={e._id} style={styles.item}>
              <Text style={styles.time}>{e.at ? new Date(e.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</Text>
              <View style={styles.iconWrap}><Ionicons name={e.category === t("screens.admin.adminreservationsscreen.paiements") ? 'cash-outline' : e.category === t("components.admin.adminbottomnavigation.documents") ? 'document-outline' : e.category === 'Inscriptions' ? 'person-add-outline' : 'calendar-outline'} size={15} color="#8f9dff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.badge}>{e.category}</Text>
                <Text style={styles.eventTitle}>{e.type || 'Evenement'}</Text>
                <Text style={styles.eventSub}>{e.status || ''}</Text>
              </View>
            </View>
          )}
          {loading ? <Text style={styles.loading}>{t("screens.admin.adminreservationsscreen.chargement")}</Text> : null}
        </ScrollView>
      </View>
      <AdminBottomNavigation navigation={navigation} route={route} active="activity" />
    </SafeAreaView>);

}

function MiniStat({ icon, value, label }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={14} color="#8f9dff" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>);

}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070a1f' },
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#070a1f' },
  title: { color: '#f2f4ff', fontSize: 36, fontWeight: '800', marginTop: 10, marginBottom: 14 },
  topStats: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: { width: '23.5%', backgroundColor: '#0f1433', borderWidth: 1, borderColor: '#2b315c', borderRadius: 12, alignItems: 'center', paddingVertical: 8 },
  statValue: { color: '#f2f4ff', fontSize: 20, fontWeight: '800', marginTop: 6 },
  statLabel: { color: '#7d84b1', fontSize: 11, marginTop: 2 },
  filtersRow: { marginTop: 12, marginBottom: 8, maxHeight: 42 },
  filterChip: { backgroundColor: '#171d44', borderRadius: 99, borderWidth: 1, borderColor: '#2d3360', paddingHorizontal: 14, height: 34, justifyContent: 'center', marginRight: 8 },
  filterChipActive: { backgroundColor: '#8f7dff', borderColor: '#8f7dff' },
  filterText: { color: '#9299c8', fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  content: { paddingTop: 10, paddingBottom: 92 },
  item: { backgroundColor: '#0f1433', borderWidth: 1, borderColor: '#2b315c', borderRadius: 14, padding: 10, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { color: '#6e76a6', width: 44, fontSize: 12 },
  iconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#1b214a', justifyContent: 'center', alignItems: 'center' },
  badge: { color: '#00d084', fontWeight: '700', fontSize: 12 },
  eventTitle: { color: '#f1f4ff', fontSize: 14, marginTop: 2 },
  eventSub: { color: '#8b93c2', fontSize: 12, marginTop: 1 },
  loading: { color: '#8d94c2', marginTop: 8 },
  error: { color: '#ff7f90', marginBottom: 8 }
});