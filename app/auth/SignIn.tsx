import { useTheme } from "@/services/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { MotiView } from "moti";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
import { signIn } from "../../services/authprovider";

const { width } = Dimensions.get("window");

export default function SignInScreen() {
  const { dark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const passwordRef = useRef<TextInput>(null);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace("../(tabs)");
    } catch (e: any) {
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const friendlyError = (code: string) => {
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "Incorrect email or password.";
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again later.";
      default:
        return "Something went wrong. Please try again.";
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, dark && styles.rootDark]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Background blobs */}
        <View style={[styles.blob1, dark && styles.blob1Dark]} />
        <View style={[styles.blob2, dark && styles.blob2Dark]} />

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
          <Text style={[styles.logoName, dark && styles.logoNameDark]}>
            BetterChoice
          </Text>
          <Text style={[styles.logoTag, dark && styles.logoTagDark]}>
            AI NUTRITION & MACROS
          </Text>
        </MotiView>

        {/* Card */}
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 600, delay: 100 }}
          style={[styles.card, dark && styles.cardDark]}
        >
          <Text style={[styles.heading, dark && styles.headingDark]}>
            Welcome back
          </Text>
          <Text style={[styles.subheading, dark && styles.subheadingDark]}>
            Your macros missed you.
          </Text>

          {/* Email */}
          <Text style={[styles.label, dark && styles.labelDark]}>EMAIL</Text>
          <TextInput
            style={[styles.input, dark && styles.inputDark]}
            placeholder="you@example.com"
            placeholderTextColor={dark ? "#4a7a61" : "#7aaa91"}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          {/* Password */}
          <Text style={[styles.label, dark && styles.labelDark]}>PASSWORD</Text>
          <TextInput
            ref={passwordRef}
            style={[styles.input, dark && styles.inputDark]}
            placeholder="••••••••"
            placeholderTextColor={dark ? "#4a7a61" : "#7aaa91"}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSignIn}
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

          {/* Sign in button */}
          <TouchableOpacity
            onPress={handleSignIn}
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
                <Text style={styles.btnText}>Sign in</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View
              style={[styles.dividerLine, dark && styles.dividerLineDark]}
            />
            <Text style={[styles.dividerText, dark && styles.dividerTextDark]}>
              or
            </Text>
            <View
              style={[styles.dividerLine, dark && styles.dividerLineDark]}
            />
          </View>

          {/* Switch to sign up */}
          <TouchableOpacity
            onPress={() => router.push("../auth/SignUp")}
            style={styles.switchBtn}
            activeOpacity={0.7}
          >
            <Text style={[styles.switchText, dark && styles.switchTextDark]}>
              Don't have an account?{" "}
              <Text style={styles.switchLink}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </MotiView>

        <Text style={[styles.legal, dark && styles.legalDark]}>
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
  rootDark: {
    backgroundColor: "#081410",
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
  blob1Dark: {
    opacity: 0.16,
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
  blob2Dark: {
    opacity: 0.14,
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
  logoNameDark: {
    color: "#e0f5ec",
  },
  logoTag: {
    fontSize: 10,
    color: "#7aaa91",
    letterSpacing: 1.5,
    marginTop: 2,
  },
  logoTagDark: {
    color: "#4a7a61",
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
  cardDark: {
    backgroundColor: "#0f2018",
    borderColor: "rgba(45,184,122,0.2)",
    shadowOpacity: 0.25,
  },
  heading: {
    fontSize: 26,
    fontWeight: "600",
    color: "#0a2318",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headingDark: {
    color: "#e0f5ec",
  },
  subheading: {
    fontSize: 14,
    color: "#7aaa91",
    marginBottom: 24,
  },
  subheadingDark: {
    color: "#8fc1a8",
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: "#3d6653",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 4,
  },
  labelDark: {
    color: "#8fc1a8",
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
  inputDark: {
    backgroundColor: "#0a1a10",
    borderColor: "rgba(45,184,122,0.25)",
    color: "#e0f5ec",
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
  dividerLineDark: {
    backgroundColor: "rgba(45,184,122,0.2)",
  },
  dividerText: {
    fontSize: 12,
    color: "#7aaa91",
  },
  dividerTextDark: {
    color: "#4a7a61",
  },
  switchBtn: {
    alignItems: "center",
  },
  switchText: {
    fontSize: 14,
    color: "#7aaa91",
  },
  switchTextDark: {
    color: "#8fc1a8",
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
  legalDark: {
    color: "#4a7a61",
  },
  legalLink: {
    color: "#2db87a",
  },
});
