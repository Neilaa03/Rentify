import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';

const tabs = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline', routeName: 'AgencyDashboard' },
  { key: 'fleet', label: 'Fleet', icon: 'car-outline', routeName: 'AgencyFleet' },
  { key: 'listings', label: 'Listes', icon: 'albums-outline', routeName: 'AgencyListings' },
  { key: 'reservations', label: 'Réservations', icon: 'calendar-outline', routeName: 'AgencyRequests' },
  { key: 'profile', label: 'Profil', icon: 'person-outline', routeName: 'AgencyProfile' },
];

const AgencyBottomNavigation = ({ navigation, route, active }) => {
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

  return (
    <View style={[styles.footer, { bottom: 8 + (insets?.bottom || 0) }]}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const color = isActive ? '#A78BFF' : '#8a90b8';
        return (
          <TouchableOpacity key={tab.key} style={styles.footerTab} onPress={() => resetTo(tab.routeName)}>
            <Ionicons name={tab.icon} size={24} color={color} />
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
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(29,16,52,0.96)',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(143,125,255,0.22)',
  },
  footerTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 4 },
});

export default AgencyBottomNavigation;
