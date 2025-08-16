import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from "../firebaseConfig";

const CATEGORIES = ['Domestic', 'Beautician', 'Tailor', 'Driver'];
const CONTACT_METHODS = ['Phone Call', 'WhatsApp', 'In-App Chat'];

const PostJobPage = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [completeAddress, setCompleteAddress] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [isHourlyRate, setIsHourlyRate] = useState(true);
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [isMultipleDays, setIsMultipleDays] = useState(false);
  const [selectedContactMethods, setSelectedContactMethods] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
      }
    })();
  }, []);

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        setIsLoading(false);
        return;
      }

      // Get precise location coordinates
      let locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      
      const { latitude, longitude } = locationData.coords;
      
      // Store coordinates for later use
      setCoordinates({
        latitude,
        longitude
      });
      
      // Get detailed address information
      let addressInfo = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });
      
      if (addressInfo && addressInfo[0]) {
        const {
          city,
          name,
          street,
          streetNumber,
          postalCode,
          region,
          district,
          subregion,
          country
        } = addressInfo[0];
        
        // Create a detailed address for the location field
        const addressParts = [
          city,
          name,
          streetNumber ? `${streetNumber} ${street}` : street,
          district,
          subregion,
          region,
          postalCode,
          country
        ].filter(Boolean);
        
        const fullAddress = addressParts.join(', ');
        
        // Set the full address to the location field
        setLocation(fullAddress);
        
        // Leave the complete address field empty as requested
        setCompleteAddress('');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching location:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Unable to fetch location. Please try again or enter manually.');
    }
  };

  const toggleContactMethod = (method) => {
    setSelectedContactMethods(prev => {
      if (prev.includes(method)) {
        return prev.filter(m => m !== method);
      } else {
        return [...prev, method];
      }
    });
  };

  const handleSubmit = async () => {
    if (!jobTitle || !jobDescription || !category || !location || !price || selectedContactMethods.length === 0) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        jobTitle,
        jobDescription,
        category,
        location,
        completeAddress,
        coordinates, // Save the exact coordinates
        priceType: isHourlyRate ? 'hourly' : 'fixed',
        price: parseFloat(price),
        date: date.toISOString(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        isMultipleDays,
        contactMethods: selectedContactMethods,
        phoneNumber,
        createdAt: new Date().toISOString(),
        status: 'active',
      });
      
      setIsLoading(false);
      Alert.alert('Success', 'Job posted successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error adding document: ', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to post job. Please try again.');
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const onStartTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || startTime;
    setShowStartTimePicker(Platform.OS === 'ios');
    setStartTime(currentTime);
  };

  const onEndTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || endTime;
    setShowEndTimePicker(Platform.OS === 'ios');
    setEndTime(currentTime);
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Post a New Job</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Job Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <TextInput
            style={styles.input}
            placeholder="Job Title"
            value={jobTitle}
            onChangeText={setJobTitle}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Job Description"
            multiline
            numberOfLines={4}
            value={jobDescription}
            onChangeText={setJobDescription}
          />
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  category === cat && styles.categoryChipActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[
                  styles.categoryChipText,
                  category === cat && styles.categoryChipTextActive,
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Job Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Location</Text>
          <TouchableOpacity 
            style={styles.button} 
            onPress={getCurrentLocation}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="map-marker" size={20} color="#fff" />
                <Text style={styles.buttonText}>Use Current Location</Text>
              </>
            )}
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { marginTop: 12 }]}
            placeholder="Enter Location"
            value={location}
            onChangeText={setLocation}
          />
          <TextInput
            style={styles.input}
            placeholder="Complete Address"
            value={completeAddress}
            onChangeText={setCompleteAddress}
          />
        </View>

        {/* Pricing & Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing & Payment</Text>
          <View style={styles.row}>
            <Text>Hourly Rate</Text>
            <Switch
              value={isHourlyRate}
              onValueChange={setIsHourlyRate}
            />
            <Text>Fixed Price</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder={`Enter ${isHourlyRate ? 'Hourly Rate' : 'Fixed Price'}`}
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
        </View>

        {/* Availability & Timing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability & Timing</Text>
          <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
            <Text>Select Date: {date.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}
          <View style={styles.row}>
            <TouchableOpacity style={styles.timePickerButton} onPress={() => setShowStartTimePicker(true)}>
              <Text>Start: {startTime.toLocaleTimeString()}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.timePickerButton} onPress={() => setShowEndTimePicker(true)}>
              <Text>End: {endTime.toLocaleTimeString()}</Text>
            </TouchableOpacity>
          </View>
          {showStartTimePicker && (
            <DateTimePicker
              value={startTime}
              mode="time"
              display="default"
              onChange={onStartTimeChange}
            />
          )}
          {showEndTimePicker && (
            <DateTimePicker
              value={endTime}
              mode="time"
              display="default"
              onChange={onEndTimeChange}
            />
          )}
          <View style={styles.row}>
            <Text>Available for multiple days</Text>
            <Switch
              value={isMultipleDays}
              onValueChange={setIsMultipleDays}
            />
          </View>
        </View>

        {/* Contact Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Preferences</Text>
          {CONTACT_METHODS.map((method) => (
            <TouchableOpacity
              key={method}
              style={styles.contactMethodButton}
              onPress={() => toggleContactMethod(method)}
            >
              <Icon
                name={selectedContactMethods.includes(method) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={24}
                color="#2196F3"
              />
              <Text style={styles.contactMethodText}>{method}</Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, (!jobTitle || !jobDescription) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!jobTitle || !jobDescription || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Post Job</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  categoryChipActive: {
    backgroundColor: '#2196F3',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#333',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  timePickerButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginRight: 8,
  },
  contactMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactMethodText: {
    fontSize: 16,
    marginLeft: 8,
  },
  submitButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#b0bec5',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default PostJobPage;