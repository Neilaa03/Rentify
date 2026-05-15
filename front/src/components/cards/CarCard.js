import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const CarCard = ({ car, onPress, onEdit, onDelete }) => {
  const primaryImage =
    car.images?.find((img) => img.isPrimary || img.is_primary) || car.images?.[0];
  const pricePerDay = car.pricePerDay ?? car.price_per_day;
  const imageUrl = primaryImage?.imageUrl || primaryImage?.image_url;
  const subtitleParts = [car.year, car.color, car.fuelType].filter(Boolean);

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.card}>
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: imageUrl || 'https://via.placeholder.com/540x280' }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>En ligne</Text>
        </View>
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
  image: {
    width: '100%',
    height: '100%',
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
