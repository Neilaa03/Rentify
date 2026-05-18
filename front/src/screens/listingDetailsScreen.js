import React, { useMemo, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const formatPrice = (value) => `${value.toLocaleString('fr-FR')} DA`;
const SCREEN_WIDTH = Dimensions.get('window').width;

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
  const [activeIndex, setActiveIndex] = useState(0);

  const imageUrls = useMemo(() => {
    const toImageUrl = (img) => {
      if (!img) return null;
      if (typeof img === 'string') return img;
      return img.imageUrl || img.image_url || img.url || null;
    };

    const fromListingImages = Array.isArray(listing?.images)
      ? listing.images.map(toImageUrl).filter(Boolean)
      : [];

    const fromCarImages = Array.isArray(listing?.car?.images)
      ? listing.car.images.map(toImageUrl).filter(Boolean)
      : [];

    const primary = toImageUrl(listing?.image);
    const urls = [...fromListingImages, ...fromCarImages, primary].filter(Boolean);
    const unique = [...new Set(urls)];
    return unique.length ? unique : ['https://picsum.photos/seed/listing-details/1200/800'];
  }, [listing]);

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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroImage}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const { contentOffset, layoutMeasurement } = event.nativeEvent;
              if (!layoutMeasurement?.width) return;
              const nextIndex = Math.round(contentOffset.x / layoutMeasurement.width);
              if (nextIndex !== activeIndex) {
                setActiveIndex(nextIndex);
              }
            }}
            scrollEventThrottle={16}
          >
            {imageUrls.map((uri, index) => (
              <Image key={`${uri}-${index}`} source={{ uri }} style={styles.heroSlideImage} resizeMode="cover" />
            ))}
          </ScrollView>

          <SafeAreaView pointerEvents="box-none" style={styles.heroTopRow}>
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

          {imageUrls.length > 1 ? (
            <View style={styles.heroDotsRow}>
              {imageUrls.map((_, index) => (
                <View
                  key={`hero-dot-${index}`}
                  style={[styles.heroDot, index === activeIndex && styles.heroDotActive]}
                />
              ))}
            </View>
          ) : null}
        </View>

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

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPrice}>{formatPrice(listing.pricePerDay)}</Text>
          <Text style={styles.bottomUnit}>par jour</Text>
        </View>
        <TouchableOpacity style={[styles.ctaButton, !listing.available && styles.ctaButtonDisabled]} disabled={!listing.available}>
          <Ionicons name="calendar-outline" size={18} color="#fff" />
          <Text style={styles.ctaText}>{listing.available ? 'Reserver maintenant' : 'Indisponible'}</Text>
        </TouchableOpacity>
      </View>
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
  },
  scrollContent: {
    paddingBottom: 118,
  },
  heroImage: {
    height: 290,
    position: 'relative',
  },
  heroSlideImage: {
    width: SCREEN_WIDTH,
    height: 290,
  },
  heroTopRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroDotsRow: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  heroDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  heroDotActive: {
    width: 18,
    borderRadius: 8,
    backgroundColor: '#fff',
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
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#151738',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 156, 233, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomPrice: {
    color: '#7a5cff',
    fontSize: 34 / 2,
    fontWeight: '800',
  },
  bottomUnit: {
    color: '#98a0c8',
    fontSize: 12,
    marginTop: 2,
  },
  ctaButton: {
    minWidth: 196,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5A78FF',
    paddingHorizontal: 16,
  },
  ctaButtonDisabled: {
    backgroundColor: '#444a71',
  },
  ctaText: {
    marginLeft: 8,
    color: '#fff',
    fontWeight: '700',
    fontSize: 18 / 2,
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
