import React from 'react';
import OwnerReservationsScreen from '../owner/ReservationsScreen';
import AgencyBottomNavigation from '../../components/navigation/AgencyBottomNavigation';import { useTranslation } from "react-i18next";

export default function AgencyRequestsScreen({ navigation, route }) {const { t } = useTranslation();
  return (
    <OwnerReservationsScreen
      navigation={navigation}
      route={route}
      BottomNavigationComponent={AgencyBottomNavigation}
      title={t("screens.agency.agencyrequestsscreen.reservationsDeLagence")} />);


}