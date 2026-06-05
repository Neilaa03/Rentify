import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View } from
'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AgencyBottomNavigation from '../../components/navigation/AgencyBottomNavigation';
import { AgencyCard, Badge, SectionTitle } from '../../components/agency/AgencyPrimitives';
import { deleteOwnerListing, getOwnerListings, toggleListingPublication } from '../../services/owner';
import { fetchJson } from '../../services/api';import { useTranslation } from "react-i18next";
import { getFriendlyError } from '../../utils/friendlyError';
import { getCurrentLocale } from '../../i18n';
import { useTheme } from '../../contexts/ThemeContext';
import AppBackground from '../../components/layout/AppBackground';

const badgeByTone = {
  green: { color: '#21d4a7', backgroundColor: 'rgba(33,212,167,0.16)' },
  blue: { color: '#4f8cff', backgroundColor: 'rgba(79,140,255,0.16)' },
  amber: { color: '#ffb347', backgroundColor: 'rgba(255,179,71,0.16)' }
};

export default function AgencyListingsScreen({ navigation, route }) {const { t } = useTranslation();
  const { colors } = useTheme();
  const token = route?.params?.token;
  const user = route?.params?.user;

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');
  const [carImages, setCarImages] = useState({});

  const loadListings = useCallback(async () => {
    if (!token || !user?.id) {
      setIsLoading(false);
      setRefreshing(false);
      setError('Session requise');
      return;
    }

    try {
      setError('');
      const data = await getOwnerListings({ token, ownerId: user.id });
      setListings(data);

      const images = {};
      const uniqueCarIds = [...new Set(data.map((item) => item.carId).filter(Boolean))];

      await Promise.all(
        uniqueCarIds.map(async (carId) => {
          try {
            const carImagesData = await fetchJson(`/api/car-images?carId=${carId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const primaryImage = (Array.isArray(carImagesData) ? carImagesData : []).find((img) => img.isPrimary);
            if (primaryImage) {
              images[carId] = primaryImage.imageUrl;
            }
          } catch (_err) {


            // Ignore image lookup failures and keep the card usable.
          }}));

      setCarImages(images);
    } catch (err) {
      setError(getFriendlyError(err, t));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadListings();
  };

  const handleDelete = (listing) => {
    Alert.alert(t("screens.agency.agencylistingsscreen.supprimer"),

    `Êtes-vous sûr de vouloir supprimer l'annonce "${listing.title}" ?`,
    [
    { text: t("screens.agency.agencyprofilescreen.annuler"), style: 'cancel' },
    {
      text: t("screens.agency.agencylistingsscreen.supprimer"),
      style: 'destructive',
      onPress: async () => {
        try {
          await deleteOwnerListing({ token, listingId: listing.id });
          loadListings();
        } catch (err) {
          Alert.alert(t("screens.agency.agencylistingsscreen.erreur"), t("screens.agency.agencylistingsscreen.impossibleDeSupprimerLannonceReessayezPlusTard"));
        }
      }
    }]

    );
  };

  const handleTogglePublish = async (listing) => {
    if (!listing.isActive && listing.state !== 'ready_to_publish') {
      Alert.alert(t("screens.agency.agencylistingsscreen.publicationBloquee"), t("screens.agency.agencylistingsscreen.vousDevezValiderCarteGriseAssuranceEt")


      );
      return;
    }

    try {
      await toggleListingPublication({
        token,
        listingId: listing.id,
        shouldPublish: !listing.isActive
      });
      loadListings();
    } catch (err) {
      Alert.alert(t("screens.agency.agencylistingsscreen.erreur"), getFriendlyError(err, t));
    }
  };

  return (
    <AppBackground contentStyle={styles.safeArea}>
          <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={styles.page}>
          <View style={styles.headerSpacer} />

          {isLoading ?
              <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View> :

              <FlatList
                data={listings}
                keyExtractor={(item) => String(item.id)}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                <>
                  <SectionTitle
                    kicker="LISTINGS"
                    title={t("screens.agency.agencylistingsscreen.annoncesDeLagence")}
                    subtitle={t("screens.agency.agencylistingsscreen.gestionPublicationEtVisibilite")}
                    kickerStyle={{ color: colors.white }}
                    titleStyle={{ color: colors.white }}
                    subtitleStyle={{ color: 'rgba(255,255,255,0.82)' }}
                    right={
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => navigation.navigate('OwnerListingForm', { token, user, mode: 'create_listing' })}>
                      
                        <Ionicons name="add" size={16} color="#fff" />
                        <Text style={styles.addButtonText}>{t("screens.agency.agencylistingsscreen.ajouter")}</Text>
                      </TouchableOpacity>
                    } />
                  
                  {error ? <Text style={styles.error}>{error}</Text> : null}
                </>
                }
                ListEmptyComponent={<Text style={styles.empty}>{t("screens.agency.agencylistingsscreen.aucuneAnnonce")}</Text>}
                renderItem={({ item }) => {
                  const badgeStyle = badgeByTone[item.stateTone] || badgeByTone.amber;

                  return (
                    <AgencyCard style={styles.card}>
                    {carImages[item.carId] ?
                      <Image source={{ uri: carImages[item.carId] }} style={styles.cardImage} /> :

                      <View style={styles.cardImageFallback}>
                        <Ionicons name="car-sport-outline" size={30} color="#D7DEFF" />
                      </View>
                      }

                    <View style={styles.cardContent}>
                      <View style={styles.cardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.title}>{item.title}</Text>
                          <Text style={styles.subtitle}>
                            {item.brand} {item.model} - {item.city}
                          </Text>
                        </View>
                        <Text style={[styles.badge, badgeStyle]}>{item.stateLabel}</Text>
                      </View>

                      <Text style={styles.price}>{Number(item.pricePerDay || 0).toLocaleString(getCurrentLocale())}{t("screens.agency.agencylistingsscreen.daJour")}</Text>

                      <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => navigation.navigate('OwnerListingForm', { token, user, mode: 'edit', listing: item })}>
                            
                          <Text style={styles.actionText}>{t("screens.agency.agencylistingsscreen.modifier")}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                          <Text style={[styles.actionText, { color: '#ff8a9e' }]}>{t("screens.agency.agencylistingsscreen.supprimer")}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.publishBtn, !item.isActive && item.state !== 'ready_to_publish' && styles.publishBtnDisabled]}
                            onPress={() => handleTogglePublish(item)}>
                            
                          <Text style={styles.publishText}>{item.isActive ? 'Dépublier' : 'Publier'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </AgencyCard>);

                }} />

              }
          </View>
          </View>
          <AgencyBottomNavigation navigation={navigation} route={route} active="listings" />
    </AppBackground>);

}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0c24' },
  background: { flex: 1, backgroundColor: '#0a0c24' },
  safeArea: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(2,3,14,0.58)' },
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  headerSpacer: { height: 8 },
  header: { marginBottom: 10 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 102 },
  error: { color: '#FF8FA3', marginBottom: 12, fontWeight: '700' },
  empty: { color: '#A5AECF', fontStyle: 'italic', marginTop: 10, marginBottom: 20 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(124,77,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)'
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900'
  },
  card: {
    padding: 0,
    marginBottom: 12,
    overflow: 'hidden'
  },
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#14172A'
  },
  cardImageFallback: {
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14172A'
  },
  cardContent: {
    padding: 14
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  title: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16
  },
  subtitle: {
    color: '#97A0C7',
    marginTop: 4,
    fontSize: 12
  },
  badge: {
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden'
  },
  price: {
    color: '#8f7dff',
    fontWeight: '900',
    marginTop: 10,
    fontSize: 14
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(146,151,214,0.25)',
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)'
  },
  actionText: {
    color: '#D8DCF7',
    fontWeight: '700',
    fontSize: 12
  },
  publishBtn: {
    flex: 1.3,
    borderRadius: 12,
    backgroundColor: '#8f7dff',
    paddingVertical: 10,
    alignItems: 'center'
  },
  publishBtnDisabled: {
    opacity: 0.45
  },
  publishText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12
  }
});
