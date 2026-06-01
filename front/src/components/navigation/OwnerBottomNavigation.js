import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';

const OwnerBottomNavigation = ({ navigation, route, active }) => {
  const bottomOffset = 2;
  const params = route?.params || {};
  const baseParams = { ...params };
  delete baseParams.listing;
  delete baseParams.mode;

  const resetTo = (screenName) => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: screenName, params: baseParams }],
      })
    );
  };

  const tabs = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: 'grid-outline',
      onPress: () => resetTo('OwnerDashboard'),
    },
    {
      key: 'cars',
      label: 'Vehicules',
      icon: 'car-outline',
      onPress: () => resetTo('OwnerCars'),
    },
    {
      key: 'listings',
      label: 'Annonces',
      icon: 'car-sport-outline',
      onPress: () => resetTo('OwnerListings'),
    },
    {
      key: 'reservations',
      label: 'Reservations',
      icon: 'calendar-outline',
      onPress: () => resetTo('OwnerReservations'),
    },
    {
      key: 'profile',
      label: 'Profil',
      icon: 'person-outline',
      onPress: () => resetTo('Profile'),
    },
  ];

  return (
    <View style={[styles.footer, { bottom: bottomOffset }]}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const color = isActive ? '#8f6cff' : '#8a90b8';

        return (
          <TouchableOpacity key={tab.key} style={styles.footerTab} onPress={tab.onPress}>
            <Ionicons name={tab.icon} size={25} color={color} />
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
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  footerTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 4 },
});

export default OwnerBottomNavigation;
