import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle, Trash2, Plus } from 'lucide-react-native';
import { colors, spacing } from '../constants/theme';
import { useConversationStore } from '../stores/useConversationStore';

export default function ConversationsScreen() {
  const router = useRouter();
  const conversationStore = useConversationStore();
  const conversations = conversationStore.getAllConversations();
  const currentConversationId = conversationStore.currentConversationId;

  const handleSelectConversation = (conversationId: string) => {
    conversationStore.switchConversation(conversationId);
    router.back();
  };

  const handleNewConversation = () => {
    conversationStore.startNewConversation();
    router.back();
  };

  const handleDeleteConversation = (conversationId: string, title: string) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => conversationStore.deleteConversation(conversationId),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.light.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Conversations</Text>
          <TouchableOpacity
            style={styles.newButton}
            onPress={handleNewConversation}
          >
            <Plus size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Conversations List */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {conversations.length === 0 ? (
            <View style={styles.emptyState}>
              <MessageCircle size={48} color={colors.text.light.tertiary} />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                Start chatting with Tomo to create your first conversation
              </Text>
            </View>
          ) : (
            conversations.map((conv) => (
              <TouchableOpacity
                key={conv.id}
                style={[
                  styles.conversationCard,
                  conv.id === currentConversationId && styles.activeConversation,
                ]}
                onPress={() => handleSelectConversation(conv.id)}
                activeOpacity={0.7}
              >
                <View style={styles.conversationIcon}>
                  <MessageCircle
                    size={20}
                    color={conv.id === currentConversationId ? '#007AFF' : colors.text.light.secondary}
                  />
                </View>

                <View style={styles.conversationInfo}>
                  <Text
                    style={[
                      styles.conversationTitle,
                      conv.id === currentConversationId && styles.activeTitle,
                    ]}
                    numberOfLines={1}
                  >
                    {conv.title}
                  </Text>

                  <View style={styles.conversationMeta}>
                    {conv.location && (
                      <Text style={styles.metaText} numberOfLines={1}>
                        {conv.location}
                      </Text>
                    )}
                    <Text style={styles.metaText}>
                      {conv.messageCount} {conv.messageCount === 1 ? 'message' : 'messages'}
                    </Text>
                    <Text style={styles.metaText}>
                      {formatDate(conv.lastMessageAt)}
                    </Text>
                  </View>

                  {conv.summary && (
                    <Text style={styles.conversationSummary} numberOfLines={2}>
                      {conv.summary}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteConversation(conv.id, conv.title)}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <Trash2 size={18} color={colors.text.light.tertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function formatDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  newButton: {
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
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.text.light.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
    lineHeight: 22,
  },
  conversationCard: {
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
  activeConversation: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  conversationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.light.primary,
    marginBottom: 4,
  },
  activeTitle: {
    color: '#007AFF',
  },
  conversationMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  metaText: {
    fontSize: 13,
    color: colors.text.light.secondary,
  },
  conversationSummary: {
    fontSize: 14,
    color: colors.text.light.secondary,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  deleteButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
});
