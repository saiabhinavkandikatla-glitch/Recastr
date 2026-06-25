import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
console.log("Using API Key:", apiKey ? apiKey.slice(0, 10) + "..." : "undefined");

if (!apiKey) {
  console.error("GEMINI_API_KEY is not defined in env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function run() {
  try {
    console.log("Calling Gemini...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello, this is a test from Recastr. Respond in 5 words.",
    });
    console.log("Success! Response:", response.text);
  } catch (error) {
    console.error("Failed to generate content:", error);
  }
}

run();
