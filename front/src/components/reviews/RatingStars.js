import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const RatingStars = ({ rating = 0, size = 16, color = '#F8B84E' }) => {
  const safe = clamp(Math.round(Number(rating) || 0), 0, 5);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Ionicons
          key={`star-${index}`}
          name={index < safe ? 'star' : 'star-outline'}
          size={size}
          color={color}
        />
      ))}
    </View>
  );
};

export default RatingStars;

