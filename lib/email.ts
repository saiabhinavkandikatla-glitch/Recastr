import nodemailer from "nodemailer";
import type { SendMailOptions, Transporter } from "nodemailer";
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

type SendEmailInput = {
  html: string;
  optional?: boolean;
  subject: string;
  text?: string;
  to: string;
};

type SmtpConfig = {
  from: string;
  host: string;
  pass: string;
  port: number;
  secure: boolean;
  user: string;
};

let smtpTransporter: Transporter | null = null;
let lastVerifiedAt = 0;
const EMAIL_VERIFY_CACHE_MS = 5 * 60 * 1000;

export function assertEmailConfigured() {
  const config = resolveSmtpConfig();
  if (!config) {
    throw new Error(
      "Configure free SMTP email with SMTP_HOST/SMTP_USER/SMTP_PASS or Gmail EMAIL_USER/EMAIL_APP_PASSWORD.",
    );
  }
  if (!isValidSenderAddress(config.from)) {
    throw new Error(
      "SMTP_FROM_EMAIL must contain a valid email address, for example: Recastr <name@example.com>.",
    );
  }
}

export async function verifyEmailTransport() {
  const transporter = getSmtpTransporter();
  await transporter.verify();
  lastVerifiedAt = Date.now();
  return { ok: true };
}

export async function assertEmailTransportReady() {
  assertEmailConfigured();
  if (Date.now() - lastVerifiedAt < EMAIL_VERIFY_CACHE_MS) return;
  await verifyEmailTransport();
}

export async function sendTestEmail(to: string) {
  await sendEmail({
    to,
    subject: "Recastr email test",
    text: "Your Recastr SMTP email setup is working.",
    html: baseEmailTemplate({
      heading: "SMTP email is working",
      intro: "Your Recastr scheduled reminder emails can now be delivered through your free SMTP provider.",
      body: `<p style="margin:0;color:#e5e5e5;line-height:1.6">This is a test message from Recastr.</p>`,
      ctaHref: `${env.appUrl}/tasks?tab=scheduled`,
      ctaLabel: "Open scheduled posts",
      metaRows: [
        { label: "Connection Status", value: "Verified" },
        { label: "Auth Mode", value: env.SMTP_USER ? "Password" : "None" }
      ],
      footerText: "You are receiving this email to verify your SMTP setup in Recastr.",
    }),
  });
}

export async function sendContentReadyEmail(
  userEmail: string,
  projectTitle: string,
  platforms: string[] = ["LINKEDIN", "TWITTER", "INSTAGRAM"]
) {
  const platformLabel = platforms
    .map((p) => {
      const mapping: Record<string, string> = {
        TWITTER: "X",
        LINKEDIN: "LinkedIn",
        INSTAGRAM: "Instagram",
        FACEBOOK: "Facebook",
        THREADS: "Threads",
        CAROUSEL: "Carousel",
        COMMUNITY: "Community",
        STORY: "Story",
        HOOKS: "Hooks",
        CTA: "CTA"
      };
      return mapping[p.toUpperCase()] || p;
    })
    .join(" • ");

  await sendEmail({
    to: userEmail,
    subject: `Your content for "${projectTitle}" is ready`,
    html: baseEmailTemplate({
      heading: "Content Ready",
      intro: "Your AI-generated content has finished processing and is ready for review.",
      body: `
        <p style="margin:0 0 16px 0;color:#e5e5e5;line-height:1.6">Your content is ready. Open Recastr to review, edit, and publish it.</p>
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;word-wrap:break-word;word-break:break-word;margin-bottom:16px;">
          <p style="margin:0;font-size:14px;line-height:1.5;color:#ffffff;font-weight:500;">
            ${escapeHtml(projectTitle)}
          </p>
        </div>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:24px;text-align:center;word-wrap:break-word;word-break:break-word;">
          <p style="margin:0 0 8px 0;font-size:13px;color:#8A8A8A;font-family:inherit;font-weight:500;">Platforms</p>
          <p style="margin:0;font-size:20px;color:#ffffff;font-weight:700;font-family:inherit;line-height:1.4;">${platformLabel}</p>
        </div>
      `,
      ctaHref: `${env.appUrl}/dashboard`,
      ctaLabel: "Open Dashboard",
      metaRows: [
        { label: "Generated successfully", value: "Yes" },
        { label: "Schedule status", value: "Ready to schedule" },
        { label: "Created by", value: "Recastr AI" }
      ],
      footerText: "You are receiving this email because a content generation task was completed in Recastr.",
    }),
  });
}

export async function sendWeeklyDigestEmail(userEmail: string, stats: WeeklyStats) {
  await sendEmail({
    to: userEmail,
    subject: "Your Recastr weekly digest",
    html: baseEmailTemplate({
      heading: "Weekly snapshot",
      intro: "A quick snapshot of your content workflow this week.",
      body: "<p style=\"margin:0 0 16px 0;color:#e5e5e5;line-height:1.6\">Here is a summary of your workspace activity:</p>",
      ctaHref: `${env.appUrl}/dashboard`,
      ctaLabel: "Go to dashboard",
      metaRows: [
        { label: "Projects processed", value: `${stats.projects}` },
        { label: "Content pieces generated", value: `${stats.content}` },
        { label: "Scheduled publications", value: `${stats.scheduled}` }
      ],
      footerText: "You are receiving this because you are subscribed to weekly digest reports in Recastr.",
    }),
    optional: true,
  });
}

export async function sendScheduleReminderEmail(
  userEmail: string,
  platform: string,
  scheduledAt: Date,
) {
  const scheduledLabel = formatScheduledDate(scheduledAt);
  await sendEmail({
    to: userEmail,
    subject: `Reminder: post to ${platform}`,
    html: baseEmailTemplate({
      heading: "Scheduled Reminder",
      intro: `Your post is scheduled for ${escapeHtml(scheduledLabel)}.`,
      body: `<p style="margin:0;color:#e5e5e5;line-height:1.6">Open Recastr to review your scheduled content and publish it.</p>`,
      ctaHref: `${env.appUrl}/tasks?tab=scheduled`,
      ctaLabel: "View scheduled posts",
      metaRows: [
        { label: "Platform", value: platform },
        { label: "Scheduled Time", value: scheduledLabel }
      ],
      footerText: "You received this because you scheduled a reminder in Recastr.",
    }),
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
  const scheduledLabel = formatScheduledDate(scheduledAt);
  const escapedBody = escapeHtml(postBody);
  const escapedPlatform = escapeHtml(platform);

  await sendEmail({
    to: userEmail,
    subject: `Time to post: ${platform}`,
    text: `Time to post on ${platform}\n\nProject: ${projectTitle}\nScheduled: ${scheduledLabel}\n\n${postBody}\n\nOpen Recastr: ${env.appUrl}/tasks?tab=scheduled`,
    html: baseEmailTemplate({
      heading: `Time to post on ${escapedPlatform}`,
      intro: `It's time to publish your post for project: ${escapeHtml(projectTitle)}.`,
      body: `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:20px;margin-bottom:20px;word-wrap:break-word;word-break:break-word;">
          <p style="margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap;color:#e5e5e5;text-align:left;">${escapedBody}</p>
        </div>
        <p style="color:#8A8A8A;margin:0;line-height:1.6;font-size:13px">
          Copy the content above and post it manually to <strong>${escapedPlatform}</strong>.
        </p>
      `,
      ctaHref: `${env.appUrl}/tasks?tab=scheduled`,
      ctaLabel: "View scheduled posts",
      metaRows: [
        { label: "Project", value: projectTitle },
        { label: "Platform", value: platform },
        { label: "Scheduled Time", value: scheduledLabel }
      ],
      footerText: "You received this because you scheduled a reminder in Recastr.",
    }),
  });
}

export async function sendPublishedEmail(userEmail: string, platform: string) {
  await sendEmail({
    to: userEmail,
    subject: `${platform} reminder was sent`,
    html: baseEmailTemplate({
      heading: "Reminder Sent",
      intro: `Your scheduled reminder for ${escapeHtml(platform)} was successfully delivered.`,
      body: "<p style=\"margin:0;color:#e5e5e5;line-height:1.6\">Open Recastr to see your notification history.</p>",
      ctaHref: `${env.appUrl}/tasks?tab=history`,
      ctaLabel: "View history",
      metaRows: [
        { label: "Channel", value: platform },
        { label: "Notification Status", value: "Sent" }
      ],
      footerText: "You received this because you scheduled a reminder in Recastr.",
    }),
    optional: true,
  });
}

export async function sendEmail({
  html,
  optional = false,
  subject,
  text,
  to,
}: SendEmailInput) {
  try {
    const transporter = getSmtpTransporter();
    const config = resolveSmtpConfig();
    if (!config) throw new Error("SMTP email is not configured.");

    const message: SendMailOptions = {
      from: config.from,
      html,
      subject,
      text,
      to,
    };

    return await transporter.sendMail(message);
  } catch (error) {
    if (optional) return null;
    throw error;
  }
}

function getSmtpTransporter() {
  assertEmailConfigured();
  const config = resolveSmtpConfig();
  if (!config) throw new Error("SMTP email is not configured.");

  smtpTransporter ??= nodemailer.createTransport({
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    host: config.host,
    port: config.port,
    secure: config.secure,
    socketTimeout: 15_000,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return smtpTransporter;
}

function resolveSmtpConfig(): SmtpConfig | null {
  const gmailUser = env.EMAIL_USER;
  const gmailPassword = env.EMAIL_APP_PASSWORD;
  const smtpUser = env.SMTP_USER ?? gmailUser;
  const smtpPass = env.SMTP_PASS ?? gmailPassword;
  const smtpHost = env.SMTP_HOST ?? (gmailUser && gmailPassword ? "smtp.gmail.com" : undefined);

  if (!smtpHost || !smtpUser || !smtpPass) return null;

  const port = Number(env.SMTP_PORT ?? 587);
  return {
    from: env.SMTP_FROM_EMAIL ?? env.EMAIL_FROM ?? `Recastr <${smtpUser}>`,
    host: smtpHost,
    pass: smtpPass,
    port,
    secure: env.SMTP_SECURE === "true" || port === 465,
    user: smtpUser,
  };
}

function isValidSenderAddress(value: string) {
  const match = value.match(/<([^<>]+)>/);
  const address = (match?.[1] ?? value).trim();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address);
}

function formatScheduledDate(value: Date) {
  return value.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

function baseEmailTemplate({
  body,
  ctaHref,
  ctaLabel,
  heading,
  intro,
  secondaryCtaHref,
  secondaryCtaLabel,
  metaRows,
  footerText,
}: {
  body: string;
  ctaHref: string;
  ctaLabel: string;
  heading: string;
  intro: string;
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
  metaRows?: { label: string; value: string }[];
  footerText?: string;
}) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        @media only screen and (max-width: 600px) {
          .content-card {
            padding: 24px !important;
            border-radius: 12px !important;
          }
          .cta-btn {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
            box-sizing: border-box !important;
          }
          .sec-cta-btn {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
            margin-left: 0 !important;
            margin-top: 12px !important;
            box-sizing: border-box !important;
          }
        }
        .cta-btn:hover {
          background-color: #f4f4f5 !important;
          transform: scale(1.02);
        }
      </style>
    </head>
    <body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#ffffff;padding:40px 16px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" class="content-card" style="max-width:600px;background-color:#0A0A0A;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px;text-align:left;box-sizing:border-box;">
              <!-- Header -->
              <tr>
                <td style="padding-bottom:28px;">
                  <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:18px;font-weight:900;color:#ffffff;font-family:inherit;padding-right:8px;letter-spacing:-0.03em;line-height:1;">R</td>
                      <td style="font-size:11px;font-weight:700;color:#8A8A8A;letter-spacing:0.2em;text-transform:uppercase;font-family:inherit;line-height:1;">RECASTR</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Main Heading -->
              <tr>
                <td style="padding-bottom:12px;">
                  <h1 style="margin:0;font-size:24px;font-weight:700;line-height:1.2;color:#ffffff;letter-spacing:-0.02em;">${heading}</h1>
                </td>
              </tr>
              <!-- Intro -->
              <tr>
                <td style="padding-bottom:24px;font-size:14px;line-height:1.6;color:#a1a1aa;font-family:inherit;">
                  ${intro}
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="font-size:14px;line-height:1.6;color:#e5e5e5;padding-bottom:28px;font-family:inherit;">
                  ${body}
                </td>
              </tr>
              <!-- CTA Action -->
              <tr>
                <td style="padding-bottom:28px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td>
                        <a href="${ctaHref}" class="cta-btn" style="display:inline-block;background-color:#ffffff;color:#000000;text-decoration:none;border-radius:9999px;height:48px;line-height:48px;padding:0 28px;font-size:14px;font-weight:600;text-align:center;transition:transform 0.15s ease, background-color 0.15s ease;box-sizing:border-box;font-family:inherit;">${ctaLabel}</a>
                        ${
                          secondaryCtaHref && secondaryCtaLabel
                            ? `<a href="${secondaryCtaHref}" class="sec-cta-btn" style="display:inline-block;margin-left:16px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;line-height:48px;vertical-align:middle;box-sizing:border-box;font-family:inherit;">${secondaryCtaLabel}</a>`
                            : ""
                        }
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Info Section -->
              ${
                metaRows && metaRows.length > 0
                  ? `
                  <tr>
                    <td style="padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        ${metaRows
                          .map(
                            (row) => `
                          <tr>
                            <td style="padding:10px 0;font-size:12px;color:#8A8A8A;border-bottom:1px solid rgba(255,255,255,0.04);font-family:inherit;">${row.label}</td>
                            <td align="right" style="padding:10px 0;font-size:12px;color:#ffffff;font-weight:500;border-bottom:1px solid rgba(255,255,255,0.04);font-family:inherit;">${row.value}</td>
                          </tr>
                        `
                          )
                          .join("")}
                      </table>
                    </td>
                  </tr>
                `
                  : ""
              }
              <!-- Footer -->
              <tr>
                <td style="padding-top:36px;text-align:center;font-size:11px;line-height:1.6;color:#52525b;font-family:inherit;border-top:1px solid rgba(255,255,255,0.04);">
                  <p style="margin:0 0 12px 0;">
                    ${footerText || "You are receiving this email because a content generation task was completed in Recastr."}
                  </p>
                  <p style="margin:0;">
                    <a href="${env.appUrl}/dashboard" style="color:#71717a;text-decoration:none;margin:0 6px;">Dashboard</a>
                    <span style="color:#27272a;">&bull;</span>
                    <a href="${env.appUrl}/docs" style="color:#71717a;text-decoration:none;margin:0 6px;">Docs</a>
                    <span style="color:#27272a;">&bull;</span>
                    <a href="mailto:hello@recastr.app" style="color:#71717a;text-decoration:none;margin:0 6px;">Support</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
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
