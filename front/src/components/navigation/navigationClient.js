import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

import HomeScreen from '../../screens/homeScreen';
import ListingDetailsScreen from '../../screens/listingDetailsScreen';
import ReservationDatePickerScreen from '../../screens/reservations/reservationDatePickerScreen';
import ReservationDetailsScreen from '../../screens/reservations/reservationDetailsScreen';
import ReservationsScreen from '../../screens/reservations/reservationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const APP_BACKGROUND = '#0f1228';

// Stack for Home tab
function HomeTabStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: APP_BACKGROUND } }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen 
        name="ListingDetails" 
        component={ListingDetailsScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen 
        name="ReservationDatePicker" 
        component={ReservationDatePickerScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen 
        name="ReservationDetails" 
        component={ReservationDetailsScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
    </Stack.Navigator>
  );
}

// Stack for Search tab
function SearchTabStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: APP_BACKGROUND } }}>
      <Stack.Screen name="Search" component={HomeScreen} />
      <Stack.Screen 
        name="ListingDetailsFromSearch" 
        component={ListingDetailsScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen 
        name="ReservationDatePickerFromSearch" 
        component={ReservationDatePickerScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
    </Stack.Navigator>
  );
}

// Stack for Reservations tab
function ReservationsTabStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: APP_BACKGROUND } }}>
      <Stack.Screen name="ReservationsList" component={ReservationsScreen} />
      <Stack.Screen 
        name="ReservationDetails" 
        component={ReservationDetailsScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
    </Stack.Navigator>
  );
}

// Stack for Profile tab
function ProfileTabStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: APP_BACKGROUND } }}>
      <Stack.Screen name="Profile" component={HomeScreen} />
    </Stack.Navigator>
  );
}

// Client Navigation Component
export function ClientNavigation() {
  const defaultTabBarStyle = {
    backgroundColor: '#0f1228',
    borderTopWidth: 0,
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 18,
    height: 74,
    paddingTop: 8,
    paddingBottom: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneContainerStyle: { backgroundColor: APP_BACKGROUND },
        tabBarShowLabel: true,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'HomeTab') {
            iconName = 'home-outline';
          } else if (route.name === 'SearchTab') {
            iconName = 'search-outline';
          } else if (route.name === 'ReservationsTab') {
            iconName = 'calendar-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#8a90b8',
        tabBarStyle: defaultTabBarStyle,
        tabBarItemStyle: {
          paddingTop: 2,
          paddingBottom: 2,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeTabStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);
          const hide = routeName && routeName !== 'Home';
          return { tabBarLabel: 'Accueil', tabBarStyle: hide ? { display: 'none' } : defaultTabBarStyle };
        }}
      />
      <Tab.Screen 
        name="SearchTab" 
        component={SearchTabStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);
          const hide = routeName && routeName !== 'Search';
          return { tabBarLabel: 'Recherche', tabBarStyle: hide ? { display: 'none' } : defaultTabBarStyle };
        }}
      />
      <Tab.Screen 
        name="ReservationsTab" 
        component={ReservationsTabStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);
          const hide = routeName && routeName !== 'ReservationsList';
          return { tabBarLabel: 'Réservations', tabBarStyle: hide ? { display: 'none' } : defaultTabBarStyle };
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileTabStack}
        options={{ tabBarLabel: 'Profil' }}
      />
    </Tab.Navigator>
  );
}

export default ClientNavigation;
