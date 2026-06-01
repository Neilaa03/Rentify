import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ImageBackground, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AgencyBottomNavigation from '../../components/navigation/AgencyBottomNavigation';
import { AgencyCard, SectionTitle } from '../../components/agency/AgencyPrimitives';
import { getAgencyProfile } from '../../services/agency';

export default function AgencyProfileScreen({ navigation, route }) {
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
        profile: profileData,
      });
      setEditData(profileData || {});
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message || 'Impossible de charger le profil' }));
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const profile = state.profile || {};

  const onLeave = () => {
    Alert.alert(
      'Quitter l\'espace agence',
      'Souhaitez-vous revenir à l\'écran de connexion ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }),
        },
      ]
    );
  };

  const handleSaveChanges = async () => {
    // TODO: Implement API call to update profile
    setIsEditing(false);
    Alert.alert('Succès', 'Modifications enregistrées avec succès');
  };

  const EditableField = ({ label, value, placeholder, icon }) => (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldHeader}>
        {icon && <Ionicons name={icon} size={16} color="#8f7dff" style={{ marginRight: 6 }} />}
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      {isEditing ? (
        <TextInput
          style={styles.fieldInput}
          value={editData[value] || ''}
          placeholder={placeholder}
          placeholderTextColor="#5a6280"
          onChangeText={(text) => setEditData({ ...editData, [value]: text })}
        />
      ) : (
        <Text style={styles.fieldValue}>{editData[value] || profile[value] || '-'}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="#0a0c24" />
      <ImageBackground source={require('../../assets/background.png')} style={styles.background} resizeMode="cover" blurRadius={2}>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
          <View style={styles.overlay}>
          <View style={styles.page}>
          <View style={styles.headerSpacer} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.headerWithAction}>
              <View style={{ flex: 1 }}>
                <SectionTitle
                  kicker="AGENCE"
                  title="Profil & vérification"
                  subtitle="Informations légales, documents et gestion"
                />
              </View>
              {!isEditing && (
                <TouchableOpacity 
                  style={styles.editIconButton}
                  onPress={() => setIsEditing(true)}
                >
                  <Ionicons name="create-outline" size={20} color="#8f7dff" />
                </TouchableOpacity>
              )}
            </View>

            {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
            {state.loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#8f7dff" />
              </View>
            ) : (
              <>
                {/* Company Information Section */}
                <AgencyCard style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="business-outline" size={20} color="#8f7dff" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.sectionTitle}>Informations commerciales</Text>
                      <Text style={styles.sectionSubtitle}>Raison sociale et identifiants</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <EditableField label="Nom commercial" value="commercialName" placeholder="Ex: Rentify Agency" icon="storefront-outline" />
                  <EditableField label="Raison sociale" value="corporateName" placeholder="Raison sociale" icon="document-text-outline" />
                </AgencyCard>

                {/* Legal Information Section */}
                <AgencyCard style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#21d4a7" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.sectionTitle}>Informations légales</Text>
                      <Text style={styles.sectionSubtitle}>Enregistrement et vérification</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <EditableField label="Registre de commerce" value="registrationNumber" placeholder="Numéro RC" icon="receipt-outline" />
                  <EditableField label="Numéro NIF" value="nif" placeholder="NIF" icon="card-outline" />
                </AgencyCard>

                {/* Manager Information Section */}
                <AgencyCard style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="person-outline" size={20} color="#ffb347" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.sectionTitle}>Responsable de l'agence</Text>
                      <Text style={styles.sectionSubtitle}>Contact du gérant</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <EditableField label="Nom du gérant" value="managerName" placeholder="Nom complet" icon="person-circle-outline" />
                  <EditableField label="Téléphone" value="managerPhone" placeholder="+213..." icon="call-outline" />
                </AgencyCard>

                {/* Verification Status */}
                <AgencyCard style={[styles.section, styles.statusCard]}>
                  <View style={styles.statusContent}>
                    <View style={styles.statusIcon}>
                      <Ionicons 
                        name={profile.verificationStatus === 'VERIFIED' ? "checkmark-circle" : "information-circle"} 
                        size={32} 
                        color={profile.verificationStatus === 'VERIFIED' ? '#21d4a7' : '#ffb347'} 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.statusTitle}>
                        {profile.verificationStatus === 'VERIFIED' ? 'Agence vérifiée' : 'En attente de vérification'}
                      </Text>
                      <Text style={styles.statusSubtitle}>
                        {profile.verificationStatus === 'VERIFIED' 
                          ? 'Votre agence est approuvée et active'
                          : 'Votre dossier est en cours de révision'}
                      </Text>
                    </View>
                  </View>
                </AgencyCard>

                {/* Action Buttons */}
                {isEditing && (
                  <View style={styles.editingActions}>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                      <Text style={styles.cancelButtonText}>Annuler</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!isEditing && (
                  <>
                    <TouchableOpacity style={styles.primaryAction} onPress={() => navigation.navigate('AgencyDocuments', { token: route?.params?.token, user: route?.params?.user })}>
                      <Ionicons name="document-attach-outline" size={18} color="#fff" />
                      <Text style={styles.primaryActionText}>Gérer mes documents</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.dangerAction} onPress={onLeave}>
                      <Ionicons name="log-out-outline" size={18} color="#FF5C6C" />
                      <Text style={styles.dangerActionText}>Quitter l'espace agence</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </ScrollView>
          </View>
          </View>
          <AgencyBottomNavigation navigation={navigation} route={route} active="profile" />
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
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
  dangerActionText: { color: '#FF5C6C', fontWeight: '900', fontSize: 14 },
});
