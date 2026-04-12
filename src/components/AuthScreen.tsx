import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useAuth } from "@/providers/AuthProvider";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

type AuthMode = "signIn" | "createAccount";

type Props = {
  /** Called when the user wants to close this screen */
  onClose: () => void;
  /** Initial mode to display */
  initialMode?: AuthMode;
};

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim())) return "Please enter a valid email address";
  return null;
}

function validatePassword(password: string, isCreate: boolean): string | null {
  if (!password) return "Password is required";
  if (isCreate && password.length < 6) return "Password must be at least 6 characters";
  return null;
}

function friendlyError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (
    msg.includes("auth/user-not-found") ||
    msg.includes("auth/wrong-password") ||
    msg.includes("auth/invalid-credential")
  )
    return "Invalid email or password. Please try again.";
  if (msg.includes("auth/email-already-in-use"))
    return "An account with this email already exists. Try signing in instead.";
  if (msg.includes("auth/weak-password")) return "Password is too weak. Use at least 6 characters.";
  if (msg.includes("auth/invalid-email")) return "Please enter a valid email address.";
  if (msg.includes("auth/too-many-requests")) return "Too many attempts. Please try again later.";
  if (msg.includes("auth/network-request-failed")) return "Network error. Check your internet connection.";
  return msg || "Something went wrong. Please try again.";
}

export function AuthScreen({ onClose, initialMode = "signIn" }: Props) {
  const { signInWithEmail, createAccount, upgradeToEmail, user } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const isCreate = mode === "createAccount";

  function validateFields(): boolean {
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password, isCreate);
    setFieldErrors({ email: emailErr ?? undefined, password: passErr ?? undefined });
    return !emailErr && !passErr;
  }

  async function handleSubmit() {
    Keyboard.dismiss();
    setError(null);
    if (!validateFields()) return;

    setLoading(true);
    try {
      if (isCreate) {
        if (user?.isAnonymous) {
          await upgradeToEmail(email.trim(), password);
        } else {
          await createAccount(email.trim(), password);
        }
      } else {
        await signInWithEmail(email.trim(), password);
      }
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setMode(isCreate ? "signIn" : "createAccount");
    setError(null);
    setFieldErrors({});
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.brand}>SkySync</Text>
            <Text style={styles.title}>{isCreate ? "Create Account" : "Sign In"}</Text>
            <Text style={styles.subtitle}>
              {isCreate ? "Save your progress and sync across devices" : "Welcome back, stargazer"}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, fieldErrors.email ? styles.inputError : null]}
                placeholder="you@example.com"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
                }}
                editable={!loading}
              />
              {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, fieldErrors.password ? styles.inputError : null]}
                placeholder={isCreate ? "At least 6 characters" : "Your password"}
                placeholderTextColor={colors.textDim}
                secureTextEntry
                textContentType={isCreate ? "newPassword" : "password"}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
                }}
                onSubmitEditing={handleSubmit}
                editable={!loading}
              />
              {fieldErrors.password ? <Text style={styles.fieldError}>{fieldErrors.password}</Text> : null}
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { backgroundColor: colors.pressedPrimary },
                loading && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={styles.primaryBtnText}>{isCreate ? "Create Account" : "Sign In"}</Text>
              )}
            </Pressable>
          </View>

          {/* Toggle mode */}
          <Pressable onPress={toggleMode} style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              {isCreate ? "Already have an account? " : "Don't have an account? "}
            </Text>
            <Text style={styles.toggleLink}>{isCreate ? "Sign In" : "Create Account"}</Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Guest */}
          <Pressable
            style={({ pressed }) => [
              styles.guestBtn,
              pressed && { backgroundColor: colors.pressedSecondary },
            ]}
            onPress={onClose}
          >
            <Text style={styles.guestBtnText}>Continue as Guest</Text>
          </Pressable>

          {/* Close */}
          <Pressable onPress={onClose} style={styles.closeRow}>
            <Text style={styles.closeText}>Back</Text>
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  brand: {
    color: colors.accent,
    fontSize: fontSize.hero,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    textAlign: "center",
  },
  form: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginLeft: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    color: colors.text,
    fontSize: fontSize.base,
  },
  inputError: {
    borderColor: colors.accentDanger,
  },
  fieldError: {
    color: colors.accentDanger,
    fontSize: fontSize.xs,
    marginLeft: spacing.xs,
  },
  errorBox: {
    backgroundColor: "rgba(255,111,97,0.12)",
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,111,97,0.25)",
  },
  errorText: {
    color: colors.accentDanger,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    color: colors.onAccent,
    fontSize: fontSize.md,
    fontWeight: "800",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  toggleText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  toggleLink: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.xl,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textDim,
    fontSize: fontSize.sm,
  },
  guestBtn: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  guestBtnText: {
    color: colors.text,
    fontSize: fontSize.base,
    fontWeight: "700",
  },
  closeRow: {
    alignItems: "center",
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  closeText: {
    color: colors.textDim,
    fontSize: fontSize.sm,
  },
});
