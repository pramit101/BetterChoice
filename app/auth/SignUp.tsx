import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { MotiView } from "moti";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { signUp } from "../../services/authprovider";

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signUp(email, password, name);
      router.replace("../onboarding/step1");
    } catch (e: any) {
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const friendlyError = (code: string) => {
    switch (code) {
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      default:
        return "Something went wrong. Please try again.";
    }
  };

  const pills = ["Macro tracking", "AI goals", "Protein scanner"];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Background blobs */}
        <View style={styles.blob1} />
        <View style={styles.blob2} />

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
          <Text style={styles.logoName}>BetterChoice</Text>
          <Text style={styles.logoTag}>AI NUTRITION & MACROS</Text>
        </MotiView>

        {/* Card */}
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 600, delay: 100 }}
          style={styles.card}
        >
          <Text style={styles.heading}>Start fresh</Text>
          <Text style={styles.subheading}>AI-powered goals, real results.</Text>

          {/* Feature pills */}
          <View style={styles.pillRow}>
            {pills.map((pill, i) => (
              <MotiView
                key={pill}
                from={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", delay: 200 + i * 80 }}
                style={styles.pill}
              >
                <View style={styles.pillDot} />
                <Text style={styles.pillText}>{pill}</Text>
              </MotiView>
            ))}
          </View>

          {/* Name */}
          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="Alex Johnson"
            placeholderTextColor="#7aaa91"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />

          {/* Email */}
          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            ref={emailRef}
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#7aaa91"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          {/* Password */}
          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            ref={passwordRef}
            style={styles.input}
            placeholder="Min. 6 characters"
            placeholderTextColor="#7aaa91"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSignUp}
          />

          {/* Error */}
          {error ? (
            <MotiView
              from={{ opacity: 0, translateY: -6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 250 }}
            >
              <Text style={styles.error}>{error}</Text>
            </MotiView>
          ) : null}

          {/* Sign up button */}
          <TouchableOpacity
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
            style={styles.btnWrap}
          >
            <LinearGradient
              colors={["#2db87a", "#0d3d2b"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Create account</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Switch to sign in */}
          <TouchableOpacity
            onPress={() => router.push("../auth/SignIn")}
            style={styles.switchBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.switchText}>
              Already have an account?{" "}
              <Text style={styles.switchLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </MotiView>

        <Text style={styles.legal}>
          By continuing you agree to our{" "}
          <Text style={styles.legalLink}>Terms</Text> &{" "}
          <Text style={styles.legalLink}>Privacy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fafdf8",
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  blob1: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#2db87a",
    opacity: 0.12,
    top: -60,
    right: -60,
  },
  blob2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#6ee7b0",
    opacity: 0.12,
    bottom: 40,
    left: -60,
  },
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
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 28,
    padding: 32,
    borderWidth: 1,
    borderColor: "rgba(45,184,122,0.15)",
    shadowColor: "#0d3d2b",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 6,
  },
  heading: {
    fontSize: 26,
    fontWeight: "600",
    color: "#0a2318",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: "#7aaa91",
    marginBottom: 16,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#e8faf2",
    borderRadius: 20,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2db87a",
  },
  pillText: {
    fontSize: 11,
    color: "#1a6644",
    fontWeight: "500",
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: "#3d6653",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#e8faf2",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(45,184,122,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#0a2318",
    marginBottom: 14,
  },
  error: {
    color: "#e05555",
    fontSize: 13,
    marginBottom: 10,
    marginTop: -4,
  },
  btnWrap: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 4,
    shadowColor: "#2db87a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  btn: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(45,184,122,0.15)",
  },
  dividerText: {
    fontSize: 12,
    color: "#7aaa91",
  },
  switchBtn: {
    alignItems: "center",
  },
  switchText: {
    fontSize: 14,
    color: "#7aaa91",
  },
  switchLink: {
    color: "#2db87a",
    fontWeight: "600",
  },
  legal: {
    marginTop: 24,
    fontSize: 12,
    color: "#7aaa91",
    textAlign: "center",
  },
  legalLink: {
    color: "#2db87a",
  },
});
