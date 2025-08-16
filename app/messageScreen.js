"use client"

import { useState, useEffect, useCallback } from "react"
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, ImageBackground } from "react-native"
import { Appbar, Searchbar, Badge, Text, Avatar } from "react-native-paper"
import { useRouter } from "expo-router"
import { collection, query, where, onSnapshot, getDoc, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { auth, db } from "../firebaseConfig"
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler"

const MessageScreen = () => {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [selectedConversations, setSelectedConversations] = useState([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid)
      } else {
        setUserId(null)
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) return

    const chatsRef = collection(db, "chats")
    const q = query(chatsRef, where("participants", "array-contains", userId))

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const chatsPromises = snapshot.docs.map(async (document) => {
          const chatData = document.data()
          const otherUserId = chatData.participants.find((id) => id !== userId)
          const userDocRef = doc(db, "users", otherUserId)
          const userDoc = await getDoc(userDocRef)
          const userData = userDoc.data()

          let lastMessageText = "I will come to you soon..."
          let lastMessageTime = chatData.createdAt

          if (chatData.lastMessage) {
            lastMessageText = chatData.lastMessage
            lastMessageTime = chatData.lastMessageTime
          }

          return {
            id: document.id,
            chatId: chatData.chatId,
            workerName: userData?.fullName || "Unknown User",
            workerProfilePic: userData?.profileImage || "https://via.placeholder.com/50",
            jobRoles: userData?.jobRoles || ["Worker"],
            rating: userData?.rating || 0,
            lastMessage: lastMessageText,
            lastMessageTimestamp: formatTimestamp(lastMessageTime),
            lastMessageTime: lastMessageTime, // Keep the raw timestamp for sorting
            unreadCount: chatData.unreadCount?.[userId] || 0,
            otherUserId: otherUserId,
          }
        })

        const chats = await Promise.all(chatsPromises)
        const sortedChats = chats.sort((a, b) => {
          if (!a.lastMessageTime || !b.lastMessageTime) return 0
          return b.lastMessageTime - a.lastMessageTime
        })

        setConversations(sortedChats)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching chats:", error)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [userId])

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ""
    const now = new Date()
    const messageDate = timestamp.toDate()
    const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  // Fixed to open chat with a single press
  const handleConversationPress = async (item) => {
    // If in selection mode, toggle selection instead of opening chat
    if (isSelectionMode) {
      handleLongPress(item)
      return
    }

    // Reset unread count when entering the chat
    if (item.unreadCount > 0) {
      try {
        const chatDoc = doc(db, "chats", item.id)
        await updateDoc(chatDoc, {
          [`unreadCount.${userId}`]: 0,
        })
      } catch (error) {
        console.error("Error resetting unread count:", error)
      }
    }

    // Navigate to chat screen with a single press
    router.push({
      pathname: "/chatScreen",
      params: {
        workerId: item.otherUserId,
        workerName: item.workerName,
        chatId: item.chatId,
      },
    })
  }

  const handleLongPress = useCallback((item) => {
    // Enter selection mode if not already in it
    if (!isSelectionMode) {
      setIsSelectionMode(true)
    }
    
    setSelectedConversations((prev) => {
      if (prev.includes(item.id)) {
        const newSelected = prev.filter((id) => id !== item.id)
        // Exit selection mode if no items are selected
        if (newSelected.length === 0) {
          setIsSelectionMode(false)
        }
        return newSelected
      } else {
        return [...prev, item.id]
      }
    })
  }, [isSelectionMode])

  const handleCancelSelection = () => {
    setSelectedConversations([])
    setIsSelectionMode(false)
  }

  const handleDeleteSelected = async () => {
    Alert.alert("Delete Conversations", "Are you sure you want to delete the selected conversations?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            for (const chatId of selectedConversations) {
              await deleteDoc(doc(db, "chats", chatId))
            }
            setSelectedConversations([])
            setIsSelectionMode(false)
          } catch (error) {
            console.error("Error deleting conversations:", error)
            Alert.alert("Error", "Failed to delete conversations. Please try again.")
          }
        },
      },
    ])
  }

  const renderRightActions = (progress, dragX, item) => {
    return (
      <TouchableOpacity 
        style={styles.deleteAction} 
        onPress={() => {
          Alert.alert("Delete Conversation", "Are you sure you want to delete this conversation?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  await deleteDoc(doc(db, "chats", item.id))
                } catch (error) {
                  console.error("Error deleting conversation:", error)
                  Alert.alert("Error", "Failed to delete conversation. Please try again.")
                }
              },
            },
          ])
        }}
      >
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
    )
  }

  const renderConversationItem = ({ item }) => (
    <Swipeable renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}>
      <TouchableOpacity
        style={[
          styles.conversationItem,
          item.unreadCount > 0 && styles.unreadConversation,
          selectedConversations.includes(item.id) && styles.selectedConversation,
        ]}
        onPress={() => handleConversationPress(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
      >
        <Avatar.Image size={50} source={{ uri: item.workerProfilePic }} />
        <View style={styles.conversationDetails}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.workerName, item.unreadCount > 0 && styles.unreadText]}>{item.workerName}</Text>
            <Text style={styles.timestamp}>{item.lastMessageTimestamp}</Text>
          </View>
          <Text style={styles.jobRole}>
            {Array.isArray(item.jobRoles) ? item.jobRoles.join(", ") : "Worker"} | ⭐ {item.rating.toFixed(1)}
          </Text>
          <Text numberOfLines={1} style={[styles.lastMessage, item.unreadCount > 0 && styles.unreadText]}>
            {item.lastMessage}
          </Text>
        </View>
        {item.unreadCount > 0 && (
          <Badge style={styles.unreadBadge} size={24}>
            {item.unreadCount}
          </Badge>
        )}
        {selectedConversations.includes(item.id) && (
          <View style={styles.checkmarkContainer}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  )

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(conv.jobRoles) &&
        conv.jobRoles.some((role) => role.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ImageBackground 
        source={{ uri: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-1OzZ7r1d743cHVLXvnLeVuku5oM9w0.png' }} 
        style={styles.backgroundImage}
      >
        <View style={styles.container}>
          <Appbar.Header style={styles.header}>
            {isSelectionMode ? (
              <>
                <Appbar.Action icon="close" onPress={handleCancelSelection} color="white" />
                <Appbar.Content 
                  title={`${selectedConversations.length} selected`} 
                  titleStyle={{ color: "white" }} 
                />
                <Appbar.Action icon="delete" onPress={handleDeleteSelected} color="white" />
              </>
            ) : (
              <>
                <Appbar.BackAction onPress={() => router.back()} color="white" />
                <Appbar.Content title="Messages" titleStyle={{ color: "white" }} />
              </>
            )}
          </Appbar.Header>

          <Searchbar
            placeholder="Search conversations"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={{ color: "#333" }}
            placeholderTextColor="#666"
            iconColor="#333"
          />

          <FlatList
            data={filteredConversations}
            renderItem={renderConversationItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.conversationList}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No conversations yet</Text>
              </View>
            }
          />
        </View>
      </ImageBackground>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.66)', // Semi-transparent white overlay
  },
  header: {
    backgroundColor: "#6200ee",
    elevation: 4,
  },
  searchBar: {
    margin: 16,
    elevation: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  conversationList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    position: "relative",
  },
  unreadConversation: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderLeftWidth: 4,
    borderLeftColor: "#6200ee",
  },
  selectedConversation: {
    backgroundColor: "rgba(98, 0, 238, 0.1)",
    borderWidth: 2,
    borderColor: "#6200ee",
  },
  conversationDetails: {
    flex: 1,
    marginLeft: 16,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  workerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  unreadText: {
    color: "#000",
    fontWeight: "bold",
  },
  timestamp: {
    fontSize: 12,
    color: "#888",
  },
  jobRole: {
    fontSize: 14,
    color: "#555",
    marginTop: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  unreadBadge: {
    backgroundColor: "#6200ee",
    color: "white",
    position: "absolute",
    top: 12,
    right: 12,
  },
  deleteAction: {
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "flex-end",
    padding: 20,
    height: "100%",
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteActionText: {
    color: "white",
    fontWeight: "bold",
  },
  checkmarkContainer: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#6200ee",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 12,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
})

export default MessageScreen