import { useTheme } from "@/services/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IP } from "../../constants/IP";
import { useAuth } from "../../services/AuthContext";
import { logOut } from "../../services/authprovider";

// ─── Types ────────────────────────────────────────────────────────────────────

type Field = {
  key: string;
  label: string;
  value: string;
  unit?: string;
  keyboardType?: "numeric" | "default";
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GOALS = [
  "Lose weight",
  "Maintain weight",
  "Gain muscle",
  "Improve health",
];
const ACTIVITY_LEVELS = [
  "Sedentary",
  "Lightly active",
  "Moderately active",
  "Very active",
  "Extremely active",
];

const API_URL = `http://${IP}:3000`;

// ─── Subcomponents ────────────────────────────────────────────────────────────

function SectionHeader({ label, dark }: { label: string; dark: boolean }) {
  return (
    <Text style={[styles.sectionHeader, dark && styles.sectionHeaderDark]}>
      {label}
    </Text>
  );
}

function SettingsRow({
  label,
  value,
  onPress,
  dark,
  last,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  dark: boolean;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.row,
        dark && styles.rowDark,
        last && { borderBottomWidth: 0 },
      ]}
    >
      <Text style={[styles.rowLabel, dark && styles.rowLabelDark]}>
        {label}
      </Text>
      <View style={styles.rowRight}>
        {value ? (
          <Text style={[styles.rowValue, dark && styles.rowValueDark]}>
            {value}
          </Text>
        ) : null}
        <Text style={styles.rowChevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

function DisplaySummary({
  visible,
  title,
  text,
  dark,
  onClose,
}: {
  visible: boolean;
  title: string;
  text: string | undefined;
  dark: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalSheet, dark && styles.modalSheetDark]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, dark && styles.modalTitleDark]}>
            {title}
          </Text>
          <Text style={{ color: dark ? "white" : "black" }}>{text}</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function OptionPicker({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  dark,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  dark: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalSheet, dark && styles.modalSheetDark]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, dark && styles.modalTitleDark]}>
            {title}
          </Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              onPress={() => {
                onSelect(opt);
                onClose();
              }}
              style={[styles.optionRow, dark && styles.optionRowDark]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  dark && styles.optionTextDark,
                  selected === opt && styles.optionTextSelected,
                ]}
              >
                {opt}
              </Text>
              {selected === opt && <Text style={styles.optionCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={onClose}
            style={styles.modalCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Key fix: never return null, always render Modal ─────────────────────────
function InputModal({
  visible,
  field,
  onSave,
  onClose,
  dark,
}: {
  visible: boolean;
  field: Field | null;
  onSave: (key: string, value: string) => void;
  onClose: () => void;
  dark: boolean;
}) {
  const [val, setVal] = useState("");

  // Sync val whenever field changes — key fix for stale state
  useEffect(() => {
    if (field?.value !== undefined) setVal(field.value);
  }, [field?.key, field?.value]);

  const handleSave = () => {
    if (field) onSave(field.key, val);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          {/* Inner Pressable stops tap from bubbling up to close overlay */}
          <Pressable style={[styles.modalSheet, dark && styles.modalSheetDark]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, dark && styles.modalTitleDark]}>
              Edit {field?.label ?? ""}
            </Text>

            <View style={[styles.inputWrap, dark && styles.inputWrapDark]}>
              <TextInput
                style={[styles.modalInput, dark && styles.modalInputDark]}
                value={val}
                onChangeText={setVal}
                keyboardType={field?.keyboardType ?? "default"}
                placeholder={`Enter ${field?.label?.toLowerCase() ?? ""}`}
                placeholderTextColor={dark ? "#4a7a61" : "#7aaa91"}
                autoFocus={visible}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              {field?.unit ? (
                <Text style={styles.inputUnit}>{field.unit}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.85}
              style={styles.modalSaveWrap}
            >
              <LinearGradient
                colors={["#2db87a", "#0d3d2b"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalSave}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const GENDERS = ["Male", "Female", "Other"];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function Settings() {
  const { user, profile } = useAuth();
  const { dark, mode, setMode } = useTheme();
  const usingSystemTheme = mode === "system";

  const [saving, setSaving] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [age, setAge] = useState<string>(String(profile?.age ?? ""));
  const [weight, setWeight] = useState<string>(String(profile?.weight ?? ""));
  const [goal, setGoal] = useState<string>(profile?.goal ?? "");
  const [height, setHeight] = useState<string>(String(profile?.height ?? ""));
  const [gender, setGender] = useState<string>(profile?.gender ?? "");
  const [genderPicker, setGenderPicker] = useState(false);

  const [activityLevel, setActivityLevel] = useState<string>(
    profile?.activityLevel ?? "",
  );

  const [inputModal, setInputModal] = useState<{
    visible: boolean;
    field: Field | null;
  }>({
    visible: false,
    field: null,
  });
  const [goalPicker, setGoalPicker] = useState(false);
  const [activityPicker, setActivityPicker] = useState(false);
  const [summaryShow, setSummary] = useState(false);
  const [aiReturn, setAiReturn] = useState<string>("");
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
          setAiReturn(data.aiResponse);
          return;
        }

        // 404 means not ready yet — keep polling
        if (res.status === 404) {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 2000);
          } else {
          }
          return;
        }
      } catch (e) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
        }
      }
    };

    poll();
  }, [user]);

  const openInput = (field: Field) => setInputModal({ visible: true, field });

  const handleSaveField = (key: string, value: string) => {
    if (key === "age") setAge(value);
    if (key === "weight") setWeight(value);
    if (key === "height") setHeight(value);
  };

  const handleSaveAll = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
          name: user.displayName ?? "",
          age: Number(age),
          weight: Number(weight),
          goal,
          activityLevel,
          gender,
          height: Number(height),
        }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    await logOut();
    setLogoutLoading(false);
  };

  return (
    <SafeAreaView
      style={[styles.root, dark && styles.rootDark]}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500 }}
          style={styles.header}
        >
          <View style={styles.header}>
            <LinearGradient
              colors={["#2db87a", "#0d3d2b"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {(user?.displayName ?? user?.email ?? "U")[0].toUpperCase()}
              </Text>
            </LinearGradient>
            <View>
              <Text style={[styles.headerName, dark && styles.textDark]}>
                {user?.displayName ?? "Your Profile"}
              </Text>
              <Text style={styles.headerEmail}>{user?.email}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              setSummary(true);
            }}
            className="bg-green-800 mb-5 rounded-xl"
          >
            <Text className="text-xs color-white p-2">Your Summary</Text>
          </TouchableOpacity>
        </MotiView>

        {/* Appearance */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 80 }}
        >
          <SectionHeader label="APPEARANCE" dark={dark} />
          <View style={[styles.card, dark && styles.cardDark]}>
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <Text style={[styles.rowLabel, dark && styles.rowLabelDark]}>
                Use system default
              </Text>
              <Switch
                value={usingSystemTheme}
                onValueChange={(enabled) =>
                  setMode(enabled ? "system" : dark ? "dark" : "light")
                }
                trackColor={{ false: "rgba(45,184,122,0.2)", true: "#2db87a" }}
                thumbColor="#fff"
              />
            </View>
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <Text style={[styles.rowLabel, dark && styles.rowLabelDark]}>
                Dark mode
              </Text>
              <Switch
                value={dark}
                onValueChange={(val) => setMode(val ? "dark" : "light")}
                disabled={usingSystemTheme}
                trackColor={{ false: "rgba(45,184,122,0.2)", true: "#2db87a" }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </MotiView>

        {/* Profile */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 160 }}
        >
          <SectionHeader label="YOUR PROFILE" dark={dark} />
          <View style={[styles.card, dark && styles.cardDark]}>
            <SettingsRow
              label="Age"
              value={age ? `${age} yrs` : "—"}
              onPress={() =>
                openInput({
                  key: "age",
                  label: "Age",
                  value: age,
                  unit: "yrs",
                  keyboardType: "numeric",
                })
              }
              dark={dark}
            />
            <SettingsRow
              label="Weight"
              value={weight ? `${weight} kg` : "—"}
              onPress={() =>
                openInput({
                  key: "weight",
                  label: "Weight",
                  value: weight,
                  unit: "kg",
                  keyboardType: "numeric",
                })
              }
              dark={dark}
            />
            <SettingsRow
              label="Height"
              value={height ? `${height} cm` : "—"}
              onPress={() =>
                openInput({
                  key: "height",
                  label: "Height",
                  value: height,
                  unit: "cm",
                  keyboardType: "numeric",
                })
              }
              dark={dark}
            />
            <SettingsRow
              label="Gender"
              value={gender || "—"}
              onPress={() => setGenderPicker(true)}
              dark={dark}
            />
            <SettingsRow
              label="Goal"
              value={goal || "—"}
              onPress={() => setGoalPicker(true)}
              dark={dark}
            />
            <SettingsRow
              label="Activity level"
              value={activityLevel || "—"}
              onPress={() => setActivityPicker(true)}
              dark={dark}
              last
            />
          </View>
          <OptionPicker
            visible={genderPicker}
            title="Select gender"
            options={GENDERS}
            selected={gender}
            onSelect={setGender}
            onClose={() => setGenderPicker(false)}
            dark={dark}
          />

          <TouchableOpacity
            onPress={handleSaveAll}
            disabled={saving}
            activeOpacity={0.85}
            style={styles.saveBtnWrap}
          >
            <LinearGradient
              colors={["#2db87a", "#0d3d2b"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveBtn}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save changes</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>

        {/* Account */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 240 }}
        >
          <SectionHeader label="ACCOUNT" dark={dark} />
          <View style={[styles.card, dark && styles.cardDark]}>
            <TouchableOpacity
              onPress={handleLogout}
              disabled={logoutLoading}
              activeOpacity={0.7}
              style={[styles.row, { borderBottomWidth: 0 }]}
            >
              {logoutLoading ? (
                <ActivityIndicator color="#e05555" style={{ flex: 1 }} />
              ) : (
                <Text style={styles.logoutText}>Log out</Text>
              )}
            </TouchableOpacity>
          </View>
        </MotiView>

        <Text style={styles.version}>BetterChoice · v1.0.0</Text>
      </ScrollView>

      {/* Modals — outside ScrollView so keyboard works correctly */}
      <DisplaySummary
        visible={summaryShow}
        title="Your Summary"
        text={aiReturn}
        onClose={() => setSummary(false)}
        dark={dark}
      />
      <InputModal
        visible={inputModal.visible}
        field={inputModal.field}
        onSave={handleSaveField}
        onClose={() => setInputModal({ visible: false, field: null })}
        dark={dark}
      />
      <OptionPicker
        visible={goalPicker}
        title="Select goal"
        options={GOALS}
        selected={goal}
        onSelect={setGoal}
        onClose={() => setGoalPicker(false)}
        dark={dark}
      />
      <OptionPicker
        visible={activityPicker}
        title="Activity level"
        options={ACTIVITY_LEVELS}
        selected={activityLevel}
        onSelect={setActivityLevel}
        onClose={() => setActivityPicker(false)}
        dark={dark}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f4fbf7" },
  rootDark: { backgroundColor: "#081410" },
  scroll: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 8 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 28,
    marginTop: 8,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2db87a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  headerName: { fontSize: 18, fontWeight: "600", color: "#0a2318" },
  headerEmail: { fontSize: 13, color: "#7aaa91", marginTop: 2 },
  textDark: { color: "#e0f5ec" },

  sectionHeader: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7aaa91",
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionHeaderDark: { color: "#3d7a5e" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(45,184,122,0.12)",
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#0d3d2b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: "#0f2018",
    borderColor: "rgba(45,184,122,0.15)",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(45,184,122,0.08)",
  },
  rowDark: { borderBottomColor: "rgba(45,184,122,0.1)" },
  rowLabel: { fontSize: 15, color: "#0a2318", fontWeight: "500" },
  rowLabelDark: { color: "#c8edd8" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { fontSize: 14, color: "#7aaa91" },
  rowValueDark: { color: "#3d7a5e" },
  rowChevron: { fontSize: 20, color: "#2db87a", marginTop: -1 },

  saveBtnWrap: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#2db87a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  saveBtn: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  logoutText: { fontSize: 15, fontWeight: "600", color: "#e05555" },
  version: {
    textAlign: "center",
    fontSize: 12,
    color: "#7aaa91",
    marginTop: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalSheetDark: { backgroundColor: "#0f2018" },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(45,184,122,0.3)",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0a2318",
    marginBottom: 20,
  },
  modalTitleDark: { color: "#e0f5ec" },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8faf2",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(45,184,122,0.2)",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputWrapDark: {
    backgroundColor: "#0a1a10",
    borderColor: "rgba(45,184,122,0.25)",
  },
  modalInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: "#0a2318" },
  modalInputDark: { color: "#e0f5ec" },
  inputUnit: { fontSize: 14, color: "#7aaa91", marginLeft: 4 },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(45,184,122,0.08)",
  },
  optionRowDark: { borderBottomColor: "rgba(45,184,122,0.1)" },
  optionText: { fontSize: 15, color: "#0a2318" },
  optionTextDark: { color: "#c8edd8" },
  optionTextSelected: { color: "#2db87a", fontWeight: "600" },
  optionCheck: { color: "#2db87a", fontSize: 16, fontWeight: "700" },

  modalSaveWrap: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
    marginBottom: 8,
    shadowColor: "#2db87a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  modalSave: { paddingVertical: 15, alignItems: "center" },
  modalSaveText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  modalCancel: { alignItems: "center", paddingVertical: 12 },
  modalCancelText: { fontSize: 14, color: "#7aaa91" },
});
