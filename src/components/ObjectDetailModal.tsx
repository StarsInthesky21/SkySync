import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
let Speech: any = null;
try {
  Speech = require("expo-speech");
} catch {}
import { ObjectPreview3D } from "@/components/sky/ObjectPreview3D";
import { StoryPlayer } from "@/components/sky/StoryPlayer";
import { colors, fontSize, radius, spacing } from "@/theme/colors";
import { RenderedSkyObject, MythStory } from "@/types/sky";
import { SpaceNote } from "@/types/rooms";

type Props = {
  selectedObject?: RenderedSkyObject;
  constellationName?: string;
  story?: MythStory;
  highlightedIds: string[];
  selectedObjectNotes: SpaceNote[];
  noteInput: string;
  setNoteInput: (text: string) => void;
  onClose: () => void;
  onShare: () => void;
  onToggleHighlight: () => void;
  onAddNote: () => void;
  onFocus: () => void;
};

export function ObjectDetailModal({
  selectedObject,
  constellationName,
  story,
  highlightedIds,
  selectedObjectNotes,
  noteInput,
  setNoteInput,
  onClose,
  onShare,
  onToggleHighlight,
  onAddNote,
  onFocus,
}: Props) {
  return (
    <Modal
      visible={Boolean(selectedObject)}
      transparent
      animationType="slide"
      onRequestClose={() => {
        try {
          Speech?.stop();
        } catch {}
        onClose();
      }}
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            try {
              Speech?.stop();
            } catch {}
            onClose();
          }}
        >
          <View style={styles.modalSheet}>
            <Pressable onPress={() => {}} style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Pressable
                    style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => {
                      try {
                        Speech?.stop();
                      } catch {}
                      onClose();
                    }}
                  >
                    <Text style={styles.closeBtnText}>Close</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.shareChip, pressed && { opacity: 0.7 }]}
                    onPress={onShare}
                  >
                    <Text style={styles.shareChipText}>{"\u{1F4E4}"} Share</Text>
                  </Pressable>
                </View>

                <Text style={styles.modalTitle}>{selectedObject?.name}</Text>
                <Text style={styles.modalMeta}>
                  {selectedObject?.kind}
                  {constellationName ? ` | ${constellationName}` : ""}
                  {selectedObject?.distanceFromEarth ? ` | ${selectedObject.distanceFromEarth}` : ""}
                </Text>
                <Text style={styles.modalBody}>{selectedObject?.description}</Text>

                <ObjectPreview3D
                  color={selectedObject?.color ?? colors.accent}
                  title={selectedObject?.previewTitle}
                  description={selectedObject?.previewDescription}
                  kind={selectedObject?.kind}
                />

                <Text style={styles.modalSection}>Mythology</Text>
                <Text style={styles.modalBody}>{selectedObject?.mythologyStory}</Text>

                <Text style={styles.modalSection}>Scientific Facts</Text>
                {selectedObject?.scientificFacts.map((f, i) => (
                  <Text key={`f-${i}`} style={styles.fact}>
                    - {f}
                  </Text>
                ))}

                {story && (
                  <>
                    <Text style={styles.modalSection}>Animated Story</Text>
                    <StoryPlayer story={story} />
                  </>
                )}

                <Text style={styles.modalSection}>Shared Notes</Text>
                {selectedObjectNotes.length === 0 ? (
                  <View style={styles.emptyNotes}>
                    <Text style={styles.emptyNotesText}>No notes yet. Be the first to add one!</Text>
                  </View>
                ) : (
                  selectedObjectNotes.map((n) => (
                    <View key={n.id} style={styles.noteCard}>
                      <Text style={styles.noteAuthor}>{n.author}</Text>
                      <Text style={styles.noteText}>{n.text}</Text>
                    </View>
                  ))
                )}

                <TextInput
                  value={noteInput}
                  onChangeText={setNoteInput}
                  style={styles.input}
                  placeholder="Add a note..."
                  placeholderTextColor={colors.textDim}
                  maxLength={500}
                  accessibilityLabel="Add a shared note about this object"
                />

                <View style={styles.btnRow}>
                  <Pressable
                    style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryPressed]}
                    onPress={onToggleHighlight}
                    accessibilityRole="button"
                    accessibilityLabel={
                      selectedObject && highlightedIds.includes(selectedObject.id)
                        ? "Remove highlight from this object"
                        : "Highlight this object for room members"
                    }
                  >
                    <Text style={styles.secondaryText}>
                      {selectedObject && highlightedIds.includes(selectedObject.id)
                        ? "Unhighlight"
                        : "Highlight"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryPressed]}
                    onPress={() => {
                      if (!selectedObject) return;
                      try {
                        Speech?.stop();
                        Speech?.speak(
                          `${selectedObject.name}. ${selectedObject.distanceFromEarth}. ${selectedObject.scientificFacts.join(" ")}`,
                          { rate: 0.95, pitch: 1.0 },
                        );
                      } catch {}
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Read aloud information about ${selectedObject?.name ?? "this object"}`}
                  >
                    <Text style={styles.secondaryText}>Speak</Text>
                  </Pressable>
                </View>
                <View style={styles.btnRow}>
                  <Pressable
                    style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryPressed]}
                    onPress={onAddNote}
                    accessibilityRole="button"
                    accessibilityLabel="Save note"
                  >
                    <Text style={styles.secondaryText}>Save Note</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryPressed]}
                    onPress={onFocus}
                    accessibilityRole="button"
                    accessibilityLabel={`Zoom and focus on ${selectedObject?.name ?? "this object"}`}
                  >
                    <Text style={styles.primaryText}>Zoom Focus</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    maxHeight: "92%",
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalContent: { padding: spacing.xl, paddingBottom: 40 },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  closeBtn: {
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  closeBtnText: { color: colors.textMuted, fontWeight: "700", fontSize: fontSize.xs },
  shareChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  shareChipText: { color: colors.textMuted, fontWeight: "700", fontSize: fontSize.xs },
  modalTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "800" },
  modalMeta: { color: colors.accentWarm, marginTop: 6, textTransform: "capitalize", fontSize: fontSize.sm },
  modalBody: { color: colors.textMuted, lineHeight: 22, marginTop: 10, fontSize: fontSize.sm },
  modalSection: { color: colors.text, fontWeight: "800", marginTop: 18, fontSize: fontSize.base },
  fact: { color: colors.textMuted, marginTop: 6, lineHeight: 20, fontSize: fontSize.sm },
  emptyNotes: {
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.02)",
    marginTop: 4,
  },
  emptyNotesText: { color: colors.textDim, fontStyle: "italic", fontSize: fontSize.xs, textAlign: "center" },
  noteCard: {
    borderRadius: radius.md,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.accentWarm,
  },
  noteAuthor: { color: colors.accentWarm, fontWeight: "700", fontSize: fontSize.xs },
  noteText: { color: colors.text, marginTop: 3, lineHeight: 19, fontSize: fontSize.sm },
  input: {
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: colors.text,
    fontSize: fontSize.sm,
    marginTop: 8,
  },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  primaryBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
  },
  primaryPressed: { backgroundColor: colors.pressedPrimary },
  primaryText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.sm },
  secondaryBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
  },
  secondaryPressed: { backgroundColor: colors.pressedSecondary },
  secondaryText: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
});
