import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, radius } from "@/theme/colors";

export type TabId = "sky" | "explore" | "social" | "learn" | "profile";

type Tab = {
  id: TabId;
  label: string;
  icon: string;
};

const TABS: Tab[] = [
  { id: "sky", label: "Sky", icon: "\u2B50" },
  { id: "explore", label: "Explore", icon: "\u{1F52D}" },
  { id: "social", label: "Social", icon: "\u{1F4AC}" },
  { id: "learn", label: "Learn", icon: "\u{1F4D6}" },
  { id: "profile", label: "Profile", icon: "\u{1F464}" },
];

type Props = {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  unreadCount?: number;
};

export const TabBar = memo(function TabBar({ activeTab, onChangeTab, unreadCount = 0 }: Props) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const showBadge = tab.id === "social" && unreadCount > 0;
        return (
          <Pressable
            key={tab.id}
            style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}
            onPress={() => onChangeTab(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <View style={styles.iconWrap}>
              <Text style={[styles.icon, isActive && styles.iconActive]}>{tab.icon}</Text>
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
            {isActive && <View style={styles.indicator} />}
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.bgRaised,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
    position: "relative",
  },
  iconWrap: {
    position: "relative",
  },
  icon: {
    fontSize: 20,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: "600",
    marginTop: 2,
  },
  labelActive: {
    color: colors.accent,
    fontWeight: "800",
  },
  indicator: {
    position: "absolute",
    top: -8,
    width: 24,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignSelf: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.accentDanger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
});
