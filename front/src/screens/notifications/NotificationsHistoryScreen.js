import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  deleteNotification,
  getNotifications,
  getNotificationUnreadCount,
  markNotificationAsRead,
} from '../../services/notifications';

const NotificationRow = ({ item, onPress, onDelete }) => (
  <View style={[styles.notificationRow, !item.is_read && styles.unreadNotification]}>
    <TouchableOpacity style={styles.rowBody} onPress={() => onPress(item)} activeOpacity={0.85}>
      <View style={styles.notificationHeader}>
        <Text style={[styles.notificationTitle, !item.is_read && styles.notificationTitleUnread]}>
          {item.title}
        </Text>
        {!item.is_read && <View style={styles.unreadDot} />}
      </View>
      <Text style={styles.notificationMessage}>{item.message}</Text>
      <Text style={styles.notificationDate}>{new Date(item.created_at).toLocaleString()}</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.deleteIconBtn} onPress={() => onDelete(item)} activeOpacity={0.8}>
      <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
    </TouchableOpacity>
  </View>
);

const NotificationsHistoryScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [items, count] = await Promise.all([getNotifications({ filter: 'all' }), getNotificationUnreadCount()]);
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
    if (!notification?.id) return;

    if (!notification.is_read) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (_err) {
        // ignore
      }
    }
  };

  const handleDelete = async (notification) => {
    Alert.alert('Supprimer', 'Masquer cette notification ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Masquer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNotification(notification.id);
            setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
            if (!notification.is_read) setUnreadCount((prev) => Math.max(0, prev - 1));
          } catch (err) {
            Alert.alert('Erreur', err.message || 'Impossible de masquer');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Historique</Text>
          <View style={styles.markAllButton} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8f6cff" />
          </View>
        ) : error ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationRow
                item={item}
                onPress={handleNotificationPress}
                onDelete={handleDelete}
              />
            )}
            contentContainerStyle={notifications.length === 0 ? styles.emptyListContainer : styles.listContainer}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Aucune notification</Text>
                <Text style={styles.emptySubtitle}>Rien à afficher.</Text>
              </View>
            )}
            refreshing={isLoading}
            onRefresh={handleRefresh}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090b1e' },
  safeArea: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  backButton: { padding: 8 },
  screenTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },
  markAllButton: { paddingVertical: 8, paddingHorizontal: 12, minWidth: 70, alignItems: 'flex-end' },
  listContainer: { paddingBottom: 28 },
  emptyListContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notificationRow: {
    borderRadius: 16,
    backgroundColor: 'rgba(23, 26, 54, 0.92)',
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  rowBody: { flex: 1, padding: 16 },
  unreadNotification: { borderWidth: 1, borderColor: '#8f6cff' },
  deleteIconBtn: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(148, 156, 233, 0.12)',
    backgroundColor: 'rgba(15, 18, 40, 0.35)',
  },
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
  emptySubtitle: { color: '#8e95bf', textAlign: 'center' },
});

export default NotificationsHistoryScreen;
