import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList, Image, ActivityIndicator, Alert, Modal, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import * as ImagePicker from 'expo-image-picker';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';

const getNativeSaveModules = () => {
  if (Platform.OS === 'web') return { FileSystem: null, MediaLibrary: null };
  try {
    // Optional deps (must be installed via `expo install`)
    // Use require so bundling doesn't fail when missing.
    // eslint-disable-next-line global-require
    const FileSystem = require('expo-file-system');
    // eslint-disable-next-line global-require
    const FileSystemLegacy = require('expo-file-system/legacy');
    // eslint-disable-next-line global-require
    const MediaLibrary = require('expo-media-library');
    // eslint-disable-next-line global-require
    const Sharing = require('expo-sharing');
    return { FileSystem, FileSystemLegacy, MediaLibrary, Sharing };
  } catch (_e) {
    return { FileSystem: null, FileSystemLegacy: null, MediaLibrary: null, Sharing: null };
  }
};

import { getCurrentUserProfile } from '../../services/authSession';
import { getThread, markThreadRead, sendMessage, uploadChatImage } from '../../services/messages';
import { getSocket } from '../../services/socketClient';
import { buildApiUrl } from '../../services/api';import { useTranslation } from "react-i18next";
import { getFriendlyError } from '../../utils/friendlyError';

const displayNameFor = (user) => {
  const first = (user?.firstName || user?.first_name || '').trim();
  const last = (user?.lastName || user?.last_name || '').trim();
  const full = `${first} ${last}`.trim();
  return full || String(user?.name || '').trim() || user?.email || 'Discussion';
};

const keyForMessage = (m) => String(m?.id || `${m?.senderId}-${m?.receiverId}-${m?.createdAt}`);

const toDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate());

};

const formatDayLabel = (iso) => {
  const d = toDate(iso);
  if (!d) return '';
  const now = new Date();
  if (isSameDay(d, now)) return 'Today';
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (isSameDay(d, y)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
};

const formatTimeLabel = (iso) => {
  const d = toDate(iso);
  if (!d) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const formatTimestampLabel = (iso) => {
  const d = toDate(iso);
  if (!d) return '';
  const now = new Date();
  const time = formatTimeLabel(iso);
  if (isSameDay(d, now)) return time;
  return `${formatDayLabel(iso)} ${time}`;
};

const IMAGE_PREFIX = '__image__:';
const parseImageUrl = (text) => {
  if (typeof text !== 'string') return null;
  if (!text.startsWith(IMAGE_PREFIX)) return null;
  const url = text.slice(IMAGE_PREFIX.length).trim();
  return url || null;
};

const initialsFor = (user) => {
  const name = String(user?.name || '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || '?';
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
    return (a + b).toUpperCase();
  }
  const first = (user?.firstName || user?.first_name || '').trim();
  const last = (user?.lastName || user?.last_name || '').trim();
  const a = first ? first[0] : '?';
  const b = last ? last[0] : '';
  return (a + b).toUpperCase();
};

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

const ChatScreen = ({ navigation, route }) => {const { t } = useTranslation();
  const otherUserId = route?.params?.otherUserId;
  const otherUser = route?.params?.otherUser || { id: otherUserId };
  const isNewConversation = Boolean(route?.params?.isNewConversation);

  const [me, setMe] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [isTypingOther, setIsTypingOther] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [viewerUrl, setViewerUrl] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const pinchScale = useRef(new Animated.Value(1)).current;
  const baseScale = useRef(new Animated.Value(1)).current;

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
    }}, []);
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
        setMessages((prev) => prev.map((m) => ids.has(m?.id) ? { ...m, isRead: true } : m));
      }
      setTimeout(scrollToEnd, 50);
    } catch (e) {
      setError(getFriendlyError(e, t));
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
        msg.senderId === otherUserId && msg.receiverId === me?.id ||
        msg.senderId === me?.id && msg.receiverId === otherUserId;
        if (!involvesThisThread) return;

        appendMessage(msg);

        if (msg.senderId === otherUserId && msg.receiverId === me?.id) {
          try {
            const updated = await markThreadRead({ otherUserId });
            const ids = new Set((updated || []).map((m) => m?.id).filter(Boolean));
            if (ids.size) {
              setMessages((prev) => prev.map((m) => ids.has(m?.id) ? { ...m, isRead: true } : m));
            }
          } catch (_err) {}
        }

        setTimeout(scrollToEnd, 30);
      };

      const onMessageRead = (updated) => {
        if (!updated?.id) return;
        setMessages((prev) => prev.map((m) => m?.id === updated.id ? { ...m, isRead: true } : m));
      };

      const onThreadRead = (payload) => {
        const ids = payload?.messageIds;
        if (!Array.isArray(ids) || ids.length === 0) return;
        setMessages((prev) => prev.map((m) => ids.includes(m?.id) ? { ...m, isRead: true } : m));
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

  useEffect(() => {
    if (!isTypingOther) return;
    const t = setTimeout(scrollToEnd, 30);
    return () => clearTimeout(t);
  }, [isTypingOther, scrollToEnd]);

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
    }}, [otherUserId]);
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

  const sendImage = useCallback(
    async (uri) => {
      if (!uri || !otherUserId) return;
      setIsUploadingImage(true);
      try {
        const url = await uploadChatImage({ uri });
        const saved = await sendMessage({ receiverId: otherUserId, message: `${IMAGE_PREFIX}${url}` });
        appendMessage(saved);
        setTimeout(scrollToEnd, 30);
      } catch (e) {
        Alert.alert(t("screens.messages.chatscreen.uploadFailed"), getFriendlyError(e, t, 'common.errors.upload'));
      } finally {
        setIsUploadingImage(false);
      }
    },
    [appendMessage, otherUserId, scrollToEnd]
  );

  const pickFromCamera = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm?.granted) return;
      const res = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true
      });
      const asset = res?.assets?.[0];
      if (res?.canceled || !asset?.uri) return;
      await sendImage(asset.uri);
    } catch (_e) {}
  }, [sendImage]);

  const pickFromGallery = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm?.granted) return;
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType?.Images ? [ImagePicker.MediaType.Images] : ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: true
      });
      const asset = res?.assets?.[0];
      if (res?.canceled || !asset?.uri) return;
      await sendImage(asset.uri);
    } catch (_e) {}
  }, [sendImage]);

  const onPressCamera = useCallback(() => {
    if (isUploadingImage) return;
    Alert.alert(t("screens.messages.chatscreen.sendAPhoto"), t("screens.messages.chatscreen.chooseASource"), [
    { text: 'Camera', onPress: pickFromCamera },
    { text: 'Gallery', onPress: pickFromGallery },
    { text: 'Cancel', style: 'cancel' }]
    );
  }, [isUploadingImage, pickFromCamera, pickFromGallery]);

  const openImage = useCallback(async (url) => {
    if (!url) return;
    if (Platform.OS === 'web') {
      try {
        window.open(url, '_blank');
      } catch (_e) {
        setViewerUrl(url);
      }
      return;
    }
    setViewerUrl(url);
  }, []);

  const saveImage = useCallback(async (url) => {
    if (!url) return;
    if (Platform.OS === 'web') {
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = `rentify_${Date.now()}.jpg`;
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (_e) {
        // fallback: open in new tab
        try {
          window.open(url, '_blank');
        } catch (_err) {}
      }
      return;
    }

    try {
      const { FileSystem, FileSystemLegacy, MediaLibrary, Sharing } = getNativeSaveModules();
      const dlLib = FileSystemLegacy || FileSystem;
      if (!dlLib) {
        Alert.alert(t("screens.messages.chatscreen.missingDependency"), t("screens.messages.chatscreen.installRequiredPackagesExpoFileSystemThen")


        );
        return;
      }

      const filename = `rentify_${Date.now()}.jpg`;
      const cacheDir = dlLib.cacheDirectory || dlLib.documentDirectory || '';
      const target = `${cacheDir}${filename}`;
      const dl = await dlLib.downloadAsync(url, target);

      // Best effort "Save to Photos" (works fully only in dev builds on Android).
      if (MediaLibrary?.requestPermissionsAsync && MediaLibrary?.createAssetAsync) {
        const perm = await MediaLibrary.requestPermissionsAsync();
        const access = perm?.accessPrivileges;
        const hasFullAccess = perm?.granted && (!access || access === 'all');
        if (hasFullAccess) {
          try {
            const asset = await MediaLibrary.createAssetAsync(dl.uri);
            await MediaLibrary.createAlbumAsync(t("screens.client.landingscreen.rentify"), asset, false).catch(() => {});
            const info = await MediaLibrary.getAssetInfoAsync(asset).catch(() => null);
            if (info?.localUri || info?.uri) {
              Alert.alert(t("screens.messages.chatscreen.saved"), t("screens.messages.chatscreen.imageSavedToYourPhotos"));
              return;
            }
          } catch (_e) {


            // fallback to share sheet
          }}}

      // Expo Go fallback on Android: use Storage Access Framework to save to a user-chosen folder.
      const saf = FileSystem?.StorageAccessFramework;
      if (Platform.OS === 'android' && saf?.requestDirectoryPermissionsAsync) {
        const dirPerm = await saf.requestDirectoryPermissionsAsync();
        if (dirPerm?.granted && dirPerm?.directoryUri) {
          const destUri = await saf.createFileAsync(dirPerm.directoryUri, filename, 'image/jpeg');
          const base64 = await dlLib.readAsStringAsync(dl.uri, { encoding: dlLib.EncodingType.Base64 });
          await saf.writeAsStringAsync(destUri, base64, { encoding: dlLib.EncodingType.Base64 });
          Alert.alert(t("screens.messages.chatscreen.saved"), t("screens.messages.chatscreen.imageSavedToTheSelectedFolder"));
          return;
        }
      }

      if (Sharing?.shareAsync) {
        await Sharing.shareAsync(dl.uri, { mimeType: 'image/jpeg', dialogTitle: 'Save image' });
        return;
      }

      Alert.alert(t("screens.messages.chatscreen.saveUnavailable"), t("screens.messages.chatscreen.toSaveImagesToPhotosOnAndroid")


      );
    } catch (e) {
      Alert.alert(t("screens.messages.chatscreen.saveFailed"), getFriendlyError(e, t, 'common.errors.upload'));
    }
  }, []);

  const markImageError = useCallback((messageId, url, err) => {
    console.log('[chat] image load error', { messageId, url, err });
    setImageErrors((prev) => ({ ...(prev || {}), [messageId]: true }));
  }, []);

  const title = useMemo(() => displayNameFor(otherUser), [otherUser]);
  const avatarUri = useMemo(() => avatarUriFor(otherUser), [otherUser]);

  const lastOutgoingId = useMemo(() => {
    if (!me?.id) return null;
    for (let i = (messages?.length || 0) - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m?.senderId === me.id) return m?.id || null;
    }
    return null;
  }, [me?.id, messages]);

  const renderItem = useCallback(
    ({ item, index }) => {
      const mine = item?.senderId === me?.id;
      const isLastOutgoing = mine && lastOutgoingId && item?.id === lastOutgoingId;
      const statusColor = item?.isRead ? COLORS.primary : 'rgba(214,219,255,0.65)';
      const statusIcon = item?.isRead ? 'checkmark-done' : 'checkmark-done';
      const showTimestamp = Boolean(item?.id && expandedMessageId === item.id);

      const prev = index > 0 ? messages[index - 1] : null;
      const showDay =
      index === 0 ||
      !isSameDay(toDate(prev?.createdAt), toDate(item?.createdAt));

      const imageUrl = parseImageUrl(item?.message);
      const hasImageError = Boolean(imageUrl && item?.id && imageErrors?.[item.id]);
      return (
        <>
          {showDay ?
          <View style={styles.dayRow}>
              <View style={styles.dayPill}>
                <Text style={styles.dayText}>{formatDayLabel(item?.createdAt)}</Text>
              </View>
            </View> :
          null}

          <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
          {mine ?
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setExpandedMessageId((cur) => cur === item?.id ? null : item?.id)}>
              
              <LinearGradient
                colors={[COLORS.secondary, COLORS.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.bubble, styles.bubbleMine]}>
                
                {imageUrl ?
                <Pressable onPress={() => openImage(imageUrl)}>
                    {hasImageError ?
                  <View style={[styles.image, styles.imageFallback]}>
                        <Ionicons name="image-outline" size={26} color="#fff" />
                        <Text style={styles.imageFallbackText}>{t("screens.messages.chatscreen.tapToOpen")}</Text>
                      </View> :

                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                    onError={(e) => markImageError(item?.id, imageUrl, e?.nativeEvent)} />

                  }
                  </Pressable> :

                <Text style={styles.bubbleTextMine}>{item?.message || ''}</Text>
                }
              </LinearGradient>
            </TouchableOpacity> :

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setExpandedMessageId((cur) => cur === item?.id ? null : item?.id)}>
              
              <View style={[styles.bubble, styles.bubbleTheirs]}>
                {imageUrl ?
                <Pressable onPress={() => openImage(imageUrl)}>
                    {hasImageError ?
                  <View style={[styles.image, styles.imageFallback]}>
                        <Ionicons name="image-outline" size={26} color="#fff" />
                        <Text style={styles.imageFallbackText}>{t("screens.messages.chatscreen.tapToOpen")}</Text>
                      </View> :

                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                    onError={(e) => markImageError(item?.id, imageUrl, e?.nativeEvent)} />

                  }
                  </Pressable> :

                <Text style={styles.bubbleTextTheirs}>{item?.message || ''}</Text>
                }
              </View>
            </TouchableOpacity>
            }
          {isLastOutgoing ?
            <View style={styles.statusRow}>
              <Ionicons name={statusIcon} size={14} color={statusColor} />
            </View> :
            null}
          {showTimestamp ?
            <View style={[styles.timestampRow, mine ? styles.timestampRowMine : styles.timestampRowTheirs]}>
              <Text style={styles.timestampText}>{formatTimestampLabel(item?.createdAt)}</Text>
            </View> :
            null}
        </View>
        </>);

    },
    [expandedMessageId, isNewConversation, lastOutgoingId, me?.id, messages]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#d6dbff" />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            {avatarUri ?
            <Image source={{ uri: avatarUri }} style={styles.headerAvatarImage} /> :

            <Text style={styles.headerAvatarText}>{initialsFor(otherUser)}</Text>
            }
          </View>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIcon} onPress={load} disabled={isLoading}>
            <Ionicons name="refresh-outline" size={20} color="#d6dbff" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ?
      <View style={styles.state}>
          <Text style={styles.stateTitle}>{t("screens.messages.chatscreen.chargement")}</Text>
        </View> :
      error ?
      <View style={styles.state}>
          <Text style={styles.stateTitle}>{t("screens.messages.chatscreen.erreur")}</Text>
          <Text style={styles.stateSubtitle}>{error}</Text>
        </View> :

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
        
          <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={keyForMessage}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          onContentSizeChange={scrollToEnd}
          ListFooterComponent={
          isTypingOther ?
          <View style={[styles.bubbleRow, styles.bubbleRowTheirs]}>
                  <View style={[styles.bubble, styles.bubbleTheirs, styles.typingBubble]}>
                    <View style={styles.typingDots}>
                      <View style={[styles.typingDot, styles.typingDot1]} />
                      <View style={[styles.typingDot, styles.typingDot2]} />
                      <View style={[styles.typingDot, styles.typingDot3]} />
                    </View>
                  </View>
                </View> :
          null
          }
          ListEmptyComponent={
          <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{isNewConversation ? 'Conversation non activée' : 'Nouveau chat'}</Text>
                <Text style={styles.emptySubtitle}>
                  {isNewConversation ? 'Aucun message pour le moment. Envoie le premier.' : 'Envoie ton premier message.'}
                </Text>
              </View>
          } />
        

          <View style={styles.composer}>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85} onPress={onPressCamera}>
              {isUploadingImage ?
            <ActivityIndicator size="small" color="#d6dbff" /> :

            <Ionicons name="camera-outline" size={22} color="#d6dbff" />
            }
            </TouchableOpacity>
            <View style={styles.inputPill}>
              <TextInput
              value={text}
              onChangeText={onChangeText}
              placeholder={t("screens.messages.chatscreen.message")}
              placeholderTextColor="rgba(214,219,255,0.55)"
              style={styles.input}
              multiline />
            
              <TouchableOpacity style={styles.sendBtn} onPress={onSend} activeOpacity={0.85}>
                <Ionicons name="arrow-up" size={18} color="#0f1228" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      }

      <Modal visible={Boolean(viewerUrl)} transparent animationType="fade" onRequestClose={() => setViewerUrl(null)}>
        <View style={styles.viewerBackdrop}>
          <View style={styles.viewerTop}>
            <Pressable
              style={styles.viewerBtn}
              onPress={() => {
                pinchScale.setValue(1);
                baseScale.setValue(1);
                setViewerUrl(null);
              }}>
              
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable style={styles.viewerBtn} onPress={() => saveImage(viewerUrl)}>
              <Ionicons name="download-outline" size={22} color="#fff" />
            </Pressable>
          </View>
          <Pressable style={styles.viewerBody} onPress={() => setViewerUrl(null)}>
            {viewerUrl ?
            <PinchGestureHandler
              onGestureEvent={Animated.event([{ nativeEvent: { scale: pinchScale } }], { useNativeDriver: true })}
              onHandlerStateChange={(e) => {
                if (e.nativeEvent.state === State.END) {
                  const next = Math.min(4, Math.max(1, e.nativeEvent.scale || 1));
                  // baseScale = baseScale * next
                  baseScale.stopAnimation((current) => {
                    const merged = Math.min(4, Math.max(1, current * next));
                    baseScale.setValue(merged);
                  });
                  pinchScale.setValue(1);
                }
              }}>
              
                <Animated.View style={styles.viewerImageWrap}>
                  <Animated.Image
                  source={{ uri: viewerUrl }}
                  style={[
                  styles.viewerImage,
                  {
                    transform: [
                    {
                      scale: Animated.multiply(pinchScale, baseScale)
                    }]

                  }]
                  }
                  resizeMode="contain" />
                
                </Animated.View>
              </PinchGestureHandler> :
            null}
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>);

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
    borderBottomColor: 'rgba(255,255,255,0.08)'
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
    overflow: 'hidden'
  },
  headerAvatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  headerAvatarText: { color: '#d6dbff', fontWeight: '900', fontSize: 12 },
  headerTitleWrap: { flex: 1 },
  headerTitle: { color: '#f2f4ff', fontSize: 15, fontWeight: '900' },
  body: { flex: 1 },
  list: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 10, flexGrow: 1 },
  dayRow: { alignItems: 'center', marginBottom: 10 },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)'
  },
  dayText: { color: 'rgba(214,219,255,0.75)', fontWeight: '800', fontSize: 12 },
  bubbleRow: { marginBottom: 8, width: '100%' },
  bubbleRowMine: { alignItems: 'flex-end' },
  bubbleRowTheirs: { alignItems: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 22, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleMine: { borderTopRightRadius: 8 },
  bubbleTheirs: { backgroundColor: 'rgba(23, 26, 54, 0.92)', borderTopLeftRadius: 8, borderWidth: 1, borderColor: 'rgba(145, 152, 229, 0.18)' },
  bubbleTextMine: { color: '#fff', fontSize: 15, lineHeight: 20, fontWeight: '700' },
  bubbleTextTheirs: { color: '#f2f4ff', fontSize: 15, lineHeight: 20 },
  image: { width: 240, height: 240, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)' },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  imageFallbackText: { marginTop: 8, color: 'rgba(255,255,255,0.9)', fontWeight: '800', fontSize: 12 },
  typingBubble: { paddingVertical: 12, paddingHorizontal: 14 },
  typingDots: { flexDirection: 'row', alignItems: 'center' },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(214,219,255,0.75)', marginRight: 4 },
  typingDot1: { opacity: 0.55 },
  typingDot2: { opacity: 0.85 },
  typingDot3: { opacity: 0.65, marginRight: 0 },
  statusRow: { marginTop: 4, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center' },
  timestampRow: { marginTop: 6, paddingHorizontal: 6 },
  timestampRowMine: { alignItems: 'flex-end' },
  timestampRowTheirs: { alignItems: 'flex-start' },
  timestampText: { color: 'rgba(214,219,255,0.6)', fontSize: 12, fontWeight: '700' },
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
    backgroundColor: 'rgba(15, 18, 40, 0.9)'
  },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  viewerTop: {
    paddingTop: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  viewerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)'
  },
  viewerBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  viewerImageWrap: { flex: 1, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
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
    paddingHorizontal: 10
  },
  input: {
    flex: 1,
    minHeight: 32,
    maxHeight: 110,
    color: '#f2f4ff',
    paddingRight: 8,
    paddingVertical: 6,
    fontSize: 15
  },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f2f4ff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  stateTitle: { color: '#f2f4ff', fontWeight: '900', fontSize: 15 },
  stateSubtitle: { color: 'rgba(214,219,255,0.65)', textAlign: 'center', marginTop: 8 }
});

export default ChatScreen;
