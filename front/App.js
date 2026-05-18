import React from 'react';
import { FlatList, Platform, ScrollView, SectionList } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LandingScreen from './src/screens/landingScreen';
import LoginScreen from './src/screens/auth/loginScreen';
import RegisterScreen from './src/screens/auth/registerScreen';
import { ClientNavigation } from './src/components/navigation/navigationClient';

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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
