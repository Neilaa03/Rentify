import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { appFont } from '../../utils/responsive';

const FALLBACK_IMAGE = 'https://picsum.photos/seed/listing-fallback/900/600';

const formatPrice = (value) => `${value.toLocaleString('fr-FR')} DA/j`;

const toImageUrl = (img) => {
  if (!img) return null;
  if (typeof img === 'string') return img;
  return img.imageUrl || img.image_url || img.url || null;
};

const ListingCard = ({ listing, onPress, isFavorite = false, onToggleFavorite }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const scrollRef = useRef(null);

  const imageUrls = useMemo(() => {
    const fromListingImages = Array.isArray(listing?.images)
      ? listing.images.map(toImageUrl).filter(Boolean)
      : [];

    const fromCarImages = Array.isArray(listing?.car?.images)
      ? listing.car.images.map(toImageUrl).filter(Boolean)
      : [];

    const primary = toImageUrl(listing?.image);

    const urls = [...fromListingImages, ...fromCarImages, primary].filter(Boolean);
    const unique = [...new Set(urls)];
    return unique.length ? unique : [FALLBACK_IMAGE];
  }, [listing]);

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
    <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={onPress}>
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
            {!listing.available && (
              <View style={styles.unavailableBadge}>
                <Text style={styles.unavailableText}>Indisponible</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.8}
              onPress={onToggleFavorite}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavorite ? COLORS.primary : '#fff'}
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

            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>{formatPrice(listing.pricePerDay)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{`${listing.brand} ${listing.model}`}</Text>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={14} color="#F8B84E" />
            <Text style={styles.ratingText}>{listing.rating}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>{`${listing.year} · ${listing.category}`}</Text>

        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Ionicons name="people-outline" size={14} color="#9aa0c8" />
            <Text style={styles.chipText}>{listing.seats}</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="flash-outline" size={14} color="#9aa0c8" />
            <Text style={styles.chipText}>{listing.fuel}</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="settings-outline" size={14} color="#9aa0c8" />
            <Text style={styles.chipText}>{listing.transmission}</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="location-outline" size={14} color="#9aa0c8" />
            <Text style={styles.chipText}>{listing.city}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111329',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(143, 150, 255, 0.14)',
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
    fontSize: appFont(12),
    fontWeight: '700',
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
    fontSize: appFont(14),
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
    fontSize: appFont(14.5),
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
    fontSize: appFont(13),
    marginLeft: 4,
  },
  subtitle: {
    color: '#8b91ba',
    fontSize: appFont(13),
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  chipText: {
    color: '#9aa0c8',
    fontSize: appFont(12),
    marginLeft: 5,
  },
});

export default ListingCard;
