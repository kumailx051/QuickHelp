"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
  LogBox,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { getFirestore, collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore"

// Suppress the CountryModal warning
LogBox.ignoreLogs([
  "Warning: CountryModal: Support for defaultProps will be removed from function components in a future major release.",
])

const { width } = Dimensions.get("window")

const UsersManagementScreen = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("profile")
  const [activeUserTab, setActiveUserTab] = useState("pending")
  const [selectedUser, setSelectedUser] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pendingUsers, setPendingUsers] = useState([])
  const [approvedUsers, setApprovedUsers] = useState([])
  const [disapprovedUsers, setDisapprovedUsers] = useState([])
  const [processingUserId, setProcessingUserId] = useState(null)
  const [error, setError] = useState(null)
  const [driverLicenses, setDriverLicenses] = useState({})
  const [processingLicenseId, setProcessingLicenseId] = useState(null)

  // Fetch users from Firestore
  useEffect(() => {
    fetchUsers()
    fetchDriverLicenses()
  }, [])

  const fetchDriverLicenses = async () => {
    try {
      const db = getFirestore()
      const licensesRef = collection(db, "driverLicenses")
      const licensesSnapshot = await getDocs(licensesRef)

      const licensesData = {}
      licensesSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        licensesData[data.userId] = {
          id: doc.id,
          ...data,
        }
      })

      setDriverLicenses(licensesData)
    } catch (error) {
      console.error("Error fetching driver licenses:", error)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const db = getFirestore()

      // Fetch pending users
      const pendingQuery = query(collection(db, "users"), where("status", "==", "pending"))
      const pendingSnapshot = await getDocs(pendingQuery)
      const pendingData = pendingSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Fetch verified users
      const verifiedQuery = query(collection(db, "users"), where("status", "==", "verified"))
      const verifiedSnapshot = await getDocs(verifiedQuery)
      const verifiedData = verifiedSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Fetch disapproved users
      const disapprovedQuery = query(collection(db, "users"), where("status", "==", "disapproved"))
      const disapprovedSnapshot = await getDocs(disapprovedQuery)
      const disapprovedData = disapprovedSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      setPendingUsers(pendingData)
      setApprovedUsers(verifiedData)
      setDisapprovedUsers(disapprovedData)
    } catch (error) {
      console.error("Error fetching users:", error)
      setError("Failed to load users. Please check your connection and try again.")
      Alert.alert("Error", "Failed to load users. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (user) => {
    setSelectedUser(user)
    setModalVisible(true)
  }

  const handleApprove = async (userId) => {
    try {
      setProcessingUserId(userId)
      const db = getFirestore()
      const userRef = doc(db, "users", userId)

      await updateDoc(userRef, {
        status: "verified",
        approvedDate: new Date().toISOString(),
      })

      Alert.alert("Success", "User has been approved successfully.")

      // Update local state
      setPendingUsers((prev) => prev.filter((user) => user.id !== userId))
      const approvedUser = pendingUsers.find((user) => user.id === userId)
      if (approvedUser) {
        approvedUser.status = "verified"
        approvedUser.approvedDate = new Date().toISOString()
        setApprovedUsers((prev) => [...prev, approvedUser])
      }

      // Close modal if open
      if (modalVisible && selectedUser && selectedUser.id === userId) {
        setModalVisible(false)
      }
    } catch (error) {
      console.error("Error approving user:", error)
      Alert.alert("Error", "Failed to approve user. Please try again.")
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleDisapprove = async (userId) => {
    try {
      setProcessingUserId(userId)
      const db = getFirestore()
      const userRef = doc(db, "users", userId)

      await updateDoc(userRef, {
        status: "disapproved",
        disapprovedDate: new Date().toISOString(),
      })

      Alert.alert("Success", "User has been disapproved.")

      // Update local state
      setPendingUsers((prev) => prev.filter((user) => user.id !== userId))
      const disapprovedUser = pendingUsers.find((user) => user.id === userId)
      if (disapprovedUser) {
        disapprovedUser.status = "disapproved"
        disapprovedUser.disapprovedDate = new Date().toISOString()
        setDisapprovedUsers((prev) => [...prev, disapprovedUser])
      }

      // Close modal if open
      if (modalVisible && selectedUser && selectedUser.id === userId) {
        setModalVisible(false)
      }
    } catch (error) {
      console.error("Error disapproving user:", error)
      Alert.alert("Error", "Failed to disapprove user. Please try again.")
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleReactivate = async (userId) => {
    try {
      setProcessingUserId(userId)
      const db = getFirestore()
      const userRef = doc(db, "users", userId)

      await updateDoc(userRef, {
        status: "pending",
        verificationDate: new Date().toISOString(),
      })

      Alert.alert("Success", "User has been moved back to pending status.")

      // Update local state
      setDisapprovedUsers((prev) => prev.filter((user) => user.id !== userId))
      const reactivatedUser = disapprovedUsers.find((user) => user.id === userId)
      if (reactivatedUser) {
        reactivatedUser.status = "pending"
        reactivatedUser.verificationDate = new Date().toISOString()
        setPendingUsers((prev) => [...prev, reactivatedUser])
      }

      // Close modal if open
      if (modalVisible && selectedUser && selectedUser.id === userId) {
        setModalVisible(false)
      }
    } catch (error) {
      console.error("Error reactivating user:", error)
      Alert.alert("Error", "Failed to reactivate user. Please try again.")
    } finally {
      setProcessingUserId(null)
    }
  }

  // Handle driver license approval
  const handleApproveLicense = async (userId, licenseId) => {
    try {
      setProcessingLicenseId(licenseId)
      const db = getFirestore()

      // Update license status in driverLicenses collection
      const licenseRef = doc(db, "driverLicenses", licenseId)
      await updateDoc(licenseRef, {
        status: "verified",
        verifiedAt: new Date().toISOString(),
      })

      // Update user document with license status
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, {
        driverLicenseStatus: "verified",
        driverLicenseVerifiedAt: new Date().toISOString(),
      })

      // Update local state
      setDriverLicenses((prev) => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          status: "verified",
          verifiedAt: new Date().toISOString(),
        },
      }))

      Alert.alert("Success", "Driver license has been verified successfully.", [
        {
          text: "OK",
          onPress: () => {
            // Refresh data
            fetchDriverLicenses()
            fetchUsers()
          },
        },
      ])
    } catch (error) {
      console.error("Error approving license:", error)
      Alert.alert("Error", "Failed to approve driver license. Please try again.")
    } finally {
      setProcessingLicenseId(null)
    }
  }

  // Handle driver license rejection
  const handleRejectLicense = async (userId, licenseId) => {
    try {
      setProcessingLicenseId(licenseId)
      const db = getFirestore()

      // Update license status in driverLicenses collection
      const licenseRef = doc(db, "driverLicenses", licenseId)
      await updateDoc(licenseRef, {
        status: "rejected",
        rejectedAt: new Date().toISOString(),
      })

      // Update user document with license status
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, {
        driverLicenseStatus: "rejected",
        driverLicenseRejectedAt: new Date().toISOString(),
      })

      // Update local state
      setDriverLicenses((prev) => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          status: "rejected",
          rejectedAt: new Date().toISOString(),
        },
      }))

      Alert.alert("Success", "Driver license has been rejected.", [
        {
          text: "OK",
          onPress: () => {
            // Refresh data
            fetchDriverLicenses()
            fetchUsers()
          },
        },
      ])
    } catch (error) {
      console.error("Error rejecting license:", error)
      Alert.alert("Error", "Failed to reject driver license. Please try again.")
    } finally {
      setProcessingLicenseId(null)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"

    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch (error) {
      console.error("Error formatting date:", error)
      return "Invalid date"
    }
  }

  const renderUserCard = (user) => {
    const isPending = user.status === "pending"
    const isDisapproved = user.status === "disapproved"
    const isProcessing = processingUserId === user.id

    // Check if user has a pending driver license
    const hasDriverLicense = driverLicenses[user.id]
    const hasPendingLicense = hasDriverLicense && hasDriverLicense.status === "pending"

    return (
      <View style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.userHeaderLeft}>
            {user.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                style={styles.userAvatar}
                onError={() => console.log("Failed to load profile image")}
              />
            ) : (
              <View style={styles.userAvatarPlaceholder}>
                <Ionicons name="person" size={24} color="#CCCCCC" />
              </View>
            )}
            <View>
              <Text style={styles.userName}>{user.fullName || user.name || "Unknown User"}</Text>
              <Text style={styles.userPhone}>{user.phoneNumber || "No phone"}</Text>
            </View>
          </View>
          <View style={[styles.roleBadge, user.role === "employee" ? styles.workerBadge : styles.clientBadge]}>
            <Text style={styles.roleText}>{user.role === "employee" ? "Worker" : "Client"}</Text>
          </View>
        </View>

        <View style={styles.userDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>CNIC:</Text>
            <Text style={styles.detailValue}>{user.cnic || user.identityNumber || "N/A"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email:</Text>
            <Text style={styles.detailValue}>{user.email || "N/A"}</Text>
          </View>
          {user.category && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category:</Text>
              <Text style={styles.detailValue}>{user.category}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <View
              style={[
                styles.statusBadge,
                isPending ? styles.pendingBadge : isDisapproved ? styles.disapprovedBadge : styles.approvedBadge,
              ]}
            >
              <Text style={[styles.statusText, isDisapproved && styles.disapprovedText]}>{user.status}</Text>
            </View>
          </View>
          {hasPendingLicense && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>License:</Text>
              <View style={[styles.statusBadge, styles.pendingBadge]}>
                <Text style={styles.statusText}>Pending Verification</Text>
              </View>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Registered:</Text>
            <Text style={styles.detailValue}> {formatDate(user.verificationDate)}</Text>
          </View>
          {isDisapproved && user.disapprovedDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Rejected :</Text>
              <Text style={styles.detailValue}> {formatDate(user.disapprovedDate)}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          {isPending && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton, isProcessing && styles.disabledButton]}
                onPress={() => handleApprove(user.id)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.disapproveButton, isProcessing && styles.disabledButton]}
                onPress={() => handleDisapprove(user.id)}
                disabled={isProcessing}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Disapprove</Text>
              </TouchableOpacity>
            </>
          )}
          {isDisapproved && (
            <TouchableOpacity
              style={[styles.actionButton, styles.reactivateButton, isProcessing && styles.disabledButton]}
              onPress={() => handleReactivate(user.id)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Reactivate</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionButton, styles.viewButton]} onPress={() => handleViewDetails(user)}>
            <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderUserDetailModal = () => {
    if (!selectedUser) return null

    const isPending = selectedUser.status === "pending"
    const isDisapproved = selectedUser.status === "disapproved"
    const isProcessing = processingUserId === selectedUser.id

    // Check if user has a driver license
    const driverLicense = driverLicenses[selectedUser.id]
    const isLicenseProcessing = processingLicenseId === (driverLicense?.id || "")

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.userProfileSection}>
                <View style={styles.profileImageContainer}>
                  {selectedUser.profileImage ? (
                    <Image
                      source={{ uri: selectedUser.profileImage }}
                      style={styles.profileImage}
                      resizeMode="cover"
                      onError={() => console.log("Failed to load profile image")}
                    />
                  ) : (
                    <Ionicons name="person" size={60} color="#CCCCCC" />
                  )}
                </View>
                <View style={styles.profileNameContainer}>
                  <Text style={styles.profileName}>{selectedUser.fullName || selectedUser.name || "Unknown User"}</Text>
                  <Text style={styles.profileEmail}>{selectedUser.email || "No email"}</Text>
                  <View
                    style={[
                      styles.profileRoleBadge,
                      selectedUser.role === "employee" ? styles.workerBadge : styles.clientBadge,
                    ]}
                  >
                    <Text style={styles.profileRoleText}>{selectedUser.role === "employee" ? "Worker" : "Client"}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>Full Name:</Text>
                  <Text style={styles.detailItemValue}>{selectedUser.fullName || selectedUser.name || "N/A"}</Text>
                </View>
                {selectedUser.fatherName && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>Father's Name:</Text>
                    <Text style={styles.detailItemValue}>{selectedUser.fatherName}</Text>
                  </View>
                )}
                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>CNIC:</Text>
                  <Text style={styles.detailItemValue}>
                    {selectedUser.cnic || selectedUser.identityNumber || "N/A"}
                  </Text>
                </View>

                {/* Driver License Section */}
                {driverLicense && (
                  <View style={styles.driverLicenseSection}>
                    <Text style={styles.detailItemLabel}>Driver License:</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        driverLicense.status === "pending"
                          ? styles.pendingBadge
                          : driverLicense.status === "verified"
                            ? styles.approvedBadge
                            : styles.disapprovedBadge,
                      ]}
                    >
                      <Text style={[styles.statusText, driverLicense.status === "rejected" && styles.disapprovedText]}>
                        {driverLicense.status}
                      </Text>
                    </View>

                    {driverLicense.licenseUrl && (
                      <View style={styles.licenseImageContainer}>
                        <Text style={styles.licenseLabel}>License Image</Text>
                        <Image
                          source={{ uri: driverLicense.licenseUrl }}
                          style={styles.licenseImage}
                          resizeMode="contain"
                          onError={() => console.log("Failed to load license image")}
                        />
                      </View>
                    )}

                    {driverLicense.status === "pending" && (
                      <View style={styles.licenseActions}>
                        <TouchableOpacity
                          style={[
                            styles.licenseActionButton,
                            styles.approveButton,
                            isLicenseProcessing && styles.disabledButton,
                          ]}
                          onPress={() => handleApproveLicense(selectedUser.id, driverLicense.id)}
                          disabled={isLicenseProcessing}
                        >
                          {isLicenseProcessing ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                              <Text style={styles.licenseActionButtonText}>Approve License</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.licenseActionButton,
                            styles.disapproveButton,
                            isLicenseProcessing && styles.disabledButton,
                          ]}
                          onPress={() => handleRejectLicense(selectedUser.id, driverLicense.id)}
                          disabled={isLicenseProcessing}
                        >
                          {isLicenseProcessing ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Ionicons name="close" size={16} color="#FFFFFF" />
                              <Text style={styles.licenseActionButtonText}>Reject License</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    {driverLicense.status === "verified" && (
                      <View style={styles.licenseVerifiedInfo}>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        <Text style={styles.licenseVerifiedText}>
                          License verified on {formatDate(driverLicense.verifiedAt)}
                        </Text>
                      </View>
                    )}

                    {driverLicense.status === "rejected" && (
                      <View style={styles.licenseRejectedInfo}>
                        <Ionicons name="close-circle" size={20} color="#F44336" />
                        <Text style={styles.licenseRejectedText}>
                          License rejected on {formatDate(driverLicense.rejectedAt)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>Phone Number:</Text>
                  <Text style={styles.detailItemValue}>{selectedUser.phoneNumber || "N/A"}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>Email:</Text>
                  <Text style={styles.detailItemValue}>{selectedUser.email || "N/A"}</Text>
                </View>
                {selectedUser.dob && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>Date of Birth:</Text>
                    <Text style={styles.detailItemValue}>{selectedUser.dob}</Text>
                  </View>
                )}
                {selectedUser.gender && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>Gender:</Text>
                    <Text style={styles.detailItemValue}>{selectedUser.gender}</Text>
                  </View>
                )}
                {selectedUser.country && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>Country:</Text>
                    <Text style={styles.detailItemValue}>{selectedUser.country}</Text>
                  </View>
                )}
                {selectedUser.permanentAddress && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>Permanent Address:</Text>
                    <Text style={styles.detailItemValue}>{selectedUser.permanentAddress}</Text>
                  </View>
                )}
                {selectedUser.temporaryAddress && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>Temporary Address:</Text>
                    <Text style={styles.detailItemValue}>{selectedUser.temporaryAddress}</Text>
                  </View>
                )}
                {selectedUser.category && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>Category:</Text>
                    <Text style={styles.detailItemValue}>{selectedUser.category}</Text>
                  </View>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Registration Information</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>Status:</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      selectedUser.status === "pending"
                        ? styles.pendingBadge
                        : selectedUser.status === "verified"
                          ? styles.approvedBadge
                          : styles.disapprovedBadge,
                    ]}
                  >
                    <Text style={[styles.statusText, selectedUser.status === "disapproved" && styles.disapprovedText]}>
                      {selectedUser.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>Registered Date:</Text>
                  <Text style={styles.detailItemValue}>{formatDate(selectedUser.verificationDate)}</Text>
                </View>
                {selectedUser.approvedDate && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>Approved Date:</Text>
                    <Text style={styles.detailItemValue}>{formatDate(selectedUser.approvedDate)}</Text>
                  </View>
                )}
                {selectedUser.disapprovedDate && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>Reject Date:</Text>
                    <Text style={styles.detailItemValue}>{formatDate(selectedUser.disapprovedDate)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Tasdeeq Report</Text>
                <View style={styles.cnicImagesContainer}>
                  <View style={styles.cnicImageWrapper}>
                    <Text style={styles.cnicLabel}>Front CNIC</Text>
                    {selectedUser.frontCnic ? (
                      <Image
                        source={{ uri: selectedUser.frontCnic }}
                        style={styles.cnicImage}
                        resizeMode="contain"
                        onError={() => console.log("Failed to load front CNIC image")}
                      />
                    ) : (
                      <View style={styles.cnicPlaceholder}>
                        <Ionicons name="card-outline" size={40} color="#CCCCCC" />
                        <Text style={styles.placeholderText}>No image</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cnicImageWrapper}>
                    <Text style={styles.cnicLabel}>Back CNIC</Text>
                    {selectedUser.backCnic ? (
                      <Image
                        source={{ uri: selectedUser.backCnic }}
                        style={styles.cnicImage}
                        resizeMode="contain"
                        onError={() => console.log("Failed to load back CNIC image")}
                      />
                    ) : (
                      <View style={styles.cnicPlaceholder}>
                        <Ionicons name="card-outline" size={40} color="#CCCCCC" />
                        <Text style={styles.placeholderText}>No image</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {isPending && (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.approveButton, isProcessing && styles.disabledButton]}
                    onPress={() => handleApprove(selectedUser.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                        <Text style={styles.modalActionButtonText}>Approve User</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.disapproveButton, isProcessing && styles.disabledButton]}
                    onPress={() => handleDisapprove(selectedUser.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="close" size={18} color="#FFFFFF" />
                        <Text style={styles.modalActionButtonText}>Disapprove User</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {isDisapproved && (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.reactivateButton, isProcessing && styles.disabledButton]}
                    onPress={() => handleReactivate(selectedUser.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="refresh" size={18} color="#FFFFFF" />
                        <Text style={styles.modalActionButtonText}>Reactivate User</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    )
  }

  // User tabs content
  const renderUserTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      )
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )
    }

    let data = []
    switch (activeUserTab) {
      case "pending":
        data = pendingUsers
        break
      case "approved":
        data = approvedUsers
        break
      case "disapproved":
        data = disapprovedUsers
        break
      default:
        data = pendingUsers
    }

    return (
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderUserCard(item)}
        contentContainerStyle={styles.userList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={60} color="#CCCCCC" />
            <Text style={styles.emptyStateText}>
              No {activeUserTab} users found{"\n"}
              {activeUserTab === "pending" && "کوئی زیر التواء صارف نہیں ملا"}
              {activeUserTab === "approved" && "کوئی منظور شدہ صارف نہیں ملا"}
              {activeUserTab === "disapproved" && "کوئی مسترد شدہ صارف نہیں ملا"}
            </Text>
          </View>
        }
      />
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Users Management</Text>
            <Text style={{ fontSize: 13, color: "#757575", marginLeft: 2 }}>صارفین کا انتظام</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => {
              fetchUsers()
              fetchDriverLicenses()
            }}
          >
            <Ionicons name="refresh-outline" size={22} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* User Tabs */}
      <View style={styles.userTabs}>
        <TouchableOpacity
          style={[styles.userTab, activeUserTab === "pending" && styles.activeUserTab]}
          onPress={() => setActiveUserTab("pending")}
        >
          <Text style={[styles.userTabText, activeUserTab === "pending" && styles.activeUserTabText]}>Pending</Text>
          {pendingUsers.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pendingUsers.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.userTab, activeUserTab === "approved" && styles.activeUserTab]}
          onPress={() => setActiveUserTab("approved")}
        >
          <Text style={[styles.userTabText, activeUserTab === "approved" && styles.activeUserTabText]}>Approved</Text>
          {approvedUsers.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{approvedUsers.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.userTab, activeUserTab === "disapproved" && styles.activeUserTab]}
          onPress={() => setActiveUserTab("disapproved")}
        >
          <Text style={[styles.userTabText, activeUserTab === "disapproved" && styles.activeUserTabText]}>
            Disapproved
          </Text>
          {disapprovedUsers.length > 0 && (
            <View style={[styles.tabBadge, styles.disapprovedBadge]}>
              <Text style={styles.tabBadgeText}>{disapprovedUsers.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* User List */}
      {renderUserTabContent()}

      {/* User Detail Modal */}
      {renderUserDetailModal()}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveTab("home")
            router.push("adminHomeScreen")
          }}
        >
          <Ionicons
            name={activeTab === "home" ? "home" : "home-outline"}
            size={24}
            color={activeTab === "home" ? "#2196F3" : "#757575"}
          />
          <Text style={[styles.navLabel, activeTab === "home" && styles.activeNavLabel]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveTab("jobs")
            router.push("adminJobManage")
          }}
        >
          <Ionicons
            name={activeTab === "jobs" ? "briefcase" : "briefcase-outline"}
            size={24}
            color={activeTab === "jobs" ? "#2196F3" : "#757575"}
          />
          <Text style={[styles.navLabel, activeTab === "jobs" && styles.activeNavLabel]}>Manage Jobs</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons
            name={activeTab === "profile" ? "person" : "person-outline"}
            size={24}
            color={activeTab === "profile" ? "#2196F3" : "#757575"}
          />
          <Text style={[styles.navLabel, activeTab === "profile" && styles.activeNavLabel]}>Manage Users</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 16,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 16,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
  },
  userTabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  userTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  activeUserTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#2196F3",
  },
  userTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#757575",
  },
  activeUserTabText: {
    color: "#2196F3",
  },
  tabBadge: {
    backgroundColor: "#2196F3",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  tabBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#757575",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    color: "#F44336",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  userList: {
    padding: 16,
    paddingBottom: 80, // Extra padding for bottom nav
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyStateText: {
    marginTop: 10,
    color: "#757575",
    fontSize: 16,
  },
  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  userHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
  },
  userPhone: {
    fontSize: 14,
    color: "#757575",
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  workerBadge: {
    backgroundColor: "#E1F5FE",
  },
  clientBadge: {
    backgroundColor: "#E8F5E9",
  },
  roleText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#2196F3",
  },
  userDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    width: 70,
    fontSize: 14,
    color: "#757575",
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingBadge: {
    backgroundColor: "#FFF8E1",
  },
  approvedBadge: {
    backgroundColor: "#E8F5E9",
  },
  disapprovedBadge: {
    backgroundColor: "#FFEBEE",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  disapprovedText: {
    color: "#F44336",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  approveButton: {
    backgroundColor: "#4CAF50",
  },
  disapproveButton: {
    backgroundColor: "#F44336",
  },
  reactivateButton: {
    backgroundColor: "#FF9800",
  },
  viewButton: {
    backgroundColor: "#2196F3",
  },
  disabledButton: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    paddingVertical: 8,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 12,
    marginTop: 4,
    color: "#757575",
  },
  activeNavLabel: {
    color: "#2196F3",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalBody: {
    padding: 16,
  },
  userProfileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    overflow: "hidden",
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileNameContainer: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "600",
  },
  profileEmail: {
    fontSize: 14,
    color: "#757575",
    marginBottom: 8,
  },
  profileRoleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  profileRoleText: {
    fontSize: 12,
    fontWeight: "500",
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#2196F3",
  },
  detailItem: {
    flexDirection: "row",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  detailItemLabel: {
    width: "40%",
    fontSize: 14,
    color: "#757575",
  },
  detailItemValue: {
    flex: 1,
    fontSize: 14,
  },
  cnicImagesContainer: {
    flexDirection: "column",
    gap: 16,
  },
  cnicImageWrapper: {
    width: "100%",
  },
  cnicLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  cnicImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  cnicPlaceholder: {
    height: 120,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    marginTop: 8,
    color: "#9E9E9E",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 16,
  },
  modalActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  modalActionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  // Driver License Styles
  driverLicenseSection: {
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  licenseImageContainer: {
    marginTop: 16,
  },
  licenseLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#424242",
  },
  licenseImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  licenseActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  licenseActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  licenseActionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  licenseVerifiedInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 12,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
  },
  licenseVerifiedText: {
    marginLeft: 8,
    color: "#2E7D32",
    fontSize: 14,
  },
  licenseRejectedInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 12,
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
  },
  licenseRejectedText: {
    marginLeft: 8,
    color: "#C62828",
    fontSize: 14,
  },
})

export default UsersManagementScreen
