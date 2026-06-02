import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import RatingStars from './RatingStars';
import { getCurrentLocale } from '../../i18n';

const ReviewCard = ({ review }) => {
  const { t, i18n } = useTranslation();
  const fullName = useMemo(() => {
    const firstName = review?.reviewer?.firstName || '';
    const lastName = review?.reviewer?.lastName || '';
    const name = `${firstName} ${lastName}`.trim();
    return name || t('common.unknownUser');
  }, [review, t]);

  const createdAt = useMemo(() => {
    const raw = review?.createdAt;
    if (!raw) return null;
    try {
      return new Date(raw).toLocaleDateString(getCurrentLocale(), { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (_e) {
      return null;
    }
  }, [review, i18n.language]);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{fullName}</Text>
          {createdAt ? <Text style={styles.date}>{createdAt}</Text> : null}
        </View>
        <RatingStars rating={review?.rating} />
      </View>
      {review?.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#151837',
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)',
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  name: {
    color: '#f6f8ff',
    fontSize: 14,
    fontWeight: '800',
  },
  date: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  comment: {
    color: '#cfd3ff',
    fontSize: 13,
    lineHeight: 18,
  },
});

export default ReviewCard;
