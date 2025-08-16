import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const JobDetailsModal = ({ visible, job, onClose, onApply, isApplied }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const renderInfoItem = (icon, title, content) => (
    <View style={styles.infoItem}>
      <Feather name={icon} size={20} color="#4A90E2" style={styles.infoIcon} />
      <View>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoContent}>{content}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <BlurView intensity={100} style={StyleSheet.absoluteFill}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.jobTitle}>{job?.jobTitle}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Category and Status */}
              <View style={styles.categoryStatusContainer}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{job?.category}</Text>
                </View>
                <View style={[styles.pill, styles.statusPill]}>
                  <Text style={[styles.pillText, styles.statusText]}>{job?.status}</Text>
                </View>
              </View>

              {/* Main Content */}
              <View style={styles.content}>
                {renderInfoItem("map-pin", "Location", `${job?.location}\n${job?.completeAddress}`)}
                {renderInfoItem("dollar-sign", "Price", `Rs. ${job?.price} (${job?.priceType})`)}
                {renderInfoItem("calendar", "Date", formatDate(job?.date))}
                {renderInfoItem("clock", "Time", `${formatDate(job?.startTime)} - ${formatDate(job?.endTime)}`)}
                {job?.isMultipleDays && renderInfoItem("calendar", "Duration", "Multiple Days Job")}
                {renderInfoItem("phone", "Contact", `${job?.contactMethod}\n${job?.phoneNumber}`)}

                {/* Description */}
                <View style={styles.descriptionSection}>
                  <Text style={styles.descriptionTitle}>Job Description</Text>
                  <Text style={styles.descriptionContent}>{job?.jobDescription}</Text>
                </View>
              </View>
            </ScrollView>

            {/* Apply Button */}
            <TouchableOpacity
              style={[styles.applyButton, isApplied && styles.appliedButton]}
              onPress={onApply}
              disabled={isApplied}
            >
              <Text style={styles.applyButtonText}>{isApplied ? "Applied" : "Apply Now"}</Text>
              <Text style={styles.applyButtonTextUrdu}>{isApplied ? "درخواست دی گئی" : "اب درخواست دیں"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: width * 0.9,
    maxHeight: '85%',
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollView: {
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  categoryStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 20,
  },
  pill: {
    backgroundColor: '#E1F5FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  pillText: {
    color: '#0288D1',
    fontSize: 14,
    fontWeight: '600',
  },
  statusPill: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    color: '#4CAF50',
  },
  content: {
    gap: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  infoContent: {
    fontSize: 16,
    color: '#333',
  },
  descriptionSection: {
    marginTop: 8,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  descriptionContent: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },
  applyButton: {
    backgroundColor: "#4A90E2",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  appliedButton: {
    backgroundColor: "#50C878",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  applyButtonTextUrdu: {
    color: "#fff",
    fontSize: 14,
    marginTop: 4,
  },
});

export default JobDetailsModal;