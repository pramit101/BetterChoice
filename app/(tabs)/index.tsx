import { IP } from "@/constants/IP";
import { useAuth } from "@/services/AuthContext";
import { useTheme } from "@/services/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import {
  CookingPot,
  EggFried,
  LucideIcon,
  Popcorn,
  Sandwich,
} from "lucide-react-native";
import { MotiView } from "moti";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  Stop,
  LinearGradient as SvgGradient,
} from "react-native-svg";

const { width } = Dimensions.get("window");

const C = {
  bg: "#F4FBF7",
  card: "#FFFFFF",
  primary: "#2db87a",
  primaryDeep: "#0d3d2b",
  text: "#0a2318",
  primaryFaint: "#e8faf2",
  textMid: "#3d6653",
  textLight: "#7aaa91",
  border: "rgba(45,184,122,0.12)",
  protein: "#5b8dee",
  carbs: "#f6a623",
  fat: "#e05555",
};

// ─── Animated Ring ────────────────────────────────────────────────────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function CalorieRing({
  size,
  strokeWidth,
  progress,
}: {
  size: number;
  strokeWidth: number;
  progress: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(progress, 1),
      duration: 1400,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const dashoffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <Svg width={size} height={size} style={{ position: "absolute" }}>
      <Defs>
        <SvgGradient id="cg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#6ee7b0" />
          <Stop offset="1" stopColor="#2db87a" />
        </SvgGradient>
      </Defs>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="url(#cg)"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

// ─── Thin Macro Bar ───────────────────────────────────────────────────────────
function ThinMacroBar({
  label,
  current,
  target,
  color,
  delay = 0,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
  delay?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const progress = target > 0 ? Math.min(current / target, 1) : 0;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 900,
      delay,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.thinBarWrap}>
      <View style={styles.thinBarMeta}>
        <View style={styles.thinBarLeft}>
          <View style={[styles.thinDot, { backgroundColor: color }]} />
          <Text style={styles.thinLabel}>{label}</Text>
        </View>
        <Text style={styles.thinValues}>
          <Text style={{ color, fontWeight: "700" }}>{current}</Text>
          <Text style={styles.thinTarget}>/{target}g</Text>
        </Text>
      </View>
      <View style={styles.thinTrack}>
        <Animated.View
          style={[
            styles.thinFill,
            {
              backgroundColor: color,
              width: anim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

type LoggedItem = {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUri?: string;
  source: string;
  per: string;
};

type MealSection = {
  mealType: string;
  items: LoggedItem[];
};

const MEAL_ICONS: Record<string, LucideIcon> = {
  Breakfast: EggFried,
  Lunch: Sandwich,
  Dinner: CookingPot,
  Snack: Popcorn,
};

function LoggedFoodRow({
  item,
  onPress,
  dark,
}: {
  item: LoggedItem;
  onPress: () => void;
  dark: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.loggedRow, dark && styles.loggedRowDark]}
    >
      {item.source === "ai" && item.imageUri && (
        <Image source={{ uri: item.imageUri }} style={styles.foodRowImage} />
      )}
      <View style={styles.loggedRowLeft}>
        <Text
          style={[styles.loggedRowName, dark && styles.loggedRowNameDark]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text style={[styles.loggedRowMeta, dark && styles.loggedRowMetaDark]}>
          {item.quantity}
          {item.unit}
        </Text>
      </View>
      <View style={styles.loggedRowRight}>
        <Text style={styles.loggedRowKcal}>{item.calories}</Text>
        <Text
          style={[styles.loggedRowKcalLabel, dark && styles.loggedRowMetaDark]}
        >
          kcal
        </Text>
        <View style={styles.loggedMacros}>
          <Text style={[styles.loggedMacroBadge, { color: C.protein }]}>
            P {item.protein}g
          </Text>
          <Text style={[styles.loggedMacroBadge, { color: C.carbs }]}>
            C {item.carbs}g
          </Text>
          <Text style={[styles.loggedMacroBadge, { color: C.fat }]}>
            F {item.fat}g
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MealSection({ meal, index }: { meal: MealSection; index: number }) {
  const { dark } = useTheme();
  const [expanded, setExpanded] = useState(true);
  const [selectedItem, setSelectedItem] = useState<LoggedItem | null>(null);
  const IconComponent = MEAL_ICONS[meal.mealType];

  const mealTotal = meal.items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 400, delay: index * 80 }}
      style={[styles.mealSection, dark && styles.mealSectionDark]}
    >
      {/* Meal header — tap to expand/collapse */}
      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
        style={styles.mealSectionHeader}
      >
        <View style={styles.mealSectionLeft}>
          <Text style={styles.mealSectionIcon}>
            <IconComponent
              size={20}
              color={expanded ? "#2E8B57" : dark ? "white" : "#2C3E50"}
              strokeWidth={1.5}
            />
          </Text>
          <View>
            <Text
              style={[
                styles.mealSectionName,
                dark && styles.mealSectionNameDark,
              ]}
            >
              {meal.mealType}
            </Text>
            <Text
              style={[
                styles.mealSectionCount,
                dark && styles.mealSectionCountDark,
              ]}
            >
              {meal.items.length} item{meal.items.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
        <View style={styles.mealSectionRight}>
          <Text style={styles.mealSectionKcal}>{mealTotal.calories} kcal</Text>
          <Text
            style={[
              styles.mealSectionChevron,
              dark && styles.mealSectionCountDark,
            ]}
          >
            {expanded ? "▲" : "▼"}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Items */}
      {expanded && (
        <View
          style={[styles.mealSectionItems, dark && styles.mealSectionItemsDark]}
        >
          {meal.items.map((item, j) => (
            <LoggedFoodRow
              key={j}
              item={item}
              onPress={() => setSelectedItem(item)}
              dark={dark}
            />
          ))}
        </View>
      )}

      {/* Item detail modal */}
      <Modal
        visible={!!selectedItem}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <TouchableOpacity
          style={styles.detailOverlay}
          activeOpacity={1}
          onPress={() => setSelectedItem(null)}
        />
        {selectedItem && (
          <View style={[styles.detailSheet, dark && styles.detailSheetDark]}>
            <View
              style={[styles.detailHandle, dark && styles.detailHandleDark]}
            />
            <Text style={[styles.detailName, dark && styles.detailNameDark]}>
              {selectedItem.name}
            </Text>
            <Text
              style={[styles.detailServing, dark && styles.detailServingDark]}
            >
              {selectedItem.quantity}
              {selectedItem.unit}
            </Text>
            {selectedItem.source === "ai" && selectedItem.imageUri && (
              <Image
                source={{ uri: selectedItem.imageUri }}
                style={styles.detailImage}
                resizeMode="contain"
              />
            )}

            <View
              style={[styles.detailMacros, dark && styles.detailMacrosDark]}
            >
              {[
                {
                  label: "Calories",
                  val: selectedItem.calories,
                  unit: "kcal",
                  color: C.primary,
                },
                {
                  label: "Protein",
                  val: selectedItem.protein,
                  unit: "g",
                  color: C.protein,
                },
                {
                  label: "Carbs",
                  val: selectedItem.carbs,
                  unit: "g",
                  color: C.carbs,
                },
                {
                  label: "Fat",
                  val: selectedItem.fat,
                  unit: "g",
                  color: C.fat,
                },
              ].map((m) => (
                <View key={m.label} style={styles.detailMacroItem}>
                  <Text style={[styles.detailMacroVal, { color: m.color }]}>
                    {m.val}
                  </Text>
                  <Text
                    style={[
                      styles.detailMacroUnit,
                      dark && styles.detailServingDark,
                    ]}
                  >
                    {m.unit}
                  </Text>
                  <Text
                    style={[
                      styles.detailMacroLabel,
                      dark && styles.detailMacroLabelDark,
                    ]}
                  >
                    {m.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* TODO: Add delete item button */}
            <TouchableOpacity
              style={[styles.detailClose, dark && styles.detailCloseDark]}
              onPress={() => setSelectedItem(null)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.detailCloseText,
                  dark && styles.detailCloseTextDark,
                ]}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </MotiView>
  );
}
// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { dark } = useTheme();
  const { user } = useAuth();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logged, setLogged] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  type MealSectionData = {
    mealType: string;
    items: LoggedItem[];
  };
  const [meals, setMeals] = useState<MealSectionData[]>([]);

  const fetchTodaysMeals = async () => {
    const res = await fetch(`http://${IP}:3000/api/meals/today/${user?.uid}`);
    const data = await res.json();
    setLogged(data.totals);
    setMeals(data.meals);
  };

  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        fetchPlan();
        fetchTodaysMeals();
      }
    }, [user]),
  );

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://${IP}:3000/api/health-plan/${user?.uid}`);
      const data = await res.json();
      if (res.ok) setPlan(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const targets = {
    calories: plan?.targetCalories ?? 0,
    protein: plan?.targetProtein ?? 0,
    carbs: plan?.targetCarb ?? 0,
    fat: plan?.targetFat ?? 0,
  };

  const calProgress =
    targets.calories > 0 ? logged.calories / targets.calories : 0;
  const remaining = Math.max(targets.calories - logged.calories, 0);
  const ringSize = 136;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const firstName = user?.displayName?.split(" ")[0] ?? "there";

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.root, dark && styles.rootDark]}
        edges={["top"]}
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={[styles.loadingText, dark && styles.loadingTextDark]}>
            Loading your plan...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.root, dark && styles.rootDark]}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500 }}
          style={styles.header}
        >
          <View>
            <Text style={[styles.greeting, dark && styles.greetingDark]}>
              {greeting()}
            </Text>
            <Text style={[styles.name, dark && styles.nameDark]}>
              {firstName}{" "}
            </Text>
          </View>
          <LinearGradient
            colors={[C.primary, C.primaryDeep]}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {(user?.displayName ?? user?.email ?? "U")[0].toUpperCase()}
            </Text>
          </LinearGradient>
        </MotiView>

        {/* Calorie + Macros Card */}
        <MotiView
          from={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", delay: 80 }}
          style={styles.mainCard}
        >
          <LinearGradient
            colors={["#0d3d2b", "#1a6644"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainGrad}
          >
            {/* Ring + Stats row */}
            <View style={styles.topRow}>
              <View
                style={{
                  width: ringSize,
                  height: ringSize,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CalorieRing
                  size={ringSize}
                  strokeWidth={10}
                  progress={calProgress}
                />
                <View style={styles.ringInner}>
                  <Text style={styles.ringKcal}>{logged.calories}</Text>
                  <Text style={styles.ringKcalSub}>kcal</Text>
                </View>
              </View>

              <View style={styles.statsCol}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{targets.calories}</Text>
                  <Text style={styles.statLbl}>Target kcal</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: "#6ee7b0" }]}>
                    {remaining}
                  </Text>
                  <Text style={styles.statLbl}>Remaining</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>0</Text>
                  <Text style={styles.statLbl}>Burned</Text>
                </View>
              </View>
            </View>

            {/* Thin divider */}
            <View style={styles.cardDivider} />

            {/* Compact horizontal macro bars */}
            <View style={styles.macrosRow}>
              <ThinMacroBar
                label="Protein"
                current={logged.protein}
                target={targets.protein}
                color={C.protein}
                delay={100}
              />
              <ThinMacroBar
                label="Carbs"
                current={logged.carbs}
                target={targets.carbs}
                color={C.carbs}
                delay={180}
              />
              <ThinMacroBar
                label="Fat"
                current={logged.fat}
                target={targets.fat}
                color={C.fat}
                delay={260}
              />
            </View>
          </LinearGradient>
        </MotiView>

        {/* ── LOG FOOD — main CTA ── */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", delay: 180 }}
          style={{ marginBottom: 10 }}
        >
          <TouchableOpacity
            onPress={() => {
              router.push("../Screens/logFood");
            }}
            activeOpacity={0.85}
            style={styles.logBtnWrap}
          >
            <LinearGradient
              colors={[C.primary, C.primaryDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logBtn}
            >
              <Text style={styles.logBtnPlus}>+</Text>
              <Text style={styles.logBtnText}>Log Food</Text>
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>

        {/* Today's meals */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400, delay: 360 }}
        >
          <Text style={[styles.sectionTitle, dark && styles.sectionTitleDark]}>
            Today's Meals
          </Text>
          {logged.calories ? (
            <View>
              {meals.map((meal, i) => (
                <MealSection key={meal.mealType} meal={meal} index={i} />
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, dark && styles.emptyCardDark]}>
              <Text style={styles.emptyEmoji}>🥗</Text>
              <Text style={[styles.emptyTitle, dark && styles.emptyTitleDark]}>
                Nothing logged yet
              </Text>
              <Text style={[styles.emptySub, dark && styles.emptySubDark]}>
                Tap "Log Food" to add your first meal
              </Text>
            </View>
          )}
        </MotiView>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  rootDark: { backgroundColor: "#081410" },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: C.textLight },
  loadingTextDark: { color: "#4a7a61" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    marginTop: 4,
  },
  greeting: { fontSize: 13, color: C.textLight, fontWeight: "500" },
  greetingDark: { color: "#44aa44" },
  name: { fontSize: 22, fontWeight: "700", color: C.text, marginTop: 1 },
  nameDark: { color: "#e0f5ec" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: { color: "#fff", fontSize: 17, fontWeight: "700" },

  mainCard: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: C.primaryDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  mainGrad: { padding: 20 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  ringInner: { alignItems: "center" },
  ringKcal: { fontSize: 26, fontWeight: "800", color: "#fff" },
  ringKcalSub: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 1 },

  statsCol: { flex: 1, paddingLeft: 18, gap: 8 },
  statItem: {},
  statVal: { fontSize: 17, fontWeight: "700", color: "#fff" },
  statLbl: { fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 },
  statDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)" },

  cardDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginBottom: 14,
  },

  macrosRow: { gap: 8 },
  thinBarWrap: { gap: 4 },
  thinBarMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  thinBarLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  thinDot: { width: 6, height: 6, borderRadius: 3 },
  thinLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
  },
  thinValues: { fontSize: 11 },
  thinTarget: { color: "rgba(255,255,255,0.35)", fontWeight: "400" },
  thinTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  thinFill: { height: "100%", borderRadius: 2 },

  logBtnWrap: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
  logBtn: {
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  foodRowImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 10,
  },
  logBtnPlus: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "300",
    lineHeight: 26,
  },
  logBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  quickRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 22,
    flexWrap: "wrap",
  },
  quickPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  quickText: { fontSize: 13, fontWeight: "600", color: C.textMid },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 10,
  },
  sectionTitleDark: { color: "#e0f5ec" },
  emptyCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
  },
  emptyCardDark: {
    backgroundColor: "#0f2018",
    borderColor: "rgba(45,184,122,0.2)",
  },
  emptyEmoji: { fontSize: 34, marginBottom: 10 },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    marginBottom: 5,
  },
  emptyTitleDark: { color: "#e0f5ec" },
  emptySub: {
    fontSize: 12,
    color: C.textLight,
    textAlign: "center",
    lineHeight: 18,
  },
  emptySubDark: { color: "#8fc1a8" },
  // add to your StyleSheet.create({})
  mealsWrap: { gap: 12 },

  mealSection: {
    backgroundColor: C.card,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.primaryDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mealSectionDark: {
    backgroundColor: "#0f2018",
    borderColor: "rgba(45,184,122,0.18)",
    shadowOpacity: 0.2,
  },
  mealSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  mealSectionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  mealSectionIcon: { fontSize: 24 },
  mealSectionName: { fontSize: 15, fontWeight: "700", color: C.text },
  mealSectionNameDark: { color: "#e0f5ec" },
  mealSectionCount: { fontSize: 12, color: C.textLight, marginTop: 1 },
  mealSectionCountDark: { color: "#8fc1a8" },
  mealSectionRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  mealSectionKcal: { fontSize: 14, fontWeight: "700", color: C.primary },
  mealSectionChevron: { fontSize: 10, color: C.textLight },
  mealSectionItems: {
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  mealSectionItemsDark: {
    borderTopColor: "rgba(45,184,122,0.2)",
  },

  loggedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  loggedRowDark: {
    borderBottomColor: "rgba(45,184,122,0.14)",
  },
  loggedRowLeft: { flex: 1, paddingRight: 12 },
  loggedRowName: { fontSize: 14, fontWeight: "600", color: C.text },
  loggedRowNameDark: { color: "#e0f5ec" },
  loggedRowMeta: { fontSize: 12, color: C.textLight, marginTop: 2 },
  loggedRowMetaDark: { color: "#8fc1a8" },
  loggedRowRight: { alignItems: "flex-end", gap: 3 },
  loggedRowKcal: { fontSize: 16, fontWeight: "800", color: C.primary },
  loggedRowKcalLabel: { fontSize: 10, color: C.textLight, marginTop: -3 },
  loggedMacros: { flexDirection: "row", gap: 4 },
  loggedMacroBadge: { fontSize: 10, fontWeight: "600" },

  // Detail modal
  detailOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(8,20,16,0.5)",
  },
  detailSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
  },
  detailSheetDark: {
    backgroundColor: "#0f2018",
  },
  detailHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  detailHandleDark: {
    backgroundColor: "rgba(45,184,122,0.24)",
  },
  detailName: {
    fontSize: 20,
    fontWeight: "700",
    color: C.text,
    marginBottom: 4,
  },
  detailNameDark: {
    color: "#e0f5ec",
  },
  detailServing: { fontSize: 13, color: C.textLight, marginBottom: 20 },
  detailServingDark: { color: "#8fc1a8" },
  detailMacros: {
    flexDirection: "row",
    backgroundColor: C.primaryFaint,
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
  },
  detailMacrosDark: {
    backgroundColor: "#0a1a10",
  },
  detailMacroItem: { flex: 1, alignItems: "center", paddingVertical: 16 },
  detailMacroVal: { fontSize: 18, fontWeight: "800" },
  detailMacroUnit: { fontSize: 10, color: C.textLight, marginTop: 2 },
  detailMacroLabel: {
    fontSize: 11,
    color: C.textMid,
    marginTop: 3,
    fontWeight: "600",
  },
  detailMacroLabelDark: {
    color: "#8fc1a8",
  },
  detailClose: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  detailCloseDark: {
    borderColor: "rgba(45,184,122,0.25)",
  },
  detailCloseText: { fontSize: 14, fontWeight: "600", color: C.textMid },
  detailCloseTextDark: { color: "#c8edd8" },
  detailImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginBottom: 14,
  },
});
