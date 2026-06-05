import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { appFont } from '../../utils/responsive';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';

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

export const ScreenHeader = ({ kicker, title, rightAction }) => (
  <HeaderInner kicker={kicker} title={title} rightAction={rightAction} />
);

const HeaderInner = ({ kicker, title, rightAction }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.header, rightAction ? styles.headerWithAction : null]}>
      <View style={styles.headerTextWrap}>
        {!!kicker && <Text style={[styles.kicker, { color: colors.primary }]}>{kicker}</Text>}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>
      {!!rightAction && <View style={styles.headerActionWrap}>{rightAction}</View>}
    </View>
  );
};

export const AdminLogoutButton = ({ navigation, tint = ADMIN_COLORS.danger }) => {
  const { clearSession } = useAuth();
  const { t } = useTranslation();
  const { colors } = useTheme();

  const handleLogout = async () => {
    try {
      await clearSession();
    } finally {
      navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
    }
  };

  return (
    <TouchableOpacity
      onPress={handleLogout}
      style={[styles.logoutButton, { backgroundColor: `${colors.danger}14`, borderColor: `${colors.danger}2A` }]}
      accessibilityRole="button"
      accessibilityLabel={t('components.admin.adminui.seDeconnecter')}
    >
      <Ionicons name="log-out-outline" size={20} color={tint} />
    </TouchableOpacity>
  );
};

export const Card = ({ children }) => {
  const { colors } = useTheme();
  return <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surfaceStrong }]}>{children}</View>;
};

export const SearchBox = ({ value, onChangeText, placeholder = 'Search' }) => {
  const { colors } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceStrong, color: colors.text }]}
    />
  );
};

export const Button = ({ label, onPress, type = 'primary' }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.btn,
        type === 'danger' && { backgroundColor: `${colors.danger}22` },
        type === 'ghost' && { backgroundColor: colors.surface },
        type === 'primary' && { backgroundColor: colors.primary },
      ]}
    >
      <Text style={styles.btnText}>{label}</Text>
    </TouchableOpacity>
  );
};

export const StatusBadge = ({ status }) => {
  const s = String(status || '').toLowerCase();
  const tone = s.includes('fail') || s.includes('reject') || s.includes('cancel') ? 'danger' : s.includes('pending') || s.includes('reserved') ? 'warning' : s.includes('approved') || s.includes('confirm') || s.includes('paid') || s.includes('complete') ? 'success' : 'muted';
  const map = { success: ADMIN_COLORS.success, danger: ADMIN_COLORS.danger, warning: ADMIN_COLORS.warning, muted: '#9ea4cf' };
  return (
    <View style={[styles.badge, { backgroundColor: `${map[tone]}22`, borderColor: `${map[tone]}33` }]}>
      <Text style={[styles.badgeText, { color: map[tone] }]}>{status}</Text>
    </View>
  );
};

export const StatCard = ({ label, value }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.statCard, { borderColor: colors.border, backgroundColor: colors.surfaceStrong }]}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
};

export const Row = ({ title, subtitle, right }) => {
  const { colors } = useTheme();
  return (
  <View style={[styles.row, { borderBottomColor: colors.border }]}>
    <View style={{ flex: 1, paddingRight: 10 }}>
      <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
      {!!subtitle && <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
    </View>
    {right}
  </View>
  );
};

const styles = StyleSheet.create({
  header: { marginTop: 6, marginBottom: 14 },
  headerWithAction: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerTextWrap: { flex: 1, paddingRight: 12 },
  headerActionWrap: { paddingTop: 6 },
  kicker: { fontSize: appFont(12), letterSpacing: 1.1, fontWeight: '700' },
  title: { fontSize: appFont(28, 30), fontWeight: '800', marginTop: 6 },
  logoutButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  card: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, minHeight: 32, marginBottom: 5 },
  btn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, alignSelf: 'flex-start', marginRight: 8 },
  btnGhost: {},
  btnDanger: {},
  btnText: { color: '#fff', fontWeight: '700', fontSize: appFont(12) },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  badgeText: { textTransform: 'capitalize', fontWeight: '700', fontSize: appFont(12) },
  statCard: { width: '48%', borderRadius: 14, borderWidth: 1, padding: 10, marginBottom: 10 },
  statValue: { fontSize: appFont(21, 23), fontWeight: '800' },
  statLabel: { marginTop: 3, fontSize: appFont(12) },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, paddingVertical: 10 },
  rowTitle: { fontWeight: '700', fontSize: appFont(14) },
  rowSubtitle: { marginTop: 2, fontSize: appFont(12) },
});
