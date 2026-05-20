import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const formatPrice = (value) => `${(value || 0).toLocaleString('fr-FR')} DA`;

const formatDateRange = (from, to) => {
  try {
    const f = new Date(from);
    const t = new Date(to);
    const opts = { year: 'numeric', month: 'short', day: 'numeric' };
    return `${f.toLocaleDateString('en-US', opts)} → ${t.toLocaleDateString('en-US', opts)}`;
  } catch (e) {
    return '';
  }
};

const ReservationCard = ({
  reservation,
  targetRoute = 'ReservationDetails',
  onPress,
  showFinishPayment = false,
  onFinishPayment,
}) => {
  const navigation = useNavigation();

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
    confirmed: '#22c55e',
    cancelled: '#EB5757',
    reserved: '#6C4DFF',
    pickup_pending: '#FFA500',
    refunded: '#9CA3AF',
    refund_pending: '#F59E0B',
  };

  const badgeColor = statusColors[status] || '#6C4DFF';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={handlePress}>
      {/* Image */}
      <View style={styles.imageWrapper}>
        {imageUri ? (
          <Image 
            source={{ uri: imageUri }} 
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="car-sport-outline" size={36} color="rgba(255,255,255,0.8)" />
          </View>
        )}
      </View>

      {/* Content Area */}
      <View style={styles.contentWrapper}>
        {/* Top: Car Name */}
        <View style={styles.titleSection}>
          <Text style={styles.carName}>{listing?.title || `${listing?.car?.brand || ''} ${listing?.car?.model || ''}`.trim() || 'Vehicle'}</Text>
          {listing?.city && (
            <View style={styles.cityContainer}>
              <Ionicons name="location-outline" size={12} color="#8b91ba" />
              <Text style={styles.cityText}>{listing.city}</Text>
            </View>
          )}
        </View>

        {/* Middle: Dates */}
        <View style={styles.dateSection}>
          <Ionicons name="calendar-outline" size={14} color="#8b91ba" />
          <Text style={styles.dateText} numberOfLines={1}>{formatDateRange(start, end)}</Text>
        </View>

        {/* Bottom: Duration */}
        <View style={styles.durationSection}>
          <Ionicons name="time-outline" size={14} color="#8b91ba" />
          <Text style={styles.durationText}>{days ? `${days} days` : '—'}</Text>
        </View>
      </View>

      {/* Right Section: Status & Price */}
      <View style={styles.rightSection}>
        <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}> 
          <Text style={styles.statusText}>{status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : 'Reserved'}</Text>
        </View>
        {showFinishPayment && (
          <TouchableOpacity style={styles.finishPaymentButton} onPress={handleFinishPaymentPress}>
            <Text style={styles.finishPaymentButtonText}>Finish payment</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.price}>{formatPrice(reservation?.totalPrice || listing?.pricePerDay || 0)}</Text>
      </View>
    </TouchableOpacity>
  );
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
    justifyContent: 'space-between',
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  image: {
    width: 120,
    height: 95,
    borderRadius: 12,
    backgroundColor: '#1a1d2e',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6C4DFF',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    marginBottom: 35,
    alignSelf: 'flex-end',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  titleSection: {
    marginBottom: 6,
  },
  carName: {
    color: '#F5F7FF',
    fontSize: 16,
    fontWeight: '700',
    maxWidth: '90%',
  },
  cityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  cityText: {
    color: '#8b91ba',
    fontSize: 12,
    fontWeight: '400',
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'nowrap',
  },
  dateText: {
    color: '#8b91ba',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
    flexShrink: 1,
  },
  durationSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    color: '#8b91ba',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    minWidth: 95,
    marginLeft: 10,
  },
  price: {
    color: '#0b63ff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  finishPaymentButton: {
    backgroundColor: '#0b63ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  finishPaymentButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default ReservationCard;
