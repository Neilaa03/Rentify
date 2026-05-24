import React from 'react';
import { FlatList, Platform, ScrollView, SectionList } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LandingScreen from './src/screens/client/LandingScreen';
import HomeScreen from './src/screens/client/HomeScreen';
import ListingDetailsScreen from './src/screens/client/ListingDetailsScreen';
import ProfileScreen from './src/screens/client/ProfileScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import OwnerDashboardScreen from './src/screens/owner/DashboardScreen';
import OwnerListingsScreen from './src/screens/owner/ListingsScreen';
import OwnerListingFormScreen from './src/screens/owner/ListingFormScreen';
import OwnerCarFormScreen from './src/screens/owner/CarFormScreen';
import OwnerCarsScreen from './src/screens/owner/CarsScreen';
import OwnerReservationsScreen from './src/screens/owner/ReservationsScreen';
import OwnerReservationDetailsScreen from './src/screens/owner/ReservationDetailsScreen';
import HandoverVerifyScreen from './src/screens/handover/HandoverVerifyScreen';
import HandoverCodeScreen from './src/screens/handover/HandoverCodeScreen';
import { ClientNavigation } from './src/components/navigation/ClientNavigation';
import InboxScreen from './src/screens/messages/InboxScreen';
import ChatScreen from './src/screens/messages/ChatScreen';

const Stack = createStackNavigator();
const APP_BACKGROUND = '#0f1228';
const STRIPE_PUBLISHABLE_KEY = process?.env?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

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

const StripeProvider = ({ children }) => children;
const getNativeStripeProvider = () => {
  // Avoid static imports so web bundling never pulls in native-only modules.
  if (Platform.OS === 'web') return StripeProvider;
  try {
    return require('@stripe/stripe-react-native')?.StripeProvider || StripeProvider;
  } catch (e) {
    return StripeProvider;
  }
};

export default function App() {
  const NativeStripeProvider = getNativeStripeProvider();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NativeStripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
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
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="ListingDetails" component={ListingDetailsScreen} />
            <Stack.Screen name="OwnerDashboard" component={OwnerDashboardScreen} />
            <Stack.Screen name="OwnerCars" component={OwnerCarsScreen} />
            <Stack.Screen name="OwnerCarForm" component={OwnerCarFormScreen} />
            <Stack.Screen name="OwnerListings" component={OwnerListingsScreen} />
            <Stack.Screen name="OwnerListingForm" component={OwnerListingFormScreen} />
            <Stack.Screen name="OwnerReservations" component={OwnerReservationsScreen} />
            <Stack.Screen name="OwnerReservationDetails" component={OwnerReservationDetailsScreen} />
            <Stack.Screen name="OwnerPickupVerify" component={HandoverVerifyScreen} />
            <Stack.Screen name="OwnerReturnCode" component={HandoverCodeScreen} />
            <Stack.Screen name="Inbox" component={InboxScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="ClientApp" component={ClientNavigation} />
          </Stack.Navigator>
        </NavigationContainer>
      </NativeStripeProvider>
    </GestureHandlerRootView>
  );
}
