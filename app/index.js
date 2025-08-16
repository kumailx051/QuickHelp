import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native"
import { useRouter } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import { colors } from "../constants/Colors";


const SplashScreen = () => {
  const router = useRouter()

  const handleGetStarted = () => {
    router.push("/clientHomeScreen")
  }

  return (
    <LinearGradient colors={["#007AFF", "#0051A3"]} style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require("../assets/images/logof.jpg")} style={styles.image} />
        <Text style={styles.appName}>QuickHelp</Text>
        <Text style={styles.tagline}>کوئیک ہیلپ - ہر ہنر کے لیے ایک موقع!</Text>
      </View>

      <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 20,
    marginBottom: 10,
  },
  appName: {
    fontSize: 42,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 5,
  },
  tagline: {
    fontSize: 18,
    color: "#f0f0f0",
    fontWeight: "500",
    textAlign: "center",
    marginHorizontal: 20,
  },
  getStartedButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "bold",
  },
})

export default SplashScreen

