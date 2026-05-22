import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { getNotificationUnreadCount } from '../../services/notifications';
import { getSocket } from '../../services/socketClient';

const clampBadge = (n) => {
  const x = Number(n) || 0;
  if (x <= 0) return '';
  if (x > 99) return '99+';
  return String(x);
};

const NotificationIconButton = ({ navigation, style, iconSize = 22, color = '#fff', routeParams }) => {
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const count = await getNotificationUnreadCount();
      setUnread(Number(count) || 0);
    } catch (_err) {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    let unsubscribed = false;
    let socket;

    const setup = async () => {
      try {
        socket = await getSocket();
      } catch (_err) {
        return () => {};
      }
      if (unsubscribed) return () => {};

      socket.on('notification_created', load);
      socket.on('notification_read', load);
      socket.on('notifications_all_read', load);

      return () => {
        socket.off('notification_created', load);
        socket.off('notification_read', load);
        socket.off('notifications_all_read', load);
      };
    };

    const teardownPromise = setup();
    return () => {
      unsubscribed = true;
      Promise.resolve(teardownPromise).then((teardown) => {
        if (typeof teardown === 'function') teardown();
      });
    };
  }, [load]);

  const badge = useMemo(() => clampBadge(unread), [unread]);

  return (
    <TouchableOpacity
      style={[styles.btn, style]}
      onPress={() => navigation.navigate('NotificationScreen', routeParams)}
      activeOpacity={0.85}
    >
      <Ionicons name="notifications-outline" size={iconSize} color={color} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { padding: 8 },
  badge: {
    position: 'absolute',
    right: 4,
    top: 3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff3b6b',
    borderWidth: 1,
    borderColor: 'rgba(15,18,40,0.8)',
  },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 10 },
});

export default NotificationIconButton;
