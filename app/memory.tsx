import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, X, Heart, ThumbsDown, Star, MessageCircle, User, AlertCircle } from 'lucide-react-native';
import { colors, spacing } from '../constants/theme';
import { useMemoryStore } from '../stores/useMemoryStore';
import type { Memory, MemoryType } from '../types';

export default function MemoryScreen() {
  const router = useRouter();
  const memoryStore = useMemoryStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemoryType, setNewMemoryType] = useState<MemoryType>('preference');
  const [newMemoryContent, setNewMemoryContent] = useState('');

  const memories = memoryStore.memories;

  const getMemoryIcon = (type: MemoryType) => {
    switch (type) {
      case 'like':
        return <Heart size={18} color="#34C759" />;
      case 'dislike':
        return <ThumbsDown size={18} color="#FF3B30" />;
      case 'preference':
        return <Star size={18} color="#007AFF" />;
      case 'visited_feedback':
        return <MessageCircle size={18} color="#FF9500" />;
      case 'personal_info':
        return <User size={18} color="#5856D6" />;
      case 'avoid':
        return <AlertCircle size={18} color="#FF3B30" />;
    }
  };

  const getMemoryTypeLabel = (type: MemoryType) => {
    switch (type) {
      case 'like':
        return 'Like';
      case 'dislike':
        return 'Dislike';
      case 'preference':
        return 'Preference';
      case 'visited_feedback':
        return 'Feedback';
      case 'personal_info':
        return 'Personal';
      case 'avoid':
        return 'Avoid';
    }
  };

  const handleAddMemory = () => {
    if (!newMemoryContent.trim()) {
      Alert.alert('Error', 'Please enter memory content');
      return;
    }

    memoryStore.addMemory({
      type: newMemoryType,
      content: newMemoryContent.trim(),
      confidence: 'high',
    });

    setNewMemoryContent('');
    setShowAddModal(false);
    Alert.alert('Success', 'Memory added successfully');
  };

  const handleDeleteMemory = (id: string, content: string) => {
    Alert.alert(
      'Delete Memory',
      `Are you sure you want to delete "${content}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => memoryStore.removeMemory(id),
        },
      ]
    );
  };

  const groupedMemories = memories.reduce((acc, memory) => {
    if (!acc[memory.type]) {
      acc[memory.type] = [];
    }
    acc[memory.type].push(memory);
    return acc;
  }, {} as Record<MemoryType, Memory[]>);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.light.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Memory</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {memories.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No memories yet</Text>
              <Text style={styles.emptySubtitle}>
                As you chat with Tomo, I'll learn your preferences and remember them for future conversations
              </Text>
              <TouchableOpacity
                style={styles.addMemoryButton}
                onPress={() => setShowAddModal(true)}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.addMemoryButtonText}>Add Memory</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.infoText}>
                These are things I remember about you. I use this information to personalize recommendations and avoid suggesting things you dislike.
              </Text>

              {Object.entries(groupedMemories).map(([type, memoryList]) => (
                <View key={type} style={styles.memorySection}>
                  <View style={styles.sectionHeader}>
                    {getMemoryIcon(type as MemoryType)}
                    <Text style={styles.sectionTitle}>
                      {getMemoryTypeLabel(type as MemoryType)}s ({memoryList.length})
                    </Text>
                  </View>

                  {memoryList.map((memory) => (
                    <View key={memory.id} style={styles.memoryCard}>
                      <View style={styles.memoryContent}>
                        <Text style={styles.memoryText}>{memory.content}</Text>
                        {memory.extractedFrom && (
                          <Text style={styles.memorySource} numberOfLines={1}>
                            From: "{memory.extractedFrom}"
                          </Text>
                        )}
                        <Text style={styles.memoryDate}>
                          {new Date(memory.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteMemory(memory.id, memory.content)}
                      >
                        <X size={18} color={colors.text.light.tertiary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ))}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Add Memory Modal */}
        {showAddModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Memory</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <X size={24} color={colors.text.light.secondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeSelector}>
                {(['like', 'dislike', 'preference', 'avoid', 'personal_info'] as MemoryType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      newMemoryType === type && styles.typeButtonActive,
                    ]}
                    onPress={() => setNewMemoryType(type)}
                  >
                    {getMemoryIcon(type)}
                    <Text
                      style={[
                        styles.typeButtonText,
                        newMemoryType === type && styles.typeButtonTextActive,
                      ]}
                    >
                      {getMemoryTypeLabel(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Content</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., loves spicy food, dislikes tuna, traveling with partner"
                placeholderTextColor={colors.text.light.tertiary}
                value={newMemoryContent}
                onChangeText={setNewMemoryContent}
                multiline
                numberOfLines={3}
                autoFocus
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setNewMemoryContent('');
                    setShowAddModal(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleAddMemory}
                >
                  <Text style={styles.saveButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.light.primary,
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.light.secondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.light.primary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.text.light.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  addMemoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 24,
    gap: spacing.xs,
  },
  addMemoryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  memorySection: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.light.primary,
  },
  memoryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memoryContent: {
    flex: 1,
  },
  memoryText: {
    fontSize: 15,
    color: colors.text.light.primary,
    marginBottom: spacing.xs,
    lineHeight: 21,
  },
  memorySource: {
    fontSize: 13,
    color: colors.text.light.tertiary,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  memoryDate: {
    fontSize: 12,
    color: colors.text.light.tertiary,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.light.primary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.light.primary,
    marginBottom: spacing.sm,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: spacing.xs,
  },
  typeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  typeButtonText: {
    fontSize: 14,
    color: colors.text.light.secondary,
  },
  typeButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text.light.primary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.light.secondary,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
