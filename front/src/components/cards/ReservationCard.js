import React from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const formatPrice = (value) => `${value.toLocaleString('fr-FR')} DA`;

const formatDateRange = (from, to) => {
  try {
    const f = new Date(from);
    const t = new Date(to);
    return `${f.toLocaleDateString('fr-FR')} — ${t.toLocaleDateString('fr-FR')}`;
  } catch (e) {
    return '';
  }
};

const ReservationCard = ({ reservation, targetRoute = 'ReservationDetailsFromList', onPress }) => {
  const navigation = useNavigation();

  const listing = reservation?.listing || {};
  const status = reservation?.status || '';

  const handlePress = () => {
    if (onPress) return onPress(reservation);
    navigation.navigate(targetRoute, { reservation });
  };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={handlePress}>
      <ImageBackground source={{ uri: listing.image }} style={styles.image} imageStyle={styles.imageRounded}>
        <View style={styles.imageTopRow}>
          <View style={[styles.statusBadge, status === 'cancelled' && styles.statusCancelled]}>
            <Text style={styles.statusText}>{status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Réservé'}</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
            <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{formatPrice(reservation?.totalPrice || listing?.pricePerDay || 0)}</Text>
        </View>
      </ImageBackground>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{`${listing.brand || ''} ${listing.model || ''}`.trim()}</Text>
          <View style={styles.ratingPill} />
        </View>

        <Text style={styles.subtitle}>{formatDateRange(reservation?.from, reservation?.to)}</Text>

        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Ionicons name="location-outline" size={14} color="#9aa0c8" />
            <Text style={styles.chipText}>{reservation?.city || listing?.city || ''}</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="calendar-outline" size={14} color="#9aa0c8" />
            <Text style={styles.chipText}>{reservation?.days ? `${reservation.days} jours` : ''}</Text>
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
  image: {
    height: 140,
    justifyContent: 'space-between',
    padding: 10,
  },
  imageRounded: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  imageTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(34,197,94,0.95)',
  },
  statusCancelled: {
    backgroundColor: '#EB5757',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
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
    fontSize: 14,
  },
  content: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    color: '#F5F7FF',
    fontSize: 29/2,
    fontWeight: '700',
    maxWidth: '76%',
  },
  ratingPill: {
    width: 0,
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
    fontSize: 12,
    marginLeft: 5,
  },
});

export default ReservationCard;
