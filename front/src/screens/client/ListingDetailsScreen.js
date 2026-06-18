import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { useFavorites } from '../../contexts/FavoritesContext';
import { API_ENDPOINTS } from '../../constants/api';
import RatingStars from '../../components/reviews/RatingStars';
import ReviewCard from '../../components/reviews/ReviewCard';
import { useTranslation } from 'react-i18next';
import { getCurrentLocale } from '../../i18n';
import { useAuth } from '../../contexts/AuthContext';
import GuestAuthPrompt from '../../components/auth/GuestAuthPrompt';
import { useGuestAuthPrompt } from '../../utils/guestAccess';

const formatPrice = (value) => `${Number(value || 0).toLocaleString(getCurrentLocale())} DA`;
const SCREEN_WIDTH = Dimensions.get('window').width;
const roundToHalf = (value) => Math.round(value * 2) / 2;
const normalizeText = (value) => String(value || '').trim().toLowerCase();

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
  const { t } = useTranslation();
  const listing = route?.params?.listing;
  const groupedOffers = Array.isArray(route?.params?.groupedOffers) ? route.params.groupedOffers : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isAuthenticated } = useAuth();
  const { authPromptVisible, closeAuthPrompt, confirmAuthPrompt, requireAuth: requireGuestAuth } = useGuestAuthPrompt(navigation);
  const [reviewSummary, setReviewSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const [selectedOfferId, setSelectedOfferId] = useState(listing?.id || null);

  const carId = listing?.carId || listing?.car?.id || listing?.car_id || null;

  useEffect(() => {
    setSelectedOfferId(listing?.id || null);
  }, [listing?.id]);

  const cityOffers = useMemo(() => {
    const baseOffers = groupedOffers.length ? groupedOffers : (listing ? [listing] : []);
    const map = new Map();

    baseOffers.forEach((offer) => {
      const key = normalizeText(offer?.city) || `offer-${offer?.id}`;
      if (!map.has(key)) map.set(key, offer);
    });

    return [...map.values()];
  }, [groupedOffers, listing]);

  const selectedOffer = useMemo(() => {
    if (!cityOffers.length) return listing || null;
    const byId = cityOffers.find((offer) => String(offer.id) === String(selectedOfferId));
    if (byId) return byId;
    const byCity = cityOffers.find((offer) => normalizeText(offer.city) === normalizeText(listing?.city));
    return byCity || cityOffers[0] || listing || null;
  }, [cityOffers, listing, selectedOfferId]);

  const canChooseCity = cityOffers.length > 1;
  const requireAuth = () => requireGuestAuth(isAuthenticated);

  const goToReservationDatePicker = () => {
    if (!requireAuth()) return;
    navigation.navigate('ReservationDatePicker', {
      listing: selectedOffer,
      selectedCity: selectedOffer?.city || '',
      groupedOffers: cityOffers,
    });
  };

  useEffect(() => {
    if (!carId) return undefined;
    let cancelled = false;

    const load = async () => {
      try {
        setReviewsLoading(true);
        const [summaryRes, reviewsRes] = await Promise.all([
          fetch(API_ENDPOINTS.REVIEWS.CAR_SUMMARY(carId)),
          fetch(`${API_ENDPOINTS.REVIEWS.CAR_LIST(carId)}?limit=3&page=1`),
        ]);

        if (!cancelled && summaryRes.ok) {
          const json = await summaryRes.json();
          setReviewSummary(json || null);
        }

        if (!cancelled && reviewsRes.ok) {
          const json = await reviewsRes.json();
          setReviews(Array.isArray(json?.items) ? json.items : []);
        }
      } catch (e) {
        if (!cancelled) {
          setReviewSummary(null);
          setReviews([]);
        }
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [carId]);

  const averageRatingRounded = useMemo(() => {
    const avg = Number(reviewSummary?.averageRating || 0) || 0;
    return roundToHalf(avg);
  }, [reviewSummary?.averageRating]);

  const reviewCount = Number(reviewSummary?.reviewCount || 0) || 0;
  const slideWidth = SCREEN_WIDTH - 64;

  const handleReviewsScroll = (event) => {
    const { contentOffset, layoutMeasurement } = event.nativeEvent || {};
    const width = layoutMeasurement?.width || slideWidth;
    const x = contentOffset?.x || 0;
    const next = Math.round(x / Math.max(1, width));
    if (next !== activeReviewIndex) setActiveReviewIndex(next);
  };

  const imageUrls = useMemo(() => {
    const toImageUrl = (img) => {
      if (!img) return null;
      if (typeof img === 'string') return img;
      return img.imageUrl || img.image_url || img.url || null;
    };

    const fromListingImages = Array.isArray(selectedOffer?.images)
      ? selectedOffer.images.map(toImageUrl).filter(Boolean)
      : [];

    const fromCarImages = Array.isArray(selectedOffer?.car?.images)
      ? selectedOffer.car.images.map(toImageUrl).filter(Boolean)
      : [];

    const primary = toImageUrl(selectedOffer?.image);
    const urls = [...fromListingImages, ...fromCarImages, primary].filter(Boolean);
    const unique = [...new Set(urls)];
    return unique.length ? unique : ['https://picsum.photos/seed/listing-details/1200/800'];
  }, [selectedOffer]);

  if (!listing) {
    return (
      <SafeAreaView style={styles.fallbackContainer}>
        <Text style={styles.fallbackTitle}>{t('screens.client.listingdetailsscreen.detailsIndisponibles')}</Text>
        <TouchableOpacity style={styles.fallbackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.fallbackButtonText}>{t('screens.client.listingdetailsscreen.retour')}</Text>
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
              <TouchableOpacity
                style={styles.heroButton}
                onPress={() => {
                  if (!requireAuth()) return;
                  toggleFavorite(selectedOffer.id);
                }}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isFavorite(selectedOffer.id) ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFavorite(selectedOffer.id) ? COLORS.primary : '#fff'}
                />
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
              <Text style={styles.brand}>{selectedOffer.brand}</Text>
              <Text style={styles.model}>{selectedOffer.model}</Text>
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.priceLead}>{t('screens.client.listingdetailsscreen.aPartirDe')}</Text>
              <Text style={styles.price}>{formatPrice(selectedOffer.pricePerDay)}</Text>
              <Text style={styles.priceUnit}>{t('screens.client.listingdetailsscreen.daJour')}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{selectedOffer.category}</Text>
            </View>
            <Text style={styles.metaText}>{selectedOffer.year}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#F8B84E" />
              <Text style={styles.ratingText}>{selectedOffer.rating}</Text>
              <Text style={styles.reviewsText}>
                ({selectedOffer.reviewsCount} {t('screens.client.listingdetailsscreen.avis')})
              </Text>
            </View>
          </View>

          <View style={styles.specsGrid}>
            <SpecCard icon="people-outline" value={selectedOffer.seats} label={t('screens.client.listingdetailsscreen.places')} />
            <SpecCard icon="flash-outline" value={selectedOffer.fuel} label={t('screens.client.listingdetailsscreen.carburant')} />
            <SpecCard icon="settings-outline" value={selectedOffer.transmission} label={t('screens.client.listingdetailsscreen.boite')} />
            <SpecCard icon="pulse-outline" value={`${selectedOffer.mileageKm} km`} label={t('screens.client.listingdetailsscreen.kilometrage')} />
          </View>

          {canChooseCity ? (
            <>
              <Text style={styles.sectionTitle}>{t('screens.client.listingdetailsscreen.villesDisponibles')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityList}>
                {cityOffers.map((offer) => {
                  const isActive = String(offer.id) === String(selectedOffer.id);
                  return (
                    <TouchableOpacity
                      key={offer.id}
                      style={[styles.cityChip, isActive && styles.cityChipActive]}
                      onPress={() => setSelectedOfferId(offer.id)}
                      activeOpacity={0.86}
                    >
                      <Ionicons name="location-outline" size={14} color={isActive ? '#fff' : '#bfc6ec'} />
                      <Text style={[styles.cityChipText, isActive && styles.cityChipTextActive]}>
                        {offer.city || t('screens.client.listingdetailsscreen.ville')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : selectedOffer.city ? (
            <>
              <Text style={styles.sectionTitle}>{t('screens.client.listingdetailsscreen.villeDeRetrait')}</Text>
              <View style={styles.singleCityCard}>
                <Ionicons name="location-outline" size={14} color="#dce1ff" />
                <Text style={styles.singleCityText}>{selectedOffer.city}</Text>
              </View>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>{t('screens.client.listingdetailsscreen.description')}</Text>
          <Text style={styles.description}>{selectedOffer.description}</Text>

          <View style={styles.reviewsHeaderRow}>
            <Text style={styles.sectionTitle}>
              {reviewCount
                ? `${t('screens.client.listingdetailsscreen.avisTitle')} (${reviewCount})`
                : t('screens.client.listingdetailsscreen.avisTitle')}
            </Text>
            {reviewCount ? (
              <View style={styles.reviewsSummaryRight}>
                <RatingStars rating={averageRatingRounded} />
                <Text style={styles.reviewsAvgText}>{averageRatingRounded.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>

          {reviewsLoading ? (
            <View style={styles.reviewsLoadingRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.reviewsLoadingText}>{t('screens.client.listingdetailsscreen.chargement')}</Text>
            </View>
          ) : reviews.length ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled={false}
                showsHorizontalScrollIndicator={false}
                snapToInterval={slideWidth}
                decelerationRate="fast"
                onScroll={handleReviewsScroll}
                scrollEventThrottle={16}
                contentContainerStyle={styles.reviewsCarousel}
              >
                {reviews.map((r) => (
                  <View key={r.id} style={[styles.reviewsSlide, { width: slideWidth }]}>
                    <ReviewCard review={r} />
                  </View>
                ))}
              </ScrollView>

              {reviews.length > 1 ? (
                <View style={styles.reviewsDotsRow}>
                  {reviews.map((_, index) => (
                    <View
                      key={`review-dot-${index}`}
                      style={[
                        styles.reviewsDot,
                        index === activeReviewIndex && styles.reviewsDotActive,
                      ]}
                    />
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.reviewsEmptyText}>{t('screens.client.listingdetailsscreen.aucunAvisPourLeMoment')}</Text>
          )}

          <Text style={styles.sectionTitle}>{t('screens.client.listingdetailsscreen.recuperation')}</Text>
          <View style={styles.pickupInfoCard}>
            <View style={styles.pickupInfoRow}>
              <Ionicons name="location-outline" size={16} color="#cfd3ff" />
              <Text style={styles.pickupInfoText}>{selectedOffer.pickupAddress || t('screens.reservations.reservationdatepickerscreen.adresseNonPrecisee')}</Text>
            </View>
            <View style={styles.pickupInfoRow}>
              <Ionicons name="car-outline" size={16} color="#cfd3ff" />
              <Text style={styles.pickupInfoText}>
                {t('screens.client.listingdetailsscreen.livraison')} {Number(selectedOffer.deliveryFee || 0) > 0 ? `${Number(selectedOffer.deliveryFee).toLocaleString(getCurrentLocale())} DA` : t('common.unavailable')}
              </Text>
            </View>
          </View>

          <View style={styles.reservationCard}>
            <View style={styles.reservationInfo}>
              <Text style={styles.reservationLabel}>{t('screens.client.listingdetailsscreen.prixParJour')}</Text>
              <Text style={styles.reservationPrice}>{formatPrice(selectedOffer.pricePerDay)}</Text>
            </View>
            {selectedOffer.available ? (
              <TouchableOpacity onPress={goToReservationDatePicker}>
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.reservationButton}
                >
                  <Text style={styles.reservationButtonText}>
                    {selectedOffer.city
                      ? t('screens.client.listingdetailsscreen.reserverACity', { city: selectedOffer.city })
                      : t('screens.client.listingdetailsscreen.reserver')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={[styles.reservationButton, styles.reservationButtonDisabled]}>
                <Text style={styles.reservationButtonText}>{t('screens.client.listingdetailsscreen.indisponible')}</Text>
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
                  <Text style={styles.ownerName}>{selectedOffer.owner?.name || t('screens.client.listingdetailsscreen.proprietaire')}</Text>
                  {selectedOffer.owner?.verified && (
                    <Text style={styles.ownerVerified}>{t('screens.client.listingdetailsscreen.verifie')}</Text>
                  )}
                </View>
                <View style={styles.ownerLocationRow}>
                  <Ionicons name="location-outline" size={13} color="#8e95bf" />
                  <Text style={styles.ownerLocation}>{selectedOffer.owner?.city || selectedOffer.city}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.ownerMessageButton}
              onPress={() => {
                if (!requireAuth()) return;
                const otherUserId = selectedOffer?.car?.ownerId;
                if (!otherUserId) return;
                const rawName = String(selectedOffer?.owner?.name || '').trim();
                const [firstName, ...rest] = rawName ? rawName.split(/\s+/) : [];
                const lastName = rest.join(' ');
                navigation.navigate('Chat', {
                  otherUserId,
                  otherUser: {
                    id: otherUserId,
                    name: rawName || undefined,
                    firstName: firstName || undefined,
                    lastName: lastName || undefined,
                  },
                });
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#8f6cff" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <GuestAuthPrompt
        visible={authPromptVisible}
        onClose={closeAuthPrompt}
        onConfirm={confirmAuthPrompt}
      />
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
  reviewsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  reviewsSummaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewsAvgText: {
    color: '#cfd3ff',
    fontSize: 12,
    fontWeight: '900',
  },
  reviewsCarousel: {
    paddingRight: 16,
    marginBottom: 14,
  },
  reviewsSlide: {
    marginRight: 12,
  },
  reviewsDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: -2,
    marginBottom: 14,
  },
  reviewsDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  reviewsDotActive: {
    width: 18,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  reviewsLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  reviewsLoadingText: {
    color: '#8e95bf',
    fontSize: 13,
    fontWeight: '600',
  },
  reviewsEmptyText: {
    color: '#8e95bf',
    fontSize: 13,
    marginBottom: 14,
  },
  cityList: {
    paddingRight: 8,
    marginBottom: 2,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(188, 194, 232, 0.22)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
    marginBottom: 8,
  },
  cityChipActive: {
    backgroundColor: 'rgba(143, 108, 255, 0.25)',
    borderColor: '#8f6cff',
  },
  cityChipText: {
    color: '#d5dbf5',
    fontWeight: '700',
  },
  cityChipTextActive: {
    color: '#fff',
  },
  singleCityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(188, 194, 232, 0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  singleCityText: {
    color: '#dce1ff',
    fontWeight: '700',
  },
  description: {
    color: '#9aa2cc',
    fontSize: 15,
    lineHeight: 22,
  },
  pickupInfoCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  pickupInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pickupInfoText: {
    flex: 1,
    color: '#cfd3ff',
    lineHeight: 18,
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
