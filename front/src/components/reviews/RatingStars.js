import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RatingStars = ({ rating = 0, size = 14, color = '#F8B84E', emptyColor = 'rgba(248,184,78,0.35)' }) => {
  const numericRating = Math.max(0, Math.min(5, Number(rating) || 0));

  return (
    <View style={styles.row}>
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const iconName = numericRating >= starValue
          ? 'star'
          : numericRating >= starValue - 0.5
            ? 'star-half'
            : 'star-outline';

        return (
          <Ionicons
            key={`rating-star-${starValue}`}
            name={iconName}
            size={size}
            color={iconName === 'star-outline' ? emptyColor : color}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});

export default RatingStars;
