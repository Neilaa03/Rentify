import React from 'react';
import { Image, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';import { useTranslation } from "react-i18next";
import { getCurrentLocale } from '../../i18n';
import { useTheme } from '../../contexts/ThemeContext';

const toneMap = {
  blue: { fg: '#4f8cff', bg: 'rgba(79,140,255,0.14)', border: 'rgba(79,140,255,0.35)' },
  purple: { fg: '#8f7dff', bg: 'rgba(143,125,255,0.14)', border: 'rgba(143,125,255,0.35)' },
  green: { fg: '#21d4a7', bg: 'rgba(33,212,167,0.14)', border: 'rgba(33,212,167,0.32)' },
  amber: { fg: '#ffb347', bg: 'rgba(255,179,71,0.14)', border: 'rgba(255,179,71,0.34)' },
  red: { fg: '#EB5757', bg: 'rgba(235,87,87,0.14)', border: 'rgba(235,87,87,0.34)' },
  neutral: { fg: '#cdd4ff', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.10)' }
};

export const tone = (key) => toneMap[key] || toneMap.neutral;

export const AgencyCard = ({ children, style, danger = false }) => {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surfaceStrong, borderColor: colors.border, shadowColor: colors.shadow }, danger && styles.cardDanger, style]}>{children}</View>;
};


export const SectionTitle = ({ kicker, title, subtitle, right, kickerStyle, titleStyle, subtitleStyle, style }) => {
  const { colors } = useTheme();
  return <View style={[styles.sectionHeader, style]}>
    <View style={styles.sectionTextBlock}>
      {kicker ? <Text style={[styles.kicker, { color: colors.primary }, kickerStyle]}>{kicker}</Text> : null}
      <Text style={[styles.sectionTitle, { color: colors.text }, titleStyle]}>{title}</Text>
      {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.textMuted }, subtitleStyle]}>{subtitle}</Text> : null}
    </View>
    {right ? <View style={styles.sectionAction}>{right}</View> : null}
  </View>;
};


export const Badge = ({ label, toneKey = 'neutral', icon, style, textStyle, fullWidth = false }) => {
  const c = tone(toneKey);
  return (
    <View style={[styles.badge, fullWidth && styles.badgeFullWidth, { backgroundColor: c.bg, borderColor: c.border }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={c.fg} style={{ marginRight: 6 }} /> : null}
      <Text numberOfLines={1} style={[styles.badgeText, { color: c.fg }, textStyle]}>{label}</Text>
    </View>);

};

export const MetricCard = ({ label, value, icon, toneKey = 'purple', subtitle }) => {
  const c = tone(toneKey);
  const { colors } = useTheme();
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
      <View style={styles.metricTopRow}>
        <View style={[styles.metricIcon, { backgroundColor: c.bg }]}>
          <Ionicons name={icon} size={15} color={c.fg} />
        </View>
        <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      </View>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
      {subtitle ? <Text style={[styles.metricSubtitle, { color: c.fg }]}>{subtitle}</Text> : null}
    </View>);

};

export const ProgressRow = ({ label, valueLabel, percent = 0, toneKey = 'purple' }) => {
  const c = tone(toneKey);
  return (
    <View style={styles.progressBlock}>
      <View style={styles.progressTopRow}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={[styles.progressValue, { color: c.fg }]}>{valueLabel}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(4, Math.min(100, percent))}%`, backgroundColor: c.fg }]} />
      </View>
    </View>);

};

export const TogglePill = ({ value, onValueChange, disabled = false }) =>
{
  const { colors } = useTheme();
  return <View style={styles.toggleWrap}>
    <Text style={[styles.toggleLabel, { color: colors.textMuted }, disabled && { color: colors.warning }]}>{disabled ? 'Docs manquants' : value ? 'Visible' : 'Masqué'}</Text>
    <Switch
    value={value}
    onValueChange={onValueChange}
    disabled={disabled}
    trackColor={{ false: colors.border, true: colors.primary }}
    thumbColor={value ? colors.white : colors.textMuted} />
  
  </View>;
};


export const PillRow = ({ items, activeKey, onSelect }) =>
{
  const { colors } = useTheme();
  return <View style={styles.pillRow}>
    {items.map((item) => {
    const active = activeKey === item.key;
    return (
      <TouchableOpacity
        key={item.key}
        style={[
          styles.pill,
          { backgroundColor: colors.surfaceStrong, borderColor: colors.border },
          active && { backgroundColor: colors.surface, borderColor: colors.primary }
        ]}
        onPress={() => onSelect(item.key)}>
        
          <Text style={[styles.pillText, { color: colors.textMuted }, active && { color: colors.text, fontWeight: '900' }]}>{item.label}</Text>
        </TouchableOpacity>);

  })}
  </View>;
};


export const VehicleCard = ({ item, onToggleVisibility, onEdit }) => {const { t } = useTranslation();
  const { colors } = useTheme();
  const rejected = item.documentStatus === 'DOCS_REJECTED';
  const onlineTone = item.status === 'RENTED' ? 'amber' : item.status === 'HIDDEN' ? 'amber' : 'green';
  const statusLabel = item.status === 'RENTED' ?
  'En location' :
  item.status === 'HIDDEN' ?
  'Non publié' : t("screens.owner.dashboardscreen.disponible");

  const docTone = item.documentStatus === 'DOCS_OK' ? 'green' : item.documentStatus === 'DOCS_REJECTED' ? 'red' : 'amber';

  return (
    <View style={[styles.vehicleCard, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }, rejected && styles.vehicleCardRejected]}>
      {item.imageUrl ?
      <Image source={{ uri: item.imageUrl }} style={styles.vehicleImage} /> :

      <View style={[styles.vehicleImage, styles.vehicleImageFallback]}>
          <Ionicons name="car-sport-outline" size={28} color={colors.textMuted} />
        </View>
      }

      <View style={[styles.vehicleOverlayRow, rejected && styles.vehicleOverlayRowLower]}>
        <Badge
          label={statusLabel}
          toneKey={onlineTone}
          icon={item.status === 'RENTED' ?
          'time-outline' :
          item.status === 'HIDDEN' ?
          'eye-off-outline' :
          'checkmark-circle-outline'} />
        
        <Badge
          label={item.documentStatus === 'DOCS_OK' ? 'Docs OK' : item.documentStatus === 'DOCS_REJECTED' ? t("components.agency.agencyprimitives.docsRejetes") : t("screens.admin.admindashboardscreen.docsEnAttente")}
          toneKey={docTone}
          icon={item.documentStatus === 'DOCS_OK' ? 'checkmark-circle-outline' : item.documentStatus === 'DOCS_REJECTED' ? 'warning-outline' : 'time-outline'} />
        
      </View>

      {rejected ?
      <View style={styles.rejectedBanner}>
          <Ionicons name="warning" size={13} color={colors.white} />
          <Text style={styles.rejectedBannerText}>{t("components.agency.agencyprimitives.docsRejetes")}</Text>
        </View> :
      null}

      <View style={styles.vehicleBody}>
        <View style={styles.vehicleHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.vehicleTitle, { color: colors.text }]}>{item.brand} {item.model}</Text>
            <Text style={[styles.vehicleSubtitle, { color: colors.textMuted }]}>{item.year || '—'} · {item.transmission || '—'} · {item.seats || '—'}{t("components.agency.agencyprimitives.places")}</Text>
          </View>
          <Text style={[styles.vehiclePrice, { color: colors.primary }]}>{Number(item.listing?.pricePerDay || item.pricePerDay || 0).toLocaleString(getCurrentLocale())}{t("components.agency.agencyprimitives.daJ")}</Text>
        </View>

        <View style={styles.vehicleStatsRow}>
          <Text style={styles.vehicleStat}>📅 {Number(item.totalReservations || 0)}</Text>
          <Text style={styles.vehicleStat}>⭐ {Number(item.averageRating || 0).toFixed(1)}</Text>
          <Text style={styles.vehicleStat}>👁 {Number(item.favoritesCount || 0) * 20 + Number(item.totalReservations || 0) * 5}</Text>
        </View>

        {rejected ?
        <View style={styles.alertRow}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
          <Text style={[styles.alertText, { color: colors.danger }]}>{t("components.agency.agencyprimitives.documentsRejetesActionRequise")}</Text>
        </View> :
        null}

        <View style={styles.vehicleActions}>
          <TogglePill
            value={Boolean(item.visibleByTenants)}
            onValueChange={() => onToggleVisibility(item)}
            disabled={item.canToggleVisibility === false} />
          
          <TouchableOpacity style={[styles.editButton, { backgroundColor: colors.primary }]} onPress={() => onEdit(item)}>
            <Ionicons name="pencil-outline" size={16} color={colors.white} />
            <Text style={[styles.editButtonText, { color: colors.white }]}>{t("components.agency.agencyprimitives.modifier")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>);

};

export const RequestRow = ({ item }) => {const { t } = useTranslation();
  const { colors } = useTheme();
  const statusTone = item.status === 'PENDING' ? 'amber' : item.status === 'APPROVED' ? 'green' : 'red';
  const statusLabel = item.statusLabel || (item.status === 'PENDING' ? t("screens.admin.admincarsscreen.enAttente") : item.status === 'APPROVED' ? 'Approuvée' : 'Refusée');
  const renterFirst = item.renter?.firstName || item.renterName?.split(' ')?.[0] || t("screens.auth.registerscreen.client");
  const renterLast = item.renter?.lastName || item.renterName?.split(' ')?.slice(1).join(' ') || '';
  const initials = `${renterFirst?.[0] || 'C'}${renterLast?.[0] || ''}`.toUpperCase();
  const vehicleLabel = item.vehicle?.brand ? `${item.vehicle.brand} ${item.vehicle.model || ''}`.trim() : item.vehicleName || 'Véhicule';

  return (
    <View style={[styles.requestRow, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }, item.status === 'PENDING' && styles.requestRowPending]}>
      <View style={styles.requestAvatar}>
        <Text style={[styles.requestAvatarText, { color: colors.white }]}>{initials}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.requestTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.requestName, { color: colors.text }]}>{renterFirst} {renterLast}</Text>
            <Text style={[styles.requestMeta, { color: colors.textMuted }]}>{Number(item.renter?.rating || item.rating || 0).toFixed(1)}{t("components.agency.agencyprimitives.text5")}{vehicleLabel}</Text>
          </View>
          <Text style={[styles.requestPrice, { color: colors.primary }]}>{Number(item.totalPrice || 0).toLocaleString(getCurrentLocale())}{t("components.agency.agencyprimitives.da")}</Text>
        </View>
        <Text style={[styles.requestDates, { color: colors.textMuted }]}>{item.startDate} → {item.endDate}</Text>
      </View>

      <Badge label={statusLabel} toneKey={statusTone} />
    </View>);

};

export const DocumentRow = ({ item }) => {const { t } = useTranslation();
  const { colors } = useTheme();
  const toneKey = item.status === 'VERIFIED' ? 'green' : item.status === 'REJECTED' ? 'red' : 'amber';
  const label = item.status === 'VERIFIED' ? t("screens.agency.agencydocumentsscreen.verifie") : item.status === 'REJECTED' ? t("screens.agency.agencydocumentsscreen.rejete") : t("screens.admin.admincarsscreen.enAttente");
  return (
    <View style={[styles.docRow, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.docTitle, { color: colors.text }]}>{item.documentTypeLabel}</Text>
        <Text style={[styles.docSub, { color: colors.textMuted }]}>{item.ownerLabel || 'Agence'}</Text>
      </View>
      <Badge
        label={label}
        toneKey={toneKey}
        icon={item.status === 'VERIFIED' ? 'checkmark-circle-outline' : item.status === 'REJECTED' ? 'close-circle-outline' : 'time-outline'} />
      
    </View>);

};

export const CompanyMetaItem = ({ label, value }) =>
<View style={styles.metaItem}>
    <Text style={styles.metaLabel}>{label}</Text>
    <Text style={styles.metaValue}>{value || '—'}</Text>
  </View>;


const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    backgroundColor: 'rgba(21,23,58,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }
  },
  cardDanger: {
    borderColor: 'rgba(235,87,87,0.55)',
    shadowColor: '#EB5757'
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12
  },
  sectionTextBlock: {
    flex: 1,
    minWidth: 0
  },
  sectionAction: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    maxWidth: '42%'
  },
  kicker: {
    color: '#8E95BF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 4
  },
  sectionTitle: {
    color: '#F6F8FF',
    fontSize: 22,
    fontWeight: '800'
  },
  sectionSubtitle: {
    color: '#8E95BF',
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18
  },
  badge: {
    flexShrink: 1,
    flexGrow: 0,
    flexBasis: 'auto',
    minWidth: 120,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeFullWidth: {
    width: '100%',
    alignSelf: 'stretch'
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    flexShrink: 1
  },
  metricCard: {
    width: '47.2%',
    minHeight: 88,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(21,23,58,0.9)',
    borderWidth: 1,
    marginBottom: 8
  },
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 28
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  metricValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    flexShrink: 1
  },
  metricLabel: {
    color: '#97A0C7',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '700'
  },
  metricSubtitle: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: '800'
  },
  progressBlock: {
    marginBottom: 14
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  progressLabel: {
    color: '#E9EDFF',
    fontWeight: '700'
  },
  progressValue: {
    fontWeight: '900'
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden'
  },
  fill: {
    height: '100%',
    borderRadius: 999
  },
  toggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4
  },
  toggleLabel: {
    color: '#C4CCE8',
    fontWeight: '800',
    fontSize: 12
  },
  toggleLabelDisabled: {
    color: '#FFB347'
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  pillActive: {
    backgroundColor: 'rgba(124,77,255,0.23)',
    borderColor: 'rgba(124,77,255,0.45)'
  },
  pillText: {
    color: '#97A0C7',
    fontWeight: '800',
    fontSize: 12
  },
  pillTextActive: {
    color: '#fff'
  },
  vehicleCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(21,23,58,0.9)',
    marginBottom: 14
  },
  vehicleCardRejected: {
    borderColor: 'rgba(255,23,68,0.95)'
  },
  vehicleImage: {
    width: '100%',
    height: 188,
    backgroundColor: '#151827'
  },
  vehicleImageFallback: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  vehicleOverlayRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 12,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  vehicleOverlayRowLower: {
    top: 52
  },
  rejectedBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 12,
    backgroundColor: '#FF1744',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center'
  },
  rejectedBannerText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 11
  },
  vehicleBody: {
    padding: 14
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  vehicleTitle: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '900'
  },
  vehicleSubtitle: {
    color: '#97A0C7',
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600'
  },
  vehiclePrice: {
    color: '#cfd7ff',
    fontWeight: '900',
    fontSize: 15
  },
  vehicleStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap'
  },
  vehicleStat: {
    color: '#BFC8EC',
    fontWeight: '800',
    fontSize: 12
  },
  alertRow: {
    marginTop: 12,
    backgroundColor: 'rgba(255,23,68,0.10)',
    borderColor: 'rgba(255,23,68,0.28)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  alertText: {
    color: '#FF8FA3',
    fontWeight: '800',
    fontSize: 12
  },
  vehicleActions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(41,121,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12
  },
  requestRow: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10
  },
  requestRowPending: {
    backgroundColor: 'rgba(255,145,0,0.10)',
    borderColor: 'rgba(255,145,0,0.28)',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9100'
  },
  requestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(124,77,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  requestAvatarText: {
    color: '#fff',
    fontWeight: '900'
  },
  requestTop: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  requestName: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15
  },
  requestMeta: {
    color: '#97A0C7',
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700'
  },
  requestPrice: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15
  },
  requestDates: {
    color: '#B6BEDB',
    marginTop: 6,
    fontStyle: 'italic',
    fontSize: 12,
    fontWeight: '600'
  },
  docRow: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12
  },
  docTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14
  },
  docSub: {
    color: '#97A0C7',
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700'
  },
  metaItem: {
    width: '48.4%',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    marginBottom: 10
  },
  metaLabel: {
    color: '#97A0C7',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase'
  },
  metaValue: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
    marginTop: 7,
    lineHeight: 18
  }
});
