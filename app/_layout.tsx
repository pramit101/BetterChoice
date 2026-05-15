import { AuthProvider, useAuth } from "@/services/AuthContext";
import { ThemeProvider, useTheme } from "@/services/ThemeContext";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import "react-native-reanimated";
import "../global.css";

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayoutNav() {
  const {
    user,
    isLoading,
    profile,
    refreshProfile,
    serverError,
    clearServerError,
  } = useAuth();
  const segments = useSegments();
  const { dark } = useTheme();
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const handleRetry = async () => {
    setRetrying(true);
    try {
      clearServerError();
      await refreshProfile();
    } catch (e) {
      // stay on error screen, don't crash
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;
    if (serverError) return;
    const inAuthGroup = segments[0] === "auth";
    const inOnboardingGroup = segments[0] === "onboarding";

    if (!user) {
      // 1. If not logged in, force to auth
      if (!inAuthGroup) {
        router.replace("/auth/SignUp");
      }
    } else if (user && !profile?.isOnboarded && !inOnboardingGroup) {
      // 2. If logged in but not onboarded, force to onboarding
      router.replace("/onboarding/step1");
    } else if (
      user &&
      profile?.isOnboarded &&
      (inAuthGroup || inOnboardingGroup)
    ) {
      // 3. If logged in and onboarded, force to main app
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments, profile]);
  if (isLoading) return null;
  if (serverError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F4FBF7",
          padding: 32,
        }}
      >
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🔌</Text>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: "#0a2318",
            marginBottom: 8,
          }}
        >
          Server Unreachable
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#7aaa91",
            textAlign: "center",
            lineHeight: 21,
            marginBottom: 32,
          }}
        >
          Could not connect to the BetterChoice server. Make sure your backend
          is running.
        </Text>
        <TouchableOpacity
          onPress={handleRetry}
          disabled={retrying}
          style={{
            backgroundColor: "#2db87a",
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 14,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="Screens" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={dark ? "light" : "dark"} />
    </>
  );
}
SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}
