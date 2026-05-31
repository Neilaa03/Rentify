import React from 'react';
import OwnerListingsScreen from '../owner/ListingsScreen';
import AgencyBottomNavigation from '../../components/navigation/AgencyBottomNavigation';

export default function AgencyListingsScreen({ navigation, route }) {
  return (
    <OwnerListingsScreen
      navigation={navigation}
      route={route}
      BottomNavigationComponent={AgencyBottomNavigation}
      title="Annonces de l'agence"
    />
  );
}
