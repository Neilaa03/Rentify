import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const OwnerBottomNavigation = ({ navigation, route, active }) => {
  const params = route?.params || {};
  const baseParams = { ...params };
  delete baseParams.listing;
  delete baseParams.mode;

  const tabs = [
    {
      key: 'dashboard',
      label: 'Tableau de bord',
      icon: 'grid-outline',
      onPress: () => navigation.navigate('OwnerDashboard', params),
    },
    {
      key: 'cars',
      label: 'Vehicules',
      icon: 'car-outline',
      onPress: () => navigation.navigate('OwnerCars', params),
    },
    {
      key: 'listings',
      label: 'Mes annonces',
      icon: 'car-sport-outline',
      onPress: () => navigation.navigate('OwnerListings', params),
    },
    {
      key: 'profile',
      label: 'Profil',
      icon: 'person-outline',
      onPress: () => navigation.navigate('Profile', params),
    },
  ];

  return (
    <View style={styles.footer}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const color = isActive ? '#8f6cff' : '#8a90b8';

        return (
          <TouchableOpacity key={tab.key} style={styles.footerTab} onPress={tab.onPress}>
            <Ionicons name={tab.icon} size={23} color={color} />
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
    left: 10,
    right: 10,
    bottom: 8,
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

export default OwnerBottomNavigation;
