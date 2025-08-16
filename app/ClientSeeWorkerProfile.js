"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Alert,
  Modal,
} from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import { SafeAreaView } from "react-native-safe-area-context"
import { getFirestore, doc } from "firebase/firestore"
import { getAuth } from "firebase/auth"
import { collection, addDoc, query, where, getDocs, getDoc } from "firebase/firestore"
import { LinearGradient } from "expo-linear-gradient"

const { width, height } = Dimensions.get("window")

const WorkerProfileScreen = () => {
  const router = useRouter()
  const { workerId } = useLocalSearchParams()
  const [worker, setWorker] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fullScreenImage, setFullScreenImage] = useState(null)

  useEffect(() => {
    const fetchWorkerData = async () => {
      try {
        const db = getFirestore()
        const workerDoc = await getDoc(doc(db, "users", workerId))

        if (workerDoc.exists()) {
          const workerData = workerDoc.data()
          console.log("Worker Data:", workerData)

          // Fetch reviewer names
          if (workerData.reviews && workerData.reviews.length > 0) {
            const reviewsWithNames = await Promise.all(
              workerData.reviews.map(async (review) => {
                if (review.reviewerId) {
                  const reviewerDoc = await getDoc(doc(db, "users", review.reviewerId))
                  if (reviewerDoc.exists()) {
                    const reviewerData = reviewerDoc.data()
                    return { ...review, reviewerName: reviewerData.fullName || "Anonymous" }
                  }
                }
                return { ...review, reviewerName: "Anonymous" }
              }),
            )
            workerData.reviews = reviewsWithNames
          }

          setWorker(workerData)
        } else {
          console.log("Worker not found")
          Alert.alert("Error", "Worker not found")
        }
      } catch (error) {
        console.error("Error fetching worker data:", error)
        Alert.alert("Error", "Failed to load worker data")
      } finally {
        setLoading(false)
      }
    }

    fetchWorkerData()
  }, [workerId])

  const handleImagePress = (imageUri) => {
    setFullScreenImage(imageUri)
  }

  const closeFullScreenImage = () => {
    setFullScreenImage(null)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  if (!worker) {
    return (
      <View style={styles.errorContainer}>
        <Text>Worker not found</Text>
      </View>
    )
  }

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewUser}>{item.reviewerName}</Text>
        <Text style={styles.reviewRating}>{"⭐".repeat(item.rating)}</Text>
      </View>
      <Text style={styles.reviewComment}>{item.review}</Text>
      <Text style={styles.reviewDate}>
        {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : "Date not available"}
      </Text>
    </View>
  )

  const renderImageRow = (images, rowIndex) => (
    <View key={rowIndex} style={styles.imageRow}>
      {images.map((image, index) => (
        <TouchableOpacity key={index} onPress={() => handleImagePress(image)}>
          <Image
            source={{ uri: image }}
            style={styles.galleryImage}
            defaultSource={require("../assets/placeholder.png")}
          />
        </TouchableOpacity>
      ))}
      {[...Array(3 - images.length)].map((_, index) => (
        <View key={`placeholder-${index}`} style={styles.galleryImagePlaceholder} />
      ))}
    </View>
  )

  const handleContactPress = async () => {
    const auth = getAuth()
    const db = getFirestore()

    if (!auth.currentUser) {
      Alert.alert("Error", "Please login to contact the worker")
      return
    }

    try {
      const userIds = [auth.currentUser.uid, workerId].sort()
      const chatId = userIds.join("_")

      const chatsRef = collection(db, "chats")
      const q = query(chatsRef, where("chatId", "==", chatId))
      const chatSnapshot = await getDocs(q)

      if (chatSnapshot.empty) {
        await addDoc(chatsRef, {
          chatId,
          participants: userIds,
          createdAt: new Date(),
          lastMessage: null,
          lastMessageTime: null,
        })
      }

      router.push({
        pathname: "/chatScreen",
        params: {
          workerId,
          workerName: worker.fullName,
          chatId,
        },
      })
    } catch (error) {
      console.error("Error creating chat:", error)
      Alert.alert("Error", "Failed to start chat. Please try again.")
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#6366f1", "#8b5cf6"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Image
          source={{
            uri: worker.profileImage || "https://via.placeholder.com/120",
          }}
          style={styles.profileImage}
        />
        <Text style={styles.workerName}>{worker.fullName || "Worker Name"}</Text>
        <Text style={styles.jobCategory}>{worker.jobRoles || "Job Role"}</Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>⭐ {worker.rating ? worker.rating.toFixed(2) : "5.0"}</Text>
          <Text style={styles.reviewCount}>({worker.reviews?.length || 0} reviews)</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bio}>{worker.about || "No description available"}</Text>
        </View>

        {worker.skills && worker.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills & Specialties</Text>
            <View style={styles.skillsContainer}>
              {worker.skills.map((skill, index) => (
                <View key={index} style={styles.skillItem}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {worker.experiences && worker.experiences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {worker.experiences.map((exp, index) => (
              <View key={index} style={styles.experienceItem}>
                <Text style={styles.experienceTitle}>{exp.title}</Text>
                <Text style={styles.experienceCompany}>{exp.company}</Text>
                <Text style={styles.experienceDuration}>{exp.duration}</Text>
              </View>
            ))}
          </View>
        )}

        {worker.myworkImages && worker.myworkImages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Gallery</Text>
            <View style={styles.imageGrid}>
              {Array.from({ length: Math.ceil(worker.myworkImages.length / 3) }, (_, i) =>
                renderImageRow(worker.myworkImages.slice(i * 3, i * 3 + 3), i),
              )}
            </View>
          </View>
        )}

        {worker.availableTimes && worker.availableTimes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Times</Text>
            {worker.availableTimes.map((slot, index) => (
              <Text key={index} style={styles.availabilitySlot}>
                • {typeof slot === "string" ? slot : `${slot.day}: ${slot.time}`}
              </Text>
            ))}
          </View>
        )}

        {worker.reviews && worker.reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reviews & Ratings</Text>
            <FlatList
              data={worker.reviews}
              renderItem={renderReviewItem}
              keyExtractor={(item, index) => index.toString()}
              scrollEnabled={false}
            />
          </View>
        )}

        <TouchableOpacity style={styles.reportButton}>
          <Icon name="flag" size={20} color="#FF0000" />
          <Text style={styles.reportButtonText}>Report this Worker</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleContactPress}>
          <Icon name="message-text" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Contact</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={!!fullScreenImage} transparent={true} onRequestClose={closeFullScreenImage}>
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={closeFullScreenImage}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Image source={{ uri: fullScreenImage }} style={styles.fullScreenImage} resizeMode="contain" />
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 20,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: "#fff",
  },
  workerName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  jobCategory: {
    fontSize: 18,
    color: "#e0e7ff",
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  rating: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 5,
    color: "#fff",
  },
  reviewCount: {
    fontSize: 14,
    color: "#e0e7ff",
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    backgroundColor: "#fff",
    marginBottom: 10,
    borderRadius: 10,
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#4f46e5",
  },
  bio: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4b5563",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  skillItem: {
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    color: "#4f46e5",
    fontSize: 14,
  },
  experienceItem: {
    marginBottom: 15,
  },
  experienceTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  experienceCompany: {
    fontSize: 16,
    color: "#4b5563",
    marginTop: 2,
  },
  experienceDuration: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  imageGrid: {
    flexDirection: "column",
  },
  imageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  galleryImage: {
    width: (width - 70) / 3,
    height: (width - 70) / 3,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  galleryImagePlaceholder: {
    width: (width - 70) / 3,
    height: (width - 70) / 3,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  availabilitySlot: {
    fontSize: 16,
    marginBottom: 5,
    color: "#4b5563",
  },
  actionButtonsContainer: {
    padding: 20,
    backgroundColor: "#fff",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4f46e5",
    padding: 15,
    borderRadius: 10,
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#fff",
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "bold",
  },
  reviewItem: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  reviewUser: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#1f2937",
  },
  reviewRating: {
    fontSize: 14,
  },
  reviewComment: {
    fontSize: 14,
    color: "#4b5563",
    marginTop: 5,
  },
  reviewDate: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 5,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    marginBottom: 20,
  },
  reportButtonText: {
    color: "#ef4444",
    marginLeft: 5,
    fontSize: 14,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: width,
    height: height,
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 1,
  },
})

export default WorkerProfileScreen

