"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  FlatList,
  Dimensions,
  Modal,
} from "react-native"
import Icon from "react-native-vector-icons/Feather"
import MaterialIcon from "react-native-vector-icons/MaterialCommunityIcons"
import { useRouter } from "expo-router"
import { db, auth } from "../firebaseConfig"
import { Badge } from "react-native-paper"
import { collection, query, doc, updateDoc, onSnapshot, getDoc, where, getDocs } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import JobDetailsModal from "./JobDetailsModal"
import { LinearGradient } from "expo-linear-gradient"

const { width } = Dimensions.get("window")

const roles = [
  { id: "domestic", title: "Domestic Worker", icon: "home", color: "#4A90E2" },
  { id: "beautician", title: "Beautician", icon: "scissors", color: "#E667B0" },
  { id: "tailor", title: "Tailor", icon: "edit-2", color: "#50C878" },
  { id: "driver", title: "Driver", icon: "truck", color: "#FF8C00" },
]

const RoleSelection = () => {
  const router = useRouter()
  const [selectedRoles, setSelectedRoles] = useState([])
  const [availableJobs, setAvailableJobs] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [bookmarkedJobs, setBookmarkedJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState(null)
  const [appliedJobs, setAppliedJobs] = useState([])
  const [showJobDetails, setShowJobDetails] = useState(false)
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0)
  const [newJobs, setNewJobs] = useState([])
  const [driverLicenseStatus, setDriverLicenseStatus] = useState("not_submitted")
  const [showDriverLicenseModal, setShowDriverLicenseModal] = useState(false)

  const fetchUserDetails = async (userId) => {
    try {
      const userDoc = doc(db, "users", userId)
      const userSnap = await getDoc(userDoc)
      if (userSnap.exists()) {
        return {
          fullName: userSnap.data().fullName,
          profileImage: userSnap.data().profileImage,
        }
      }
      return null
    } catch (error) {
      console.error("Error fetching user details:", error)
      return null
    }
  }

  const fetchUserDetailsRef = useRef(fetchUserDetails)

  useEffect(() => {
    fetchUserDetailsRef.current = fetchUserDetails
  }, [])

  const fetchUnreadMessagesCount = useCallback(async (userId) => {
    if (!userId) return

    try {
      const chatsRef = collection(db, "chats")
      const q = query(chatsRef, where("participants", "array-contains", userId))

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const totalUnread = snapshot.docs.reduce((total, doc) => {
          const chatData = doc.data()
          return total + (chatData.unreadCount?.[userId] || 0)
        }, 0)
        setTotalUnreadMessages(totalUnread)
      })

      return unsubscribe
    } catch (error) {
      console.error("Error fetching unread messages count:", error)
      return () => {}
    }
  }, [])

  // Modified fetchAvailableJobs: filter by selectedRoles and check driver license status
  const fetchAvailableJobs = useCallback(async () => {
    try {
      const jobsQuery = query(collection(db, "orders"))
      let initialJobsLoaded = false
      let prevJobs = []

      const unsubscribe = onSnapshot(jobsQuery, async (snapshot) => {
        const jobsPromises = snapshot.docs.map(async (doc) => {
          const jobData = { id: doc.id, ...doc.data() }
          const userDetails = await fetchUserDetailsRef.current(jobData.userId)
          return {
            ...jobData,
            userDetails,
            isBookmarked: bookmarkedJobs.includes(doc.id),
          }
        })

        let jobs = await Promise.all(jobsPromises)

        // Filter jobs according to selectedRoles
        if (selectedRoles.length > 0) {
          jobs = jobs.filter((job) => {
            // Match job.category to role.id (case-insensitive)
            return selectedRoles.some(
              (roleId) => job.category && job.category.toLowerCase().trim() === roleId.toLowerCase().trim(),
            )
          })

          // If driver role is selected but license is not verified, don't show driver jobs
          if (selectedRoles.includes("driver") && driverLicenseStatus !== "verified") {
            jobs = jobs.filter((job) => job.category.toLowerCase().trim() !== "driver")
          }
        }

        // Sort jobs by most recent first (activity feed style)
        const sortedJobs = jobs.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return (b.createdAt?.seconds || 0) < (a.createdAt?.seconds || 0) ? 1 : -1
          }
          return 0
        })

        // Activity feed: show new jobs as a flash/notice
        if (initialJobsLoaded) {
          const prevIds = prevJobs.map((j) => j.id)
          const newOnes = sortedJobs.filter((j) => !prevIds.includes(j.id))
          if (newOnes.length > 0) {
            setNewJobs((njobs) => [
              ...newOnes.map((j) => ({
                ...j,
                receivedAt: Date.now(),
              })),
              ...njobs,
            ])
            setTimeout(() => {
              setNewJobs((njobs) => njobs.filter((nj) => Date.now() - nj.receivedAt < 5000))
            }, 5000)
          }
        }
        prevJobs = sortedJobs
        setAvailableJobs(sortedJobs)
        setLoading(false)
        initialJobsLoaded = true
      })

      return unsubscribe
    } catch (error) {
      console.error("Error fetching jobs:", error)
      setLoading(false)
      return () => {}
    }
  }, [bookmarkedJobs, selectedRoles, driverLicenseStatus])

  const toggleBookmark = async (jobId) => {
    if (!currentUser) return

    try {
      const updatedBookmarks = bookmarkedJobs.includes(jobId)
        ? bookmarkedJobs.filter((id) => id !== jobId)
        : [...bookmarkedJobs, jobId]

      setBookmarkedJobs(updatedBookmarks)

      const userDoc = doc(db, "users", currentUser.uid)
      await updateDoc(userDoc, { bookmarkedJobs: updatedBookmarks })
    } catch (error) {
      console.error("Error updating bookmarks:", error)
    }
  }

  const fetchBookmarkedJobs = useCallback(async (userId) => {
    try {
      const userDoc = doc(db, "users", userId)
      const unsubscribe = onSnapshot(userDoc, (doc) => {
        if (doc.exists()) {
          setBookmarkedJobs(doc.data().bookmarkedJobs || [])
        }
      })

      return unsubscribe
    } catch (error) {
      console.error("Error fetching bookmarked jobs:", error)
      return () => {}
    }
  }, [])

  const fetchUserRoles = useCallback(async (userId) => {
    try {
      const userDoc = doc(db, "users", userId)
      const unsubscribe = onSnapshot(userDoc, async (doc) => {
        if (doc.exists()) {
          setSelectedRoles(doc.data().jobRoles || [])

          // Check driver license status if available
          if (doc.data().driverLicenseStatus) {
            setDriverLicenseStatus(doc.data().driverLicenseStatus)
          }

          // If user has driver role, check driverLicenses collection for verification status
          if (doc.data().jobRoles && doc.data().jobRoles.includes("driver")) {
            const driverLicensesRef = collection(db, "driverLicenses")
            const q = query(driverLicensesRef, where("userId", "==", userId))

            const licensesSnapshot = await getDocs(q)
            if (!licensesSnapshot.empty) {
              // Get the most recent license document
              const licenseDoc = licensesSnapshot.docs.sort(
                (a, b) => (b.data().submittedAt?.seconds || 0) - (a.data().submittedAt?.seconds || 0),
              )[0]

              if (licenseDoc.data().status === "verified") {
                setDriverLicenseStatus("verified")

                // Also update the user document if needed
                if (doc.data().driverLicenseStatus !== "verified") {
                  await updateDoc(userDoc, { driverLicenseStatus: "verified" })
                }
              }
            }
          }
        }
      })

      return unsubscribe
    } catch (error) {
      console.error("Error fetching user roles:", error)
      return () => {}
    }
  }, [])

  const toggleRole = async (roleId) => {
    if (!currentUser) return

    try {
      // Special handling for driver role
      if (roleId === "driver") {
        // If trying to select driver role
        if (!selectedRoles.includes(roleId)) {
          // Check license status
          if (driverLicenseStatus === "not_submitted") {
            // Show driver license upload modal or navigate to profile
            setShowDriverLicenseModal(true)
          }
        }
      }

      const updatedRoles = selectedRoles.includes(roleId)
        ? selectedRoles.filter((id) => id !== roleId)
        : [...selectedRoles, roleId]

      setSelectedRoles(updatedRoles)

      const userDoc = doc(db, "users", currentUser.uid)
      await updateDoc(userDoc, { jobRoles: updatedRoles })
    } catch (error) {
      console.error("Error updating roles:", error)
    }
  }

  const fetchAppliedJobs = useCallback(async (userId) => {
    try {
      const userDoc = doc(db, "users", userId)
      const unsubscribe = onSnapshot(userDoc, (doc) => {
        if (doc.exists()) {
          setAppliedJobs(doc.data().appliedJobs || [])
        }
      })

      return unsubscribe
    } catch (error) {
      console.error("Error fetching applied jobs:", error)
      return () => {}
    }
  }, [])

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDetails = await fetchUserDetailsRef.current(user.uid)
        setCurrentUser({ ...user, ...userDetails })
        const unsubscribeRoles = await fetchUserRoles(user.uid)
        const unsubscribeBookmarks = await fetchBookmarkedJobs(user.uid)
        const unsubscribeApplied = await fetchAppliedJobs(user.uid)
        const unsubscribeJobs = await fetchAvailableJobs()
        const unsubscribeUnreadMessages = await fetchUnreadMessagesCount(user.uid)

        return () => {
          unsubscribeRoles && unsubscribeRoles()
          unsubscribeBookmarks && unsubscribeBookmarks()
          unsubscribeApplied && unsubscribeApplied()
          unsubscribeJobs && unsubscribeJobs()
          unsubscribeUnreadMessages && unsubscribeUnreadMessages()
        }
      } else {
        setCurrentUser(null)
        setSelectedRoles([])
        setAvailableJobs([])
        setBookmarkedJobs([])
        setAppliedJobs([])
        setTotalUnreadMessages(0)
        setLoading(false)
      }
    })

    return () => unsubscribeAuth()
  }, [fetchAvailableJobs, fetchUserRoles, fetchBookmarkedJobs, fetchAppliedJobs, fetchUnreadMessagesCount])

  // Get role color based on category
  const getRoleColor = (category) => {
    const role = roles.find((r) => r.id.toLowerCase() === (category || "").toLowerCase())
    return role ? role.color : "#4A90E2"
  }

  // Get role icon based on category
  const getRoleIcon = (category) => {
    const role = roles.find((r) => r.id.toLowerCase() === (category || "").toLowerCase())
    return role ? role.icon : "briefcase"
  }

  // Navigate to profile screen with license upload parameter
  const navigateToLicenseUpload = () => {
    setShowDriverLicenseModal(false)
    router.push({
      pathname: "/profile",
      params: { uploadLicense: "true" },
    })
  }

  // New Modern Job Card
  const renderFeedJobCard = ({ item: job }) => {
    const roleColor = getRoleColor(job.category)
    const roleIcon = getRoleIcon(job.category)

    return (
      <TouchableOpacity
        style={styles.modernJobCard}
        onPress={() => {
          setSelectedJob(job)
          setShowJobDetails(true)
        }}
      >
        <LinearGradient colors={["rgba(255,255,255,0.8)", "rgba(255,255,255,0.95)"]} style={styles.cardGradient}>
          {/* Category Badge */}
          <View style={[styles.categoryBadge, { backgroundColor: roleColor + "15" }]}>
            <Icon name={roleIcon} size={14} color={roleColor} />
            <Text style={[styles.categoryText, { color: roleColor }]}>
              {job.category ? job.category.charAt(0).toUpperCase() + job.category.slice(1) : "Job"}
            </Text>
          </View>

          {/* Job Header */}
          <View style={styles.modernJobHeader}>
            <Text style={styles.modernJobTitle} numberOfLines={1}>
              {job.jobTitle}
            </Text>
            <TouchableOpacity style={styles.modernBookmarkButton} onPress={() => toggleBookmark(job.id)}>
              <MaterialIcon
                name={job.isBookmarked ? "bookmark" : "bookmark-outline"}
                size={24}
                color={job.isBookmarked ? roleColor : "#9E9E9E"}
              />
            </TouchableOpacity>
          </View>

          {/* Job Description */}
          <Text style={styles.modernJobDescription} numberOfLines={2}>
            {job.jobDescription}
          </Text>

          {/* Job Details */}
          <View style={styles.modernJobDetails}>
            <View style={styles.modernDetailRow}>
              <MaterialIcon name="map-marker-outline" size={16} color="#757575" />
              <Text style={styles.modernDetailText} numberOfLines={1}>
                {job.location?.split(",")[0].trim() || "Location not specified"}
              </Text>
            </View>

            <View style={styles.modernDetailRow}>
              <MaterialIcon name="cash-multiple" size={16} color="#757575" />
              <Text style={styles.modernDetailText}>Rs. {job.price}</Text>
            </View>
          </View>

          {/* Client Info */}
          <View style={styles.modernClientInfo}>
            <Image
              source={
                job.userDetails?.profileImage
                  ? { uri: job.userDetails.profileImage }
                  : require("../assets/placeholder.png")
              }
              style={styles.modernClientAvatar}
              defaultSource={require("../assets/placeholder.png")}
            />
            <View style={styles.clientInfoText}>
              <Text style={styles.modernClientName} numberOfLines={1}>
                {job.userDetails?.fullName || "Unknown User"}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  // Helper function to format time ago
  const getTimeAgo = (timestamp) => {
    const now = Date.now()
    const seconds = Math.floor((now - timestamp) / 1000)

    if (seconds < 60) return `${seconds}s ago`

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`

    const weeks = Math.floor(days / 7)
    if (weeks < 4) return `${weeks}w ago`

    const months = Math.floor(days / 30)
    return `${months}mo ago`
  }

  // New job activity banner (shows for 5 seconds)
  const renderNewJobBanner = (job, idx) => (
    <View key={job.id + "-banner"} style={styles.newJobBanner}>
      <Icon name="bell" size={16} color="#388e3c" style={styles.bellIcon} />
      <Text style={styles.newJobBannerText}>New Job: {job.jobTitle}</Text>
    </View>
  )

  // Render driver license notice
  const renderDriverLicenseNotice = () => {
    if (!selectedRoles.includes("driver")) return null

    switch (driverLicenseStatus) {
      case "not_submitted":
        return (
          <TouchableOpacity style={styles.driverLicenseNotice} onPress={() => setShowDriverLicenseModal(true)}>
            <Icon name="alert-triangle" size={20} color="#FF8C00" style={styles.noticeIcon} />
            <Text style={styles.noticeText}>Upload your driver license to view driver jobs</Text>
            <Icon name="chevron-right" size={20} color="#FF8C00" />
          </TouchableOpacity>
        )
      case "pending":
        return (
          <View style={[styles.driverLicenseNotice, { backgroundColor: "#FFF8E1" }]}>
            <Icon name="clock" size={20} color="#FF8C00" style={styles.noticeIcon} />
            <Text style={styles.noticeText}>
              Your driver license is being verified. You'll be able to view driver jobs once approved.
            </Text>
          </View>
        )
      case "rejected":
        return (
          <TouchableOpacity
            style={[styles.driverLicenseNotice, { backgroundColor: "#FFEBEE" }]}
            onPress={() => setShowDriverLicenseModal(true)}
          >
            <Icon name="x-circle" size={20} color="#F44336" style={styles.noticeIcon} />
            <Text style={styles.noticeText}>Your driver license was rejected. Please upload a valid license.</Text>
            <Icon name="refresh-cw" size={20} color="#F44336" />
          </TouchableOpacity>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.appBar}>
        <View style={styles.appBarContent}>
          <View style={styles.leftSection}>
            <Image
              source={{ uri: "https://i.ibb.co/4Zdjp647/logof.jpg" }}
              style={styles.avatar}
              defaultSource={require("../assets/placeholder.png")}
            />
          </View>
          <View style={styles.rightSection}>
            <View style={styles.messageButtonContainer}>
              <TouchableOpacity style={styles.messageButton} onPress={() => router.push("/messageScreen")}>
                <Icon name="message-circle" size={24} color="#4A90E2" />
                {totalUnreadMessages > 0 && (
                  <Badge style={styles.messageBadge} size={20}>
                    {totalUnreadMessages}
                  </Badge>
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.avatarButton} onPress={() => router.push("/profile")}>
              <Image
                source={
                  currentUser?.profileImage ? { uri: currentUser.profileImage } : require("../assets/avatar.jpeg")
                }
                style={styles.avatar}
                defaultSource={require("../assets/placeholder.png")}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>Hi {currentUser?.fullName || "User"},</Text>
          <Text style={styles.subtitle}>Select your roles</Text>
          <Text style={styles.sectionTitleUrdu}>اپنا کردار منتخب کریں</Text>
        </View>

        <View style={styles.rolesGrid}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={[styles.roleCard, selectedRoles.includes(role.id) && styles.roleCardSelected]}
              onPress={() => toggleRole(role.id)}
            >
              <View style={[styles.iconContainer, { backgroundColor: role.color + "15" }]}>
                <Icon name={role.icon} size={24} color={role.color} />
              </View>
              <Text style={styles.roleTitle}>{role.title}</Text>
              {/* Urdu translation for role title */}
              <Text style={[styles.sectionTitleUrdu, { marginTop: 2 }]}>
                {role.id === "domestic" && "گھریلو ملازمہ"}
                {role.id === "beautician" && "بیوٹیشن"}
                {role.id === "tailor" && "درزی"}
                {role.id === "driver" && "ڈرائیور"}
              </Text>
              {selectedRoles.includes(role.id) && (
                <View style={styles.checkmark}>
                  <Icon name="check-circle" size={20} color="#4A90E2" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Driver License Notice */}
        {renderDriverLicenseNotice()}

        <View style={styles.jobsSection}>
          <Text style={styles.sectionTitle}>Available Jobs</Text>
          <Text style={styles.sectionTitleUrdu}>دستیاب نوکریاں</Text>
          {/* New Jobs Banner */}
          {newJobs.map(renderNewJobBanner)}
          {/* If no role is selected */}
          {selectedRoles.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Icon name="briefcase" size={48} color="#E0E0E0" />
              <Text style={styles.noJobsText}>
                Please select your role(s) to view jobs{"\n"}براہ مہربانی نوکری دیکھنے کے لئے اپنا کردار منتخب کریں
              </Text>
            </View>
          ) : availableJobs.length > 0 ? (
            <FlatList
              data={availableJobs}
              keyExtractor={(item) => item.id}
              renderItem={renderFeedJobCard}
              scrollEnabled={false}
              contentContainerStyle={styles.jobsList}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <Icon name="search" size={48} color="#E0E0E0" />
              <Text style={styles.noJobsText}>
                No jobs available for your selected role(s){"\n"}آپ کے منتخب کردہ کردار کے لیے کوئی نوکری دستیاب نہیں ہے
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]} onPress={() => {}}>
          <Icon name="home" size={24} color="#4A90E2" />
          <Text style={[styles.navText, styles.navTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/orders")}>
          <Icon name="shopping-bag" size={24} color="#666" />
          <Text style={styles.navText}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/profile")}>
          <Icon name="user" size={24} color="#666" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Driver License Modal */}
      <Modal
        visible={showDriverLicenseModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDriverLicenseModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Driver License Required</Text>
              <TouchableOpacity onPress={() => setShowDriverLicenseModal(false)}>
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Icon name="truck" size={48} color="#FF8C00" style={styles.modalIcon} />

              <Text style={styles.modalText}>
                To apply for driver jobs, you need to upload your driver license for verification.
              </Text>

              <Text style={styles.modalSubText}>
                Your license will be reviewed by our team and you'll be notified once it's verified.
              </Text>

              <TouchableOpacity style={styles.uploadButton} onPress={navigateToLicenseUpload}>
                <Text style={styles.uploadButtonText}>Upload License</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.laterButton} onPress={() => setShowDriverLicenseModal(false)}>
                <Text style={styles.laterButtonText}>I'll do it later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Job Details Modal */}
      <JobDetailsModal
        visible={showJobDetails}
        job={selectedJob}
        onClose={() => setShowJobDetails(false)}
        onApply={() => {}}
        isApplied={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  appBar: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  appBarContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  messageButtonContainer: {
    position: "relative",
    marginRight: 16,
  },
  messageButton: {
    padding: 8,
  },
  messageBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#ff4444",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  avatarButton: {
    padding: 8,
  },
  greetingSection: {
    padding: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  rolesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 16,
  },
  roleCard: {
    width: "46%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  roleCardSelected: {
    borderWidth: 2,
    borderColor: "#4A90E2",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
  },
  checkmark: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  jobsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    color: "#333",
  },
  sectionTitleUrdu: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  noJobsText: {
    textAlign: "center",
    color: "#666",
    marginTop: 16,
    lineHeight: 22,
  },
  jobsList: {
    paddingBottom: 20,
  },
  // Modern Job Card Styles
  modernJobCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardGradient: {
    padding: 16,
    borderRadius: 16,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  modernJobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modernJobTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212121",
    flex: 1,
    marginRight: 8,
  },
  modernBookmarkButton: {
    padding: 4,
  },
  modernJobDescription: {
    fontSize: 14,
    color: "#424242",
    marginBottom: 16,
    lineHeight: 20,
  },
  modernJobDetails: {
    marginBottom: 16,
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    padding: 12,
  },
  modernDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  modernDetailText: {
    fontSize: 14,
    color: "#424242",
    marginLeft: 8,
    flex: 1,
  },
  modernClientInfo: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  modernClientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: "#f0f0f0",
    borderWidth: 2,
    borderColor: "#fff",
  },
  clientInfoText: {
    flex: 1,
  },
  modernClientName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#424242",
  },
  postedTime: {
    fontSize: 12,
    color: "#9E9E9E",
    marginTop: 2,
  },
  newJobBanner: {
    backgroundColor: "#e7f7df",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  bellIcon: {
    marginRight: 8,
  },
  newJobBannerText: {
    color: "#388e3c",
    fontWeight: "600",
    fontSize: 14,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    height: 60,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  navItemActive: {
    marginTop: -10,
    borderTopWidth: 2,
    borderTopColor: "#4A90E2",
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: "#666",
  },
  navTextActive: {
    color: "#4A90E2",
  },
  // Driver License Notice
  driverLicenseNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FF8C00",
  },
  noticeIcon: {
    marginRight: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    marginRight: 8,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    padding: 0,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalBody: {
    padding: 20,
    alignItems: "center",
  },
  modalIcon: {
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 24,
  },
  modalSubText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  uploadButton: {
    backgroundColor: "#FF8C00",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  laterButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  laterButtonText: {
    color: "#666",
    fontSize: 16,
  },
})

export default RoleSelection
