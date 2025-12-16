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
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../utils/haptics';
import { colors, spacing, borders, shadows } from '../constants/theme';
import { useConversationStore } from '../stores/useConversationStore';

export default function ConversationsScreen() {
  const router = useRouter();
  const conversationStore = useConversationStore();
  const conversations = conversationStore.getAllConversations();
  const currentConversationId = conversationStore.currentConversationId;

  const handleSelectConversation = (conversationId: string) => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    conversationStore.switchConversation(conversationId);
    router.back();
  };

  const handleNewConversation = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    conversationStore.startNewConversation();
    router.back();
  };

  const handleDeleteConversation = (conversationId: string, title: string) => {
    safeHaptics.notification(NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            safeHaptics.notification(NotificationFeedbackType.Success);
            conversationStore.deleteConversation(conversationId);
          },
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
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Conversations</Text>
          <TouchableOpacity
            style={styles.newButton}
            onPress={handleNewConversation}
          >
            <Plus size={24} color={colors.accent.primary} />
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
              <MessageCircle size={48} color={colors.text.tertiary} />
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
                <View style={[
                  styles.conversationIcon,
                  conv.id === currentConversationId && styles.activeIcon,
                ]}>
                  <MessageCircle
                    size={20}
                    color={conv.id === currentConversationId ? colors.accent.primary : colors.text.secondary}
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
                  <Trash2 size={18} color={colors.status.error} />
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
    backgroundColor: colors.background.primary,
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
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
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
    color: colors.text.primary,
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
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
    lineHeight: 22,
  },
  conversationCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.muted,
    ...shadows.sm,
  },
  activeConversation: {
    borderWidth: 2,
    borderColor: colors.accent.primary,
  },
  conversationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  activeIcon: {
    backgroundColor: colors.accent.muted,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  activeTitle: {
    color: colors.accent.primary,
  },
  conversationMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  metaText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  conversationSummary: {
    fontSize: 14,
    color: colors.text.secondary,
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
