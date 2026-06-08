import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AgencyBottomNavigation from '../../components/navigation/AgencyBottomNavigation';
import { AgencyCard, Badge, SectionTitle } from '../../components/agency/AgencyPrimitives';
import AppBackground from '../../components/layout/AppBackground';
import { API_ENDPOINTS } from '../../constants/api';
import { getAgencyProfile } from '../../services/agency';
import { getFriendlyError } from '../../utils/friendlyError';
import storage from '../../utils/storage';
import { getLanguageMeta, setAppLanguage, supportedLanguages } from '../../i18n';
import { useTheme, THEME_MODES } from '../../contexts/ThemeContext';

const SettingRow = ({ icon, label, value, subtitle, onPress, destructive = false }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.settingRow, destructive && styles.settingRowDestructive]}
      onPress={onPress}
      activeOpacity={0.86}
      disabled={!onPress}
    >
      <View style={styles.settingRowLeft}>
        <View style={[styles.settingIconWrap, { backgroundColor: colors.surface }]}>
          <Ionicons name={icon} size={18} color={destructive ? colors.danger : colors.primary} />
        </View>
        <View style={styles.settingTextWrap}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
          {subtitle ? <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.settingRowRight}>
        {value ? <Text style={[styles.settingValue, { color: colors.textMuted }]} numberOfLines={1}>{value}</Text> : null}
        {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
      </View>
    </TouchableOpacity>
  );
};

const DetailItem = ({ icon, label, value }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.detailItem}>
      <View style={[styles.detailIconWrap, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.detailTextWrap}>
        <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>
          {value || '-'}
        </Text>
      </View>
    </View>
  );
};

const SettingsModal = ({ visible, title, subtitle, onClose, children }) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.modalBackdrop }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.modalSheet, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
              {subtitle ? <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity style={[styles.modalCloseButton, { backgroundColor: colors.surface }]} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const OptionRow = ({ icon, label, subtitle, active, onPress, activeTone = 'primary' }) => {
  const { colors } = useTheme();
  const borderColor = active ? colors.primary : colors.border;
  const backgroundColor = active ? colors.surface : colors.surfaceStrong;

  return (
    <TouchableOpacity
      style={[styles.optionRow, { backgroundColor, borderColor }]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View style={[styles.optionBadge, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={16} color={active ? colors.primary : colors.textMuted} />
      </View>
      <View style={styles.optionTextWrap}>
        <Text style={[styles.optionLabel, { color: colors.text }]}>{label}</Text>
        {subtitle ? <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      </View>
      <Ionicons
        name={active ? 'checkmark-circle' : 'ellipse-outline'}
        size={20}
        color={active ? colors[activeTone] || colors.primary : colors.textMuted}
      />
    </TouchableOpacity>
  );
};

export default function AgencyProfileScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const { colors, mode, setThemeMode } = useTheme();
  const [token, setToken] = useState(route?.params?.token || '');
  const [state, setState] = useState({ loading: true, error: '', profile: route?.params?.user || null });
  const [activeModal, setActiveModal] = useState(null);
  const [changingLanguage, setChangingLanguage] = useState(false);
  const [changePasswordCurrent, setChangePasswordCurrent] = useState('');
  const [changePasswordNew, setChangePasswordNew] = useState('');
  const [changePasswordConfirm, setChangePasswordConfirm] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  const profile = state.profile || {};
  const isGoogleOnly = String(profile?.auth_provider || profile?.authProvider || '').toLowerCase() === 'google';
  const currentLanguage = useMemo(() => getLanguageMeta(i18n.language), [i18n.language]);

  const currentThemeLabel = useMemo(() => {
    if (mode === THEME_MODES.LIGHT) return t('screens.agency.agencyprofilescreen.clair');
    if (mode === THEME_MODES.DARK) return t('screens.agency.agencyprofilescreen.sombre');
    return t('screens.agency.agencyprofilescreen.systeme');
  }, [i18n.language, mode, t]);

  const currentLanguageLabel = currentLanguage.nativeLabel || currentLanguage.label;
  const isVerified = profile?.verificationStatus === 'VERIFIED';

  const load = useCallback(async () => {
    try {
      const effectiveToken = route?.params?.token || token || (await storage.getItemAsync('userToken')) || '';
      if (!effectiveToken) {
        setState({ loading: false, error: t('common.errors.authRequired'), profile: route?.params?.user || null });
        return;
      }

      if (!token) setToken(effectiveToken);

      const response = await getAgencyProfile({ token: effectiveToken });
      const profileData = response?.agency || response || null;

      setState({
        loading: false,
        error: '',
        profile: profileData,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getFriendlyError(error, t),
      }));
    }
  }, [route?.params?.token, route?.params?.user, t]);

  useEffect(() => {
    load();
  }, [load]);

  const closeModal = () => {
    setActiveModal(null);
    setChangePasswordError('');
    setShowPasswordFields(false);
  };

  const onLeave = () => {
    Alert.alert(
      t('screens.agency.agencyprofilescreen.quitterLespaceAgence'),
      t('screens.agency.agencyprofilescreen.souhaitezVousRevenirALecranDeConnexion'),
      [
        { text: t('screens.agency.agencyprofilescreen.annuler'), style: 'cancel' },
        {
          text: t('screens.agency.agencyprofilescreen.quitterLespaceAgence'),
          style: 'destructive',
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }),
        },
      ]
    );
  };

  const openPasswordModal = () => {
    setChangePasswordError('');
    setChangePasswordCurrent('');
    setChangePasswordNew('');
    setChangePasswordConfirm('');
    setShowPasswordFields(false);
    setActiveModal('password');
  };

  const openThemeModal = () => setActiveModal('theme');
  const openLanguageModal = () => setActiveModal('language');

  const savePasswordChange = async () => {
    const effectiveToken = token || (await storage.getItemAsync('userToken')) || '';
    if (!effectiveToken) {
      setChangePasswordError(t('common.errors.authRequired'));
      return;
    }

    const nextCurrentPassword = changePasswordCurrent.trim();
    const nextNewPassword = changePasswordNew.trim();
    const nextConfirmPassword = changePasswordConfirm.trim();

    if (!isGoogleOnly && !nextCurrentPassword) {
      setChangePasswordError(t('screens.agency.agencyprofilescreen.motDePasseActuelRequis'));
      return;
    }
    if (nextNewPassword.length < 8) {
      setChangePasswordError(t('screens.agency.agencyprofilescreen.motDePasseMinCaracteres'));
      return;
    }
    if (nextNewPassword !== nextConfirmPassword) {
      setChangePasswordError(t('screens.agency.agencyprofilescreen.motsDePasseNonCorrespondent'));
      return;
    }

    try {
      setChangePasswordLoading(true);
      setChangePasswordError('');

      const response = await fetch(API_ENDPOINTS.PROFILE.ME_PASSWORD, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${effectiveToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: isGoogleOnly ? '' : nextCurrentPassword,
          newPassword: nextNewPassword,
          confirmPassword: nextConfirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || t('common.errors.password'));
      }

      closeModal();
      Alert.alert(t('screens.agency.agencyprofilescreen.succes'), t('screens.agency.agencyprofilescreen.motDePasseMisAJour'));
    } catch (error) {
      setChangePasswordError(error.message || t('common.errors.password'));
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleThemeChange = async (nextMode) => {
    try {
      await setThemeMode(nextMode);
      closeModal();
    } catch {
      Alert.alert(t('screens.agency.agencyprofilescreen.erreur'), t('common.errors.generic'));
    }
  };

  const handleLanguageChange = async (language) => {
    if (!language || language === currentLanguage.code || changingLanguage) return;
    try {
      setChangingLanguage(true);
      await setAppLanguage(language);
      closeModal();
    } catch {
      Alert.alert(t('screens.agency.agencyprofilescreen.erreur'), t('common.errors.languageChange'));
    } finally {
      setChangingLanguage(false);
    }
  };

  const verificationLabel = isVerified
    ? t('screens.agency.agencyprofilescreen.agenceVerifiee')
    : t('screens.agency.agencydashboardscreen.enAttenteDeVerification');

  const verificationTone = isVerified ? 'green' : 'amber';
  const verificationIcon = isVerified ? 'checkmark-circle-outline' : 'time-outline';

  const profileSections = [
    {
      title: t('screens.agency.agencyprofilescreen.informationsCommerciales'),
      subtitle: t('screens.agency.agencyprofilescreen.raisonSocialeEtIdentifiants'),
      icon: 'business-outline',
      items: [
        { icon: 'storefront-outline', label: t('screens.agency.agencyprofilescreen.nomCommercial'), value: profile?.commercialName || profile?.commercial_name },
        { icon: 'document-text-outline', label: t('screens.agency.agencyprofilescreen.raisonSociale'), value: profile?.corporateName || profile?.corporate_name },
      ],
    },
    {
      title: t('screens.agency.agencyprofilescreen.informationsLegales'),
      subtitle: t('screens.agency.agencyprofilescreen.enregistrementEtVerification'),
      icon: 'shield-checkmark-outline',
      items: [
        { icon: 'receipt-outline', label: t('screens.agency.agencyprofilescreen.registreDeCommerce'), value: profile?.registrationNumber || profile?.registration_number },
        { icon: 'card-outline', label: t('screens.agency.agencyprofilescreen.numeroNif'), value: profile?.nif || '-' },
      ],
    },
    {
      title: t('screens.agency.agencyprofilescreen.responsableDeLagence'),
      subtitle: t('screens.agency.agencyprofilescreen.contactDuGerant'),
      icon: 'person-outline',
      items: [
        { icon: 'person-circle-outline', label: t('screens.agency.agencyprofilescreen.nomDuGerant'), value: profile?.managerName || profile?.manager_name },
        { icon: 'call-outline', label: t('screens.agency.agencyprofilescreen.telephone'), value: profile?.managerPhone || profile?.manager_phone || '-' },
      ],
    },
  ];

  const themeOptions = [
    { key: THEME_MODES.SYSTEM, label: t('screens.agency.agencyprofilescreen.systeme'), subtitle: t('screens.agency.agencyprofilescreen.themeSystèmeDescription'), icon: 'phone-portrait-outline' },
    { key: THEME_MODES.LIGHT, label: t('screens.agency.agencyprofilescreen.clair'), subtitle: t('screens.agency.agencyprofilescreen.themeClairDescription'), icon: 'sunny-outline' },
    { key: THEME_MODES.DARK, label: t('screens.agency.agencyprofilescreen.sombre'), subtitle: t('screens.agency.agencyprofilescreen.themeSombreDescription'), icon: 'moon-outline' },
  ];

  return (
    <AppBackground contentStyle={styles.safeArea}>
      <StatusBar barStyle={colors.isDark ? 'light-content' : 'dark-content'} translucent backgroundColor={colors.background} />

      <View style={styles.page}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <SectionTitle
            kicker="AGENCE"
            title={t('screens.agency.agencyprofilescreen.profilVerification')}
            subtitle={t('screens.agency.agencyprofilescreen.informationsLegalesDocumentsEtGestion')}
            kickerStyle={{ color: colors.white }}
            titleStyle={{ color: colors.white }}
            subtitleStyle={{ color: 'rgba(255,255,255,0.82)' }}
            style={styles.headerTitle}
          />

          {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

          {state.loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <>
              <AgencyCard style={styles.profileSummaryCard}>
                <View style={styles.profileSummaryHeader}>
                  <View style={[styles.profileSummaryIcon, { backgroundColor: colors.surface }]}>
                    <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.profileSummaryText}>
                    <Text style={[styles.profileSummaryTitle, { color: colors.text }]} numberOfLines={1}>
                      {profile?.commercialName || profile?.commercial_name || t('screens.agency.agencyprofilescreen.nomCommercial')}
                    </Text>
                    <Text style={[styles.profileSummarySubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                      {profile?.corporateName || profile?.corporate_name || '-'}
                    </Text>
                  </View>
                  <Badge label={verificationLabel} toneKey={verificationTone} icon={verificationIcon} />
                </View>
              </AgencyCard>

              {profileSections.map((section) => (
                <AgencyCard key={section.title} style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIcon, { backgroundColor: colors.surface }]}>
                      <Ionicons name={section.icon} size={18} color={colors.primary} />
                    </View>
                    <View style={styles.sectionHeaderText}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                      <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{section.subtitle}</Text>
                    </View>
                  </View>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  {section.items.map((item, index) => (
                    <View key={item.label}>
                      <DetailItem icon={item.icon} label={item.label} value={item.value} />
                      {index !== section.items.length - 1 ? <View style={[styles.itemDivider, { backgroundColor: colors.border }]} /> : null}
                    </View>
                  ))}
                </AgencyCard>
              ))}

              <SectionTitle
                title={t('screens.agency.agencyprofilescreen.parametresDuCompte')}
                subtitle={t('screens.agency.agencyprofilescreen.gerezVotreMotDePasseVotreThemeEtVotreLangue')}
                titleStyle={{ color: colors.white }}
                subtitleStyle={{ color: 'rgba(255,255,255,0.74)' }}
                style={styles.sectionTitleSpacing}
              />

              <AgencyCard style={styles.sectionCard}>
                <SettingRow
                  icon="key-outline"
                  label={isGoogleOnly ? t('screens.agency.agencyprofilescreen.definirUnMotDePasse') : t('screens.agency.agencyprofilescreen.changerMotDePasse')}
                  value="••••••••"
                  onPress={openPasswordModal}
                />
                <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />
                <SettingRow
                  icon="moon-outline"
                  label={t('screens.agency.agencyprofilescreen.themeApplication')}
                  value={currentThemeLabel}
                  onPress={openThemeModal}
                />
                <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />
                <SettingRow
                  icon="globe-outline"
                  label={t('screens.agency.agencyprofilescreen.langueApplication')}
                  value={currentLanguageLabel}
                  onPress={openLanguageModal}
                />
              </AgencyCard>

              <TouchableOpacity
                style={[styles.primaryAction, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('AgencyDocuments', { token: route?.params?.token || token, user: route?.params?.user })}
              >
                <Ionicons name="document-attach-outline" size={18} color={colors.white} />
                <Text style={[styles.primaryActionText, { color: colors.white }]}>
                  {t('screens.agency.agencyprofilescreen.gererMesDocuments')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dangerAction} onPress={onLeave}>
                <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                <Text style={[styles.dangerActionText, { color: colors.danger }]}>
                  {t('screens.agency.agencyprofilescreen.quitterLespaceAgence')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        <AgencyBottomNavigation navigation={navigation} route={route} active="profile" />
      </View>

      <SettingsModal
        visible={activeModal === 'password'}
        title={t('screens.agency.agencyprofilescreen.changerMotDePasse')}
        subtitle={isGoogleOnly
          ? t('screens.agency.agencyprofilescreen.motDePasseGoogleDescription')
          : t('screens.agency.agencyprofilescreen.motDePasseDescription')}
        onClose={closeModal}
      >
        <Text style={[styles.modalBodyText, { color: colors.textMuted }]}>
          {isGoogleOnly
            ? t('screens.agency.agencyprofilescreen.motDePasseGoogleNote')
            : t('screens.agency.agencyprofilescreen.motDePasseClassicNote')}
        </Text>

        {!isGoogleOnly ? (
          <>
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('screens.agency.agencyprofilescreen.motDePasseActuel')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={changePasswordCurrent}
              onChangeText={setChangePasswordCurrent}
              secureTextEntry={!showPasswordFields}
              autoCapitalize="none"
              placeholder={t('screens.agency.agencyprofilescreen.motDePasseActuel')}
              placeholderTextColor={colors.textMuted}
            />
          </>
        ) : null}

        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('screens.agency.agencyprofilescreen.nouveauMotDePasse')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={changePasswordNew}
          onChangeText={setChangePasswordNew}
          secureTextEntry={!showPasswordFields}
          autoCapitalize="none"
          placeholder={t('screens.agency.agencyprofilescreen.nouveauMotDePasse')}
          placeholderTextColor={colors.textMuted}
        />

        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('screens.agency.agencyprofilescreen.confirmerMotDePasse')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={changePasswordConfirm}
          onChangeText={setChangePasswordConfirm}
          secureTextEntry={!showPasswordFields}
          autoCapitalize="none"
          placeholder={t('screens.agency.agencyprofilescreen.confirmerMotDePasse')}
          placeholderTextColor={colors.textMuted}
        />

        <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPasswordFields((value) => !value)}>
          <Ionicons name={showPasswordFields ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
          <Text style={[styles.eyeButtonText, { color: colors.textMuted }]}>
            {showPasswordFields ? t('screens.agency.agencyprofilescreen.masquer') : t('screens.agency.agencyprofilescreen.afficher')}
          </Text>
        </TouchableOpacity>

        {!!changePasswordError && <Text style={styles.errorInline}>{changePasswordError}</Text>}

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={closeModal}
            disabled={changePasswordLoading}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.textMuted }]}>{t('screens.agency.agencyprofilescreen.annuler')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={savePasswordChange}
            disabled={changePasswordLoading}
          >
            {changePasswordLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={[styles.primaryButtonText, { color: colors.white }]}>
                {t('screens.agency.agencyprofilescreen.enregistrer')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SettingsModal>

      <SettingsModal
        visible={activeModal === 'theme'}
        title={t('screens.agency.agencyprofilescreen.themeApplication')}
        subtitle={t('screens.agency.agencyprofilescreen.themeDescription')}
        onClose={closeModal}
      >
        {themeOptions.map((option) => (
          <OptionRow
            key={option.key}
            icon={option.icon}
            label={option.label}
            subtitle={option.subtitle}
            active={mode === option.key}
            onPress={() => handleThemeChange(option.key)}
          />
        ))}
      </SettingsModal>

      <SettingsModal
        visible={activeModal === 'language'}
        title={t('screens.agency.agencyprofilescreen.langueApplication')}
        subtitle={t('screens.agency.agencyprofilescreen.langueDescription')}
        onClose={closeModal}
      >
        {supportedLanguages.map((language) => (
          <OptionRow
            key={language.code}
            icon={language.dir === 'rtl' ? 'swap-horizontal-outline' : 'language-outline'}
            label={language.nativeLabel}
            subtitle={language.label}
            active={language.code === currentLanguage.code}
            onPress={() => handleLanguageChange(language.code)}
          />
        ))}
        {changingLanguage ? (
          <View style={styles.modalBusy}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null}
      </SettingsModal>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  content: { paddingBottom: 110 },
  headerTitle: { marginBottom: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 220 },
  error: { color: '#FF8FA3', marginBottom: 12, fontWeight: '700' },
  profileSummaryCard: { padding: 16, marginBottom: 14 },
  profileSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileSummaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSummaryText: { flex: 1, minWidth: 0 },
  profileSummaryTitle: { fontSize: 16, fontWeight: '900' },
  profileSummarySubtitle: { marginTop: 4, fontSize: 12.5, fontWeight: '600' },
  sectionCard: { padding: 14, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionHeaderText: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  sectionSubtitle: { fontSize: 12.5, marginTop: 2, lineHeight: 18 },
  divider: { height: 1, marginBottom: 4 },
  itemDivider: { height: 1, marginVertical: 4 },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  detailIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  detailTextWrap: { flex: 1, minWidth: 0 },
  detailLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  detailValue: { fontSize: 14, marginTop: 4, fontWeight: '700', lineHeight: 20 },
  sectionTitleSpacing: { marginTop: 4, marginBottom: 10 },
  settingRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  settingRowDestructive: { opacity: 1 },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, paddingRight: 8 },
  settingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  settingTextWrap: { flex: 1, minWidth: 0 },
  settingLabel: { fontSize: 13.5, fontWeight: '800' },
  settingSubtitle: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  settingRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  settingValue: { fontSize: 11.5, fontWeight: '800', maxWidth: 86 },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  primaryActionText: { fontSize: 14, fontWeight: '900' },
  dangerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginBottom: 10,
  },
  dangerActionText: { fontSize: 14, fontWeight: '900' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
  },
  modalHeader: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalHeaderText: { flex: 1, minWidth: 0 },
  modalTitle: { fontSize: 17, fontWeight: '900' },
  modalSubtitle: { fontSize: 12.5, marginTop: 4, lineHeight: 18 },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  modalBodyText: { fontSize: 13.5, lineHeight: 20, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '800', marginTop: 6, marginBottom: 6 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  eyeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  eyeButtonText: { fontSize: 12.5, fontWeight: '700' },
  errorInline: { color: '#FF8FA3', fontSize: 13, fontWeight: '700', marginTop: 2, marginBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '800' },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { fontSize: 14, fontWeight: '900' },
  optionRow: {
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextWrap: { flex: 1, minWidth: 0 },
  optionLabel: { fontSize: 14, fontWeight: '800' },
  optionSubtitle: { fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  modalBusy: { paddingTop: 4, alignItems: 'center' },
});
