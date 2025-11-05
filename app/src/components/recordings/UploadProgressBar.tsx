import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

interface Props {
  progress: number; // 0-100
  fileName: string;
  onCancel?: () => void;
}

/**
 * Upload progress bar for recording uploads
 * Shows file name, progress percentage, and animated progress bar
 */
export default function UploadProgressBar({ progress, fileName, onCancel }: Props) {
  const isComplete = progress >= 100;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.fileInfo}>
          <ActivityIndicator size="small" color="#007AFF" style={styles.spinner} />
          <Text style={styles.fileName} numberOfLines={1}>
            {fileName}
          </Text>
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>
      
      <View style={styles.progressBarContainer}>
        <View 
          style={[
            styles.progressBar, 
            { width: `${Math.min(progress, 100)}%` },
            isComplete && styles.progressBarComplete
          ]} 
        />
      </View>
      
      {onCancel && !isComplete && (
        <TouchableOpacity 
          onPress={onCancel} 
          style={styles.cancelButton}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
      
      {isComplete && (
        <Text style={styles.completeText}>✓ Upload complete</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  spinner: {
    marginRight: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressBarComplete: {
    backgroundColor: '#34C759',
  },
  cancelButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  cancelText: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '600',
  },
  completeText: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
});

