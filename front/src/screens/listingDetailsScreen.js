import React from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';

const formatPrice = (value) => `${value.toLocaleString('fr-FR')} DA`;

const SpecCard = ({ icon, value, label }) => (
  <View style={styles.specCard}>
    <View style={styles.specIconBadge}>
      <Ionicons name={icon} size={18} color="#8f6cff" />
    </View>
    <Text style={styles.specValue}>{value}</Text>
    <Text style={styles.specLabel}>{label}</Text>
  </View>
);

const ListingDetailsScreen = ({ navigation, route }) => {
  const listing = route?.params?.listing;

  if (!listing) {
    return (
      <SafeAreaView style={styles.fallbackContainer}>
        <Text style={styles.fallbackTitle}>Détails indisponibles</Text>
        <TouchableOpacity style={styles.fallbackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.fallbackButtonText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
      >
        <ImageBackground source={{ uri: listing.image }} style={styles.heroImage}>
          <SafeAreaView style={styles.heroTopRow}>
            <TouchableOpacity style={styles.heroButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroActionsRight}>
              <TouchableOpacity style={styles.heroButton}>
                <Ionicons name="heart-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroButton}>
                <Ionicons name="share-social-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </ImageBackground>

        <View style={styles.body}>
          <View style={styles.titlePriceRow}>
            <View>
              <Text style={styles.brand}>{listing.brand}</Text>
              <Text style={styles.model}>{listing.model}</Text>
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.priceLead}>a partir de</Text>
              <Text style={styles.price}>{formatPrice(listing.pricePerDay)}</Text>
              <Text style={styles.priceUnit}>DA/jour</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{listing.category}</Text>
            </View>
            <Text style={styles.metaText}>{listing.year}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#F8B84E" />
              <Text style={styles.ratingText}>{listing.rating}</Text>
              <Text style={styles.reviewsText}>({listing.reviewsCount} avis)</Text>
            </View>
          </View>

          <View style={styles.specsGrid}>
            <SpecCard icon="people-outline" value={listing.seats} label="Places" />
            <SpecCard icon="flash-outline" value={listing.fuel} label="Carburant" />
            <SpecCard icon="settings-outline" value={listing.transmission} label="Boite" />
            <SpecCard icon="pulse-outline" value={`${listing.mileageKm} km`} label="Kilometrage" />
          </View>

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>

          <View style={styles.reservationCard}>
            <View style={styles.reservationInfo}>
              <Text style={styles.reservationLabel}>Prix par jour</Text>
              <Text style={styles.reservationPrice}>{formatPrice(listing.pricePerDay)}</Text>
            </View>
            {listing.available ? (
              <TouchableOpacity onPress={() => navigation.navigate('ReservationDatePicker', { listing })}>
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.reservationButton}
                >
                  <Text style={styles.reservationButtonText}>Reserver</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={[styles.reservationButton, styles.reservationButtonDisabled]}>
                <Text style={styles.reservationButtonText}>Indisponible</Text>
              </View>
            )}
          </View>

          <View style={styles.ownerCard}>
            <View style={styles.ownerLeft}>
              <View style={styles.ownerAvatar}>
                <Ionicons name="person-outline" size={18} color="#d9ddff" />
              </View>
              <View>
                <View style={styles.ownerNameRow}>
                  <Text style={styles.ownerName}>{listing.owner?.name || 'Proprietaire'}</Text>
                  {listing.owner?.verified && (
                    <Text style={styles.ownerVerified}>Verifie</Text>
                  )}
                </View>
                <View style={styles.ownerLocationRow}>
                  <Ionicons name="location-outline" size={13} color="#8e95bf" />
                  <Text style={styles.ownerLocation}>{listing.owner?.city || listing.city}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.ownerMessageButton}>
              <Ionicons name="chatbubble-outline" size={18} color="#8f6cff" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090b1e',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#090b1e',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroImage: {
    height: 290,
    justifyContent: 'space-between',
  },
  heroTopRow: {
    paddingHorizontal: 14,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroActionsRight: {
    flexDirection: 'row',
  },
  heroButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 10, 27, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginLeft: 8,
  },
  body: {
    marginTop: -10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 18,
    backgroundColor: '#090b1e',
  },
  titlePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brand: {
    color: '#aab0d6',
    fontSize: 20 / 2,
    marginBottom: 4,
  },
  model: {
    color: '#f6f8ff',
    fontSize: 42 / 2,
    fontWeight: '700',
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  priceLead: {
    color: '#aab0d6',
    fontSize: 10,
  },
  price: {
    color: '#7a5cff',
    fontSize: 42 / 2,
    fontWeight: '800',
    lineHeight: 26,
  },
  priceUnit: {
    color: '#cdd2f2',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 14,
  },
  categoryPill: {
    backgroundColor: 'rgba(122, 92, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 10,
  },
  categoryText: {
    color: '#8f6cff',
    fontSize: 12,
    fontWeight: '700',
  },
  metaText: {
    color: '#c6ccef',
    fontSize: 14,
    marginRight: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#F8B84E',
    fontWeight: '700',
    marginLeft: 3,
    marginRight: 4,
  },
  reviewsText: {
    color: '#98a0c8',
    fontSize: 12,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  specCard: {
    width: '48.4%',
    borderRadius: 16,
    backgroundColor: '#131633',
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  specIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(143, 108, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  specValue: {
    color: '#f3f5ff',
    fontSize: 28 / 2,
    fontWeight: '700',
    marginBottom: 4,
  },
  specLabel: {
    color: '#9aa2cc',
    fontSize: 13,
  },
  sectionTitle: {
    color: '#f3f5ff',
    fontSize: 32 / 2,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 8,
  },
  description: {
    color: '#9aa2cc',
    fontSize: 15,
    lineHeight: 22,
  },
  ownerCard: {
    marginTop: 18,
    marginBottom: 4,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#151837',
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ownerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ownerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#5a62f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerName: {
    color: '#f2f4ff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  ownerVerified: {
    color: '#23d49f',
    fontSize: 12,
    fontWeight: '700',
  },
  ownerLocationRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerLocation: {
    color: '#8e95bf',
    fontSize: 13,
    marginLeft: 4,
  },
  ownerMessageButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.24)',
    backgroundColor: 'rgba(13, 16, 35, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  reservationCard: {
    marginTop: 18,
    marginBottom: 18,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#151837',
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reservationInfo: {
    alignItems: 'flex-start',
  },
  reservationLabel: {
    color: '#9aa2cc',
    fontSize: 12,
    marginBottom: 4,
  },
  reservationPrice: {
    color: '#7a5cff',
    fontSize: 24,
    fontWeight: '800',
  },
  reservationButton: {
    minWidth: 140,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  reservationButtonDisabled: {
    backgroundColor: '#444a71',
  },
  reservationButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090b1e',
  },
  fallbackTitle: {
    color: '#f6f8ff',
    fontSize: 16,
    marginBottom: 12,
  },
  fallbackButton: {
    borderRadius: 10,
    backgroundColor: '#6C4DFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  fallbackButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default ListingDetailsScreen;
