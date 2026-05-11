import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LandingScreen from './src/screens/landingScreen';
import LoginScreen from './src/screens/loginScreen';
import RegisterScreen from './src/screens/registerScreen';
import HomeScreen from './src/screens/homeScreen';
import ListingDetailsScreen from './src/screens/listingDetailsScreen';
import ProfileScreen from './src/screens/profileScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="ListingDetails" component={ListingDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
