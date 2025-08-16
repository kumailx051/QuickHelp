import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { colors } from "../../constants/Colors";

const PhoneNumberScreen = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleNext = () => {
    if (phoneNumber.trim() === "") {
      alert(t("phoneNumberLabel") + " is required!");
      return;
    }
    router.push("./otp");
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.labelLeft}>{t("phoneNumberLabel")}</Text>
        <Text style={styles.labelRight}>{t("phoneNumberLabelUrdu")}</Text>
      </View>
      <TextInput
        style={styles.input}
        keyboardType="phone-pad"
        placeholder={t("0333123456789")}
        placeholderTextColor={colors.textColor}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.buttonText}>{t("nextButton")}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 16,
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    marginBottom: 10,
  },
  labelLeft: {
    fontSize: 16,
    color: colors.textColor,
    textAlign: "left",
  },
  labelRight: {
    fontSize: 16,
    color: colors.textColor,
    textAlign: "right",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 5,
    width: "90%",
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 20,
    color: colors.textColor,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 5,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default PhoneNumberScreen;
