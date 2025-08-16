import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import { SafeAreaView } from "react-native-safe-area-context"
import { doc, getDoc, updateDoc, onSnapshot, arrayUnion } from "firebase/firestore"
import { db, auth } from "../firebaseConfig"

const ReviewModal = ({ 
  visible, 
  onClose, 
  onSubmit, 
  rating,
  setRating,
  review,
  setReview 
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Rate Worker</Text>
        <Text style={styles.modalSubtitle}>How was your experience?</Text>
        
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <Icon
                name={rating >= star ? "star" : "star-outline"}
                size={40}
                color={rating >= star ? "#FFD700" : "#666"}
              />
            </TouchableOpacity>
          ))}
        </View>
        
        <TextInput
          style={styles.reviewInput}
          placeholder="Write your review (optional)"
          multiline
          numberOfLines={4}
          value={review}
          onChangeText={setReview}
        />
        
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.modalButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.submitButton]}
            onPress={onSubmit}
          >
            <Text style={styles.modalButtonText}>Submit Review</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const OrderDetailsScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const [orderDetails, setOrderDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applicants, setApplicants] = useState([])
  const [acceptedWorkerId, setAcceptedWorkerId] = useState(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState("")

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        if (!params?.id) {
          throw new Error("No order ID provided")
        }

        const orderId = String(params.id)
        const orderDoc = doc(db, "orders", orderId)

        // Set up real-time listener for the order
        const unsubscribe = onSnapshot(orderDoc, async (docSnapshot) => {
          if (!docSnapshot.exists()) {
            throw new Error("Order not found")
          }

          const data = docSnapshot.data()

          // Fetch applicants details
          const applicantsData = []
          if (data.applicants && data.applicants.length > 0) {
            for (const applicantId of data.applicants) {
              const userDoc = await getDoc(doc(db, "users", applicantId))
              if (userDoc.exists()) {
                const userData = userDoc.data()
                const experiences = userData.experiences || []
                
                // Calculate total experience duration
                const totalExperience = experiences.reduce((total, exp) => {
                  return total + (exp.duration ? parseInt(exp.duration) || 0 : 0)
                }, 0)

                // Format experience string
                const experienceString = experiences.map(exp => 
                  `${exp.title} at ${exp.company} (${exp.duration})`
                ).join(', ')

                applicantsData.push({
                  id: userDoc.id,
                  fullName: userData.fullName || "Anonymous",
                  profilePic: userData.profileImage || "https://example.com/placeholder.jpg",
                  jobRoles: userData.jobRoles || "Worker",
                  rating: userData.rating || 0,
                  totalExperience: totalExperience,
                  experienceDetails: experienceString,
                  priceQuote: userData.priceQuote || "Quote not provided",
                })
              }
            }
          }
          setApplicants(applicantsData)

          setOrderDetails({
            id: docSnapshot.id,
            title: data.jobTitle || "Untitled Job",
            description: data.jobDescription || "No description provided",
            location: data.location || "Location not specified",
            budget: `Rs ${data.price || 0}`,
            postedDate: data.createdAt?.toDate?.() || new Date(),
            status: data.status || "Open",
            category: data.category || "General",
            timeline: data.timeline || [
              {
                status: "Job Posted",
                date: data.createdAt || new Date(),
              },
            ],
          })

          if (data.acceptedWorkerId) {
            setAcceptedWorkerId(data.acceptedWorkerId)
          }

          setLoading(false)
        })

        return unsubscribe
      } catch (error) {
        console.error("Error fetching order details:", error)
        setLoading(false)
        Alert.alert("Error", error.message)
      }
    }

    fetchOrderDetails()
  }, [params?.id])

  const handleViewProfile = (workerId) => {
    router.push(`ClientSeeWorkerProfile?workerId=${workerId}`)
  }

  const handleAcceptWorker = async (workerId) => {
    if (acceptedWorkerId) {
      Alert.alert("Worker Already Accepted", "You have already accepted a worker for this job.")
      return
    }

    Alert.alert("Accept Worker", "Are you sure you want to accept this worker for the job?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Accept",
        onPress: async () => {
          try {
            const orderRef = doc(db, "orders", orderDetails.id)
            const worker = applicants.find((w) => w.id === workerId)

            await updateDoc(orderRef, {
              status: "In Progress",
              acceptedWorkerId: workerId,
              acceptedPrice: worker.priceQuote,
              timeline: [...(orderDetails.timeline || []), { status: "Worker Accepted", date: new Date() }],
            })

            setAcceptedWorkerId(workerId)
          } catch (error) {
            console.error("Error accepting worker:", error)
            Alert.alert("Error", "Failed to accept worker. Please try again.")
          }
        },
      },
    ])
  }

  const handleRejectRequest = async (workerId) => {
    try {
      const orderRef = doc(db, "orders", orderDetails.id)
      const updatedApplicants = applicants.filter((w) => w.id !== workerId)

      await updateDoc(orderRef, {
        applicants: updatedApplicants.map((w) => w.id),
      })
    } catch (error) {
      console.error("Error rejecting worker request:", error)
      Alert.alert("Error", "Failed to reject worker request. Please try again.")
    }
  }

  const handleCancelJob = async () => {
    Alert.alert("Cancel Job", "Are you sure you want to cancel this job?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          try {
            const orderRef = doc(db, "orders", orderDetails.id)
            await updateDoc(orderRef, {
              status: "Cancelled",
              timeline: [
                ...orderDetails.timeline,
                {
                  status: "Job Cancelled",
                  date: new Date(),
                },
              ],
            })
          } catch (error) {
            console.error("Error cancelling job:", error)
            Alert.alert("Error", "Failed to cancel job. Please try again.")
          }
        },
      },
    ])
  }

  const handleEditJob = () => {
    router.push(`editJob?jobId=${orderDetails.id}`)
  }

  const handleCloseJob = async () => {
    if (!acceptedWorkerId) {
      Alert.alert("Error", "No worker has been accepted for this job")
      return
    }

    setShowReviewModal(true)
  }

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert("Error", "Please select a rating")
      return
    }

    try {
      const workerDoc = doc(db, "users", acceptedWorkerId)
      const workerData = await getDoc(workerDoc)
      
      if (workerData.exists()) {
        const currentRating = workerData.data().rating || 0
        const totalReviews = workerData.data().totalReviews || 0
        const newRating = ((currentRating * totalReviews) + rating) / (totalReviews + 1)

        await updateDoc(workerDoc, {
          rating: newRating,
          totalReviews: totalReviews + 1,
          reviews: arrayUnion({
            rating,
            review,
            jobId: orderDetails.id,
            jobTitle: orderDetails.title,
            reviewerId: auth.currentUser?.uid,
            reviewerName: auth.currentUser?.displayName || "Anonymous",
            createdAt: new Date(),
          })
        })

        // Update order status
        const orderRef = doc(db, "orders", orderDetails.id)
        await updateDoc(orderRef, {
          status: "completed",
          timeline: [
            ...orderDetails.timeline,
            {
              status: "Job Completed",
              date: new Date(),
            },
          ],
        })

        setShowReviewModal(false)
        Alert.alert("Success", "Thank you for your review!")
      }
    } catch (error) {
      console.error("Error submitting review:", error)
      Alert.alert("Error", "Failed to submit review. Please try again.")
    }
  }

  const renderWorkerRequest = ({ item }) => (
    <View style={styles.workerRequestItem}>
      <Image
        source={{
          uri: item.profilePic || "https://example.com/placeholder.jpg",
        }}
        style={styles.workerProfilePic}
        defaultSource={require("../assets/placeholder.png")}
      />
      <View style={styles.workerInfo}>
        <Text style={styles.workerName}>{item.fullName}</Text>
        <View style={styles.workerDetails}>
          <Icon name="briefcase" size={16} color="#666" />
          <Text style={styles.detailText}>{item.jobRoles}</Text>
        </View>
        <View style={styles.workerDetails}>
          <Icon name="star" size={16} color="#FFD700" />
          <Text style={styles.detailText}>{item.rating.toFixed(1)}</Text>
        </View>
        <View style={styles.workerDetails}>
          <Icon name="clock-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{item.totalExperience} years </Text>
        </View>
        <View style={styles.experienceContainer}>
          <Text style={styles.experienceTitle}>Experience:</Text>
          <Text style={styles.experienceText}>{item.experienceDetails}</Text>
        </View>
      </View>
      <View style={styles.workerActions}>
        <TouchableOpacity style={[styles.actionButton, styles.viewButton]} onPress={() => handleViewProfile(item.id)}>
          <Text style={styles.actionButtonText}>View Profile</Text>
        </TouchableOpacity>
        {acceptedWorkerId ? (
          <TouchableOpacity
            style={[styles.actionButton, item.id === acceptedWorkerId ? styles.acceptedButton : styles.disabledButton]}
            disabled={true}
          >
            <Text style={styles.actionButtonText}>{item.id === acceptedWorkerId ? "Accepted" : "Accept"}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAcceptWorker(item.id)}
          >
            <Text style={styles.actionButtonText}>Accept</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleRejectRequest(item.id)}
          disabled={!!acceptedWorkerId}
        >
          <Text style={styles.actionButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.appBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Order Details   /</Text>
          <Text style={styles.appBarTitle}>آرڈر کی تفصیلات</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView>
          {/* Job Information Section */}
        <View style={styles.section}>
          <Text style={styles.jobTitle}>{orderDetails.title}</Text>
          <Text style={styles.jobId}>Job ID: {orderDetails.id}</Text>
          <Text style={styles.jobDescription}>{orderDetails.description}</Text>
          <Text style={styles.jobDetail}>
            <Icon name="map-marker" size={16} color="#666" /> {orderDetails.location}
          </Text>
          <Text style={styles.jobDetail}>
            <Icon name="cash" size={16} color="#666" /> {orderDetails.budget}
          </Text>
          <Text style={styles.jobDetail}>
            <Icon name="calendar" size={16} color="#666" /> Posted: {new Date(orderDetails.postedDate).toLocaleString()}
          </Text>
          <View style={[styles.categoryBadge]}>
            <Text style={styles.categoryText}>{orderDetails.category}</Text>
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: orderDetails.status === "Open" ? "#4CAF50" : "#FFC107" }]}
          >
            <Text style={styles.statusText}>{orderDetails.status}</Text>
          </View>
        </View>

        {/* Worker Request Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Worker Requests ({applicants.length}) / کارکن کی درخواستیں 
            </Text>
            {applicants.length > 0 ? (
              <FlatList
                data={applicants}
                renderItem={renderWorkerRequest}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.noApplicantsText}>No worker requests yet / ابھی تک کوئی کارکن کی درخواست نہیں</Text>
            )}
          </View>

          {/* Order Timeline */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Timeline / آرڈر کی ٹائم لائن</Text>
              {orderDetails.timeline &&
                orderDetails.timeline.map((event, index) => (
                  <View key={index} style={styles.timelineEvent}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineStatus}>{event.status} / {event.status === "Job Posted" ? "کام پوسٹ کیا گیا" : event.status === "Worker Accepted" ? "کارکن قبول کیا گیا" : event.status === "Job Completed" ? "کام مکمل ہوا" : event.status === "Job Cancelled" ? "کام منسوخ ہوا" : ""}</Text>
                <Text style={styles.timelineDate}>
                  {new Date(event.date?.toDate?.() || event.date).toLocaleString()}
                </Text>
              </View>
                  </View>
                ))}
            </View>

            {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {orderDetails.status === "Open" && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton, styles.fullWidthButton]}
                onPress={handleCancelJob}
              >
                <Icon name="close-circle-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Cancel Job / کام منسوخ کریں</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton, styles.fullWidthButton]}
                onPress={handleEditJob}
              >
                <Icon name="pencil-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Edit Job / کام میں ترمیم کریں</Text>
              </TouchableOpacity>
            </>
          )}
          {orderDetails.status === "In Progress" && (
            <TouchableOpacity
              style={[styles.actionButton, styles.closeButton, styles.fullWidthButton]}
              onPress={handleCloseJob}
            >
              <Icon name="check-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Close Job / کام بند کریں</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      
      <ReviewModal 
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleSubmitReview}
        rating={rating}
        setRating={setRating}
        review={review}
        setReview={setReview}
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
  },
  appBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  jobId: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  jobDescription: {
    fontSize: 16,
    marginBottom: 12,
    color: "#333",
  },
  jobDetail: {
    fontSize: 14,
    marginBottom: 4,
    color: "#666",
    flexDirection: "row",
    alignItems: "center",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    marginRight: 8,
  },
  categoryText: {
    color: "#1976D2",
    fontWeight: "600",
    fontSize: 12,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  statusText: {
    color: "#fff",
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  workerRequestItem: {
    flexDirection: "row",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingBottom: 16,
  },
  workerProfilePic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    backgroundColor: "#f0f0f0",
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  workerDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  detailText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  experienceContainer: {
    marginTop: 4,
  },
  experienceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  experienceText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  workerActions: {
    justifyContent: "space-between",
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 4,
    minWidth: 100,
    alignItems: "center",
  },
  viewButton: {
    backgroundColor: "#2196F3",
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
  },
  rejectButton: {
    backgroundColor: "#F44336",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  noApplicantsText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    marginTop: 20,
  },
  timelineEvent: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2196F3",
    marginRight: 8,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  timelineDate: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    gap: 12,
  },
  fullWidthButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  cancelButton: {
    backgroundColor: "#F44336",
  },
  editButton: {
    backgroundColor: "#FFC107",
  },
  closeButton: {
    backgroundColor: "#4CAF50",
  },
  acceptedButton: {
    backgroundColor: "#A5D6A7",
  },
  disabledButton: {
    backgroundColor: "#E0E0E0",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  starButton: {
    padding: 5,
  },
  reviewInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    textAlignVertical: "top",
    minHeight: 100,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: "#4CAF50",
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
})

export default OrderDetailsScreen