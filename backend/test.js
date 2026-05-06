import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  console.log(process.env.GEMINI_API_KEY);
  try {
    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.5-flash",
    });

    const result = await model.generateContent("Say hello");
    console.log(result.response.text());
  } catch (err) {
    console.error(err);
  }
}

test();
