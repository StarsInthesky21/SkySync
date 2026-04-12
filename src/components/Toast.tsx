import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

type ToastType = "success" | "error" | "info" | "warning";

type ToastMessage = {
  id: number;
  text: string;
  type: ToastType;
};

type ToastContextValue = {
  show: (text: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let toastId = 0;

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: { bg: "rgba(102,224,163,0.12)", border: "rgba(102,224,163,0.3)", text: colors.accentSuccess },
  error: { bg: "rgba(255,111,97,0.12)", border: "rgba(255,111,97,0.3)", text: colors.accentDanger },
  info: { bg: "rgba(100,181,246,0.12)", border: "rgba(100,181,246,0.3)", text: colors.accentInfo },
  warning: { bg: "rgba(255,177,95,0.12)", border: "rgba(255,177,95,0.3)", text: colors.accentWarm },
};

const TOAST_ICONS: Record<ToastType, string> = {
  success: "\u2713",
  error: "\u2717",
  info: "\u24D8",
  warning: "\u26A0",
};

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const scheme = TOAST_COLORS[toast.type];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start(() => onDismiss(toast.id));
    }, 3000);

    return () => clearTimeout(timer);
  }, [opacity, translateY, toast.id, onDismiss]);

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: scheme.bg, borderColor: scheme.border, opacity, transform: [{ translateY }] },
      ]}
    >
      <Pressable style={styles.toastInner} onPress={() => onDismiss(toast.id)} accessibilityRole="alert">
        <Text style={[styles.toastIcon, { color: scheme.text }]}>{TOAST_ICONS[toast.type]}</Text>
        <Text style={[styles.toastText, { color: scheme.text }]} numberOfLines={2}>
          {toast.text}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const show = useCallback((text: string, type: ToastType = "info") => {
    toastId += 1;
    const newToast: ToastMessage = { id: toastId, text, type };
    setToasts((prev) => [...prev.slice(-2), newToast]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    alignItems: "center",
    gap: 8,
  },
  toast: {
    width: "100%",
    maxWidth: 400,
    borderRadius: radius.md,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  toastIcon: {
    fontSize: fontSize.md,
    fontWeight: "800",
  },
  toastText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: "600",
    lineHeight: 18,
  },
});
