import { useAuth } from "@/services/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { MotiText, MotiView } from "moti";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { IP } from "../../constants/IP";

const COLORS = {
  bg: "#F4FBF7",
  primary: "#2E8B57",
  primaryFaint: "#E8F5E9",
  primaryDeep: "#0d3d2b",
  text: "#2C3E50",
  textLight: "#7aaa91",
  white: "#FFFFFF",
  border: "#D1D5DB",
};

type HealthPlan = {
  targetCalories: number;
  targetProtein: number;
  targetCarb?: number;
  targetFat?: number;
  aiResponse?: string;
  tips?: string[];
  mealSuggestions?: { meal: string; description: string }[];
};

const LOADING_MESSAGES = [
  "Analysing your body metrics...",
  "Calculating your TDEE...",
  "Building your macro targets...",
  "Crafting AI recommendations...",
  "Finalising your personal plan...",
];

export default function OnboardingStep2() {
  const { user, refreshProfile } = useAuth();
  const [plan, setPlan] = useState<HealthPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msgIndex, setMsgIndex] = useState(0);
  const [completing, setCompleting] = useState(false);

  // Rotate loading messages
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [loading]);

  // Poll for health plan
  useEffect(() => {
    if (!user) return;

    let attempts = 0;
    const maxAttempts = 20;

    const poll = async () => {
      try {
        const res = await fetch(
          `http://${IP}:3000/api/health-plan/${user.uid}`,
        );

        if (res.ok) {
          const data = await res.json();
          setPlan(data);
          setLoading(false);
          return;
        }

        // 404 means not ready yet — keep polling
        if (res.status === 404) {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 2000);
          } else {
            setError("Taking longer than expected. Please try again.");
            setLoading(false);
          }
          return;
        }

        // Any other error — stop
        setError("Something went wrong.");
        setLoading(false);
      } catch (e) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setError("Could not connect to server.");
          setLoading(false);
        }
      }
    };

    poll();
  }, [user]);

  const handleContinue = async () => {
    setCompleting(true);
    try {
      const response = await fetch(
        `http://${IP}:3000/api/complete-onboarding/${user?.uid}`,
        { method: "POST" },
      );
      if (response.ok) {
        await refreshProfile();
        router.replace("/(tabs)");
      }
    } catch (e) {
      console.error(e);
      setCompleting(false);
    }
  };
  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          {/* Animated leaf/pulse */}
          <MotiView
            from={{ scale: 0.9, opacity: 0.5 }}
            animate={{ scale: 1.1, opacity: 1 }}
            transition={{
              type: "timing",
              duration: 900,
              loop: true,
              repeatReverse: true,
            }}
            style={styles.pulseRing}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDeep]}
              style={styles.pulseInner}
            >
              <Text style={styles.pulseEmoji}>🌿</Text>
            </LinearGradient>
          </MotiView>

          <MotiText
            key={msgIndex}
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "timing", duration: 400 }}
            style={styles.loadingMsg}
          >
            {LOADING_MESSAGES[msgIndex]}
          </MotiText>

          <Text style={styles.loadingSubtext}>
            Your AI nutritionist is working on it...
          </Text>

          <ActivityIndicator
            color={COLORS.primary}
            size="small"
            style={{ marginTop: 24 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setError("");
              setLoading(true);
            }}
            style={styles.retryBtn}
          >
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Plan display ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 600 }}
          style={styles.header}
        >
          {/* Logo */}
          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 600 }}
            style={styles.logoWrap}
          >
            <LinearGradient
              colors={["#2db87a", "#0d3d2b"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoBox}
            >
              <Svg width={30} height={30} viewBox="0 0 30 30" fill="none">
                <Path
                  d="M15 4 C20 5 24 10 22 17 C20 24 16 26 15 26 C14 26 10 24 8 17 C6 10 10 5 15 4Z"
                  fill="rgba(255,255,255,0.25)"
                  stroke="white"
                  strokeWidth={1.5}
                />
                <Line
                  x1="15"
                  y1="5"
                  x2="15"
                  y2="25"
                  stroke="white"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  opacity={0.7}
                />
                <Path
                  d="M15 11 Q11 13 10 16"
                  stroke="white"
                  strokeWidth={1}
                  strokeLinecap="round"
                  opacity={0.6}
                  fill="none"
                />
                <Path
                  d="M15 11 Q19 13 20 16"
                  stroke="white"
                  strokeWidth={1}
                  strokeLinecap="round"
                  opacity={0.6}
                  fill="none"
                />
                <Circle cx="22" cy="7" r="2.5" fill="#a7f3d0" opacity={0.9} />
              </Svg>
            </LinearGradient>
          </MotiView>
          <Text style={styles.title}>Your Plan is Ready</Text>
          <Text style={styles.subtitle}>Powered by Gemini 2.5 Flash</Text>
        </MotiView>

        {/* Macro cards */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 600, delay: 150 }}
          style={styles.macroRow}
        >
          <MacroCard
            label="Calories"
            value={`${plan?.targetCalories}`}
            unit="kcal"
            color="#2db87a"
            delay={0}
          />
          <MacroCard
            label="Protein"
            value={`${plan?.targetProtein}`}
            unit="g"
            color="#5b8dee"
            delay={100}
          />
          {plan?.targetCarb && (
            <MacroCard
              label="Carbs"
              value={`${plan.targetCarb}`}
              unit="g"
              color="#f6a623"
              delay={200}
            />
          )}
          {plan?.targetFat && (
            <MacroCard
              label="Fat"
              value={`${plan.targetFat}`}
              unit="g"
              color="#e05555"
              delay={300}
            />
          )}
        </MotiView>

        {/* Summary */}
        {plan?.aiResponse && (
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 600, delay: 300 }}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Your AI Summary</Text>
            <Text style={styles.cardBody}>{plan.aiResponse}</Text>
          </MotiView>
        )}

        {/* Tips */}
        {plan?.tips && plan.tips.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 600, delay: 400 }}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Recommendations</Text>
            {plan.tips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Text style={styles.tipDot}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </MotiView>
        )}

        {/* Meal suggestions */}
        {plan?.mealSuggestions && plan.mealSuggestions.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 600, delay: 500 }}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Meal Ideas</Text>
            {plan.mealSuggestions.map((meal, i) => (
              <View key={i} style={styles.mealRow}>
                <Text style={styles.mealName}>{meal.meal}</Text>
                <Text style={styles.mealDesc}>{meal.description}</Text>
              </View>
            ))}
          </MotiView>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Continue button */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "spring", delay: 600 }}
        style={styles.footer}
      >
        <TouchableOpacity
          onPress={handleContinue}
          disabled={completing}
          activeOpacity={0.85}
          style={styles.continueWrap}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.continueBtn}
          >
            {completing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueBtnText}>Let's get started </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </MotiView>
    </SafeAreaView>
  );
}

// ── Macro Card ─────────────────────────────────────────────────────────────────
function MacroCard({
  label,
  value,
  unit,
  color,
  delay,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  delay: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", delay }}
      style={[styles.macroCard, { borderTopColor: color, borderTopWidth: 3 }]}
    >
      <Text style={[styles.macroValue, { color }]}>{value}</Text>
      <Text style={styles.macroUnit}>{unit}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </MotiView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: 24, paddingTop: 16 },

  // Loading
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  pulseRing: {
    width: 100,
    height: 100,
    borderRadius: 30,
    marginBottom: 40,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  pulseInner: {
    flex: 1,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseEmoji: { fontSize: 40 },
  loadingMsg: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
  },

  // Error
  errorText: {
    fontSize: 16,
    color: "#e05555",
    textAlign: "center",
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Header
  header: { alignItems: "center", marginBottom: 28, marginTop: 8 },
  headerEmoji: { fontSize: 40, marginBottom: 8 },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 6,
  },
  subtitle: { fontSize: 15, color: COLORS.textLight, textAlign: "center" },

  // Macros
  macroRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
    justifyContent: "center",
  },
  macroCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    minWidth: "44%",
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  macroValue: { fontSize: 28, fontWeight: "800" },
  macroUnit: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  macroLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
    marginTop: 4,
  },

  // Cards
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(45,184,122,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 12,
  },
  cardBody: { fontSize: 14, color: COLORS.text, lineHeight: 22 },

  // Tips
  tipRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  tipDot: { color: COLORS.primary, fontSize: 16, marginTop: 1 },
  tipText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 21 },

  // Meals
  mealRow: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(45,184,122,0.1)",
  },
  mealName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 3,
  },
  mealDesc: { fontSize: 13, color: COLORS.textLight, lineHeight: 19 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 36,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  continueWrap: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  continueBtn: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  textLight: { color: COLORS.textLight },
  logoWrap: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#2db87a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoName: {
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 22,
    fontWeight: "600",
    color: "#0d3d2b",
    letterSpacing: -0.5,
  },
  logoTag: {
    fontSize: 10,
    color: "#7aaa91",
    letterSpacing: 1.5,
    marginTop: 2,
  },
});
