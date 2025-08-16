"use client"

import { useState, useEffect } from "react"
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, LogBox } from "react-native"
import { TextInput, Button, Text, HelperText, Snackbar } from "react-native-paper"
import { useForm, Controller } from "react-hook-form"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { auth } from "../../firebaseConfig"
import CountryPicker from "react-native-country-picker-modal"
import { signInWithEmailAndPassword } from "firebase/auth"
import { getFirestore, doc, getDoc } from "firebase/firestore"

// Suppress the CountryModal warning properly
LogBox.ignoreLogs([
  "Warning: CountryModal: Support for defaultProps will be removed from function components in a future major release.",
])

// Create a wrapper component for CountryPicker to avoid the warning
const CustomCountryPicker = (props) => {
  // Explicitly pass all props to avoid using defaultProps
  return (
    <CountryPicker
      {...props}
      withFilter={props.withFilter || true}
      withFlag={props.withFlag || true}
      withCallingCode={props.withCallingCode || true}
      withCallingCodeButton={false}
      withCountryNameButton={props.withCountryNameButton || false}
      onSelect={props.onSelect}
      countryCode={props.countryCode}
      containerButtonStyle={props.containerButtonStyle}
    />
  )
}

const LoginPage = () => {
  const router = useRouter()
  const [isPhoneSelected, setIsPhoneSelected] = useState(true)
  const [country, setCountry] = useState({ callingCode: ["92"], cca2: "PK" })
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Add states for success message
  const [snackbarVisible, setSnackbarVisible] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState("")
  const [snackbarType, setSnackbarType] = useState("success") // success or error

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      phoneNumber: "",
      email: "",
      password: "",
    },
  })

  // Ensure LogBox is called early
  useEffect(() => {
    LogBox.ignoreLogs([
      "Warning: CountryModal: Support for defaultProps will be removed from function components in a future major release.",
    ])
  }, [])

  // Function to show success message
  const showSuccessMessage = (userRole) => {
    // Set success message based on user role
    let welcomeMessage = "Welcome back! Login successful.";
    
    if (userRole === "employee") {
      welcomeMessage = "Welcome back, Employee! Login successful. خوش آمدید، ملازم! لاگ ان کامیاب رہا۔";
    } else if (userRole === "user") {
      welcomeMessage = "Welcome back, User! Login successful. خوش آمدید، صارف! لاگ ان کامیاب رہا۔";
    } else if (userRole === "admin") {
      welcomeMessage = "Welcome back, Admin! Login successful. خوش آمدید، ایڈمن! لاگ ان کامیاب رہا۔";
    }
    // Show success alert
   
    
    // Also show success snackbar
    setSnackbarMessage(welcomeMessage)
    setSnackbarType("success")
    setSnackbarVisible(true)
    
    // Hide snackbar after navigation (optional)
    setTimeout(() => {
      setSnackbarVisible(false)
    }, 2000)
  }

  const handleEmailLogin = async (email, password) => {
    setLoading(true)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Get user data from Firestore
      const db = getFirestore()
      const userDoc = await getDoc(doc(db, "users", user.uid))

      if (userDoc.exists()) {
        const userData = userDoc.data()
        const userRole = userData.role
        const userStatus = userData.status || "unverified"

        // Check user verification status
        if (userStatus === "pending") {
          // Show alert that profile is under review and prevent login
            Alert.alert(
            "Profile Under Review",
            "Your profile is currently under review. Please check back later.\n\nآپ کی پروفائل کا جائزہ لیا جا رہا ہے۔ براہ کرم بعد میں دوبارہ چیک کریں۔",
            [{ text: "OK" }]
            )
          // Sign out the user since they can't proceed
          await auth.signOut()
          return
        } else if (userStatus === "disapproved") {
          // Show detailed popup for disapproved status
          const reason = userData.disapprovalReason || "Your verification was not approved by the admin."
            Alert.alert(
            "Verification Disapproved",
            `Your account verification has been disapproved.\n\nReason: ${reason}\n\nPlease update your information and try again.\n\nآپ کے اکاؤنٹ کی تصدیق مسترد کر دی گئی ہے۔\n\nوجہ: ${reason}\n\nبراہ کرم اپنی معلومات کو اپ ڈیٹ کریں اور دوبارہ کوشش کریں۔`,
            [
              {
              text: "OK",
              style: "cancel",
              },
            ],
            )
          // Sign out the user
          await auth.signOut()
          return
        } else if (userStatus !== "verified" && userData.role !== "admin") {
          // If not verified and not an admin, show verification required message
            Alert.alert(
            "Verification Required",
            "Your account needs to be verified before you can login. Please complete the verification process.\n\nآپ کے اکاؤنٹ کو لاگ ان کرنے سے پہلے تصدیق کی ضرورت ہے۔ براہ کرم تصدیقی عمل مکمل کریں۔",
            [
              {
              text: "Verify Now",
              onPress: () => router.push("/verification"),
              },
              {
              text: "Cancel",
              style: "cancel",
              },
            ],
            )
          // Sign out the user
          await auth.signOut()
          return
        }

        // Show success message before navigation
        showSuccessMessage(userRole)

        // If status is verified or user is admin, navigate based on user role
        // Add a small delay to allow the user to see the success message
        setTimeout(() => {
          switch (userRole) {
            case "employee":
              router.push("/home")
              break
            case "user":
              router.push("/clientHomeScreen")
              break
            case "admin":
              router.push("/adminHomeScreen")
              break
            default:
              Alert.alert("Error", "Invalid user role")
              break
          }
        }, 1000) // Short delay for better UX
      } else {
        Alert.alert("Error", "User data not found")
      }
    } catch (error) {
      let errorMessage = "An error occurred during login"
      switch (error.code) {
        case "auth/invalid-email":
          errorMessage = "Invalid email address"
          break
        case "auth/user-disabled":
          errorMessage = "This account has been disabled"
          break
        case "auth/user-not-found":
          errorMessage = "No account found with this email"
          break
        case "auth/wrong-password":
          errorMessage = "Invalid password"
          break
        default:
          errorMessage = error.message
          break
      }
      
      // Show error in snackbar
      setSnackbarMessage("Login failed: Invalid email or password")
      setSnackbarType("error")
      setSnackbarVisible(true)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (data) => {
    if (isPhoneSelected) {
      // Phone authentication not implemented yet
      console.log("Phone:", `+${country.callingCode[0]}${data.phoneNumber}`)
      router.push("/otp-verification")
    } else {
      // Handle email login with Firebase
      handleEmailLogin(data.email, data.password)
    }
  }

  const handleSignup = () => {
    router.push("/signup/createAccount")
  }

  return (
    <LinearGradient colors={["#007AFF", "#0051A3"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Text style={styles.title}>Login Account</Text>
        <Text style={styles.subtitle}>
          Hello, welcome back to your account{"\n"}ہیلو، اپنے اکاؤنٹ میں خوش آمدید
        </Text>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, isPhoneSelected && styles.toggleButtonActive]}
            onPress={() => setIsPhoneSelected(true)}
          >
            <Text style={[styles.toggleText, isPhoneSelected && styles.toggleTextActive]}>
              Phone Number{"\n"}فون نمبر
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, !isPhoneSelected && styles.toggleButtonActive]}
            onPress={() => setIsPhoneSelected(false)}
          >
            <Text style={[styles.toggleText, !isPhoneSelected && styles.toggleTextActive]}>
              Email{"\n"}ای میل
            </Text>
          </TouchableOpacity>
        </View>

        {isPhoneSelected ? (
          <View style={styles.phoneInputContainer}>
            <TouchableOpacity style={styles.countryPicker}>
              <CustomCountryPicker
                countryCode={country.cca2}
                withFilter={true}
                withFlag={true}
                withCallingCode={true}
                withCountryNameButton={false}
                onSelect={(selectedCountry) => setCountry(selectedCountry)}
                containerButtonStyle={styles.countryPickerButton}
              />
              <Text style={styles.countryCode}>+{country.callingCode[0]}</Text>
            </TouchableOpacity>
            <Controller
              control={control}
              rules={{
                required: "Phone number is required\nفون نمبر ضروری ہے",
                pattern: {
                  value: /^[0-9]+$/,
                  message: "Please enter a valid phone number\nبراہ کرم درست فون نمبر درج کریں",
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Phone Number \ فون نمبر"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  keyboardType="phone-pad"
                  style={styles.phoneInput}
                  error={!!errors.phoneNumber}
                />
              )}
              name="phoneNumber"
            />
          </View>
        ) : (
          <>
            <Controller
              control={control}
              rules={{
                required: "Email is required\nای میل ضروری ہے",
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: "Please enter a valid email\nبراہ کرم درست ای میل درج کریں",
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Email \ ای میل"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  keyboardType="email-address"
                  style={styles.input}
                  error={!!errors.email}
                />
              )}
              name="email"
            />
            {errors.email && <HelperText type="error">{errors.email.message}</HelperText>}
            <Controller
              control={control}
              rules={{
                required: "Password is required\nپاس ورڈ ضروری ہے",
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Password \ پاس ورڈ"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  secureTextEntry={!isPasswordVisible}
                  right={
                    <TextInput.Icon
                      icon={isPasswordVisible ? "eye-off" : "eye"}
                      onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                    />
                  }
                  style={styles.input}
                  error={!!errors.password}
                />
              )}
              name="password"
            />
            {errors.password && <HelperText type="error">{errors.password.message}</HelperText>}
          </>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          style={styles.button}
          loading={loading}
          disabled={loading}
        >
          {isPhoneSelected ? "Request OTP " : "Login"}
        </Button>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>
            OR{"\n"}یا
          </Text>
          <View style={styles.divider} />
        </View>

        <Text style={styles.signUpText}>
          Not Registered yet?{" "}
          <Text style={styles.link} onPress={handleSignup}>
            Create an Account{"\n"}اکاؤنٹ بنائیں
          </Text>
        </Text>
      </ScrollView>
      
      {/* Success/Error Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={[
          styles.snackbar,
          snackbarType === "success" ? styles.successSnackbar : styles.errorSnackbar
        ]}
        action={{
          label: 'Dismiss\nخارج کریں',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#e0e0e0",
    marginBottom: 24,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "white",
  },
  toggleText: {
    color: "#e0e0e0",
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#007AFF",
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  countryPicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  countryPickerButton: {
    marginRight: 4,
  },
  countryCode: {
    color: "#000",
    fontSize: 16,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: "white",
  },
  input: {
    marginBottom: 12,
    backgroundColor: "white",
  },
  button: {
    marginTop: 24,
    marginBottom: 16,
    paddingVertical: 8,
    backgroundColor: "#000",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  dividerText: {
    color: "#e0e0e0",
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "bold",
  },
  signUpText: {
    textAlign: "center",
    color: "#e0e0e0",
    marginTop: 16,
  },
  link: {
    color: "#FFD700",
  },
  snackbar: {
    margin: 16,
    borderRadius: 8,
  },
  successSnackbar: {
    backgroundColor: "#4CAF50", // Green color for success
  },
  errorSnackbar: {
    backgroundColor: "#FF3B30", // Red color for errors
  },
})

export default LoginPage