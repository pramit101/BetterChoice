import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/services/ThemeContext";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { useAuth } from "../../services/AuthContext";

export default function TabLayout() {
  const { dark } = useTheme();
  const { user } = useAuth();
  const colorScheme = dark ? "dark" : "light";
  const theme = Colors[colorScheme];
  if (!user) return <Redirect href="../auth/SignIn" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: dark
            ? "rgba(45,184,122,0.2)"
            : "rgba(45,184,122,0.12)",
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="gearshape.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
