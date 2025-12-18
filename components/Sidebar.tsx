import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  MessageSquare,
  MapPin,
  Calendar,
  Wallet,
  Settings,
  X,
  Trash2,
  Bell,
} from 'lucide-react-native';
import { colors, spacing, borders, shadows, typography } from '../constants/theme';
import { useConversationStore } from '../stores/useConversationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import type { Conversation } from '../types';

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
  onNavigate: (route: string) => void;
}

// Helper to group conversations by date
function groupConversationsByDate(conversations: Conversation[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: { title: string; conversations: Conversation[] }[] = [
    { title: 'Today', conversations: [] },
    { title: 'Yesterday', conversations: [] },
    { title: 'Previous 7 Days', conversations: [] },
    { title: 'Older', conversations: [] },
  ];

  conversations.forEach((conv) => {
    const convDate = new Date(conv.lastMessageAt);
    convDate.setHours(0, 0, 0, 0);

    if (convDate.getTime() >= today.getTime()) {
      groups[0].conversations.push(conv);
    } else if (convDate.getTime() >= yesterday.getTime()) {
      groups[1].conversations.push(conv);
    } else if (convDate.getTime() >= weekAgo.getTime()) {
      groups[2].conversations.push(conv);
    } else {
      groups[3].conversations.push(conv);
    }
  });

  return groups.filter((g) => g.conversations.length > 0);
}

export function Sidebar({
  visible,
  onClose,
  onNewChat,
  onSelectConversation,
  onNavigate,
}: SidebarProps) {
  const conversations = useConversationStore((state) => state.getAllConversations());
  const currentConversationId = useConversationStore((state) => state.currentConversationId);
  const deleteConversation = useConversationStore((state) => state.deleteConversation);
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const budgetStore = useBudgetStore();
  const budgetRemaining = budgetStore.remainingToday();
  const hasUnreadNotifications = useNotificationStore((state) => state.hasUnreadNotifications());

  const groupedConversations = groupConversationsByDate(conversations);

  if (!visible) return null;

  const handleConversationPress = (conversationId: string) => {
    onSelectConversation(conversationId);
    onClose();
  };

  const handleDeleteConversation = (conversationId: string) => {
    deleteConversation(conversationId);
  };

  return (
    <TouchableOpacity
      style={styles.overlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <TouchableOpacity activeOpacity={1} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left']}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Tomo</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* New Chat Button */}
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={() => {
              onNewChat();
              onClose();
            }}
            activeOpacity={0.7}
          >
            <Plus size={20} color={colors.text.primary} />
            <Text style={styles.newChatText}>New chat</Text>
          </TouchableOpacity>

          {/* Conversation History */}
          <ScrollView
            style={styles.conversationsList}
            showsVerticalScrollIndicator={false}
          >
            {groupedConversations.map((group) => (
              <View key={group.title} style={styles.conversationGroup}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                {group.conversations.map((conv) => (
                  <TouchableOpacity
                    key={conv.id}
                    style={[
                      styles.conversationItem,
                      conv.id === currentConversationId && styles.conversationItemActive,
                    ]}
                    onPress={() => handleConversationPress(conv.id)}
                    activeOpacity={0.7}
                  >
                    <MessageSquare
                      size={16}
                      color={
                        conv.id === currentConversationId
                          ? colors.accent.primary
                          : colors.text.secondary
                      }
                    />
                    <Text
                      style={[
                        styles.conversationTitle,
                        conv.id === currentConversationId && styles.conversationTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {conv.title}
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteConversation(conv.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 size={14} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {conversations.length === 0 && (
              <View style={styles.emptyState}>
                <MessageSquare size={32} color={colors.text.tertiary} />
                <Text style={styles.emptyStateText}>No conversations yet</Text>
              </View>
            )}
          </ScrollView>

          {/* Bottom Navigation */}
          <View style={styles.bottomNav}>
            {/* Location */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onNavigate('/map');
                onClose();
              }}
              activeOpacity={0.7}
            >
              <MapPin size={20} color={colors.text.secondary} />
              <Text style={styles.navItemText} numberOfLines={1}>
                {neighborhood || 'Unknown location'}
              </Text>
            </TouchableOpacity>

            {/* Itinerary */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onNavigate('/itinerary');
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Calendar size={20} color={colors.text.secondary} />
              <Text style={styles.navItemText}>My Itinerary</Text>
            </TouchableOpacity>

            {/* Notifications */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onNavigate('/notifications');
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.navItemIconContainer}>
                <Bell size={20} color={colors.text.secondary} />
                {hasUnreadNotifications && <View style={styles.notificationDot} />}
              </View>
              <Text style={styles.navItemText}>Notifications</Text>
            </TouchableOpacity>

            {/* Budget */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onNavigate('/settings');
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Wallet size={20} color={colors.text.secondary} />
              <Text style={styles.navItemText}>
                Budget: ${budgetRemaining.toFixed(0)} left
              </Text>
            </TouchableOpacity>

            {/* Settings */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onNavigate('/settings');
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Settings size={20} color={colors.text.secondary} />
              <Text style={styles.navItemText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const { width: screenWidth } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(screenWidth * 0.8, 320);

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  container: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: colors.background.secondary,
    ...shadows.lg,
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borders.radius.md,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  newChatText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
  conversationsList: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  conversationGroup: {
    marginBottom: spacing.lg,
  },
  groupTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borders.radius.md,
    marginBottom: spacing.xs,
  },
  conversationItemActive: {
    backgroundColor: colors.accent.muted,
  },
  conversationTitle: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
  },
  conversationTitleActive: {
    color: colors.accent.primary,
    fontWeight: typography.weights.medium,
  },
  deleteButton: {
    padding: spacing.xs,
    opacity: 0.6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  emptyStateText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  bottomNav: {
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borders.radius.md,
  },
  navItemText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  navItemIconContainer: {
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.status.error,
  },
});

export default Sidebar;
