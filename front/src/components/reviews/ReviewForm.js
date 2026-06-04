import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';import { useTranslation } from "react-i18next";
import { useTheme } from '../../contexts/ThemeContext';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const ReviewForm = ({ initialRating = 0, initialComment = '', onSubmit, submitting = false }) => {const { t } = useTranslation();
  const { colors } = useTheme();
  const [rating, setRating] = useState(clamp(Number(initialRating) || 0, 0, 5));
  const [comment, setComment] = useState(String(initialComment || ''));

  const canSubmit = useMemo(() => rating >= 1 && rating <= 5 && !submitting, [rating, submitting]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.text }]}>{t("components.reviews.reviewform.note")}</Text>
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
              disabled={submitting}>
              
              <Ionicons name={active ? 'star' : 'star-outline'} size={20} color="#F8B84E" />
            </TouchableOpacity>);

        })}
        <Text style={[styles.ratingText, { color: colors.textMuted }]}>{rating ? `${rating}/5` : '—'}</Text>
      </View>

      <Text style={[styles.label, { color: colors.text }]}>{t("components.reviews.reviewform.commentaireOptionnel")}</Text>
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder={t("components.reviews.reviewform.partagezVotreExperience")}
        placeholderTextColor={colors.textMuted}
        multiline
        editable={!submitting}
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} />
      

      <TouchableOpacity
        onPress={() => onSubmit?.({ rating, comment })}
        disabled={!canSubmit}
        activeOpacity={0.85}>
        
        <LinearGradient
          colors={canSubmit ? [COLORS.secondary, COLORS.primary] : [colors.textMuted, colors.icon]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}>
          
          {submitting ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={[styles.buttonText, { color: colors.white }]}>{t("components.reviews.reviewform.envoyer")}</Text>}
        </LinearGradient>
      </TouchableOpacity>
    </View>);

};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12
  },
  starHit: {
    padding: 2
  },
  ratingText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700'
  },
  input: {
    minHeight: 84,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 12,
    textAlignVertical: 'top'
  },
  button: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '900'
  }
});

export default ReviewForm;
