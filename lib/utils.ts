import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SocialOutput } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPlatform(platform: string) {
  if (platform === "TWITTER") return "Twitter/X";
  if (platform === "COMMUNITY") return "Community post";
  if (platform === "FACEBOOK") return "Facebook";
  if (platform === "THREADS") return "Threads";
  return platform.charAt(0) + platform.slice(1).toLowerCase();
}

export function stringifyContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!content || typeof content !== "object") return "";
  if ("content" in content && typeof content.content === "string") {
    return content.content;
  }
  if ("caption" in content && typeof content.caption === "string") {
    return content.caption;
  }
  return JSON.stringify(content, null, 2);
}

export function formatOutputForEditing(output: SocialOutput): string {
  const content = asRecord(output.content);
  if (typeof output.content === "string") return output.content;
  if (!content) return stringifyContent(output.content);

  if (output.platform === "TWITTER") {
    const single = asRecord(content.singleTweet);
    const thread = asRecord(content.thread);
    const quote = asRecord(content.quoteBait);
    return compactSections([
      ["Single tweet", getString(single?.text)],
      ["Thread", getStringArray(thread?.tweets).map((tweet, index) => `${index + 1}. ${tweet}`).join("\n\n")],
      ["Quote tweet angle", getString(quote?.text)],
    ]);
  }

  if (output.platform === "LINKEDIN") {
    const shortPost = asRecord(content.shortPost);
    const longPost = asRecord(content.longPost);
    const poll = asRecord(content.poll);
    return compactSections([
      ["Short post", getString(shortPost?.text)],
      ["Long post", getString(longPost?.text)],
      ["Poll", [getString(poll?.question), ...getStringArray(poll?.options).map((option) => `- ${option}`)].filter(Boolean).join("\n")],
    ]);
  }

  if (output.platform === "INSTAGRAM") {
    const reel = asRecord(content.reelScript);
    const caption = asRecord(content.caption);
    const story = asRecord(content.storySequence);
    const slides = getRecordArray(story?.slides);
    return compactSections([
      [
        "Reel script",
        [
          `Hook: ${getString(reel?.hook)}`,
          `Value: ${getString(reel?.value)}`,
          `CTA: ${getString(reel?.cta)}`,
        ].filter((line) => !line.endsWith(": ")).join("\n"),
      ],
      ["Caption", getString(caption?.text)],
      ["Hashtags", getStringArray(content.hashtags).map((tag) => `#${tag}`).join(" ")],
      [
        "Story sequence",
        slides
          .map((slide, index) =>
            [
              `Slide ${index + 1}: ${getString(slide.text)}`,
              `Visual: ${getString(slide.visualDirection)}`,
            ].join("\n"),
          )
          .join("\n\n"),
      ],
    ]);
  }

  if (output.platform === "COMMUNITY") {
    const post = asRecord(content.post);
    const poll = asRecord(content.poll);
    return compactSections([
      ["Community post", getString(post?.text)],
      [
        "Poll",
        [getString(poll?.question), ...getStringArray(poll?.options).map((option) => `- ${option}`)]
          .filter(Boolean)
          .join("\n"),
      ],
    ]);
  }

  if (output.platform === "CAROUSEL") {
    return getRecordArray(content.slides)
      .map((slide, index) =>
        [
          `Slide ${getString(slide.slideNumber) || index + 1} - ${getString(slide.type)}`,
          getString(slide.headline),
          getString(slide.body),
          `Visual: ${getString(slide.visualSuggestion)}`,
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n\n");
  }

  if (output.platform === "STORY") {
    const story = asRecord(content.storySequence) ?? content;
    const slides = getRecordArray(story.slides);
    return slides
      .map((slide, index) =>
        [
          `Slide ${index + 1}`,
          getString(slide.text),
          `Visual: ${getString(slide.visualDirection)}`,
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n\n");
  }

  return stringifyContent(output.content);
}

export function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function compactSections(sections: Array<[string, string]>) {
  return sections
    .filter(([, body]) => body.trim())
    .map(([title, body]) => `${title}\n${body.trim()}`)
    .join("\n\n");
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item))
    : [];
}
