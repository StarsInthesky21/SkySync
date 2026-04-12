import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/providers/AuthProvider";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

type Props = {
  /** Open the full AuthScreen for sign-in or create-account */
  onOpenAuth: (mode: "signIn" | "createAccount") => void;
};

export function AuthUpgradeCard({ onOpenAuth }: Props) {
  const { upgradeToEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleUpgrade() {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await upgradeToEmail(email.trim(), password);
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("auth/email-already-in-use")) {
        setError("This email is already in use. Try signing in instead.");
      } else {
        setError("Could not create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <View style={styles.card}>
        <Text style={styles.successText}>Account created! Your progress is now saved.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Save Your Progress</Text>
      <Text style={styles.description}>
        Create an account to sync your discoveries, streaks, and challenges across devices.
      </Text>

      <View style={styles.fields}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setError(null);
          }}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (6+ characters)"
          placeholderTextColor={colors.textDim}
          secureTextEntry
          textContentType="newPassword"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setError(null);
          }}
          onSubmitEditing={handleUpgrade}
          editable={!loading}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.upgradeBtn,
          pressed && { backgroundColor: colors.pressedPrimary },
          loading && { opacity: 0.7 },
        ]}
        onPress={handleUpgrade}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.onAccent} size="small" />
        ) : (
          <Text style={styles.upgradeBtnText}>Create Account</Text>
        )}
      </Pressable>

      <Pressable onPress={() => onOpenAuth("signIn")} style={styles.linkRow}>
        <Text style={styles.linkText}>
          Already have an account? <Text style={styles.linkAccent}>Sign In</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderFocus,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  heading: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  description: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  fields: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.bgRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.sm,
  },
  error: {
    color: colors.accentDanger,
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
  },
  successText: {
    color: colors.accentSuccess,
    fontSize: fontSize.base,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
  upgradeBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  upgradeBtnText: {
    color: colors.onAccent,
    fontSize: fontSize.base,
    fontWeight: "800",
  },
  linkRow: {
    alignItems: "center",
    marginTop: spacing.md,
    padding: spacing.xs,
  },
  linkText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  linkAccent: {
    color: colors.accent,
    fontWeight: "700",
  },
});
