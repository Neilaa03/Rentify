import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';

import { getCurrentUserProfile } from '../../services/authSession';
import { getThread, markThreadRead, sendMessage } from '../../services/messages';
import { getSocket } from '../../services/socketClient';

const displayNameFor = (user) => {
  const first = (user?.firstName || user?.first_name || '').trim();
  const last = (user?.lastName || user?.last_name || '').trim();
  const full = `${first} ${last}`.trim();
  return full || user?.email || 'Discussion';
};

const keyForMessage = (m) => String(m?.id || `${m?.senderId}-${m?.receiverId}-${m?.createdAt}`);

const initialsFor = (user) => {
  const first = (user?.firstName || user?.first_name || '').trim();
  const last = (user?.lastName || user?.last_name || '').trim();
  const a = first ? first[0] : '?';
  const b = last ? last[0] : '';
  return (a + b).toUpperCase();
};

const ChatScreen = ({ navigation, route }) => {
  const otherUserId = route?.params?.otherUserId;
  const otherUser = route?.params?.otherUser || { id: otherUserId };
  const isNewConversation = Boolean(route?.params?.isNewConversation);

  const [me, setMe] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [isTypingOther, setIsTypingOther] = useState(false);

  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingSentAtRef = useRef(0);

  const appendMessage = useCallback((msg) => {
    if (!msg) return;
    setMessages((prev) => {
      const id = msg?.id;
      if (id && prev.some((m) => m?.id === id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const scrollToEnd = useCallback(() => {
    try {
      listRef.current?.scrollToEnd?.({ animated: true });
    } catch (_err) {
      // ignore
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const profile = await getCurrentUserProfile();
      setMe(profile);

      if (!otherUserId) throw new Error('Missing recipient');
      const thread = await getThread({ otherUserId });
      setMessages(Array.isArray(thread) ? thread : []);
      const updated = await markThreadRead({ otherUserId });
      const ids = new Set((updated || []).map((m) => m?.id).filter(Boolean));
      if (ids.size) {
        setMessages((prev) => prev.map((m) => (ids.has(m?.id) ? { ...m, isRead: true } : m)));
      }
      setTimeout(scrollToEnd, 50);
    } catch (e) {
      setError(e?.message || 'Impossible de charger la discussion');
    } finally {
      setIsLoading(false);
    }
  }, [otherUserId, scrollToEnd]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let unsubscribed = false;
    let socket;

    const setup = async () => {
      if (!me?.id || !otherUserId) return () => {};
      socket = await getSocket();
      if (unsubscribed) return;

      const onNewMessage = async (msg) => {
        if (!msg) return;
        const involvesThisThread =
          (msg.senderId === otherUserId && msg.receiverId === me?.id) ||
          (msg.senderId === me?.id && msg.receiverId === otherUserId);
        if (!involvesThisThread) return;

        appendMessage(msg);

        if (msg.senderId === otherUserId && msg.receiverId === me?.id) {
          try {
            const updated = await markThreadRead({ otherUserId });
            const ids = new Set((updated || []).map((m) => m?.id).filter(Boolean));
            if (ids.size) {
              setMessages((prev) => prev.map((m) => (ids.has(m?.id) ? { ...m, isRead: true } : m)));
            }
          } catch (_err) {}
        }

        setTimeout(scrollToEnd, 30);
      };

      const onMessageRead = (updated) => {
        if (!updated?.id) return;
        setMessages((prev) => prev.map((m) => (m?.id === updated.id ? { ...m, isRead: true } : m)));
      };

      const onThreadRead = (payload) => {
        const ids = payload?.messageIds;
        if (!Array.isArray(ids) || ids.length === 0) return;
        setMessages((prev) => prev.map((m) => (ids.includes(m?.id) ? { ...m, isRead: true } : m)));
      };

      const onTyping = (payload) => {
        if (!payload) return;
        if (payload.from !== otherUserId) return;
        setIsTypingOther(Boolean(payload.isTyping));
      };

      socket.on('new_message', onNewMessage);
      socket.on('message_sent', onNewMessage);
      socket.on('message_read', onMessageRead);
      socket.on('thread_read', onThreadRead);
      socket.on('typing', onTyping);

      return () => {
        socket.off('new_message', onNewMessage);
        socket.off('message_sent', onNewMessage);
        socket.off('message_read', onMessageRead);
        socket.off('thread_read', onThreadRead);
        socket.off('typing', onTyping);
      };
    };

    const teardownPromise = setup();
    return () => {
      unsubscribed = true;
      Promise.resolve(teardownPromise).then((teardown) => {
        if (typeof teardown === 'function') teardown();
      });
    };
  }, [appendMessage, me?.id, otherUserId, scrollToEnd]);

  const sendTyping = useCallback(async (isTyping) => {
    if (!otherUserId) return;
    const now = Date.now();
    if (isTyping) {
      if (now - lastTypingSentAtRef.current < 900) return;
      lastTypingSentAtRef.current = now;
    }
    try {
      const socket = await getSocket();
      socket.emit('typing', { to: otherUserId, isTyping });
    } catch (_err) {
      // ignore
    }
  }, [otherUserId]);

  const onChangeText = useCallback((next) => {
    setText(next);
    sendTyping(next.trim().length > 0);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 1200);
  }, [sendTyping]);

  const onSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!otherUserId) return;

    setText('');
    sendTyping(false);
    try {
      const saved = await sendMessage({ receiverId: otherUserId, message: trimmed });
      appendMessage(saved);
      setTimeout(scrollToEnd, 30);
    } catch (e) {
      setText(trimmed);
    }
  }, [appendMessage, otherUserId, scrollToEnd, sendTyping, text]);

  const title = useMemo(() => displayNameFor(otherUser), [otherUser]);

  const lastOutgoingId = useMemo(() => {
    if (!me?.id) return null;
    for (let i = (messages?.length || 0) - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m?.senderId === me.id) return m?.id || null;
    }
    return null;
  }, [me?.id, messages]);

  const renderItem = useCallback(
    ({ item }) => {
      const mine = item?.senderId === me?.id;
      const isLastOutgoing = mine && lastOutgoingId && item?.id === lastOutgoingId;
      const statusColor = item?.isRead ? COLORS.primary : 'rgba(214,219,255,0.65)';
      const statusIcon = item?.isRead ? 'checkmark-done' : 'checkmark-done';
      return (
        <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
          {mine ? (
            <LinearGradient
              colors={[COLORS.secondary, COLORS.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.bubble, styles.bubbleMine]}
            >
              <Text style={styles.bubbleTextMine}>{item?.message || ''}</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.bubble, styles.bubbleTheirs]}>
              <Text style={styles.bubbleTextTheirs}>{item?.message || ''}</Text>
            </View>
          )}
          {isLastOutgoing ? (
            <View style={styles.statusRow}>
              <Ionicons name={statusIcon} size={14} color={statusColor} />
            </View>
          ) : null}
        </View>
      );
    },
    [isNewConversation, lastOutgoingId, me?.id],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#d6dbff" />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{initialsFor(otherUser)}</Text>
          </View>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            {isTypingOther ? <Text style={styles.typing}>en train d'ecrire...</Text> : null}
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIcon} onPress={load} disabled={isLoading}>
            <Ionicons name="refresh-outline" size={20} color="#d6dbff" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.state}>
          <Text style={styles.stateTitle}>Chargement...</Text>
        </View>
      ) : error ? (
        <View style={styles.state}>
          <Text style={styles.stateTitle}>Erreur</Text>
          <Text style={styles.stateSubtitle}>{error}</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={keyForMessage}
            contentContainerStyle={styles.list}
            renderItem={renderItem}
            onContentSizeChange={scrollToEnd}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{isNewConversation ? 'Conversation non activée' : 'Nouveau chat'}</Text>
                <Text style={styles.emptySubtitle}>
                  {isNewConversation ? 'Aucun message pour le moment. Envoie le premier.' : 'Envoie ton premier message.'}
                </Text>
              </View>
            }
          />

          <View style={styles.composer}>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85}>
              <Ionicons name="camera-outline" size={22} color="#d6dbff" />
            </TouchableOpacity>
            <View style={styles.inputPill}>
              <TextInput
                value={text}
                onChangeText={onChangeText}
                placeholder="Message..."
                placeholderTextColor="rgba(214,219,255,0.55)"
                style={styles.input}
                multiline
              />
              <TouchableOpacity style={styles.sendBtn} onPress={onSend} activeOpacity={0.85}>
                <Ionicons name="arrow-up" size={18} color="#0f1228" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(23, 26, 54, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerAvatarText: { color: '#d6dbff', fontWeight: '900', fontSize: 12 },
  headerTitleWrap: { flex: 1 },
  headerTitle: { color: '#f2f4ff', fontSize: 15, fontWeight: '900' },
  typing: { marginTop: 2, color: 'rgba(214,219,255,0.55)', fontSize: 11 },
  body: { flex: 1 },
  list: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 10, flexGrow: 1 },
  bubbleRow: { marginBottom: 8 },
  bubbleRowMine: { alignItems: 'flex-end' },
  bubbleRowTheirs: { alignItems: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 22, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleMine: { borderTopRightRadius: 8 },
  bubbleTheirs: { backgroundColor: 'rgba(23, 26, 54, 0.92)', borderTopLeftRadius: 8, borderWidth: 1, borderColor: 'rgba(145, 152, 229, 0.18)' },
  bubbleTextMine: { color: '#fff', fontSize: 15, lineHeight: 20, fontWeight: '700' },
  bubbleTextTheirs: { color: '#f2f4ff', fontSize: 15, lineHeight: 20 },
  statusRow: { marginTop: 4, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 18 },
  emptyTitle: { color: '#f2f4ff', fontWeight: '900', fontSize: 16 },
  emptySubtitle: { color: 'rgba(214,219,255,0.65)', textAlign: 'center', marginTop: 8, fontSize: 13 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15, 18, 40, 0.9)',
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  inputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginLeft: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.22)',
    backgroundColor: 'rgba(18, 21, 46, 0.95)',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    minHeight: 32,
    maxHeight: 110,
    color: '#f2f4ff',
    paddingRight: 8,
    paddingVertical: 6,
    fontSize: 15,
  },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f2f4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  stateTitle: { color: '#f2f4ff', fontWeight: '900', fontSize: 15 },
  stateSubtitle: { color: 'rgba(214,219,255,0.65)', textAlign: 'center', marginTop: 8 },
});

export default ChatScreen;
