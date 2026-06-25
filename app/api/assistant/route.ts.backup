import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { getGeminiClient } from "@/lib/ai/client";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, history } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const gemini = getGeminiClient();
    if (gemini && env.geminiKey) {
      try {
        const formattedContents = [];
        
        // Add conversation history if provided
        if (Array.isArray(history)) {
          for (const turn of history) {
            formattedContents.push({
              role: turn.role === "assistant" ? "model" : "user",
              parts: [{ text: turn.content }],
            });
          }
        }
        
        // Append current message
        formattedContents.push({
          role: "user",
          parts: [{ text: message }],
        });

        const systemInstruction = 
          "You are a helpful AI content assistant for ReCastr. ReCastr is a premium SaaS platform that helps users ingest YouTube videos, podcasts, blog posts, or text, and repurpose them into social media content.\n\n" +
          "Below is a detailed guide of ReCastr features so you can answer user questions accurately:\n" +
          "- Dashboard (/dashboard): Shows quick statistics, calendar agenda, and recent notifications.\n" +
          "- Generator (/generate): Ingests a YouTube URL, podcast, blog post, or text to create social media posts.\n" +
          "- Projects (/projects): A library workspace containing summaries, topics, viral hooks, and platform drafts.\n" +
          "- Calendar (/schedule): A pipeline grid (Month/Week/Day) to schedule email/in-app notifications for generated drafts.\n" +
          "- Analytics (/analytics): Displays metrics of posts created per platform (X, LinkedIn, Facebook, YouTube) and scheduling logs.\n" +
          "- Media Library (/media): An asset manager where users upload images or videos (up to 15MB) to preview them.\n" +
          "- AI Assistant (/assistant): An interactive companion (you!) for copywriting, copywriting adjustments, and app support.\n" +
          "- Settings (/settings): Subscriptions, profile, connected platform credentials.\n\n" +
          "Answer user questions about content strategy, writing hooks, or how to use ReCastr. Keep your responses natural, conversational, actionable, and formatted in clean markdown. Always write in a helpful, human-like voice.";

        const response = await gemini.models.generateContent({
          model: "gemini-2.5-flash",
          contents: formattedContents,
          config: {
            temperature: 0.7,
            systemInstruction: systemInstruction,
          },
        });

        const replyText = response.text || "I'm sorry, I couldn't generate a response.";
        return NextResponse.json({ response: replyText });
      } catch (geminiError: any) {
        console.error("Gemini Assistant Error:", geminiError);
        // Fall back to rule-based mock if API fails
      }
    }

    // Smart Fallback Response System
    const replyText = getFallbackResponse(message);
    return NextResponse.json({ response: replyText });
  } catch (error: any) {
    console.error("Assistant API Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

function getFallbackResponse(message: string): string {
  const query = message.toLowerCase();
  
  if (query.includes("media") || query.includes("upload") || query.includes("image") || query.includes("video") || query.includes("photo") || query.includes("file")) {
    return `### 📁 Using the Media Library in ReCastr

The **Media Library** (located at the **Media** tab or \`/media\` path) is your hub for visual asset management. Here is what it's for:
- **Asset Uploads:** You can upload images, photos, and video files (up to 15MB) directly from your device.
- **Visual Previews:** The library displays previews of your images and videos so you can visualize how they look.
- **Content Preparation:** Keep your creative files in one organized gallery, making it easy to prepare them before you copy/paste and publish your posts manually.

We're working on automatic posting with media attachments soon, but for now, it's the perfect place to store and preview the creatives you plan to pair with your written drafts! Let me know if you need help uploading a file.`;
  }

  if (query.includes("schedule") || query.includes("calendar") || query.includes("remind") || query.includes("pipeline") || query.includes("date") || query.includes("time")) {
    return `### 📅 How the Content Calendar Works

The **Calendar** (located at the **Calendar** tab or \`/schedule\` path) is your posting pipeline dashboard. It features:
- **Month, Week, & Day Views:** Toggle your layout to see your planned posts in whichever perspective is most comfortable.
- **Email Reminders:** When you click 'Remind me' on a draft, you can set a specific date and time. ReCastr will automatically send you an email notification when it's time to copy, paste, and publish your content manually!
- **Active Pipeline:** Your recent pipeline is tracked automatically on the **Analytics** page so you can stay on top of scheduled vs. completed posts.

It's designed to keep your posting schedule consistent without requiring complex API integrations.`;
  }

  if (query.includes("project") || query.includes("list") || query.includes("workspace") || query.includes("folder")) {
    return `### 📂 What are Projects?

In ReCastr, every source you ingest (such as a YouTube video, podcast audio, blog post, or text) is saved as a **Project** (visible in the **Projects** tab or \`/projects\` path). 

Each project contains an isolated, focused workspace where you can:
1. View the AI-generated summary, duration/word counts, and key topics of your source.
2. Browse a list of viral hooks extracted directly from your source.
3. Edit, preview, download, or schedule drafts for Twitter/X, LinkedIn, Facebook, Instagram, Threads, and YouTube Community.

It makes keeping your content sources organized simple!`;
  }

  if (query.includes("generate") || query.includes("repurpose") || query.includes("how it works") || query.includes("how to use") || query.includes("ingest") || query.includes("site") || query.includes("platform")) {
    return `### 🚀 Getting Started with ReCastr

ReCastr is an AI content engine designed to turn long-form content (video, article, podcast, or document) into ready-to-use social media posts. 

Here is the basic workflow:
1. **Ingest a Source:** Go to the **Generator** tab (or \`/generate\`), paste your source URL or raw text, and select your target platforms (like X, LinkedIn, Facebook, or YouTube Community).
2. **Set Tone & Generate:** Choose a tone (e.g. casual, professional, viral) and click **Generate Content**.
3. **Review & Refine:** Open the project workspace to preview the native posts, edit them, or copy them.
4. **Schedule Reminders:** Schedule dates in the **Calendar** to receive email reminders when it's time to publish.

Is there a specific platform or feature you'd like to learn more about?`;
  }

  if (query.includes("hook") || query.includes("headline") || query.includes("title")) {
    return `### 🪝 How to Write Viral Hooks

A great hook is the single most important factor for social media reach. Here are 3 simple human-like templates you can try:

1. **The Curiosity Gap:** "We analyzed 500 LinkedIn posts. The results were not what we expected..."
2. **The Contrarian Angle:** "Most gurus tell you to write daily. Here is why they are setting you up for failure:"
3. **The Clear Transformation:** "I went from 0 to 10k followers using this simple 3-step checklist. Here it is:"

*Tip: You can use the **Hooks & CTAs** platform templates in ReCastr's Generator view to automatically extract these from your sources!* Let me know if you want me to write a custom hook for your topic!`;
  }

  if (query.includes("linkedin") || query.includes("professional") || query.includes("b2b")) {
    return `### 💼 LinkedIn Repurposing Strategy

To stand out on LinkedIn, keep these writing tips in mind:
- **Hook:** Start with a strong statement or direct metric.
- **Context:** Briefly explain why this matters.
- **Core Value:** Provide 3-5 bulleted takeaways. Avoid large walls of text.
- **Spacing:** Leave empty lines between paragraphs to make it highly readable.
- **Engagement:** End with an engaging question to drive comments.

ReCastr's **LinkedIn template** automatically optimizes your source material for professional reader engagement.`;
  }

  if (query.includes("twitter") || query.includes("thread") || query.includes(" x ")) {
    return `### 🐦 Crafting Twitter/X Threads

Twitter/X threads are incredibly powerful for engagement. When repurposing your source to X:
- Keep the first tweet punchy with a call-to-action referencing the original source or newsletter.
- Make each subsequent tweet a standalone valuable tip.
- Use simple formatting, bullet points, and numbers.
- End the thread with a call-to-action referencing the original source or newsletter.

ReCastr's **Twitter template** handles the character limits and automatically segments your content into thread-friendly pieces.`;
  }

  if (query.includes("youtube") || query.includes("video") || query.includes("short")) {
    return `### 🎥 Repurposing YouTube Videos

With ReCastr, you can turn a single YouTube URL into:
- A detailed **LinkedIn article** or post summarizing key insights.
- A **Twitter thread** detailing step-by-step takeaways.
- A **YouTube Community post** to engage subscribers who haven't watched the video yet.

Simply paste your YouTube URL in the Generator tab, select your platforms, and click **Generate Content**.`;
  }

  if (query.includes("hello") || query === "hi" || query.startsWith("hi ") || query.includes("hey") || query.includes("welcome") || query.includes("how are you") || query.includes("morning") || query.includes("afternoon")) {
    return `Hello! What's going on today? Are you ready to generate some posts today? 🚀

I'm your dedicated ReCastr AI Assistant. I can help you with:
- Crafting engaging social media posts.
- Writing better hooks and CTAs.
- Structuring your content calendar.
- Navigating ReCastr features (like the Media Library, Projects, and Scheduler).

What can we build together today?`;
  }

  return `### 🚀 Elevating Your Content Strategy

To get the most out of your source material, try these steps in ReCastr:
1. **Ingest a Source:** Go to the **Generator** tab and paste a YouTube link, blog post URL, or drop raw text.
2. **Select Tone & Platforms:** Choose the target platforms (like Twitter/X, LinkedIn, Instagram) and tone (e.g., Professional, Storytelling).
3. **Refine & Schedule:** Copy the optimized outputs or schedule them directly to your socials in the **Calendar** to receive email reminders when it is time to post.

*Let me know if you have questions about specific platforms, the Media Library, the Calendar, or how to write better hooks!*`;
}
