import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';import { useTranslation } from "react-i18next";

const formatPrice = (value) => `${(value || 0).toLocaleString('fr-FR')} DA`;

const formatDateRange = (from, to) => {
  try {
    const f = new Date(from);
    const t = new Date(to);
    const opts = { year: '2-digit', month: 'short', day: 'numeric' };
    return `${f.toLocaleDateString('en-US', opts)} → ${t.toLocaleDateString('en-US', opts)}`;
  } catch (e) {
    return '';
  }
};

const formatSingleDate = (value) => {
  try {
    const date = new Date(value);
    const opts = { year: '2-digit', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', opts);
  } catch (e) {
    return '';
  }
};

const adaptFont = (width, regular, small, verySmall) => {
  if (width <= 340) return verySmall;
  if (width <= 380) return small;
  return regular;
};

const ReservationCard = ({
  reservation,
  targetRoute = 'ReservationDetails',
  onPress,
  showFinishPayment = false,
  onFinishPayment,
  compact = false
}) => {const { t } = useTranslation();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const tightLayout = width <= 380;
  const fontSize = {
    carName: adaptFont(width, 17, 15.5, 14.5),
    city: adaptFont(width, 12, 11.5, 10.5),
    date: adaptFont(width, 14, 12, 11.2),
    duration: adaptFont(width, 14, 12.5, 11.5),
    status: adaptFont(width, 11, 10.5, 9.5),
    price: adaptFont(width, compact ? 18 : 22, compact ? 14.5 : 14, compact ? 13.5 : 12.5),
    finishPayment: adaptFont(width, 11, 10.5, 9.5)
  };

  const listing = reservation?.listing || {};
  const status = reservation?.status || '';

  const start = reservation?.startDate || reservation?.from || reservation?.start_date || reservation?.fromDate;
  const end = reservation?.endDate || reservation?.to || reservation?.end_date || reservation?.toDate;

  const imageUri =
  listing?.image ||
  listing?.car?.carImages?.find((i) => i?.is_primary && i?.image_url)?.image_url ||
  listing?.car?.carImages?.find((i) => i?.image_url)?.image_url ||
  listing?.car?.carImages?.find((i) => i?.isPrimary && i?.imageUrl)?.imageUrl ||
  listing?.car?.carImages?.find((i) => i?.imageUrl)?.imageUrl ||
  listing?.car?.car_images?.find((i) => i?.is_primary && i?.image_url)?.image_url ||
  listing?.car?.car_images?.find((i) => i?.image_url)?.image_url ||
  listing?.car?.car_images?.find((i) => i?.isPrimary && i?.imageUrl)?.imageUrl ||
  listing?.car?.car_images?.find((i) => i?.imageUrl)?.imageUrl ||
  listing?.car?.images?.find((i) => i?.isPrimary && i?.imageUrl)?.imageUrl ||
  listing?.car?.images?.find((i) => i?.imageUrl)?.imageUrl ||
  listing?.imageUrl ||
  null;

  const handlePress = () => {
    if (onPress) return onPress(reservation);
    navigation.navigate(targetRoute, { reservation });
  };

  const handleFinishPaymentPress = () => {
    if (onFinishPayment) return onFinishPayment(reservation);
    handlePress();
  };

  // compute days (inclusive)
  let days = reservation?.days;
  try {
    if (!days && start && end) {
      const s = new Date(start);
      const e = new Date(end);
      const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
      days = Number.isFinite(diff) ? diff : undefined;
    }
  } catch (e) {}

  const statusColors = {
    reserved: '#edc13c', // jaune
    confirmed: '#6EC1FF', // light blue
    pickup_pending: '#FF8C00', // orange
    return_pending: '#FF8C00', // orange
    payment_pending: '#FF8C00', // (test/status-only)
    active: '#2ECC71', // green
    cancelled: '#FF4D4F', // red
    refunded: '#3895dc',
    refund_pending: '#FF8C00',
    finished: '#5e1b78' // dark purple
  };

  const badgeColor = statusColors[status] || '#6EC1FF';

  return (
    <TouchableOpacity style={[styles.card, compact && styles.compactCard, tightLayout && styles.tightCard]} activeOpacity={0.85} onPress={handlePress}>
      {/* Image */}
      <View style={[styles.imageWrapper, compact && styles.compactImageWrapper, tightLayout && styles.tightImageWrapper]}>
        {imageUri ?
        <Image
          source={{ uri: imageUri }}
          style={[styles.image, compact && styles.compactImage, tightLayout && styles.tightImage]}
          resizeMode="cover" /> :


        <View style={[styles.image, compact && styles.compactImage, tightLayout && styles.tightImage, styles.imagePlaceholder]}>
            <Ionicons name="car-sport-outline" size={36} color="rgba(255,255,255,0.8)" />
          </View>
        }
      </View>

      {/* Content Area */}
      <View style={[styles.contentWrapper, tightLayout && styles.tightContentWrapper]}>
        {/* Top: Car Name */}
        <View style={styles.titleSection}>
          <Text style={[styles.carName, { fontSize: fontSize.carName }]} numberOfLines={1}>{listing?.title || `${listing?.car?.brand || ''} ${listing?.car?.model || ''}`.trim() || 'Vehicle'}</Text>
          {listing?.city &&
          <View style={styles.cityContainer}>
              <Ionicons name="location-outline" size={12} color="#8b91ba" />
              <Text style={[styles.cityText, { fontSize: fontSize.city }]}>{listing.city}</Text>
            </View>
          }
        </View>

        {/* Middle: Dates */}
        <View style={[styles.dateSection, tightLayout && styles.tightDateSection]}>
          <Ionicons name="calendar-outline" size={14} color="#8b91ba" />
          {tightLayout ?
          <View style={styles.stackedDateText}>
              <Text style={[styles.dateText, styles.tightDateText, { fontSize: fontSize.date }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{formatSingleDate(start)} →</Text>
              <Text style={[styles.dateText, styles.tightDateText, { fontSize: fontSize.date }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{formatSingleDate(end)}</Text>
            </View> :

          <Text style={[styles.dateText, { fontSize: fontSize.date }]} numberOfLines={1}>{formatDateRange(start, end)}</Text>
          }
        </View>

        {/* Bottom: Duration */}
        <View style={styles.durationSection}>
          <Ionicons name="time-outline" size={14} color="#8b91ba" />
          <Text style={[styles.durationText, { fontSize: fontSize.duration }]}>{days ? `${days} days` : '—'}</Text>
        </View>
      </View>

      {/* Right Section: Status & Price */}
      <View style={[styles.rightSection, compact && styles.compactRightSection, tightLayout && styles.tightRightSection]}>
        <View style={[styles.statusBadge, tightLayout && styles.tightStatusBadge, { backgroundColor: badgeColor }]}> 
          <Text style={[styles.statusText, { fontSize: fontSize.status }]} numberOfLines={1}>
            {status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : 'Reserved'}
          </Text>
        </View>
        {showFinishPayment &&
        <TouchableOpacity style={[styles.finishPaymentButton, tightLayout && styles.tightFinishPaymentButton]} onPress={handleFinishPaymentPress}>
            <Text style={[styles.finishPaymentButtonText, { fontSize: fontSize.finishPayment }]} numberOfLines={1}>{t("components.cards.reservationcard.finishPayment")}

          </Text>
          </TouchableOpacity>
        }
        <Text style={[styles.price, compact && styles.compactPrice, { fontSize: fontSize.price }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {formatPrice(reservation?.totalPrice || listing?.pricePerDay || 0)}
        </Text>
      </View>
    </TouchableOpacity>);

};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111329',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(143, 150, 255, 0.15)',
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    overflow: 'hidden',
    justifyContent: 'space-between'
  },
  compactCard: {
    paddingVertical: 8,
    paddingHorizontal: 8
  },
  tightCard: {
    paddingVertical: 11,
    paddingHorizontal: 6
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 14
  },
  compactImageWrapper: {
    marginRight: 10
  },
  tightImageWrapper: {
    marginRight: 7
  },
  image: {
    width: 120,
    height: 95,
    borderRadius: 12,
    backgroundColor: '#1a1d2e'
  },
  compactImage: {
    width: 132,
    height: 104
  },
  tightImage: {
    width: 104,
    height: 92
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6C4DFF'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    marginBottom: 35,
    alignSelf: 'flex-end'
  },
  tightStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 22,
    maxWidth: 82
  },
  statusText: {
    color: '#fff',
    fontWeight: '700'
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    paddingRight: 8,
    minWidth: 0
  },
  tightContentWrapper: {
    paddingRight: 4
  },
  titleSection: {
    marginBottom: 6
  },
  carName: {
    color: '#F5F7FF',
    fontWeight: '700',
    maxWidth: '90%'
  },
  cityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4
  },
  cityText: {
    color: '#8b91ba',
    fontWeight: '400'
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'nowrap'
  },
  tightDateSection: {
    alignItems: 'flex-start',
    marginBottom: 6
  },
  stackedDateText: {
    flex: 1,
    marginLeft: 6,
    minWidth: 0
  },
  dateText: {
    color: '#8b91ba',
    marginLeft: 6,
    fontWeight: '500',
    flexShrink: 1
  },
  tightDateText: {
    marginLeft: 0
  },
  durationSection: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  durationText: {
    color: '#8b91ba',
    marginLeft: 6,
    fontWeight: '500'
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    minWidth: 95,
    marginLeft: 10
  },
  compactRightSection: {
    minWidth: 74,
    marginLeft: 6
  },
  tightRightSection: {
    minWidth: 58,
    marginLeft: 4,
    flexShrink: 0
  },
  price: {
    color: '#0b63ff',
    fontWeight: '800',
    letterSpacing: -0.3
  },
  compactPrice: {
    letterSpacing: 0
  },
  finishPaymentButton: {
    backgroundColor: '#0b63ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10
  },
  tightFinishPaymentButton: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    maxWidth: 82
  },
  finishPaymentButtonText: {
    color: '#fff',
    fontWeight: '700'
  }
});

export default ReservationCard;