import React from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const formatPrice = (value) => `${value.toLocaleString('fr-FR')} DA/j`;

const ListingCard = ({ listing, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={onPress}>
      <ImageBackground source={{ uri: listing.image }} style={styles.image} imageStyle={styles.imageRounded}>
        <View style={styles.imageTopRow}>
          {!listing.available && (
            <View style={styles.unavailableBadge}>
              <Text style={styles.unavailableText}>Indisponible</Text>
            </View>
          )}
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
            <Ionicons name="heart-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{formatPrice(listing.pricePerDay)}</Text>
        </View>
      </ImageBackground>

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
  image: {
    height: 190,
    justifyContent: 'space-between',
    padding: 12,
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
    fontSize: 29/2,
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

export default ListingCard;
