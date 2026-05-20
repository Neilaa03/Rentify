import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS } from '../constants/api';
import OwnerBottomNavigation from '../components/navigation/ownerBottomNavigation';

const SectionCard = ({ items }) => (
  <View style={styles.sectionCard}>
    {items.map((item, index) => (
      <TouchableOpacity key={item.label} style={[styles.rowItem, index !== items.length - 1 && styles.rowItemBorder]}>
        <View style={styles.rowLeft}>
          <View style={styles.iconWrap}>
            <Ionicons name={item.icon} size={17} color="#8f6cff" />
          </View>
          <Text style={styles.rowLabel}>{item.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#7d83b0" />
      </TouchableOpacity>
    ))}
  </View>
);

const StatCard = ({ value, label }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ProfileScreen = ({ navigation, route }) => {
  const [profile, setProfile] = useState(route?.params?.user || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = route?.params?.token;
  const isOwner = route?.params?.user?.role === 'owner' || profile?.role === 'owner';

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;

      try {
        setLoading(true);
        setError('');

        const response = await fetch(API_ENDPOINTS.AUTH.ME, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Unable to load profile');
        }

        setProfile(data?.user || null);
      } catch (err) {
        setError(err.message || 'Unable to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  const fullName = useMemo(() => {
    const first = profile?.first_name || '';
    const last = profile?.last_name || '';
    const value = `${first} ${last}`.trim();
    return value || 'Utilisateur';
  }, [profile]);

  const initial = (profile?.first_name?.[0] || profile?.email?.[0] || 'U').toUpperCase();

  return (
    <View style={styles.container}>
      <ImageBackground source={require('../assets/background.png')} style={styles.background} resizeMode="cover">
        <SafeAreaView style={styles.overlay}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>Profil</Text>

            <View style={styles.profileCard}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{fullName}</Text>
                <Text style={styles.profilePhone}>{profile?.phone || profile?.email || '-'}</Text>
                {!!error && <Text style={styles.errorText}>{error}</Text>}
                {loading && <Text style={styles.loadingText}>Chargement...</Text>}
              </View>
              <TouchableOpacity style={styles.editBtn}>
                <Ionicons name="pencil-outline" size={16} color="#d6dbff" />
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <StatCard value="3" label="Locations" />
              <StatCard value="1" label="Avis" />
              <StatCard value="5" label="Favoris" />
            </View>

            <Text style={styles.sectionTitle}>MON COMPTE</Text>
            <SectionCard
              items={[
                { label: 'Informations personnelles', icon: 'person-outline' },
                { label: 'Moyens de paiement', icon: 'card-outline' },
                { label: 'Mes adresses', icon: 'location-outline' },
              ]}
            />

            <Text style={styles.sectionTitle}>PREFERENCES</Text>
            <SectionCard
              items={[
                { label: 'Notifications', icon: 'notifications-outline' },
                { label: 'Confidentialite & Securite', icon: 'shield-checkmark-outline' },
                { label: 'Langue', icon: 'globe-outline' },
              ]}
            />

            <Text style={styles.sectionTitle}>AIDE & SUPPORT</Text>
            <SectionCard
              items={[
                { label: "Centre d'aide", icon: 'help-circle-outline' },
                { label: "Evaluer l'application", icon: 'star-outline' },
                { label: 'A propos de Rentify', icon: 'information-circle-outline' },
              ]}
            />

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Landing' }] })}
            >
              <Ionicons name="log-out-outline" size={18} color="#ff4f5e" />
              <Text style={styles.logoutText}>Se deconnecter</Text>
            </TouchableOpacity>

            <Text style={styles.version}>Rentify v1.0.0</Text>
          </ScrollView>
          {isOwner && <OwnerBottomNavigation navigation={navigation} route={route} active="profile" />}
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(5, 6, 22, 0.72)' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 96 },
  title: { fontSize: 40 / 2, color: '#f2f4ff', fontWeight: '700', marginTop: 10, marginBottom: 14 },
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.2)',
    backgroundColor: 'rgba(23, 26, 54, 0.9)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5b73ff',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  profileInfo: { flex: 1, marginLeft: 12 },
  profileName: { color: '#f2f4ff', fontWeight: '700', fontSize: 15 },
  profilePhone: { color: '#9ca2cb', marginTop: 6, fontSize: 12 },
  loadingText: { color: '#b4b9dc', marginTop: 6, fontSize: 12 },
  errorText: { color: '#ff7b89', marginTop: 6, fontSize: 12 },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31, 35, 67, 0.9)',
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 18 },
  statCard: {
    width: '31.5%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.2)',
    backgroundColor: 'rgba(23, 26, 54, 0.9)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: { color: '#8f6cff', fontSize: 32 / 2, fontWeight: '700' },
  statLabel: { color: '#9da4cd', marginTop: 6, fontSize: 12 },
  sectionTitle: {
    color: '#8b90b7',
    fontSize: 20 / 2,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
    marginLeft: 2,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.2)',
    backgroundColor: 'rgba(23, 26, 54, 0.92)',
    marginBottom: 10,
  },
  rowItem: {
    minHeight: 58,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(145, 152, 229, 0.16)' },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 45, 120, 0.55)',
    marginRight: 10,
  },
  rowLabel: { color: '#eef1ff', fontSize: 15 / 1.95, fontWeight: '500' },
  logoutButton: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 79, 94, 0.5)',
    backgroundColor: 'rgba(52, 14, 28, 0.68)',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: { color: '#ff4f5e', fontSize: 16 / 1.95, fontWeight: '700' },
  version: { textAlign: 'center', color: '#7f84ae', fontSize: 12, marginTop: 14, marginBottom: 8 },
});

export default ProfileScreen;
