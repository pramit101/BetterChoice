import { useAuth } from "@/services/AuthContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { Activity, Dumbbell, Flame, Scale } from "lucide-react-native";
import { MotiText, MotiView } from "moti";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IP } from "../../constants/IP";
// A 'fresh' green palette
const COLORS = {
  bg: "#F4FBF7",
  primary: "#2E8B57", // Sea Green
  primaryFaint: "#E8F5E9",
  text: "#2C3E50",
  white: "#FFFFFF",
  border: "#D1D5DB",
};

const GOALS = [
  { label: "Lose Weight", value: "lose", icon: Flame },
  { label: "Build Muscle", value: "build", icon: Dumbbell },
  { label: "Gain Weight", value: "gain", icon: Scale },
  { label: "Maintain", value: "maintain", icon: Activity },
];

const GENDERS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

export default function OnboardingStep1() {
  const { user, refreshProfile } = useAuth();
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState("");
  const [weightGain, setWeightGain] = useState(false);
  const [weightLoss, setWeightLoss] = useState(false);
  const [Gain, setGain] = useState("");
  const [Loss, setLoss] = useState("");
  const [targetDate, setTargetDate] = useState(new Date());

  const firstName = user?.displayName
    ? user.displayName.split(" ")[0]
    : "Friend";
  // Crucial "Secret Sauce" Data Point: Activity Level!
  // AI cannot calculate calories accurately without knowing BMR/TDEE.
  if (!user || !user.displayName) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }
  const ACTIVITIES = [
    { label: "Sedentary (Little to no exercise)", value: "sedentary" },
    { label: "Lightly Active (1-3 days/week)", value: "lightly_active" },
    { label: "Moderately Active (3-5 days/week)", value: "moderately_active" },
    { label: "Very Active (6-7 days/week)", value: "very_active" },
  ];
  const handleGoal = (item: string) => {
    setGoal(item);
    if (item == "lose") {
      setGain("");
      setWeightLoss(true);
      setWeightGain(false);
    } else if (item == "gain") {
      setLoss("");
      setWeightGain(true);
      setWeightLoss(false);
    } else {
      setLoss("");
      setGain("");
      setWeightGain(false);
      setWeightLoss(false);
    }
  };
  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTargetDate(selectedDate);
    }
  };
  const handleComplete = async () => {
    // Validate inputs
    if (
      !age ||
      !weight ||
      !goal ||
      !activityLevel ||
      !gender ||
      !height ||
      !targetDate ||
      (weightGain && !Gain) ||
      (weightLoss && !Loss)
    ) {
      Alert.alert(
        "Hold On!",
        "Please fill out all the fields so the AI can build your perfect plan.",
      );
      return;
    }

    if (weightGain) {
      if (Gain <= weight) {
        Alert.alert(
          "Weight Error",
          "Your target weight gain is less than the current weight! Please fix it.",
        );
        return;
      }
    } else if (weightLoss) {
      if (Loss >= weight) {
        Alert.alert(
          "Weight Error",
          "Your target weight loss is more than the current weight! Please fix it.",
        );
        return;
      }
    }
    if (targetDate) {
      const today = new Date();
      let weightDiff = 0;
      if (weightGain) {
        weightDiff = Number(Gain) - Number(weight);
      } else if (weightLoss) {
        weightDiff = Number(weight) - Number(Loss);
      }

      const msPerWeek = 1000 * 60 * 60 * 24 * 7;
      const weeksDifference =
        (targetDate.getTime() - today.getTime()) / msPerWeek;

      if (weightGain || weightLoss) {
        const ratePerWeek = weightDiff / weeksDifference;

        if (weeksDifference < 2) {
          alert(
            "Please give yourself at least 2 weeks to see healthy progress!",
          );
          return;
        }

        if (ratePerWeek > 1.2) {
          alert(
            `Losing or gaining ${ratePerWeek.toFixed(1)}kg per week is too aggressive. Please pick a later date for a safer transition.`,
          );
          return;
        }

        if (ratePerWeek > 2) {
          alert(
            "This goal is physically unsafe. Science suggests a maximum of 1kg per week for long-term health.",
          );
          return;
        }
      } else {
      }
    }
    // 1. Prepare the data payload for the AI and Prisma
    const onboardingData = {
      age: parseInt(age, 10),
      weight: parseFloat(weight),
      goal,
      activityLevel,
      gender,
      targetDate: targetDate.toISOString(),
      Gain,
      Loss,
      height: parseFloat(height),
    };

    if (!user) return;

    router.push("/onboarding/step2");
    try {
      const response = await fetch(`http://${IP}:3000/api/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
          name: user.displayName,
          ...onboardingData,
        }),
      });
    } catch (error) {
      console.error("Submit failed", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Animation */}
          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 1000 }}
            style={styles.header}
          >
            <MotiText style={styles.title}>Welcome, {firstName}!</MotiText>
            <Text style={styles.subtitle}>
              Build your ideal plan under 30 seconds
            </Text>
          </MotiView>

          {/* Input Fields */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 1000, delay: 300 }}
            style={styles.form}
          >
            <Text style={styles.label}>Your Age</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 28"
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              placeholderTextColor="#A0AEC0"
            />

            <Text style={styles.label}>Your Weight (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 75"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholderTextColor="#A0AEC0"
            />
            <Text style={styles.label}>Your Height (cm)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 175"
              value={height}
              onChangeText={setHeight}
              keyboardType="number-pad"
              placeholderTextColor="#A0AEC0"
            />

            <Text style={styles.label}>Your Gender</Text>
            <View style={styles.buttonGroup}>
              {GENDERS.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.button,
                    gender === item.value && styles.buttonActive,
                  ]}
                  onPress={() => setGender(item.value)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      gender === item.value && styles.buttonTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Activity Level Selector - The "Crucial Info" */}
            <Text style={styles.label}>What’s your weekly activity level?</Text>
            <View style={styles.buttonGroup}>
              {ACTIVITIES.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.button,
                    activityLevel === item.value && styles.buttonActive,
                  ]}
                  onPress={() => setActivityLevel(item.value)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      activityLevel === item.value && styles.buttonTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Goal Selector */}
            <Text style={styles.label}>What is your primary goal?</Text>
            <View style={styles.buttonGroup}>
              {GOALS.map((item) => {
                const IconComponent = item.icon;
                const isActive = goal === item.value;

                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.button, isActive && styles.buttonActive]}
                    onPress={() => handleGoal(item.value)}
                  >
                    <IconComponent
                      size={20}
                      color={isActive ? "#2E8B57" : "#2C3E50"}
                      strokeWidth={1.5}
                    />
                    <Text
                      style={[
                        styles.buttonText,
                        isActive && styles.buttonTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {weightLoss ? (
              <>
                <Text style={styles.label}>Set Your Target Weight</Text>
                <TextInput
                  key="Loss-input"
                  style={styles.input}
                  placeholder="e.g. Current weight - 5kg"
                  value={Loss}
                  onChangeText={setLoss}
                  keyboardType="number-pad"
                  placeholderTextColor="#A0AEC0"
                />
              </>
            ) : weightGain ? (
              <>
                <Text style={styles.label}>Set Your Target Weight</Text>
                <TextInput
                  key="Gain-input"
                  style={styles.input}
                  placeholder="e.g. Current weight + 5kg"
                  value={Gain}
                  onChangeText={setGain}
                  keyboardType="number-pad"
                  placeholderTextColor="#A0AEC0"
                />
              </>
            ) : (
              ""
            )}
            <>
              <Text style={styles.label}>
                Why when do you want to achieve your target goal?
              </Text>
              <DateTimePicker
                value={targetDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onChangeDate}
                minimumDate={new Date()} // Prevent picking past dates
              />
            </>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Complete Button */}
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", delay: 800 }}
        style={styles.footer}
      >
        <TouchableOpacity style={styles.submitButton} onPress={handleComplete}>
          <Text style={styles.submitButtonText}>Generate My Plan</Text>
        </TouchableOpacity>
        <View style={styles.smallDesc}>
          <Text className="text-xs">
            (Will be reviewed by AI for science-based recommendations)
          </Text>
        </View>
      </MotiView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100, // Make room for the button
  },
  header: {
    marginBottom: 40,
    marginTop: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.text,
    textAlign: "center",
    fontWeight: "500",
    opacity: 0.8,
  },
  form: {
    gap: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: -10, // Pull fields closer
  },
  smallDesc: {
    fontSize: 10,
    alignItems: "center",
    color: COLORS.text,
    opacity: 0.7,
    marginTop: 5,
    marginBottom: -10,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  buttonGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  button: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: "45%", // Two-column look for goals
    alignItems: "center",
  },
  buttonActive: {
    backgroundColor: COLORS.primaryFaint,
    borderColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },
  buttonTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: COLORS.bg, // Blends into the bottom
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "800",
  },
});
