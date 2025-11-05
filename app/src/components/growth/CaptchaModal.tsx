/**
 * Captcha Modal - PR22
 * 
 * Displays hCaptcha challenge when fraud detection requires verification
 */

import React from 'react';
import { Modal, View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface CaptchaModalProps {
  visible: boolean;
  onVerify: (token: string) => void;
  onClose: () => void;
}

export function CaptchaModal({ visible, onVerify, onClose }: CaptchaModalProps) {
  const HCAPTCHA_SITE_KEY = process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY || 'test-site-key';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://hcaptcha.com/1/api.js" async defer></script>
      <style>
        body {
          margin: 0;
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .h-captcha {
          transform: scale(0.9);
          transform-origin: center;
        }
      </style>
    </head>
    <body>
      <div class="h-captcha" data-sitekey="${HCAPTCHA_SITE_KEY}" data-callback="onVerify"></div>
      <script>
        function onVerify(token) {
          window.ReactNativeWebView.postMessage(token);
        }
      </script>
    </body>
    </html>
  `;
  
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
          
          <WebView
            source={{ html }}
            onMessage={(event) => {
              const token = event.nativeEvent.data;
              onVerify(token);
            }}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
          />
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
  webview: {
    height: 300,
    backgroundColor: 'white',
  },
});

