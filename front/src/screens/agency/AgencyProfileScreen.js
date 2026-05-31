import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AgencyBottomNavigation from '../../components/navigation/AgencyBottomNavigation';
import { AgencyCard, CompanyMetaItem, DocumentRow, SectionTitle } from '../../components/agency/AgencyPrimitives';
import { getAgencyDocuments, getAgencyProfile } from '../../services/agency';

export default function AgencyProfileScreen({ navigation, route }) {
  const token = route?.params?.token;
  const [state, setState] = useState({ loading: true, error: '', profile: null, documents: [] });

  const load = useCallback(async () => {
    if (!token) {
      setState((prev) => ({ ...prev, loading: false, error: 'Session requise' }));
      return;
    }
    try {
      const [profile, documents] = await Promise.all([
        getAgencyProfile({ token }),
        getAgencyDocuments({ token }),
      ]);
      setState({
        loading: false,
        error: '',
        profile: profile?.agency || profile || null,
        documents: documents?.documents || [],
      });
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
      'Quitter l’espace agence',
      'Souhaitez-vous revenir à l’écran de connexion ?',
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

  return (
    <ImageBackground source={require('../../assets/background.png')} style={styles.background} resizeMode="cover">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.page}>
          <SectionTitle
            kicker="AGENCE"
            title="Profil & vérification"
            subtitle="Informations légales, dossiers et actions de conformité"
          />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

            <AgencyCard style={styles.card}>
              <SectionTitle kicker="INFORMATIONS DE L'ENTREPRISE" title="Métadonnées de la société" />
              <View style={styles.metaGrid}>
                <CompanyMetaItem label="Nom commercial" value={profile.commercialName} />
                <CompanyMetaItem label="Raison sociale" value={profile.corporateName} />
                <CompanyMetaItem label="Registre de commerce" value={profile.registrationNumber} />
                <CompanyMetaItem label="NIF" value={profile.nif} />
                <CompanyMetaItem label="Gérant" value={profile.managerName} />
                <CompanyMetaItem label="Téléphone gérant" value={profile.managerPhone} />
              </View>
            </AgencyCard>

            <AgencyCard style={styles.card}>
              <SectionTitle kicker="DOSSIERS" title="Queue documentaire" subtitle="Les documents de l’agence et de la flotte" />
              {state.documents.length ? state.documents.map((doc) => <DocumentRow key={doc.id} item={doc} />) : <Text style={styles.empty}>Aucun document disponible.</Text>}
            </AgencyCard>

            <TouchableOpacity style={styles.primaryAction} onPress={() => navigation.navigate('AgencyFleet', { token: route?.params?.token, user: route?.params?.user })}>
              <Text style={styles.primaryActionText}>Gérer tous les documents</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dangerAction} onPress={onLeave}>
              <Text style={styles.dangerActionText}>Quitter l'espace agence</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        <AgencyBottomNavigation navigation={navigation} route={route} active="profile" />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#0D0E15' },
  safeArea: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  content: { paddingBottom: 102 },
  error: { color: '#FF8FA3', marginBottom: 12, fontWeight: '700' },
  card: { padding: 16, marginBottom: 14 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  empty: { color: '#A5AECF', fontStyle: 'italic', marginTop: 2 },
  primaryAction: {
    backgroundColor: 'rgba(41,121,255,0.95)',
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryActionText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  dangerAction: { alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  dangerActionText: { color: '#FF5C6C', fontWeight: '900', fontSize: 14 },
});
