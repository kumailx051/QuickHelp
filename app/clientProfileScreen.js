"use client"

import { useState, useEffect } from "react"
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import { auth, db } from "../firebaseConfig"
import { collection, getDocs, query, where, updateDoc, doc, orderBy, limit, getDoc } from "firebase/firestore"
import { updatePassword } from "firebase/auth"
import { useRouter } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { signOut } from "firebase/auth"


const ProfileScreen = () => {
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    profileImage: "",
  })
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalJobs: 0,
    completedOrders: 0,
    canceledOrders: 0,
  })
  const [recentJobs, setRecentJobs] = useState([])
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)

  const insets = useSafeAreaInsets()
  const router = useRouter()

  // Move SETTINGS inside component to access state
  const SETTINGS = [
    {
      id: 1,
      title: "Change Password",
      icon: "lock-outline",
      onPress: () => setShowChangePassword(true),
    },
  ]

  useEffect(() => {
    fetchUserData()
    fetchOrderStats()
    fetchRecentCompletedJobs()
  }, [])

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser
      if (user) {
        const userRef = doc(db, "users", user.uid)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          setUserData(userSnap.data())
        } else {
          console.log("No such document!")
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      Alert.alert("Error", "Failed to load user data.")
    } finally {
      setLoading(false)
    }
  }

  const fetchOrderStats = async () => {
    try {
      const user = auth.currentUser
      if (user) {
        const ordersRef = collection(db, "orders")
        const q = query(ordersRef, where("userId", "==", user.uid))
        const querySnapshot = await getDocs(q)

        let total = 0
        let completed = 0
        let canceled = 0

        querySnapshot.forEach((doc) => {
          total++
          const order = doc.data()
          if (order.status === "completed") completed++
          if (order.status === "canceled") canceled++
        })

        setStats({
          totalJobs: total,
          completedOrders: completed,
          canceledOrders: canceled,
        })
      }
    } catch (error) {
      console.error("Error fetching order stats:", error)
      Alert.alert("Error", "Failed to load order statistics")
    }
  }

  const fetchRecentCompletedJobs = async () => {
    try {
      const user = auth.currentUser
      if (user) {
        const ordersRef = collection(db, "orders")
        const q = query(
          ordersRef,
          where("userId", "==", user.uid),
          where("status", "==", "completed"),
          orderBy("createdAt", "desc"),
          limit(3),
        )

        const querySnapshot = await getDocs(q)
        const completedJobs = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setRecentJobs(completedJobs)
      }
    } catch (error) {
      console.error("Error fetching completed jobs:", error)
      Alert.alert("Error", "Failed to load recent jobs")
    }
  }

  const handleUpdateProfile = async () => {
    try {
      const user = auth.currentUser
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          name: editName,
          phoneNumber: editPhone,
        })

        setUserData((prev) => ({
          ...prev,
          name: editName,
          phoneNumber: editPhone,
        }))

        setShowEditProfile(false)
        Alert.alert("Success", "Profile updated successfully")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      Alert.alert("Error", "Failed to update profile")
    }
  }

  const handleLogout = async () => {
      try {
        await signOut(auth)
        router.replace("/signup/login")
      } catch (error) {
        console.error("Logout error:", error)
        Alert.alert("Logout Failed", "Please try again.")
      }
    }
  
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      )
    }

  const getStatusStyle = (status) => {
    switch (status) {
      case "completed":
        return {
          container: { backgroundColor: "#E8F5E9" },
          text: { color: "#388E3C" },
        }
      case "pending":
        return {
          container: { backgroundColor: "#FFFDE7" },
          text: { color: "#FBC02D" },
        }
      case "canceled":
        return {
          container: { backgroundColor: "#FFEBEE" },
          text: { color: "#D32F2F" },
        }
      default:
        return {
          container: { backgroundColor: "#E0E0E0" },
          text: { color: "#757575" },
        }
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match")
      return
    }

    try {
      const user = auth.currentUser
      if (user) {
        await updatePassword(user, newPassword)
        setShowChangePassword(false)
        Alert.alert("Success", "Password changed successfully")
      }
    } catch (error) {
      console.error("Error changing password:", error)
      Alert.alert("Error", "Failed to change password")
    }
  }

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0].uri) {
        await uploadImage(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Error picking image:", error)
      Alert.alert("Error", "Failed to pick image")
    }
  }

  const uploadImage = async (uri) => {
    setUploadingImage(true)
    try {
      // Create form data for image upload
      const formData = new FormData()
      formData.append("image", {
        uri,
        type: "image/jpeg",
        name: "profile.jpg",
      })

      // Upload to ImageBB
      const response = await fetch("https://api.imgbb.com/1/upload?key=f31e40432a7b500dd75ce5255d3ea517", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        // Update Firebase with new image URL
        const user = auth.currentUser
        if (user) {
          await updateDoc(doc(db, "users", user.uid), {
            profileImage: data.data.url,
          })

          setUserData((prev) => ({
            ...prev,
            profileImage: data.data.url,
          }))

          Alert.alert("Success", "Profile picture updated successfully")
        }
      } else {
        throw new Error("Failed to upload image")
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      Alert.alert("Error", "Failed to upload image")
    } finally {
      setUploadingImage(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color="#2196F3" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: userData.profileImage || "https://via.placeholder.com/150" }}
              style={styles.profileImage}
            />
            {uploadingImage ? (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <TouchableOpacity style={styles.cameraIconContainer} onPress={handleImagePick}>
                <Icon name="camera" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{userData.name}</Text>
            <Text style={styles.email}>{userData.email}</Text>
            <Text style={styles.phoneNumber}>{userData.phoneNumber}</Text>
            {/* Urdu translations */}
           
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="briefcase-outline" size={28} color="#2196F3" />
            <Text style={styles.statCount}>{stats.totalJobs}</Text>
            <Text style={styles.statTitle}>Jobs{'\n'}نوکریاں</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="check-circle-outline" size={28} color="#2196F3" />
            <Text style={styles.statCount}>{stats.completedOrders}</Text>
            <Text style={styles.statTitle}>Completed{"\n"}Orders{'\n'}مکمل آرڈرز</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="close-circle-outline" size={28} color="#2196F3" />
            <Text style={styles.statCount}>{stats.canceledOrders}</Text>
            <Text style={styles.statTitle}>Canceled{"\n"}Orders{'\n'}منسوخ آرڈرز</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/PostJob/postJob")}>
            <Text style={styles.primaryButtonText}>Post a New Job{'\n'}نئی نوکری پوسٹ کریں</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("clientOrderScreen")}>
            <Text style={styles.secondaryButtonText}>View Active Jobs{'\n'}فعال نوکریاں دیکھیں</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Completed Jobs{'\n'}حالیہ مکمل شدہ نوکریاں</Text>
          </View>
          {recentJobs.map((job) => (
            <TouchableOpacity key={job.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <Text style={styles.jobTitle}>{job.jobTitle}</Text>
                <Text style={styles.jobPrice}>Rs. {job.price}</Text>
              </View>
              <View style={styles.jobFooter}>
                <Text style={styles.jobDate}>{new Date(job.createdAt).toLocaleDateString()}</Text>
                <View style={[styles.statusBadge, getStatusStyle("completed").container]}>
                  <Text style={[styles.statusText, getStatusStyle("completed").text]}>Completed{'\n'}مکمل</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings{'\n'}ترتیبات</Text>
          {SETTINGS.map((setting) => (
            <TouchableOpacity key={setting.id} style={styles.settingItem} onPress={setting.onPress}>
              <View style={styles.settingLeft}>
                <Icon name={setting.icon} size={24} color="#666" />
                <Text style={styles.settingTitle}>
                  {setting.title}
                  {setting.title === "Change Password" ? "\nپاس ورڈ تبدیل کریں" : ""}
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => {
            setEditName(userData.name)
            setEditPhone(userData.phoneNumber)
            setShowEditProfile(true)
          }}
        >
          <Icon name="account-edit" size={24} color="#2196F3" />
          <Text style={styles.editProfileText}>Edit Profile{'\n'}پروفائل میں ترمیم کریں</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={24} color="#F44336" />
          <Text style={styles.logoutText}>Logout{'\n'}لاگ آؤٹ</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile{'\n'}پروفائل میں ترمیم کریں</Text>
            <TextInput style={styles.input} placeholder="Name / نام" value={editName} onChangeText={setEditName} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number / فون نمبر"
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditProfile(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel{'\n'}منسوخ کریں</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleUpdateProfile}>
                <Text style={styles.saveButtonText}>Save{'\n'}محفوظ کریں</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePassword}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangePassword(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password{'\n'}پاس ورڈ تبدیل کریں</Text>
            <TextInput
              style={styles.input}
              placeholder="New Password / نیا پاس ورڈ"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password / تصدیق پاس ورڈ"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowChangePassword(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel{'\n'}منسوخ کریں</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleChangePassword}>
                <Text style={styles.saveButtonText}>Change{'\n'}تبدیل کریں</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("clientHomeScreen")}>
          <Icon name="home" size={24} color="#666" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("clientOrderScreen")}>
          <Icon name="clipboard-list" size={24} color="#666" />
          <Text style={styles.navText}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="account" size={24} color="#2196F3" />
          <Text style={[styles.navText, { color: "#2196F3" }]}>Profile</Text>
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
  scrollContent: {
    paddingBottom: 80, // Add padding to account for the bottom navigation
  },
  profileHeader: {
    flexDirection: "column",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraIconContainer: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#2196F3",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    alignItems: "center",
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 14,
    color: "#666",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginVertical: 8,
  },
  statTitle: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  actionButton: {
    alignItems: "center",
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    color: "#2196F3",
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  viewAllButton: {
    fontSize: 14,
    color: "#2196F3",
  },
  jobCard: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  jobPrice: {
    fontSize: 16,
    color: "#2196F3",
  },
  jobFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  jobDate: {
    fontSize: 12,
    color: "#666",
  },
  statusBadge: {
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingTitle: {
    fontSize: 16,
    color: "#333",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  logoutText: {
    fontSize: 16,
    color: "#F44336",
    fontWeight: "500",
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    marginTop: 8,
  },
  editProfileText: {
    fontSize: 16,
    color: "#2196F3",
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  saveButton: {
    backgroundColor: "#2196F3",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
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
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: "center",
    gap: 4,
  },
  navText: {
    fontSize: 12,
    color: "#666",
  },
  actionButtons: {
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
})

export default ProfileScreen

