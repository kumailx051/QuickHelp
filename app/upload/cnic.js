"use client"

import { useState } from "react"
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
  TextInput,
  LogBox
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { setFrontImage, setBackImage } from "../../src/store/cnicSlice"
import { useRouter } from "expo-router"
import { useTranslation } from "react-i18next"
import { useSelector, useDispatch } from "react-redux"
import { getStorage } from "firebase/storage"
import { getFirestore, doc, updateDoc } from "firebase/firestore"
import { auth } from "../../firebaseConfig"
import { colors } from "../../constants/Colors"
LogBox.ignoreLogs([
  "A non-serializable value was detected in the state, in the path",
])
const { width } = Dimensions.get("window")

const CnicUploadScreen = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const dispatch = useDispatch()
  const frontImage = useSelector((state) => state.cnic.frontImage)
  const backImage = useSelector((state) => state.cnic.backImage)
  const [loading, setLoading] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [manualCnicNumber, setManualCnicNumber] = useState("")

  const storage = getStorage()
  const db = getFirestore()

  const uploadToImageBB = async (imageUri) => {
    const apiKey = "f31e40432a7b500dd75ce5255d3ea517" // Replace with your ImageBB API key
    const apiUrl = `https://api.imgbb.com/1/upload?key=${apiKey}`

    const formData = new FormData()
    formData.append("image", {
      uri: imageUri,
      type: "image/jpeg",
      name: "image.jpg",
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

  const extractIdentityNumber = async (imageUri) => {
    try {
      setOcrLoading(true)
      const formData = new FormData()
      formData.append('apikey', 'K81207352088957')
      formData.append('language', 'eng')
      formData.append('isOverlayRequired', 'false')
      formData.append('detectOrientation', 'true')
      formData.append('scale', 'true')
      formData.append('OCREngine', '2')

      // Handle different image sources
      if (Platform.OS === 'web' && imageUri.startsWith('blob:')) {
        const response = await fetch(imageUri)
        const blob = await response.blob()
        formData.append('file', blob, 'image.jpg')
      } else {
        formData.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'image.jpg',
        })
      }

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.ParsedResults && data.ParsedResults.length > 0) {
        const extractedText = data.ParsedResults[0].ParsedText
        console.log('Extracted text:', extractedText)

        // Regular expression to match Pakistani CNIC format (both with and without dashes)
        const cnicRegex = /\b(\d{5}[-]?\d{7}[-]?\d)\b/g
        const matches = extractedText.match(cnicRegex)

        if (matches && matches.length > 0) {
          // Format the CNIC number with dashes if they're missing
          const formattedCNIC = matches[0].replace(/(\d{5})(\d{7})(\d)/, '$1-$2-$3')
          return formattedCNIC
        } else {
          console.log('No CNIC number found in the extracted text')
          // If no exact match is found, look for number sequences that might be a CNIC
          const numberSequences = extractedText.match(/\d+/g)
          if (numberSequences) {
            const possibleCNIC = numberSequences.find(seq => seq.length >= 13)
            if (possibleCNIC) {
              console.log('Possible CNIC number found:', possibleCNIC)
              return possibleCNIC.replace(/(\d{5})(\d{7})(\d)/, '$1-$2-$3')
            }
          }
          return null
        }
      }

      return null
    } catch (error) {
      console.error('Error in OCR:', error)
      return null
    } finally {
      setOcrLoading(false)
    }
  }

  const handleImagePick = async (type, isCamera = false) => {
    try {
      setLoading(true)
      let result

      if (isCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Please allow camera access to take photos.')
          return
        }

        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 1,
          aspect: [4, 3],
        })
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Please allow access to your photo library.')
          return
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 1,
          aspect: [4, 3],
        })
      }

      if (!result.canceled) {
        const uri = result.assets[0].uri
        const imageBBUrl = await uploadToImageBB(uri)

        if (type === "front") {
          dispatch(setFrontImage(imageBBUrl))
          const identityNumber = await extractIdentityNumber(uri)
          if (identityNumber) {
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
              frontCnic: imageBBUrl,
              identityNumber: identityNumber,
            })
            Alert.alert("Success", `CNIC number extracted: ${identityNumber}`)
          } else {
            Alert.alert(
              "CNIC Extraction Failed",
              "We couldn't automatically extract the CNIC number. Please check if:\n\n" +
              "1. The image is clear and well-lit\n" +
              "2. The CNIC number is visible and not obstructed\n" +
              "3. The image is properly oriented\n\n" +
              "You can try uploading the image again or manually enter the CNIC number if the problem persists."
            )
          }
        } else {
          dispatch(setBackImage(imageBBUrl))
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
            backCnic: imageBBUrl,
          })
        }

        Alert.alert("Success", "Image uploaded successfully!")
      }
    } catch (error) {
      console.error("Image upload error:", error)
      Alert.alert("Error", `Failed to upload the image: ${error.message}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event, type) => {
    try {
      setLoading(true)
      const file = event.target.files[0]
      if (file) {
        const imageBBUrl = await uploadToImageBB(URL.createObjectURL(file))

        if (type === "front") {
          dispatch(setFrontImage(imageBBUrl))
          const identityNumber = await extractIdentityNumber(URL.createObjectURL(file))
          if (identityNumber) {
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
              frontCnic: imageBBUrl,
              identityNumber: identityNumber,
            })
            Alert.alert("Success", `CNIC number extracted: ${identityNumber}`)
          } else {
            Alert.alert(
              "CNIC Extraction Failed",
              "We couldn't automatically extract the CNIC number. Please check if:\n\n" +
              "1. The image is clear and well-lit\n" +
              "2. The CNIC number is visible and not obstructed\n" +
              "3. The image is properly oriented\n\n" +
              "You can try uploading the image again or manually enter the CNIC number if the problem persists."
            )
          }
        } else {
          dispatch(setBackImage(imageBBUrl))
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
            backCnic: imageBBUrl,
          })
        }

        Alert.alert("Success", "Image uploaded successfully!")
      }
    } catch (error) {
      console.error("File upload error:", error)
      Alert.alert("Error", `Failed to upload the image: ${error.message}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const handleManualCnicSubmit = async () => {
    if (manualCnicNumber.match(/^\d{5}-\d{7}-\d$/)) {
      try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          identityNumber: manualCnicNumber,
        })
        Alert.alert("Success", "CNIC number manually added successfully!")
      } catch (error) {
        console.error("Manual CNIC update error:", error)
        Alert.alert("Error", "Failed to update CNIC number. Please try again.")
      }
    } else {
      Alert.alert("Invalid Format", "Please enter a valid CNIC number in the format: 12345-1234567-1")
    }
  }

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>{t("uploadCnicTitle")}</Text>

        {/* Front CNIC */}
        <View style={styles.uploadContainer}>
          <View style={styles.labelContainer}>
            <Text style={styles.heading}>{t("frontCnicLabel")}</Text>
            <Text style={styles.headingUrdu}>{t("frontCnicLabelUrdu")}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.imageContainer, loading && styles.disabledContainer]} 
            onPress={() => handleImagePick("front")} 
            disabled={loading}
          >
            {frontImage ? (
              <Image source={{ uri: frontImage }} style={styles.image} />
            ) : (
              <>
                <Text style={styles.icon}>📷</Text>
                {Platform.OS === "web" && (
                  <input
                    type="file"
                    accept="image/*"
                    style={styles.fileInput}
                    onChange={(e) => handleFileUpload(e, "front")}
                    disabled={loading}
                  />
                )}
              </>
            )}
            {(loading || ocrLoading) && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>
                  {ocrLoading ? "Extracting CNIC..." : "Uploading..."}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.obutton, loading && styles.disabledButton]} 
            onPress={() => handleImagePick("front", true)} 
            disabled={loading}
          >
            <Text style={styles.buttonText}>{t("takePhoto")}</Text>
          </TouchableOpacity>
        </View>

        {/* Back CNIC */}
        <View style={styles.uploadContainer}>
          <View style={styles.labelContainer}>
            <Text style={styles.heading}>{t("backCnicLabel")}</Text>
            <Text style={styles.headingUrdu}>{t("backCnicLabelUrdu")}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.imageContainer, loading && styles.disabledContainer]} 
            onPress={() => handleImagePick("back")} 
            disabled={loading}
          >
            {backImage ? (
              <Image source={{ uri: backImage }} style={styles.image} />
            ) : (
              <>
                <Text style={styles.icon}>📷</Text>
                {Platform.OS === "web" && (
                  <input
                    type="file"
                    accept="image/*"
                    style={styles.fileInput}
                    onChange={(e) => handleFileUpload(e, "back")}
                    disabled={loading}
                  />
                )}
              </>
            )}
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Uploading...</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.obutton, loading && styles.disabledButton]} 
            onPress={() => handleImagePick("back", true)} 
            disabled={loading}
          >
            <Text style={styles.buttonText}>{t("takePhoto")}</Text>
          </TouchableOpacity>

          {/* Manual CNIC Input 
          <View style={styles.manualInputContainer}>
            <Text style={styles.manualInputLabel}>Manual CNIC Input:</Text>
            <TextInput
              style={styles.manualInput}
              placeholder="12345-1234567-1"
              value={manualCnicNumber}
              onChangeText={setManualCnicNumber}
              keyboardType="number-pad"
            />
            <TouchableOpacity 
              style={[styles.obutton, !manualCnicNumber && styles.disabledButton]} 
              onPress={handleManualCnicSubmit}
              disabled={!manualCnicNumber}
            >
              <Text style={styles.buttonText}>Submit Manual CNIC</Text>
            </TouchableOpacity>
          </View>
*/}
          <TouchableOpacity
            style={[styles.button, (!frontImage || !backImage || loading) && styles.disabledButton]}
            onPress={() => {
              router.push("/upload/profile")
            }}
            disabled={loading || !frontImage || !backImage}
          >
            <Text style={styles.buttonText}>{t("nextButton")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
    textAlign: "center",
    marginBottom: 20,
  },
  uploadContainer: {
    marginBottom: 30,
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  heading: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  headingUrdu: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "right",
  },
  imageContainer: {
    width: width * 0.9,
    height: 200,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#e1e1e1",
    marginBottom: 10,
    overflow: "hidden",
    position: "relative",
  },
  disabledContainer: {
    opacity: 0.7,
  },
  icon: {
    fontSize: 50,
    color: "#888",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  fileInput: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0,
    cursor: "pointer",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "bold",
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
  manualInputContainer: {
    marginTop: 20,
  },
  manualInputLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  manualInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
})

export default CnicUploadScreen