import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ImageBackground, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS } from '../../constants/api';
import OwnerBottomNavigation from '../../components/navigation/OwnerBottomNavigation';
import storage from '../../utils/storage';

const SectionCard = ({ items, onItemPress }) => (
  <View style={styles.sectionCard}>
    {items.map((item, index) => (
      <TouchableOpacity
        key={item.label}
        style={[styles.rowItem, index !== items.length - 1 && styles.rowItemBorder]}
        onPress={() => onItemPress?.(item)}
      >
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
  const [isEditingPersonalInfo, setIsEditingPersonalInfo] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingPersonalInfo, setSavingPersonalInfo] = useState(false);
  const [personalInfoError, setPersonalInfoError] = useState('');

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

  const openPersonalInfoEditor = () => {
    setEditEmail(profile?.email || '');
    setEditPhone(profile?.phone || '');
    setPersonalInfoError('');
    setIsEditingPersonalInfo(true);
  };

  const savePersonalInfo = async () => {
    if (!token) {
      setPersonalInfoError('Session invalide, reconnectez-vous.');
      return;
    }

    const nextEmail = editEmail.trim();
    const nextPhone = editPhone.trim();
    if (!nextEmail) {
      setPersonalInfoError('Email requis.');
      return;
    }
    if (!nextPhone) {
      setPersonalInfoError('Telephone requis.');
      return;
    }

    try {
      setSavingPersonalInfo(true);
      setPersonalInfoError('');
      const response = await fetch(API_ENDPOINTS.AUTH.ME, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: nextEmail,
          phone: nextPhone,
        }),
      });

      const raw = await response.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch (_e) {
        const preview = String(raw || '').slice(0, 120);
        throw new Error(`Reponse serveur invalide (non-JSON): ${preview}`);
      }
      if (!response.ok) throw new Error(data?.error || 'Impossible de mettre a jour le profil');

      const updatedUser = data?.user || null;
      setProfile(updatedUser);
      if (updatedUser) {
        const normalized = {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName || updatedUser.first_name || '',
          lastName: updatedUser.lastName || updatedUser.last_name || '',
          phone: updatedUser.phone || '',
          role: updatedUser.role,
          isVerified: updatedUser.isVerified ?? updatedUser.is_verified,
          isActive: updatedUser.isActive ?? updatedUser.is_active,
        };
        await storage.setItemAsync('userProfile', JSON.stringify(normalized));
      }
      setIsEditingPersonalInfo(false);
    } catch (err) {
      setPersonalInfoError(err.message || 'Erreur lors de la mise a jour');
    } finally {
      setSavingPersonalInfo(false);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground source={require('../../assets/background.png')} style={styles.background} resizeMode="cover">
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
              <TouchableOpacity style={styles.editBtn} onPress={openPersonalInfoEditor}>
                <Ionicons name="pencil-outline" size={16} color="#d6dbff" />
              </TouchableOpacity>
            </View>

            {isEditingPersonalInfo && (
              <View style={styles.editCard}>
                <Text style={styles.editTitle}>Informations personnelles</Text>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="example@mail.com"
                  placeholderTextColor="#7d83b0"
                />
                <Text style={styles.inputLabel}>Telephone</Text>
                <TextInput
                  style={styles.input}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  placeholder="+213..."
                  placeholderTextColor="#7d83b0"
                />
                {!!personalInfoError && <Text style={styles.errorText}>{personalInfoError}</Text>}
                <View style={styles.editActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditingPersonalInfo(false)}>
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={savePersonalInfo} disabled={savingPersonalInfo}>
                    <Text style={styles.saveBtnText}>{savingPersonalInfo ? 'Enregistrement...' : 'Enregistrer'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

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
              onItemPress={(item) => {
                if (item.label === 'Informations personnelles') openPersonalInfoEditor();
              }}
            />

            <Text style={styles.sectionTitle}>PREFERENCES</Text>
            <SectionCard
              items={[
                { label: 'Notifications', icon: 'notifications-outline' },
                { label: 'Confidentialite & Securite', icon: 'shield-checkmark-outline' },
                { label: 'Langue', icon: 'globe-outline' },
              ]}
              onItemPress={() => {}}
            />

            <Text style={styles.sectionTitle}>AIDE & SUPPORT</Text>
            <SectionCard
              items={[
                { label: "Centre d'aide", icon: 'help-circle-outline' },
                { label: "Evaluer l'application", icon: 'star-outline' },
                { label: 'A propos de Rentify', icon: 'information-circle-outline' },
              ]}
              onItemPress={() => {}}
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
  editCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.2)',
    backgroundColor: 'rgba(23, 26, 54, 0.92)',
    padding: 14,
    marginTop: 10,
  },
  editTitle: { color: '#f2f4ff', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  inputLabel: { color: '#9da4cd', fontSize: 12, marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.3)',
    backgroundColor: 'rgba(12, 15, 37, 0.9)',
    color: '#eef1ff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 10 },
  cancelBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  cancelBtnText: { color: '#c5caef', fontWeight: '600', fontSize: 12 },
  saveBtn: {
    borderRadius: 10,
    backgroundColor: '#8f6cff',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
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
