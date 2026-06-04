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
import { useTheme } from '../../contexts/ThemeContext';

const PaymentMethodSelector = ({ selectedMethod, onMethodSelect, isCardEnabled = true, disabledCardReason = '' }) => {const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{t("components.payment.paymentmethodselector.choisissezVotreMethodeDePaiement")}</Text>

      {/* Card Payment Option */}
      <TouchableOpacity
        style={[
        styles.methodCard,
        { backgroundColor: colors.surfaceStrong, borderColor: colors.border },
        selectedMethod === 'card' && styles.methodCardActive,
        !isCardEnabled && styles.methodCardDisabled]
        }
        onPress={() => {
          if (isCardEnabled) onMethodSelect('card');
        }}
        disabled={!isCardEnabled}>
        
        <View style={styles.methodHeader}>
          <View style={[styles.methodIconContainer, { backgroundColor: colors.surface }]}>
            <Ionicons
              name="card"
              size={24}
              color={selectedMethod === 'card' ? COLORS.primary : colors.textMuted} />
            
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
              styles.methodName,
              { color: colors.textMuted },
              selectedMethod === 'card' && { color: colors.text }]
              }>{t("components.payment.paymentmethodselector.carteBancaire")}


            </Text>
            <Text style={[styles.methodDescription, { color: colors.textMuted }]}>
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
        { backgroundColor: colors.surfaceStrong, borderColor: colors.border },
        selectedMethod === 'cash' && styles.methodCardActive]
        }
        onPress={() => onMethodSelect('cash')}>
        
        <View style={styles.methodHeader}>
          <View style={[styles.methodIconContainer, { backgroundColor: colors.surface }]}>
            <Ionicons
              name="cash"
              size={24}
              color={selectedMethod === 'cash' ? COLORS.primary : colors.textMuted} />
            
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
              styles.methodName,
              { color: colors.textMuted },
              selectedMethod === 'cash' && { color: colors.text }]
              }>{t("components.payment.paymentmethodselector.paiementEnEspeces")}


            </Text>
            <Text style={[styles.methodDescription, { color: colors.textMuted }]}>{t("components.payment.paymentmethodselector.aLaRecuperationDuVehicule")}

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
      <View style={[styles.infoBox, { backgroundColor: `${COLORS.primary}1A` }]}>
        {selectedMethod === 'card' &&
        <View style={styles.infoContent}>
            <Ionicons name="information-circle" size={16} color={COLORS.primary} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>{t("components.payment.paymentmethodselector.votrePaiementSeraTraiteDeManiereSecurisee")}

          </Text>
          </View>
        }
        {selectedMethod === 'cash' &&
        <View style={styles.infoContent}>
            <Ionicons name="information-circle" size={16} color={COLORS.primary} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>{t("components.payment.paymentmethodselector.vousPaierezEnEspecesLorsDeLa")}

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
    marginBottom: 16
  },
  methodCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  methodCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: `rgba(${parseInt(COLORS.primary.slice(1, 3), 16)}, ${parseInt(COLORS.primary.slice(3, 5), 16)}, ${parseInt(COLORS.primary.slice(5, 7), 16)}, 0.08)`
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  methodName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  methodDescription: {
    fontSize: 12,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
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
    marginLeft: 8,
    flex: 1,
    lineHeight: 18
  }
});

export default PaymentMethodSelector;
