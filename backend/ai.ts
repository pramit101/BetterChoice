export const generateMealPlanPrompt = (profile: any) => {
  const readableDate = profile.targetData.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const today = new Date();
  const weeksRemaining = Math.max(
    1,
    Math.round(
      (profile.targetData.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24 * 7),
    ),
  );

  return `
  Act as a professional nutritionist.
  
  Based on the user stats below, calculate precise daily nutrition targets.
  
  User:
  - Name: ${profile.name}
  - Age: ${profile.age}
  - Weight: ${profile.weight} kg
  - Goal: ${profile.goal}
  - Activity Level: ${profile.activityLevel}
  - Gender: ${profile.gender}
  - Height: ${profile.height}
  - Weight Gain goal: ${profile.Gain} (if exists, if null then ignore)
  - Weight Loss goal: ${profile.Loss} (if exists, if null then ignore)
  - The user wants to reach their goal by ${readableDate}. 
    This gives them exactly ${weeksRemaining} weeks to achieve the goal weight.
  
  STRICT RULES:
  - targetCalories MUST be a single INTEGER (no ranges, no units)
  - targetProtein MUST be a single INTEGER (no ranges, no units)
  - targetFat MUST be a single INTEGER (no ranges, no units)
  - targetCarb MUST be a single INTEGER (no ranges, no units)
  - Do NOT include text like "kcal" or "g" in numeric fields
  - aiResponse can be descriptive and motivational
  
  Return ONLY valid JSON in this format:
  
  {
    "targetCalories": 1300,
    "targetProtein": 28,
    "targetCarb": number,
    "targetFat": number,
    "aiResponse": "..."
  }
  `;
};

export const imagePrompt = () => {
  return `Analyse this food image. Return ONLY JSON:
     { "name": string, "calories": number, "protein": number,
      "carbs": number, "fat": number, "confidence": "low"|"medium"|"high",
      "note": string }`;
};
