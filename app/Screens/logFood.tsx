/**
 * LogFoodScreen.tsx
 *
 * Three entry points:
 *  1. Text search  → /api/food/search?q=  (USDA + Open Food Facts)
 *  2. Barcode scan → expo-camera           (Open Food Facts by barcode)
 *  3. AI photo     → Gemini Vision         (estimated macros from image)
 *
 * TODO markers show where to wire real logic once dependencies are installed.
 */

import { IP } from "@/constants/IP";
import { useAuth } from "@/services/AuthContext";
import { useTheme } from "@/services/ThemeContext";
import { uploadMealImage } from "@/services/storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import {
  Barcode,
  CookingPot,
  EggFried,
  LucideIcon,
  Popcorn,
  Sandwich,
  ScanSearch,
  Search,
} from "lucide-react-native";
import { MotiView } from "moti";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg: "#F4FBF7",
  card: "#FFFFFF",
  primary: "#2db87a",
  primaryDeep: "#0d3d2b",
  primaryFaint: "#e8faf2",
  text: "#0a2318",
  textMid: "#3d6653",
  textLight: "#7aaa91",
  border: "rgba(45,184,122,0.15)",
  protein: "#5b8dee",
  carbs: "#f6a623",
  fat: "#e05555",
  overlay: "rgba(8,20,16,0.6)",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type FoodItem = {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  per: string; // "100g" | "1 serving" | etc.
  source: "usda" | "off" | "ai" | "custom";
  barcode?: string;
  imageUri?: string | null;
};

type RecentItem = {
  id: string;
  MealId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  per: string;
  imageUri?: string | null;
  source: "usda" | "off" | "ai";
};

type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

// ─── Meal type selector ───────────────────────────────────────────────────────
const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];
const MEAL_ICONS: Record<string, LucideIcon> = {
  Breakfast: EggFried,
  Lunch: Sandwich,
  Dinner: CookingPot,
  Snack: Popcorn,
};

// ─── Food Result Row ──────────────────────────────────────────────────────────
function FoodRow({ item, onPress }: { item: FoodItem; onPress: () => void }) {
  const { dark } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.foodRow, dark && styles.foodRowDark]}
    >
      {!!item.imageUri && (
        <Image source={{ uri: item.imageUri }} style={styles.foodRowImage} />
      )}
      <View style={styles.foodRowLeft}>
        <Text
          style={[styles.foodRowName, dark && styles.foodRowNameDark]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {item.brand && (
          <Text style={[styles.foodRowBrand, dark && styles.foodRowMetaDark]}>
            {item.brand}
          </Text>
        )}
        <Text style={[styles.foodRowMeta, dark && styles.foodRowMetaDark]}>
          per {item.per}
        </Text>
      </View>
      <View style={styles.foodRowRight}>
        <Text style={styles.foodRowKcal}>{item.calories}</Text>
        <Text style={[styles.foodRowKcalLabel, dark && styles.foodRowMetaDark]}>
          kcal
        </Text>
        <View style={styles.foodRowMacros}>
          <Text style={[styles.macroBadge, { color: C.protein }]}>
            P {item.protein}g
          </Text>
          <Text style={[styles.macroBadge, { color: C.carbs }]}>
            C {item.carbs}g
          </Text>
          <Text style={[styles.macroBadge, { color: C.fat }]}>
            F {item.fat}g
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Add Food Detail Sheet ────────────────────────────────────────────────────
function FoodDetailSheet({
  item,
  visible,
  isRecent,
  onClose,
  onAdd,
}: {
  item: FoodItem | null;
  visible: boolean;
  isRecent: boolean;
  onClose: () => void;
  onAdd: (
    item: FoodItem,
    grams: number,
    isRecent: boolean,
    mealType: string,
  ) => void;
}) {
  const [amount, setAmount] = useState("100");
  const [mealType, setMealType] = useState<MealType>("Lunch");
  const { dark } = useTheme();

  const isServingBased = !!item && item.per !== "100g";

  useEffect(() => {
    setAmount(isServingBased ? "1" : "100");
  }, [item?.id]);

  if (!item) return null;

  const hasImage = !!item.imageUri;
  const scale = isServingBased ? Number(amount) : Number(amount) / 100;
  const scaled = {
    calories: Math.round(item.calories * scale),
    protein: Math.round(item.protein * scale * 10) / 10,
    carbs: Math.round(item.carbs * scale * 10) / 10,
    fat: Math.round(item.fat * scale * 10) / 10,
  };

  const servingPills = isServingBased
    ? ["0.5", "1", "1.5", "2"]
    : ["50", "100", "150", "200"];
  const unitLabel = isServingBased ? "serving" : "g";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.sheetOverlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[styles.sheet, dark && styles.sheetDark]}>
        <View style={dark ? styles.sheetHandleDark : styles.sheetHandle} />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Source badge */}
          <View style={[styles.sourceBadge, dark && styles.sourceBadgeDark]}>
            <Text
              style={[
                styles.sourceBadgeText,
                dark && styles.sourceBadgeTextDark,
              ]}
            >
              {item.source === "ai"
                ? "AI Estimate"
                : item.source === "custom"
                  ? "Custom Food"
                  : item.source === "off"
                    ? "Open Food Facts"
                    : "USDA"}
            </Text>
          </View>

          <Text style={[styles.sheetName, dark && styles.sheetNameDark]}>
            {item.name}
          </Text>
          {item.brand && (
            <Text style={[styles.sheetBrand, dark && styles.sheetBrandDark]}>
              {item.brand}
            </Text>
          )}

          {/* Serving input */}
          <View style={styles.servingRow}>
            <Text
              style={[styles.servingLabel, dark && styles.servingLabelDark]}
            >
              Amount
            </Text>
            <View
              style={[
                styles.servingInputWrap,
                dark && styles.servingInputWrapDark,
              ]}
            >
              <TextInput
                style={[styles.servingInput, dark && styles.servingInputDark]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text
                style={[styles.servingUnit, dark && styles.servingUnitDark]}
              >
                {unitLabel}
              </Text>
            </View>
          </View>

          {/* Quick serving buttons */}
          <View style={styles.quickServing}>
            {servingPills.map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => setAmount(v)}
                style={[
                  styles.servingPill,
                  amount === v && styles.servingPillActive,
                  dark && styles.servingPillDark,
                  amount === v && dark && styles.servingPillActiveDark,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.servingPillText,
                    amount === v && styles.servingPillTextActive,
                    dark && styles.servingPillTextDark,
                    dark && styles.servingPillTextActiveDark,
                  ]}
                >
                  {isServingBased ? `${v}×` : `${v}g`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {!!item.imageUri && (
            <Image
              source={{ uri: item.imageUri }}
              style={styles.detailImage}
              resizeMode="contain"
            />
          )}
          {/* Macro breakdown */}
          <View
            style={[styles.macroBreakdown, dark && styles.macroBreakdownDark]}
          >
            <View style={styles.macroBreakdownItem}>
              <Text
                style={[styles.macroBreakdownVal, dark && { color: "white" }]}
              >
                {scaled.calories}
              </Text>
              <Text
                style={[
                  styles.macroBreakdownLabel,
                  dark && styles.macroBreakdownLabelDark,
                ]}
              >
                kcal
              </Text>
            </View>
            <View
              style={[
                styles.macroBreakdownItem,
                { borderLeftWidth: 1, borderLeftColor: C.border },
              ]}
            >
              <Text style={[styles.macroBreakdownVal, { color: C.protein }]}>
                {scaled.protein}g
              </Text>
              <Text
                style={[
                  styles.macroBreakdownLabel,
                  dark && styles.macroBreakdownLabelDark,
                ]}
              >
                protein
              </Text>
            </View>
            <View
              style={[
                styles.macroBreakdownItem,
                { borderLeftWidth: 1, borderLeftColor: C.border },
              ]}
            >
              <Text style={[styles.macroBreakdownVal, { color: C.carbs }]}>
                {scaled.carbs}g
              </Text>
              <Text
                style={[
                  styles.macroBreakdownLabel,
                  dark && styles.macroBreakdownLabelDark,
                ]}
              >
                carbs
              </Text>
            </View>
            <View
              style={[
                styles.macroBreakdownItem,
                { borderLeftWidth: 1, borderLeftColor: C.border },
              ]}
            >
              <Text style={[styles.macroBreakdownVal, { color: C.fat }]}>
                {scaled.fat}g
              </Text>
              <Text
                style={[
                  styles.macroBreakdownLabel,
                  dark && styles.macroBreakdownLabelDark,
                ]}
              >
                fat
              </Text>
            </View>
          </View>
          <View
            style={
              hasImage
                ? styles.mealTypeSelectorRow
                : styles.mealTypeSelectorColumn
            }
          >
            {MEAL_TYPES.map((type, i) => {
              const Icon = MEAL_ICONS[type];
              return (
                <MotiView
                  key={type}
                  from={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", delay: 60 + i * 50 }}
                >
                  <TouchableOpacity
                    onPress={() => setMealType(type)}
                    activeOpacity={0.7}
                    style={[
                      styles.mealTypeBtn,
                      dark && styles.mealTypeBtnDark,
                      mealType === type && styles.mealTypeBtnActive,
                      mealType === type && dark && styles.mealTypeBtnActiveDark,
                    ]}
                  >
                    {<Icon size={16} color={dark ? "white" : "black"} />}
                    <Text
                      style={[
                        styles.mealTypeText,
                        dark && styles.mealTypeTextDark,
                        mealType === type && styles.mealTypeTextActive,
                        mealType === type &&
                          dark &&
                          styles.mealTypeTextActiveDark,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                </MotiView>
              );
            })}
          </View>
          {/* Add button */}
          <TouchableOpacity
            onPress={() => onAdd(item, Number(amount), isRecent, mealType)}
            activeOpacity={0.85}
            style={styles.addBtnWrap}
          >
            <LinearGradient
              colors={[C.primary, C.primaryDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addBtn}
            >
              <Text style={styles.addBtnText}>Add to {mealType}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Barcode Scanner Stub ─────────────────────────────────────────────────────
function BarcodeScannerModal({
  visible,
  onClose,
  onFound,
}: {
  visible: boolean;
  onClose: () => void;
  onFound: (item: FoodItem) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [loading, setLoading] = useState(false);

  // Handle Permissions
  if (visible && !permission) return null; // Loading permissions
  if (visible && !permission?.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.centered}>
          <Text style={styles.text}>
            Camera access is required to scan foods.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={styles.scannerBtn}
          >
            <Text style={styles.scannerBtnText}>Enable Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 20 }}>
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (!isScanning) return;

    setIsScanning(false); // Pause scanner to prevent multiple rapid scans
    setLoading(true);

    try {
      console.log(data);
      // Real API call to Open Food Facts
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${data}.json`,
      );
      const result = await response.json();

      if (result.status === 1) {
        const product = result.product;
        onFound({
          id: data,
          name: product.product_name || "Unknown Item",
          calories: Math.round(product.nutriments?.["energy-kcal_100g"] || 0),
          protein: product.nutriments?.proteins_100g || 0,
          carbs: product.nutriments?.carbohydrates_100g || 0,
          fat: product.nutriments?.fat_100g || 0,
          barcode: data,
          per: "100g",
          source: "off",
        });
        onClose();
      } else {
        Alert.alert(
          "Not Found",
          "We couldn't find this item in the database.",
          [{ text: "Try Again", onPress: () => setIsScanning(true) }],
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to reach the database.");
      setIsScanning(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.scannerModal}>
        <View style={styles.scannerOverlay}>
          <TouchableOpacity onPress={onClose} style={styles.scannerClose}>
            <Text style={styles.scannerCloseText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.scannerTitle}>Scan Barcode</Text>

          {/* REAL EXPO CAMERA VIEW */}
          <CameraView
            style={styles.scannerViewfinder}
            barcodeScannerSettings={{
              barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
            }}
            onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
          >
            {/* Visual scan line animation or corners */}
            <View style={styles.scannerCornerTL} />
            <View style={styles.scannerCornerTR} />
            <View style={styles.scannerCornerBL} />
            <View style={styles.scannerCornerBR} />

            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color="#fff" size="large" />
                <Text style={{ color: "white", marginTop: 10 }}>
                  Fetching data...
                </Text>
              </View>
            )}
          </CameraView>

          <Text style={styles.scannerHint}>Point camera at the barcode</Text>
        </View>
      </View>
    </Modal>
  );
}

// ─── AI Photo Stub ────────────────────────────────────────────────────────────
function AIPhotoModal({
  visible,
  onClose,
  onResult,
}: {
  visible: boolean;
  onClose: () => void;
  onResult: (item: FoodItem, imageUrl: string | null) => void;
}) {
  const [status, setStatus] = useState<"idle" | "analysing" | "done" | "error">(
    "idle",
  );
  const [result, setResult] = useState<FoodItem | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const { dark } = useTheme();
  const { user } = useAuth();

  const AiAnalysis = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera Permission Required", "Please allow camera access.");
      return;
    }

    const img = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.5,
    });

    if (!img.assets || img.assets.length === 0 || img.canceled) return;

    setStatus("analysing");

    try {
      const base64 = img.assets[0].base64!;

      // Upload image to Supabase Storage
      const imageUrl = await uploadMealImage(base64, user?.uid ?? "unknown");

      // Send to Gemini for analysis
      const res = await fetch(`http://${IP}:3000/api/food/analyse-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, imageUrl }),
      });

      if (!res.ok) {
        setStatus("error");
        return;
      }

      const data = await res.json();
      setImageUri(imageUrl);
      setResult({
        id: "ai-generated",
        name: data.name,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        per: "1 serving",
        source: "ai",
      });
      setStatus("done");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.aiModal}>
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            { minHeight: height * 0.55 },
            dark && styles.sheetDark,
          ]}
        >
          <View style={styles.sheetHandle} />
          <Text style={[styles.aiTitle, dark && { color: "white" }]}>
            AI Food Analysis
          </Text>
          <Text style={[styles.aiSubtitle, dark && { color: "white" }]}>
            Take a photo of your meal and AI will estimate the macros
          </Text>

          {status === "idle" && (
            <TouchableOpacity
              onPress={AiAnalysis}
              activeOpacity={0.85}
              style={styles.aiPhotoBtn}
            >
              <LinearGradient
                colors={["#1a6644", "#0d3d2b"]}
                style={styles.aiPhotoBtnGrad}
              >
                <ScanSearch size={50} color={"white"} />
                <Text style={styles.aiPhotoBtnText}>Take Photo</Text>
                <Text style={styles.aiPhotoBtnSub}>
                  {/* TODO: expo-image-picker */}
                  (requires camera permission)
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {status === "analysing" && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={styles.aiAnalysing}
            >
              <ActivityIndicator color={C.primary} size="large" />
              <Text style={styles.aiAnalysingText}>Analysing your meal...</Text>
              <Text style={styles.aiAnalysingSub}>
                Gemini Vision is working ...
              </Text>
            </MotiView>
          )}

          {status === "done" && result && (
            <MotiView
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 400 }}
            >
              {imageUri && (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.aiResultImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.aiDisclaimer}>
                <Text style={styles.aiDisclaimerText}>
                  ⚠️ AI estimates — adjust if needed
                </Text>
              </View>

              <Text style={styles.aiResultName}>{result.name}</Text>

              <View style={styles.macroBreakdown}>
                {[
                  { label: "kcal", val: result.calories, color: C.primary },
                  {
                    label: "protein",
                    val: `${result.protein}g`,
                    color: C.protein,
                  },
                  { label: "carbs", val: `${result.carbs}g`, color: C.carbs },
                  { label: "fat", val: `${result.fat}g`, color: C.fat },
                ].map((m) => (
                  <View key={m.label} style={styles.macroBreakdownItem}>
                    <Text
                      style={[styles.macroBreakdownVal, { color: m.color }]}
                    >
                      {m.val}
                    </Text>
                    <Text style={styles.macroBreakdownLabel}>{m.label}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => {
                  onResult(result, imageUri);
                  onClose();
                }}
                activeOpacity={0.85}
                style={styles.addBtnWrap}
              >
                <LinearGradient
                  colors={[C.primary, C.primaryDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.addBtn}
                >
                  <Text style={styles.addBtnText}>Use This Estimate</Text>
                </LinearGradient>
              </TouchableOpacity>
            </MotiView>
          )}
          {status === "error" && (
            <View style={styles.aiAnalysing}>
              <Text style={{ fontSize: 36 }}>⚠️</Text>
              <Text style={styles.aiAnalysingText}>Analysis failed</Text>
              <TouchableOpacity
                onPress={() => setStatus("idle")}
                style={[styles.scannerBtn, { marginTop: 16 }]}
              >
                <Text style={styles.scannerBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LogFoodScreen() {
  const { dark } = useTheme();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [meals, setMeals] = useState<RecentItem[]>([]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [isRecent, setIsRecent] = useState(false);

  const fetchRecentMeals = async () => {
    try {
      const res = await fetch(
        `http://${IP}:3000/api/meals/recent/${user?.uid}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setMeals(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRecentMeals();
  }, []);
  // ── Search ──────────────────────────────────────────────────────────────────
  const handleSearch = (text: string) => {
    setQuery(text);
    setIsRecent(false);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!text.trim()) {
      setResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `http://${IP}:3000/api/food/search?q=${encodeURIComponent(text)}`,
        );
        const data = await res.json();
        setResults(data);
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleAddFood = async (
    item: FoodItem,
    grams: number,
    isRecent: boolean,
    mealType: string,
  ) => {
    const isServingBased = item.per !== "100g";

    if (isRecent) {
      await fetch(`http://${IP}:3000/api/meals/recent/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: user?.uid,
          FoodId: item.id,
          mealType,
          quantity: grams,
          unit: isServingBased ? "serving" : "g",
          imageUrl: item.imageUri ?? null,
        }),
      });
    } else {
      await fetch(`http://${IP}:3000/api/meals/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isServingBased
            ? {
                // Store base (per-serving) nutrition in FoodItem; quantity = number of servings
                firebaseUid: user?.uid,
                mealType,
                foodName: item.name,
                quantity: grams,
                unit: "serving",
                calories: item.calories,
                protein: item.protein,
                carbs: item.carbs ?? 0,
                fat: item.fat ?? 0,
                imageUrl:
                  item.source === "ai"
                    ? aiImageUrl
                    : (item.imageUri ?? null),
              }
            : {
                // Store scaled nutrition; quantity = grams
                firebaseUid: user?.uid,
                mealType,
                foodName: item.name,
                quantity: grams,
                unit: "g",
                calories: Math.round((item.calories * grams) / 100),
                protein: Math.round(((item.protein * grams) / 100) * 10) / 10,
                carbs: Math.round((((item.carbs ?? 0) * grams) / 100) * 10) / 10,
                fat: Math.round((((item.fat ?? 0) * grams) / 100) * 10) / 10,
                imageUrl: null,
              },
        ),
      });
    }
    setAiImageUrl(null);
    setShowDetail(false);
    setSelectedItem(null);
  };

  const openDetail = (item: FoodItem) => {
    setSelectedItem(item);
    setShowDetail(true);
  };

  return (
    <SafeAreaView
      style={[styles.root, dark && styles.rootDark]}
      edges={["top"]}
    >
      <FlatList
        data={query.length > 0 ? results : meals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[0]}
        ListHeaderComponent={
          <View
            style={{
              backgroundColor: dark ? "#0a2318" : C.bg,
              paddingBottom: 10,
            }}
          >
            <MotiView
              from={{ opacity: 0, translateY: -10 }}
              animate={{ opacity: 1, translateY: 0 }}
              style={styles.header}
            >
              <Text
                style={[styles.headerTitle, dark && styles.headerTitleDark]}
              >
                Log Food
              </Text>
              <Text style={[styles.headerSub, dark && styles.headerSubDark]}>
                {new Date().toLocaleDateString("en-AU", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}
              </Text>
            </MotiView>

            {/* Search Section */}
            <View style={styles.searchSection}>
              <View style={[styles.searchBar, dark && styles.searchBarDark]}>
                <Search color={dark ? "white" : "black"} size={20} />
                <TextInput
                  style={[styles.searchInput, dark && styles.searchInputDark]}
                  placeholder="Search food..."
                  value={query}
                  onChangeText={handleSearch}
                  placeholderTextColor={dark ? "#aaaaaa" : C.textLight}
                />
                {searching && (
                  <ActivityIndicator color={C.primary} size="small" />
                )}
              </View>

              <View style={styles.actionBtns}>
                <TouchableOpacity
                  onPress={() => setShowBarcode(true)}
                  style={styles.actionBtn}
                >
                  <LinearGradient
                    colors={["#1a6644", "#0d3d2b"]}
                    style={styles.actionBtnGrad}
                  >
                    <Barcode color="#ffffff" size={20} />
                    <Text style={styles.actionBtnLabel}>Barcode</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowAI(true)}
                  style={styles.actionBtn}
                >
                  <LinearGradient
                    colors={["#2db87a", "#1a6644"]}
                    style={styles.actionBtnGrad}
                  >
                    <ScanSearch color="#ffffff" size={20} />
                    <Text style={styles.actionBtnLabel}>AI Photo</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* The Result Label */}
            <Text
              style={[
                styles.listHeader,
                dark && styles.listHeaderDark,
                { marginTop: 15, paddingHorizontal: 20 },
              ]}
            >
              {query.length > 0 ? "Search Results" : "Recent items"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 20, marginTop: 5 }}>
            <FoodRow
              item={item}
              onPress={() => {
                setIsRecent(query.length === 0);
                openDetail(item);
              }}
            />
          </View>
        )}
        ListEmptyComponent={
          !searching ? (
            <View style={styles.emptySearch}>
              <Text style={styles.emptySearchEmoji}>🔍</Text>
              <Text style={dark && { color: "white" }}>No items found</Text>
            </View>
          ) : null
        }
      />

      {/* --- MODALS (Stay at the bottom) --- */}
      <FoodDetailSheet
        item={selectedItem}
        visible={showDetail}
        isRecent={isRecent}
        onClose={() => setShowDetail(false)}
        onAdd={handleAddFood}
      />
      <BarcodeScannerModal
        visible={showBarcode}
        onClose={() => setShowBarcode(false)}
        onFound={openDetail}
      />
      <AIPhotoModal
        visible={showAI}
        onClose={() => setShowAI(false)}
        onResult={(item, url) => {
          setAiImageUrl(url);
          openDetail(item);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  rootDark: { backgroundColor: "#081410" },

  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: "700", color: C.text },
  headerTitleDark: { color: "#e0f5ec" },
  headerSub: { fontSize: 13, color: C.textLight, marginTop: 2 },
  headerSubDark: { color: "#4a7a61" },

  // Meal type
  mealTypeRow: { paddingHorizontal: 20, paddingVertical: 14, gap: 10 },
  mealTypeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    backgroundColor: "white",
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  mealTypeBtnDark: {
    backgroundColor: "#0f2018",
    borderColor: "rgba(45,184,122,0.2)",
  },
  mealTypeBtnActive: {
    backgroundColor: C.primaryFaint,
    borderColor: C.primary,
  },
  mealTypeBtnActiveDark: {
    backgroundColor: "#0d3d2b",
    borderColor: C.primary,
  },
  mealTypeIcon: { fontSize: 14 },
  mealTypeText: { fontSize: 10, fontWeight: "600", color: C.textMid },
  mealTypeTextDark: { color: "#8fc1a8" },
  mealTypeTextActive: { color: C.primaryDeep },
  mealTypeTextActiveDark: { color: C.primaryFaint },
  mealTypeSelectorRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 8,
    marginBottom: 16,
  },
  mealTypeSelectorColumn: {
    flexDirection: "column",
    flexWrap: "nowrap",
    gap: 8,
    marginBottom: 16,
  },
  // Search
  searchSection: { paddingHorizontal: 20, gap: 10, marginBottom: 4 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: C.primaryDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchBarDark: {
    backgroundColor: "#0f2018",
    borderColor: "rgba(45,184,122,0.2)",
    shadowOpacity: 0.2,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: C.text },
  searchInputDark: { color: "#e0f5ec" },
  clearBtn: { fontSize: 14, color: C.textLight, paddingHorizontal: 4 },
  clearBtnDark: { color: "#8fc1a8" },

  actionBtns: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  actionBtn: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    overflow: "hidden",
  },
  actionBtnGrad: {
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnIcon: { fontSize: 18 },
  actionBtnLabel: { color: "#fff", fontSize: 14, fontWeight: "700" },
  aiResultImage: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    marginBottom: 14,
  },

  // List
  listContent: { paddingBottom: 40 },
  listHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textLight,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
    textTransform: "uppercase",
  },
  listHeaderDark: { color: "#4a7a61" },
  separator: { height: 1, backgroundColor: C.border, marginVertical: 2 },

  foodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: C.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 2,
  },
  foodRowDark: {
    backgroundColor: "#0f2018",
    borderWidth: 1,
    borderColor: "rgba(45,184,122,0.12)",
  },
  foodRowLeft: { flex: 1, paddingRight: 12 },
  foodRowName: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
    marginBottom: 2,
  },
  foodRowNameDark: { color: "#e0f5ec" },
  foodRowImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 10,
  },
  foodRowBrand: { fontSize: 12, color: C.textLight, marginBottom: 2 },
  foodRowMeta: { fontSize: 11, color: C.textLight },
  foodRowMetaDark: { color: "#8fc1a8" },
  foodRowRight: { alignItems: "flex-end", gap: 4 },
  foodRowKcal: { fontSize: 18, fontWeight: "800", color: C.primary },
  foodRowKcalLabel: { fontSize: 10, color: C.textLight, marginTop: -4 },
  foodRowMacros: { flexDirection: "row", gap: 4 },
  macroBadge: { fontSize: 10, fontWeight: "600" },

  emptySearch: { alignItems: "center", paddingTop: 48, gap: 10 },
  emptySearchEmoji: { fontSize: 40 },
  emptySearchText: {
    fontSize: 14,
    color: C.textLight,
    textAlign: "center",
    lineHeight: 20,
  },
  emptySearchTextDark: { color: "#8fc1a8" },

  // Detail sheet
  sheetOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.overlay,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    maxHeight: "90%",
    left: 0,
    right: 0,
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
  },
  sheetDark: {
    backgroundColor: "#0f2018",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetHandleDark: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(45,184,122,0.24)",
    alignSelf: "center",
    marginBottom: 20,
  },
  sourceBadge: {
    alignSelf: "flex-start",
    backgroundColor: C.primaryFaint,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  sourceBadgeDark: {
    backgroundColor: C.primaryDeep,
  },
  sourceBadgeText: { fontSize: 11, color: C.primaryDeep, fontWeight: "600" },
  sourceBadgeTextDark: { color: C.primaryFaint },
  sheetName: {
    fontSize: 20,
    fontWeight: "700",
    color: C.text,
    marginBottom: 4,
  },
  sheetNameDark: {
    color: "white",
  },
  sheetBrand: { fontSize: 13, color: C.textLight, marginBottom: 16 },
  sheetBrandDark: { color: "black" },
  servingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  servingLabel: { fontSize: 14, fontWeight: "600", color: C.text },
  servingLabelDark: { color: "white" },
  servingInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.primaryFaint,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 12,
  },
  servingInputWrapDark: {
    backgroundColor: C.primaryDeep,
    borderColor: C.border,
  },
  servingInput: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    paddingVertical: 8,
    minWidth: 60,
    textAlign: "center",
  },
  servingInputDark: {
    color: "white",
  },
  servingUnit: { fontSize: 13, color: C.textLight, marginLeft: 4 },
  servingUnitDark: { color: "white" },

  quickServing: { flexDirection: "row", gap: 8, marginBottom: 20 },
  servingPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  servingPillDark: {
    borderColor: C.textMid,
    backgroundColor: C.primaryDeep,
  },
  servingPillActive: {
    backgroundColor: C.primaryFaint,
    borderColor: C.primary,
  },
  servingPillActiveDark: {
    backgroundColor: "#0d6d2b",
    borderColor: C.textMid,
  },
  servingPillText: { fontSize: 13, color: C.textMid, fontWeight: "600" },
  servingPillTextDark: { color: C.textLight },
  servingPillTextActive: { color: C.primaryDeep },
  servingPillTextActiveDark: { color: "#e8fff2" },

  macroBreakdown: {
    flexDirection: "row",
    backgroundColor: C.primaryFaint,
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
  },
  macroBreakdownDark: {
    backgroundColor: C.primaryDeep,
  },
  macroBreakdownItem: { flex: 1, alignItems: "center", paddingVertical: 14 },
  macroBreakdownVal: { fontSize: 16, fontWeight: "800", color: C.text },
  macroBreakdownValDark: { color: "white" },
  macroBreakdownLabel: { fontSize: 10, color: C.textLight, marginTop: 2 },
  macroBreakdownLabelDark: { color: "white" },

  addBtnWrap: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  addBtn: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  detailImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginBottom: 14,
  },
  // Barcode scanner
  scannerModal: { flex: 1 },
  scannerOverlay: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  scannerClose: {
    position: "absolute",
    top: 56,
    right: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerCloseText: { color: "#fff", fontSize: 16 },
  scannerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 32,
  },
  scannerViewfinder: {
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    position: "relative",
  },
  scannerCornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: C.primary,
    borderTopLeftRadius: 8,
  },
  scannerCornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: C.primary,
    borderTopRightRadius: 8,
  },
  scannerCornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: C.primary,
    borderBottomLeftRadius: 8,
  },
  scannerCornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: C.primary,
    borderBottomRightRadius: 8,
  },
  scannerLine: {
    position: "absolute",
    width: "80%",
    height: 2,
    backgroundColor: C.primary,
    opacity: 0.8,
  },
  scannerPlaceholderText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 22,
  },
  scannerNotFound: {
    backgroundColor: "rgba(224,85,85,0.15)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  scannerNotFoundText: { color: "#e05555", fontSize: 13, textAlign: "center" },
  scannerBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  scannerBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  scannerHint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    textAlign: "center",
  },

  // AI photo modal
  aiModal: { flex: 1 },
  aiTitle: { fontSize: 22, fontWeight: "700", color: C.text, marginBottom: 6 },
  aiSubtitle: {
    fontSize: 14,
    color: C.textLight,
    marginBottom: 24,
    lineHeight: 20,
  },
  aiPhotoBtn: { borderRadius: 20, overflow: "hidden", marginBottom: 16 },
  aiPhotoBtnGrad: { padding: 28, alignItems: "center", gap: 8 },
  aiPhotoBtnIcon: { fontSize: 44 },
  aiPhotoBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  aiPhotoBtnSub: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
  aiAnalysing: { alignItems: "center", paddingVertical: 40, gap: 12 },
  aiAnalysingText: { fontSize: 16, fontWeight: "600", color: C.text },
  aiAnalysingSub: { fontSize: 13, color: C.textLight },
  aiDisclaimer: {
    backgroundColor: "rgba(246,166,35,0.12)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  aiDisclaimerText: { fontSize: 12, color: "#c47f00", fontWeight: "600" },
  aiResultName: {
    fontSize: 17,
    fontWeight: "700",
    color: C.text,
    marginBottom: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 14,
    color: C.textLight,
    marginBottom: 24,
    lineHeight: 20,
  },
});
