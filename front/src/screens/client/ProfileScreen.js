<<<<<<< HEAD
import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ImageBackground, TextInput, useWindowDimensions, Image, Modal, Pressable, Alert, Linking } from 'react-native';
=======
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  Alert,
  ActivityIndicator,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
>>>>>>> dev
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS } from '../../constants/api';
import OwnerBottomNavigation from '../../components/navigation/OwnerBottomNavigation';
import storage from '../../utils/storage';
import { appFont } from '../../utils/responsive';
import { deleteDocument, getUserDocuments, uploadUserDocument } from '../../services/owner';
import * as ImagePicker from 'expo-image-picker';

const profileFont = (width, regular, small, verySmall = small) => {
  if (width <= 340) return verySmall;
  if (width <= 380) return small;
  return regular;
};

const runtimeEnv = typeof process !== 'undefined' ? process.env || {} : {};
const COMPANY_SUPPORT_EMAIL = runtimeEnv.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@rentify.dz';
const COMPANY_SUPPORT_PHONE = runtimeEnv.EXPO_PUBLIC_SUPPORT_PHONE || '+213 555 00 00 00';
const PLAY_STORE_REVIEW_URL = runtimeEnv.EXPO_PUBLIC_PLAY_STORE_REVIEW_URL || '';

const InfoLine = ({ icon, title, text }) => (
  <View style={styles.infoLine}>
    <View style={styles.infoLineIcon}>
      <Ionicons name={icon} size={17} color="#8f6cff" />
    </View>
    <View style={styles.infoLineBody}>
      <Text style={styles.infoLineTitle}>{title}</Text>
      <Text style={styles.infoLineText}>{text}</Text>
    </View>
  </View>
);

const SettingsModal = ({ visible, title, onClose, children }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.pageModalBackdrop}>
      <View style={styles.pageModal}>
        <View style={styles.pageModalHeader}>
          <Text style={styles.pageModalTitle}>{title}</Text>
          <TouchableOpacity style={styles.pageModalClose} onPress={onClose}>
            <Ionicons name="close" size={20} color="#eef1ff" />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pageModalContent}>
          {children}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

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

const identityMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const inferIdentityMimeType = (file) => {
  const explicit = String(file?.mimeType || '').toLowerCase();
  if (identityMimeTypes.includes(explicit)) return explicit;
  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
};

const getIdentityStatusMeta = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'approved') return { label: 'Vérifié', tone: '#21d4a7', bg: 'rgba(33,212,167,0.12)' };
  if (normalized === 'rejected') return { label: 'Rejeté', tone: '#ff6b6b', bg: 'rgba(255,107,107,0.12)' };
  if (normalized === 'manual_review') return { label: 'En vérification', tone: '#ffb347', bg: 'rgba(255,179,71,0.12)' };
  if (normalized === 'pending') return { label: 'En attente', tone: '#ffb347', bg: 'rgba(255,179,71,0.12)' };
  return { label: 'Manquant', tone: '#9ca2cb', bg: 'rgba(255,255,255,0.05)' };
};

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
  const [identityDocument, setIdentityDocument] = useState(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityBusy, setIdentityBusy] = useState(false);
  const [identityAlertShown, setIdentityAlertShown] = useState(false);
  const [identityError, setIdentityError] = useState('');
  const [didAutoOpenPersonalInfo, setDidAutoOpenPersonalInfo] = useState(false);
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [localProfilePictureUri, setLocalProfilePictureUri] = useState('');
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [changePasswordCurrent, setChangePasswordCurrent] = useState('');
  const [changePasswordNew, setChangePasswordNew] = useState('');
  const [changePasswordConfirm, setChangePasswordConfirm] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectStatus, setConnectStatus] = useState(null);
  const [ownerStats, setOwnerStats] = useState({ cars: 0, listings: 0, reservations: 0 });
  const [ownerStatsLoading, setOwnerStatsLoading] = useState(false);
  const [clientStats, setClientStats] = useState({ favorites: 0, reservations: 0, reviews: 0 });
  const [clientStatsLoading, setClientStatsLoading] = useState(false);
  const [activeInfoPage, setActiveInfoPage] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

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
        await persistUpdatedUser(next);
      } catch (err) {
        setError(err.message || 'Unable to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

<<<<<<< HEAD
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
    const loadConnectStatus = async () => {
      if (!isOwner) return;
      if (!token || !profile?.id) return;

      try {
        const response = await fetch(API_ENDPOINTS.PAYMENTS.CONNECT_STATUS(profile.id), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) return;
        const status = await response.json();
        setConnectStatus(status || null);
      } catch (_e) {
        // ignore
      }
    };

    loadConnectStatus();
  }, [isOwner, token, profile?.id]);

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
=======
  const loadIdentityDocument = useCallback(async () => {
    if (!token || !isOwner || !profile?.id) return;

    try {
      setIdentityLoading(true);
      setIdentityError('');
      const docs = await getUserDocuments({
        token,
        userId: profile.id,
        documentType: 'identity_card',
      });
      const identity = (Array.isArray(docs) ? docs : []).find((doc) => doc.documentType === 'identity_card') || null;
      setIdentityDocument(identity);
    } catch (err) {
      setIdentityError(err.message || 'Impossible de charger la carte d’identité');
    } finally {
      setIdentityLoading(false);
    }
  }, [isOwner, profile?.id, token]);

  useEffect(() => {
    loadIdentityDocument();
  }, [loadIdentityDocument]);
>>>>>>> dev

  const fullName = useMemo(() => {
    const first = profile?.first_name || profile?.firstName || '';
    const last = profile?.last_name || profile?.lastName || '';
    const value = `${first} ${last}`.trim();
    return value || 'Utilisateur';
  }, [profile]);

  const initial = (profile?.first_name?.[0] || profile?.firstName?.[0] || profile?.email?.[0] || 'U').toUpperCase();
  const identityStatus = getIdentityStatusMeta(identityDocument?.status);
  const identityReason = identityDocument?.ocrResult?.verificationReason || '';
  const identityVerified = String(identityDocument?.status || '').toLowerCase() === 'approved';

  useEffect(() => {
    if (!isOwner || loading || identityLoading || identityAlertShown) return;
    if (identityVerified) return;

    Alert.alert(
      'Carte d’identité requise',
      'Vous devez téléverser et faire valider votre carte d’identité pour publier un véhicule ou une annonce.'
    );
    setIdentityAlertShown(true);
  }, [identityAlertShown, identityLoading, identityVerified, isOwner, loading]);

  const openPersonalInfoEditor = () => {
    setEditFirstName(profile?.first_name || profile?.firstName || '');
    setEditLastName(profile?.last_name || profile?.lastName || '');
    setEditEmail(profile?.email || '');
    setEditPhone(profile?.phone || '');
    setPersonalInfoError('');
    setIsEditingPersonalInfo(true);
  };

  const persistUpdatedUser = async (updatedUser) => {
    if (!updatedUser) return;

    setProfile(updatedUser);
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
  };

  const openPasswordEditor = () => {
    setChangePasswordCurrent('');
    setChangePasswordNew('');
    setChangePasswordConfirm('');
    setChangePasswordError('');
    setShowPasswordFields(false);
    setPasswordModalVisible(true);
  };

  const closePasswordEditor = () => {
    setPasswordModalVisible(false);
    setChangePasswordCurrent('');
    setChangePasswordNew('');
    setChangePasswordConfirm('');
    setChangePasswordError('');
    setShowPasswordFields(false);
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
      await persistUpdatedUser(updatedUser);
      setIsEditingPersonalInfo(false);
    } catch (err) {
      setPersonalInfoError(err.message || 'Erreur lors de la mise a jour');
    } finally {
      setSavingPersonalInfo(false);
    }
  };

  const openIdentityDocument = useCallback(async () => {
    const url = identityDocument?.documentUrl;
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible d’ouvrir le document');
    }
  }, [identityDocument?.documentUrl]);

  const pickIdentityDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: identityMimeTypes,
        copyToCacheDirectory: true,
      });

      if (result?.canceled) return;

      const asset = Array.isArray(result?.assets) ? result.assets[0] : result;
      const uri = asset?.uri;
      const mimeType = inferIdentityMimeType(asset);
      const name = asset?.name || `identity_card${mimeType === 'application/pdf' ? '.pdf' : mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg'}`;

      if (!uri) return;

      if (!identityMimeTypes.includes(mimeType)) {
        Alert.alert('Format non autorisé', 'Choisissez un fichier PDF ou une image (JPG, PNG, WEBP).');
        return;
      }

      setIdentityBusy(true);
      const uploaded = await uploadUserDocument({
        token,
        userId: profile?.id,
        documentType: 'identity_card',
        file: {
          uri,
          name,
          type: mimeType,
          file: asset?.file || null,
        },
      });
      setIdentityDocument(uploaded);
      setIdentityAlertShown(false);
      if ((uploaded?.status || '').toLowerCase() === 'rejected' && uploaded?.ocrResult?.verificationReason) {
        Alert.alert('Document rejeté', uploaded.ocrResult.verificationReason);
      }
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de téléverser la carte d’identité');
    } finally {
      setIdentityBusy(false);
    }
  }, [profile?.id, token]);

  const deleteIdentityDocument = useCallback(async () => {
    if (!identityDocument?.id) return;
    try {
      setIdentityBusy(true);
      await deleteDocument({ token, documentId: identityDocument.id });
      setIdentityDocument(null);
      setIdentityAlertShown(false);
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Suppression impossible');
    } finally {
      setIdentityBusy(false);
    }
  }, [identityDocument?.id, token]);
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
        await persistUpdatedUser(nextUser);
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
        await persistUpdatedUser(nextUser);
      }
    } catch (err) {
      setPersonalInfoError(err.message || 'Suppression echouee');
    } finally {
      setPhotoLoading(false);
    }
  };

  const savePasswordChange = async () => {
    const effectiveToken = token || (await storage.getItemAsync('userToken')) || '';
    if (!effectiveToken) {
      setChangePasswordError('Session invalide, reconnectez-vous.');
      return;
    }

    const nextCurrentPassword = changePasswordCurrent.trim();
    const nextNewPassword = changePasswordNew.trim();
    const nextConfirmPassword = changePasswordConfirm.trim();

    if (!isGoogleOnly && !nextCurrentPassword) {
      setChangePasswordError('Mot de passe actuel requis.');
      return;
    }
    if (nextNewPassword.length < 8) {
      setChangePasswordError('Le nouveau mot de passe doit contenir au moins 8 caracteres.');
      return;
    }
    if (nextNewPassword !== nextConfirmPassword) {
      setChangePasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      setChangePasswordLoading(true);
      setChangePasswordError('');

      const response = await fetch(API_ENDPOINTS.PROFILE.ME_PASSWORD, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${effectiveToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: isGoogleOnly ? '' : nextCurrentPassword,
          newPassword: nextNewPassword,
          confirmPassword: nextConfirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Impossible de changer le mot de passe');
      }

      await persistUpdatedUser(data?.user || null);
      closePasswordEditor();
      Alert.alert('Mot de passe mis a jour', 'Votre mot de passe a ete modifie avec succes.');
    } catch (err) {
      setChangePasswordError(err.message || 'Impossible de changer le mot de passe');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const configureStripePayouts = async () => {
    if (!token) {
      const msg = 'Session expirée. Reconnectez-vous puis réessayez.';
      setPersonalInfoError(msg);
      Alert.alert('Configurer Stripe', msg);
      return;
    }
    if (!profile?.id) {
      const msg = 'Utilisateur introuvable. Rechargez la page.';
      setPersonalInfoError(msg);
      Alert.alert('Configurer Stripe', msg);
      return;
    }

    try {
      setConnectLoading(true);
      const response = await fetch(API_ENDPOINTS.PAYMENTS.CONNECT_ONBOARDING_LINK, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Impossible de configurer Stripe');
      }

      const payload = await response.json();
      const url = payload?.onboardingUrl;
      if (!url) throw new Error('Lien Stripe indisponible');

      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error('Impossible d’ouvrir le lien Stripe sur cet appareil');
      }

      await Linking.openURL(url);

      const statusResponse = await fetch(API_ENDPOINTS.PAYMENTS.CONNECT_STATUS(profile.id), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        setConnectStatus(status || null);
      }
    } catch (e) {
      const msg = e.message || 'Impossible de configurer Stripe';
      setPersonalInfoError(msg);
      Alert.alert('Configurer Stripe', msg);
    } finally {
      setConnectLoading(false);
    }
  };

  const openPhotoSheet = () => {
    setPersonalInfoError('');
    setPhotoSheetVisible(true);
  };

  const closeInfoPage = () => setActiveInfoPage(null);

  const openSupportEmail = async () => {
    const subject = encodeURIComponent('Support Rentify');
    const body = encodeURIComponent(`Bonjour Rentify,\n\nMon compte: ${profile?.email || ''}\n\n`);
    await Linking.openURL(`mailto:${COMPANY_SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
  };

  const openSupportPhone = async () => {
    await Linking.openURL(`tel:${COMPANY_SUPPORT_PHONE.replace(/\s/g, '')}`);
  };

  const openStoreReview = async () => {
    if (!PLAY_STORE_REVIEW_URL) {
      Alert.alert(
        "Lien Play Store a ajouter",
        "Le formulaire est pret. Ajoutez EXPO_PUBLIC_PLAY_STORE_REVIEW_URL quand l'application sera publiee."
      );
      return;
    }

    await Linking.openURL(PLAY_STORE_REVIEW_URL);
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

            <Modal visible={passwordModalVisible} transparent animationType="fade" onRequestClose={closePasswordEditor}>
              <Pressable style={styles.modalBackdrop} onPress={closePasswordEditor} />
              <View style={styles.sheet}>
                <View style={styles.sheetHeaderRow}>
                  <Text style={styles.sheetTitle}>Changer le mot de passe</Text>
                  <TouchableOpacity onPress={() => setShowPasswordFields((value) => !value)} style={styles.sheetIconButton}>
                    <Ionicons name={showPasswordFields ? 'eye-off-outline' : 'eye-outline'} size={18} color="#d6dbff" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.passwordSheetNote}>
                  {isGoogleOnly
                    ? 'Votre compte utilise Google. Definissez un mot de passe pour activer la connexion classique.'
                    : 'Saisissez votre mot de passe actuel, puis choisissez un nouveau mot de passe.'}
                </Text>
                {!isGoogleOnly && (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: 10 }]}>Mot de passe actuel</Text>
                    <TextInput
                      style={styles.input}
                      value={changePasswordCurrent}
                      onChangeText={setChangePasswordCurrent}
                      secureTextEntry={!showPasswordFields}
                      placeholder="Mot de passe actuel"
                      placeholderTextColor="#7d83b0"
                      autoCapitalize="none"
                    />
                  </>
                )}
                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Nouveau mot de passe</Text>
                <TextInput
                  style={styles.input}
                  value={changePasswordNew}
                  onChangeText={setChangePasswordNew}
                  secureTextEntry={!showPasswordFields}
                  placeholder="Nouveau mot de passe"
                  placeholderTextColor="#7d83b0"
                  autoCapitalize="none"
                />
                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Confirmer le mot de passe</Text>
                <TextInput
                  style={styles.input}
                  value={changePasswordConfirm}
                  onChangeText={setChangePasswordConfirm}
                  secureTextEntry={!showPasswordFields}
                  placeholder="Confirmer le mot de passe"
                  placeholderTextColor="#7d83b0"
                  autoCapitalize="none"
                />
                {!!changePasswordError && <Text style={styles.errorText}>{changePasswordError}</Text>}
                <View style={styles.editActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closePasswordEditor} disabled={changePasswordLoading}>
                    <Text style={[styles.cancelBtnText, { fontSize: fontSize.editText }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={savePasswordChange} disabled={changePasswordLoading}>
                    <Text style={[styles.saveBtnText, { fontSize: fontSize.editText }]} numberOfLines={1}>
                      {changePasswordLoading ? 'Enregistrement...' : (isGoogleOnly ? 'Definir' : 'Changer')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <SettingsModal visible={activeInfoPage === 'privacy'} title="Confidentialite & Securite" onClose={closeInfoPage}>
              <InfoLine
                icon="lock-closed-outline"
                title="Compte protege"
                text="Votre mot de passe est chiffre cote serveur et les actions sensibles demandent une session connectee."
              />
              <InfoLine
                icon="shield-checkmark-outline"
                title="Verification"
                text="Les comptes, documents et voitures peuvent etre verifies avant validation pour limiter les faux profils."
              />
              <InfoLine
                icon="card-outline"
                title="Paiements"
                text="Les paiements carte passent par Stripe. Les owners configurent leur compte de versement depuis leur profil."
              />
              <InfoLine
                icon="qr-code-outline"
                title="Remise du vehicule"
                text="Le pickup et le retour utilisent un code ou QR code afin de confirmer clairement chaque etape."
              />
              <InfoLine
                icon="eye-off-outline"
                title="Donnees visibles"
                text="Les autres utilisateurs voient uniquement les informations utiles a la reservation: nom, contact, voiture, reservation et avis."
              />
            </SettingsModal>

            <SettingsModal visible={activeInfoPage === 'help'} title="Centre d'aide" onClose={closeInfoPage}>
              <Text style={styles.pageIntro}>
                Notre equipe peut aider pour les reservations, paiements, documents, annonces, pickup, retour et remboursements.
              </Text>
              <TouchableOpacity style={styles.contactButton} onPress={openSupportEmail}>
                <Ionicons name="mail-outline" size={18} color="#fff" />
                <View style={styles.contactButtonTextWrap}>
                  <Text style={styles.contactButtonLabel}>Email</Text>
                  <Text style={styles.contactButtonValue}>{COMPANY_SUPPORT_EMAIL}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.contactButton} onPress={openSupportPhone}>
                <Ionicons name="call-outline" size={18} color="#fff" />
                <View style={styles.contactButtonTextWrap}>
                  <Text style={styles.contactButtonLabel}>Telephone</Text>
                  <Text style={styles.contactButtonValue}>{COMPANY_SUPPORT_PHONE}</Text>
                </View>
              </TouchableOpacity>
              <InfoLine
                icon="chatbubble-ellipses-outline"
                title="Messagerie"
                text="Pour une reservation precise, utilisez aussi le chat avec l'autre utilisateur afin de garder l'historique."
              />
              <InfoLine
                icon="alert-circle-outline"
                title="Litige"
                text="En cas de probleme avec une location, ouvrez la reservation concernee et signalez le souci depuis les actions disponibles."
              />
            </SettingsModal>

            <SettingsModal visible={activeInfoPage === 'about'} title="A propos de Rentify" onClose={closeInfoPage}>
              <Text style={styles.pageIntro}>
                Rentify est une application de location de voitures entre clients et owners, pensee pour gerer toute la location depuis une seule interface.
              </Text>
              <InfoLine
                icon="car-sport-outline"
                title="Annonces de voitures"
                text="Les owners ajoutent leurs voitures, photos, disponibilites, prix par jour, semaine ou mois, et frais de livraison."
              />
              <InfoLine
                icon="calendar-outline"
                title="Reservations"
                text="Les clients choisissent les dates, le mode de recuperation, puis suivent le statut de la reservation."
              />
              <InfoLine
                icon="cash-outline"
                title="Paiements"
                text="Rentify gere les paiements carte, les paiements cash, les statuts de paiement, remboursements et factures."
              />
              <InfoLine
                icon="star-outline"
                title="Avis et favoris"
                text="Les clients peuvent garder leurs voitures favorites et laisser un avis apres une location terminee."
              />
              <InfoLine
                icon="notifications-outline"
                title="Notifications et messages"
                text="L'application inclut les notifications, l'historique, une inbox et un chat entre utilisateurs."
              />
              <InfoLine
                icon="settings-outline"
                title="Version"
                text="Rentify v1.0.0"
              />
            </SettingsModal>

            <SettingsModal visible={activeInfoPage === 'rate'} title="Evaluer l'application" onClose={closeInfoPage}>
              <Text style={styles.pageIntro}>
                Votre avis nous aide a ameliorer Rentify. Ce formulaire est pret pour envoyer vers le Play Store lorsque le lien sera branche.
              </Text>
              <Text style={styles.ratingLabel}>Votre note</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <TouchableOpacity key={value} style={styles.ratingStarButton} onPress={() => setRatingValue(value)}>
                    <Ionicons
                      name={value <= ratingValue ? 'star' : 'star-outline'}
                      size={30}
                      color={value <= ratingValue ? '#ffd166' : '#7d83b0'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingLabel}>Votre commentaire</Text>
              <TextInput
                style={styles.ratingInput}
                value={ratingComment}
                onChangeText={setRatingComment}
                multiline
                textAlignVertical="top"
                placeholder="Dites-nous ce qui marche bien ou ce qu'on doit ameliorer..."
                placeholderTextColor="#7d83b0"
              />
              <TouchableOpacity style={styles.primaryWideButton} onPress={openStoreReview}>
                <Ionicons name="logo-google-playstore" size={18} color="#fff" />
                <Text style={styles.primaryWideButtonText}>Envoyer vers le Play Store</Text>
              </TouchableOpacity>
            </SettingsModal>

            <SettingsModal visible={activeInfoPage === 'notifications'} title="Notifications" onClose={closeInfoPage}>
              <InfoLine
                icon="notifications-outline"
                title="Reservations"
                text="Recevez les changements de statut, confirmations, annulations et rappels importants."
              />
              <InfoLine
                icon="chatbubble-outline"
                title="Messages"
                text="Les notifications de messages vous aident a repondre rapidement pendant une location."
              />
              <InfoLine
                icon="time-outline"
                title="Pickup et retour"
                text="Rentify peut vous rappeler les etapes de recuperation et de retour du vehicule."
              />
            </SettingsModal>

            <SettingsModal visible={activeInfoPage === 'language'} title="Langue" onClose={closeInfoPage}>
              <InfoLine
                icon="globe-outline"
                title="Langue actuelle"
                text="Francais"
              />
              <InfoLine
                icon="construct-outline"
                title="A venir"
                text="Le changement de langue pourra etre branche quand l'application aura plusieurs traductions."
              />
            </SettingsModal>

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

            {isOwner ? (
              <View style={styles.identityCard}>
                <View style={styles.identityHeader}>
                  <View style={styles.identityIcon}>
                    <Ionicons name="id-card-outline" size={20} color="#8f6cff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.identityTitle}>Carte d'identité</Text>
                    <Text style={styles.identitySubtitle}>Obligatoire pour publier un véhicule ou une annonce</Text>
                  </View>
                  <View style={[styles.identityBadge, { backgroundColor: identityStatus.bg }]}>
                    <Text style={[styles.identityBadgeText, { color: identityStatus.tone }]}>{identityStatus.label}</Text>
                  </View>
                </View>

                {!!identityError && <Text style={styles.identityError}>{identityError}</Text>}
                {identityLoading ? (
                  <View style={styles.identityLoader}>
                    <ActivityIndicator size="small" color="#8f6cff" />
                  </View>
                ) : (
                  <>
                    <Text style={styles.identityName} numberOfLines={1}>
                      {identityDocument?.documentUrl ? identityDocument.documentUrl.split('/').pop() : 'Aucun document soumis'}
                    </Text>
                    <Text style={styles.identityHint}>
                      {identityVerified
                        ? 'Votre carte est approuvée. Vous pouvez publier.'
                        : identityDocument?.status === 'rejected'
                          ? 'Votre carte est rejetée. Téléversez une nouvelle version.'
                          : 'Vous ne pouvez pas publier tant que la carte n’est pas validée.'}
                    </Text>
                    {identityReason ? <Text style={styles.identityReason}>{identityReason}</Text> : null}

                    <View style={styles.identityActions}>
                      <TouchableOpacity style={styles.identityActionBtn} onPress={identityDocument?.documentUrl ? openIdentityDocument : pickIdentityDocument} disabled={identityBusy}>
                        <Ionicons name="eye-outline" size={16} color="#dce2ff" />
                        <Text style={styles.identityActionText}>Voir</Text>
                      </TouchableOpacity>
                      {!identityVerified ? (
                        <TouchableOpacity style={[styles.identityActionBtn, styles.identityPrimaryBtn]} onPress={pickIdentityDocument} disabled={identityBusy}>
                          <Ionicons name={identityDocument?.documentUrl ? 'create-outline' : 'cloud-upload-outline'} size={16} color="#fff" />
                          <Text style={styles.identityActionPrimaryText}>{identityDocument?.documentUrl ? 'Remplacer' : 'Téléverser'}</Text>
                        </TouchableOpacity>
                      ) : null}
                      {identityDocument?.id ? (
                        <TouchableOpacity style={styles.identityActionBtn} onPress={deleteIdentityDocument} disabled={identityBusy}>
                          <Ionicons name="trash-outline" size={16} color="#ff7b89" />
                          <Text style={styles.identityActionDangerText}>Supprimer</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </>
                )}
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>MON COMPTE</Text>
            <SectionCard
              items={[
                { action: 'personalInfo', label: 'Informations personnelles', icon: 'person-outline' },
                { action: 'password', label: isGoogleOnly ? 'Definir un mot de passe' : 'Changer mot de passe', icon: 'key-outline' },
                ...(isOwner ? [{
                  action: 'stripe',
                  label: connectLoading
                    ? 'Ouverture...'
                    : (connectStatus?.cardPaymentsAvailable ? 'Mettre a jour Stripe' : 'Configurer Stripe'),
                  icon: 'cash-outline',
                }] : []),
              ]}
              onItemPress={(item) => {
                if (item.action === 'personalInfo') openPersonalInfoEditor();
                if (item.action === 'password') openPasswordEditor();
                if (item.action === 'stripe' && !connectLoading) configureStripePayouts();
              }}
            />

            <Text style={styles.sectionTitle}>PREFERENCES</Text>
            <SectionCard
              items={[
                { action: 'language', label: 'Langue', icon: 'globe-outline' },
                { action: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
                { action: 'privacy', label: 'Confidentialite & Securite', icon: 'shield-checkmark-outline' },
              ]}
              onItemPress={(item) => {
                if (item.action) setActiveInfoPage(item.action);
              }}
            />

            <Text style={styles.sectionTitle}>AIDE & SUPPORT</Text>
            <SectionCard
              items={[
                { action: 'help', label: "Centre d'aide", icon: 'help-circle-outline' },
                { action: 'about', label: 'A propos de Rentify', icon: 'information-circle-outline' },
                { action: 'rate', label: "Evaluer l'application", icon: 'star-outline' },
              ]}
              onItemPress={(item) => {
                if (item.action) setActiveInfoPage(item.action);
              }}
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
  pageModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
  },
  pageModal: {
    maxHeight: '86%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(145, 152, 229, 0.22)',
    backgroundColor: 'rgba(16, 19, 43, 0.99)',
    paddingTop: 12,
  },
  pageModalHeader: {
    minHeight: 46,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageModalTitle: { color: '#f2f4ff', fontSize: appFont(17), fontWeight: '800', flex: 1, paddingRight: 10 },
  pageModalClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31, 35, 67, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.18)',
  },
  pageModalContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 26 },
  pageIntro: {
    color: '#c7ccef',
    fontSize: appFont(13.5),
    lineHeight: 20,
    marginBottom: 12,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.18)',
    backgroundColor: 'rgba(23, 26, 54, 0.82)',
    padding: 12,
    marginBottom: 10,
  },
  infoLineIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 45, 120, 0.55)',
    marginRight: 10,
  },
  infoLineBody: { flex: 1, minWidth: 0 },
  infoLineTitle: { color: '#eef1ff', fontSize: appFont(13.5), fontWeight: '800', marginBottom: 4 },
  infoLineText: { color: '#aeb5df', fontSize: appFont(12.5), lineHeight: 18 },
  contactButton: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: '#8f6cff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  contactButtonTextWrap: { flex: 1, minWidth: 0 },
  contactButtonLabel: { color: '#fff', fontSize: appFont(12), fontWeight: '700', opacity: 0.86 },
  contactButtonValue: { color: '#fff', fontSize: appFont(14), fontWeight: '800', marginTop: 2 },
  ratingLabel: { color: '#d7dcff', fontSize: appFont(13), fontWeight: '800', marginTop: 4, marginBottom: 8 },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  ratingStarButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 3,
  },
  ratingInput: {
    minHeight: 116,
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.3)',
    backgroundColor: 'rgba(12, 15, 37, 0.9)',
    color: '#eef1ff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: appFont(14),
    lineHeight: 20,
    marginBottom: 12,
  },
  primaryWideButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#8f6cff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 12,
  },
  primaryWideButtonText: { color: '#fff', fontSize: appFont(14), fontWeight: '800' },
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
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: '#f2f4ff', fontSize: appFont(15), fontWeight: '800', marginBottom: 8 },
  sheetIconButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12, 15, 37, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.18)',
    marginBottom: 8,
  },
  passwordSheetNote: { color: '#b4b9dc', fontSize: appFont(12.5), lineHeight: 18, marginBottom: 4 },
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
  identityCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.2)',
    backgroundColor: 'rgba(23, 26, 54, 0.92)',
    padding: 14,
    marginBottom: 14,
  },
  identityHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  identityIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(143,108,255,0.12)',
  },
  identityTitle: { color: '#f2f4ff', fontSize: appFont(15), fontWeight: '700' },
  identitySubtitle: { color: '#9da4cd', marginTop: 3, fontSize: appFont(12), lineHeight: 17 },
  identityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: 8,
  },
  identityBadgeText: { fontSize: appFont(11), fontWeight: '800' },
  identityError: { color: '#ff7b89', marginTop: 10, fontSize: appFont(12) },
  identityLoader: { paddingVertical: 14, alignItems: 'center' },
  identityName: { color: '#eef1ff', marginTop: 12, fontSize: appFont(13), fontWeight: '700' },
  identityHint: { color: '#9da4cd', marginTop: 6, fontSize: appFont(12), lineHeight: 17 },
  identityReason: { color: '#ffb347', marginTop: 6, fontSize: appFont(12), lineHeight: 17 },
  identityActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  identityActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.18)',
  },
  identityPrimaryBtn: {
    backgroundColor: '#8f6cff',
    borderColor: 'rgba(143,108,255,0.5)',
  },
  identityActionText: { color: '#dce2ff', fontSize: appFont(12), fontWeight: '700' },
  identityActionPrimaryText: { color: '#fff', fontSize: appFont(12), fontWeight: '700' },
  identityActionDangerText: { color: '#ff7b89', fontSize: appFont(12), fontWeight: '700' },
});

export default ProfileScreen;
