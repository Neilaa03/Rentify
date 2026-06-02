import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator } from
'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getNotifications,
  getNotificationUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead } from
'../../services/notifications';
import storage from '../../utils/storage';
import { API_ENDPOINTS } from '../../constants/api';import { useTranslation } from "react-i18next";

const NotificationRow = ({ item, onPress }) =>
<TouchableOpacity
  style={[styles.notificationRow, !item.is_read && styles.unreadNotification]}
  onPress={() => onPress(item)}
  activeOpacity={0.85}>
  
    <View style={styles.notificationHeader}>
      <Text style={[styles.notificationTitle, !item.is_read && styles.notificationTitleUnread]}>
        {item.title}
      </Text>
      {!item.is_read && <View style={styles.unreadDot} />}
    </View>
    <Text style={styles.notificationMessage}>{item.message}</Text>
    <Text style={styles.notificationDate}>{new Date(item.created_at).toLocaleString()}</Text>
  </TouchableOpacity>;


const UnreadNotificationsScreen = ({ navigation, route }) => {const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');
  const user = route?.params?.user;
  const isOwner = user?.role === 'owner';

  const navigateToOwnerReservationDetails = async (reservationId) => {
    try {
      const token = await storage.getItemAsync('userToken');
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.RESERVATIONS.GET(reservationId), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) return;

      const reservation = await response.json();
      const listing = reservation?.listing || reservation?.listing?.car || null;

      navigation.navigate('OwnerReservationDetails', {
        reservation,
        listing,
        token,
        user
      });
    } catch (err) {
      console.warn('Error loading owner reservation from notification:', err);
    }
  };

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [items, count] = await Promise.all([
      getNotifications({ filter: 'unread' }),
      getNotificationUnreadCount()]
      );
      setNotifications(Array.isArray(items) ? items : []);
      setUnreadCount(Number(count) || 0);
    } catch (err) {
      setError(err.message || 'Impossible de charger les notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleRefresh = async () => {
    await loadNotifications();
  };

  const handleNotificationPress = async (notification) => {
    try {
      await markNotificationAsRead(notification.id);
      setNotifications((prev) => prev.map((n) => n.id === notification.id ? { ...n, is_read: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - (notification.is_read ? 0 : 1)));
    } catch (err) {
      console.warn('Error marking notification as read:', err);
    }

    const { type, data } = notification;

    if (
    type === 'reservation_created' ||
    type === 'reservation_confirmed' ||
    type === 'reservation_rejected' ||
    type === 'payment_success')
    {
      const reservationId = data?.reservationId;
      if (reservationId) {
        if (isOwner) {
          await navigateToOwnerReservationDetails(reservationId);
        } else {
          navigation.navigate('ReservationDetails', { reservationId });
        }
      }
    }

    if (type === 'message') {
      const conversationId = data?.conversationId || data?.messageId;
      navigation.navigate('Chat', { conversationId });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      setError(err.message || 'Impossible de marquer toutes les notifications comme lues');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{`Notifications (${unreadCount})`}</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => navigation.navigate('NotificationsHistory', { user })}
              style={styles.iconButton}
              activeOpacity={0.85}>
              
              <Ionicons name="time-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton} activeOpacity={0.85}>
              <Text style={styles.markAllText}>{t("screens.notifications.unreadnotificationsscreen.toutLire")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ?
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8f6cff" />
          </View> :
        error ?
        <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View> :

        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationRow item={item} onPress={handleNotificationPress} />}
          contentContainerStyle={notifications.length === 0 ? styles.emptyListContainer : styles.listContainer}
          ListEmptyComponent={() =>
          <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{t("screens.notifications.unreadnotificationsscreen.aucuneNotificationNonLue")}</Text>
                <Text style={styles.emptySubtitle}>{t("screens.notifications.unreadnotificationsscreen.vousEtesAJour")}</Text>
              </View>
          }
          refreshing={isLoading}
          onRefresh={handleRefresh} />

        }
      </SafeAreaView>
    </View>);

};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090b1e' },
  safeArea: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backButton: { padding: 8 },
  iconButton: { padding: 8 },
  screenTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },
  markAllButton: { paddingVertical: 8, paddingHorizontal: 10 },
  markAllText: { color: '#8f6cff', fontWeight: '700' },
  listContainer: { paddingBottom: 28 },
  emptyListContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notificationRow: {
    borderRadius: 16,
    backgroundColor: 'rgba(23, 26, 54, 0.92)',
    padding: 16,
    marginBottom: 12
  },
  unreadNotification: { borderWidth: 1, borderColor: '#8f6cff' },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  notificationTitle: { color: '#f6f8ff', fontSize: 15, fontWeight: '700', paddingRight: 10, flex: 1 },
  notificationTitleUnread: { color: '#8f6cff' },
  unreadDot: { width: 10, height: 10, borderRadius: 10, backgroundColor: '#f63e77' },
  notificationMessage: { color: '#c2c6de', fontSize: 13, marginBottom: 10 },
  notificationDate: { color: '#7d85b7', fontSize: 11 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ff7b89', textAlign: 'center' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyTitle: { color: '#f6f8ff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { color: '#8e95bf', textAlign: 'center' }
});

export default UnreadNotificationsScreen;