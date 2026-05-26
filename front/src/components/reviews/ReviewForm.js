import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
    import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const ReviewForm = ({ initialRating = 0, initialComment = '', onSubmit, submitting = false }) => {
  const [rating, setRating] = useState(clamp(Number(initialRating) || 0, 0, 5));
  const [comment, setComment] = useState(String(initialComment || ''));

  const canSubmit = useMemo(() => rating >= 1 && rating <= 5 && !submitting, [rating, submitting]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Note</Text>
      <View style={styles.starsRow}>
        {Array.from({ length: 5 }).map((_, index) => {
          const value = index + 1;
          const active = value <= rating;
          return (
            <TouchableOpacity
              key={`pick-${value}`}
              onPress={() => setRating(value)}
              activeOpacity={0.8}
              style={styles.starHit}
              disabled={submitting}
            >
              <Ionicons name={active ? 'star' : 'star-outline'} size={20} color="#F8B84E" />
            </TouchableOpacity>
          );
        })}
        <Text style={styles.ratingText}>{rating ? `${rating}/5` : '—'}</Text>
      </View>

      <Text style={styles.label}>Commentaire (optionnel)</Text>
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Partagez votre expérience…"
        placeholderTextColor="#7077a8"
        multiline
        editable={!submitting}
        style={styles.input}
      />

      <TouchableOpacity
        onPress={() => onSubmit?.({ rating, comment })}
        disabled={!canSubmit}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={canSubmit ? [COLORS.secondary, COLORS.primary] : ['#3a3f66', '#2b2f52']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Envoyer</Text>}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#151837',
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)',
  },
  label: {
    color: '#f6f8ff',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  starHit: {
    padding: 2,
  },
  ratingText: {
    marginLeft: 6,
    color: '#cfd3ff',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    minHeight: 84,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f6f8ff',
    backgroundColor: 'rgba(15, 18, 40, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.15)',
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  button: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});

export default ReviewForm;
