import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { getCurrentUserProfile } from '../../services/authSession';
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
  const [meId, setMeId] = useState(null);

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
    let cancelled = false;
    getCurrentUserProfile()
      .then((me) => {
        if (!cancelled) setMeId(me?.id || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

      const onCreated = (notification) => {
        if (!notification) return;
        if (!meId) return;
        const ownerId = String(notification.user_id || notification.userId || '');
        if (ownerId !== String(meId)) return;
        if (notification.is_read) return;

        setUnread((prev) => prev + 1);
        load();
      };

      const onRead = () => {
        setUnread((prev) => Math.max(0, prev - 1));
        load();
      };

      const onAllRead = () => {
        setUnread(0);
        load();
      };

      socket.on('connect', load);
      socket.on('notification_created', onCreated);
      socket.on('notification_read', onRead);
      socket.on('notifications_all_read', onAllRead);

      return () => {
        socket.off('connect', load);
        socket.off('notification_created', onCreated);
        socket.off('notification_read', onRead);
        socket.off('notifications_all_read', onAllRead);
      };
    };

    const teardownPromise = setup();
    return () => {
      unsubscribed = true;
      Promise.resolve(teardownPromise).then((teardown) => {
        if (typeof teardown === 'function') teardown();
      });
    };
  }, [load, meId]);

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
