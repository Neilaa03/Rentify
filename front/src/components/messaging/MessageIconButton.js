import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { getCurrentUserProfile } from '../../services/authSession';
import { getConversations, getOwnerClientsExpanded } from '../../services/messages';
import { getSocket } from '../../services/socketClient';

const clampBadge = (n) => {
  const x = Number(n) || 0;
  if (x <= 0) return '';
  if (x > 99) return '99+';
  return String(x);
};

const sumUnread = (rows) =>
  (Array.isArray(rows) ? rows : []).reduce((acc, row) => acc + (Number(row?.unreadCount) || 0), 0);

const MessageIconButton = ({ navigation, mode = 'conversations', style, iconSize = 22, color = '#fff' }) => {
  const [unread, setUnread] = useState(0);
  const [meId, setMeId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = mode === 'owner_clients' ? await getOwnerClientsExpanded() : await getConversations();
      setUnread(sumUnread(data));
    } catch (_err) {
      // ignore
    }
  }, [mode]);

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

      const onNewMessage = (msg) => {
        if (!msg) return;
        if (!meId) return;
        if (msg.receiverId !== meId) return;
        load();
      };

      socket.on('new_message', onNewMessage);
      socket.on('message_sent', onNewMessage);
      socket.on('thread_read', load);
      socket.on('message_read', load);

      return () => {
        socket.off('new_message', onNewMessage);
        socket.off('message_sent', onNewMessage);
        socket.off('thread_read', load);
        socket.off('message_read', load);
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
      onPress={() => navigation.navigate('Inbox', mode === 'owner_clients' ? { mode: 'owner_clients' } : undefined)}
      activeOpacity={0.85}
    >
      <Ionicons name="chatbubble-ellipses-outline" size={iconSize} color={color} />
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

export default MessageIconButton;
