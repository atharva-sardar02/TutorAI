import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator, Modal } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { signOut, deleteAccount } from '@/services/authService';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import TimezonePicker from '@/components/TimezonePicker';
import { TutorPeerReferralModal } from '@/components/growth/TutorPeerReferralModal';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto'
  );
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [firestoreProfile, setFirestoreProfile] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Delete account states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  // PR24: Tutor referral modal state
  const [showReferralModal, setShowReferralModal] = useState(false);

  // Log user object for debugging
  useEffect(() => {
    console.log('👤 Profile screen - User:', {
      hasUser: !!user,
      uid: user?.uid,
      email: user?.email,
      displayName: user?.displayName,
      photoURL: user?.photoURL,
      role: user?.role,
    });
  }, [user]);

  // Fetch Firestore profile data
  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      try {
        console.log('📥 Fetching Firestore profile for:', user.uid);
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          console.log('✅ Firestore profile loaded:', data);
          setFirestoreProfile(data);
          
          // Load timezone from Firestore profile
          if (data.timezone) {
            setTimezone(data.timezone);
          }
          
          setFetchError(null);
        } else {
          console.warn('⚠️ User document does not exist in Firestore');
          setFetchError('User profile not found');
        }
      } catch (error: any) {
        console.error('❌ Error fetching Firestore profile:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        setFetchError(error.message || 'Failed to load profile');
      }
    };
    
    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    try {
      console.log('🚪 User clicked sign out button');
      await signOut();
      console.log('📤 Sign out completed, forcing navigation to login');
      
      // Force navigation to login screen immediately
      // Use replace to prevent back navigation
      router.replace('/(auth)/login');
    } catch (error: any) {
      console.error('❌ Sign out failed:', error);
      Alert.alert('Sign Out Error', error.message || 'Failed to sign out. Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Delete Account',
      'This action is permanent and cannot be undone. All your data, messages, events, and tasks will be deleted. Are you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => setShowDeleteModal(true),
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      Alert.alert('Password Required', 'Please enter your password to confirm account deletion.');
      return;
    }

    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      
      // Success - account deleted, user will be signed out automatically
      Alert.alert(
        'Account Deleted',
        'Your account and all associated data have been permanently deleted.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowDeleteModal(false);
              router.replace('/(auth)/login');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Delete account failed:', error);
      Alert.alert(
        'Deletion Failed',
        error.message || 'Failed to delete account. Please check your password and try again.'
      );
    } finally {
      setDeleting(false);
      setDeletePassword('');
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !displayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }

    try {
      // Update Firebase Auth profile using current auth user
      const currentAuthUser = auth.currentUser;
      if (currentAuthUser) {
        await updateProfile(currentAuthUser, { displayName: displayName.trim() });
      }
      
      // Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        timezone: timezone,
        updatedAt: new Date(),
      });

      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handlePickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to update your profile photo');
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0] && user) {
      await uploadProfilePhoto(result.assets[0].uri);
    }
  };

  const uploadProfilePhoto = async (uri: string) => {
    if (!user) return;

    setUploading(true);
    try {
      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to Firebase Storage
      const storageRef = ref(storage, `profiles/${user.uid}/photo.jpg`);
      await uploadBytes(storageRef, blob);

      // Get download URL
      const photoURL = await getDownloadURL(storageRef);

      // Update Firebase Auth profile using current auth user
      const currentAuthUser = auth.currentUser;
      if (currentAuthUser) {
        await updateProfile(currentAuthUser, { photoURL });
      }

      // Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { photoURL });

      Alert.alert('Success', 'Profile photo updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  // Get display values with fallback to Firestore data
  const profileDisplayName = user?.displayName || firestoreProfile?.displayName || 'N/A';
  const profileEmail = user?.email || firestoreProfile?.email || 'N/A';
  const profilePhotoURL = user?.photoURL || firestoreProfile?.photoURL || null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {/* Error Message */}
      {fetchError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {fetchError}</Text>
        </View>
      )}

      {/* Profile Photo */}
      <View style={styles.photoContainer}>
        {uploading ? (
          <View style={styles.photoPlaceholder}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : profilePhotoURL ? (
          <Image source={{ uri: profilePhotoURL }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>
              {profileDisplayName?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <TouchableOpacity 
          style={styles.changePhotoButton} 
          onPress={handlePickImage}
          disabled={uploading}
        >
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Display Name */}
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Display Name:</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter display name"
            autoFocus
          />
        ) : (
          <Text style={styles.value}>{profileDisplayName}</Text>
        )}
      </View>

      {/* Timezone */}
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Timezone:</Text>
        {editing ? (
          <TouchableOpacity
            style={styles.timezoneButton}
            onPress={() => setShowTimezonePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.timezoneText}>{timezone}</Text>
            <Text style={styles.changeText}>Change →</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.value}>{timezone}</Text>
        )}
      </View>

      {/* Email (read-only) */}
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{profileEmail}</Text>
      </View>
      
      {/* TimezonePicker Modal */}
      <TimezonePicker
        visible={showTimezonePicker}
        selectedTimezone={timezone}
        onSelect={setTimezone}
        onClose={() => setShowTimezonePicker(false)}
      />

      {/* Edit/Save Button */}
      {editing ? (
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, styles.saveButton]} 
            onPress={handleSaveProfile}
          >
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]} 
            onPress={() => {
              setDisplayName(user?.displayName || '');
              setEditing(false);
            }}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={[styles.button, styles.editButton]} 
          onPress={() => setEditing(true)}
        >
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
      )}

      {/* PR24: Tutor Referral Button */}
      {firestoreProfile?.userType === 'tutor' && (
        <TouchableOpacity
          style={[styles.button, styles.referButton]}
          onPress={() => setShowReferralModal(true)}
        >
          <Ionicons name="people" size={20} color="white" />
          <Text style={styles.buttonText}>Refer a Tutor</Text>
        </TouchableOpacity>
      )}

      {/* Sign Out */}
      <TouchableOpacity 
        style={[styles.button, styles.signOutButton]} 
        onPress={handleSignOut}
        testID="sign-out-button"
      >
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Delete Account */}
      <TouchableOpacity 
        style={[styles.button, styles.deleteAccountButton]} 
        onPress={handleDeleteAccount}
      >
        <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
      </TouchableOpacity>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Account Deletion</Text>
            <Text style={styles.modalMessage}>
              Please enter your password to permanently delete your account and all associated data.
            </Text>

            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleting}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                }}
                disabled={deleting}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={confirmDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalDeleteButtonText}>Delete Forever</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PR24: Tutor Peer Referral Modal */}
      <TutorPeerReferralModal
        visible={showReferralModal}
        onClose={() => setShowReferralModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  photoPlaceholderText: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  changePhotoButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changePhotoText: {
    color: '#007AFF',
    fontSize: 16,
  },
  infoContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 18,
    color: '#000',
  },
  input: {
    fontSize: 18,
    color: '#000',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#34C759',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#8E8E93',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
  },
  deleteAccountButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8E8E93',
  },
  deleteAccountButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#F9F9F9',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F0F0F0',
  },
  modalCancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  modalDeleteButton: {
    backgroundColor: '#FF3B30',
  },
  modalDeleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
  timezoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timezoneText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  changeText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  referButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    gap: 8,
  },
});

