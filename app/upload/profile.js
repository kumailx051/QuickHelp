"use client"

import { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
  LogBox
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useDispatch, useSelector } from "react-redux"
import * as ImagePicker from "expo-image-picker"
import { setProfileImage } from "../../src/store/profileSlice"
import { useRouter } from "expo-router"
import { useTranslation } from "react-i18next"
import { colors } from "../../constants/Colors"
import { getStorage } from "firebase/storage"
import { getFirestore, doc, updateDoc } from "firebase/firestore"
import { auth } from "../../firebaseConfig"
LogBox.ignoreLogs([
  "A non-serializable value was detected in the state, in the path",
])
const { width } = Dimensions.get("window")

const ProfilePictureScreen = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const dispatch = useDispatch()
  const profileImage = useSelector((state) => state.profile.profileImage)
  const [loading, setLoading] = useState(false)

  const storage = getStorage()
  const db = getFirestore()

  const uploadToImageBB = async (imageUri) => {
    const apiKey = "f31e40432a7b500dd75ce5255d3ea517"
    const apiUrl = `https://api.imgbb.com/1/upload?key=${apiKey}`

    const formData = new FormData()
    formData.append("image", {
      uri: imageUri,
      type: "image/jpeg",
      name: "profile.jpg",
    })

    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
    })

    const data = await response.json()
    if (!data.data?.url) {
      throw new Error("Failed to upload image to ImageBB")
    }
    return data.data.url
  }

  const uploadToFirebase = async (imageUrl) => {
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        profileImage: imageUrl,
      })
    } catch (error) {
      console.error("Error updating Firestore:", error)
      throw error
    }
  }

  const handleFileUpload = async (event) => {
    try {
      setLoading(true)
      const file = event.target.files[0]
      if (file) {
        const imageUrl = await uploadToImageBB(URL.createObjectURL(file))
        await uploadToFirebase(imageUrl)
        dispatch(setProfileImage(imageUrl))
        Alert.alert("Success", "Image uploaded successfully!")
      }
    } catch (error) {
      console.error("File upload error:", error)
      Alert.alert("Error", "Failed to upload the image.")
    } finally {
      setLoading(false)
    }
  }

  const handleImagePick = async (isCamera = false) => {
    try {
      setLoading(true)
      let result

      if (isCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Please allow camera access to take photos.")
          return
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 1,
          aspect: [1, 1],
        })
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Please allow access to your photo library.")
          return
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 1,
          aspect: [1, 1],
        })
      }

      if (!result.canceled) {
        const uri = result.assets[0].uri
        const imageUrl = await uploadToImageBB(uri)
        await uploadToFirebase(imageUrl)
        dispatch(setProfileImage(imageUrl))
        Alert.alert("Success", "Image uploaded successfully!")
      }
    } catch (error) {
      console.error("ImagePicker Error:", error)
      Alert.alert("Error", "Failed to pick or upload the image.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t("uploadProfilePicture")}</Text>
      <Text style={styles.title}>{t("uploadProfilePictureUrdu")}</Text>

      <View style={styles.uploadContainer}>
        <Text style={styles.heading}>Profile Picture</Text>
        <TouchableOpacity style={styles.imageContainer} onPress={() => handleImagePick(false)} disabled={loading}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <Text style={styles.icon}>📷</Text>
          )}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.text}>{t("tapToUpload")}</Text>
        <Text style={styles.text}>{t("tapToUploadUrdu")}</Text>
        <TouchableOpacity
          style={[styles.obutton, loading && styles.disabledButton]}
          onPress={() => handleImagePick(true)}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{t("takePhoto")}</Text>
        </TouchableOpacity>

        {Platform.OS === "web" && (
          <input type="file" accept="image/*" style={styles.fileInput} onChange={handleFileUpload} disabled={loading} />
        )}

        <TouchableOpacity
          style={[styles.button, (!profileImage || loading) && styles.disabledButton]}
          onPress={() => {
            router.push("verification")
          }}
          disabled={!profileImage || loading}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#007AFF",
  },
  uploadContainer: {
    width: width - 40,
    justifyContent: "center",
    alignItems: "center",
  },
  heading: {
    fontSize: 20,
    marginBottom: 10,
    color: colors.text,
  },
  imageContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e0e0e0",
    marginBottom: 10,
    overflow: "hidden",
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  icon: {
    fontSize: 40,
    color: colors.text,
  },
  text: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    marginTop: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  obutton: {
    backgroundColor: "#007AFF",
    marginTop: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#ccc",
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  fileInput: {
    marginTop: 10,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
})

export default ProfilePictureScreen

