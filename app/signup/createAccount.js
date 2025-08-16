"use client"

import { useState } from "react"
import { View, StyleSheet, ScrollView, Alert } from "react-native"
import { TextInput, Button, Text, Checkbox, HelperText, Snackbar } from "react-native-paper"
import { useForm, Controller } from "react-hook-form"
import { useNavigation } from "@react-navigation/native"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { colors } from "../../constants/Colors"
import { auth } from "../../firebaseConfig" // Import auth from your Firebase config
import { createUserWithEmailAndPassword } from "firebase/auth"
import { getFirestore, doc, setDoc } from "firebase/firestore"

const SignUpScreen = () => {
    const router = useRouter()
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    const [isChecked, setIsChecked] = useState(false)
    const navigation = useNavigation()
    const [loading, setLoading] = useState(false)
    const [snackbarVisible, setSnackbarVisible] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm({
        defaultValues: {
            fullName: "",
            phoneNumber: "",
            email: "",
            password: "",
        },
    })

    // Function to handle Firebase error codes and return user-friendly messages
    const getErrorMessage = (errorCode) => {
        switch (errorCode) {
            case 'auth/email-already-in-use':
                return 'This email is already registered. Please use a different email or sign in.';
            case 'auth/invalid-email':
                return 'The email address is not valid.';
            case 'auth/weak-password':
                return 'The password is too weak. Please use a stronger password.';
            case 'auth/network-request-failed':
                return 'Network error. Please check your internet connection.';
            case 'auth/too-many-requests':
                return 'Too many unsuccessful attempts. Please try again later.';
            default:
                return 'An error occurred during sign up. Please try again.';
        }
    };

    const onSubmit = async (data) => {
        try {
            setLoading(true);
            // Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password)
            const user = userCredential.user

            // Save additional user data to Firestore
            const db = getFirestore()
            await setDoc(doc(db, "users", user.uid), {
                fullName: data.fullName,
                phoneNumber: data.phoneNumber,
                email: data.email,
                createdAt: new Date(),
            })

            console.log("User account created & signed in!")
            router.push("phone/otp")
        } catch (error) {
            
            // Handle specific Firebase Auth errors
            const errorCode = error.code;
            const friendlyMessage = getErrorMessage(errorCode);
            
            // Show error in Snackbar
            setErrorMessage(friendlyMessage);
            setSnackbarVisible(true);
            
            // For critical errors, also show an Alert
            if (errorCode === 'auth/email-already-in-use' || errorCode === 'auth/network-request-failed') {
                
            }
        } finally {
            setLoading(false);
        }
    }

    const handleSignin = () => {
        router.push("/signup/login")
    }

    return (
        <LinearGradient colors={["#007AFF", "#0051A3"]} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollView}>
                <Text style={styles.title}>Create an account / اکاؤنٹ بنائیں</Text>
                <Text style={styles.subtitle}>Complete the sign up process to get started / شروع کرنے کے لیے سائن اپ کا عمل مکمل کریں</Text>

                <Controller
                    control={control}
                    rules={{ required: "Full name is required / مکمل نام ضروری ہے" }}
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            label="Full Name / مکمل نام"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            style={styles.input}
                            error={!!errors.fullName}
                        />
                    )}
                    name="fullName"
                />
                {errors.fullName && <HelperText type="error">{errors.fullName.message}</HelperText>}

                <Controller
                    control={control}
                    rules={{
                        required: "Phone number is required / فون نمبر ضروری ہے",
                        pattern: { value: /^[0-9]+$/, message: "Please enter a valid phone number / براہ کرم درست فون نمبر درج کریں" },
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            label="Phone Number / فون نمبر"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            keyboardType="phone-pad"
                            style={styles.input}
                            error={!!errors.phoneNumber}
                        />
                    )}
                    name="phoneNumber"
                />
                {errors.phoneNumber && <HelperText type="error">{errors.phoneNumber.message}</HelperText>}

                <Controller
                    control={control}
                    rules={{
                        required: "Email is required / ای میل ضروری ہے",
                        pattern: { value: /^\S+@\S+$/i, message: "Please enter a valid email / براہ کرم درست ای میل درج کریں" },
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            label="Email Address / ای میل پتہ"
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
                        required: "Password is required / پاس ورڈ ضروری ہے",
                        minLength: { value: 6, message: "Password must be at least 6 characters / پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے" },
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            label="Password / پاس ورڈ"
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

                <View style={styles.checkboxContainer}>
                    <Checkbox
                        status={isChecked ? "checked" : "unchecked"}
                        onPress={() => setIsChecked(!isChecked)}
                        color="white"
                    />
                    <Text style={styles.checkboxText}>
                        By ticking this box, you agree to our{" "}
                        <Text style={styles.link}>Terms and conditions and private policy / شرائط و ضوابط اور نجی پالیسی</Text>
                    </Text>
                </View>

                <Button
                    mode="contained"
                    onPress={handleSubmit(onSubmit)}
                    style={[
                        styles.button,
                        { backgroundColor: isChecked ? colors.primary : "grey" },
                    ]}
                    labelStyle={{ color: isChecked ? "white" : "black" }}
                    disabled={!isChecked || loading}
                    loading={loading}
                >
                    {loading ? "Signing Up... / سائن اپ ہو رہا ہے..." : "Sign Up / سائن اپ کریں"}
                </Button>

                <Text style={styles.signInText}>
                    Already have an account?{" "}
                    <Text style={styles.link} onPress={handleSignin}>
                        Sign in / سائن ان کریں
                    </Text>
                </Text>
            </ScrollView>
            
            {/* Error Snackbar */}
            <Snackbar
                visible={snackbarVisible}
                onDismiss={() => setSnackbarVisible(false)}
                duration={3000}
                action={{
                    label: 'Dismiss / بند کریں',
                    onPress: () => setSnackbarVisible(false),
                }}
                style={styles.snackbar}
            >
                {errorMessage}
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
        justifyContent: "center",
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
    input: {
        marginBottom: 12,
        backgroundColor: "rgb(255, 255, 255)",
    },
    checkboxContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 24,
    },
    checkboxText: {
        flex: 1,
        marginLeft: 8,
        color: "#e0e0e0",
        fontSize: 12,
    },
    link: {
        color: "#FFD700",
    },
    button: {
        marginBottom: 16,
        paddingVertical: 8,
    },
    signInText: {
        textAlign: "center",
        color: "#e0e0e0",
    },
    snackbar: {
        backgroundColor: "#FF3B30",
    }
})

export default SignUpScreen