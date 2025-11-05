/**
 * Captcha Modal - PR22
 * 
 * Displays hCaptcha challenge when fraud detection requires verification
 * 
 * NOTE: This is a placeholder implementation. For production, install react-native-webview:
 * pnpm add react-native-webview
 */

import React from 'react';
import { Modal, View, StyleSheet, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CaptchaModalProps {
  visible: boolean;
  onVerify: (token: string) => void;
  onClose: () => void;
}

export function CaptchaModal({ visible, onVerify, onClose }: CaptchaModalProps) {
  // Placeholder implementation - for production, use WebView with hCaptcha
  const handleVerify = () => {
    // In production, this would be called after hCaptcha verification
    onVerify('test-captcha-token');
    onClose();
  };
  
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Security Check</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.subtitle}>
            Please complete this verification to continue
          </Text>
          
          <View style={styles.captchaPlaceholder}>
            <Ionicons name="shield-checkmark-outline" size={64} color="#4CAF50" />
            <Text style={styles.placeholderText}>
              Captcha verification placeholder
            </Text>
            <Text style={styles.noteText}>
              Production: Install react-native-webview for hCaptcha
            </Text>
            <TouchableOpacity onPress={handleVerify} style={styles.verifyButton}>
              <Text style={styles.verifyButtonText}>Verify (Test)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    padding: 16,
    paddingTop: 12,
  },
  captchaPlaceholder: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
    margin: 16,
    borderRadius: 8,
    minHeight: 200,
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  verifyButton: {
    marginTop: 24,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

