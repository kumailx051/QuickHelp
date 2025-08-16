"use client"

import React, { useState, useEffect, useRef } from "react"
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, SafeAreaView, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import LottieView from "lottie-react-native"
import { colors } from "../../constants/Colors"

const { width: screenWidth, height: screenHeight } = Dimensions.get("window")

const carouselItems = [
  {
    animation: require("../../assets/worker.json"),
  },
  {
    animation: require("../../assets/worker1.json"),
  },
  {
    animation: require("../../assets/worker3.json"),
  },
]

const WelcomePage = () => {
  const [activeSlide, setActiveSlide] = useState(0)
  const scrollViewRef = useRef(null)
  const router = useRouter()
  const lottieRefs = useRef(carouselItems.map(() => React.createRef()))

  useEffect(() => {
    // Play all animations when component mounts
    lottieRefs.current.forEach((ref) => {
      if (ref.current) {
        ref.current.play()
      }
    })

    const interval = setInterval(() => {
      if (scrollViewRef.current) {
        const nextSlide = (activeSlide + 1) % carouselItems.length
        scrollViewRef.current.scrollTo({ x: nextSlide * screenWidth, animated: true })
        setActiveSlide(nextSlide)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [activeSlide])

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth)
    setActiveSlide(slideIndex)
  }

  const handleCreateAccount = () => {
    router.push("/signup/createAccount")
  }

  const handleLogin = () => {
    router.push("/signup/login")
  }

  const renderCarouselItem = (item, index) => (
    <View key={index} style={styles.carouselItem}>
      <LottieView
        ref={lottieRefs.current[index]}
        source={item.animation}
        style={styles.lottieAnimation}
        autoPlay
        loop
      />
    </View>
  )

  const renderButton = (text, bgColor, textColor, onPress) => (
    <TouchableOpacity style={[styles.button, { backgroundColor: bgColor }]} onPress={onPress}>
      <Text style={[styles.buttonText, { color: textColor }]}>{text}</Text>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.carouselContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={200}
        >
          {carouselItems.map(renderCarouselItem)}
        </ScrollView>
        <View style={styles.paginationContainer}>
          {carouselItems.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === activeSlide ? styles.paginationActiveDot : styles.paginationInactiveDot,
              ]}
            />
          ))}
        </View>
      </View>
      <LinearGradient colors={["#007AFF", "#0051A3"]} style={styles.buttonContainer}>
        {renderButton("Login", "#FFFFFF", "#000000", handleLogin)}
        {renderButton("Create an account", colors.primary, "#FFFFFF", handleCreateAccount)}
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  carouselContainer: {
    flex: 4,
  },
  carouselItem: {
    width: screenWidth,
    alignItems: "center",
    justifyContent: "center",
    padding: screenWidth * 0.07,
  },
  lottieAnimation: {
    width: screenWidth * 0.85,
    height: screenHeight * 0.4,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  paginationActiveDot: {
    backgroundColor: "#4c669f",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  paginationInactiveDot: {
    backgroundColor: "#C4C4C4",
  },
  buttonContainer: {
    flex: 1.5,
    padding: screenWidth * 0.05,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    justifyContent: "space-evenly",
  },
  button: {
    width: "100%",
    height: screenHeight * 0.07,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
  },
})

export default WelcomePage
