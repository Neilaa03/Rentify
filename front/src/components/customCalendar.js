import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CustomCalendar = ({
  onDayPress,
  markedDates = {},
  minDate = null,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (year, month, day) => {
    const d = new Date(year, month, day);
    const month2 = String(d.getMonth() + 1).padStart(2, '0');
    const day2 = String(d.getDate()).padStart(2, '0');
    return `${year}-${month2}-${day2}`;
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

    onDayPress({ dateString: dateStr });
  };

  const days = renderCalendarDays();
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
  const year = currentDate.getFullYear();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#a566ff" />
        </TouchableOpacity>
        <Text style={styles.monthYear}>
          {monthName} {year}
        </Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#a566ff" />
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
          const isMarked = dateStr && markedDates[dateStr];
          const isDisabled = dateStr && markedDates[dateStr]?.disabled;
          const isSelected = dateStr && markedDates[dateStr]?.selected;

          return (
            <TouchableOpacity
              key={index}
              disabled={!day || isDisabled}
              onPress={() => handleDayPress(day)}
              style={[
                styles.dayCell,
                day && !isDisabled && styles.dayButton,
                isSelected && styles.daySelected,
                isDisabled && styles.dayDisabled,
                isMarked && { backgroundColor: markedDates[dateStr].selectedColor },
              ]}
            >
              {day && (
                <Text
                  style={[
                    styles.dayText,
                    isDisabled && styles.dayDisabledText,
                    isSelected && styles.daySelectedText,
                  ]}
                >
                  {day}
                </Text>
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
    backgroundColor: '#151837',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthYear: {
    color: '#f6f8ff',
    fontSize: 16,
    fontWeight: '700',
  },
  weekLabels: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    color: '#8e95bf',
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButton: {
    cursor: 'pointer',
  },
  dayText: {
    color: '#e8ecff',
    fontSize: 14,
    fontWeight: '500',
  },
  dayDisabled: {
    backgroundColor: '#0f1228',
  },
  dayDisabledText: {
    color: '#8e95bf',
  },
  daySelected: {
    backgroundColor: '#a566ff',
    borderRadius: 8,
  },
  daySelectedText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default CustomCalendar;
