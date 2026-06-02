import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from "react-i18next";

const ReservationDetailsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("screens.reservations.reservationdetailsscreenWeb.recapitulatif")}</Text>
        <View style={{ width: 50 }} />
      </SafeAreaView>

      <View style={styles.content}>
        <Text style={styles.title}>{t("screens.reservations.reservationdetailsscreenWeb.paiementIndisponibleSurLeWeb")}</Text>
        <Text style={styles.subtitle}>
          {t("screens.reservations.reservationdetailsscreenWeb.lePaiementParCarteStripeNestPris")}
        </Text>
      </View>
    </View>);

};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1228' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  backButton: { padding: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { color: '#f6f8ff', fontSize: 18, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  subtitle: { color: '#8e95bf', fontSize: 14, lineHeight: 20, textAlign: 'center' }
});

export default ReservationDetailsScreen;
