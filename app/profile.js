"use client"

import { useState, useEffect } from "react"
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native"
import Icon from "react-native-vector-icons/Feather"
import * as ImagePicker from "expo-image-picker"
import { useRouter, useLocalSearchParams } from "expo-router"
import { TextInput, Button } from "react-native-paper"
import { auth } from "../firebaseConfig"
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"
import { signOut } from "firebase/auth"

const { width: screenWidth } = Dimensions.get("window")

const ProfileScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const [workImages, setWorkImages] = useState([])
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState({})
  const [backgroundImage, setBackgroundImage] = useState(require("../assets/images/bluebackground.jpg"))
  const [selectedImage, setSelectedImage] = useState(null)
  const [showFullImage, setShowFullImage] = useState(false)
  const [longPressedImage, setLongPressedImage] = useState(null)
  const [skills, setSkills] = useState([])
  const [newSkill, setNewSkill] = useState("")
  const [experiences, setExperiences] = useState([])
  const [newExperience, setNewExperience] = useState({ title: "", company: "", duration: "" })
  const [availableTimes, setAvailableTimes] = useState([])
  const [newAvailableTime, setNewAvailableTime] = useState({ day: "", time: "" })
  const [showLicenseUpload, setShowLicenseUpload] = useState(false)
  const [licenseImage, setLicenseImage] = useState(null)
  const [isDriverRoleSelected, setIsDriverRoleSelected] = useState(false)
  const [driverLicenseVerified, setDriverLicenseVerified] = useState(false)
  const [driverLicenseUrl, setDriverLicenseUrl] = useState(null)
  const [driverLicenseStatus, setDriverLicenseStatus] = useState("not_submitted") // not_submitted, pending, verified, rejected
  const [uploadingLicense, setUploadingLicense] = useState(false)
  const [showLicenseVerifiedModal, setShowLicenseVerifiedModal] = useState(false)

  useEffect(() => {
    // Check if we should show license upload from URL params
    if (params.uploadLicense === "true") {
      setShowLicenseUpload(true)
    }
  }, [params])

  useEffect(() => {
    // Show license verified modal if status is verified and coming from verification
    if (driverLicenseStatus === "verified" && params.fromVerification === "true") {
      setShowLicenseVerifiedModal(true)
    }
  }, [driverLicenseStatus, params.fromVerification])

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser
        if (!user) {
          router.push("/signup/login")
          return
        }

        const db = getFirestore()
        const userDoc = await getDoc(doc(db, "users", user.uid))

        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserData(data)
          setEditedData(data)
          if (data.myworkImages) {
            setWorkImages(data.myworkImages)
          }
          if (data.skills) {
            setSkills(data.skills)
          }
          if (data.experiences) {
            setExperiences(data.experiences)
          }
          if (data.availableTimes) {
            setAvailableTimes(data.availableTimes)
          }

          // Check if driver role is selected
          if (data.jobRoles && data.jobRoles.includes("driver")) {
            setIsDriverRoleSelected(true)
          }

          // Check driver license status
          if (data.driverLicenseUrl) {
            setDriverLicenseUrl(data.driverLicenseUrl)
          }

          if (data.driverLicenseStatus) {
            setDriverLicenseStatus(data.driverLicenseStatus)
          }

          if (data.driverLicenseVerified) {
            setDriverLicenseVerified(true)
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        Alert.alert("Error", "Failed to load user data")
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  const handleSaveProfile = async () => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      const userRef = doc(db, "users", user.uid)

      const updates = {
        ...editedData,
        skills,
        experiences,
        availableTimes,
      }

      await updateDoc(userRef, updates)
      setUserData((prev) => ({ ...prev, ...updates }))
      setIsEditing(false)
      Alert.alert("Success", "Profile updated successfully")
    } catch (error) {
      Alert.alert("Error", "Failed to update profile")
    }
  }

  const addSkill = () => {
    if (newSkill.trim()) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill("")
    }
  }

  const removeSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index))
  }

  const addExperience = () => {
    if (newExperience.title && newExperience.company && newExperience.duration) {
      setExperiences([...experiences, newExperience])
      setNewExperience({ title: "", company: "", duration: "" })
    }
  }

  const removeExperience = (index) => {
    setExperiences(experiences.filter((_, i) => i !== index))
  }

  const addAvailableTime = () => {
    if (newAvailableTime.day && newAvailableTime.time) {
      setAvailableTimes([...availableTimes, newAvailableTime])
      setNewAvailableTime({ day: "", time: "" })
    }
  }

  const removeAvailableTime = (index) => {
    setAvailableTimes(availableTimes.filter((_, i) => i !== index))
  }

  const uploadToImageBB = async (imageUri) => {
    try {
      const apiKey = "f31e40432a7b500dd75ce5255d3ea517"
      const apiUrl = `https://api.imgbb.com/1/upload?key=${apiKey}`

      const response = await fetch(imageUri)
      const blob = await response.blob()
      const reader = new FileReader()

      return new Promise((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64data = reader.result.split(",")[1]

            const formData = new FormData()
            formData.append("image", base64data)

            const uploadResponse = await fetch(apiUrl, {
              method: "POST",
              body: formData,
              headers: {
                Accept: "application/json",
              },
            })

            const result = await uploadResponse.json()

            if (result.data?.url) {
              resolve(result.data.url)
            } else {
              reject(new Error("Failed to get image URL from response"))
            }
          } catch (error) {
            reject(error)
          }
        }
        reader.onerror = () => reject(new Error("Failed to read file"))
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error("Upload error:", error)
      throw new Error("Failed to upload image")
    }
  }

  const handleImagePicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your photo library to upload images.")
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      })

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri

        setLoading(true)

        try {
          const imageUrl = await uploadToImageBB(imageUri)

          const db = getFirestore()
          const user = auth.currentUser
          if (!user) throw new Error("User not authenticated")

          const userRef = doc(db, "users", user.uid)
          const updatedWorkImages = [...workImages, imageUrl]

          await updateDoc(userRef, {
            myworkImages: updatedWorkImages,
          })

          setWorkImages(updatedWorkImages)
          setUserData((prev) => ({
            ...prev,
            myworkImages: updatedWorkImages,
          }))

          Alert.alert("Success", "Image uploaded successfully")
        } catch (error) {
          console.error("Upload error:", error)
          Alert.alert("Error", "Failed to upload image. Please try again.")
        } finally {
          setLoading(false)
        }
      }
    } catch (error) {
      console.error("Image picker error:", error)
      Alert.alert("Error", "Failed to select image")
    }
  }

  const handleProfileImageUpdate = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your photo library to update profile picture.")
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      })

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri

        setLoading(true)

        try {
          const imageUrl = await uploadToImageBB(imageUri)

          const db = getFirestore()
          const user = auth.currentUser
          if (!user) throw new Error("User not authenticated")

          const userRef = doc(db, "users", user.uid)
          await updateDoc(userRef, {
            profileImage: imageUrl,
          })

          setUserData((prev) => ({
            ...prev,
            profileImage: imageUrl,
          }))

          Alert.alert("Success", "Profile picture updated successfully")
        } catch (error) {
          console.error("Upload error:", error)
          Alert.alert("Error", "Failed to update profile picture. Please try again.")
        } finally {
          setLoading(false)
        }
      }
    } catch (error) {
      console.error("Image picker error:", error)
      Alert.alert("Error", "Failed to select image")
    }
  }

  const handleImagePress = (imageUrl) => {
    setSelectedImage(imageUrl)
    setShowFullImage(true)
  }

  const handleImageLongPress = (imageUrl) => {
    setLongPressedImage(imageUrl)
    Alert.alert("Delete Image", "Are you sure you want to delete this image?", [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => setLongPressedImage(null),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDeleteImage(imageUrl),
      },
    ])
  }

  const handleDeleteImage = async (imageUrl) => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      if (!user) throw new Error("User not authenticated")

      const userRef = doc(db, "users", user.uid)
      const updatedImages = workImages.filter((url) => url !== imageUrl)

      await updateDoc(userRef, {
        myworkImages: updatedImages,
      })

      setWorkImages(updatedImages)
      setUserData((prev) => ({
        ...prev,
        myworkImages: updatedImages,
      }))

      Alert.alert("Success", "Image deleted successfully")
    } catch (error) {
      console.error("Delete error:", error)
      Alert.alert("Error", "Failed to delete image")
    } finally {
      setLongPressedImage(null)
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

  // Driver License Upload Functions
  const handleLicenseImagePicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your photo library to upload license.")
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      })

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri
        setLicenseImage(imageUri)
      }
    } catch (error) {
      console.error("Image picker error:", error)
      Alert.alert("Error", "Failed to select license image")
    }
  }

  const handleUploadLicense = async () => {
    if (!licenseImage) {
      Alert.alert("Error", "Please select a license image first")
      return
    }

    setUploadingLicense(true)

    try {
      // Upload to ImageBB
      const licenseUrl = await uploadToImageBB(licenseImage)

      const db = getFirestore()
      const user = auth.currentUser
      if (!user) throw new Error("User not authenticated")

      // Update user document with license URL and status
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        driverLicenseUrl: licenseUrl,
        driverLicenseStatus: "pending",
        driverLicenseSubmittedAt: serverTimestamp(),
      })

      // Create a record in the driverLicenses collection
      const licenseRef = collection(db, "driverLicenses")
      await addDoc(licenseRef, {
        userId: user.uid,
        licenseUrl: licenseUrl,
        status: "pending",
        submittedAt: serverTimestamp(),
        userName: userData.fullName,
        userEmail: userData.email,
      })

      // Update local state
      setDriverLicenseUrl(licenseUrl)
      setDriverLicenseStatus("pending")
      setShowLicenseUpload(false)

      Alert.alert(
        "License Submitted",
        "Your driver license has been submitted for verification. You will be notified once it's verified.",
      )
    } catch (error) {
      console.error("License upload error:", error)
      Alert.alert("Error", "Failed to upload license. Please try again.")
    } finally {
      setUploadingLicense(false)
    }
  }

  const renderLicenseStatus = () => {
    if (!isDriverRoleSelected) return null

    switch (driverLicenseStatus) {
      case "not_submitted":
        return (
          <TouchableOpacity style={styles.licenseStatusCard} onPress={() => setShowLicenseUpload(true)}>
            <Icon name="alert-triangle" size={24} color="#FF8C00" />
            <View style={styles.licenseStatusContent}>
              <Text style={styles.licenseStatusTitle}>Driver License Not Submitted</Text>
              <Text style={styles.licenseStatusSubtitle}>Upload your license to apply for driver jobs</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>
        )
      case "pending":
        return (
          <View style={[styles.licenseStatusCard, { backgroundColor: "#FFF8E1" }]}>
            <Icon name="clock" size={24} color="#FF8C00" />
            <View style={styles.licenseStatusContent}>
              <Text style={styles.licenseStatusTitle}>License Verification Pending</Text>
              <Text style={styles.licenseStatusSubtitle}>Your license is being reviewed by our team</Text>
            </View>
          </View>
        )
      case "verified":
        return (
          <View style={[styles.licenseStatusCard, { backgroundColor: "#E8F5E9" }]}>
            <Icon name="check-circle" size={24} color="#4CAF50" />
            <View style={styles.licenseStatusContent}>
              <Text style={styles.licenseStatusTitle}>License Verified Successfully!</Text>
              <Text style={styles.licenseStatusSubtitle}>You can now view and apply for driver jobs</Text>
            </View>
            <TouchableOpacity style={styles.viewJobsButton} onPress={() => router.push("/home")}>
              <Text style={styles.viewJobsButtonText}>View Jobs</Text>
            </TouchableOpacity>
          </View>
        )
      case "rejected":
        return (
          <TouchableOpacity
            style={[styles.licenseStatusCard, { backgroundColor: "#FFEBEE" }]}
            onPress={() => setShowLicenseUpload(true)}
          >
            <Icon name="x-circle" size={24} color="#F44336" />
            <View style={styles.licenseStatusContent}>
              <Text style={styles.licenseStatusTitle}>License Rejected</Text>
              <Text style={styles.licenseStatusSubtitle}>Please upload a valid license</Text>
            </View>
            <Icon name="refresh-cw" size={24} color="#F44336" />
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
      </View>
    )
  }

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container}>
        <View style={styles.headerBackground}>
          <Image source={backgroundImage} style={styles.backgroundImage} />
          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={handleProfileImageUpdate}>
              <Image
                source={{
                  uri: userData?.profileImage || "https://via.placeholder.com/100",
                }}
                style={styles.profileImage}
              />
              <View style={styles.editProfileImageButton}>
                <Icon name="camera" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.name}>{userData?.fullName}</Text>
            <Text style={styles.email}>{userData?.email}</Text>
          </View>
        </View>

        <View style={[styles.ratingCard, styles.ratingCardAdjusted]}>
          <Text style={styles.ratingTitle}>
            Worker Rating {"\n"}
            <Text style={{ fontSize: 14, color: "#888" }}>ورکر کی درجہ بندی</Text>
          </Text>
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon key={star} name="star" size={16} color="#FFD700" />
              ))}
            </View>
            <Text style={styles.ratingText}>5.0 (124 reviews) {"\n"} ۵.۰ (۱۲۴ جائزے)</Text>
          </View>
        </View>

        {/* Driver License Status Card */}
        {renderLicenseStatus()}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            About {"\n"}
            <Text style={{ fontSize: 14, color: "#888" }}>تعارف</Text>
          </Text>
          <TextInput
            value={isEditing ? editedData.about : userData?.about}
            onChangeText={(text) => setEditedData((prev) => ({ ...prev, about: text }))}
            style={[styles.textArea, { backgroundColor: "#fff" }]}
            multiline
            numberOfLines={4}
            editable={isEditing}
            placeholder="Write about yourself... / اپنے بارے میں لکھیں..."
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Skills & Specialties {"\n"}
            <Text style={{ fontSize: 14, color: "#888" }}>مہارتیں اور خصوصیات</Text>
          </Text>
          {skills.map((skill, index) => (
            <View key={index} style={styles.skillItem}>
              <Text style={styles.skillText}>{skill}</Text>
              {isEditing && (
                <TouchableOpacity onPress={() => removeSkill(index)}>
                  <Icon name="x" size={20} color="#FF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {isEditing && (
            <View style={styles.addSkillContainer}>
              <TextInput
                value={newSkill}
                onChangeText={setNewSkill}
                style={styles.skillInput}
                placeholder="Add a new skill / نئی مہارت شامل کریں"
              />
              <TouchableOpacity onPress={addSkill} style={styles.addButton}>
                <Icon name="plus" size={20} color="#4A90E2" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Experience {"\n"}
            <Text style={{ fontSize: 14, color: "#888" }}>تجربہ</Text>
          </Text>
          <View style={styles.experienceList}>
            {experiences.map((exp, index) => (
              <View key={index} style={styles.experienceItem}>
                <Text style={styles.experienceTitle}>{exp.title}</Text>
                <Text style={styles.experienceCompany}>{exp.company}</Text>
                <Text style={styles.experienceDuration}>{exp.duration}</Text>
                {isEditing && (
                  <TouchableOpacity onPress={() => removeExperience(index)} style={styles.removeButton}>
                    <Icon name="trash-2" size={20} color="#FF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
          {isEditing && (
            <View style={styles.addExperienceContainer}>
              <TextInput
                value={newExperience.title}
                onChangeText={(text) => setNewExperience((prev) => ({ ...prev, title: text }))}
                style={styles.experienceInput}
                placeholder="Job Title / عہدہ"
              />
              <TextInput
                value={newExperience.company}
                onChangeText={(text) => setNewExperience((prev) => ({ ...prev, company: text }))}
                style={styles.experienceInput}
                placeholder="Company / کمپنی"
              />
              <TextInput
                value={newExperience.duration}
                onChangeText={(text) => setNewExperience((prev) => ({ ...prev, duration: text }))}
                style={styles.experienceInput}
                placeholder="Duration / دورانیہ"
              />
              <TouchableOpacity onPress={addExperience} style={styles.addButton}>
                <Icon name="plus" size={20} color="#4A90E2" />
              </TouchableOpacity>
            </View>
          )}
          {!isEditing && experiences.length === 0 && (
            <Text style={styles.emptyText}>No experience added yet {"\n"} ابھی تک کوئی تجربہ شامل نہیں کیا گیا</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Available Times {"\n"}
            <Text style={{ fontSize: 14, color: "#888" }}>دستیاب اوقات</Text>
          </Text>
          <View style={styles.availableTimesList}>
            {availableTimes.map((time, index) => (
              <View key={index} style={styles.availableTimeItem}>
                <Text style={styles.availableTimeText}>{`${time.day}: ${time.time}`}</Text>
                {isEditing && (
                  <TouchableOpacity onPress={() => removeAvailableTime(index)}>
                    <Icon name="x" size={20} color="#FF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
          {isEditing && (
            <View style={styles.addAvailableTimeContainer}>
              <TextInput
                value={newAvailableTime.day}
                onChangeText={(text) => setNewAvailableTime((prev) => ({ ...prev, day: text }))}
                style={styles.availableTimeInput}
                placeholder="Day / دن"
              />
              <TextInput
                value={newAvailableTime.time}
                onChangeText={(text) => setNewAvailableTime((prev) => ({ ...prev, time: text }))}
                style={styles.availableTimeInput}
                placeholder="Time / وقت"
              />
              <TouchableOpacity onPress={addAvailableTime} style={styles.addButton}>
                <Icon name="plus" size={20} color="#4A90E2" />
              </TouchableOpacity>
            </View>
          )}
          {!isEditing && availableTimes.length === 0 && (
            <Text style={styles.emptyText}>
              No available times added yet {"\n"} ابھی تک کوئی دستیاب وقت شامل نہیں کیا گیا
            </Text>
          )}
        </View>

        <View style={styles.workSection}>
          <Text style={styles.sectionTitle}>
            My Work {"\n"}
            <Text style={{ fontSize: 14, color: "#888" }}>میرا کام</Text>
          </Text>
          <View style={styles.imageGrid}>
            {workImages.map((imageUrl, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleImagePress(imageUrl)}
                onLongPress={() => handleImageLongPress(imageUrl)}
                delayLongPress={500}
                style={styles.imageContainer}
              >
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.workImage}
                  onError={(error) => console.error("Image loading error:", error)}
                />
                {longPressedImage === imageUrl && (
                  <View style={styles.deleteOverlay}>
                    <Icon name="trash-2" size={24} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
            {isEditing && (
              <TouchableOpacity style={styles.addImageButton} onPress={handleImagePicker}>
                <Icon name="plus" size={32} color="#4A90E2" />
                <Text style={styles.addImageText}>Add Image {"\n"} تصویر شامل کریں</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>
              CNIC: {"\n"} <Text style={{ fontSize: 12 }}>شناختی کارڈ نمبر</Text>
            </Text>
            <Text style={styles.value}>{userData.cnic}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Phone Number: {"\n"} <Text style={{ fontSize: 12 }}>فون نمبر</Text>
            </Text>
            <Text style={styles.value}>{userData.phoneNumber}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Email: {"\n"} <Text style={{ fontSize: 12 }}>ای میل</Text>
            </Text>
            <Text style={styles.value}>{userData.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Country: {"\n"} <Text style={{ fontSize: 12 }}>ملک</Text>
            </Text>
            {isEditing ? (
              <TextInput
                value={editedData.country}
                onChangeText={(text) => setEditedData((prev) => ({ ...prev, country: text }))}
                style={styles.input}
              />
            ) : (
              <Text style={styles.value}>{userData.country}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Permanent Address: {"\n"} <Text style={{ fontSize: 12 }}>مستقل پتہ</Text>
            </Text>
            {isEditing ? (
              <TextInput
                value={editedData.permanentAddress}
                onChangeText={(text) => setEditedData((prev) => ({ ...prev, permanentAddress: text }))}
                style={styles.input}
              />
            ) : (
              <Text style={styles.value}>{userData.permanentAddress}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Temporary Address: {"\n"} <Text style={{ fontSize: 12 }}>عارضی پتہ</Text>
            </Text>
            {isEditing ? (
              <TextInput
                value={editedData.temporaryAddress}
                onChangeText={(text) => setEditedData((prev) => ({ ...prev, temporaryAddress: text }))}
                style={styles.input}
              />
            ) : (
              <Text style={styles.value}>{userData.temporaryAddress}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Gender: {"\n"} <Text style={{ fontSize: 12 }}>جنس</Text>
            </Text>
            {isEditing ? (
              <TextInput
                value={editedData.gender}
                onChangeText={(text) => setEditedData((prev) => ({ ...prev, gender: text }))}
                style={styles.input}
              />
            ) : (
              <Text style={styles.value}>{userData.gender}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Date of Birth: {"\n"} <Text style={{ fontSize: 12 }}>تاریخ پیدائش</Text>
            </Text>
            {isEditing ? (
              <TextInput
                value={editedData.dob}
                onChangeText={(text) => setEditedData((prev) => ({ ...prev, dob: text }))}
                style={styles.input}
              />
            ) : (
              <Text style={styles.value}>{userData.dob}</Text>
            )}
          </View>
        </View>

        {isEditing ? (
          <View style={styles.editActions}>
            <Button
              mode="contained"
              onPress={handleSaveProfile}
              style={[styles.editButton, { marginRight: 10 }]}
              labelStyle={{ color: "#fff" }}
            >
              Save Changes / تبدیلیاں محفوظ کریں
            </Button>
            <Button
              mode="outlined"
              onPress={() => {
                setIsEditing(false)
                setEditedData(userData)
              }}
              style={styles.editButton}
              labelStyle={{ color: "#fff" }}
            >
              Cancel / منسوخ کریں
            </Button>
          </View>
        ) : (
          <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
            <Text style={styles.editButtonText}>Edit Profile / پروفائل میں ترمیم کریں</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.logoutButton, { marginTop: 0 }]} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout / لاگ آؤٹ</Text>
        </TouchableOpacity>

        {/* License Verification Success Modal */}
        <Modal
          visible={showLicenseVerifiedModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowLicenseVerifiedModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { padding: 20 }]}>
              <View style={styles.successIconContainer}>
                <Icon name="check-circle" size={60} color="#4CAF50" />
              </View>

              <Text style={styles.successModalTitle}>License Verified Successfully!</Text>

              <Text style={styles.successModalText}>
                Congratulations! Your driver license has been verified. You can now view and apply for driver jobs.
              </Text>

              <TouchableOpacity
                style={styles.successModalButton}
                onPress={() => {
                  setShowLicenseVerifiedModal(false)
                  router.push("/home")
                }}
              >
                <Text style={styles.successModalButtonText}>View Available Jobs</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.laterButton} onPress={() => setShowLicenseVerifiedModal(false)}>
                <Text style={styles.laterButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>

      {/* Driver License Upload Modal */}
      <Modal
        visible={showLicenseUpload}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLicenseUpload(false)}
      >
        <View style={styles.licenseModalContainer}>
          <View style={styles.licenseModalContent}>
            <View style={styles.licenseModalHeader}>
              <Text style={styles.licenseModalTitle}>Upload Driver License</Text>
              <TouchableOpacity onPress={() => setShowLicenseUpload(false)}>
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.licenseModalBody}>
              <Text style={styles.licenseModalText}>
                Please upload a clear photo of your driver license. This will be verified by our team.
              </Text>

              <TouchableOpacity style={styles.licenseImageContainer} onPress={handleLicenseImagePicker}>
                {licenseImage ? (
                  <Image source={{ uri: licenseImage }} style={styles.licensePreview} />
                ) : (
                  <>
                    <Icon name="upload" size={40} color="#4A90E2" />
                    <Text style={styles.licenseUploadText}>Tap to select license image</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.uploadLicenseButton,
                  (!licenseImage || uploadingLicense) && styles.uploadLicenseButtonDisabled,
                ]}
                onPress={handleUploadLicense}
                disabled={!licenseImage || uploadingLicense}
              >
                {uploadingLicense ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.uploadLicenseButtonText}>Submit License for Verification</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showFullImage} transparent={true} onRequestClose={() => setShowFullImage(false)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setShowFullImage(false)}>
            <Icon name="x" size={24} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.fullScreenImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/home")}>
          <Icon name="home" size={24} color="#666" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/orders")}>
          <Icon name="shopping-bag" size={24} color="#666" />
          <Text style={styles.navText}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <Icon name="user" size={24} color="#4A90E2" />
          <Text style={[styles.navText, styles.navTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
  },
  headerBackground: {
    height: 280,
    width: "100%",
    position: "relative",
  },
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  profileHeader: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#fff",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 10,
  },
  email: {
    fontSize: 14,
    color: "#fff",
    marginTop: 5,
  },
  ratingCard: {
    backgroundColor: "#fff",
    margin: 20,
    marginTop: -30,
    padding: 20,
    borderRadius: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  ratingCardAdjusted: {
    marginTop: -70,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  starsContainer: {
    flexDirection: "row",
    marginTop: 5,
  },
  ratingText: {
    fontSize: 14,
    color: "#666",
  },
  sectionCard: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    minHeight: 100,
    textAlignVertical: "top",
    backgroundColor: "#fff",
  },
  skillItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
  },
  skillText: {
    fontSize: 14,
    color: "#333",
  },
  addSkillContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  skillInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  addButton: {
    padding: 10,
  },
  experienceList: {
    marginBottom: 10,
  },
  experienceItem: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 10,
  },
  experienceTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  experienceCompany: {
    fontSize: 14,
    color: "#666",
  },
  experienceDuration: {
    fontSize: 12,
    color: "#999",
  },
  addExperienceContainer: {
    marginTop: 10,
  },
  experienceInput: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  availableTimesList: {
    marginBottom: 10,
  },
  availableTimeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
  },
  availableTimeText: {
    fontSize: 14,
    color: "#333",
  },
  addAvailableTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  availableTimeInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  workSection: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  imageContainer: {
    width: (screenWidth - 80) / 3, // Accounting for margins and gaps
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  workImage: {
    width: "100%",
    height: "100%",
  },
  addImageButton: {
    width: "32%",
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
  },
  addImageText: {
    color: "#4A90E2",
    marginTop: 5,
  },
  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoCard: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  label: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: "#333",
    flex: 2,
    textAlign: "right",
  },
  input: {
    flex: 2,
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  editButton: {
    backgroundColor: "#4A90E2",
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "center",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: "#FF4444",
    marginHorizontal: 20,
    marginBottom: 80,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  navItemActive: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  editProfileImageButton: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#4A90E2",
    borderRadius: 15,
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: "100%",
    height: "80%",
    resizeMode: "contain",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  emptyText: {
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },
  // License Status Card
  licenseStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    margin: 20,
    marginTop: 0,
    marginBottom: 20,
    padding: 16,
    borderRadius: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  licenseStatusContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  licenseStatusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  licenseStatusSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  // License Upload Modal
  licenseModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  licenseModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  licenseModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  licenseModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  licenseModalBody: {
    alignItems: "center",
  },
  licenseModalText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  licenseImageContainer: {
    width: "100%",
    height: 200,
    borderWidth: 2,
    borderColor: "#4A90E2",
    borderStyle: "dashed",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#f9f9f9",
  },
  licensePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  licenseUploadText: {
    marginTop: 10,
    color: "#4A90E2",
    fontSize: 16,
  },
  uploadLicenseButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  uploadLicenseButtonDisabled: {
    backgroundColor: "#B0C4DE",
  },
  uploadLicenseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  viewJobsButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewJobsButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  successIconContainer: {
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#E8F5E9",
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  successModalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 16,
  },
  successModalText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  successModalButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  successModalButtonText: {
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
    marginBottom: 12,
  },
  laterButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default ProfileScreen
