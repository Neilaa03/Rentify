import React from 'react';
import { FlatList, Platform, ScrollView, SectionList } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LandingScreen from './src/screens/landingScreen';
import LoginScreen from './src/screens/auth/loginScreen';
import RegisterScreen from './src/screens/auth/registerScreen';
import { ClientNavigation } from './src/components/navigation/navigationClient';
import HomeScreen from './src/screens/homeScreen';
import ListingDetailsScreen from './src/screens/listingDetailsScreen';
import ProfileScreen from './src/screens/profileScreen';
import OwnerDashboardScreen from './src/screens/owner/dashboardScreen';
import OwnerListingsScreen from './src/screens/owner/listingsScreen';
import OwnerListingFormScreen from './src/screens/owner/listingFormScreen';
import OwnerCarFormScreen from './src/screens/owner/carFormScreen';
import OwnerCarsScreen from './src/screens/owner/carsScreen';

const Stack = createStackNavigator();
const APP_BACKGROUND = '#0f1228';

if (Platform.OS !== 'web') {
  ScrollView.defaultProps = ScrollView.defaultProps || {};
  FlatList.defaultProps = FlatList.defaultProps || {};
  SectionList.defaultProps = SectionList.defaultProps || {};

  const noOverScrollDefaults = {
    bounces: false,
    alwaysBounceVertical: false,
    overScrollMode: 'never',
  };

  Object.assign(ScrollView.defaultProps, noOverScrollDefaults);
  Object.assign(FlatList.defaultProps, noOverScrollDefaults);
  Object.assign(SectionList.defaultProps, noOverScrollDefaults);
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: APP_BACKGROUND },
        }}
      >
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ClientApp" component={ClientNavigation} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="ListingDetails" component={ListingDetailsScreen} />
        <Stack.Screen name="OwnerDashboard" component={OwnerDashboardScreen} />
        <Stack.Screen name="OwnerCars" component={OwnerCarsScreen} />
        <Stack.Screen name="OwnerCarForm" component={OwnerCarFormScreen} />
        <Stack.Screen name="OwnerListings" component={OwnerListingsScreen} />
        <Stack.Screen name="OwnerListingForm" component={OwnerListingFormScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
