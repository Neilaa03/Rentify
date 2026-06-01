import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ImageBackground, TextInput, useWindowDimensions, Image, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS } from '../../constants/api';
import OwnerBottomNavigation from '../../components/navigation/OwnerBottomNavigation';
import storage from '../../utils/storage';
import { appFont } from '../../utils/responsive';
import * as ImagePicker from 'expo-image-picker';

const profileFont = (width, regular, small, verySmall = small) => {
  if (width <= 340) return verySmall;
  if (width <= 380) return small;
  return regular;
};

const SectionCard = ({ items, onItemPress }) => {
  const { width } = useWindowDimensions();
  const rowFontSize = profileFont(width, appFont(15), 14, 13);

  return (
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
            <Text style={[styles.rowLabel, { fontSize: rowFontSize }]} numberOfLines={1}>{item.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#7d83b0" />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const StatCard = ({ value, label }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ProfileScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const [profile, setProfile] = useState(route?.params?.user || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditingPersonalInfo, setIsEditingPersonalInfo] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingPersonalInfo, setSavingPersonalInfo] = useState(false);
  const [personalInfoError, setPersonalInfoError] = useState('');
  const [didAutoOpenPersonalInfo, setDidAutoOpenPersonalInfo] = useState(false);
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [localProfilePictureUri, setLocalProfilePictureUri] = useState('');
  const [ownerStats, setOwnerStats] = useState({ cars: 0, listings: 0, reservations: 0 });
  const [ownerStatsLoading, setOwnerStatsLoading] = useState(false);
  const [clientStats, setClientStats] = useState({ favorites: 0, reservations: 0, reviews: 0 });
  const [clientStatsLoading, setClientStatsLoading] = useState(false);

  const [token, setToken] = useState(route?.params?.token || '');
  const isOwner = route?.params?.user?.role === 'owner' || profile?.role === 'owner';
  const isGoogleOnly = String(profile?.auth_provider || profile?.authProvider || '').toLowerCase() === 'google';
  const isGoogleConnected = ['google', 'hybrid'].includes(String(profile?.auth_provider || profile?.authProvider || '').toLowerCase());
  const profilePicture = localProfilePictureUri || profile?.profile_picture || profile?.profilePicture || '';
  const fontSize = {
    title: profileFont(width, appFont(22, 24), 21, 20),
    profileName: profileFont(width, appFont(17), 16, 15),
    profilePhone: profileFont(width, appFont(14), 13, 12.5),
    editText: profileFont(width, appFont(13), 12, 11.5),
    input: profileFont(width, appFont(14), 13, 12.5),
    logout: profileFont(width, appFont(15), 14, 13),
  };

  useEffect(() => {
    const fetchProfile = async () => {
      let effectiveToken = token;
      if (!effectiveToken) {
        effectiveToken = (await storage.getItemAsync('userToken')) || '';
        if (effectiveToken) setToken(effectiveToken);
      }

      // Show cached profile immediately (helps client tab where params are not forwarded).
      if (!profile) {
        const cached = await storage.getItemAsync('userProfile');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === 'object') setProfile(parsed);
          } catch {
            // ignore
          }
        }
      }

      if (!effectiveToken) return;

      try {
        setLoading(true);
        setError('');

        const response = await fetch(API_ENDPOINTS.AUTH.ME, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${effectiveToken}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Unable to load profile');
        }

        const next = data?.user || null;
        setProfile(next);
        if (next) {
          const normalized = {
            id: next.id,
            email: next.email,
            firstName: next.firstName || next.first_name || '',
            lastName: next.lastName || next.last_name || '',
            phone: next.phone || '',
            role: next.role,
            isVerified: next.isVerified ?? next.is_verified,
            isActive: next.isActive ?? next.is_active,
            authProvider: next.authProvider || next.auth_provider || '',
            profilePicture: next.profilePicture || next.profile_picture || '',
          };
          await storage.setItemAsync('userProfile', JSON.stringify(normalized));
        }
      } catch (err) {
        setError(err.message || 'Unable to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  useEffect(() => {
    const fetchOwnerStats = async () => {
      if (!isOwner) return;
      if (!token) return;

      try {
        setOwnerStatsLoading(true);
        const response = await fetch(API_ENDPOINTS.PROFILE.ME_STATS, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Unable to load stats');

        const stats = data?.stats || {};
        setOwnerStats({
          cars: Number(stats.cars || 0) || 0,
          listings: Number(stats.listings || 0) || 0,
          reservations: Number(stats.reservations || 0) || 0,
        });
      } catch (_err) {
        // keep defaults
      } finally {
        setOwnerStatsLoading(false);
      }
    };

    fetchOwnerStats();
  }, [isOwner, token]);

  useEffect(() => {
    const fetchClientStats = async () => {
      if (isOwner) return;
      if (!token) return;

      try {
        setClientStatsLoading(true);
        const response = await fetch(API_ENDPOINTS.PROFILE.ME_CLIENT_STATS, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Unable to load stats');

        const stats = data?.stats || {};
        setClientStats({
          favorites: Number(stats.favorites || 0) || 0,
          reservations: Number(stats.reservations || 0) || 0,
          reviews: Number(stats.reviews || 0) || 0,
        });
      } catch (_err) {
        // keep defaults
      } finally {
        setClientStatsLoading(false);
      }
    };

    fetchClientStats();
  }, [isOwner, token]);

  const fullName = useMemo(() => {
    const first = profile?.first_name || profile?.firstName || '';
    const last = profile?.last_name || profile?.lastName || '';
    const value = `${first} ${last}`.trim();
    return value || 'Utilisateur';
  }, [profile]);

  const initial = (profile?.first_name?.[0] || profile?.firstName?.[0] || profile?.email?.[0] || 'U').toUpperCase();

  const openPersonalInfoEditor = () => {
    setEditFirstName(profile?.first_name || profile?.firstName || '');
    setEditLastName(profile?.last_name || profile?.lastName || '');
    setEditEmail(profile?.email || '');
    setEditPhone(profile?.phone || '');
    setPersonalInfoError('');
    setIsEditingPersonalInfo(true);
  };

  useEffect(() => {
    if (didAutoOpenPersonalInfo) return;
    if (!route?.params?.openPersonalInfo) return;
    if (!profile) return;
    setDidAutoOpenPersonalInfo(true);
    openPersonalInfoEditor();
  }, [didAutoOpenPersonalInfo, profile, route?.params?.openPersonalInfo]);

  const savePersonalInfo = async () => {
    if (!token) {
      setPersonalInfoError('Session invalide, reconnectez-vous.');
      return;
    }

    const nextEmail = editEmail.trim();
    const nextPhone = editPhone.trim();
    const nextFirstName = editFirstName.trim();
    const nextLastName = editLastName.trim();
    if (!nextFirstName) {
      setPersonalInfoError('Prenom requis.');
      return;
    }
    if (!nextLastName) {
      setPersonalInfoError('Nom requis.');
      return;
    }
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
          firstName: nextFirstName,
          lastName: nextLastName,
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
          authProvider: updatedUser.authProvider || updatedUser.auth_provider || '',
          profilePicture: updatedUser.profilePicture || updatedUser.profile_picture || '',
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

  const pickAndUploadProfilePicture = async () => {
    const effectiveToken = token || (await storage.getItemAsync('userToken')) || '';
    if (!effectiveToken) {
      setPersonalInfoError('Session invalide, reconnectez-vous.');
      return;
    }

    try {
      setPhotoLoading(true);
      setPersonalInfoError('');

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setPersonalInfoError("Permission d'acceder aux photos refusée.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      const uri = asset?.uri;
      if (!uri) return;
      // Show preview immediately, then replace with Cloudinary URL on success.
      setLocalProfilePictureUri(uri);

      const filename = uri.split('/').pop() || `profile_${Date.now()}.jpg`;
      const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
      const type = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : 'image/jpeg');

      const form = new FormData();
      form.append('image', { uri, name: filename, type });

      const response = await fetch(API_ENDPOINTS.AUTH.PROFILE_PICTURE, {
        method: 'POST',
        headers: { Authorization: `Bearer ${effectiveToken}` },
        body: form,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Upload echoue');

      const nextUser = data?.user || null;
      if (nextUser) {
        setLocalProfilePictureUri('');
        setProfile(nextUser);
        const normalized = {
          id: nextUser.id,
          email: nextUser.email,
          firstName: nextUser.firstName || nextUser.first_name || '',
          lastName: nextUser.lastName || nextUser.last_name || '',
          phone: nextUser.phone || '',
          role: nextUser.role,
          isVerified: nextUser.isVerified ?? nextUser.is_verified,
          isActive: nextUser.isActive ?? nextUser.is_active,
          authProvider: nextUser.authProvider || nextUser.auth_provider || '',
          profilePicture: nextUser.profilePicture || nextUser.profile_picture || '',
        };
        await storage.setItemAsync('userProfile', JSON.stringify(normalized));
      }
    } catch (err) {
      setLocalProfilePictureUri('');
      setPersonalInfoError(err.message || 'Upload echoue');
    } finally {
      setPhotoLoading(false);
    }
  };

  const removeProfilePicture = async () => {
    const effectiveToken = token || (await storage.getItemAsync('userToken')) || '';
    if (!effectiveToken) {
      setPersonalInfoError('Session invalide, reconnectez-vous.');
      return;
    }
    try {
      setPhotoLoading(true);
      setPersonalInfoError('');
      const response = await fetch(API_ENDPOINTS.AUTH.PROFILE_PICTURE, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${effectiveToken}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Suppression echouee');

      const nextUser = data?.user || null;
      if (nextUser) {
        setLocalProfilePictureUri('');
        setProfile(nextUser);
        const normalized = {
          id: nextUser.id,
          email: nextUser.email,
          firstName: nextUser.firstName || nextUser.first_name || '',
          lastName: nextUser.lastName || nextUser.last_name || '',
          phone: nextUser.phone || '',
          role: nextUser.role,
          isVerified: nextUser.isVerified ?? nextUser.is_verified,
          isActive: nextUser.isActive ?? nextUser.is_active,
          authProvider: nextUser.authProvider || nextUser.auth_provider || '',
          profilePicture: nextUser.profilePicture || nextUser.profile_picture || '',
        };
        await storage.setItemAsync('userProfile', JSON.stringify(normalized));
      }
    } catch (err) {
      setPersonalInfoError(err.message || 'Suppression echouee');
    } finally {
      setPhotoLoading(false);
    }
  };

  const openPhotoSheet = () => {
    setPersonalInfoError('');
    setPhotoSheetVisible(true);
  };

  return (
    <View style={styles.container}>
      <ImageBackground source={require('../../assets/background.png')} style={styles.background} resizeMode="cover">
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.overlay}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.title, { fontSize: fontSize.title }]}>Profil</Text>

            <View style={styles.profileCard}>
              <TouchableOpacity
                style={styles.avatar}
                onPress={() => {
                  if (profilePicture) openPhotoSheet();
                  else pickAndUploadProfilePicture();
                }}
                disabled={photoLoading}
                activeOpacity={0.85}
              >
                {profilePicture ? (
                  <Image source={{ uri: profilePicture }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initial}</Text>
                )}
                <View style={styles.avatarEditPill}>
                  <Ionicons name="camera-outline" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { fontSize: fontSize.profileName }]} numberOfLines={1}>{fullName}</Text>
                <Text style={[styles.profilePhone, { fontSize: fontSize.profilePhone }]} numberOfLines={1}>{profile?.phone || profile?.email || '-'}</Text>
                {isGoogleConnected && <Text style={styles.googleBadge} numberOfLines={1}>Compte Google connecté</Text>}
                {!!personalInfoError && <Text style={styles.errorText}>{personalInfoError}</Text>}
                {!!error && <Text style={styles.errorText}>{error}</Text>}
                {loading && <Text style={styles.loadingText}>Chargement...</Text>}
              </View>
              <TouchableOpacity style={styles.editBtn} onPress={openPersonalInfoEditor}>
                <Ionicons name="pencil-outline" size={16} color="#d6dbff" />
              </TouchableOpacity>
            </View>

            <Modal visible={photoSheetVisible} transparent animationType="fade" onRequestClose={() => setPhotoSheetVisible(false)}>
              <Pressable style={styles.modalBackdrop} onPress={() => setPhotoSheetVisible(false)} />
              <View style={styles.sheet}>
                <Text style={styles.sheetTitle}>Photo de profil</Text>
                <TouchableOpacity
                  style={styles.sheetRow}
                  onPress={() => {
                    setPhotoSheetVisible(false);
                    setTimeout(() => setPhotoViewerVisible(true), 120);
                  }}
                  disabled={!profilePicture}
                >
                  <Ionicons name="eye-outline" size={18} color={profilePicture ? '#d6dbff' : '#6c739e'} />
                  <Text style={[styles.sheetRowText, !profilePicture && styles.sheetRowTextDisabled]}>Voir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sheetRow}
                  onPress={async () => {
                    setPhotoSheetVisible(false);
                    await pickAndUploadProfilePicture();
                  }}
                  disabled={photoLoading}
                >
                  <Ionicons name="image-outline" size={18} color="#d6dbff" />
                  <Text style={styles.sheetRowText}>Remplacer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sheetRow}
                  onPress={async () => {
                    setPhotoSheetVisible(false);
                    await removeProfilePicture();
                  }}
                  disabled={!profilePicture || photoLoading}
                >
                  <Ionicons name="trash-outline" size={18} color={profilePicture ? '#ff7b89' : '#6c739e'} />
                  <Text style={[styles.sheetRowText, { color: profilePicture ? '#ff7b89' : '#6c739e' }]}>Supprimer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.sheetRow, { marginTop: 6 }]} onPress={() => setPhotoSheetVisible(false)}>
                  <Ionicons name="close" size={18} color="#d6dbff" />
                  <Text style={styles.sheetRowText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </Modal>

            <Modal visible={photoViewerVisible} transparent animationType="fade" onRequestClose={() => setPhotoViewerVisible(false)}>
              <View style={styles.viewerBackdrop}>
                <TouchableOpacity style={styles.viewerClose} onPress={() => setPhotoViewerVisible(false)}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
                {!!profilePicture && <Image source={{ uri: profilePicture }} style={styles.viewerImage} />}
              </View>
            </Modal>

            {isEditingPersonalInfo && (
              <View style={styles.editCard}>
                <Text style={styles.editTitle}>Informations personnelles</Text>
                <Text style={[styles.inputLabel, { fontSize: fontSize.editText }]}>Prenom</Text>
                <TextInput
                  style={[styles.input, { fontSize: fontSize.input }]}
                  value={editFirstName}
                  onChangeText={setEditFirstName}
                  autoCapitalize="words"
                  placeholder="Votre prenom"
                  placeholderTextColor="#7d83b0"
                />
                <Text style={[styles.inputLabel, { fontSize: fontSize.editText }]}>Nom</Text>
                <TextInput
                  style={[styles.input, { fontSize: fontSize.input }]}
                  value={editLastName}
                  onChangeText={setEditLastName}
                  autoCapitalize="words"
                  placeholder="Votre nom"
                  placeholderTextColor="#7d83b0"
                />
                <Text style={[styles.inputLabel, { fontSize: fontSize.editText }]}>Email</Text>
                <TextInput
                  style={[styles.input, { fontSize: fontSize.input }]}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="example@mail.com"
                  placeholderTextColor="#7d83b0"
                />
                <Text style={[styles.inputLabel, { fontSize: fontSize.editText }]}>Telephone</Text>
                <TextInput
                  style={[styles.input, { fontSize: fontSize.input }]}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  placeholder="+213..."
                  placeholderTextColor="#7d83b0"
                />
                {!!personalInfoError && <Text style={styles.errorText}>{personalInfoError}</Text>}
                <View style={styles.editActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditingPersonalInfo(false)}>
                    <Text style={[styles.cancelBtnText, { fontSize: fontSize.editText }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={savePersonalInfo} disabled={savingPersonalInfo}>
                    <Text style={[styles.saveBtnText, { fontSize: fontSize.editText }]} numberOfLines={1}>
                      {savingPersonalInfo ? 'Enregistrement...' : 'Enregistrer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.statsRow}>
              {isOwner ? (
                <>
                  <StatCard value={ownerStatsLoading ? '...' : String(ownerStats.cars)} label="Cars" />
                  <StatCard value={ownerStatsLoading ? '...' : String(ownerStats.listings)} label="Listings" />
                  <StatCard value={ownerStatsLoading ? '...' : String(ownerStats.reservations)} label="Reservations" />
                </>
              ) : (
                <>
                  <StatCard value={clientStatsLoading ? '...' : String(clientStats.favorites)} label="Favoris" />
                  <StatCard value={clientStatsLoading ? '...' : String(clientStats.reservations)} label="Reservations" />
                  <StatCard value={clientStatsLoading ? '...' : String(clientStats.reviews)} label="Avis" />
                </>
              )}
            </View>

            <Text style={styles.sectionTitle}>MON COMPTE</Text>
            <SectionCard
              items={[
                { label: 'Informations personnelles', icon: 'person-outline' },
                ...(isGoogleOnly ? [{ label: 'Definir un mot de passe', icon: 'key-outline' }] : []),
                { label: 'Moyens de paiement', icon: 'card-outline' },
                { label: 'Mes adresses', icon: 'location-outline' },
              ]}
              onItemPress={(item) => {
                if (item.label === 'Informations personnelles') openPersonalInfoEditor();
                if (item.label === 'Definir un mot de passe') navigation.navigate('SetPassword', { token });
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
              <Text style={[styles.logoutText, { fontSize: fontSize.logout }]}>Se deconnecter</Text>
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
  title: { fontSize: appFont(22, 24), color: '#f2f4ff', fontWeight: '700', marginTop: 10, marginBottom: 14 },
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
    width: 78,
    height: 78,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5b73ff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarEditPill: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(108, 77, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: appFont(17) },
  profileInfo: { flex: 1, marginLeft: 12 },
  profileName: { color: '#f2f4ff', fontWeight: '700', fontSize: appFont(17) },
  profilePhone: { color: '#9ca2cb', marginTop: 6, fontSize: appFont(14) },
  googleBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(108, 77, 255, 0.32)',
    borderWidth: 1,
    borderColor: 'rgba(143, 108, 255, 0.6)',
    color: '#e8e4ff',
    fontSize: appFont(12),
    fontWeight: '700',
  },
  loadingText: { color: '#b4b9dc', marginTop: 6, fontSize: appFont(13) },
  errorText: { color: '#ff7b89', marginTop: 6, fontSize: appFont(13) },
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
  editTitle: { color: '#f2f4ff', fontSize: appFont(15), fontWeight: '700', marginBottom: 10 },
  inputLabel: { color: '#9da4cd', fontSize: appFont(13), marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.3)',
    backgroundColor: 'rgba(12, 15, 37, 0.9)',
    color: '#eef1ff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: appFont(14),
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 10 },
  cancelBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  cancelBtnText: { color: '#c5caef', fontWeight: '600', fontSize: appFont(13) },
  saveBtn: {
    borderRadius: 10,
    backgroundColor: '#8f6cff',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: appFont(13) },
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
  statValue: { color: '#8f6cff', fontSize: appFont(18), fontWeight: '700' },
  statLabel: { color: '#9da4cd', marginTop: 6, fontSize: appFont(13) },
  sectionTitle: {
    color: '#8b90b7',
    fontSize: appFont(12),
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
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.22)',
    backgroundColor: 'rgba(23, 26, 54, 0.98)',
    padding: 12,
  },
  sheetTitle: { color: '#f2f4ff', fontSize: appFont(15), fontWeight: '800', marginBottom: 8 },
  sheetRow: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(12, 15, 37, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.18)',
    marginTop: 8,
  },
  sheetRowText: { color: '#eef1ff', fontSize: appFont(13), fontWeight: '700' },
  sheetRowTextDisabled: { color: '#6c739e' },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewerClose: { position: 'absolute', top: 52, right: 18, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '92%', height: '70%', resizeMode: 'contain', borderRadius: 12 },
  rowItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(145, 152, 229, 0.16)' },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 45, 120, 0.55)',
    marginRight: 10,
  },
  rowLabel: { color: '#eef1ff', fontSize: appFont(15), fontWeight: '500', flexShrink: 1 },
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
  logoutText: { color: '#ff4f5e', fontSize: appFont(15), fontWeight: '700' },
  version: { textAlign: 'center', color: '#7f84ae', fontSize: appFont(12), marginTop: 14, marginBottom: 8 },
});

export default ProfileScreen;
