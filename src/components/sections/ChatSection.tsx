import { memo, useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/colors";
import { ChatMessage } from "@/types/rooms";

type Props = {
  title: string;
  messages: ChatMessage[];
  currentUsername: string;
  onSend: (text: string) => void | Promise<void>;
  placeholder?: string;
};

const ChatBubble = memo(function ChatBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  return (
    <View
      style={[styles.bubble, isOwn && styles.bubbleOwn]}
      accessibilityLabel={`${message.author} said: ${message.text}`}
    >
      <Text style={styles.author}>
        {message.author} <Text style={styles.time}>{message.timestampLabel}</Text>
      </Text>
      <Text style={styles.text}>{message.text}</Text>
    </View>
  );
});

export function ChatSection({ title, messages, currentUsername, onSend, placeholder }: Props) {
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  }, [input, onSend]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatBubble message={item} isOwn={item.author === currentUsername} />
    ),
    [currentUsername],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {messages.length === 0 && <Text style={styles.empty}>No messages yet</Text>}
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          style={styles.input}
          placeholder={placeholder ?? "Message..."}
          placeholderTextColor={colors.textDim}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          maxLength={500}
          accessibilityLabel={`Type a message for ${title}`}
        />
        <Pressable
          style={({ pressed }) => [styles.sendBtn, pressed && styles.sendBtnPressed]}
          onPress={handleSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: "800", marginBottom: 4 },
  empty: { color: colors.textDim, fontStyle: "italic", fontSize: fontSize.xs, marginTop: 4 },
  list: { maxHeight: 280 },
  bubble: {
    borderRadius: radius.lg,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.accentWarm,
  },
  bubbleOwn: { borderLeftColor: colors.accent, backgroundColor: "rgba(115,251,211,0.04)" },
  author: { color: colors.accentWarm, fontWeight: "700", fontSize: fontSize.xs },
  time: { color: colors.textDim, fontWeight: "400" },
  text: { color: colors.text, marginTop: 3, lineHeight: 19, fontSize: fontSize.sm },
  inputRow: { flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" },
  input: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: fontSize.sm,
  },
  sendBtn: {
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.accent,
  },
  sendBtnPressed: { backgroundColor: colors.pressedPrimary },
  sendText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.sm },
});
