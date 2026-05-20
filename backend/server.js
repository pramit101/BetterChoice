import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import { generateMealPlanPrompt, imagePrompt } from "./ai.ts";
import customFoods from "./customFoods.js";
import prisma from "./services/db.js"; // Your Prisma client file

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const USDA_KEY = process.env.USDA_KEY;

/** Start of calendar day in the server’s local timezone (must match exercise `date` storage). */
function startOfLocalDay(d = new Date()) {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
}

function endOfLocalDay(dayStart) {
  const t = new Date(dayStart);
  t.setDate(t.getDate() + 1);
  return t;
}

app.post("/api/onboarding", async (req, res) => {
  const {
    firebaseUid,
    email,
    name,
    age,
    weight,
    goal,
    activityLevel,
    gender,
    height,
    targetDate,
    Gain,
    Loss,
  } = req.body;
  const gainValue = Gain ? parseFloat(Gain) : null;
  const lossValue = Loss ? parseFloat(Loss) : null;

  try {
    const user = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { firebaseUid },
        update: {
          onboarded: false,
          name,
        },
        create: {
          firebaseUid,
          email,
          name,
          onboarded: false,
        },
      });

      await tx.profile.upsert({
        where: {
          userId: user.id,
        },
        update: {
          age,
          weight,
          goal,
          activityLevel,
          gender,
          height,
          targetData: new Date(targetDate),
          Gain: gainValue,
          Lose: lossValue,
        },
        create: {
          userId: user.id,
          age,
          weight,
          goal,
          activityLevel,
          gender,
          height,
          targetData: new Date(targetDate),
          Gain: gainValue,
          Lose: lossValue,
        },
      });

      return user;
    });

    // Fetch fresh profile after transaction
    const fullUser = await prisma.user.findUnique({
      where: { firebaseUid },
      include: {
        profile: true,
        healthPlan: true,
      },
    });

    // Prevent regenerating if plan already exists
    if (!fullUser.healthPlan) {
      console.log("Generating initial AI plan...");

      const model = genAI.getGenerativeModel({
        model: "models/gemini-2.5-flash",
      });

      const prompt = generateMealPlanPrompt(fullUser.profile);

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const cleanJson = text.replace(/```json|```/g, "").trim();

      const plan = JSON.parse(cleanJson);

      await prisma.healthPlan.create({
        data: {
          userId: user.id,
          targetCalories: Number(plan.targetCalories),
          targetProtein: Number(plan.targetProtein),
          targetCarb: Number(plan.targetCarb),
          targetFat: Number(plan.targetFat),
          aiPlanDetails: plan,
        },
      });
    }

    res.status(200).json({
      message: "Onboarding completed successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed onboarding process",
    });
  }
});

app.get("/api/health-plan/:firebaseUid", async (req, res) => {
  const { firebaseUid } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
      include: {
        healthPlan: true,
      },
    });

    if (!user || !user.healthPlan) {
      return res.status(404).json({
        error: "Health plan not found",
      });
    }

    res.json({
      targetCalories: user.healthPlan.targetCalories,
      targetProtein: user.healthPlan.targetProtein,
      targetCarb: user.healthPlan.targetCarb,
      targetFat: user.healthPlan.targetFat,
      ...user.healthPlan.aiPlanDetails,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch health plan",
    });
  }
});

app.post("/api/complete-onboarding/:firebaseUid", async (req, res) => {
  await prisma.user.update({
    where: { firebaseUid: req.params.firebaseUid },
    data: { onboarded: true },
  });
  res.json({ success: true });
});

app.get("/api/user/:firebaseUid", async (req, res) => {
  const { firebaseUid } = req.params;

  try {
    // We use findUnique and include the profile relation
    // so the frontend gets age, weight, and isOnboarded status in one go.
    const user = await prisma.user.findUnique({
      where: { firebaseUid: firebaseUid },
      include: {
        profile: true, // This joins the UserProfile table
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the user and profile merged or nested
    res.status(200).json({
      isOnboarded: user.onboarded,
      ...user.profile, // Spreads age, weight, goal, activityLevel
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error("Error fetching user from Prisma:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Food based search and homescreen server-side starts here

app.get("/api/food/search", async (req, res) => {
  const { q } = req.query;

  // Hit both APIs in parallel
  const [usdaRes, offRes] = await Promise.allSettled([
    fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${q}&api_key=${USDA_KEY}&pageSize=10`,
    ),
    fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&json=1&page_size=10`,
    ),
  ]);

  let usdaFoods = [];
  let offProducts = [];

  if (usdaRes.status === "fulfilled" && usdaRes.value.ok) {
    const contentType = usdaRes.value.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await usdaRes.value.json();
      usdaFoods = data.foods ?? [];
    }
  }
  if (offRes.status === "fulfilled" && offRes.value.ok) {
    const contentType = offRes.value.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await offRes.value.json();
      offProducts = data.products ?? [];
    }
  }

  // Normalise both into same format
  const results = [
    ...usdaFoods.map((f) => ({
      id: f.fdcId,
      name: f.description,
      calories:
        f.foodNutrients.find((n) => n.nutrientName === "Energy")?.value ?? 0,
      protein:
        f.foodNutrients.find((n) => n.nutrientName === "Protein")?.value ?? 0,
      carbs:
        f.foodNutrients.find(
          (n) => n.nutrientName === "Carbohydrate, by difference",
        )?.value ?? 0,
      fat:
        f.foodNutrients.find((n) => n.nutrientName === "Total lipid (fat)")
          ?.value ?? 0,
      source: "usda",
      per: "100g",
    })),
    ...offProducts
      .map((p) => ({
        id: p._id,
        name: p.product_name,
        calories: p.nutriments?.["energy-kcal_100g"] ?? 0,
        protein: p.nutriments?.proteins_100g ?? 0,
        carbs: p.nutriments?.carbohydrates_100g ?? 0,
        fat: p.nutriments?.fat_100g ?? 0,
        source: "off",
        per: "100g",
      }))
      .filter((p) => p.name),
  ];

  const q_lower = q.toLowerCase();
  const customMatches = customFoods.filter((f) =>
    f.name.toLowerCase().includes(q_lower),
  );

  res.json([...customMatches, ...results]);
});

app.post("/api/food/analyse-photo", async (req, res) => {
  const { imageBase64 } = req.body;

  if (imageBase64) {
    console.log("Generating AI Food analysis");

    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.5-flash",
    });

    const prompt = imagePrompt();

    const result = await model.generateContent([
      { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
      { text: prompt },
    ]);
    const text = result.response.text();

    const cleanJson = text.replace(/```json|```/g, "").trim();

    const response = JSON.parse(cleanJson);

    const FinalResult = {
      name: response.name,
      calories: Number(response.calories),
      protein: Number(response.protein),
      carbs: Number(response.carbs),
      fat: Number(response.fat),
      confidence: response.confidence,
      note: response.note,
      per: "1 serving",
      source: "ai",
    };

    return res.status(200).json(FinalResult);
  } else {
    res.status(400).json({
      message: "Image not supplied / Field to receive image",
    });
  }
});

app.post("/api/meals/recent/log", async (req, res) => {
  const { firebaseUid, MealId, FoodId, quantity, unit, mealType, imageUrl } =
    req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { firebaseUid } });
      if (!user) throw new Error("User not found");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const meal = await tx.meal.upsert({
        where: {
          userId_name_date: {
            // needs @@unique in schema
            userId: user.id,
            name: mealType,
            date: today,
          },
        },
        update: {},
        create: {
          userId: user.id,
          name: mealType,
          date: today,
        },
      });

      // Add the food item to today's meal
      const mealItem = await tx.mealItem.create({
        data: {
          mealId: meal.id,
          foodItemId: FoodId,
          quantity,
          unit,
        },
      });

      return mealItem;
    });

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to log recent meal" });
  }
});

app.post("/api/meals/log", async (req, res) => {
  const {
    firebaseUid,
    mealType,
    foodName,
    quantity,
    unit,
    calories,
    protein,
    carbs,
    fat,
    imageUrl,
  } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get the internal user id from firebaseUid
      const user = await tx.user.findUnique({
        where: { firebaseUid },
      });
      if (!user) throw new Error("User not found");

      // 2. Create or find the food item
      const food = await tx.foodItem.upsert({
        where: { name_calories: { name: foodName, calories } }, // needs @@unique in schema
        update: {},
        create: {
          name: foodName,
          calories,
          protein,
          carbs,
          fat,
          isCustom: true,
          imageUri: imageUrl ?? null,
        },
      });

      // 3. Find today's meal of this type or create it
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const meal = await tx.meal.upsert({
        where: {
          userId_name_date: {
            // needs @@unique in schema
            userId: user.id,
            name: mealType,
            date: today,
          },
        },
        update: {},
        create: {
          userId: user.id,
          name: mealType,
          date: today,
        },
      });

      // 4. Create the MealItem linking meal + food
      const mealItem = await tx.mealItem.create({
        data: {
          mealId: meal.id,
          foodItemId: food.id,
          quantity,
          unit,
        },
      });

      return mealItem;
    });

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to log meal" });
  }
});

app.get("/api/meals/today/:firebaseUid", async (req, res) => {
  const { firebaseUid } = req.params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const user = await prisma.user.findUnique({ where: { firebaseUid } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const meals = await prisma.meal.findMany({
    where: {
      userId: user.id,
      date: { gte: today, lt: tomorrow },
    },
    include: {
      items: {
        include: { foodItem: true },
      },
    },
  });

  // Calculate totals across all meals
  let totalCalories = 0,
    totalProtein = 0,
    totalCarbs = 0,
    totalFat = 0;

  const mealsWithTotals = meals.map((meal) => {
    const items = meal.items.map((item) => {
      const scale =
        item.unit === "serving" ? item.quantity : item.quantity / 100;
      const cal = Math.round(item.foodItem.calories * scale);
      const pro = Math.round(item.foodItem.protein * scale * 10) / 10;
      const carb = Math.round((item.foodItem.carbs ?? 0) * scale * 10) / 10;
      const fat = Math.round((item.foodItem.fat ?? 0) * scale * 10) / 10;

      totalCalories += cal;
      totalProtein += pro;
      totalCarbs += carb;
      totalFat += fat;

      return {
        MealId: item.id,
        name: item.foodItem.name,
        quantity: item.quantity,
        unit: item.unit,
        calories: cal,
        protein: pro,
        carbs: carb,
        fat: fat,
        imageUri: item.foodItem.imageUri ?? null,
        per: item.foodItem.isCustom ? "1 serving" : "100g",
        source: item.foodItem.isCustom ? "ai" : "usda",
      };
    });

    return { mealType: meal.name, items };
  });

  res.json({
    meals: mealsWithTotals,
    totals: {
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
    },
  });
});

// Returns calorie totals for the past 7 days (including today) for calendar indicators
app.get("/api/meals/week-summary/:firebaseUid", async (req, res) => {
  const { firebaseUid } = req.params;

  const user = await prisma.user.findUnique({ where: { firebaseUid } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const meals = await prisma.meal.findMany({
    where: { userId: user.id, date: { gte: start, lte: end } },
    include: { items: { include: { foodItem: true } } },
  });

  const dailyCalories = {};
  meals.forEach((meal) => {
    const d = meal.date;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!dailyCalories[key]) dailyCalories[key] = 0;
    meal.items.forEach((item) => {
      const scale =
        item.unit === "serving" ? item.quantity : item.quantity / 100;
      dailyCalories[key] += Math.round(item.foodItem.calories * scale);
    });
  });

  const summary = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    summary.push({ date: key, calories: dailyCalories[key] ?? 0 });
  }

  res.json(summary);
});

// Returns meals for a specific date (YYYY-MM-DD)
app.get("/api/meals/date/:firebaseUid/:date", async (req, res) => {
  const { firebaseUid, date } = req.params;

  const [year, month, day] = date.split("-").map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);

  const user = await prisma.user.findUnique({ where: { firebaseUid } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const meals = await prisma.meal.findMany({
    where: { userId: user.id, date: { gte: start, lt: end } },
    include: { items: { include: { foodItem: true } } },
  });

  let totalCalories = 0,
    totalProtein = 0,
    totalCarbs = 0,
    totalFat = 0;

  const mealsWithTotals = meals.map((meal) => {
    const items = meal.items.map((item) => {
      const scale =
        item.unit === "serving" ? item.quantity : item.quantity / 100;
      const cal = Math.round(item.foodItem.calories * scale);
      const pro = Math.round(item.foodItem.protein * scale * 10) / 10;
      const carb = Math.round((item.foodItem.carbs ?? 0) * scale * 10) / 10;
      const fat = Math.round((item.foodItem.fat ?? 0) * scale * 10) / 10;
      totalCalories += cal;
      totalProtein += pro;
      totalCarbs += carb;
      totalFat += fat;
      return {
        name: item.foodItem.name,
        quantity: item.quantity,
        unit: item.unit,
        calories: cal,
        protein: pro,
        carbs: carb,
        fat: fat,
        imageUri: meal.imageUri ?? null,
        per: item.foodItem.isCustom ? "1 serving" : "100g",
        source: item.foodItem.isCustom ? "ai" : "usda",
      };
    });
    return { mealType: meal.name, items };
  });

  res.json({
    meals: mealsWithTotals,
    totals: {
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
    },
  });
});

app.get("/api/meals/recent/:firebaseUid", async (req, res) => {
  const { firebaseUid } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { firebaseUid } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Get the last 20 unique food items this user has ever logged
    const mealItems = await prisma.mealItem.findMany({
      where: {
        meal: { userId: user.id },
      },
      include: {
        foodItem: true,
        meal: true,
      },
      orderBy: {
        meal: { createdAt: "desc" },
      },
      take: 20,
    });

    // Deduplicate by food name — only return each food once
    const seen = new Set();
    const recent = mealItems
      .filter((item) => {
        if (seen.has(item.foodItem.name)) return false;
        seen.add(item.foodItem.name);
        return true;
      })
      .map((item) => ({
        id: item.foodItem.id,
        name: item.foodItem.name,
        calories: item.foodItem.calories,
        protein: item.foodItem.protein,
        carbs: item.foodItem.carbs ?? 0,
        fat: item.foodItem.fat ?? 0,
        imageUri: item.foodItem.imageUri ?? null,
        per: item.foodItem.isCustom ? "1 serving" : "100g",
        source: item.foodItem.isCustom ? "ai" : "usda",
      }));

    res.json(recent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch recent meals" });
  }
});

app.delete("/api/meals/item/:mealItemId", async (req, res) => {
  const { mealItemId } = req.params;
  try {
    const deleted = await prisma.mealItem.delete({
      where: { id: mealItemId },
    });

    const remaining = await prisma.mealItem.count({
      where: { mealId: deleted.mealId },
    });

    if (remaining === 0) {
      await prisma.meal.delete({
        where: { id: deleted.mealId },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete meal item" });
  }
});

app.post("/saveExercise", async (req, res) => {
  const { firebaseUid, burned } = req.body;
  const caloriesBurned = Number.parseInt(String(burned ?? ""), 10);

  if (!firebaseUid || Number.isNaN(caloriesBurned) || caloriesBurned < 0) {
    return res.status(400).json({
      error: "firebaseUid and a non-negative integer `burned` are required",
    });
  }

  const dayStart = startOfLocalDay();

  try {
    const exercise = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { firebaseUid } });
      if (!user) throw new Error("User not found");

      return tx.exercise.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date: dayStart,
          },
        },
        update: { caloriesBurned },
        create: {
          userId: user.id,
          caloriesBurned,
          date: dayStart,
        },
      });
    });

    res.status(200).json(exercise);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save exercise" });
  }
});

app.get("/exercise/:firebaseUid", async (req, res) => {
  const { firebaseUid } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { firebaseUid } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const today = startOfLocalDay();
    const tomorrow = endOfLocalDay(today);

    const exercises = await prisma.exercise.findMany({
      where: {
        userId: user.id,
        date: { gte: today, lt: tomorrow },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalBurned = exercises.reduce(
      (sum, row) => sum + row.caloriesBurned,
      0,
    );

    res.json({ exercises, totalBurned });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch exercise" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
