"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  Modal,
  Keyboard,
} from "react-native"
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from "react-native-maps"
import Icon from "react-native-vector-icons/Feather"
import MaterialIcon from "react-native-vector-icons/MaterialCommunityIcons"
import { useRouter } from "expo-router"
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  arrayUnion,
  addDoc,
} from "firebase/firestore"
import { getAuth } from "firebase/auth"
import { db, auth } from "../firebaseConfig"
import * as Location from "expo-location"

const { width, height } = Dimensions.get("window")

// JobDetailsModal Component
const JobDetailsModal = ({
  visible,
  job,
  onClose,
  onApply,
  isApplied,
  // New props with default values to ensure backward compatibility
  customButtonText,
  customButtonTextUrdu,
  customButtonStyle,
  disableApply = false,
}) => {
  if (!job) return null

  // Use custom values if provided, otherwise use defaults
  const buttonText = customButtonText || (isApplied ? "Applied" : "Apply Now")
  const buttonTextUrdu = customButtonTextUrdu || (isApplied ? "درخواست دی گئی" : "اب درخواست دیں")
  const buttonStyle = customButtonStyle || (isApplied ? styles.appliedButton : styles.applyButton)

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{job.jobTitle}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Job Details */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Job Details</Text>

              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <MaterialIcon name="map-marker" size={20} color="#4A90E2" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{job.location || "Not specified"}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <MaterialIcon name="cash" size={20} color="#4A90E2" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={styles.detailValue}>Rs. {job.price || "0"}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <MaterialIcon name="clock-outline" size={20} color="#4A90E2" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  <Text style={styles.detailValue}>{job.priceType || "Not specified"}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <MaterialIcon name="calendar" size={20} color="#4A90E2" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {job.date ? new Date(job.date.seconds * 1000).toLocaleDateString() : "Flexible"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <MaterialIcon name="briefcase-outline" size={20} color="#4A90E2" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{job.category || "General"}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <MaterialIcon name="information-outline" size={20} color="#4A90E2" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, styles.statusText]}>{job.status || "Active"}</Text>
                </View>
              </View>
            </View>

            {/* Job Description */}
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Job Description</Text>
              <Text style={styles.descriptionText}>{job.jobDescription || "No description provided."}</Text>
            </View>

            {/* Contact Methods */}
            {job.contactMethods && job.contactMethods.length > 0 && (
              <View style={styles.contactSection}>
                <Text style={styles.sectionTitle}>Contact Methods</Text>
                <View style={styles.contactMethods}>
                  {job.contactMethods.includes("Phone Call") && (
                    <View style={styles.contactMethod}>
                      <MaterialIcon name="phone" size={20} color="#4A90E2" />
                      <Text style={styles.contactMethodText}>Phone Call</Text>
                    </View>
                  )}
                  {job.contactMethods.includes("WhatsApp") && (
                    <View style={styles.contactMethod}>
                      <MaterialIcon name="whatsapp" size={20} color="#4A90E2" />
                      <Text style={styles.contactMethodText}>WhatsApp</Text>
                    </View>
                  )}
                  {job.contactMethods.includes("In-App Chat") && (
                    <View style={styles.contactMethod}>
                      <MaterialIcon name="chat" size={20} color="#4A90E2" />
                      <Text style={styles.contactMethodText}>In-App Chat</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.applyButton, buttonStyle]} onPress={onApply} disabled={disableApply}>
              <Text style={styles.applyButtonText}>{buttonText}</Text>
              <Text style={styles.applyButtonTextUrdu}>{buttonTextUrdu}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const DEFAULT_REGION = {
  latitude: 30.3753,
  longitude: 69.3451,
  latitudeDelta: 15,
  longitudeDelta: 15,
}

// Cache for geocoding results
const geocodeCache = new Map()

const roles = [
  { id: "domestic", title: "Domestic Worker", icon: "home", color: "#4A90E2" },
  { id: "beautician", title: "Beautician", icon: "scissors", color: "#E667B0" },
  { id: "tailor", title: "Tailor", icon: "edit-2", color: "#50C878" },
  { id: "driver", title: "Driver", icon: "truck", color: "#FF8C00" },
]

const OrderCard = ({ order, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={() => onPress(order)}>
    <View style={styles.cardRow}>
      <View style={styles.locationContainer}>
        <Icon name="map-pin" size={16} color="#2563eb" />
        <View style={styles.locationText}>
          <Text style={styles.locationTitle}>{order.location}</Text>
          <Text style={styles.locationSubtitle}>{order.jobTitle}</Text>
        </View>
      </View>
      <View style={styles.paymentBadge}>
        <Text style={styles.paymentText}>
          Payment <Text style={styles.paymentAmount}>Rs {order.price}</Text>
        </Text>
      </View>
    </View>

    <View style={styles.cardRow}>
      <View style={styles.locationContainer}>
        <Icon name="info" size={16} color="#4b5563" />
        <View style={styles.locationText}>
          <Text style={styles.locationTitle} numberOfLines={2}>
            {order.jobDescription}
          </Text>
        </View>
      </View>
      <Text style={styles.statusText}>{order.status}</Text>
    </View>
  </TouchableOpacity>
)

const App = () => {
  const router = useRouter()
  const [location, setLocation] = useState("")
  const [activeOrders, setActiveOrders] = useState([])
  const [completedOrders, setCompletedOrders] = useState([])
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION)
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const mapRef = useRef(null)
  const searchTimeout = useRef(null)
  const authInstance = getAuth()
  const [orderLocations, setOrderLocations] = useState([])
  const [currentLocation, setCurrentLocation] = useState(null)
  const [searchLocation, setSearchLocation] = useState(null)
  const [isSearchBarFocused, setIsSearchBarFocused] = useState(false)

  // Animation values
  const searchAnimationValue = useRef(new Animated.Value(0)).current
  const [circleRadius, setCircleRadius] = useState(3000) // Increased initial radius
  const [circleOpacity, setCircleOpacity] = useState(0.5)
  const pulseAnimation = useRef(null)

  // New state for Available Jobs section
  const [availableJobs, setAvailableJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [bookmarkedJobs, setBookmarkedJobs] = useState([])
  const [appliedJobs, setAppliedJobs] = useState([])
  const [selectedRoles, setSelectedRoles] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)
  const [showJobDetails, setShowJobDetails] = useState(false)
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0)

  // New state for nearby jobs
  const [showNearbyJobs, setShowNearbyJobs] = useState(false)
  const [nearbyJobs, setNearbyJobs] = useState([])
  const [nearbyRadius, setNearbyRadius] = useState(5000) // 5km radius

  // Animation values for search bar
  const searchBarAnimation = useRef(new Animated.Value(0)).current
  const searchBarWidth = searchBarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [width - 120, width * 0.7], // Adjusted to make room for nearby button
  })

  const fetchUserDetailsRef = useRef(async (userId) => {
    try {
      const userDoc = doc(db, "users", userId)
      const userSnap = await getDoc(userDoc)
      if (userSnap.exists()) {
        return {
          fullName: userSnap.data().fullName,
          profileImage: userSnap.data().profileImage,
        }
      }
      return null
    } catch (error) {
      console.error("Error fetching user details:", error)
      return null
    }
  })

  // Calculate distance between two coordinates in kilometers
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radius of the earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c // Distance in km
    return distance
  }

  // Get current location on component mount
  useEffect(() => {
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          Alert.alert("Permission denied", "Location permission is required for this feature")
          return
        }

        setIsLoading(true)
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })

        const { latitude, longitude } = location.coords
        setCurrentLocation({ latitude, longitude })

        // Set initial map region to current location
        const initialRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
        setMapRegion(initialRegion)

        // Get address from coordinates for display
        const addresses = await Location.reverseGeocodeAsync({ latitude, longitude })
        if (addresses && addresses.length > 0) {
          const address = addresses[0]
          const locationString = address.city || address.region || address.country
          setLocation(locationString)

          // Initial fetch of jobs based on current location
          fetchAllJobs()
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error getting current location:", error)
        setIsLoading(false)
      }
    })()

    // Add keyboard listeners to adjust UI when keyboard appears
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", () => {
      setIsSearchBarFocused(true)
      Animated.timing(searchBarAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start()
    })

    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => {
      setIsSearchBarFocused(false)
      Animated.timing(searchBarAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start()
    })

    return () => {
      keyboardDidShowListener.remove()
      keyboardDidHideListener.remove()
    }
  }, [])

  // Update circle radius and opacity based on animation value
  useEffect(() => {
    const animationListener = searchAnimationValue.addListener(({ value }) => {
      // Convert animated value to actual numbers for the Circle component
      setCircleRadius(3000 + value * 4000) // Increased radius range
      setCircleOpacity(0.5 - value * 0.5)
    })

    return () => {
      searchAnimationValue.removeListener(animationListener)
    }
  }, [searchAnimationValue])

  // Start pulse animation
  const startPulseAnimation = () => {
    searchAnimationValue.setValue(0)
    pulseAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(searchAnimationValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(searchAnimationValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    )
    pulseAnimation.current.start()
  }

  // Stop pulse animation
  const stopPulseAnimation = () => {
    if (pulseAnimation.current) {
      pulseAnimation.current.stop()
      pulseAnimation.current = null
    }
  }

  const geocodeLocation = async (locationString) => {
    if (geocodeCache.has(locationString)) {
      return geocodeCache.get(locationString)
    }

    try {
      const result = await Location.geocodeAsync(locationString)
      if (result.length > 0) {
        geocodeCache.set(locationString, result[0])
        return result[0]
      }
    } catch (error) {
      console.error("Geocoding error:", error)
    }
    return null
  }

  // Fetch all jobs regardless of location - modified to show all jobs on map
  const fetchAllJobs = async () => {
    try {
      setIsLoading(true)

      // Query orders collection for all active jobs
      const ordersRef = collection(db, "orders")
      const q = query(ordersRef, where("status", "==", "active"))

      const snapshot = await getDocs(q)
      const allJobs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      // Process jobs with user details and coordinates
      const jobsPromises = allJobs.map(async (job) => {
        const userDetails = await fetchUserDetailsRef.current(job.userId)

        // Get coordinates for job location
        let coordinates = null
        if (job.location) {
          const geocoded = await geocodeLocation(job.location)
          if (geocoded) {
            coordinates = {
              latitude: geocoded.latitude,
              longitude: geocoded.longitude,
            }
          }
        }

        return {
          ...job,
          userDetails,
          isBookmarked: bookmarkedJobs.includes(job.id),
          coordinates,
        }
      })

      const processedJobs = await Promise.all(jobsPromises)

      // Filter by selected roles if needed
      let filteredByRole = processedJobs
      if (selectedRoles.length > 0) {
        filteredByRole = processedJobs.filter((job) => {
          return selectedRoles.some(
            (roleId) => job.category && job.category.toLowerCase().trim() === roleId.toLowerCase().trim(),
          )
        })
      }

      // Set all available jobs
      setAvailableJobs(filteredByRole)

      // Initially show all jobs
      setFilteredJobs(filteredByRole)

      // Update map markers for ALL jobs (not just filtered ones)
      const jobLocations = processedJobs
        .filter((job) => job.coordinates)
        .map((job) => ({
          id: job.id,
          coordinates: job.coordinates,
          jobTitle: job.jobTitle,
          location: job.location,
        }))

      setOrderLocations(jobLocations)

      // If we have current location, calculate nearby jobs
      if (currentLocation) {
        const nearby = processedJobs.filter((job) => {
          if (!job.coordinates) return false

          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            job.coordinates.latitude,
            job.coordinates.longitude,
          )

          // Jobs within 5km radius
          return distance <= 5
        })

        setNearbyJobs(nearby)
      }

      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching jobs:", error)
      setIsLoading(false)
    }
  }

  // Fetch jobs by location - modified to include jobs within the search radius
  const fetchJobsByLocation = async (searchText) => {
    if (!searchText) return

    try {
      setIsLoading(true)

      // If we already have all jobs loaded, just filter them
      if (availableJobs.length > 0) {
        // Get coordinates for search location
        const geocoded = await geocodeLocation(searchText)
        if (geocoded) {
          const searchCoordinates = {
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
          }
          setSearchLocation(searchCoordinates)

          // Update map region to focus on search location
          const newRegion = {
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }

          setMapRegion(newRegion)
          mapRef.current?.animateToRegion(newRegion, 1000)

          // Filter jobs by location (case insensitive partial match)
          // OR by proximity to the search location (within the circle radius)
          const locationJobs = availableJobs.filter((job) => {
            // Check if location name matches
            const locationMatch = job.location && job.location.toLowerCase().includes(searchText.toLowerCase())

            // Check if job is within search radius
            let withinRadius = false
            if (job.coordinates) {
              const distance = calculateDistance(
                searchCoordinates.latitude,
                searchCoordinates.longitude,
                job.coordinates.latitude,
                job.coordinates.longitude,
              )
              // Convert circleRadius from meters to kilometers
              withinRadius = distance <= circleRadius / 1000
            }

            // Return true if either condition is met
            return locationMatch || withinRadius
          })

          // Filter by selected roles if needed
          let filteredByRole = locationJobs
          if (selectedRoles.length > 0) {
            filteredByRole = locationJobs.filter((job) => {
              return selectedRoles.some(
                (roleId) => job.category && job.category.toLowerCase().trim() === roleId.toLowerCase().trim(),
              )
            })
          }

          // Update filtered jobs - ONLY affects Available Jobs section
          setFilteredJobs(filteredByRole)
        }
      } else {
        // If we don't have jobs loaded yet, fetch them all
        await fetchAllJobs()
      }

      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching jobs by location:", error)
      setIsLoading(false)
    }
  }

  // Toggle nearby jobs view
  const toggleNearbyJobs = () => {
    setShowNearbyJobs(!showNearbyJobs)

    if (!showNearbyJobs) {
      // When enabling nearby jobs
      if (currentLocation) {
        // Focus map on current location with appropriate zoom
        const nearbyRegion = {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.05, // Closer zoom for nearby view
          longitudeDelta: 0.05,
        }

        setMapRegion(nearbyRegion)
        mapRef.current?.animateToRegion(nearbyRegion, 1000)

        // Show circle for nearby radius
        setCircleRadius(nearbyRadius)
        setCircleOpacity(0.2)
        setSearchLocation(currentLocation)

        // Filter jobs to show only nearby ones
        setFilteredJobs(nearbyJobs)
      }
    } else {
      // When disabling nearby jobs, show all jobs again
      setFilteredJobs(availableJobs)
      setSearchLocation(null)
    }
  }

  // Fetch active orders (status: "In Progress")
  useEffect(() => {
    if (!auth.currentUser) return

    const ordersRef = collection(db, "orders")
    const q = query(
      ordersRef,
      where("applicants", "array-contains", auth.currentUser.uid),
      where("status", "in", ["In Progress", "in progress"]),
    )

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Don't filter active orders by location
      setActiveOrders(orders)
    })

    return () => unsubscribe()
  }, [])

  // Fetch completed orders (status: "completed")
  useEffect(() => {
    if (!auth.currentUser) return

    const ordersRef = collection(db, "orders")
    const q = query(
      ordersRef,
      where("applicants", "array-contains", auth.currentUser.uid),
      where("status", "in", ["completed", "Completed"]),
    )

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Don't filter completed orders by location
      setCompletedOrders(orders)
    })

    return () => unsubscribe()
  }, [])

  const handleLocationSearch = async (searchText) => {
    setLocation(searchText)
    setIsLoading(true)

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    // Debounce search
    searchTimeout.current = setTimeout(async () => {
      if (!searchText.trim()) {
        // If search is cleared, return to current location
        if (currentLocation) {
          const currentRegion = {
            ...currentLocation,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }
          setMapRegion(currentRegion)
          mapRef.current?.animateToRegion(currentRegion, 1000)
        } else {
          setMapRegion(DEFAULT_REGION)
          mapRef.current?.animateToRegion(DEFAULT_REGION, 1000)
        }
        setSearchLocation(null)
        stopPulseAnimation()
        setIsSearching(false)
        setIsLoading(false)

        // Reset filtered jobs to show all available jobs
        setFilteredJobs(availableJobs)
        return
      }

      try {
        // Start search animation
        setIsSearching(true)

        // Fetch jobs by location - only filters Available Jobs section
        await fetchJobsByLocation(searchText)

        // Start pulse animation
        startPulseAnimation()
      } catch (error) {
        console.error("Search error:", error)
      }

      setIsLoading(false)

      // After 5 seconds, stop the pulse animation
      setTimeout(() => {
        stopPulseAnimation()
        setIsSearching(false)
      }, 5000)
    }, 500) // Debounce delay
  }

  // New functions for Available Jobs section
  const fetchAvailableJobs = useCallback(async () => {
    try {
      // Only fetch jobs with status "active" (lowercase only, based on your Firestore data)
      const jobsQuery = query(collection(db, "orders"), where("status", "==", "active"))

      const unsubscribe = onSnapshot(jobsQuery, async (snapshot) => {
        const jobsPromises = snapshot.docs.map(async (doc) => {
          const jobData = { id: doc.id, ...doc.data() }
          const userDetails = await fetchUserDetailsRef.current(jobData.userId)

          // Get coordinates for job location
          let coordinates = null
          if (jobData.location) {
            const geocoded = await geocodeLocation(jobData.location)
            if (geocoded) {
              coordinates = {
                latitude: geocoded.latitude,
                longitude: geocoded.longitude,
              }
            }
          }

          return {
            ...jobData,
            userDetails,
            isBookmarked: bookmarkedJobs.includes(doc.id),
            coordinates,
          }
        })

        let jobs = await Promise.all(jobsPromises)

        // Filter jobs according to selectedRoles
        if (selectedRoles.length > 0) {
          jobs = jobs.filter((job) => {
            return selectedRoles.some(
              (roleId) => job.category && job.category.toLowerCase().trim() === roleId.toLowerCase().trim(),
            )
          })
        }

        // Sort jobs by most recent first
        const sortedJobs = jobs.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return (b.createdAt?.seconds || 0) < (a.createdAt?.seconds || 0) ? 1 : -1
          }
          return 0
        })

        setAvailableJobs(sortedJobs)

        // If no location filter is active, show all jobs
        if (!location.trim() && !showNearbyJobs) {
          setFilteredJobs(sortedJobs)
        } else if (searchLocation) {
          // If we have a search location, filter by proximity
          const locationJobs = sortedJobs.filter((job) => {
            // Check if location name matches
            const locationMatch = job.location && job.location.toLowerCase().includes(location.toLowerCase())

            // Check if job is within search radius
            let withinRadius = false
            if (job.coordinates && searchLocation) {
              const distance = calculateDistance(
                searchLocation.latitude,
                searchLocation.longitude,
                job.coordinates.latitude,
                job.coordinates.longitude,
              )
              // Convert circleRadius from meters to kilometers
              withinRadius = distance <= circleRadius / 1000
            }

            // Return true if either condition is met
            return locationMatch || withinRadius
          })

          setFilteredJobs(locationJobs)
        }

        // Update map markers for ALL jobs
        const jobLocations = jobs
          .filter((job) => job.coordinates)
          .map((job) => ({
            id: job.id,
            coordinates: job.coordinates,
            jobTitle: job.jobTitle,
            location: job.location,
          }))

        setOrderLocations(jobLocations)

        // If we have current location, calculate nearby jobs
        if (currentLocation) {
          const nearby = jobs.filter((job) => {
            if (!job.coordinates) return false

            const distance = calculateDistance(
              currentLocation.latitude,
              currentLocation.longitude,
              job.coordinates.latitude,
              job.coordinates.longitude,
            )

            // Jobs within 5km radius
            return distance <= 5
          })

          setNearbyJobs(nearby)

          // If nearby jobs view is active, update filtered jobs
          if (showNearbyJobs) {
            setFilteredJobs(nearby)
          }
        }
      })

      return unsubscribe
    } catch (error) {
      console.error("Error fetching jobs:", error)
      return () => {}
    }
  }, [bookmarkedJobs, selectedRoles, location, currentLocation, searchLocation, circleRadius, showNearbyJobs])

  const fetchUserRoles = useCallback(async (userId) => {
    try {
      const userDoc = doc(db, "users", userId)
      const unsubscribe = onSnapshot(userDoc, (doc) => {
        if (doc.exists()) {
          setSelectedRoles(doc.data().jobRoles || [])
        }
      })

      return unsubscribe
    } catch (error) {
      console.error("Error fetching user roles:", error)
      return () => {}
    }
  }, [])

  const fetchBookmarkedJobs = useCallback(async (userId) => {
    try {
      const userDoc = doc(db, "users", userId)
      const unsubscribe = onSnapshot(userDoc, (doc) => {
        if (doc.exists()) {
          setBookmarkedJobs(doc.data().bookmarkedJobs || [])
        }
      })

      return unsubscribe
    } catch (error) {
      console.error("Error fetching bookmarked jobs:", error)
      return () => {}
    }
  }, [])

  const fetchAppliedJobs = useCallback(async (userId) => {
    try {
      const userDoc = doc(db, "users", userId)
      const unsubscribe = onSnapshot(userDoc, (doc) => {
        if (doc.exists()) {
          setAppliedJobs(doc.data().appliedJobs || [])
        }
      })

      return unsubscribe
    } catch (error) {
      console.error("Error fetching applied jobs:", error)
      return () => {}
    }
  }, [])

  const toggleBookmark = async (jobId) => {
    if (!currentUser) return

    try {
      const updatedBookmarks = bookmarkedJobs.includes(jobId)
        ? bookmarkedJobs.filter((id) => id !== jobId)
        : [...bookmarkedJobs, jobId]

      setBookmarkedJobs(updatedBookmarks)

      const userDoc = doc(db, "users", currentUser.uid)
      await updateDoc(userDoc, { bookmarkedJobs: updatedBookmarks })
    } catch (error) {
      console.error("Error updating bookmarks:", error)
    }
  }

  const handleApplyJob = async (jobId) => {
    if (!currentUser) return

    try {
      const updatedAppliedJobs = [...appliedJobs, jobId]
      setAppliedJobs(updatedAppliedJobs)

      const userDoc = doc(db, "users", currentUser.uid)
      await updateDoc(userDoc, { appliedJobs: updatedAppliedJobs })

      const jobDoc = doc(db, "orders", jobId)
      await updateDoc(jobDoc, {
        applicants: arrayUnion(currentUser.uid),
      })

      setShowJobDetails(false)
    } catch (error) {
      console.error("Error applying to job:", error)
    }
  }

  const handleMessagePress = async (job) => {
    if (!currentUser) {
      Alert.alert("Error", "Please log in to send a message")
      return
    }

    try {
      const userIds = [currentUser.uid, job.userId].sort()
      const chatId = userIds.join("_")

      const chatsRef = collection(db, "chats")
      const q = query(chatsRef, where("chatId", "==", chatId))
      const chatSnapshot = await getDocs(q)

      if (chatSnapshot.empty) {
        await addDoc(chatsRef, {
          chatId,
          participants: userIds,
          createdAt: new Date(),
          lastMessage: null,
          lastMessageTime: null,
        })
      }

      router.push({
        pathname: "/chatScreen",
        params: {
          workerId: job.userId,
          workerName: job.userDetails?.fullName || "Unknown User",
          chatId,
        },
      })
    } catch (error) {
      console.error("Error creating chat:", error)
      Alert.alert("Error", "Failed to start chat. Please try again.")
    }
  }

  // Handle order click to show details
  const handleOrderPress = (order) => {
    setSelectedJob(order)
    setShowJobDetails(true)
  }

  // Get role color based on category
  const getRoleColor = (category) => {
    const role = roles.find((r) => r.id.toLowerCase() === (category || "").toLowerCase())
    return role ? role.color : "#4A90E2"
  }

  // Get role icon based on category
  const getRoleIcon = (category) => {
    const role = roles.find((r) => r.id.toLowerCase() === (category || "").toLowerCase())
    return role ? role.icon : "briefcase"
  }

  // Helper function to format time ago
  const getTimeAgo = (timestamp) => {
    const now = Date.now()
    const seconds = Math.floor((now - timestamp) / 1000)

    if (seconds < 60) return `${seconds}s ago`

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`

    const weeks = Math.floor(days / 7)
    if (weeks < 4) return `${weeks}w ago`

    const months = Math.floor(days / 30)
    return `${months}mo ago`
  }

  // Job Card using the style from role-selection
  const renderJobCard = (job) => (
    <View key={job.id} style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={styles.jobTitleContainer}>
          <Text style={styles.jobTitle}>{job.jobTitle}</Text>
          <View style={styles.clientInfo}>
            <Image
              source={
                job.userDetails?.profileImage
                  ? { uri: job.userDetails.profileImage }
                  : require("../assets/placeholder.png")
              }
              style={styles.clientAvatar}
              defaultSource={require("../assets/placeholder.png")}
            />
            <Text style={styles.clientName}>{job.userDetails?.fullName || "Unknown User"}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.bookmarkButton} onPress={() => toggleBookmark(job.id)}>
          <MaterialIcon name={job.isBookmarked ? "bookmark" : "bookmark-outline"} size={24} color="#4A90E2" />
        </TouchableOpacity>
      </View>
      <View style={styles.jobDetails}>
        <View style={styles.detailRow}>
          <MaterialIcon name="map-marker" size={16} color="#666" />
          <Text style={styles.detailText}>{job.location?.split(",")[0].trim() || "Location not specified"}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcon name="cash" size={16} color="#666" />
          <Text style={styles.detailText}>Rs. {job.price}</Text>
        </View>
      </View>
      <Text style={styles.jobDescription}>{job.jobDescription}</Text>
      <View style={styles.jobActions}>
        <TouchableOpacity
          style={[styles.applyButton, appliedJobs.includes(job.id) && styles.appliedButton]}
          onPress={() => {
            setSelectedJob(job)
            setShowJobDetails(true)
          }}
        >
          <Text style={styles.applyButtonText}>{appliedJobs.includes(job.id) ? "Applied" : "Apply Now"}</Text>
          <Text style={styles.applyButtonTextUrdu}>
            {appliedJobs.includes(job.id) ? "درخواست دی گئی" : "اب درخواست دیں"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.messageButton} onPress={() => handleMessagePress(job)}>
          <MaterialIcon name="message-text-outline" size={24} color="#4A90E2" />
        </TouchableOpacity>
      </View>
    </View>
  )

  // Fetch user data and jobs
  useEffect(() => {
    let unsubscribeRoles = null
    let unsubscribeBookmarks = null
    let unsubscribeApplied = null
    let unsubscribeJobs = null

    const fetchUserData = async () => {
      if (auth.currentUser) {
        const userDetails = await fetchUserDetailsRef.current(auth.currentUser.uid)
        setCurrentUser({ ...auth.currentUser, ...userDetails })

        // Store the unsubscribe functions directly
        unsubscribeRoles = await fetchUserRoles(auth.currentUser.uid)
        unsubscribeBookmarks = await fetchBookmarkedJobs(auth.currentUser.uid)
        unsubscribeApplied = await fetchAppliedJobs(auth.currentUser.uid)
        unsubscribeJobs = await fetchAvailableJobs()
      }
    }

    fetchUserData()

    // Return the cleanup function directly
    return () => {
      if (unsubscribeRoles) unsubscribeRoles()
      if (unsubscribeBookmarks) unsubscribeBookmarks()
      if (unsubscribeApplied) unsubscribeApplied()
      if (unsubscribeJobs) unsubscribeJobs()
      stopPulseAnimation()
    }
  }, [fetchUserRoles, fetchBookmarkedJobs, fetchAppliedJobs, fetchAvailableJobs])

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={mapRegion}
          provider={PROVIDER_GOOGLE}
          showsUserLocation={true}
          showsMyLocationButton={false} // Hide default button, we'll add our own
          minZoomLevel={5} // Prevent excessive zoom
          maxZoomLevel={15} // Limit maximum zoom
        >
          {/* Current location marker */}
          {currentLocation && (
            <Marker coordinate={currentLocation} title="Your Location" pinColor="#4A90E2">
              <View style={styles.currentLocationMarker}>
                <Icon name="user" size={16} color="#fff" />
              </View>
            </Marker>
          )}

          {/* Job location markers - now using red color */}
          {orderLocations.map((order, index) => (
            <Marker
              key={`marker-${order.id}-${index}`}
              coordinate={order.coordinates}
              title={order.jobTitle}
              description={order.location}
              pinColor="red" // Changed to red
            />
          ))}

          {/* Search or nearby circle */}
          {(isSearching || showNearbyJobs) && searchLocation && (
            <Circle
              center={searchLocation}
              radius={circleRadius}
              fillColor={`rgba(74, 144, 226, ${circleOpacity})`}
              strokeColor="rgba(74, 144, 226, 0.3)"
              strokeWidth={2}
            />
          )}
        </MapView>

        {/* Modern Floating Search Bar with Nearby Jobs Button */}
        <View style={styles.searchBarContainer}>
          <Animated.View style={[styles.searchBar, { width: searchBarWidth }]}>
            <View style={styles.searchInputContainer}>
              <Icon name="map-pin" size={20} color="#2563eb" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by location"
                value={location}
                onChangeText={handleLocationSearch}
                placeholderTextColor="#9ca3af"
                onFocus={() => setIsSearchBarFocused(true)}
                onBlur={() => {
                  setIsSearchBarFocused(false)
                  Animated.timing(searchBarAnimation, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: false,
                  }).start()
                }}
              />
              {isLoading && <ActivityIndicator size="small" color="#2563eb" />}
            </View>
          </Animated.View>

          {/* Nearby Jobs Button - Always visible */}
          <TouchableOpacity
            style={[styles.nearbyButton, showNearbyJobs && styles.nearbyButtonActive]}
            onPress={toggleNearbyJobs}
          >
            <Icon name="compass" size={20} color={showNearbyJobs ? "#fff" : "#2563eb"} />
            <Text style={[styles.nearbyButtonText, showNearbyJobs && styles.nearbyButtonTextActive]}>Nearby</Text>
          </TouchableOpacity>
        </View>

        {/* Map Control Buttons */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={styles.mapControlButton}
            onPress={() => {
              if (currentLocation) {
                const currentRegion = {
                  ...currentLocation,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }
                setMapRegion(currentRegion)
                mapRef.current?.animateToRegion(currentRegion, 1000)
              }
            }}
          >
            <Icon name="navigation" size={20} color="#2563eb" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mapControlButton}
            onPress={() => {
              // Zoom in
              const newRegion = {
                ...mapRegion,
                latitudeDelta: mapRegion.latitudeDelta / 2,
                longitudeDelta: mapRegion.longitudeDelta / 2,
              }
              setMapRegion(newRegion)
              mapRef.current?.animateToRegion(newRegion, 300)
            }}
          >
            <Icon name="plus" size={20} color="#2563eb" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mapControlButton}
            onPress={() => {
              // Zoom out
              const newRegion = {
                ...mapRegion,
                latitudeDelta: mapRegion.latitudeDelta * 2,
                longitudeDelta: mapRegion.longitudeDelta * 2,
              }
              setMapRegion(newRegion)
              mapRef.current?.animateToRegion(newRegion, 300)
            }}
          >
            <Icon name="minus" size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Job Count Indicator */}
        <View style={styles.jobCountContainer}>
          <View style={styles.jobCountBadge}>
            <MaterialIcon name="map-marker" size={16} color="#fff" />
            <Text style={styles.jobCountText}>{orderLocations.length}</Text>
          </View>
          <Text style={styles.jobCountLabel}>Jobs on Map</Text>
        </View>
      </View>

      {/* Orders Section */}
      <ScrollView style={styles.ordersContainer}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Order History</Text>
            <Text style={[styles.headerTitle, { fontSize: 14, color: "#6b7280" }]}>آرڈر کی تاریخ</Text>
          </View>
          <View style={styles.notificationContainer}>
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>{activeOrders.length + completedOrders.length}</Text>
            </View>
            <Icon name="navigation" size={24} color="#4b5563" />
          </View>
        </View>
        <View>
          <Text style={styles.headerSubtitle}>Showing your active and completed orders</Text>
          <Text style={[styles.headerSubtitle, { fontSize: 12, color: "#6b7280" }]}>
            آپ کے فعال اور مکمل کردہ آرڈرز دکھائے جا رہے ہیں
          </Text>
        </View>

        {/* Completed Orders */}
        <View style={styles.section}>
          {completedOrders.length > 0 ? (
            completedOrders.map((order) => <OrderCard key={order.id} order={order} onPress={handleOrderPress} />)
          ) : (
            <Text style={styles.noOrdersText}>No completed orders found</Text>
          )}
        </View>

        {/* Active Orders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active orders</Text>
          {activeOrders.length > 0 ? (
            activeOrders.map((order) => <OrderCard key={order.id} order={order} onPress={handleOrderPress} />)
          ) : (
            <Text style={styles.noOrdersText}>No active orders found</Text>
          )}
        </View>

        {/* Available Jobs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Jobs</Text>
          <Text style={styles.sectionTitleUrdu}>دستیاب نوکریاں</Text>

          {/* Show appropriate filter text */}
          {showNearbyJobs ? (
            <Text style={styles.locationFilterText}>Showing jobs near your current location</Text>
          ) : location ? (
            <Text style={styles.locationFilterText}>Showing jobs in {location}</Text>
          ) : null}

          {selectedRoles.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Icon name="briefcase" size={48} color="#E0E0E0" />
              <Text style={styles.noJobsText}>Please select your role(s) in the Home screen to view jobs</Text>
            </View>
          ) : filteredJobs.length > 0 ? (
            filteredJobs.map(renderJobCard)
          ) : (
            <View style={styles.emptyStateContainer}>
              <Icon name="search" size={48} color="#E0E0E0" />
              <Text style={styles.noJobsText}>
                {showNearbyJobs
                  ? "No jobs available in your area"
                  : location
                    ? `No jobs available in "${location}"`
                    : "No jobs available for your selected role(s)"}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/home")}>
          <Icon name="home" size={24} color="#666" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <Icon name="shopping-bag" size={24} color="#4A90E2" />
          <Text style={[styles.navText, styles.navTextActive]}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/profile")}>
          <Icon name="user" size={24} color="#666" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Job Details Modal */}
      <JobDetailsModal
        visible={showJobDetails}
        job={selectedJob}
        onClose={() => setShowJobDetails(false)}
        onApply={() => selectedJob && handleApplyJob(selectedJob.id)}
        isApplied={selectedJob ? appliedJobs.includes(selectedJob.id) : false}
        customButtonText={
          selectedJob?.status?.toLowerCase() === "active"
            ? appliedJobs.includes(selectedJob?.id || "")
              ? "Applied"
              : "Apply Now"
            : selectedJob?.status?.toLowerCase() === "in progress"
              ? "In Progress"
              : selectedJob?.status?.toLowerCase() === "completed"
                ? "Completed"
                : "Apply Now"
        }
        customButtonTextUrdu={
          selectedJob?.status?.toLowerCase() === "active"
            ? appliedJobs.includes(selectedJob?.id || "")
              ? "درخواست دی گئی"
              : "اب درخواست دیں"
            : selectedJob?.status?.toLowerCase() === "in progress"
              ? "کام جاری ہے"
              : selectedJob?.status?.toLowerCase() === "completed"
                ? "مکمل ہو گیا"
                : "اب درخواست دیں"
        }
        customButtonStyle={
          selectedJob?.status?.toLowerCase() === "active"
            ? appliedJobs.includes(selectedJob?.id || "")
              ? styles.appliedButton
              : styles.applyButton
            : selectedJob?.status?.toLowerCase() === "in progress"
              ? styles.inProgressButton
              : selectedJob?.status?.toLowerCase() === "completed"
                ? styles.completedButton
                : styles.applyButton
        }
        disableApply={
          selectedJob?.status?.toLowerCase() !== "active" || (selectedJob && appliedJobs.includes(selectedJob.id))
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapContainer: {
    height: "50%",
    position: "relative",
  },
  map: {
    flex: 1,
  },
  // Modern floating search bar
  searchBarContainer: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  searchBar: {
    backgroundColor: "white",
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
    marginLeft: 8,
  },
  // Redesigned nearby button
  nearbyButton: {
    backgroundColor: "white",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  nearbyButtonActive: {
    backgroundColor: "#2563eb",
  },
  nearbyButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2563eb",
    marginLeft: 4,
  },
  nearbyButtonTextActive: {
    color: "#fff",
  },
  // Map controls
  mapControls: {
    position: "absolute",
    right: 16,
    top: 80,
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  mapControlButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  // Job count indicator
  jobCountContainer: {
    position: "absolute",
    left: 16,
    bottom: 16,
    backgroundColor: "white",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  jobCountBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginRight: 8,
  },
  jobCountText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 2,
  },
  jobCountLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4b5563",
  },
  ordersContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  locationFilterText: {
    fontSize: 14,
    color: "#4A90E2",
    fontWeight: "500",
    marginBottom: 12,
    fontStyle: "italic",
  },
  notificationContainer: {
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ef4444",
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  notificationText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  sectionTitleUrdu: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  locationText: {
    gap: 2,
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  locationSubtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  paymentBadge: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paymentText: {
    color: "#15803d",
    fontSize: 12,
  },
  paymentAmount: {
    fontWeight: "500",
  },
  statusText: {
    color: "#4A90E2",
    fontSize: 12,
    fontWeight: "500",
  },
  noOrdersText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 14,
    marginTop: 20,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    height: 60,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  navItemActive: {
    marginTop: -10,
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
  // Current location marker
  currentLocationMarker: {
    backgroundColor: "#4A90E2",
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: "#fff",
  },
  // Job Card Styles
  jobCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  jobTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  clientInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  clientAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: "#f0f0f0",
  },
  clientName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  bookmarkButton: {
    padding: 4,
  },
  jobDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
    marginRight: 8,
  },
  jobDescription: {
    fontSize: 14,
    color: "#333",
    marginBottom: 12,
  },
  jobActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  applyButton: {
    backgroundColor: "#4A90E2",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  appliedButton: {
    backgroundColor: "#50C878",
  },
  inProgressButton: {
    backgroundColor: "#FF8C00", // Orange color for in progress
  },
  completedButton: {
    backgroundColor: "#6B7280", // Gray color for completed
  },
  applyButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginRight: 4,
  },
  applyButtonTextUrdu: {
    color: "#fff",
    fontSize: 12,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  noJobsText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 16,
    lineHeight: 22,
  },
  messageButton: {
    padding: 8,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "90%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  clientSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  clientImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    backgroundColor: "#f0f0f0",
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: "#999",
    marginLeft: 4,
  },
  detailsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  statusText: {
    color: "#4A90E2",
  },
  descriptionSection: {
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
  },
  contactSection: {
    marginBottom: 20,
  },
  contactMethods: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  contactMethod: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  contactMethodText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 6,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
})

export default App
