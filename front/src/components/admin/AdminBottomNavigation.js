import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';

const AdminBottomNavigation = ({ navigation, route, active }) => {
  const insets = useSafeAreaInsets();
  const params = route?.params || {};

  const resetTo = (screenName) => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: screenName, params }],
      })
    );
  };

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline', to: 'AdminDashboard' },
    { key: 'users', label: 'Users', icon: 'people-outline', to: 'AdminUsers' },
    { key: 'cars', label: 'Cars', icon: 'car-outline', to: 'AdminCars' },
    { key: 'reservations', label: 'Bookings', icon: 'calendar-outline', to: 'AdminReservations' },
    { key: 'more', label: 'Reports', icon: 'flag-outline', to: 'AdminReports' },
  ];

  return (
    <View style={[styles.footer, { bottom: 8 + (insets?.bottom || 0) }]}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const color = isActive ? '#8f6cff' : '#8a90b8';

        return (
          <TouchableOpacity key={tab.key} style={styles.footerTab} onPress={() => resetTo(tab.to)}>
            <Ionicons name={tab.icon} size={22} color={color} />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#151738',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  footerTab: { flex: 1, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4 },
  tabLabel: { color: '#8a90b8', fontSize: 10, marginTop: 4, fontWeight: '500' },
  tabLabelActive: { color: '#8f6cff' },
});

export default AdminBottomNavigation;
