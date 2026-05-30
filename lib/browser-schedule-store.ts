import type { ScheduledPost } from "@/lib/types";

const BROWSER_SCHEDULE_KEY = "recastr-local-scheduled-posts";

export function readBrowserScheduledPosts() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(BROWSER_SCHEDULE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScheduledPost[];
    return parsed.filter(isScheduledPostLike);
  } catch {
    return [];
  }
}

export function upsertBrowserScheduledPost(post: ScheduledPost) {
  if (typeof window === "undefined") return;

  const current = readBrowserScheduledPosts();
  const withoutExisting = current.filter((item) => item.id !== post.id && item.contentId !== post.contentId);
  window.localStorage.setItem(BROWSER_SCHEDULE_KEY, JSON.stringify([...withoutExisting, post]));
}

export function updateBrowserScheduledPost(id: string, updates: Partial<ScheduledPost>) {
  if (typeof window === "undefined") return undefined;

  const current = readBrowserScheduledPosts();
  const existing = current.find((post) => post.id === id);
  if (!existing) return undefined;

  const next = { ...existing, ...updates };
  window.localStorage.setItem(
    BROWSER_SCHEDULE_KEY,
    JSON.stringify(current.map((post) => (post.id === id ? next : post))),
  );
  return next;
}

export function isBrowserScheduledPostId(id: string) {
  return id.startsWith("browser-scheduled-");
}

export function isBrowserLocalContentId(contentId: string) {
  return /^(demo|youtube|text|blog|podcast)-/.test(contentId);
}

function isScheduledPostLike(value: unknown): value is ScheduledPost {
  if (!value || typeof value !== "object") return false;
  const post = value as Partial<ScheduledPost>;
  return Boolean(post.id && post.contentId && post.platform && post.publishAt && post.status && post.title);
}
