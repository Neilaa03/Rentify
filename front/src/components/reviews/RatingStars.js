import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const roundToHalf = (value) => Math.round(value * 2) / 2;

const RatingStars = ({ rating = 0, size = 16, color = '#F8B84E' }) => {
  const safe = clamp(roundToHalf(Number(rating) || 0), 0, 5);
  const full = Math.floor(safe);
  const hasHalf = safe - full >= 0.5;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, index) => {
        const starIndex = index + 1;
        const name =
          starIndex <= full ? 'star' : hasHalf && starIndex === full + 1 ? 'star-half' : 'star-outline';
        return <Ionicons key={`star-${index}`} name={name} size={size} color={color} />;
      })}
    </View>
  );
};

export default RatingStars;
