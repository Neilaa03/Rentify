import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const ChatScreen = ({ navigation, route }) => {
  const conversationId = route?.params?.conversationId;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Chat</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.content}>
          <Text style={styles.chatLabel}>Conversation</Text>
          <Text style={styles.chatId}>{conversationId || 'Aucun identifiant de conversation'}</Text>
          <Text style={styles.chatHint}>
            Cette page est prête pour être connectée à votre système de messagerie.
          </Text>
        </View>
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
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  chatLabel: { color: '#8f6cff', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  chatId: { color: '#f6f8ff', fontSize: 18, fontWeight: '700', marginBottom: 14, textAlign: 'center' },
  chatHint: { color: '#8e95bf', textAlign: 'center', lineHeight: 22 },
});

export default ChatScreen;
