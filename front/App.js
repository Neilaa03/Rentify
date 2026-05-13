import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LandingScreen from './src/screens/landingScreen';
import LoginScreen from './src/screens/auth/loginScreen';
import RegisterScreen from './src/screens/auth/registerScreen';
import HomeScreen from './src/screens/homeScreen';
import ListingDetailsScreen from './src/screens/listingDetailsScreen';
import ReservationDatePickerScreen from './src/screens/reservations/reservationDatePickerScreen';
import ReservationDetailsScreen from './src/screens/reservations/reservationDetailsScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ListingDetails" component={ListingDetailsScreen} />
        <Stack.Screen name="ReservationDatePicker" component={ReservationDatePickerScreen} />
        <Stack.Screen name="ReservationDetails" component={ReservationDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
