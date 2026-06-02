import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/admin';
import AdminBottomNavigation from '../../components/admin/AdminBottomNavigation';import { useTranslation } from "react-i18next";

const FILTERS = [
{ key: 'all', label: 'Tous', roles: [] },
{ key: 'owner', label: 'Entreprises', roles: ['companyOwner'] },
{ key: 'client', label: 'Particuliers', roles: ['client'] },
{ key: 'renter', label: 'Locataires', roles: ['owner'] }];


export default function AdminUsersScreen({ navigation, route }) {const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await adminApi.users({ search, limit: 80 });
      setRows(data.data || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {load();}, []);

  const list = useMemo(() => {
    const selected = FILTERS.find((f) => f.key === active);
    let items = [...rows];
    if (selected?.roles?.length) {
      items = items.filter((u) => selected.roles.includes(String(u.role || '').toLowerCase()));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((u) => `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(q) || String(u.email || '').toLowerCase().includes(q));
    }
    return items;
  }, [rows, search, active]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{t("screens.admin.adminusersscreen.comptesUtilisateurs")}</Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#8a91bf" />
          <TextInput value={search} onChangeText={setSearch} placeholder={t("screens.admin.adminusersscreen.rechercher")} placeholderTextColor="#7078ab" style={styles.searchInput} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          persistentScrollbar={false}
          style={styles.filtersRow}
          contentContainerStyle={styles.filtersRowContent}>
          
          {FILTERS.map((f) =>
          <TouchableOpacity key={f.key} style={[styles.filterChip, active === f.key && styles.filterChipActive]} onPress={() => setActive(f.key)}>
              <Text style={[styles.filterText, active === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <Text style={styles.countText}>{list.length}{t("screens.admin.adminusersscreen.comptes")}</Text>

        <ScrollView style={styles.listContainer} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!!error ? <Text style={styles.error}>{error}</Text> : null}
          {list.map((u) => {
            const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
            const initials = (u.first_name?.[0] || u.email?.[0] || 'U').toUpperCase() + (u.last_name?.[0] || '').toUpperCase();
            return (
              <View key={u.id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.initials}><Text style={styles.initialsText}>{initials}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{fullName}</Text>
                    <Text style={styles.userEmail}>{u.email}</Text>
                    <View style={styles.userTags}>
                      <Text style={styles.roleTag}>{u.role || 'utilisateur'}</Text>
                      <Text style={styles.dateTag}>{u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : ''}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={[styles.statusBadge, { backgroundColor: u.is_active ? 'rgba(0,208,132,0.2)' : 'rgba(255,176,32,0.2)' }]} onPress={async () => {await adminApi.updateUser(u.id, { isActive: !u.is_active });load();}}>
                    <Text style={[styles.statusText, { color: u.is_active ? '#00d084' : '#ffb020' }]}>{u.is_active ? t("screens.client.listingdetailsscreen.verifie") : t("screens.admin.admincarsscreen.enAttente")}</Text>
                  </TouchableOpacity>
                </View>
              </View>);

          })}
          {loading ? <Text style={styles.loading}>{t("screens.admin.adminusersscreen.chargement")}</Text> : null}
        </ScrollView>
      </View>
      <AdminBottomNavigation navigation={navigation} route={route} active="users" />
    </SafeAreaView>);

}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070a1f' },
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#070a1f' },
  title: { color: '#f2f4ff', fontSize: 36, fontWeight: '800', marginTop: 10, marginBottom: 14 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f1433', borderWidth: 1, borderColor: '#2a2f57', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 10 },
  searchInput: { flex: 1, color: '#dce1ff' },
  filtersRow: { marginTop: 10, marginBottom: 18, maxHeight: 42, scrollbarWidth: 'thin' },
  filtersRowContent: { paddingBottom: 30, paddingRight: 8 },
  filterChip: { backgroundColor: '#171d44', borderRadius: 99, borderWidth: 1, borderColor: '#2d3360', paddingHorizontal: 14, height: 34, justifyContent: 'center', marginRight: 8 },
  filterChipActive: { backgroundColor: '#8f7dff', borderColor: '#8f7dff' },
  filterText: { color: '#9299c8', fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  countText: { color: '#7d84b1', marginTop: 2, marginBottom: 8 },
  listContainer: { marginTop: 8 },
  content: { paddingTop: 0, paddingBottom: 92 },
  userCard: { backgroundColor: '#0f1433', borderWidth: 1, borderColor: '#2b315c', borderRadius: 15, padding: 12, marginBottom: 10 },
  userHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  initials: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#8f9dff', justifyContent: 'center', alignItems: 'center' },
  initialsText: { color: '#fff', fontWeight: '800' },
  userName: { color: '#f1f4ff', fontWeight: '800', fontSize: 16 },
  userEmail: { color: '#7980ae', marginTop: 2, fontSize: 12 },
  userTags: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  roleTag: { color: '#00d084', backgroundColor: 'rgba(0,208,132,0.18)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, fontWeight: '700', fontSize: 11, textTransform: 'capitalize' },
  dateTag: { color: '#7e85b2', fontSize: 11 },
  statusBadge: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontWeight: '700', fontSize: 11 },
  loading: { color: '#8d94c2', marginTop: 8 },
  error: { color: '#ff7f90', marginBottom: 8 }
});