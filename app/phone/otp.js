import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { OtpInput } from "react-native-otp-entry";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { colors } from "../../constants/Colors";
import roleSelection from "../signup/roleSelection";
export default function OtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [countdown, setCountdown] = useState(60);
  const [isResendEnabled, setIsResendEnabled] = useState(false);

  // Countdown timer logic
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
    setIsResendEnabled(true);
  }, [countdown]);

  const handleOtpComplete = (otp) => {
    console.log("Entered OTP:", otp);
    if (otp === "123456") {
      router.push("/signup/roleSelection");
    } else {
      Alert.alert("Incorrect OTP", "Please try again.");
    }
  };

  const handleResendOtp = () => {
    setCountdown(60); // Reset countdown timer
    setIsResendEnabled(false);
    Alert.alert("OTP Resent", "A new OTP has been sent to your phone.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("verifyPhoneNumber")}</Text>
      <Text style={styles.title}>{t("verifyPhoneNumberUrdu")}</Text>
      <Text style={styles.subtitle}>{t("enterOtpMessage")}</Text>
      <Text style={styles.subtitle}>{t("enterOtpMessageUrdu")}</Text>
      <Text style={styles.phoneNumber}>xxxx-xxxxxxxx</Text>

      <OtpInput
        numberOfDigits={6}
        onFilled={handleOtpComplete}
        focusColor={colors.primary}
        focusStickBlinkingDuration={400}
        blurOnFilled={true}
        textInputProps={{
          accessibilityLabel: "One-Time Password",
          keyboardType: "numeric",
        }}
        theme={{
          containerStyle: styles.otpContainer,
          pinCodeContainerStyle: styles.pinCodeBox,
          pinCodeTextStyle: styles.otpText,
          focusStickStyle: styles.focusStick,
          focusedPinCodeContainerStyle: styles.focusedPinCode,
        }}
      />

      <TouchableOpacity
        onPress={handleResendOtp}
        disabled={!isResendEnabled}
        style={[styles.resendButton, !isResendEnabled && styles.disabledButton]}
      >
        <Text style={styles.resendText}>Resend OTP</Text>
      </TouchableOpacity>

      <Text style={styles.countdown}>
        {countdown > 0 ? `${countdown}s` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 22,
    width: "90%",
    fontWeight: "bold",
    marginBottom: 10,
    color: "#007AFF",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.textColor,
    marginBottom: 10,
    textAlign: "center",
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 30,
    color: colors.textColor,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  pinCodeBox: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  otpText: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textColor,
  },
  focusStick: {
    backgroundColor: "#007AFF",
    height: 2,
    width: 20,
  },
  focusedPinCode: {
    borderColor: "#007AFF",
    borderWidth: 2,
  },
  resendButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  resendText: {
    color: colors.white,
    fontWeight: "bold",
  },
  countdown: {
    fontSize: 16,
    color: colors.textColor,
    marginTop: 10,
  },
});
