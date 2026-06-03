import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { sendAssistantMessage } from '../../services/assistant';

const initialMessage = {
  role: 'assistant',
  content: 'Hi, I can help with reservations, vehicles, and your Rentify profile.',
  createdAt: new Date().toISOString(),
};

const quickPrompts = [
  'Show my reservations',
  //'Find automatic cars in Paris',
  'Show my profile',
];

const getMessageText = (message) => String(message?.content || '').trim();

const AssistantWidget = () => {
  const insets = useSafeAreaInsets();
  const { token, isAuthenticated } = useAuth();
  const scrollRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([initialMessage]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const bubbleBottom = Math.max(insets.bottom + 72, 82);
  const bubbleGap = 4;
  const panelBottom = bubbleBottom + 64 + bubbleGap;
  const panelTop = 52;

  const context = useMemo(
    () => messages
      .filter((message) => ['user', 'assistant'].includes(message.role))
      .slice(-10)
      .map((message) => ({
        role: message.role,
        content: getMessageText(message),
      })),
    [messages]
  );

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
    });
  };

  const sendMessage = async (overrideText) => {
    const text = String(overrideText || input).trim();
    if (!text || isSending) return;

    if (!isAuthenticated || !token) {
      setError('Please sign in to chat with the assistant.');
      return;
    }

    const userMessage = {
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setInput('');
    setError('');
    setIsSending(true);
    setMessages((prev) => [...prev, userMessage]);
    scrollToBottom();

    try {
      const response = await sendAssistantMessage({
        token,
        message: text,
        conversationId,
        context,
      });

      setConversationId(response.conversationId || conversationId);
      setMessages((prev) => [...prev, response.message]);
      scrollToBottom();
    } catch (err) {
      setError(err.message || 'Assistant unavailable.');
    } finally {
      setIsSending(false);
    }
  };

  const close = () => {
    setIsOpen(false);
    setError('');
  };

  const toggleOpen = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      {isOpen ? (
        <View pointerEvents="box-none" style={styles.floatingRoot}>
          <Pressable style={styles.scrim} onPress={close} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            pointerEvents="box-none"
            style={[styles.panelWrap, { top: panelTop, bottom: panelBottom }]}
          >
            <View style={styles.panel}>
              <View style={styles.header}>
                <View style={styles.headerIcon}>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                </View>
                <View style={styles.headerTextWrap}>
                  <Text style={styles.title}>Rentify Assistant</Text>
                  <Text style={styles.subtitle}>Reservations, vehicles, profile</Text>
                </View>
                <TouchableOpacity style={styles.iconButton} onPress={close} activeOpacity={0.8}>
                  <Ionicons name="close" size={20} color="#d8dcff" />
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={scrollRef}
                style={styles.messages}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={scrollToBottom}
              >
                {messages.map((message, index) => {
                  const isUser = message.role === 'user';
                  return (
                    <View
                      key={`${message.createdAt || index}-${index}`}
                      style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}
                    >
                      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                        <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
                          {getMessageText(message)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
                {isSending ? (
                  <View style={styles.typingRow}>
                    <ActivityIndicator size="small" color="#d8dcff" />
                    <Text style={styles.typingText}>Thinking...</Text>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.quickRow}>
                {quickPrompts.map((prompt) => (
                  <TouchableOpacity
                    key={prompt}
                    style={styles.quickChip}
                    onPress={() => sendMessage(prompt)}
                    activeOpacity={0.82}
                    disabled={isSending}
                  >
                    <Text style={styles.quickChipText}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color="#ffc4c4" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.composer}>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask Rentify..."
                  placeholderTextColor="#828ab5"
                  style={styles.input}
                  multiline
                  maxLength={1000}
                  editable={!isSending}
                  onSubmitEditing={() => {
                    if (Platform.OS !== 'web') return;
                    sendMessage();
                  }}
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!input.trim() || isSending) && styles.sendButtonDisabled]}
                  onPress={() => sendMessage()}
                  disabled={!input.trim() || isSending}
                  activeOpacity={0.82}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.bubble, { bottom: bubbleBottom }]}
        onPress={toggleOpen}
        activeOpacity={0.86}
        accessibilityRole="button"
        accessibilityLabel={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      >
        <Ionicons name={isOpen ? 'close' : 'sparkles'} size={22} color="#fff" />
        <Text style={styles.bubbleText}>AI</Text>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    right: 18,
    zIndex: 34,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C4DFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  bubbleText: {
    marginTop: 1,
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  floatingRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 31,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 3, 14, 0.28)',
  },
  panelWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 33,
  },
  panel: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.22)',
    backgroundColor: '#10142D',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(108, 77, 255, 0.9)',
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  subtitle: {
    color: '#98A0CB',
    fontSize: 12,
    marginTop: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.16)',
  },
  messages: {
    flex: 1,
    minHeight: 0,
  },
  messagesContent: {
    paddingVertical: 8,
  },
  messageRow: {
    width: '100%',
    marginBottom: 10,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  assistantRow: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '84%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#6C4DFF',
    borderBottomRightRadius: 5,
  },
  assistantBubble: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.16)',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
  },
  userText: {
    color: '#fff',
    fontWeight: '700',
  },
  assistantText: {
    color: '#ECF0FF',
  },
  typingRow: {
    alignSelf: 'flex-start',
    minHeight: 36,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  typingText: {
    color: '#d8dcff',
    fontSize: 12,
    fontWeight: '700',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  quickChip: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.18)',
  },
  quickChipText: {
    color: '#d8dcff',
    fontSize: 12,
    fontWeight: '700',
  },
  errorBox: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(235, 87, 87, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(235, 87, 87, 0.28)',
  },
  errorText: {
    flex: 1,
    color: '#ffd6d6',
    fontSize: 12,
    fontWeight: '600',
  },
  composer: {
    minHeight: 52,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.18)',
    backgroundColor: 'rgba(5, 7, 20, 0.52)',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    maxHeight: 92,
    minHeight: 38,
    paddingTop: 9,
    paddingBottom: 8,
    color: '#fff',
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C4DFF',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});

export default AssistantWidget;
