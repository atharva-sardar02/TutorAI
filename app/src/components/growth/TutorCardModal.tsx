import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { generateTutorCard, trackCardShare } from '../../services/growth/tutorCardService';
import type { GenerateTutorCardResponse } from '../../types/growthTypes';
import { useLocalizedCopy } from '@/hooks/useLocalizedCopy';
import { useAuth } from '@/hooks/useAuth';

interface TutorCardModalProps {
  visible: boolean;
  tutorId: string;
  onClose: () => void;
}

export function TutorCardModal({ visible, tutorId, onClose }: TutorCardModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState<GenerateTutorCardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // PR17.5: Get localized copy based on user's persona and locale
  const localizedTitle = useLocalizedCopy('tutor_card', user?.role, user?.locale);

  useEffect(() => {
    if (visible && tutorId) {
      loadCard();
    }
  }, [visible, tutorId]);

  const loadCard = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await generateTutorCard(tutorId, false);
      setCardData(result);
    } catch (err: any) {
      console.error('Failed to generate card:', err);
      setError(err.message || 'Failed to generate card');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!cardData) return;

    try {
      const message = `Check out my tutoring profile! ⭐\n\n${cardData.referralLink}`;

      const result = await Share.share({
        message,
        url: cardData.imageUrl, // iOS only
        title: 'My Tutor Card',
      });

      // Track share
      if (result.action === Share.sharedAction) {
        const channel = result.activityType || 'unknown';
        await trackCardShare(cardData.cardId, tutorId, channel);
      }
    } catch (err: any) {
      console.error('Share failed:', err);
      Alert.alert('Error', 'Failed to share card');
    }
  };

  const handleSaveToGallery = async () => {
    if (!cardData) return;

    try {
      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to save images to your gallery');
        return;
      }

      // Download image to local file system
      const documentDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory || '';
      if (!documentDir) {
        throw new Error('No document directory available');
      }
      const fileUri = `${documentDir}tutor-card-${cardData.cardId}.png`;
      const downloadResult = await FileSystem.downloadAsync(cardData.imageUrl, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      // Save to gallery
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      
      if (asset) {
        Alert.alert('Success! 🎉', 'Card saved to your gallery');
        await trackCardShare(cardData.cardId, tutorId, 'gallery');
      } else {
        throw new Error('Failed to create media library asset');
      }
    } catch (err: any) {
      console.error('❌ Save to gallery failed:', err);
      Alert.alert(
        'Save Failed', 
        'Could not save card to gallery. Please try sharing instead.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{localizedTitle}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Generating your card...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadCard}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {cardData && !loading && (
            <>
              {/* Card Preview */}
              <View style={styles.cardContainer}>
                <Image
                  source={{ uri: cardData.imageUrl }}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
                {cardData.isCached && (
                  <View style={styles.cachedBadge}>
                    <Text style={styles.cachedText}>Cached</Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                  <Ionicons name="share-outline" size={24} color="#FFF" />
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveButton} onPress={handleSaveToGallery}>
                  <Ionicons name="download-outline" size={24} color="#007AFF" />
                  <Text style={styles.saveButtonText}>Save to Gallery</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  cardContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  cardImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
  },
  cachedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cachedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0F0F0',
    paddingVertical: 14,
    borderRadius: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});

