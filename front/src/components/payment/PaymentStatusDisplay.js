import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator } from
'react-native';
import { Ionicons } from '@expo/vector-icons';import { useTranslation } from "react-i18next";

const PaymentStatusDisplay = ({ status, amount, paymentMethod }) => {const { t } = useTranslation();
  const getStatusInfo = () => {
    switch (status) {
      case 'pending':
        return {
          icon: 'hourglass',
          label: t("components.payment.paymentstatusdisplay.paiementEnAttente"),
          color: '#f39c12',
          showSpinner: true
        };
      case 'held_in_escrow':
        return {
          icon: 'shield-checkmark',
          label: t("components.payment.paymentstatusdisplay.paiementSecuriseEnEscrow"),
          color: '#4f8cff',
          showSpinner: false
        };
      case 'released':
        return {
          icon: 'checkmark-done-circle',
          label: t("components.payment.paymentstatusdisplay.fondsLiberesAuProprietaire"),
          color: '#27ae60',
          showSpinner: false
        };
      case 'disputed':
        return {
          icon: 'alert-circle',
          label: t("components.payment.paymentstatusdisplay.paiementEnLitige"),
          color: '#e67e22',
          showSpinner: false
        };
      case 'completed':
      case 'paid':
        return {
          icon: 'checkmark-circle',
          label: t("components.payment.paymentstatusdisplay.paiementConfirme"),
          color: '#27ae60',
          showSpinner: false
        };
      case 'failed':
        return {
          icon: 'close-circle',
          label: t("components.payment.paymentstatusdisplay.paiementEchoue"),
          color: '#e74c3c',
          showSpinner: false
        };
      case 'pending_cash':
        return {
          icon: 'cash',
          label: t("components.payment.paymentstatusdisplay.enAttentePaiementEnEspeces"),
          color: '#3498db',
          showSpinner: true
        };
      default:
        return {
          icon: 'help-circle',
          label: t("components.payment.paymentstatusdisplay.statutInconnu"),
          color: '#95a5a6',
          showSpinner: false
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={[styles.container, { borderLeftColor: statusInfo.color }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {statusInfo.showSpinner ?
          <ActivityIndicator size="small" color={statusInfo.color} /> :

          <Ionicons
            name={statusInfo.icon}
            size={24}
            color={statusInfo.color} />

          }
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.label}>{statusInfo.label}</Text>
          <Text style={styles.amount}>
            {paymentMethod === 'cash' ? 'Espèces' : t("components.payment.paymentmethodselector.carteBancaire")} • {Number(amount || 0).toLocaleString('fr-FR')}{t("components.payment.paymentstatusdisplay.da")}
          </Text>
        </View>
      </View>
    </View>);

};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(44, 62, 80, 0.3)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 16
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  textContainer: {
    flex: 1
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f6f8ff',
    marginBottom: 4
  },
  amount: {
    fontSize: 12,
    color: '#8e95bf'
  }
});

export default PaymentStatusDisplay;