import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getCurrentLocale } from '../../i18n';

const CustomCalendar = ({
  onDayPress,
  markedDates = {},
  minDate = null,
  maxDate = null,
  disabledDates = [],
  locale = getCurrentLocale(),
  startFromMonday = true,
}) => {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const activeLocale = locale || getCurrentLocale();

  const disabledDatesSet = useMemo(() => {
    if (!disabledDates) return new Set();
    if (disabledDates instanceof Set) return disabledDates;
    return new Set(disabledDates);
  }, [disabledDates]);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay(); // 0=Sun
    return startFromMonday ? (day + 6) % 7 : day;
  };

  const capitalize = (value) => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const formatDate = (year, monthIndex, day) => {
    const month2 = String(monthIndex + 1).padStart(2, '0');
    const day2 = String(day).padStart(2, '0');
    return `${year}-${month2}-${day2}`;
  };

  const isDisabled = (dateStr) => {
    if (!dateStr) return true;
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    if (disabledDatesSet.has(dateStr)) return true;
    if (markedDates?.[dateStr]?.disabled) return true;
    return false;
  };

  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const handlePreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const handleDayPress = (day) => {
    if (!day) return;

    const dateStr = formatDate(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );

    if (isDisabled(dateStr)) return;
    onDayPress({ dateString: dateStr });
  };

  const days = renderCalendarDays();
  const weekDays = t('common.calendar.weekdays', { returnObjects: true });
  const safeWeekDays = Array.isArray(weekDays) && weekDays.length === 7
    ? weekDays
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayLabels = startFromMonday
    ? safeWeekDays
    : [safeWeekDays[6], ...safeWeekDays.slice(0, 6)];

  const monthYearLabel = capitalize(
    currentDate.toLocaleDateString(activeLocale, { month: 'long', year: 'numeric' })
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.monthYear}>{monthYearLabel}</Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Day labels */}
      <View style={styles.weekLabels}>
        {dayLabels.map((label) => (
          <Text key={label} style={styles.dayLabel}>
            {label}
          </Text>
        ))}
      </View>

      {/* Days grid */}
      <View style={styles.daysGrid}>
        {days.map((day, index) => {
          const dateStr = day
            ? formatDate(currentDate.getFullYear(), currentDate.getMonth(), day)
            : null;
          const marking = dateStr ? markedDates?.[dateStr] : null;
          const disabled = dateStr ? isDisabled(dateStr) : true;
          const isSelected = Boolean(marking?.selected);
          const inRange = Boolean(marking?.inRange);
          const isStart = Boolean(marking?.startingDay);
          const isEnd = Boolean(marking?.endingDay);
          const showDot = Boolean(marking?.showDot);

          return (
            <TouchableOpacity
              key={index}
              disabled={!day || disabled}
              onPress={() => handleDayPress(day)}
              style={[
                styles.dayCell,
                day && !disabled && styles.dayButton,
                inRange && styles.dayInRange,
                isSelected && styles.daySelected,
                (isStart || isEnd) && styles.daySelected,
                disabled && styles.dayDisabled,
                isStart && styles.daySelectedStart,
                isEnd && styles.daySelectedEnd,
              ]}
            >
              {day && (
                <View style={styles.dayInner}>
                  <Text
                    style={[
                      styles.dayText,
                      disabled && styles.dayDisabledText,
                      (isSelected || inRange) && styles.daySelectedText,
                    ]}
                  >
                    {day}
                  </Text>
                  {showDot && !disabled && !isSelected && !inRange && (
                    <View style={styles.dayDot} />
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  monthYear: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  weekLabels: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 2,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
  },
  dayButton: {
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  dayDisabled: {
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dayDisabledText: {
    color: 'rgba(142, 149, 191, 0.55)',
  },
  daySelected: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
  },
  daySelectedText: {
    color: '#fff',
    fontWeight: '700',
  },
  dayInRange: {
    backgroundColor: 'rgba(138, 43, 226, 0.22)',
    borderRadius: 14,
  },
  daySelectedStart: {
    backgroundColor: COLORS.primary,
  },
  daySelectedEnd: {
    backgroundColor: COLORS.primary,
  },
  dayInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
});

export default CustomCalendar;
