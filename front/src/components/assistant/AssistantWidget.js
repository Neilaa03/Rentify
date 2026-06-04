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

const buildToolReferenceContext = (toolResults = []) => {
  const lines = [];

  toolResults.forEach((result) => {
    if (result.type === 'vehicles') {
      (result.items || []).forEach((item, index) => {
        lines.push(`Vehicle ${index + 1}: listingId=${item.id}; carId=${item.car?.id || ''}; name=${item.carName || ''}; listing=${item.listingTitle || ''}`);
      });
    }

    if (result.type === 'listing') {
      const listing = result.listing || {};
      lines.push(`Current listing: listingId=${listing.id || ''}; carId=${listing.car?.id || ''}; name=${listing.carName || ''}`);
    }

    if (result.type === 'car') {
      const car = result.car || {};
      lines.push(`Current car: carId=${car.id || ''}; name=${car.name || ''}; listingId=${car.listing?.id || ''}`);
    }

    if (result.type === 'reservations') {
      (result.items || []).forEach((item, index) => {
        lines.push(`Reservation ${index + 1}: reservationId=${item.id}; listingId=${item.listingId || ''}; name=${item.title || ''}`);
      });
    }
  });

  return lines.length ? `\n\nHidden numbered references:\n${lines.join('\n')}` : '';
};

const getCardIntroText = (content) => {
  const lines = String(content || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const intro = lines.find((line) => !/^[-*•]\s+/.test(line) && !/^\*\*?[^:*]+:\*\*?/.test(line));
  if (!intro) return 'Here is what I found:';
  return intro.length > 130 ? `${intro.slice(0, 127).trim()}...` : intro;
};

const renderInlineMarkdown = (text, baseStyle, boldStyle) => {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    const isBold = part.startsWith('**') && part.endsWith('**');
    const clean = isBold ? part.slice(2, -2) : part;
    return (
      <Text key={`${clean}-${index}`} style={[baseStyle, isBold && boldStyle]}>
        {clean}
      </Text>
    );
  });
};

const renderMessageContent = (content, baseStyle, boldStyle) => {
  const lines = String(content || '').split('\n');

  return lines.map((line, index) => {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    const bulletText = bulletMatch ? bulletMatch[1] : '';
    const labelMatch = (bulletText || trimmed).match(/^\*\*?([^:*]+):\*\*?\s*(.*)$/);

    if (!trimmed) {
      return <View key={`empty-${index}`} style={styles.messageSpacer} />;
    }

    if (labelMatch) {
      return (
        <View key={`${line}-${index}`} style={styles.detailRow}>
          <Text style={[baseStyle, styles.detailLabel]}>{labelMatch[1].trim()}</Text>
          <Text style={[baseStyle, styles.detailValue]}>
            {renderInlineMarkdown(labelMatch[2].trim(), baseStyle, boldStyle)}
          </Text>
        </View>
      );
    }

    if (bulletMatch) {
      return (
        <View key={`${line}-${index}`} style={styles.bulletRow}>
          <Text style={[baseStyle, styles.bulletDot]}>•</Text>
          <Text style={[baseStyle, styles.bulletText]}>
            {renderInlineMarkdown(bulletText, baseStyle, boldStyle)}
          </Text>
        </View>
      );
    }

    return (
      <Text key={`${line}-${index}`} style={[baseStyle, styles.paragraphText]}>
        {renderInlineMarkdown(trimmed, baseStyle, boldStyle)}
      </Text>
    );
  });
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return 'Not set';
  return String(value);
};

const formatDate = (value) => {
  if (!value) return 'Not set';
  const raw = String(value).slice(0, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(value);
  return `${match[3]}-${match[2]}-${match[1]}`;
};

const formatDateRange = (start, end) => `${formatDate(start)} → ${formatDate(end)}`;

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{formatValue(value)}</Text>
  </View>
);

const StatChip = ({ value, label }) => (
  <View style={styles.statPill}>
    <Text style={styles.statPillNumber}>{value || 0}</Text>
    <Text style={styles.statPillLabel}>{label}</Text>
  </View>
);

const ToolResultCards = ({ results = [] }) => {
  if (!Array.isArray(results) || results.length === 0) return null;

  return (
    <View style={styles.toolResults}>
      {results.map((result, index) => {
        if (result.type === 'profile') {
          const profile = result.profile || {};
          return (
            <View key={`${result.type}-${index}`} style={styles.resultCard}>
              <Text style={styles.resultTitle}>{result.title}</Text>
              <View style={styles.resultGrid}>
                <View style={styles.resultCell}>
                  <Text style={styles.resultLabel}>Name</Text>
                  <Text style={styles.resultValue}>{formatValue(profile.name)}</Text>
                </View>
                <View style={styles.resultCell}>
                  <Text style={styles.resultLabel}>Email</Text>
                  <Text style={styles.resultValue}>{formatValue(profile.email)}</Text>
                </View>
                <View style={styles.resultCell}>
                  <Text style={styles.resultLabel}>Phone</Text>
                  <Text style={styles.resultValue}>{formatValue(profile.phone)}</Text>
                </View>
                <View style={styles.resultCell}>
                  <Text style={styles.resultLabel}>Status</Text>
                  <Text style={styles.resultValue}>{formatValue(profile.verificationStatus)}</Text>
                </View>
              </View>
              <View style={styles.statRow}>
                <StatChip value={profile.reservations} label="Reservations" />
                <StatChip value={profile.favorites} label="Favorites" />
                <StatChip value={profile.reviews} label="Reviews" />
              </View>
            </View>
          );
        }

        if (result.type === 'reservations') {
          return (
            <View key={`${result.type}-${index}`} style={styles.resultCard}>
              <Text style={styles.resultTitle}>{result.title}</Text>
              {(result.items || []).length ? result.items.map((item, itemIndex) => (
                <View key={item.id} style={styles.listItem}>
                  <Text style={styles.listTitle}>Reservation {itemIndex + 1}</Text>
                  <InfoRow label="Vehicle" value={item.title} />
                  <InfoRow label="Location" value={item.city} />
                  <InfoRow label="Period" value={formatDateRange(item.startDate, item.endDate)} />
                  <InfoRow label="Status" value={item.status} />
                  <InfoRow label="Total price" value={item.totalPrice} />
                </View>
              )) : <Text style={styles.emptyResult}>No reservations found.</Text>}
            </View>
          );
        }

        if (result.type === 'reservation') {
          const reservation = result.reservation || {};
          return (
            <View key={`${result.type}-${index}`} style={styles.resultCard}>
              <Text style={styles.resultTitle}>{result.title}</Text>
              <View style={styles.singleResultHeader}>
                <Text style={styles.singleResultName}>{formatValue(reservation.carName || reservation.title)}</Text>
                <Text style={styles.singleResultMeta}>{[reservation.city, reservation.country].filter(Boolean).join(', ') || 'Location not set'}</Text>
              </View>
              <InfoRow label="Listing" value={reservation.title} />
              <InfoRow label="Period" value={formatDateRange(reservation.startDate, reservation.endDate)} />
              <InfoRow label="Status" value={reservation.status} />
              <InfoRow label="Total price" value={reservation.totalPrice} />
              <InfoRow label="Pickup" value={reservation.pickup?.method} />
              <InfoRow label="Pickup status" value={reservation.pickup?.status} />
              <InfoRow label="Transmission" value={reservation.vehicle?.transmission} />
              <InfoRow label="Fuel" value={reservation.vehicle?.fuelType} />
              <InfoRow label="Seats" value={reservation.vehicle?.seats} />
              <InfoRow label="Price/day" value={reservation.pricePerDay} />
            </View>
          );
        }

        if (result.type === 'vehicles') {
          return (
            <View key={`${result.type}-${index}`} style={styles.resultCard}>
              <Text style={styles.resultTitle}>{result.title}</Text>
              {(result.items || []).length ? result.items.map((item, itemIndex) => (
                <View key={item.id} style={styles.listItem}>
                  <Text style={styles.listTitle}>Vehicle {itemIndex + 1}</Text>
                  <InfoRow label="Car" value={item.carName || `${item.car?.brand || ''} ${item.car?.model || ''}`.trim()} />
                  <InfoRow label="Listing" value={item.listingTitle} />
                  <InfoRow label="Location" value={item.city} />
                  <InfoRow label="Transmission" value={item.car?.transmission} />
                  <InfoRow label="Fuel" value={item.car?.fuelType} />
                  <InfoRow label="Price/day" value={item.pricePerDay} />
                </View>
              )) : <Text style={styles.emptyResult}>No vehicles found.</Text>}
            </View>
          );
        }

        if (result.type === 'listing') {
          const listing = result.listing || {};
          const details = result.details || {};
          return (
            <View key={`${result.type}-${index}`} style={styles.resultCard}>
              <Text style={styles.resultTitle}>{result.title}</Text>
              <View style={styles.singleResultHeader}>
                <Text style={styles.singleResultName}>{formatValue(listing.listingTitle)}</Text>
                <Text style={styles.singleResultMeta}>{formatValue(listing.carName)}</Text>
              </View>
              <InfoRow label="Location" value={[listing.city, listing.country].filter(Boolean).join(', ')} />
              <InfoRow label="Available" value={formatDateRange(details.availableFrom, details.availableTo)} />
              <InfoRow label="Price/day" value={listing.pricePerDay} />
              <InfoRow label="Price/week" value={details.pricePerWeek} />
              <InfoRow label="Price/month" value={details.pricePerMonth} />
              <InfoRow label="Pickup address" value={details.pickupAddress} />
              <InfoRow label="Delivery fee" value={details.deliveryFee} />
              <InfoRow label="Status" value={details.isActive ? 'Active' : 'Inactive'} />
              <InfoRow label="Transmission" value={listing.car?.transmission} />
              <InfoRow label="Fuel" value={listing.car?.fuelType} />
              <InfoRow label="Seats" value={listing.car?.seats} />
            </View>
          );
        }

        if (result.type === 'car') {
          const car = result.car || {};
          return (
            <View key={`${result.type}-${index}`} style={styles.resultCard}>
              <Text style={styles.resultTitle}>{result.title}</Text>
              <View style={styles.singleResultHeader}>
                <Text style={styles.singleResultName}>{formatValue(car.name)}</Text>
                <Text style={styles.singleResultMeta}>{car.listing ? [car.listing.city, car.listing.country].filter(Boolean).join(', ') : 'Car specs'}</Text>
              </View>
              <InfoRow label="Brand" value={car.brand} />
              <InfoRow label="Model" value={car.model} />
              <InfoRow label="Year" value={car.year} />
              <InfoRow label="Color" value={car.color} />
              <InfoRow label="Transmission" value={car.transmission} />
              <InfoRow label="Fuel" value={car.fuelType} />
              <InfoRow label="Mileage" value={car.mileage} />
              <InfoRow label="Seats" value={car.seats} />
              {car.listing ? <InfoRow label="Listing" value={car.listing.title} /> : null}
              {car.listing ? <InfoRow label="Price/day" value={car.listing.pricePerDay} /> : null}
            </View>
          );
        }

        if (result.type === 'price') {
          const estimate = result.estimate || {};
          return (
            <View key={`${result.type}-${index}`} style={styles.resultCard}>
              <Text style={styles.resultTitle}>{result.title}</Text>
              <Text style={styles.bigPrice}>{formatValue(estimate.totalPrice)} {estimate.currency || 'EUR'}</Text>
              <InfoRow label="Period" value={formatDateRange(estimate.startDate, estimate.endDate)} />
              <InfoRow label="Duration" value={`${estimate.totalDays || 0} day(s)`} />
              <InfoRow label="Note" value="Estimate only" />
            </View>
          );
        }

        if (result.type === 'myReviews' || result.type === 'reviews') {
          const reviews = result.reviews || {};
          return (
            <View key={`${result.type}-${index}`} style={styles.resultCard}>
              <Text style={styles.resultTitle}>{result.title}</Text>
              {(reviews.items || []).length ? reviews.items.map((item, itemIndex) => (
                <View key={item.id || `${item.createdAt}-${item.rating}`} style={styles.listItem}>
                  <Text style={styles.listTitle}>Review {itemIndex + 1}</Text>
                  <InfoRow label="Rating" value={Number(item.rating) ? `${'★'.repeat(Number(item.rating))} ${item.rating}/5` : 'Not set'} />
                  {item.comment ? <Text style={styles.reviewComment}>{item.comment}</Text> : null}
                  <InfoRow label="Vehicle" value={item.vehicle ? `${item.vehicle.brand || ''} ${item.vehicle.model || ''}`.trim() : item.listing?.title} />
                  <InfoRow label="Location" value={item.listing?.city} />
                  <InfoRow label="Reservation" value={item.reservation ? formatDateRange(item.reservation.startDate, item.reservation.endDate) : null} />
                  <InfoRow label="Review date" value={formatDate(item.createdAt)} />
                </View>
              )) : <Text style={styles.emptyResult}>No reviews found.</Text>}
            </View>
          );
        }

        return null;
      })}
    </View>
  );
};

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
        content: `${getMessageText(message)}${message.role === 'assistant' ? buildToolReferenceContext(message.toolResults) : ''}`,
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
      setMessages((prev) => [...prev, { ...response.message, toolResults: response.toolResults || [] }]);
      scrollToBottom();
      setTimeout(scrollToBottom, 80);
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
                  const hasToolCards = !isUser && Array.isArray(message.toolResults) && message.toolResults.length > 0;
                  const displayText = hasToolCards ? getCardIntroText(getMessageText(message)) : getMessageText(message);
                  return (
                    <View
                      key={`${message.createdAt || index}-${index}`}
                      style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}
                    >
                      <View style={[
                        styles.messageBubble,
                        isUser ? styles.userBubble : styles.assistantBubble,
                        hasToolCards && styles.cardMessageBubble,
                      ]}>
                        {renderMessageContent(
                          displayText,
                          [styles.messageText, isUser ? styles.userText : styles.assistantText],
                          styles.boldText
                        )}
                        {!isUser ? <ToolResultCards results={message.toolResults} /> : null}
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
    maxWidth: '88%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardMessageBubble: {
    width: '100%',
    maxWidth: '100%',
    paddingHorizontal: 10,
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
  boldText: {
    fontWeight: '900',
  },
  paragraphText: {
    marginBottom: 8,
  },
  messageSpacer: {
    height: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingRight: 2,
  },
  bulletDot: {
    width: 14,
    lineHeight: 19,
    color: '#B9C0F3',
    fontWeight: '900',
  },
  bulletText: {
    flex: 1,
  },
  detailRow: {
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginBottom: 7,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.12)',
  },
  detailLabel: {
    color: '#B9C0F3',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 2,
  },
  detailValue: {
    lineHeight: 18,
  },
  toolResults: {
    marginTop: 6,
    gap: 8,
  },
  resultCard: {
    borderRadius: 14,
    padding: 10,
    backgroundColor: 'rgba(6, 8, 24, 0.28)',
    overflow: 'hidden',
  },
  resultTitle: {
    color: '#F6F8FF',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 10,
  },
  singleResultHeader: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 6,
    backgroundColor: 'rgba(108, 77, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.16)',
  },
  singleResultName: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  singleResultMeta: {
    color: '#B9C0F3',
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
    fontWeight: '700',
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  resultCell: {
    width: '100%',
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  resultLabel: {
    color: '#9EA6D6',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 3,
  },
  resultValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 8,
  },
  statPill: {
    flex: 1,
    minHeight: 54,
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(108, 77, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.14)',
  },
  statPillNumber: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  statPillLabel: {
    color: '#d8dcff',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  listItem: {
    borderRadius: 13,
    padding: 11,
    marginBottom: 9,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(145, 152, 229, 0.14)',
  },
  listTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
  },
  infoRow: {
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(145, 152, 229, 0.08)',
  },
  infoLabel: {
    color: '#9EA6D6',
    fontSize: 10.5,
    fontWeight: '900',
    marginBottom: 3,
  },
  infoValue: {
    color: '#F6F8FF',
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 18,
  },
  listMeta: {
    color: '#B6BCE5',
    fontSize: 11,
    lineHeight: 16,
  },
  statusPill: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: 'rgba(35, 212, 159, 0.22)',
  },
  pricePill: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: 'rgba(108, 77, 255, 0.28)',
  },
  priceLine: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  reviewComment: {
    color: '#ECF0FF',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 5,
  },
  bigPrice: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  emptyResult: {
    color: '#AEB5DF',
    fontSize: 12,
    fontWeight: '700',
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
