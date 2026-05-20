import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { getConversations, getOwnerClients } from '../../services/messages';

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

const InboxScreen = ({ navigation, route }) => {
  const mode = route?.params?.mode || 'conversations'; // 'conversations' | 'owner_clients'
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = mode === 'owner_clients' ? await getOwnerClients() : await getConversations();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Impossible de charger la messagerie');
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const headerRight = useMemo(() => (
    <TouchableOpacity style={styles.headerIcon} onPress={load} disabled={isLoading}>
      <Ionicons name="refresh-outline" size={20} color="#d6dbff" />
    </TouchableOpacity>
  ), [isLoading, load]);

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
            const last = item?.lastMessage || null;
            const unreadCount = item?.unreadCount || 0;
            const hasMessages = item?.hasMessages;
            const isEmptyOwnerClient = mode === 'owner_clients' && hasMessages === false;

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
                    <Text style={styles.avatarText}>{initialsFor(otherUser)}</Text>
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
                    <Text style={[styles.preview, unreadCount ? styles.previewUnread : null]} numberOfLines={1}>
                      {isEmptyOwnerClient ? "Aucune conversation — envoie le premier message" : (last?.message || '')}
                    </Text>
                    {unreadCount ? <View style={styles.unreadDot} /> : isEmptyOwnerClient ? <View style={styles.newPill}><Text style={styles.newPillText}>Nouveau</Text></View> : null}
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
  },
  avatarText: { color: '#d6dbff', fontWeight: '900' },
  rowBody: { flex: 1, marginLeft: 12 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  name: { flex: 1, color: '#f2f4ff', fontWeight: '800', fontSize: 15 },
  time: { color: 'rgba(214,219,255,0.55)', fontSize: 11, marginLeft: 8 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  preview: { flex: 1, color: 'rgba(214,219,255,0.65)', fontSize: 13 },
  previewUnread: { color: '#f2f4ff', fontWeight: '800' },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8f6cff',
    marginLeft: 10,
  },
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
