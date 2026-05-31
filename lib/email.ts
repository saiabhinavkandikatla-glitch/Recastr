import { Resend } from "resend";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "@/lib/env";

type WeeklyStats = {
  projects: number;
  content: number;
  scheduled: number;
};

type ScheduledPostNotificationInput = {
  userEmail: string;
  platform: string;
  postBody: string;
  scheduledAt: Date;
  projectTitle: string;
};

let resendClient: Resend | null = null;
let smtpTransporter: Transporter | null = null;
const FROM =
  env.SMTP_FROM_EMAIL ??
  env.RESEND_FROM_EMAIL ??
  "Recastr <onboarding@resend.dev>";

export function assertEmailConfigured() {
  if (!hasSmtpConfig() && !env.RESEND_API_KEY) {
    throw new Error("Configure SMTP_HOST/SMTP_USER/SMTP_PASS or RESEND_API_KEY to send scheduled post notification emails.");
  }
}

function hasSmtpConfig() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function getSmtpTransporter() {
  assertEmailConfigured();
  if (!hasSmtpConfig()) return null;
  const port = Number(env.SMTP_PORT ?? 587);
  const secure = env.SMTP_SECURE === "true" || port === 465;

  smtpTransporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  return smtpTransporter;
}

function getResend() {
  assertEmailConfigured();
  resendClient ??= new Resend(env.RESEND_API_KEY);
  return resendClient;
}

function getOptionalResend() {
  if (!env.RESEND_API_KEY) return null;
  resendClient ??= new Resend(env.RESEND_API_KEY);
  return resendClient;
}

export async function sendContentReadyEmail(userEmail: string, projectTitle: string) {
  await sendEmail({
    to: userEmail,
    subject: `Your content for "${projectTitle}" is ready`,
    html: `<p>Your AI content generation for <strong>${escapeHtml(projectTitle)}</strong> has finished.</p><p><a href="${env.appUrl}/dashboard">View your content</a></p>`,
  });
}

export async function sendWeeklyDigestEmail(userEmail: string, stats: WeeklyStats) {
  await sendEmail({
    to: userEmail,
    subject: "Your Recastr weekly digest",
    html: `<p>This week: ${stats.projects} projects, ${stats.content} content pieces, and ${stats.scheduled} scheduled posts.</p>`,
    optional: true,
  });
}

export async function sendScheduleReminderEmail(
  userEmail: string,
  platform: string,
  scheduledAt: Date,
) {
  await sendEmail({
    to: userEmail,
    subject: `Reminder: post going out to ${platform} soon`,
    html: `<p>Your scheduled post to <strong>${escapeHtml(platform)}</strong> is going out at ${scheduledAt.toLocaleString()}.</p>`,
    optional: true,
  });
}

export async function sendScheduledPostNotificationEmail({
  userEmail,
  platform,
  postBody,
  scheduledAt,
  projectTitle,
}: ScheduledPostNotificationInput) {
  const scheduledLabel = scheduledAt.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  await sendEmail({
    to: userEmail,
    subject: `Time to post on ${platform} - ${projectTitle}`,
    html: `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
        <h2 style="margin:0 0 4px">Your scheduled ${escapeHtml(platform)} post is ready</h2>
        <p style="margin:0 0 20px;color:#64748b">Scheduled for ${escapeHtml(scheduledLabel)}</p>
        <div style="background:#f8fafc;border-left:4px solid #7C3AED;border-radius:8px;padding:16px;margin-bottom:20px">
          <p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap">${escapeHtml(postBody)}</p>
        </div>
        <p style="color:#334155;margin-bottom:16px">
          Copy the text above and post it to <strong>${escapeHtml(platform)}</strong> manually.
        </p>
        <a href="${env.appUrl}/tasks?tab=scheduled"
           style="display:inline-block;background:#7C3AED;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">
          View scheduled posts
        </a>
      </div>
    `,
  });
}

export async function sendPublishedEmail(userEmail: string, platform: string) {
  await sendEmail({
    to: userEmail,
    subject: `Your ${platform} post was published`,
    html: `<p>Recastr published your scheduled post to <strong>${escapeHtml(platform)}</strong>.</p>`,
    optional: true,
  });
}

async function sendEmail({
  html,
  optional = false,
  subject,
  to,
}: {
  html: string;
  optional?: boolean;
  subject: string;
  to: string;
}) {
  const smtp = getSmtpTransporter();
  if (smtp) {
    await smtp.sendMail({
      from: FROM,
      to,
      subject,
      html,
    });
    return;
  }

  const resend = getOptionalResend();
  if (!resend) {
    if (optional) return;
    assertEmailConfigured();
    return;
  }

  const result = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  });
  throwIfResendFailed(result.error);
}

function throwIfResendFailed(error: unknown) {
  if (!error) return;
  if (error instanceof Error) throw error;
  if (typeof error === "object" && error && "message" in error) {
    throw new Error(String(error.message));
  }
  throw new Error("Resend failed to send email.");
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
