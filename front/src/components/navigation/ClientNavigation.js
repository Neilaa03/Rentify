import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { CommonActions, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../../screens/client/HomeScreen';
import FavoritesScreen from '../../screens/client/FavoritesScreen';
import ListingDetailsScreen from '../../screens/client/ListingDetailsScreen';
import ReservationDatePickerScreen from '../../screens/reservations/ReservationDatePickerScreen';
import ReservationDetailsScreen from '../../screens/reservations/ReservationDetailsScreen';
import HandoverCodeScreen from '../../screens/handover/HandoverCodeScreen';
import HandoverVerifyScreen from '../../screens/handover/HandoverVerifyScreen';
import ReservationsScreen from '../../screens/reservations/ReservationsScreen';
import ProfileScreen from '../../screens/client/ProfileScreen';
import InboxScreen from '../../screens/messages/InboxScreen';
import UnreadNotificationsScreen from '../../screens/notifications/UnreadNotificationsScreen';
import NotificationsHistoryScreen from '../../screens/notifications/NotificationsHistoryScreen';
import ChatScreen from '../../screens/messages/ChatScreen';
import { FavoritesProvider } from '../../contexts/FavoritesContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const APP_BACKGROUND = '#0f1228';

// Stack for Home tab
function HomeTabStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: APP_BACKGROUND } }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Inbox" component={InboxScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
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
      <Stack.Screen
        name="NotificationScreen"
        component={UnreadNotificationsScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="NotificationsHistory"
        component={NotificationsHistoryScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
       <Stack.Screen
        name="PickupCode"
        component={HandoverCodeScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="ReturnVerify"
        component={HandoverVerifyScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
    </Stack.Navigator>
  );
}

// Stack for Favorites tab
function FavoritesTabStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: APP_BACKGROUND } }}>
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="Inbox" component={InboxScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen 
        name="ListingDetailsFromFavorites" 
        component={ListingDetailsScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen 
        name="ReservationDatePickerFromFavorites" 
        component={ReservationDatePickerScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="PickupCode"
        component={HandoverCodeScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="ReturnVerify"
        component={HandoverVerifyScreen}
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
      <Stack.Screen name="Inbox" component={InboxScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen
        name="ReservationDatePickerFromReservations"
        component={ReservationDatePickerScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen 
        name="ReservationDetailsFromReservations" 
        component={ReservationDetailsScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="PickupCode"
        component={HandoverCodeScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
    </Stack.Navigator>
  );
}

// Stack for Profile tab
function ProfileTabStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: APP_BACKGROUND } }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Inbox" component={InboxScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

// Client Navigation Component
export function ClientNavigation() {
  const insets = useSafeAreaInsets();

  const defaultTabBarStyle = {
    backgroundColor: '#0f1228',
    borderTopWidth: 0,
    marginHorizontal: 16,
    borderRadius: 18,
    height: 58,
    paddingTop: 10,
    paddingBottom: 10,
    position: 'absolute',
    bottom: 8 + (insets?.bottom || 0),
    left: 0,
    right: 0,
  };

  return (
    <FavoritesProvider>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          sceneContainerStyle: { backgroundColor: APP_BACKGROUND },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'HomeTab') {
              iconName = 'home-outline';
            } else if (route.name === 'FavoritesTab') {
              iconName = focused ? 'heart' : 'heart-outline';
            } else if (route.name === 'ReservationsTab') {
              iconName = 'calendar-outline';
            } else if (route.name === 'ProfileTab') {
              iconName = 'person-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: '#8a90b8',
          tabBarShowLabel: false,
          tabBarStyle: defaultTabBarStyle,
        })}
      >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeTabStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: 'HomeTab',
                    state: { routes: [{ name: 'Home' }] },
                  },
                ],
              })
            );
          },
        })}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);
          const hide = routeName && routeName !== 'Home';
          return { tabBarStyle: hide ? { display: 'none' } : defaultTabBarStyle };
        }}
      />
      <Tab.Screen 
        name="FavoritesTab" 
        component={FavoritesTabStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: 'FavoritesTab',
                    state: { routes: [{ name: 'Favorites' }] },
                  },
                ],
              })
            );
          },
        })}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);
          const hide = routeName && routeName !== 'Favorites';
          return {tabBarStyle: hide ? { display: 'none' } : defaultTabBarStyle };
        }}
      />
      <Tab.Screen 
        name="ReservationsTab" 
        component={ReservationsTabStack}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: 'ReservationsTab',
                    state: { routes: [{ name: 'ReservationsList' }] },
                  },
                ],
              })
            );
          },
        })}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);
          const hide = routeName && routeName !== 'ReservationsList';
          return { tabBarLabel: 'Réservations', tabBarStyle: hide ? { display: 'none' } : defaultTabBarStyle };
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileTabStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: 'ProfileTab',
                    state: { routes: [{ name: 'Profile' }] },
                  },
                ],
              })
            );
          },
        })}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);
          const hide = routeName && routeName !== 'Profile';
          return { tabBarLabel: 'Profil', tabBarStyle: hide ? { display: 'none' } : defaultTabBarStyle };
        }}
      />
    </Tab.Navigator>
    </FavoritesProvider>
  );
}
