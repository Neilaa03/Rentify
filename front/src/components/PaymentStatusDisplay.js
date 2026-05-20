import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const PaymentStatusDisplay = ({ status, amount, paymentMethod }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'pending':
        return {
          icon: 'hourglass',
          label: 'Paiement en attente',
          color: '#f39c12',
          showSpinner: true,
        };
      case 'completed':
      case 'paid':
        return {
          icon: 'checkmark-circle',
          label: 'Paiement confirmé',
          color: '#27ae60',
          showSpinner: false,
        };
      case 'failed':
        return {
          icon: 'close-circle',
          label: 'Paiement échoué',
          color: '#e74c3c',
          showSpinner: false,
        };
      case 'pending_cash':
        return {
          icon: 'cash',
          label: 'En attente - Paiement en espèces',
          color: '#3498db',
          showSpinner: true,
        };
      default:
        return {
          icon: 'help-circle',
          label: 'Statut inconnu',
          color: '#95a5a6',
          showSpinner: false,
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={[styles.container, { borderLeftColor: statusInfo.color }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {statusInfo.showSpinner ? (
            <ActivityIndicator size="small" color={statusInfo.color} />
          ) : (
            <Ionicons
              name={statusInfo.icon}
              size={24}
              color={statusInfo.color}
            />
          )}
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.label}>{statusInfo.label}</Text>
          <Text style={styles.amount}>
            {paymentMethod === 'cash' ? 'Espèces' : 'Carte bancaire'} • {amount}€
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(44, 62, 80, 0.3)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f6f8ff',
    marginBottom: 4,
  },
  amount: {
    fontSize: 12,
    color: '#8e95bf',
  },
});

export default PaymentStatusDisplay;
