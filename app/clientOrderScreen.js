"use client"

import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { collection, query, getDocs, doc, getDoc, updateDoc, deleteDoc, where } from "firebase/firestore"
import { db, auth } from "../firebaseConfig"

const TABS = [
  { id: "all", title: "", icon: "folder-outline", count: 0 },
  { id: "active", title: "", icon: "clock-outline", count: 0 },
  { id: "completed", title: "", icon: "check-circle-outline", count: 0 },
  { id: "canceled", title: "", icon: "close-circle-outline", count: 0 },
]

const OrdersScreen = () => {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState("all")
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tabsWithCount, setTabsWithCount] = useState(TABS)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      
      // Check if user is authenticated
      if (!auth.currentUser) {
        console.error("No authenticated user found")
        Alert.alert("Error", "You must be logged in to view orders")
        setLoading(false)
        return
      }
      
      const currentUserId = auth.currentUser.uid
      
      // Create a query that filters orders by the current user's ID
      const ordersQuery = query(
        collection(db, "orders"),
        where("userId", "==", currentUserId)
      )
      
      const querySnapshot = await getDocs(ordersQuery)
      const ordersData = []

      for (const docSnapshot of querySnapshot.docs) {
        const order = docSnapshot.data()
        
        // Since we're only showing the current user's orders,
        // we can use the current user's name directly
        ordersData.push({
          id: docSnapshot.id,
          ...order,
          // You can still fetch the user name if needed, but it's optional
          // since these are the current user's own orders
        })
      }

      setOrders(ordersData)
    } catch (error) {
      console.error("Error fetching orders:", error)
      Alert.alert("Error", "Failed to fetch orders")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchOrders()
  }, [])

  const filterOrders = useCallback(() => {
    let filtered = orders

    if (activeTab !== "all") {
      filtered = filtered.filter((order) => order.status === activeTab)
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (order.location && order.location.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    setFilteredOrders(filtered)
  }, [activeTab, orders, searchQuery])

  useEffect(() => {
    filterOrders()
    updateTabCounts()
  }, [filterOrders, orders])

  const updateTabCounts = () => {
    const newTabs = TABS.map((tab) => ({
      ...tab,
      count: tab.id === "all" ? orders.length : orders.filter((order) => order.status === tab.id).length,
    }))
    setTabsWithCount(newTabs)
  }

  const handleCompleteOrder = async (orderId) => {
    try {
      const orderRef = doc(db, "orders", orderId)
      await updateDoc(orderRef, {
        status: "completed",
      })
      fetchOrders()
      Alert.alert("Success", "Order marked as completed")
    } catch (error) {
      console.error("Error completing order:", error)
      Alert.alert("Error", "Failed to complete order")
    }
  }

  const handleDeleteOrder = async (orderId) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this order?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const orderRef = doc(db, "orders", orderId)
            await deleteDoc(orderRef)
            fetchOrders()
            Alert.alert("Success", "Order deleted successfully")
          } catch (error) {
            console.error("Error deleting order:", error)
            Alert.alert("Error", "Failed to delete order")
          }
        },
      },
    ])
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case "active":
        return {
          container: { backgroundColor: "#E3F2FD" },
          text: { color: "#2196F3" },
        }
      case "completed":
        return {
          container: { backgroundColor: "#E8F5E9" },
          text: { color: "#4CAF50" },
        }
      case "canceled":
        return {
          container: { backgroundColor: "#FFEBEE" },
          text: { color: "#F44336" },
        }
      default:
        return {
          container: { backgroundColor: "#F5F5F5" },
          text: { color: "#666666" },
        }
    }
  }

  const renderOrder = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderTitle}>{item.jobTitle}</Text>
        <Text style={styles.orderPrice}>Rs. {item.price}</Text>
      </View>

      <View style={[styles.statusBadge, getStatusStyle(item.status).container]}>
        <Text style={[styles.statusText, getStatusStyle(item.status).text]}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
      </View>

      <View style={styles.orderDetails}>
        {/* We don't need to show the user's name since these are the current user's orders */}
        <View style={styles.detailRow}>
          <Icon name="calendar" size={20} color="#666" />
          <Text style={styles.detailText}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "N/A"}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="clock-outline" size={20} color="#666" />
          <Text style={styles.detailText}>
            {item.startTime ? new Date(item.startTime).toLocaleTimeString() : "N/A"}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="map-marker" size={20} color="#666" />
          <Text style={styles.detailText}>
            {item.location ? item.location.split(",")[0] : "N/A"}
          </Text>
        </View>
      </View>

      <View style={styles.orderActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.completeButton]}
          onPress={() => handleCompleteOrder(item.id)}
          disabled={item.status === "completed"}
        >
          <Icon name="check-circle" size={20} color="#4CAF50" />
          <Text style={[styles.actionText, { color: "#4CAF50" }]}>Complete</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDeleteOrder(item.id)}>
          <Icon name="delete" size={20} color="#F44336" />
          <Text style={[styles.actionText, { color: "#F44336" }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const handleTabPress = (tabId) => {
    setActiveTab(tabId)
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        {showSearch ? (
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        ) : (
          <Text style={styles.appBarTitle}>My Orders</Text>
        )}
        <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
          <Icon name={showSearch ? "close" : "magnify"} size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Fixed Tabs */}
      <View style={styles.tabBar}>
        <View style={styles.tabContainer}>
          {tabsWithCount.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.7}
            >
              <Icon
                name={tab.icon}
                size={16}
                color={activeTab === tab.id ? "#2196F3" : "#666"}
                style={styles.tabIcon}
              />
              <Text style={[styles.tabCount, activeTab === tab.id && styles.activeTabText]}>{tab.count}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Orders List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`ClientviewOrder?id=${item.id}`)} activeOpacity={0.7}>
              {renderOrder({ item })}
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.ordersList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2196F3"]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="clipboard-outline" size={64} color="#ccc" style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No orders found</Text>
              {activeTab !== "all" ? (
                <Text style={styles.emptySubText}>
                  You don't have any {activeTab} orders yet
                </Text>
              ) : searchQuery ? (
                <Text style={styles.emptySubText}>
                  No results found for "{searchQuery}"
                </Text>
              ) : (
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => router.push("postJob")}
                >
                  <Text style={styles.emptyButtonText}>Post a New Job</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("clientHomeScreen")}>
          <Icon name="home" size={24} color="#666" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <Icon name="clipboard-list" size={24} color="#2196F3" />
          <Text style={[styles.navText, { color: "#2196F3" }]}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("clientProfileScreen")}>
          <Icon name="account" size={24} color="#666" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  appBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  appBarTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 16,
    marginHorizontal: 16,
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
    paddingVertical: 8,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    justifyContent: "flex-start",
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    minWidth: 80,
  },
  activeTab: {
    backgroundColor: "#E3F2FD",
  },
  tabIcon: {
    marginRight: 4,
  },
  tabCount: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#2196F3",
  },
  ordersList: {
    padding: 16,
    gap: 16,
    flexGrow: 1,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2196F3",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  orderDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailText: {
    fontSize: 16,
    color: "#666",
  },
  orderActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  completeButton: {
    backgroundColor: "#E8F5E9",
  },
  deleteButton: {
    backgroundColor: "#FFEBEE",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  navItem: {
    alignItems: "center",
    gap: 4,
  },
  activeNavItem: {
    borderTopWidth: 2,
    borderTopColor: "#2196F3",
    paddingTop: 8,
  },
  navText: {
    fontSize: 12,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 64,
    paddingBottom: 64,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default OrdersScreen