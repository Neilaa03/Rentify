import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { getConversations, getOwnerClientsExpanded } from '../../services/messages';
import { getCurrentUserProfile } from '../../services/authSession';
import { getSocket } from '../../services/socketClient';
import { buildApiUrl } from '../../services/api';

const initialsFor = (user) => {
  const first = (user?.firstName || user?.first_name || '').trim();
  const last = (user?.lastName || user?.last_name || '').trim();
  const a = first ? first[0] : '?';
  const b = last ? last[0] : '';
  return (a + b).toUpperCase();
};

const displayNameFor = (user) => {
  const first = (user?.firstName || user?.first_name || '').trim();
  const last = (user?.lastName || user?.last_name || '').trim();
  const full = `${first} ${last}`.trim();
  return full || user?.email || 'Utilisateur';
};

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
};

const IMAGE_PREFIX = '__image__:';

const avatarUriFor = (user) => {
  const raw =
    user?.profilePicture ||
    user?.profile_picture ||
    user?.avatar ||
    user?.avatarUrl ||
    user?.photoUrl ||
    '';
  const uri = String(raw || '').trim();
  if (!uri) return null;
  if (/^https?:\/\//i.test(uri)) return uri;
  const path = uri.startsWith('/') ? uri : `/${uri}`;
  return buildApiUrl(path);
};

const InboxScreen = ({ navigation, route }) => {
  const mode = route?.params?.mode || 'conversations'; // 'conversations' | 'owner_clients'
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [typingByUser, setTypingByUser] = useState({});
  const typingTimeoutsRef = useRef({});
  const [meId, setMeId] = useState(null);
  const reloadTimerRef = useRef(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    try {
      const hasContent = items.length > 0;
      if (!silent && !hasContent) setIsLoading(true);
      if (silent || hasContent) setIsRefreshing(true);
      if (!silent) setError('');
      const data = mode === 'owner_clients' ? await getOwnerClientsExpanded() : await getConversations();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      if (!silent) setError(e?.message || 'Impossible de charger la messagerie');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [items.length, mode]);

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

    const scheduleReload = () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = setTimeout(() => {
        load({ silent: true });
      }, 120);
    };

    const setup = async () => {
      try {
        socket = await getSocket();
      } catch (_err) {
        return () => {};
      }
      if (unsubscribed) return () => {};

      const onTyping = (payload) => {
        const from = payload?.from;
        if (!from) return;
        const isTyping = Boolean(payload?.isTyping);

        setTypingByUser((prev) => ({ ...prev, [from]: isTyping }));

        if (typingTimeoutsRef.current[from]) clearTimeout(typingTimeoutsRef.current[from]);
        if (isTyping) {
          typingTimeoutsRef.current[from] = setTimeout(() => {
            setTypingByUser((prev) => ({ ...prev, [from]: false }));
          }, 2200);
        }
      };

      const onNewMessage = (msg) => {
        if (!msg) return;
        // Always refresh as a correctness fallback (covers unknown threads / payload mismatches).
        scheduleReload();

        if (!meId) return;

        const incoming = msg.receiverId === meId;
        const outgoing = msg.senderId === meId;
        if (!incoming && !outgoing) return;

        const otherId = incoming ? msg.senderId : msg.receiverId;
        if (!otherId) return;

        setItems((prev) => {
          const rows = Array.isArray(prev) ? prev : [];
          const idx = rows.findIndex((r) => String(r?.otherUser?.id || r?.otherUserId) === String(otherId));
          if (idx < 0) {
            // If not present, rely on the scheduled reload.
            return rows;
          }

          const row = rows[idx] || {};
          const nextUnread = incoming ? (Number(row?.unreadCount) || 0) + 1 : Number(row?.unreadCount) || 0;

          const nextRow = {
            ...row,
            hasMessages: true,
            unreadCount: nextUnread,
            lastMessage: msg,
          };

          const next = [...rows];
          next.splice(idx, 1);
          return [nextRow, ...next];
        });
      };

      const onThreadRead = () => {
        // Keep it simple + correct: refresh counts from server.
        load();
      };

      socket.on('typing', onTyping);
      socket.on('new_message', onNewMessage);
      socket.on('message_sent', onNewMessage);
      socket.on('thread_read', onThreadRead);
      socket.on('message_read', onThreadRead);

      return () => {
        socket.off('typing', onTyping);
        socket.off('new_message', onNewMessage);
        socket.off('message_sent', onNewMessage);
        socket.off('thread_read', onThreadRead);
        socket.off('message_read', onThreadRead);
      };
    };

    const teardownPromise = setup();
    return () => {
      unsubscribed = true;
      Object.values(typingTimeoutsRef.current || {}).forEach((t) => clearTimeout(t));
      typingTimeoutsRef.current = {};
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = null;
      Promise.resolve(teardownPromise).then((teardown) => {
        if (typeof teardown === 'function') teardown();
      });
    };
  }, [load, meId]);

  const headerRight = useMemo(() => (
    <TouchableOpacity style={styles.headerIcon} onPress={() => load()} disabled={isLoading}>
      {isRefreshing ? (
        <Ionicons name="sync-outline" size={20} color="#d6dbff" />
      ) : (
        <Ionicons name="refresh-outline" size={20} color="#d6dbff" />
      )}
    </TouchableOpacity>
  ), [isLoading, isRefreshing, load]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mode === 'owner_clients' ? 'Clients' : 'Messages'}</Text>
        {headerRight}
      </View>

      {isLoading ? (
        <View style={styles.state}>
          <Text style={styles.stateTitle}>Chargement...</Text>
        </View>
      ) : error ? (
        <View style={styles.state}>
          <Text style={styles.stateTitle}>Erreur</Text>
          <Text style={styles.stateSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Reessayer</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.state}>
          <Text style={styles.stateTitle}>Aucune discussion</Text>
          <Text style={styles.stateSubtitle}>
            {mode === 'owner_clients'
              ? "Aucun client pour l'instant."
              : 'Commence une conversation depuis une annonce.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item?.otherUser?.id || item?.otherUserId)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const otherUser = item?.otherUser || null;
            const avatarUri = avatarUriFor(otherUser);
            const last = item?.lastMessage || null;
            const unreadCount = item?.unreadCount || 0;
            const hasMessages = item?.hasMessages;
            const isEmptyOwnerClient = mode === 'owner_clients' && hasMessages === false;
            const isTyping = Boolean(otherUser?.id && typingByUser?.[otherUser.id]);
            const previewText = (() => {
              if (isTyping) return 'Typing...';
              if (isEmptyOwnerClient) return "Aucune conversation — envoie le premier message";
              if (unreadCount > 1) return `+${unreadCount} new messages`;
              const msg = last?.message || '';
              if (typeof msg === 'string' && msg.startsWith(IMAGE_PREFIX)) return 'Photo';
              return msg;
            })();

            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() =>
                  navigation.navigate('Chat', {
                    otherUserId: otherUser?.id,
                    otherUser,
                    isNewConversation: isEmptyOwnerClient,
                  })
                }
                activeOpacity={0.85}
              >
                <View style={[styles.avatarRing, unreadCount ? styles.avatarRingUnread : null]}>
                  <View style={styles.avatar}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>{initialsFor(otherUser)}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.name} numberOfLines={1}>
                      {displayNameFor(otherUser)}
                    </Text>
                    <Text style={styles.time}>{formatTime(last?.createdAt)}</Text>
                  </View>
                  <View style={styles.rowBottom}>
                    <Text
                      style={[
                        styles.preview,
                        unreadCount ? styles.previewUnread : null,
                        isTyping ? styles.previewTyping : null,
                      ]}
                      numberOfLines={1}
                    >
                      {previewText}
                    </Text>
                    {unreadCount ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
                      </View>
                    ) : isEmptyOwnerClient ? (
                      <View style={styles.newPill}>
                        <Text style={styles.newPillText}>Nouveau</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1228' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerIcon: { padding: 8 },
  headerTitle: { flex: 1, textAlign: 'center', color: '#f2f4ff', fontSize: 18, fontWeight: '800' },
  list: { paddingHorizontal: 14, paddingBottom: 18, paddingTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  avatarRingUnread: {
    backgroundColor: 'rgba(47, 123, 255, 0.22)',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(23, 26, 54, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarText: { color: '#d6dbff', fontWeight: '900' },
  rowBody: { flex: 1, marginLeft: 12 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  name: { flex: 1, color: '#f2f4ff', fontWeight: '800', fontSize: 15 },
  time: { color: 'rgba(214,219,255,0.55)', fontSize: 11, marginLeft: 8 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  preview: { flex: 1, color: 'rgba(214,219,255,0.65)', fontSize: 13 },
  previewUnread: { color: '#f2f4ff', fontWeight: '800' },
  previewTyping: { color: 'rgba(143,108,255,0.95)', fontWeight: '800' },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8f6cff',
    marginLeft: 10,
  },
  unreadBadgeText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  newPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(79, 140, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(79, 140, 255, 0.35)',
    marginLeft: 10,
  },
  newPillText: { color: '#d6dbff', fontWeight: '800', fontSize: 11 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  stateTitle: { color: '#fff', fontWeight: '900', fontSize: 15 },
  stateSubtitle: { color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: 8 },
  retry: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(47, 123, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(47, 123, 255, 0.35)',
  },
  retryText: { color: '#fff', fontWeight: '800' },
});

export default InboxScreen;
