import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native";
const ProgressBar = ({ step, totalSteps }) => (
  <View style={styles.progressBar}>
    {Array.from({ length: totalSteps }).map((_, index) => (
      <View
        key={index}
        style={[
          styles.progressStep,
          step > index ? styles.progressStepActive : null,
        ]}
      />
    ))}
  </View>
);

export default ProgressBar;

const styles = StyleSheet.create({
  progressBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
  },
  progressStep: {
    height: 10,
    width: 30,
    marginHorizontal: 5,
    backgroundColor: "#ddd",
    borderRadius: 5,
  },
  progressStepActive: {
    backgroundColor: "#007BFF",
  },
});
