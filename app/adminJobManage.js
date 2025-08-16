import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { collection, query, getDocs, doc, getDoc, updateDoc, deleteDoc, where } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

const AdminJobManageScreen = () => {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobFilter, setJobFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, [jobFilter]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      
      // Create the base query for the orders collection
      let jobsQuery;
      
      if (jobFilter === 'active') {
        jobsQuery = query(collection(db, "orders"), where("status", "==", "active"));
      } else if (jobFilter === 'closed') {
        jobsQuery = query(collection(db, "orders"), where("status", "==", "completed"));
      } else {
        // 'all' filter - get all orders
        jobsQuery = query(collection(db, "orders"));
      }
      
      const querySnapshot = await getDocs(jobsQuery);
      const jobsData = [];
      
      // Process each job document
      for (const docSnapshot of querySnapshot.docs) {
        const jobData = docSnapshot.data();
        
        // Fetch the user who posted the job
        let userData = { name: "Unknown User", email: "", phone: "", cnic: "" };
        
        if (jobData.userId) {
          try {
            const userDocRef = doc(db, "users", jobData.userId);
            const userDocSnapshot = await getDoc(userDocRef);
            
            if (userDocSnapshot.exists()) {
              const userDataFromDb = userDocSnapshot.data();
              userData = {
                name: userDataFromDb.name || userDataFromDb.fullName || "Unknown User",
                email: userDataFromDb.email || "",
                phone: userDataFromDb.phoneNumber || "",
                cnic: userDataFromDb.identityNumber || "",
              };
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
          }
        }
        
        // Process applicants if they exist
        const applicants = [];
        if (jobData.applicants && Array.isArray(jobData.applicants)) {
          for (const applicantId of jobData.applicants) {
            try {
              const applicantDocRef = doc(db, "users", applicantId);
              const applicantDocSnapshot = await getDoc(applicantDocRef);
              
              if (applicantDocSnapshot.exists()) {
                const applicantData = applicantDocSnapshot.data();
                
                // Determine applicant status based on job data
                let status = "Applied";
                if (jobData.acceptedWorkerId === applicantId) {
                  status = "Accepted";
                } else if (jobData.rejectedWorkers && jobData.rejectedWorkers.includes(applicantId)) {
                  status = "Rejected";
                }
                
                applicants.push({
                  id: applicantId,
                  name: applicantData.name || applicantData.fullName || "Unknown",
                  email: applicantData.email || "",
                  phone: applicantData.phoneNumber || "",
                  cnic: applicantData.identityNumber || "",
                  status: status,
                });
              }
            } catch (error) {
              console.error("Error fetching applicant data:", error);
            }
          }
        }
        
        // Format the job data
        jobsData.push({
          id: docSnapshot.id,
          title: jobData.jobTitle || "Untitled Job",
          category: jobData.category || "Uncategorized",
          status: jobData.status || "Active",
          postedDate: formatDate(jobData.createdAt),
          location: jobData.location || "Unknown Location",
          description: jobData.jobDescription || "No description provided",
          budget: `Rs. ${jobData.price || 0}${jobData.priceType === 'hourly' ? ' per hour' : ''}`,
          postedBy: {
            name: userData.name,
            cnic: userData.cnic,
            phone: userData.phone,
            email: userData.email,
          },
          applicants: applicants,
          timeline: jobData.timeline || [],
          rawData: jobData, // Keep the raw data for reference
        });
      }
      
      setJobs(jobsData);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      Alert.alert("Error", "Failed to fetch jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown date";
    
    try {
      // Check if timestamp is a Firestore timestamp
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString();
      }
      
      // Check if timestamp is a string date
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString();
      }
      
      // Check if timestamp is a number (milliseconds)
      if (typeof timestamp === 'number') {
        return new Date(timestamp).toLocaleDateString();
      }
      
      return "Unknown date";
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown date";
    }
  };

  const handleViewJobDetails = async (job) => {
    try {
      // Fetch the latest job data to ensure we have the most up-to-date information
      const jobDocRef = doc(db, "orders", job.id);
      const jobDocSnapshot = await getDoc(jobDocRef);
      
      if (jobDocSnapshot.exists()) {
        const updatedJobData = jobDocSnapshot.data();
        
        // Update the job object with the latest data
        const updatedJob = {
          ...job,
          status: updatedJobData.status || job.status,
          rawData: updatedJobData,
        };
        
        setSelectedJob(updatedJob);
        setModalVisible(true);
      } else {
        Alert.alert("Error", "Job not found. It may have been deleted.");
      }
    } catch (error) {
      console.error("Error fetching job details:", error);
      Alert.alert("Error", "Failed to fetch job details. Please try again.");
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      setConfirmDeleteVisible(false);
      setLoading(true);
      
      // Delete the job document from Firestore
      const jobDocRef = doc(db, "orders", jobId);
      await deleteDoc(jobDocRef);
      
      // Update the local state to remove the deleted job
      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
      
      Alert.alert(
        "Success / کامیابی",
        "Job post deleted successfully\nنوکری کا اشتہار کامیابی سے حذف کر دیا گیا ہے"
      );
    } catch (error) {
      console.error("Error deleting job:", error);
      Alert.alert("Error", "Failed to delete job. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (job) => {
    setJobToDelete(job);
    setConfirmDeleteVisible(true);
  };

  const handleAcceptApplicant = async (jobId, applicantId) => {
    try {
      setLoading(true);
      
      // Update the job document in Firestore
      const jobDocRef = doc(db, "orders", jobId);
      await updateDoc(jobDocRef, {
        acceptedWorkerId: applicantId,
        status: "active", // Ensure the job is marked as active
      });
      
      // Refresh the job data
      await fetchJobs();
      
      // Close the modal and show success message
      setModalVisible(false);
      Alert.alert("Success", "Applicant accepted successfully");
    } catch (error) {
      console.error("Error accepting applicant:", error);
      Alert.alert("Error", "Failed to accept applicant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectApplicant = async (jobId, applicantId) => {
    try {
      setLoading(true);
      
      // Get the current job document
      const jobDocRef = doc(db, "orders", jobId);
      const jobDocSnapshot = await getDoc(jobDocRef);
      
      if (jobDocSnapshot.exists()) {
        const jobData = jobDocSnapshot.data();
        
        // Create or update the rejectedWorkers array
        const rejectedWorkers = jobData.rejectedWorkers || [];
        if (!rejectedWorkers.includes(applicantId)) {
          rejectedWorkers.push(applicantId);
        }
        
        // Update the job document
        await updateDoc(jobDocRef, {
          rejectedWorkers: rejectedWorkers,
        });
        
        // Refresh the job data
        await fetchJobs();
        
        // Close the modal and show success message
        setModalVisible(false);
        Alert.alert("Success", "Applicant rejected successfully");
      } else {
        Alert.alert("Error", "Job not found. It may have been deleted.");
      }
    } catch (error) {
      console.error("Error rejecting applicant:", error);
      Alert.alert("Error", "Failed to reject applicant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'active':
        return '#4CAF50';
      case 'completed':
        return '#9E9E9E';
      case 'applied':
        return '#2196F3';
      case 'accepted':
        return '#4CAF50';
      case 'rejected':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category.toLowerCase()) {
      case 'domestic worker':
      case 'domestic':
        return 'home-outline';
      case 'plumber':
        return 'water-outline';
      case 'beautician':
        return 'cut-outline';
      case 'driver':
        return 'car-outline';
      case 'tailor':
        return 'shirt-outline';
      default:
        return 'briefcase-outline';
    }
  };

  const renderJobCard = (job) => {
    return (
      <View style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <View style={styles.jobTitleContainer}>
            <View style={[styles.categoryIcon, { backgroundColor: `${getStatusColor(job.status)}20` }]}>
              <Ionicons name={getCategoryIcon(job.category)} size={20} color={getStatusColor(job.status)} />
            </View>
            <View>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.jobCategory}>{job.category}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(job.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>{job.status}</Text>
          </View>
        </View>
        
        <View style={styles.jobDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={16} color="#757575" />
            <Text style={styles.detailText}>{job.postedBy.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#757575" />
            <Text style={styles.detailText}>{job.postedDate}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#757575" />
            <Text style={styles.detailText}>{job.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={16} color="#757575" />
            <Text style={styles.detailText}>{job.applicants.length} Applicants</Text>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.viewButton]} 
            onPress={() => handleViewJobDetails(job)}
          >
            <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={() => confirmDelete(job)}
          >
            <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Delete Post</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderJobDetailModal = () => {
    if (!selectedJob) return null;
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Job Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.jobDetailSection}>
                <View style={styles.jobDetailHeader}>
                  <View style={[styles.categoryIconLarge, { backgroundColor: `${getStatusColor(selectedJob.status)}20` }]}>
                    <Ionicons name={getCategoryIcon(selectedJob.category)} size={28} color={getStatusColor(selectedJob.status)} />
                  </View>
                  <View style={styles.jobDetailHeaderText}>
                    <Text style={styles.jobDetailTitle}>{selectedJob.title}</Text>
                    <View style={styles.jobDetailMeta}>
                      <Text style={styles.jobDetailCategory}>{selectedJob.category}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(selectedJob.status)}20` }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(selectedJob.status) }]}>{selectedJob.status}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Job Information</Text>
                  
                  <View style={styles.detailItem}>
                    <View style={styles.detailItemIcon}>
                      <Ionicons name="location-outline" size={18} color="#2196F3" />
                    </View>
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Location</Text>
                      <Text style={styles.detailItemValue}>{selectedJob.location}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <View style={styles.detailItemIcon}>
                      <Ionicons name="calendar-outline" size={18} color="#2196F3" />
                    </View>
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Posted Date</Text>
                      <Text style={styles.detailItemValue}>{selectedJob.postedDate}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <View style={styles.detailItemIcon}>
                      <Ionicons name="cash-outline" size={18} color="#2196F3" />
                    </View>
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Budget</Text>
                      <Text style={styles.detailItemValue}>{selectedJob.budget}</Text>
                    </View>
                  </View>
                  
                  {selectedJob.rawData.startTime && (
                    <View style={styles.detailItem}>
                      <View style={styles.detailItemIcon}>
                        <Ionicons name="time-outline" size={18} color="#2196F3" />
                      </View>
                      <View style={styles.detailItemContent}>
                        <Text style={styles.detailItemLabel}>Start Time</Text>
                        <Text style={styles.detailItemValue}>
                          {formatDate(selectedJob.rawData.startTime)}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {selectedJob.rawData.endTime && (
                    <View style={styles.detailItem}>
                      <View style={styles.detailItemIcon}>
                        <Ionicons name="time-outline" size={18} color="#2196F3" />
                      </View>
                      <View style={styles.detailItemContent}>
                        <Text style={styles.detailItemLabel}>End Time</Text>
                        <Text style={styles.detailItemValue}>
                          {formatDate(selectedJob.rawData.endTime)}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionLabel}>Description</Text>
                    <Text style={styles.descriptionText}>{selectedJob.description}</Text>
                  </View>
                </View>
                
                {/* Timeline Section */}
                {selectedJob.rawData.timeline && selectedJob.rawData.timeline.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Job Timeline</Text>
                    
                    {selectedJob.rawData.timeline.map((event, index) => (
                      <View key={index} style={styles.timelineItem}>
                        <View style={styles.timelineDot} />
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineStatus}>{event.status}</Text>
                          <Text style={styles.timelineDate}>
                            {formatDate(event.date)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Posted By</Text>
                  
                  <View style={styles.detailItem}>
                    <View style={styles.detailItemIcon}>
                      <Ionicons name="person-outline" size={18} color="#2196F3" />
                    </View>
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Name</Text>
                      <Text style={styles.detailItemValue}>{selectedJob.postedBy.name}</Text>
                    </View>
                  </View>
                  
                  {selectedJob.postedBy.cnic && (
                    <View style={styles.detailItem}>
                      <View style={styles.detailItemIcon}>
                        <Ionicons name="card-outline" size={18} color="#2196F3" />
                      </View>
                      <View style={styles.detailItemContent}>
                        <Text style={styles.detailItemLabel}>CNIC</Text>
                        <Text style={styles.detailItemValue}>{selectedJob.postedBy.cnic}</Text>
                      </View>
                    </View>
                  )}
                  
                  {selectedJob.postedBy.phone && (
                    <View style={styles.detailItem}>
                      <View style={styles.detailItemIcon}>
                        <Ionicons name="call-outline" size={18} color="#2196F3" />
                      </View>
                      <View style={styles.detailItemContent}>
                        <Text style={styles.detailItemLabel}>Phone</Text>
                        <Text style={styles.detailItemValue}>{selectedJob.postedBy.phone}</Text>
                      </View>
                    </View>
                  )}
                  
                  {selectedJob.postedBy.email && (
                    <View style={styles.detailItem}>
                      <View style={styles.detailItemIcon}>
                        <Ionicons name="mail-outline" size={18} color="#2196F3" />
                      </View>
                      <View style={styles.detailItemContent}>
                        <Text style={styles.detailItemLabel}>Email</Text>
                        <Text style={styles.detailItemValue}>{selectedJob.postedBy.email}</Text>
                      </View>
                    </View>
                  )}
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Applicants ({selectedJob.applicants.length})</Text>
                  
                  {selectedJob.applicants.length > 0 ? (
                    selectedJob.applicants.map((applicant) => (
                      <View key={applicant.id} style={styles.applicantCard}>
                        <View style={styles.applicantHeader}>
                          <View style={styles.applicantAvatar}>
                            <Ionicons name="person" size={20} color="#FFFFFF" />
                          </View>
                          <View style={styles.applicantInfo}>
                            <Text style={styles.applicantName}>{applicant.name}</Text>
                            <View style={[styles.applicantStatusBadge, { backgroundColor: `${getStatusColor(applicant.status)}20` }]}>
                              <Text style={[styles.applicantStatusText, { color: getStatusColor(applicant.status) }]}>
                                {applicant.status}
                              </Text>
                            </View>
                          </View>
                        </View>
                        
                        <View style={styles.applicantDetails}>
                          {applicant.cnic && (
                            <View style={styles.applicantDetailItem}>
                              <Ionicons name="card-outline" size={14} color="#757575" />
                              <Text style={styles.applicantDetailText}>{applicant.cnic}</Text>
                            </View>
                          )}
                          {applicant.phone && (
                            <View style={styles.applicantDetailItem}>
                              <Ionicons name="call-outline" size={14} color="#757575" />
                              <Text style={styles.applicantDetailText}>{applicant.phone}</Text>
                            </View>
                          )}
                          {applicant.email && (
                            <View style={styles.applicantDetailItem}>
                              <Ionicons name="mail-outline" size={14} color="#757575" />
                              <Text style={styles.applicantDetailText}>{applicant.email}</Text>
                            </View>
                          )}
                        </View>
                        
                        {applicant.status === 'Applied' && selectedJob.status.toLowerCase() !== 'completed' && (
                          <View style={styles.applicantActions}>
                            <TouchableOpacity 
                              style={[styles.applicantActionButton, styles.acceptButton]}
                              onPress={() => handleAcceptApplicant(selectedJob.id, applicant.id)}
                            >
                              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                              <Text style={styles.applicantActionText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.applicantActionButton, styles.rejectButton]}
                              onPress={() => handleRejectApplicant(selectedJob.id, applicant.id)}
                            >
                              <Ionicons name="close" size={14} color="#FFFFFF" />
                              <Text style={styles.applicantActionText}>Reject</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noApplicantsText}>No applicants yet</Text>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderConfirmDeleteModal = () => {
    if (!jobToDelete) return null;
    
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={confirmDeleteVisible}
        onRequestClose={() => setConfirmDeleteVisible(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalIcon}>
              <Ionicons name="alert-circle" size={48} color="#F44336" />
            </View>
            <Text style={styles.confirmModalTitle}>Confirm Delete</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to delete the job post "{jobToDelete.title}"? This action cannot be undone.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity 
                style={[styles.confirmModalButton, styles.cancelButton]} 
                onPress={() => setConfirmDeleteVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmModalButton, styles.deleteConfirmButton]} 
                onPress={() => handleDeleteJob(jobToDelete.id)}
              >
                <Text style={styles.deleteConfirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const filteredJobs = jobs.filter(job => {
    if (jobFilter === 'all') return true;
    return job.status.toLowerCase() === jobFilter;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
      {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
            </TouchableOpacity>
            <View>
          <Text style={styles.headerTitle}>Job Posts</Text>
          <Text style={{ fontSize: 13, color: '#757575' }}>نوکری کے اشتہارات</Text>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity 
          style={[styles.filterTab, jobFilter === 'all' && styles.activeFilterTab]} 
          onPress={() => setJobFilter('all')}
        >
          <Text style={[styles.filterTabText, jobFilter === 'all' && styles.activeFilterTabText]}>
            All Jobs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, jobFilter === 'active' && styles.activeFilterTab]} 
          onPress={() => setJobFilter('active')}
        >
          <Text style={[styles.filterTabText, jobFilter === 'active' && styles.activeFilterTabText]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, jobFilter === 'completed' && styles.activeFilterTab]} 
          onPress={() => setJobFilter('completed')}
        >
          <Text style={[styles.filterTabText, jobFilter === 'completed' && styles.activeFilterTabText]}>
            Closed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Job List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading jobs...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderJobCard(item)}
          contentContainerStyle={styles.jobList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>No jobs found</Text>
              <Text style={styles.emptySubtext}>
                {jobFilter === 'all' 
                  ? "There are no job posts available" 
                  : `There are no ${jobFilter} jobs available`}
              </Text>
            </View>
          }
        />
      )}

      {/* Job Detail Modal */}
      {renderJobDetailModal()}

      {/* Confirm Delete Modal */}
      {renderConfirmDeleteModal()}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => {
            setActiveTab('home');
            router.push('adminHomeScreen');
          }}
        >
          <Ionicons 
            name={activeTab === 'home' ? 'home' : 'home-outline'} 
            size={24} 
            color={activeTab === 'home' ? '#2196F3' : '#757575'} 
          />
          <Text style={[styles.navLabel, activeTab === 'home' && styles.activeNavLabel]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('jobs')}
        >
          <Ionicons 
            name={activeTab === 'jobs' ? 'briefcase' : 'briefcase-outline'} 
            size={24} 
            color={activeTab === 'jobs' ? '#2196F3' : '#757575'} 
          />
          <Text style={[styles.navLabel, activeTab === 'jobs' && styles.activeNavLabel]}>
            Manage Jobs
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => {
            setActiveTab('profile');
            router.push('adminUserManage');
          }}
        >
          <Ionicons 
            name={activeTab === 'users' ? 'person' : 'person-outline'} 
            size={24} 
            color={activeTab === 'users' ? '#2196F3' : '#757575'} 
          />
          <Text style={[styles.navLabel, activeTab === 'users' && styles.activeNavLabel]}>
            Manage Users
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    fontFamily: 'Roboto, sans-serif', // Default to system font if Roboto not available
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 16,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeFilterTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
  },
  activeFilterTabText: {
    color: '#2196F3',
  },
  jobList: {
    padding: 16,
    paddingBottom: 80, // Extra padding for bottom nav
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  jobCategory: {
    fontSize: 14,
    color: '#757575',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  jobDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#424242',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  viewButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingVertical: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 12,
    marginTop: 4,
    color: '#757575',
  },
  activeNavLabel: {
    color: '#2196F3',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  jobDetailSection: {
    marginBottom: 16,
  },
  jobDetailHeader: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  categoryIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  jobDetailHeaderText: {
    flex: 1,
  },
  jobDetailTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  jobDetailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobDetailCategory: {
    fontSize: 14,
    color: '#757575',
    marginRight: 8,
  },
  detailSection: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#2196F3',
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailItemContent: {
    flex: 1,
  },
  detailItemLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  detailItemValue: {
    fontSize: 14,
  },
  descriptionBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  applicantCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  applicantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  applicantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  applicantInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  applicantName: {
    fontSize: 14,
    fontWeight: '500',
  },
  applicantStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  applicantStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  applicantDetails: {
    marginBottom: 12,
  },
  applicantDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  applicantDetailText: {
    fontSize: 13,
    marginLeft: 8,
    color: '#424242',
  },
  applicantActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  applicantActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  applicantActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  noApplicantsText: {
    textAlign: 'center',
    color: '#9E9E9E',
    padding: 16,
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalContent: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  confirmModalIcon: {
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  confirmModalText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    color: '#757575',
  },
  confirmModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#EEEEEE',
  },
  cancelButtonText: {
    color: '#424242',
    fontWeight: '500',
  },
  deleteConfirmButton: {
    backgroundColor: '#F44336',
  },
  deleteConfirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#757575',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#757575',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 8,
    textAlign: 'center',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
    marginRight: 12,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  timelineDate: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
});

export default AdminJobManageScreen;