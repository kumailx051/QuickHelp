"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router"
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore"
import { getAuth } from "firebase/auth"

const VerificationPage = () => {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const auth = getAuth()
  const db = getFirestore()

  const handleCNICVerification = async () => {
    setLoading(true)

    try {
      // Fetch user data from Firebase
      const user = auth.currentUser
      if (!user) {
        throw new Error("User not authenticated")
      }

      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (!userDoc.exists()) {
        throw new Error("User data not found")
      }

      const userData = userDoc.data()
      const storedCNIC = userData.cnic
      const storedIdentityNumber = userData.identityNumber

      // Log values for debugging
      console.log("Stored CNIC:", storedCNIC)
      console.log("Stored Identity Number:", storedIdentityNumber)

      // Simple comparison of CNIC and identityNumber
      if (storedCNIC === storedIdentityNumber) {
        // Update verification status in Firebase to pending instead of verified
        await updateDoc(doc(db, "users", user.uid), {
          status: "pending",
          verificationDate: new Date().toISOString(),
        })

        Alert.alert(
          "Verification Submitted",
          "Your CNIC details have been submitted for verification. Your status is now pending approval.",
          [
            {
              text: "OK",
              onPress: () => router.push("/signup/login"),
            },
          ],
        )
      } else {
        Alert.alert("Verification Failed", "CNIC details do not match. Please ensure your CNIC information is correct.")
      }
    } catch (error) {
      console.error("Verification Error:", error)
      Alert.alert("Error", "Failed to verify CNIC. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your CNIC</Text>
      <Text style={styles.subtitle}>Your verification will be reviewed by our team</Text>

      {loading ? (
        <View>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>Submitting verification...</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleCNICVerification}>
          <Text style={styles.buttonText}>Verify CNIC</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
})

export default VerificationPage