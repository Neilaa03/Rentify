import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  ImageBackground,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';

const ReservationDetailsScreen = ({ navigation, route }) => {
  const { reservation, listing } = route.params;
  const [loading, setLoading] = useState(false);

  const startDate = new Date(reservation.startDate);
  const endDate = new Date(reservation.endDate);
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  const handlePayment = async () => {
    try {
      setLoading(true);
      // TODO: Integrate with payment gateway (Stripe, PayPal, etc.)
      // For now, just show a success message
      Alert.alert(
        'Redirection paiement',
        'Vous allez être redirigé vers la page de paiement sécurisée.',
        [
          {
            text: 'OK',
            onPress: () => {
              // After successful payment, update reservation status
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (value) => value.toLocaleString('fr-FR');
  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Récapitulatif</Text>
        <View style={{ width: 50 }} />
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Vehicle Card */}
        <View style={styles.vehicleCard}>
          {listing.image ? (
            <ImageBackground
              source={{ uri: listing.image }}
              style={styles.vehicleImage}
              imageStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
            >
              <View style={styles.imageOverlay} />
            </ImageBackground>
          ) : (
            <View style={[styles.vehicleImage, styles.vehicleImagePlaceholder]}>
              <Ionicons name="car-outline" size={50} color="#8f6cff" />
            </View>
          )}

          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleBrand}>{listing.brand}</Text>
            <Text style={styles.vehicleModel}>{listing.model}</Text>
            <View style={styles.vehicleSpecs}>
              <View style={styles.specBadge}>
                <Ionicons name="calendar-outline" size={14} color="#a566ff" />
                <Text style={styles.specText}>{listing.year}</Text>
              </View>
              <View style={styles.specBadge}>
                <Ionicons name="people-outline" size={14} color="#a566ff" />
                <Text style={styles.specText}>{listing.seats} places</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Dates Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Période de location</Text>
          
          <View style={styles.datesContainer}>
            <View style={styles.dateBox}>
              <Text style={styles.dateBoxLabel}>Départ</Text>
              <Text style={styles.dateBoxValue}>{formatDate(startDate)}</Text>
              <Text style={styles.dateBoxTime}>08:00</Text>
            </View>

            <View style={styles.dateSeparator}>
              <View style={styles.dateSeparatorLine} />
              <Text style={styles.dateSeparatorDays}>{totalDays}j</Text>
              <View style={styles.dateSeparatorLine} />
            </View>

            <View style={styles.dateBox}>
              <Text style={styles.dateBoxLabel}>Retour</Text>
              <Text style={styles.dateBoxValue}>{formatDate(endDate)}</Text>
              <Text style={styles.dateBoxTime}>18:00</Text>
            </View>
          </View>
        </View>

        {/* Driver Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations du conducteur</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom complet</Text>
              <Text style={styles.infoValue}>Votre Nom</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>votre.email@example.com</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>+213 XXX XXX XXX</Text>
            </View>
          </View>
        </View>

        {/* Conditions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conditions de location</Text>
          
          <View style={styles.conditionsList}>
            <View style={styles.conditionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#23d49f" />
              <View style={styles.conditionContent}>
                <Text style={styles.conditionTitle}>Assurance incluse</Text>
                <Text style={styles.conditionDesc}>Couverture complète</Text>
              </View>
            </View>

            <View style={styles.conditionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#23d49f" />
              <View style={styles.conditionContent}>
                <Text style={styles.conditionTitle}>Kilométrage illimité</Text>
                <Text style={styles.conditionDesc}>Aucune limite de km</Text>
              </View>
            </View>

            <View style={styles.conditionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#23d49f" />
              <View style={styles.conditionContent}>
                <Text style={styles.conditionTitle}>Assistance 24/7</Text>
                <Text style={styles.conditionDesc}>Support disponible</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détail du prix</Text>
          
          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceRowLabel}>
                {listing.pricePerDay.toLocaleString('fr-FR')} DA × {totalDays} jour
                {totalDays > 1 ? 's' : ''}
              </Text>
              <Text style={styles.priceRowValue}>
                {(listing.pricePerDay * totalDays).toLocaleString('fr-FR')} DA
              </Text>
            </View>

            <View style={styles.dividerSmall} />

            <View style={styles.priceRow}>
              <Text style={styles.priceRowLabel}>Frais de service</Text>
              <Text style={styles.priceRowValue}>
                {Math.round(reservation.totalPrice * 0.1).toLocaleString('fr-FR')} DA
              </Text>
            </View>

            <View style={styles.dividerSmall} />

            <View style={[styles.priceRow, styles.totalPriceRow]}>
              <Text style={styles.totalPriceLabel}>Prix total</Text>
              <Text style={styles.totalPriceValue}>
                {formatPrice(reservation.totalPrice)} DA
              </Text>
            </View>
          </View>
        </View>

        {/* Terms & Conditions */}
        <View style={styles.termsSection}>
          <View style={styles.termsCheckbox}>
            <Ionicons name="checkbox-outline" size={20} color="#a566ff" />
            <Text style={styles.termsText}>
              J'accepte les{' '}
              <Text style={styles.termsLink}>conditions générales</Text> et la
              <Text style={styles.termsLink}> politique de confidentialité</Text>
            </Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Payment Button */}
      <View style={styles.paymentBar}>
        <View>
          <Text style={styles.paymentLabel}>Total à payer</Text>
          <Text style={styles.paymentAmount}>
            {formatPrice(reservation.totalPrice)} DA
          </Text>
        </View>
        <TouchableOpacity
          onPress={handlePayment}
          disabled={loading}
          style={styles.paymentButtonWrapper}
        >
          <LinearGradient
            colors={[COLORS.secondary, COLORS.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.paymentButton}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.paymentButtonText}>Passer au paiement</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1228',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#151837',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 156, 233, 0.2)',
  },
  backButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#f6f8ff',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  vehicleCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#151837',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)',
  },
  vehicleImage: {
    height: 200,
    backgroundColor: '#0f1228',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleImagePlaceholder: {
    backgroundColor: 'rgba(143, 108, 255, 0.1)',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  vehicleInfo: {
    padding: 16,
  },
  vehicleBrand: {
    color: '#8e95bf',
    fontSize: 12,
    marginBottom: 4,
  },
  vehicleModel: {
    color: '#f6f8ff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  vehicleSpecs: {
    flexDirection: 'row',
    gap: 8,
  },
  specBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(143, 108, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  specText: {
    color: '#a566ff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#f6f8ff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  datesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateBox: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)',
    alignItems: 'center',
  },
  dateBoxLabel: {
    color: '#8e95bf',
    fontSize: 12,
    marginBottom: 4,
  },
  dateBoxValue: {
    color: '#f6f8ff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateBoxTime: {
    color: '#a566ff',
    fontSize: 11,
    fontWeight: '600',
  },
  dateSeparator: {
    alignItems: 'center',
    gap: 4,
  },
  dateSeparatorLine: {
    width: 20,
    height: 1,
    backgroundColor: 'rgba(148, 156, 233, 0.2)',
  },
  dateSeparatorDays: {
    color: '#a566ff',
    fontSize: 12,
    fontWeight: '700',
  },
  infoCard: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoLabel: {
    color: '#8e95bf',
    fontSize: 14,
  },
  infoValue: {
    color: '#f6f8ff',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(148, 156, 233, 0.1)',
    marginHorizontal: 16,
  },
  dividerSmall: {
    height: 1,
    backgroundColor: 'rgba(148, 156, 233, 0.1)',
    marginVertical: 8,
  },
  conditionsList: {
    gap: 12,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(35, 212, 159, 0.1)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(35, 212, 159, 0.2)',
  },
  conditionContent: {
    flex: 1,
  },
  conditionTitle: {
    color: '#f6f8ff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  conditionDesc: {
    color: '#8e95bf',
    fontSize: 12,
  },
  priceBreakdown: {
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 156, 233, 0.2)',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRowLabel: {
    color: '#8e95bf',
    fontSize: 14,
  },
  priceRowValue: {
    color: '#f6f8ff',
    fontSize: 14,
    fontWeight: '600',
  },
  totalPriceRow: {
    marginTop: 8,
    paddingTop: 8,
  },
  totalPriceLabel: {
    color: '#f6f8ff',
    fontSize: 16,
    fontWeight: '700',
  },
  totalPriceValue: {
    color: '#a566ff',
    fontSize: 20,
    fontWeight: '800',
  },
  termsSection: {
    backgroundColor: 'rgba(143, 108, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(143, 108, 255, 0.1)',
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  termsText: {
    flex: 1,
    color: '#8e95bf',
    fontSize: 12,
    lineHeight: 18,
  },
  termsLink: {
    color: '#a566ff',
    fontWeight: '600',
  },
  paymentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#151837',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 156, 233, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  paymentLabel: {
    color: '#8e95bf',
    fontSize: 12,
  },
  paymentAmount: {
    color: '#a566ff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  paymentButtonWrapper: {
    flex: 1,
    marginLeft: 12,
  },
  paymentButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default ReservationDetailsScreen;
