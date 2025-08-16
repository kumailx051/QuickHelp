import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
  FlatList,
  Alert,
} from 'react-native';
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";

import { 
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
  Feather
} from '@expo/vector-icons';
import { getFirestore, collection, getDocs, query, where, orderBy, limit, doc, updateDoc, setDoc, getDoc, onSnapshot, Timestamp } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

const AdminDashboard = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  
  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationAnimation = useRef(new Animated.Value(0)).current;
  
  // State for dashboard data
  const [stats, setStats] = useState([
    { 
      id: 1, 
      title: 'Total Users\nکل صارفین', 
      count: 0, 
      icon: 'people-outline', 
      color: '#2196F3' 
    },
    { 
      id: 2, 
      title: 'Total Workers\nکل ورکرز', 
      count: 0, 
      icon: 'briefcase-outline', 
      color: '#9C27B0' 
    },
    { 
      id: 3, 
      title: 'Total Job Posts\nکل نوکریاں', 
      count: 0, 
      icon: 'document-text-outline', 
      color: '#4CAF50' 
    },
    { 
      id: 4, 
      title: 'Approved Users\nمنظور شدہ صارفین', 
      count: 0, 
      icon: 'checkmark-circle-outline', 
      color: '#FF9800' 
    },
  ]);
  
  const [activities, setActivities] = useState([]);

  // Fetch data from Firestore and set up real-time listeners
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const db = getFirestore();
        
        // Get all users
        const usersSnapshot = await getDocs(collection(db, "users"));
        const totalUsers = usersSnapshot.size;
        
        // Count workers (users with role: "employee")
        let workerCount = 0;
        // Count verified users
        let verifiedCount = 0;
        
        const userData = [];
        usersSnapshot.forEach((doc) => {
          const user = doc.data();
          if (user.role === "employee") {
            workerCount++;
          }
          if (user.status === "verified") {
            verifiedCount++;
          }
          
          // Add to user activity data if it has a verificationDate field
          if (user.verificationDate) {
            userData.push({
              id: doc.id,
              type: 'user',
              name: user.fullName || user.name || 'New User',
              role: user.role || 'user',
              timestamp: user.verificationDate,
              status: user.status || 'unverified'
            });
          }
        });
        
        // Get job posts from orders collection
        const ordersSnapshot = await getDocs(collection(db, "orders"));
        const totalJobs = ordersSnapshot.size;
        
        const jobData = [];
        ordersSnapshot.forEach((doc) => {
          const job = doc.data();
          if (job.createdAt) {
            jobData.push({
              id: doc.id,
              type: 'job',
              title: job.jobTitle || 'New Job',
              description: job.jobDescription || '',
              timestamp: job.createdAt,
              location: job.location || ''
            });
          }
        });
        
        // Update stats
        const updatedStats = [...stats];
        updatedStats[0].count = totalUsers;
        updatedStats[1].count = workerCount;
        updatedStats[2].count = totalJobs;
        updatedStats[3].count = verifiedCount;
        setStats(updatedStats);
        
        // Combine and sort activities by timestamp (newest first)
        const allActivities = [...userData, ...jobData]
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 10); // Limit to 10 activities
        
        // Format activities for display
        const formattedActivities = allActivities.map((activity, index) => {
          const timestamp = new Date(activity.timestamp);
          const now = new Date();
          const diffMs = now - timestamp;
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMins / 60);
          const diffDays = Math.floor(diffHours / 24);
          
          let timeAgo;
          if (diffMins < 60) {
            timeAgo = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
          } else if (diffHours < 24) {
            timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
          } else {
            timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
          }
          
          if (activity.type === 'user') {
            return {
              id: index + 1,
              type: 'user',
              title: 'New user registered\nنیا صارف رجسٹر ہوا',
              description: `${activity.name} registered as a ${activity.role}\n${activity.name} نے ${activity.role} کے طور پر رجسٹر کیا`,
              time: timeAgo,
              timestamp: timestamp,
              icon: 'person-add-outline',
              color: '#2196F3',
              status: activity.status,
              read: false
            };
          } else {
            return {
              id: index + 1,
              type: 'job',
              title: 'New job posted\nنئی نوکری پوسٹ کی گئی',
              description: `${activity.title} in ${activity.location}\n${activity.location ? `مقام: ${activity.location}` : ''}`,
              time: timeAgo,
              timestamp: timestamp,
              icon: 'briefcase-outline',
              color: '#4CAF50',
              read: false
            };
          }
        });
        
        setActivities(formattedActivities);
        
        // Set notifications from activities
        await setupNotifications(formattedActivities);
        
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up real-time listeners for new users and jobs
    const db = getFirestore();
    
    // Listen for new users
    const unsubscribeUsers = onSnapshot(
      query(collection(db, "users"), orderBy("verificationDate", "desc"), limit(5)),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const user = change.doc.data();
            if (user.verificationDate) {
              const timestamp = new Date(user.verificationDate);
              const now = new Date();
              const diffMs = now - timestamp;
              const diffMins = Math.floor(diffMs / 60000);
              
              // Only add to notifications if created in the last 30 minutes
              if (diffMins < 30) {
                addNotification({
                  id: change.doc.id,
                  type: 'user',
                  title: 'New user registered',
                  description: `${user.fullName || user.name || 'New User'} registered as a ${user.role || 'user'}`,
                  timestamp: timestamp,
                  icon: 'person-add-outline',
                  color: '#2196F3',
                  status: user.status || 'unverified',
                  read: false
                });
              }
            }
          }
        });
      },
      (error) => {
        console.error("Error listening for new users:", error);
      }
    );
    
    // Listen for new jobs
    const unsubscribeJobs = onSnapshot(
      query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(5)),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const job = change.doc.data();
            if (job.createdAt) {
              const timestamp = new Date(job.createdAt);
              const now = new Date();
              const diffMs = now - timestamp;
              const diffMins = Math.floor(diffMs / 60000);
              
              // Only add to notifications if created in the last 30 minutes
              if (diffMins < 30) {
                addNotification({
                  id: change.doc.id,
                  type: 'job',
                  title: 'New job posted',
                  description: `${job.jobTitle || 'New Job'} in ${job.location || ''}`,
                  timestamp: timestamp,
                  icon: 'briefcase-outline',
                  color: '#4CAF50',
                  read: false
                });
              }
            }
          }
        });
      },
      (error) => {
        console.error("Error listening for new jobs:", error);
      }
    );
    
    // Clean up listeners
    return () => {
      unsubscribeUsers();
      unsubscribeJobs();
    };
  }, []);
  
  // Setup notifications from activities and check for stored read status
  const setupNotifications = async (activities) => {
    try {
      const db = getFirestore();
      const user = auth.currentUser;
      
      if (!user) return;
      
      // Get stored notification read status
      const notificationsRef = doc(db, "adminNotifications", user.uid);
      const notificationsDoc = await getDoc(notificationsRef);
      
      let readStatus = {};
      if (notificationsDoc.exists()) {
        readStatus = notificationsDoc.data().readStatus || {};
      }
      
      // Mark notifications as read if they exist in readStatus
      const notificationsWithReadStatus = activities.map(notification => {
        const notificationId = `${notification.type}-${notification.id}`;
        return {
          ...notification,
          read: readStatus[notificationId] === true
        };
      });
      
      setNotifications(notificationsWithReadStatus);
      
      // Count unread notifications
      const unread = notificationsWithReadStatus.filter(notification => !notification.read).length;
      setUnreadCount(unread);
      
    } catch (error) {
      console.error("Error setting up notifications:", error);
    }
  };
  
  // Add a new notification
  const addNotification = (notification) => {
    setNotifications(prev => {
      // Check if notification already exists
      const exists = prev.some(n => 
        n.id === notification.id && n.type === notification.type
      );
      
      if (exists) return prev;
      
      // Add new notification at the beginning
      const updated = [notification, ...prev];
      
      // Update unread count
      setUnreadCount(count => count + 1);
      
      return updated;
    });
  };
  
  // Mark notifications as read
  const markNotificationsAsRead = async () => {
    try {
      const db = getFirestore();
      const user = auth.currentUser;
      
      if (!user) return;
      
      // Update read status in state
      const updatedNotifications = notifications.map(notification => ({
        ...notification,
        read: true
      }));
      
      setNotifications(updatedNotifications);
      setUnreadCount(0);
      
      // Store read status in Firestore
      const readStatus = {};
      updatedNotifications.forEach(notification => {
        const notificationId = `${notification.type}-${notification.id}`;
        readStatus[notificationId] = true;
      });
      
      const notificationsRef = doc(db, "adminNotifications", user.uid);
      await setDoc(notificationsRef, { readStatus }, { merge: true });
      
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };
  
  // Toggle notifications panel
  const toggleNotifications = () => {
    if (showNotifications) {
      // Hide notifications
      Animated.timing(notificationAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowNotifications(false);
      });
    } else {
      // Show notifications and mark as read
      setShowNotifications(true);
      Animated.timing(notificationAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Mark notifications as read when opened
      markNotificationsAsRead();
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/signup/login");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Logout Failed", "Please try again.");
    }
  };

  const quickActions = [
    { 
      id: 1, 
      title: 'View Pending Users\nزیر التواء صارفین دیکھیں', 
      icon: 'time-outline', 
      color: '#2196F3',
      onPress: () => router.push('adminUserManage')
    },
    { 
      id: 2, 
      title: 'View Job Posts\nنوکریاں دیکھیں', 
      icon: 'briefcase-outline', 
      color: '#4CAF50',
      onPress: () => router.push('adminJobManage')
    },
    { 
      id: 3, 
      title: 'Logout\nلاگ آؤٹ', 
      icon: 'log-out-outline', 
      color: '#9C27B0',
      onPress: handleLogout
    },
  ];

  // Render stat card
  const renderStatCard = (item) => (
    <View key={item.id} style={styles.statCard}>
      <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon} size={24} color={item.color} />
      </View>
      <Text style={styles.statCount}>{item.count}</Text>
      <Text style={styles.statTitle}>{item.title}</Text>
    </View>
  );

  // Render activity item
  const renderActivityItem = (item) => (
    <View key={item.id} style={styles.activityItem}>
      <View style={[styles.activityIconContainer, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon} size={20} color={item.color} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activityDescription}>{item.description}</Text>
        <Text style={styles.activityTime}>{item.time}</Text>
        {item.status === 'pending' && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Pending</Text>
          </View>
        )}
      </View>
    </View>
  );
  
  // Render notification item
  const renderNotificationItem = ({ item }) => (
    <View style={[styles.notificationItem, !item.read && styles.unreadNotification]}>
      <View style={[styles.notificationIconContainer, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon} size={20} color={item.color} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationDescription}>{item.description}</Text>
        <Text style={styles.notificationTime}>{item.time}</Text>
        {item.status === 'pending' && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Pending</Text>
          </View>
        )}
      </View>
    </View>
  );

  // Render quick action button
  const renderQuickAction = (item) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.quickActionButton}
      onPress={item.onPress}
    >
      <View style={styles.quickActionContent}>
        <View style={[styles.quickActionIcon, { backgroundColor: `${item.color}20` }]}>
          <Ionicons name={item.icon} size={18} color={item.color} />
        </View>
        <Text style={styles.quickActionTitle}>{item.title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9E9E9E" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
     { /* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>
          Admin Dashboard {"\n"}
          <Text style={{ fontSize: 13, color: "#757575", fontWeight: "400" }}>
            ایڈمن ڈیش بورڈ
          </Text>
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
          style={styles.headerIcon}
          onPress={toggleNotifications}
            >
          <Ionicons name="notifications-outline" size={22} color="#000000" />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Notifications Panel */}
      {showNotifications && (
        <Animated.View 
          style={[
            styles.notificationsPanel,
            {
              opacity: notificationAnimation,
              transform: [
                {
                  translateY: notificationAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.notificationsHeader}>
            <Text style={styles.notificationsTitle}>Notifications</Text>
            <TouchableOpacity onPress={toggleNotifications}>
              <Ionicons name="close" size={22} color="#000000" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item, index) => `notification-${index}`}
            contentContainerStyle={styles.notificationsList}
            ListEmptyComponent={
              <View style={styles.emptyNotifications}>
                <Text style={styles.emptyNotificationsText}>No notifications</Text>
              </View>
            }
          />
        </Animated.View>
      )}

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Loading dashboard data...</Text>
          </View>
        ) : (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {stats.map(renderStatCard)}
            </View>

            {/* Activity Feed */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      Activity Feed{"\n"}
                      <Text style={{ fontSize: 13, color: "#757575", fontWeight: "400" }}>
                      حالیہ سرگرمیاں
                      </Text>
                    </Text>
                    </View>
                    <View style={styles.activityList}>
                    {activities.length > 0 ? (
                      activities.map(renderActivityItem)
                    ) : (
                      <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No recent activities{"\n"}کوئی حالیہ سرگرمی نہیں</Text>
                      </View>
                    )}
                    </View>
                  </View>

                  {/* Quick Actions */}
            <View style={styles.section}>
              <View style={styles.quickActionsList}>
                {quickActions.map(renderQuickAction)}
              </View>
            </View>
          </>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('home')}
        >
          <Ionicons 
            name={activeTab === 'home' ? 'home' : 'home-outline'} 
            size={24} 
            color={activeTab === 'home' ? '#2196F3' : '#757575'} 
          />
          <Text style={[styles.navLabel, activeTab === 'home' && styles.activeNavLabel]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => {
            setActiveTab('jobs')
            router.push('adminJobManage');
          }}
        >
          <Ionicons 
            name={activeTab === 'jobs' ? 'briefcase' : 'briefcase-outline'} 
            size={24} 
            color={activeTab === 'jobs' ? '#2196F3' : '#757575'} 
          />
          <Text style={[styles.navLabel, activeTab === 'jobs' && styles.activeNavLabel]}>
            Manage Jobs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => {
            setActiveTab('profile');
            router.push('adminUserManage');
          }}
        >
          <Ionicons 
            name={activeTab === 'profile' ? 'person' : 'person-outline'} 
            size={24} 
            color={activeTab === 'profile' ? '#2196F3' : '#757575'} 
          />
          <Text style={[styles.navLabel, activeTab === 'profile' && styles.activeNavLabel]}>
            Manage Users
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 16,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notificationsPanel: {
    position: 'absolute',
    top: 60,
    right: 10,
    width: width * 0.9,
    maxHeight: height * 0.7,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 100,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  notificationsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  notificationsList: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  unreadNotification: {
    backgroundColor: '#F0F8FF',
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  emptyNotifications: {
    padding: 20,
    alignItems: 'center',
  },
  emptyNotificationsText: {
    color: '#9E9E9E',
    fontSize: 14,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    height: 300,
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statCount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  activityList: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activityItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  statusBadge: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#9E9E9E',
    fontSize: 14,
  },
  quickActionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingVertical: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 12,
    marginTop: 4,
    color: '#757575',
  },
  activeNavLabel: {
    color: '#2196F3',
    fontWeight: '500',
  },
});

export default AdminDashboard;