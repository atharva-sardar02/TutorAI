import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  useColorScheme,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSendImage?: (imageUri: string) => void;
  onSendRecording?: (uri: string, fileType: 'video' | 'audio') => void;
}

export default function AttachmentModal({ visible, onClose, onSendImage, onSendRecording }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleTakePhoto = async () => {
    onClose();
    
    if (!onSendImage) {
      Alert.alert('Not Available', 'Image sending is not available');
      return;
    }

    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera permissions to take photos');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        onSendImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const handleChooseFromGallery = async () => {
    onClose();
    
    if (!onSendImage) {
      Alert.alert('Not Available', 'Image sending is not available');
      return;
    }

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need photo library permissions to select images');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        onSendImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleRecordVideo = async () => {
    onClose();
    
    if (!onSendRecording) {
      Alert.alert('Not Available', 'Recording upload is not available');
      return;
    }

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permissions to access videos');
        return;
      }

      // Pick video
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1,
        videoMaxDuration: 3600, // 1 hour max
      });

      if (!result.canceled && result.assets[0]) {
        onSendRecording(result.assets[0].uri, 'video');
      }
    } catch (error: any) {
      console.error('Video picker error:', error);
      Alert.alert('Error', 'Failed to select video. Please try again.');
    }
  };

  const handleAttachAudio = async () => {
    onClose();
    
    if (!onSendRecording) {
      Alert.alert('Not Available', 'Recording upload is not available');
      return;
    }

    try {
      // Use document picker for audio files
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        onSendRecording(result.assets[0].uri, 'audio');
      }
    } catch (error: any) {
      console.error('Audio picker error:', error);
      Alert.alert('Error', 'Failed to select audio. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.modalContainer}>
          <Pressable style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
              Add Attachment
            </Text>

            <TouchableOpacity
              style={[styles.option, isDark && styles.optionDark]}
              onPress={handleTakePhoto}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, styles.cameraIcon]}>
                <Text style={styles.optionIconText}>📷</Text>
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, isDark && styles.optionTitleDark]}>
                  Take Photo
                </Text>
                <Text style={[styles.optionSubtitle, isDark && styles.optionSubtitleDark]}>
                  Capture a photo with your camera
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, isDark && styles.optionDark]}
              onPress={handleChooseFromGallery}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, styles.galleryIcon]}>
                <Text style={styles.optionIconText}>🖼️</Text>
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, isDark && styles.optionTitleDark]}>
                  Choose from Gallery
                </Text>
                <Text style={[styles.optionSubtitle, isDark && styles.optionSubtitleDark]}>
                  Select from your photo library
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, isDark && styles.optionDark]}
              onPress={handleRecordVideo}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, styles.videoIcon]}>
                <Text style={styles.optionIconText}>🎥</Text>
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, isDark && styles.optionTitleDark]}>
                  Record/Attach Video
                </Text>
                <Text style={[styles.optionSubtitle, isDark && styles.optionSubtitleDark]}>
                  Lecture recording or video file
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, isDark && styles.optionDark]}
              onPress={handleAttachAudio}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, styles.audioIcon]}>
                <Text style={styles.optionIconText}>🎤</Text>
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, isDark && styles.optionTitleDark]}>
                  Attach Audio
                </Text>
                <Text style={[styles.optionSubtitle, isDark && styles.optionSubtitleDark]}>
                  Audio recording or file
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, isDark && styles.cancelButtonDark]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelButtonText, isDark && styles.cancelButtonTextDark]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalContentDark: {
    backgroundColor: '#1c1c1e',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalTitleDark: {
    color: '#fff',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 10,
  },
  optionDark: {
    backgroundColor: '#2c2c2e',
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cameraIcon: {
    backgroundColor: '#007AFF20',
  },
  galleryIcon: {
    backgroundColor: '#34C75920',
  },
  videoIcon: {
    backgroundColor: '#FF9F0A20',
  },
  audioIcon: {
    backgroundColor: '#AF52DE20',
  },
  optionIconText: {
    fontSize: 24,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  optionTitleDark: {
    color: '#fff',
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  optionSubtitleDark: {
    color: '#999',
  },
  cancelButton: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonDark: {
    backgroundColor: '#2c2c2e',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  cancelButtonTextDark: {
    color: '#FF453A',
  },
});

