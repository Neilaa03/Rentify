import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const FALLBACK_IMAGE = 'https://via.placeholder.com/540x280';

const toImageUrl = (img) => {
  if (!img) return null;
  if (typeof img === 'string') return img;
  return img.imageUrl || img.image_url || img.url || null;
};

const CarCard = ({ car, onPress, onEdit, onDelete, onReviewsPress }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const scrollRef = useRef(null);

  const imageUrls = useMemo(() => {
    const rawImages = Array.isArray(car?.images) ? car.images : [];
    const urls = rawImages.map(toImageUrl).filter(Boolean);
    if (urls.length > 0) return urls;

    const primary = rawImages.find((img) => img?.isPrimary || img?.is_primary);
    const primaryUrl = toImageUrl(primary);
    return [primaryUrl || FALLBACK_IMAGE];
  }, [car?.images]);

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
    }, 2800);

    return () => clearInterval(timer);
  }, [imageUrls.length, carouselWidth]);

  const pricePerDay = car.pricePerDay ?? car.price_per_day;
  const subtitleParts = [car.year, car.color, car.fuelType].filter(Boolean);

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.card}>
      <View style={styles.imageWrapper}>
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

        {imageUrls.length > 1 ? (
          <View style={styles.dotsRow}>
            {imageUrls.map((_, index) => (
              <View
                key={`dot-${index}`}
                style={[styles.dot, index === activeIndex && styles.dotActive]}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>En ligne</Text>
        </View>

        {typeof onReviewsPress === 'function' ? (
          <TouchableOpacity
            style={styles.reviewsBadge}
            activeOpacity={0.85}
            onPress={onReviewsPress}
          >
            <Ionicons name="chatbubbles-outline" size={18} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{car.brand} {car.model}</Text>
            <Text style={styles.subtitle}>{subtitleParts.join(' • ')}</Text>
          </View>
          <Text style={styles.priceText}>{pricePerDay ? `${Number(pricePerDay).toLocaleString('fr-FR')} DA/j` : '—'}</Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="speedometer" size={14} color={COLORS.gray} />
            <Text style={styles.detailLabel}>{car.mileage ? `${car.mileage} km` : 'N/A'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="people" size={14} color={COLORS.gray} />
            <Text style={styles.detailLabel}>{car.seats ? `${car.seats} places` : 'N/A'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="cog-outline" size={14} color={COLORS.gray} />
            <Text style={styles.detailLabel}>{car.transmission || 'Auto'}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.editButton} onPress={onEdit}>
            <Ionicons name="pencil-outline" size={16} color="#fff" />
            <Text style={styles.editButtonText}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
            <Ionicons name="trash-outline" size={16} color="#ff5a5a" />
            <Text style={styles.deleteButtonText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageWrapper: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.gray,
  },
  carouselContainer: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: 0,
    height: '100%',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
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
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  reviewsBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 18, 40, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  body: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: '#c3c8e1',
    fontSize: 13,
  },
  priceText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    color: '#a7adcf',
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 11,
    gap: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ff5a5a',
    borderRadius: 12,
    paddingVertical: 11,
    gap: 8,
  },
  deleteButtonText: {
    color: '#ff5a5a',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default CarCard;
