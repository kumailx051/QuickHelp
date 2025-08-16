"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity,LogBox } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useTranslation } from "react-i18next"
import { colors } from "../../constants/Colors"
import { auth } from "../../firebaseConfig" // Import auth from your Firebase config
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"

LogBox.ignoreLogs([
  "A non-serializable value was detected in the state, in the path",
])

export default function RoleSelectionScreen() {
  const [selectedRole, setSelectedRole] = useState(null)
  const [user, setUser] = useState(null)
  const { t } = useTranslation()
  const router = useRouter()
  const db = getFirestore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        checkExistingRole(currentUser.uid)
      }
    })

    return () => unsubscribe()
  }, [])

  const checkExistingRole = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId))
      if (userDoc.exists() && userDoc.data().role) {
        setSelectedRole(userDoc.data().role)
      }
    } catch (error) {
      console.error("Error checking existing role:", error)
    }
  }

  // Function to handle role selection
  const handleRoleSelection = async (role) => {
    setSelectedRole(role)
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), { role: role }, { merge: true })
        console.log("Role updated successfully")
      } catch (error) {
        console.error("Error updating role:", error)
      }
    }
    if (role === "user") {
      router.push("/signup/user")
    } else if (role === "employee") {
      router.push("/signup/user")
    }
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("roleSelectionTitle")}</Text>
      <Text style={styles.title}>{t("roleSelectionTitleUrdu")}</Text>

      {/* User Role Container */}
      <TouchableOpacity
        style={[styles.roleContainer, selectedRole === "user" && styles.selectedContainer]}
        onPress={() => handleRoleSelection("user")}
      >
        {/* Icon Container */}
        <View style={[styles.iconContainer, selectedRole === "user" && styles.selectedIconContainer]}>
          <Ionicons
            name={selectedRole === "user" ? "person" : "person-outline"}
            size={30}
            color={selectedRole === "user" ? "#ffffff" : "#000"}
          />
        </View>

        {/* Text Container */}
        <View style={styles.textContainer}>
          <Text style={styles.roleText}>{t("userRole")}</Text>
          <Text style={styles.roleText}>{t("userRoleUrdu")}</Text>
        </View>

        {selectedRole === "user" && (
          <Ionicons name="checkmark-circle" size={24} color={"#007AFF"} style={styles.checkIcon} />
        )}
      </TouchableOpacity>

      {/* Employee Role Container */}
      <TouchableOpacity
        style={[styles.roleContainer, selectedRole === "employee" && styles.selectedContainer]}
        onPress={() => handleRoleSelection("employee")}
      >
        {/* Icon Container */}
        <View style={[styles.iconContainer, selectedRole === "employee" && styles.selectedIconContainer]}>
          <Ionicons
            name={selectedRole === "employee" ? "briefcase" : "briefcase-outline"}
            size={30}
            color={selectedRole === "employee" ? "#ffffff" : "#000"}
          />
        </View>

        {/* Text Container */}
        <View style={styles.textContainer}>
          <Text style={styles.roleText}>{t("employeeRole")}</Text>
          <Text style={styles.roleText}>{t("employeeRoleUrdu")}</Text>
        </View>

        {selectedRole === "employee" && (
          <Ionicons name="checkmark-circle" size={24} color={"#007AFF"} style={styles.checkIcon} />
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
    color: colors.textColor,
  },
  roleContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 20,
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    width: "80%",
    justifyContent: "space-between",
  },
  selectedContainer: {
    borderColor: "#007AFF",
    borderWidth: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginRight: 15,
  },
  selectedIconContainer: {
    backgroundColor: "#007AFF",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  roleText: {
    fontSize: 18,
    color: colors.textColor,
  },
  checkIcon: {
    marginLeft: 10,
    tintColor: "#007AFF",
  },
})

