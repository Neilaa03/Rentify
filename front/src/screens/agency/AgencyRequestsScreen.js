import React from 'react';
import OwnerReservationsScreen from '../owner/ReservationsScreen';
import AgencyBottomNavigation from '../../components/navigation/AgencyBottomNavigation';

export default function AgencyRequestsScreen({ navigation, route }) {
  return (
    <OwnerReservationsScreen
      navigation={navigation}
      route={route}
      BottomNavigationComponent={AgencyBottomNavigation}
      title="Réservations de l'agence"
    />
  );
}
