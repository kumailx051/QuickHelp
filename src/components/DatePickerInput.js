import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { StyleSheet } from "react-native";
const DatePickerInput = ({
  label,
  labelUrdu,
  value,
  onOpenPicker,
  placeholder,
}) => (
  <View style={styles.inputContainer}>
    <View style={styles.labelContainer}>
      <Text style={styles.labelLeft}>{label}</Text>
      <Text style={styles.labelRight}>{labelUrdu}</Text>
    </View>
    <TouchableOpacity style={styles.datePicker} onPress={onOpenPicker}>
      <Text style={styles.dateText}>{value || placeholder}</Text>
    </TouchableOpacity>
  </View>
);

export default DatePickerInput;

const styles = StyleSheet.create({
  datePicker: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  dateText: {
    fontSize: 16,
    color: "#333",
  },
});
