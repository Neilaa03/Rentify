import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform } from
'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';import { useTranslation } from "react-i18next";

const PaymentMethodSelector = ({ selectedMethod, onMethodSelect, isCardEnabled = true, disabledCardReason = '' }) => {const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("components.payment.paymentmethodselector.choisissezVotreMethodeDePaiement")}</Text>

      {/* Card Payment Option */}
      <TouchableOpacity
        style={[
        styles.methodCard,
        selectedMethod === 'card' && styles.methodCardActive,
        !isCardEnabled && styles.methodCardDisabled]
        }
        onPress={() => {
          if (isCardEnabled) onMethodSelect('card');
        }}
        disabled={!isCardEnabled}>
        
        <View style={styles.methodHeader}>
          <View style={styles.methodIconContainer}>
            <Ionicons
              name="card"
              size={24}
              color={selectedMethod === 'card' ? COLORS.primary : COLORS.text} />
            
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
              styles.methodName,
              selectedMethod === 'card' && styles.methodNameActive]
              }>{t("components.payment.paymentmethodselector.carteBancaire")}


            </Text>
            <Text style={styles.methodDescription}>
              {isCardEnabled ?
              'Paiement immédiat par Stripe' :
              disabledCardReason || 'Paiement carte indisponible pour cette annonce'}
            </Text>
          </View>
          <View
            style={[
            styles.radio,
            selectedMethod === 'card' && styles.radioActive]
            }>
            
            {selectedMethod === 'card' && isCardEnabled &&
            <View style={styles.radioDot} />
            }
          </View>
        </View>
      </TouchableOpacity>

      {/* Cash Payment Option */}
      <TouchableOpacity
        style={[
        styles.methodCard,
        selectedMethod === 'cash' && styles.methodCardActive]
        }
        onPress={() => onMethodSelect('cash')}>
        
        <View style={styles.methodHeader}>
          <View style={styles.methodIconContainer}>
            <Ionicons
              name="cash"
              size={24}
              color={selectedMethod === 'cash' ? COLORS.primary : COLORS.text} />
            
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
              styles.methodName,
              selectedMethod === 'cash' && styles.methodNameActive]
              }>{t("components.payment.paymentmethodselector.paiementEnEspeces")}


            </Text>
            <Text style={styles.methodDescription}>{t("components.payment.paymentmethodselector.aLaRecuperationDuVehicule")}

            </Text>
          </View>
          <View
            style={[
            styles.radio,
            selectedMethod === 'cash' && styles.radioActive]
            }>
            
            {selectedMethod === 'cash' &&
            <View style={styles.radioDot} />
            }
          </View>
        </View>
      </TouchableOpacity>

      {/* Info Section */}
      <View style={styles.infoBox}>
        {selectedMethod === 'card' &&
        <View style={styles.infoContent}>
            <Ionicons name="information-circle" size={16} color={COLORS.primary} />
            <Text style={styles.infoText}>{t("components.payment.paymentmethodselector.votrePaiementSeraTraiteDeManiereSecurisee")}

          </Text>
          </View>
        }
        {selectedMethod === 'cash' &&
        <View style={styles.infoContent}>
            <Ionicons name="information-circle" size={16} color={COLORS.primary} />
            <Text style={styles.infoText}>{t("components.payment.paymentmethodselector.vousPaierezEnEspecesLorsDeLa")}

          </Text>
          </View>
        }
      </View>
    </View>);

};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f6f8ff',
    marginBottom: 16
  },
  methodCard: {
    borderWidth: 2,
    borderColor: '#2c3e50',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(44, 62, 80, 0.3)'
  },
  methodCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: `rgba(${parseInt(COLORS.primary.slice(1, 3), 16)}, ${parseInt(COLORS.primary.slice(3, 5), 16)}, ${parseInt(COLORS.primary.slice(5, 7), 16)}, 0.1)`
  },
  methodCardDisabled: {
    opacity: 0.55
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  methodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(102, 112, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  methodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8e95bf',
    marginBottom: 4
  },
  methodNameActive: {
    color: '#f6f8ff'
  },
  methodDescription: {
    fontSize: 12,
    color: '#8e95bf'
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8e95bf',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12
  },
  radioActive: {
    borderColor: COLORS.primary
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary
  },
  infoBox: {
    backgroundColor: `rgba(${parseInt(COLORS.primary.slice(1, 3), 16)}, ${parseInt(COLORS.primary.slice(3, 5), 16)}, ${parseInt(COLORS.primary.slice(5, 7), 16)}, 0.1)`,
    borderRadius: 8,
    padding: 12,
    marginTop: 8
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  infoText: {
    fontSize: 12,
    color: '#8e95bf',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18
  }
});

export default PaymentMethodSelector;