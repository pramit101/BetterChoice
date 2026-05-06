import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
);

export const uploadMealImage = async (
  base64: string,
  userId: string,
): Promise<string | null> => {
  try {
    const fileName = `${userId}/${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from("meal-images")
      .upload(fileName, decode(base64), {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("meal-images")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (e) {
    console.error("Image upload failed:", e);
    return null;
  }
};

// base64 decoder
function decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
