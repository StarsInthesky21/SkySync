import { Component, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fontSize, radius } from "@/theme/colors";

type Props = { children: ReactNode; section: string };
type State = { hasError: boolean };

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error) {
    console.warn(`[SkySync] Error in ${this.props.section}:`, error.message);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container} accessibilityRole="alert">
          <Text style={styles.text}>This section encountered an error</Text>
          <Text style={styles.sub}>{this.props.section}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    padding: 16,
    backgroundColor: "rgba(255,111,97,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,111,97,0.15)",
    alignItems: "center",
  },
  text: { color: colors.accentDanger, fontWeight: "700", fontSize: fontSize.sm },
  sub: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 4 },
});
