import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { Button } from "react-native-elements";

const { width } = Dimensions.get("window");

const UploadSection = ({ title, imageUri, onSelectFile, onTakePhoto }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity style={styles.uploadArea} onPress={onSelectFile}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <Text style={styles.placeholderText}>Select file</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.orText}>or</Text>
      <Button
        title="Open Camera & Take Photo"
        buttonStyle={styles.cameraButton}
        onPress={onTakePhoto}
      />
    </View>
  );
};

export default UploadSection;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  uploadArea: {
    width: width * 0.8,
    height: 200,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
  },
  placeholderText: {
    fontSize: 14,
    color: "#888",
  },
  orText: {
    fontSize: 14,
    color: "#888",
    marginVertical: 10,
  },
  cameraButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 5,
    width: width * 0.8,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
});
