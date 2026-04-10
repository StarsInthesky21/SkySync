import { Tabs } from "expo-router";
import { Text, StyleSheet, View } from "react-native";
import { colors, fontSize, radius } from "@/theme/colors";

type TabIconProps = {
  icon: string;
  focused: boolean;
};

function TabIcon({ icon, focused }: TabIconProps) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.icon, focused && styles.iconActive]}>{icon}</Text>
      {focused && <View style={styles.indicator} />}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Sky",
          tabBarIcon: ({ focused }) => <TabIcon icon={"\u2B50"} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ focused }) => <TabIcon icon={"\u{1F52D}"} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: "Social",
          tabBarIcon: ({ focused }) => <TabIcon icon={"\u{1F4AC}"} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarIcon: ({ focused }) => <TabIcon icon={"\u{1F4D6}"} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon icon={"\u{1F464}"} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bgRaised,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 20,
    paddingTop: 8,
    height: 75,
    elevation: 0,
    shadowOpacity: 0,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  iconWrap: {
    alignItems: "center",
    position: "relative",
  },
  icon: {
    fontSize: 20,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
  indicator: {
    position: "absolute",
    top: -8,
    width: 24,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
});
