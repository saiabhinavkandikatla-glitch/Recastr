import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";

export const runtime = "nodejs";

const demoBrandVoices = [
  {
    id: "demo-brand-voice",
    name: "Founder operator",
    toneDescriptors: ["clear", "specific", "practical"],
    bannedWords: ["game-changing", "unlock"],
    samplePosts: [
      "The best growth ideas usually sound boring until they compound.",
      "Specific beats clever when your customer is busy.",
    ],
    targetAudience: "Founders, creators, and operators",
    contentPillars: ["customer insight", "operator lessons", "distribution"],
  },
];

export async function GET(request: Request) {
  await getRequestUser(request);
  return NextResponse.json(demoBrandVoices);
}

export async function POST(request: Request) {
  await getRequestUser(request);
  const body = await request.json();
  return NextResponse.json(
    {
      id: `brand-${Date.now()}`,
      fingerprint: {
        toneDescriptors: ["clear", "specific", "practical"],
        sentenceRhythm: "short-to-medium with strong opening claims",
      },
      ...body,
    },
    { status: 201 },
  );
}
