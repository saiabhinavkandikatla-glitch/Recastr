import OpenAI from "openai";
import * as dotenv from "dotenv";

dotenv.config();

// Try reading from .env.local first
const fs = require('fs');
const path = require('path');
try {
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const envLocal = fs.readFileSync(envLocalPath, 'utf-8');
    envLocal.split('\n').forEach((line: string) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
} catch (e) {}

const apiKey = process.env.OPENAI_API_KEY;
console.log("Using OpenAI API Key:", apiKey ? apiKey.slice(0, 15) + "..." : "undefined");

if (!apiKey) {
  console.error("OPENAI_API_KEY is not defined in env");
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

async function run() {
  try {
    console.log("Calling OpenAI...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hello, respond in 5 words." }],
    });
    console.log("Success! Response:", response.choices[0].message.content);
  } catch (error) {
    console.error("Failed to generate content with OpenAI:", error);
  }
}

run();
