import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { StyleSheet } from "react-native";
const GenderPickerModal = ({ visible, options, onSelect, onCancel }) => (
  <Modal transparent={true} animationType="slide" visible={visible}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Select Gender</Text>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={styles.modalOption}
            onPress={() => onSelect(option)}
          >
            <Text style={styles.modalOptionText}>{option}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.modalCancel} onPress={onCancel}>
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default GenderPickerModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalOption: {
    width: "100%",
    padding: 10,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#333",
  },
  modalCancel: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 5,
  },
  modalCancelText: {
    fontSize: 16,
    color: "#007BFF",
  },
});
