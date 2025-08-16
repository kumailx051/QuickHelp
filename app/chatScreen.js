import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Keyboard,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { Appbar, Avatar, Text, TextInput, IconButton, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import EmojiPicker from 'rn-emoji-keyboard';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  getFirestore,
  where,
  doc,
  updateDoc,
  getDocs,
  getDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const ChatScreen = () => {
  const router = useRouter();
  const { workerId, jobRoles, chatId } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [workerData, setWorkerData] = useState({
    profileImage: 'https://via.placeholder.com/50',
    fullName: 'Loading...',
    jobRoles: jobRoles || 'Worker',
    rating: '0.0',
  });
  const flatListRef = useRef(null);
  const auth = getAuth();
  const db = getFirestore();
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchWorkerData = async () => {
      if (!workerId) return;
      try {
        const workerDoc = await getDoc(doc(db, 'users', workerId));
        if (workerDoc.exists()) {
          const data = workerDoc.data();
          setWorkerData({
            profileImage: data.profileImage || 'https://via.placeholder.com/50',
            fullName: data.fullName || 'Unknown User',
            jobRoles: data.jobRoles ,
            rating: Number(data.rating || 0).toFixed(1),
          });
        }
      } catch (error) {
        console.error('Error fetching worker data:', error);
      }
    };

    fetchWorkerData();
  }, [workerId, db]);

  useEffect(() => {
    if (!chatId || !auth.currentUser) return;

    const resetUnreadCount = async () => {
      try {
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('chatId', '==', chatId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const chatDoc = querySnapshot.docs[0];
          await updateDoc(doc(db, 'chats', chatDoc.id), {
            [`unreadCount.${auth.currentUser.uid}`]: 0,
          });
        }
      } catch (error) {
        console.error('Error resetting unread count:', error);
      }
    };

    resetUnreadCount();

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }));
      setMessages(newMessages);

      // Smooth scrolling to end
      if (flatListRef.current) {
        setTimeout(() => {
          flatListRef.current.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    return () => unsubscribe();
  }, [chatId, db, auth.currentUser]);

  const updateLastMessage = async (messageText) => {
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('chatId', '==', chatId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const chatDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'chats', chatDoc.id), {
          lastMessage: messageText,
          lastMessageTime: new Date(),
          [`unreadCount.${workerId}`]: (chatDoc.data().unreadCount?.[workerId] || 0) + 1,
        });
      }
    } catch (error) {
      console.error('Error updating last message:', error);
    }
  };

  const onEmojiSelected = (emoji) => {
    requestAnimationFrame(() => {
      setInputMessage((prev) => prev + emoji.emoji);
    });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !auth.currentUser || isSending) return;

    const messageText = inputMessage.trim();
    const timestamp = new Date();
    const messageId = Math.random().toString(36).substring(7);

    // Clear input immediately for better UX
    setInputMessage('');
    setIsSending(true);
    Keyboard.dismiss();

    // Add optimistic message with a slight delay to prevent UI jank
    setTimeout(() => {
      const optimisticMessage = {
        id: messageId,
        text: messageText,
        sender: auth.currentUser.uid,
        receiver: workerId,
        chatId: chatId,
        timestamp: timestamp.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        status: 'sending',
      };

      setMessages((prev) => [...prev, optimisticMessage]);
    }, 10);

    try {
      const messagesRef = collection(db, 'messages');
      const docRef = await addDoc(messagesRef, {
        text: messageText,
        sender: auth.currentUser.uid,
        receiver: workerId,
        chatId: chatId,
        timestamp: serverTimestamp(),
        status: 'sent',
      });

      await updateLastMessage(messageText);

      // Update the message status after successful send
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, id: docRef.id, status: 'sent' }
            : msg
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const toggleMessageSelection = (messageId) => {
    setSelectedMessages((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(messageId)) {
        newSelected.delete(messageId);
      } else {
        newSelected.add(messageId);
      }
      setIsSelectionMode(newSelected.size > 0);
      return newSelected;
    });
  };

  const deleteSelectedMessages = async () => {
    if (isDeleting || selectedMessages.size === 0) return;
    
    setIsDeleting(true);
    
    try {
      // Use Promise.all for parallel deletion instead of batch
      const deletePromises = Array.from(selectedMessages).map(messageId => {
        const messageRef = doc(db, 'messages', messageId);
        return deleteDoc(messageRef);
      });
      
      await Promise.all(deletePromises);
      
      // Update UI optimistically
      setMessages(prev => prev.filter(msg => !selectedMessages.has(msg.id)));
      setSelectedMessages(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Error deleting messages:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.sender === auth.currentUser?.uid;
    const isSelected = selectedMessages.has(item.id);

    return (
      <TouchableOpacity
        onLongPress={() => toggleMessageSelection(item.id)}
        onPress={() => isSelectionMode && toggleMessageSelection(item.id)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.clientMessage : styles.workerMessage,
            isSelected && styles.selectedMessage,
          ]}
        >
          <Text style={styles.messageText}>{item.text}</Text>
          <View style={styles.messageFooter}>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
            {isCurrentUser && (
              <MaterialCommunityIcons
                name={item.status === 'read' ? 'check-all' : 'check'}
                size={16}
                color={item.status === 'read' ? '#4CAF50' : '#9E9E9E'}
              />
            )}
          </View>
          {isSelected && (
            <View style={styles.checkIcon}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <Appbar.Header style={styles.header}>
      {isSelectionMode ? (
        <>
          <Appbar.Action
            icon="close"
            onPress={() => {
              setSelectedMessages(new Set());
              setIsSelectionMode(false);
            }}
          />
          <Appbar.Content title={`${selectedMessages.size} selected`} />
          {isDeleting ? (
            <ActivityIndicator size={24} color="#666" style={{ marginRight: 16 }} />
          ) : (
            <Appbar.Action icon="delete" onPress={deleteSelectedMessages} />
          )}
        </>
      ) : (
        <>
          <Appbar.BackAction onPress={() => router.back()} />
          <TouchableOpacity
            onPress={() => router.push(`/ClientSeeWorkerProfile?workerId=${workerId}`)}
            style={styles.headerProfile}
          >
            <Avatar.Image
              size={40}
              source={{ uri: workerData.profileImage }}
              style={styles.avatar}
            />
            <View style={styles.headerContent}>
              <Text style={styles.headerName}>{workerData.fullName}</Text>
              <View style={styles.headerSubtitle}>
                <Text style={styles.headerRole}>
                  {workerData.jobRoles} | ⭐ {workerData.rating}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          {/* Removed the 3-dot menu as requested */}
        </>
      )}
    </Appbar.Header>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Using the provided doodle image */}
        <ImageBackground 
          source={{ uri: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-iX5fztzzbHjKPEi2fna6RxN5vdVc8j.png' }} 
          style={styles.backgroundImage}
        />
        
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => {
            if (flatListRef.current && messages.length > 0) {
              flatListRef.current.scrollToEnd({ animated: false });
            }
          }}
          onLayout={() => {
            if (flatListRef.current && messages.length > 0) {
              flatListRef.current.scrollToEnd({ animated: false });
            }
          }}
          removeClippedSubviews={false}
          maxToRenderPerBatch={15}
          windowSize={15}
          initialNumToRender={20}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        />

        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>Worker is typing...</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <IconButton
              icon="paperclip"
              size={24}
              onPress={() => {}}
              style={styles.iconButton}
            />
            <IconButton
              icon="microphone"
              size={24}
              onPress={() => {}}
              style={styles.iconButton}
            />
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={inputMessage}
              onChangeText={setInputMessage}
              placeholder="Type a message..."
              multiline
              maxLength={1000}
              dense
              blurOnSubmit={false}
            />
            <IconButton
              icon="emoticon-outline"
              size={24}
              onPress={() => setIsEmojiPickerVisible(true)}
              style={styles.iconButton}
            />
            {isSending ? (
              <ActivityIndicator size={24} color="#0084ff" style={styles.sendButton} />
            ) : (
              <IconButton
                icon="send"
                size={24}
                onPress={sendMessage}
                style={[styles.iconButton, styles.sendButton]}
                disabled={!inputMessage.trim()}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <EmojiPicker
        onEmojiSelected={onEmojiSelected}
        open={isEmojiPickerVisible}
        onClose={() => setIsEmojiPickerVisible(false)}
        enableRecentlyUsed
        enableSearchBar
        categoryPosition="top"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    elevation: 4,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  keyboardAvoidingView: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.15, // Adjusted opacity for better readability
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  avatar: {
    backgroundColor: '#e1e1e1',
  },
  headerContent: {
    marginLeft: 12,
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRole: {
    fontSize: 14,
    color: '#666',
  },
  messageList: {
    padding: 16,
    paddingBottom: 80,
  },
  messageBubble: {
    maxWidth: width * 0.7,
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  messageText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 20,
  },
  clientMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  workerMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  typingIndicator: {
    padding: 8,
    backgroundColor: 'rgba(245,245,245,0.9)',
    alignItems: 'center',
    borderRadius: 16,
    margin: 8,
    alignSelf: 'flex-start',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  typingText: {
    color: '#666',
    fontSize: 14,
  },
  selectedMessage: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  checkIcon: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  iconButton: {
    margin: 0,
    padding: 0,
  },
  input: {
    flex: 1,
    marginHorizontal: 4,
    maxHeight: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingTop: 8,
    paddingBottom: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sendButton: {
    backgroundColor: '#0084ff',
    borderRadius: 20,
    margin: 4,
  },
});

export default ChatScreen;