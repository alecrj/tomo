import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Send } from 'lucide-react-native';
import { spacing, colors, borders, typography, shadows } from '../constants/theme';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Ask me anything...',
}: ChatInputProps) {
  return (
    <View style={[styles.container, shadows.lg]}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.light.tertiary}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={onSubmit}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !value.trim() && styles.sendButtonDisabled,
          ]}
          onPress={onSubmit}
          activeOpacity={0.7}
          disabled={!value.trim()}
        >
          <Send
            size={20}
            color={value.trim() ? colors.surface.modal : colors.text.light.tertiary}
            strokeWidth={2}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface.modal,
    borderTopWidth: borders.width.hairline,
    borderTopColor: colors.surface.input,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface.input,
    borderRadius: borders.radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.regular,
    color: colors.text.light.primary,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: borders.radius.full,
    backgroundColor: colors.interactive.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surface.input,
  },
});

export default ChatInput;
