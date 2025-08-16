import { useEffect, useState } from "react"
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, StatusBar } from "react-native"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { collection, query, onSnapshot, orderBy, where, doc, getDoc } from "firebase/firestore"
import { db, auth } from "../firebaseConfig"
import { Badge } from "react-native-paper"

const HomeScreen = () => {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
  })

  const [recentJobs, setRecentJobs] = useState([])
  const [workers, setWorkers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch current user's profile
    const fetchCurrentUser = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))
        if (userDoc.exists()) {
          setCurrentUser(userDoc.data())
        }
      }
    }
    fetchCurrentUser()

    // Set up real-time listener for orders - ONLY for the current user
    const setupOrdersListener = () => {
      if (!auth.currentUser) return null;
      
      const currentUserId = auth.currentUser.uid;
      const ordersRef = collection(db, "orders");
      
      // Modified query to filter by current user's ID
      const ordersQuery = query(
        ordersRef,
        where("userId", "==", currentUserId),
        orderBy("createdAt", "desc")
      );

      return onSnapshot(
        ordersQuery,
        (snapshot) => {
          // Update stats
          const total = snapshot.size;
          let active = 0;
          let completed = 0;
          let cancelled = 0;

          const jobs = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            const status = data.status;

            // Update counters
            if (status === "active") active++;
            else if (status === "completed") completed++;
            else if (status === "cancelled") cancelled++;

            // Add to jobs array
            jobs.push({
              id: doc.id,
              ...data,
              location: data.location?.split(",")[0] || "",
              numberApplied: data.applicants ? data.applicants.length : 0,
            });
          });

          setStats({ total, active, completed, cancelled });
          setRecentJobs(jobs.slice(0, 3));
          setLoading(false);
        },
        (error) => {
          console.error("Error listening to orders:", error);
          setLoading(false);
        }
      );
    };

    // Set up real-time listener for workers
    const usersRef = collection(db, "users")
    const workersQuery = query(usersRef, where("role", "==", "employee"))

    const workersUnsubscribe = onSnapshot(
      workersQuery,
      (snapshot) => {
        const workersList = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "Anonymous",
          jobRole: doc.data().jobRole || "Worker",
          rating: doc.data().rating || 0,
          profileImage: doc.data().profileImage || null,
        }))
        setWorkers(workersList)
      },
      (error) => {
        console.error("Error listening to workers:", error)
      }
    )

    // Set up real-time listener for unread messages
    const fetchUnreadMessagesCount = async () => {
      if (!auth.currentUser) return

      const chatsRef = collection(db, "chats")
      const q = query(chatsRef, where("participants", "array-contains", auth.currentUser.uid))

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const totalUnread = snapshot.docs.reduce((total, doc) => {
          const chatData = doc.data()
          return total + (chatData.unreadCount?.[auth.currentUser.uid] || 0)
        }, 0)
        setTotalUnreadMessages(totalUnread)
      })

      return unsubscribe
    }

    const unsubscribeMessages = fetchUnreadMessagesCount()
    
    // Only set up orders listener when auth is initialized
    const ordersUnsubscribe = setupOrdersListener();

    // Cleanup subscriptions on unmount
    return () => {
      if (ordersUnsubscribe) ordersUnsubscribe();
      if (workersUnsubscribe) workersUnsubscribe();
      if (unsubscribeMessages) {
        unsubscribeMessages.then(unsub => unsub && unsub())
      }
    }
  }, [])

  const handleViewProfile = (workerId) => {
    router.push(`ClientSeeWorkerProfile?workerId=${workerId}`)
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* App Bar */}
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <Image source={{ uri: "https://i.ibb.co/4Zdjp647/logof.jpg" }} style={styles.logo} />
        </View>
        <View style={styles.appBarRight}>
          <View style={styles.messageButtonContainer}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push("messageScreen")}>
              <Icon name="message-outline" size={24} color="#000" />
              {totalUnreadMessages > 0 && (
                <Badge style={styles.messageBadge} size={20}>
                  {totalUnreadMessages}
                </Badge>
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => router.push("clientProfileScreen")}>
            {currentUser?.profileImage ? (
              <Image source={{ uri: currentUser.profileImage }} style={styles.avatarImage} />
            ) : (
              <Icon name="account-circle" size={32} color="#666" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Greetings */}
          <View style={styles.greetings}>
            <Text style={styles.greeting}>Hi {currentUser?.name || "there"},</Text>
            <Text style={styles.subGreeting}>Find the best workers for your job needs today.</Text>
            <Text style={styles.subGreeting}>آج اپنی ملازمت کی ضروریات کے لیے بہترین کارکن تلاش کریں۔</Text>
          </View>

        {  /* Stats Grid */}
            <View style={styles.statsGrid}>
              <TouchableOpacity style={styles.statCard}>
                <Icon name="checkbox-marked-circle-outline" size={24} color="#4CAF50" />
                <Text style={styles.statCount}>{stats.total}</Text>
                <Text style={styles.statTitle}>Total Orders</Text>
                <Text style={styles.statTitle}>کل آرڈرز</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statCard}>
                <Icon name="clock-outline" size={24} color="#2196F3" />
                <Text style={styles.statCount}>{stats.active}</Text>
                <Text style={styles.statTitle}>Active Orders</Text>
                <Text style={styles.statTitle}>فعال آرڈرز</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statCard}>
                <Icon name="check-circle-outline" size={24} color="#9C27B0" />
                <Text style={styles.statCount}>{stats.completed}</Text>
                <Text style={styles.statTitle}>Completed</Text>
                <Text style={styles.statTitle}>مکمل</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statCard}>
                <Icon name="close-circle-outline" size={24} color="#F44336" />
                <Text style={styles.statCount}>{stats.cancelled}</Text>
                <Text style={styles.statTitle}>Cancelled</Text>
                <Text style={styles.statTitle}>منسوخ</Text>
              </TouchableOpacity>
            </View>

         {   /* Quick Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("postJob")}>
                  <Text style={styles.primaryButtonText}>Post a New Job</Text>
                  <Text style={styles.primaryButtonText}>نئی ملازمت پوسٹ کریں</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("clientOrderScreen")}>
                  <Text style={styles.secondaryButtonText}>View Active Jobs</Text>
                  <Text style={styles.secondaryButtonText}>فعال ملازمتیں دیکھیں</Text>
                </TouchableOpacity>
              </View>

             { /* Recommended Workers */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recommended Workers</Text>
                  <Text style={styles.sectionTitle}>تجویز کردہ کارکن</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.workersScroll}>
                    {workers.map((worker) => (
                      <TouchableOpacity
                  key={worker.id}
                  style={styles.workerCard}
                  onPress={() => handleViewProfile(worker.id)}
                      >
                  {worker.profileImage ? (
                    <Image source={{ uri: worker.profileImage }} style={styles.workerImage} />
                  ) : (
                    <Icon name="account-circle" size={50} color="#666" />
                  )}
                  <Text style={styles.workerName}>{worker.name}</Text>
                  <Text style={styles.workerCategory}>{worker.jobRole}</Text>
                  <Text style={styles.workerCategory}>{worker.jobRole === "Worker" ? "کارکن" : worker.jobRole}</Text>
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={16} color="#FFD700" />
                    <Text style={styles.rating}>{worker.rating.toFixed(1)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewProfileButton}
                    onPress={() => router.push(`ClientSeeWorkerProfile?workerId=${worker.id}`)}
                  >
                    <Text style={styles.viewProfileText}>View Profile</Text>
                    <Text style={styles.viewProfileText}>پروفائل دیکھیں</Text>
                  </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                    {workers.length === 0 && (
                      <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateText}>No workers available at the moment</Text>
                  <Text style={styles.emptyStateText}>اس وقت کوئی کارکن دستیاب نہیں ہے</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>

                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Recent Job Posts</Text>
                      <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push("clientOrderScreen")}>
                        <Text style={styles.viewAllText}>View All</Text>
                        <Text style={styles.viewAllText}>سب دیکھیں</Text>
                      </TouchableOpacity>
                    </View>
                    {recentJobs.length > 0 ? (
                      recentJobs.map((job) => (
                        <TouchableOpacity
                    key={job.id}
                    style={styles.jobCard}
                    onPress={() => router.push(`ClientviewOrder?id=${job.id}`)}
                        >
                    <Text style={styles.jobTitle}>{job.jobTitle}</Text>
                    <View style={styles.jobDetails}>
                      <View style={styles.jobDetail}>
                        <Icon name="map-marker" size={16} color="#666" />
                        <Text style={styles.jobDetailText}>{job.location}</Text>
                      </View>
                      <View style={styles.jobDetail}>
                        <Icon name="account-group" size={16} color="#666" />
                        <Text style={styles.jobDetailText}>{job.numberApplied} Applicants</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                      backgroundColor:
                        job.status === "active"
                          ? "#E3F2FD"
                          : job.status === "completed"
                          ? "#E8F5E9"
                          : job.status === "cancelled"
                          ? "#FFEBEE"
                          : "#FFF3E0",
                          },
                        ]}
                      >
                        <Text
                          style={[
                      styles.statusText,
                      {
                        color:
                          job.status === "active"
                            ? "#1976D2"
                            : job.status === "completed"
                            ? "#2E7D32"
                            : job.status === "cancelled"
                            ? "#C62828"
                            : "#F57C00",
                      },
                          ]}
                        >
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.emptyStateContainer}>
                        <Icon name="clipboard-outline" size={48} color="#ccc" />
                        <Text style={styles.emptyStateText}>You haven't posted any jobs yet</Text>
                        <TouchableOpacity 
                    style={styles.emptyStateButton}
                    onPress={() => router.push("postJob")}
                        >
                    <Text style={styles.emptyStateButtonText}>Post Your First Job</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                      </ScrollView>

                      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <Icon name="home" size={24} color="#2196F3" />
          <Text style={[styles.navText, { color: "#2196F3" }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("clientOrderScreen")}>
          <Icon name="clipboard-list" size={24} color="#666" />
          <Text style={styles.navText}>Orders</Text>
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
  content: {
    flex: 1,
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
  appBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 32,
    height: 32,
  },
  appBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  messageButtonContainer: {
    position: "relative",
  },
  iconButton: {
    padding: 8,
  },
  messageBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#ff4444",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  greetings: {
    padding: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
  },
  subGreeting: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    margin: 4,
  },
  statCount: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 8,
  },
  statTitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  quickActions: {
    padding: 16,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#2196F3",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  viewAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  viewAllText: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "600",
  },
  workersScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  workerCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginRight: 16,
    alignItems: "center",
    width: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  workerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  workerCategory: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: "600",
  },
  viewProfileButton: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  viewProfileText: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "600",
  },
  jobCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  jobDetails: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  jobDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  jobDetailText: {
    fontSize: 14,
    color: "#666",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  navItem: {
    alignItems: "center",
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: "#2196F3",
    paddingTop: 8,
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: "#666",
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
    textAlign: "center",
  },
  emptyStateButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyStateButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
})

export default HomeScreen