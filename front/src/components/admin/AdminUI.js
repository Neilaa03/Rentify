import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';

export const ADMIN_COLORS = {
  bg: '#0a0c24',
  panel: 'rgba(21,23,58,0.9)',
  border: 'rgba(146,151,214,0.2)',
  text: '#fff',
  muted: '#aab1dd',
  accent: '#8f7dff',
  success: '#21d4a7',
  danger: '#ff7f90',
  warning: '#ffb347',
};

export const ScreenHeader = ({ kicker, title }) => (
  <View style={styles.header}>
    {!!kicker && <Text style={styles.kicker}>{kicker}</Text>}
    <Text style={styles.title}>{title}</Text>
  </View>
);

export const Card = ({ children }) => <View style={styles.card}>{children}</View>;

export const SearchBox = ({ value, onChangeText, placeholder = 'Search' }) => (
  <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8890be" style={styles.input} />
);

export const Button = ({ label, onPress, type = 'primary' }) => (
  <TouchableOpacity onPress={onPress} style={[styles.btn, type === 'danger' && styles.btnDanger, type === 'ghost' && styles.btnGhost]}>
    <Text style={styles.btnText}>{label}</Text>
  </TouchableOpacity>
);

export const StatusBadge = ({ status }) => {
  const s = String(status || '').toLowerCase();
  const tone = s.includes('fail') || s.includes('reject') || s.includes('cancel') ? 'danger' : s.includes('pending') || s.includes('reserved') ? 'warning' : s.includes('approved') || s.includes('confirm') || s.includes('paid') || s.includes('complete') ? 'success' : 'muted';
  const map = { success: ADMIN_COLORS.success, danger: ADMIN_COLORS.danger, warning: ADMIN_COLORS.warning, muted: '#9ea4cf' };
  return (
    <View style={[styles.badge, { backgroundColor: `${map[tone]}22` }]}>
      <Text style={[styles.badgeText, { color: map[tone] }]}>{status}</Text>
    </View>
  );
};

export const StatCard = ({ label, value }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export const Row = ({ title, subtitle, right }) => (
  <View style={styles.row}>
    <View style={{ flex: 1, paddingRight: 10 }}>
      <Text style={styles.rowTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
    </View>
    {right}
  </View>
);

const styles = StyleSheet.create({
  header: { marginTop: 6, marginBottom: 14 },
  kicker: { color: '#8f7dff', fontSize: 12, letterSpacing: 1.1, fontWeight: '700' },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 6 },
  card: { borderRadius: 14, borderWidth: 1, borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.panel, padding: 12, marginBottom: 10 },
  input: { borderRadius: 12, borderWidth: 1, borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.panel, paddingHorizontal: 12, paddingVertical: 10, color: '#fff', marginBottom: 10 },
  btn: { borderRadius: 10, backgroundColor: ADMIN_COLORS.accent, paddingHorizontal: 12, paddingVertical: 9, alignSelf: 'flex-start', marginRight: 8 },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.08)' },
  btnDanger: { backgroundColor: 'rgba(255,127,144,0.25)' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { textTransform: 'capitalize', fontWeight: '700', fontSize: 12 },
  statCard: { width: '48%', borderRadius: 14, borderWidth: 1, borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.panel, padding: 10, marginBottom: 10 },
  statValue: { color: '#fff', fontSize: 21, fontWeight: '800' },
  statLabel: { color: '#bfc5e6', marginTop: 3, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(146,151,214,0.14)', paddingVertical: 10 },
  rowTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rowSubtitle: { color: '#9ea4cf', marginTop: 2, fontSize: 12 },
});
