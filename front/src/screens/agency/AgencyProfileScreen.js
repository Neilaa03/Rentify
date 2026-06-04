import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ImageBackground, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AgencyBottomNavigation from '../../components/navigation/AgencyBottomNavigation';
import { AgencyCard, SectionTitle } from '../../components/agency/AgencyPrimitives';
import { getAgencyProfile } from '../../services/agency';import { useTranslation } from "react-i18next";
import { getFriendlyError } from '../../utils/friendlyError';
import { useTheme } from '../../contexts/ThemeContext';

export default function AgencyProfileScreen({ navigation, route }) {const { t } = useTranslation();
  const { colors } = useTheme();
  const token = route?.params?.token;
  const [state, setState] = useState({ loading: true, error: '', profile: null });
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  const load = useCallback(async () => {
    if (!token) {
      setState((prev) => ({ ...prev, loading: false, error: 'Session requise' }));
      return;
    }
    try {
      const profile = await getAgencyProfile({ token });
      const profileData = profile?.agency || profile || null;
      setState({
        loading: false,
        error: '',
        profile: profileData
      });
      setEditData(profileData || {});
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: getFriendlyError(error, t) }));
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const profile = state.profile || {};

  const onLeave = () => {
    Alert.alert(t("screens.agency.agencyprofilescreen.quitterLespaceAgence"), t("screens.agency.agencyprofilescreen.souhaitezVousRevenirALecranDeConnexion"),


    [
    { text: t("screens.agency.agencyprofilescreen.annuler"), style: 'cancel' },
    {
      text: 'Quitter',
      style: 'destructive',
      onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })
    }]

    );
  };

  const handleSaveChanges = async () => {
    // TODO: Implement API call to update profile
    setIsEditing(false);
    Alert.alert(t("screens.agency.agencyprofilescreen.succes"), t("screens.agency.agencyprofilescreen.modificationsEnregistreesAvecSucces"));
  };

  const EditableField = ({ label, value, placeholder, icon }) =>
  <View style={styles.fieldContainer}>
      <View style={styles.fieldHeader}>
        {icon && <Ionicons name={icon} size={16} color={colors.primary} style={{ marginRight: 6 }} />}
        <Text style={[styles.fieldLabel, { color: colors.primary }]}>{label}</Text>
      </View>
      {isEditing ?
    <TextInput
      style={[styles.fieldInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
      value={editData[value] || ''}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      onChangeText={(text) => setEditData({ ...editData, [value]: text })} /> :


    <Text style={[styles.fieldValue, { color: colors.text }]}>{editData[value] || profile[value] || '-'}</Text>
    }
    </View>;


  return (
    <View style={styles.container}>
      <StatusBar barStyle={colors.isDark ? 'light-content' : 'dark-content'} translucent backgroundColor={colors.background} />
      <ImageBackground source={require('../../assets/background.png')} style={styles.background} resizeMode="cover" blurRadius={2}>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
          <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={styles.page}>
          <View style={styles.headerSpacer} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.headerWithAction}>
              <View style={{ flex: 1 }}>
                <SectionTitle
                      kicker="AGENCE"
                      title={t("screens.agency.agencyprofilescreen.profilVerification")}
                      subtitle={t("screens.agency.agencyprofilescreen.informationsLegalesDocumentsEtGestion")} />
                    
              </View>
              {!isEditing &&
                  <TouchableOpacity
                    style={styles.editIconButton}
                    onPress={() => setIsEditing(true)}>
                    
                  <Ionicons name="create-outline" size={20} color="#8f7dff" />
                </TouchableOpacity>
                  }
            </View>

            {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
            {state.loading ?
                <View style={styles.centered}>
                <ActivityIndicator size="large" color="#8f7dff" />
              </View> :

                <>
                {/* Company Information Section */}
                <AgencyCard style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="business-outline" size={20} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("screens.agency.agencyprofilescreen.informationsCommerciales")}</Text>
                      <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{t("screens.agency.agencyprofilescreen.raisonSocialeEtIdentifiants")}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <EditableField label={t("screens.agency.agencyprofilescreen.nomCommercial")} value="commercialName" placeholder={t("screens.agency.agencyprofilescreen.exRentifyAgency")} icon="storefront-outline" />
                  <EditableField label={t("screens.agency.agencyprofilescreen.raisonSociale")} value="corporateName" placeholder={t("screens.agency.agencyprofilescreen.raisonSociale")} icon="document-text-outline" />
                </AgencyCard>

                {/* Legal Information Section */}
                <AgencyCard style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("screens.agency.agencyprofilescreen.informationsLegales")}</Text>
                      <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{t("screens.agency.agencyprofilescreen.enregistrementEtVerification")}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <EditableField label={t("screens.agency.agencyprofilescreen.registreDeCommerce")} value="registrationNumber" placeholder={t("screens.agency.agencyprofilescreen.numeroRc")} icon="receipt-outline" />
                  <EditableField label={t("screens.agency.agencyprofilescreen.numeroNif")} value="nif" placeholder={t("screens.agency.agencyprofilescreen.nif")} icon="card-outline" />
                </AgencyCard>

                {/* Manager Information Section */}
                <AgencyCard style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="person-outline" size={20} color={colors.warning} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("screens.agency.agencyprofilescreen.responsableDeLagence")}</Text>
                      <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{t("screens.agency.agencyprofilescreen.contactDuGerant")}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <EditableField label={t("screens.agency.agencyprofilescreen.nomDuGerant")} value="managerName" placeholder={t("screens.agency.agencyprofilescreen.nomComplet")} icon="person-circle-outline" />
                  <EditableField label={t("screens.agency.agencyprofilescreen.telephone")} value="managerPhone" placeholder="+213..." icon="call-outline" />
                </AgencyCard>

                {/* Verification Status */}
                <AgencyCard style={[styles.section, styles.statusCard]}>
                    <View style={styles.statusContent}>
                    <View style={styles.statusIcon}>
                      <Ionicons
                          name={profile.verificationStatus === 'VERIFIED' ? "checkmark-circle" : "information-circle"}
                          size={32}
                          color={profile.verificationStatus === 'VERIFIED' ? colors.success : colors.warning} />
                        
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.statusTitle, { color: colors.text }]}>
                        {profile.verificationStatus === 'VERIFIED' ? 'Agence vérifiée' : t("screens.agency.agencydashboardscreen.enAttenteDeVerification")}
                      </Text>
                      <Text style={[styles.statusSubtitle, { color: colors.textMuted }]}>
                        {profile.verificationStatus === 'VERIFIED' ?
                          'Votre agence est approuvée et active' :
                          'Votre dossier est en cours de révision'}
                      </Text>
                    </View>
                  </View>
                </AgencyCard>

                {/* Action Buttons */}
                {isEditing &&
                  <View style={styles.editingActions}>
                    <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.success }]} onPress={handleSaveChanges}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                      <Text style={[styles.saveButtonText, { color: colors.white }]}>{t("screens.agency.agencyprofilescreen.enregistrerLesModifications")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.border }]} onPress={() => setIsEditing(false)}>
                      <Text style={[styles.cancelButtonText, { color: colors.textMuted }]}>{t("screens.agency.agencyprofilescreen.annuler")}</Text>
                    </TouchableOpacity>
                  </View>
                  }

                {!isEditing &&
                  <>
                    <TouchableOpacity style={[styles.primaryAction, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('AgencyDocuments', { token: route?.params?.token, user: route?.params?.user })}>
                      <Ionicons name="document-attach-outline" size={18} color={colors.white} />
                      <Text style={[styles.primaryActionText, { color: colors.white }]}>{t("screens.agency.agencyprofilescreen.gererMesDocuments")}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.dangerAction} onPress={onLeave}>
                      <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                      <Text style={[styles.dangerActionText, { color: colors.danger }]}>{t("screens.agency.agencyprofilescreen.quitterLespaceAgence")}</Text>
                    </TouchableOpacity>
                  </>
                  }
              </>
                }
          </ScrollView>
          </View>
          </View>
          <AgencyBottomNavigation navigation={navigation} route={route} active="profile" />
        </SafeAreaView>
      </ImageBackground>
    </View>);

}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0c24' },
  background: { flex: 1, backgroundColor: '#0a0c24' },
  safeArea: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(2,3,14,0.58)' },
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  headerSpacer: { height: 8 },
  headerWithAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 10 },
  editIconButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(143,125,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(143,125,255,0.2)' },
  content: { paddingBottom: 102 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#FF8FA3', marginBottom: 12, fontWeight: '700' },
  section: { padding: 16, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  sectionSubtitle: { color: '#8E95BF', fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(143,125,255,0.1)', marginBottom: 16 },
  fieldContainer: { marginBottom: 14 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  fieldLabel: { color: '#8f7dff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  fieldValue: { color: '#F6F8FF', fontSize: 14, fontWeight: '600', marginTop: 4 },
  fieldInput: { backgroundColor: 'rgba(143,125,255,0.08)', borderWidth: 1, borderColor: 'rgba(143,125,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#F6F8FF', fontSize: 14, fontWeight: '600' },
  statusCard: { borderWidth: 1, borderColor: 'rgba(143,125,255,0.1)' },
  statusContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 60, height: 60, borderRadius: 12, backgroundColor: 'rgba(143,125,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  statusTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 2 },
  statusSubtitle: { color: '#8E95BF', fontSize: 12, lineHeight: 16 },
  editingActions: { gap: 10, marginBottom: 10 },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(33,212,167,0.95)', paddingVertical: 14, borderRadius: 12, marginBottom: 8 },
  saveButtonText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  cancelButton: { alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,92,108,0.3)', borderRadius: 10 },
  cancelButtonText: { color: '#FF5C6C', fontWeight: '700', fontSize: 13 },
  primaryAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(79,140,255,0.95)', paddingVertical: 14, borderRadius: 12, marginBottom: 10 },
  primaryActionText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  dangerAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, marginBottom: 10 },
  dangerActionText: { color: '#FF5C6C', fontWeight: '900', fontSize: 14 }
});
