import { Resend } from "resend";
import { env } from "@/lib/env";

type WeeklyStats = {
  projects: number;
  content: number;
  scheduled: number;
};

let resendClient: Resend | null = null;

function getResend() {
  if (!env.RESEND_API_KEY) return null;
  resendClient ??= new Resend(env.RESEND_API_KEY);
  return resendClient;
}

export async function sendContentReadyEmail(userEmail: string, projectTitle: string) {
  const resend = getResend();
  if (!resend) return;

  await resend.emails.send({
    from: "Recastr <noreply@recastr.app>",
    to: userEmail,
    subject: `Your content for "${projectTitle}" is ready`,
    html: `<p>Your AI content generation for <strong>${escapeHtml(projectTitle)}</strong> has finished.</p><p><a href="${env.appUrl}/dashboard">View your content</a></p>`,
  });
}

export async function sendWeeklyDigestEmail(userEmail: string, stats: WeeklyStats) {
  const resend = getResend();
  if (!resend) return;

  await resend.emails.send({
    from: "Recastr <noreply@recastr.app>",
    to: userEmail,
    subject: "Your Recastr weekly digest",
    html: `<p>This week: ${stats.projects} projects, ${stats.content} content pieces, and ${stats.scheduled} scheduled posts.</p>`,
  });
}

export async function sendScheduleReminderEmail(
  userEmail: string,
  platform: string,
  scheduledAt: Date,
) {
  const resend = getResend();
  if (!resend) return;

  await resend.emails.send({
    from: "Recastr <noreply@recastr.app>",
    to: userEmail,
    subject: `Reminder: post going out to ${platform} soon`,
    html: `<p>Your scheduled post to <strong>${escapeHtml(platform)}</strong> is going out at ${scheduledAt.toLocaleString()}.</p>`,
  });
}

export async function sendPublishedEmail(userEmail: string, platform: string) {
  const resend = getResend();
  if (!resend) return;

  await resend.emails.send({
    from: "Recastr <noreply@recastr.app>",
    to: userEmail,
    subject: `Your ${platform} post was published`,
    html: `<p>Recastr published your scheduled post to <strong>${escapeHtml(platform)}</strong>.</p>`,
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });
}
