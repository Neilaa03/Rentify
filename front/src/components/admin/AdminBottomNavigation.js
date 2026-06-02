import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';import { useTranslation } from "react-i18next";

const AdminBottomNavigation = ({ navigation, route, active }) => {const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomOffset = 2;
  const params = route?.params || {};

  const resetTo = (screenName) => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: screenName, params }]
      })
    );
  };

  const tabs = [
  { key: 'dashboard', label: t("components.admin.adminbottomnavigation.tableauDeBord"), icon: 'grid-outline', to: 'AdminDashboard' },
  { key: 'users', label: t("components.admin.adminbottomnavigation.comptes"), icon: 'people-outline', to: 'AdminUsers' },
  { key: 'documents', label: t("components.admin.adminbottomnavigation.documents"), icon: 'document-text-outline', to: 'AdminCars' },
  { key: 'activity', label: t("components.admin.adminbottomnavigation.activite"), icon: 'pulse-outline', to: 'AdminReservations' },
  { key: 'reports', label: t("components.admin.adminbottomnavigation.signalements"), icon: 'flag-outline', to: 'AdminReports' }];


  return (
    <View style={[styles.footer, { bottom: bottomOffset + (insets?.bottom || 0) }]}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const color = isActive ? '#8f6cff' : '#8a90b8';

        return (
          <TouchableOpacity key={tab.key} style={styles.footerTab} onPress={() => resetTo(tab.to)}>
            <Ionicons name={tab.icon} size={25} color={color} />
          </TouchableOpacity>);

      })}
    </View>);

};

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#151738',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)'
  },
  footerTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 2 }
});

export default AdminBottomNavigation;