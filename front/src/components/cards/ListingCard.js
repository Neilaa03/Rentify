import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { appFont } from '../../utils/responsive';
import { useTranslation } from 'react-i18next';
import { getCurrentLocale } from '../../i18n';
import { useTheme } from '../../contexts/ThemeContext';

const FALLBACK_IMAGE = 'https://picsum.photos/seed/listing-fallback/900/600';

const toImageUrl = (img) => {
  if (!img) return null;
  if (typeof img === 'string') return img;
  return img.imageUrl || img.image_url || img.url || null;
};

const ListingCard = ({ listing, onPress, isFavorite = false, onToggleFavorite }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const formatPrice = (value) => `${value.toLocaleString(getCurrentLocale())}${t('common.daPerDayCompact')}`;
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const scrollRef = useRef(null);
  const selectedListing = listing?.selectedOffer || listing;
  const offerCount = Number(listing?.offerCount || 0) || 0;
  const matchingOfferCount = Number(listing?.matchingOfferCount || 0) || 0;
  const availableCities = useMemo(() => {
    const sourceOffers = Array.isArray(listing?.offers) && listing.offers.length ? listing.offers : [selectedListing];
    const seenCities = new Set();
    const cities = [];

    sourceOffers.forEach((offer) => {
      const city = String(offer?.city || '').trim();
      const normalizedCity = city.toLowerCase();

      if (!city || seenCities.has(normalizedCity)) return;
      seenCities.add(normalizedCity);
      cities.push(city);
    });

    return cities;
  }, [listing, selectedListing]);

  const visibleCities = availableCities.slice(0, 5);
  const hasMoreCities = availableCities.length > 5;

  const imageUrls = useMemo(() => {
    const fromListingImages = Array.isArray(selectedListing?.images)
      ? selectedListing.images.map(toImageUrl).filter(Boolean)
      : [];

    const fromCarImages = Array.isArray(selectedListing?.car?.images)
      ? selectedListing.car.images.map(toImageUrl).filter(Boolean)
      : [];

    const primary = toImageUrl(selectedListing?.image);

    const urls = [...fromListingImages, ...fromCarImages, primary].filter(Boolean);
    const unique = [...new Set(urls)];
    return unique.length ? unique : [FALLBACK_IMAGE];
  }, [selectedListing]);

  const handleImageScroll = (event) => {
    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    if (!layoutMeasurement?.width) return;

    const nextIndex = Math.round(contentOffset.x / layoutMeasurement.width);
    if (nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
    }
  };

  useEffect(() => {
    if (imageUrls.length <= 1 || !carouselWidth) return undefined;

    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % imageUrls.length;
        scrollRef.current?.scrollTo({ x: next * carouselWidth, animated: true });
        return next;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [imageUrls.length, carouselWidth]);

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]} activeOpacity={0.92} onPress={onPress}>
      <View style={styles.imageContainer}>
        <View
          style={styles.carouselContainer}
          onLayout={(event) => setCarouselWidth(event.nativeEvent.layout.width)}
        >
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          onScroll={handleImageScroll}
          scrollEventThrottle={16}
        >
          {imageUrls.map((uri, index) => (
            <Image
              key={`${uri}-${index}`}
              source={{ uri }}
              style={[styles.image, carouselWidth ? { width: carouselWidth } : null]}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
        </View>

        <View style={styles.overlay}>
          <View style={styles.imageTopRow}>
            {!selectedListing.available && (
              <View style={[styles.unavailableBadge, { backgroundColor: `${colors.danger}1A` }]}>
                <Text style={[styles.unavailableText, { color: colors.danger }]}>{t('components.cards.listingcard.indisponible')}</Text>
              </View>
            )}
            {offerCount > 1 && (
              <View style={[styles.offerBadge, { backgroundColor: `${colors.primary}16` }]}>
                <Text style={[styles.offerBadgeText, { color: colors.primary }]}>
                  {matchingOfferCount > 0 && matchingOfferCount < offerCount
                    ? t('components.cards.listingcard.matchingOffers', { matching: matchingOfferCount, total: offerCount })
                    : t('components.cards.listingcard.offers', { count: offerCount })}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.overlaySoft, borderColor: colors.border }]}
              activeOpacity={0.8}
              onPress={onToggleFavorite}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavorite ? colors.primary : colors.text}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomRow}>
            {imageUrls.length > 1 ? (
              <View style={styles.dotsRow}>
                {imageUrls.map((_, index) => (
                  <View
                    key={`dot-${index}`}
                    style={[styles.dot, index === activeIndex && styles.dotActive]}
                  />
                ))}
              </View>
            ) : <View />}

            <View style={[styles.priceBadge, { backgroundColor: colors.surfaceStrong }]}>
              <Text style={[styles.priceText, { color: colors.text }]}>{formatPrice(Number(selectedListing.pricePerDay || 0))}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>{`${selectedListing.brand} ${selectedListing.model}`}</Text>
          <View style={[styles.ratingPill, { backgroundColor: colors.surface }]}>
            <Ionicons name="star" size={14} color="#F8B84E" />
            <Text style={[styles.ratingText, { color: colors.text }]}>{selectedListing.rating}</Text>
          </View>
        </View>

        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{`${selectedListing.year} · ${selectedListing.category}`}</Text>

        <View style={styles.chipsRow}>
          <View style={[styles.chip, { backgroundColor: colors.surface }]}>
            <Ionicons name="people-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.chipText, { color: colors.textMuted }]}>{selectedListing.seats}</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.surface }]}>
            <Ionicons name="flash-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.chipText, { color: colors.textMuted }]}>{selectedListing.fuel}</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.surface }]}>
            <Ionicons name="settings-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.chipText, { color: colors.textMuted }]}>{selectedListing.transmission}</Text>
          </View>
        </View>

        <View style={styles.citiesRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <View style={styles.citiesWrap}>
            {visibleCities.map((city) => (
              <View key={city} style={[styles.cityChip, { backgroundColor: colors.surface }]}>
                <Text style={[styles.cityChipText, { color: colors.textMuted }]} numberOfLines={1}>
                  {city}
                </Text>
              </View>
            ))}
            {hasMoreCities && (
              <View style={[styles.moreCitiesChip, { backgroundColor: colors.surface }]}>
                <Text style={[styles.cityChipText, { color: colors.textMuted }]}>...</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 16,
  },
  imageContainer: {
    height: 190,
    position: 'relative',
  },
  carouselContainer: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: 0,
    height: 190,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 12,
    justifyContent: 'space-between',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    width: 18,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  imageTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  unavailableBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#EB5757',
  },
  unavailableText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  offerBadge: {
    flex: 1,
    marginHorizontal: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(8, 10, 24, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  offerBadgeText: {
    color: '#fff',
    fontSize: appFont(11.5),
    fontWeight: '700',
    textAlign: 'center',
  },
  iconButton: {
    marginLeft: 'auto',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 9, 25, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  priceBadge: {
    alignSelf: 'flex-end',
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#6C4DFF',
  },
  priceText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  content: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    color: '#F5F7FF',
    fontSize: 29 / 2,
    fontWeight: '700',
    maxWidth: '76%',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 184, 78, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ratingText: {
    color: '#F8B84E',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },
  subtitle: {
    color: '#8b91ba',
    fontSize: 13,
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  citiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  citiesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    flex: 1,
    marginLeft: 8,
    overflow: 'hidden',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.12)',
    maxWidth: '48%',
    marginRight: 8,
    marginBottom: 8,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.12)',
    marginRight: 6,
    maxWidth: 92,
  },
  moreCitiesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.12)',
  },
  chipText: {
    color: '#9aa0c8',
    fontSize: 12,
    marginLeft: 5,
  },
  cityChipText: {
    color: '#9aa0c8',
    fontSize: appFont(11.5),
    fontWeight: '500',
  },
  availabilityRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availabilityText: {
    color: '#aeb4d6',
    fontSize: appFont(11.5),
    fontWeight: '500',
    flexShrink: 1,
  },
});

export default ListingCard;
