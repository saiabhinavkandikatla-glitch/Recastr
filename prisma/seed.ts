import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type DemoHook = {
  id: string;
  text: string;
  hookType: string;
  reachScore: number;
};

type DemoContent = {
  id: string;
  hookId: string;
  platform: string;
  contentType: string;
  body: string;
  tone: string;
  approved: boolean;
  order: number;
};

type DemoProject = {
  id: string;
  title: string;
  sourceType: string;
  transcript: string;
  duration: number | null;
  wordCount: number;
  summary: Prisma.InputJsonValue;
  hooks: DemoHook[];
  contents: DemoContent[];
};

const futureDate = (days: number, hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
};

const pastDate = (days: number, hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
};

const projects: DemoProject[] = [
  {
    id: "demo-founder-podcast",
    title: "Founder Podcast Ep. 42 - Why I Almost Quit",
    sourceType: "podcast",
    duration: 47,
    wordCount: 6800,
    transcript:
      "A founder explains the week the company almost shut down, the customer call that changed the product direction, and how a near-miss became a repeatable operating system.",
    summary: {
      tldr: "A founder nearly closed the company before a customer insight unlocked the next stage of growth.",
      takeaways: [
        "Customer conversations exposed the real product gap.",
        "The strongest growth ideas came from operational pain.",
        "A shutdown plan became a sharper weekly execution loop.",
      ],
      hooks: [
        "I almost shut everything down 48 hours before our biggest deal closed.",
        "We grew from zero to $2M ARR without paid ads.",
        "The customer call that saved the company lasted 19 minutes.",
      ],
      detectedTone: "storytelling",
      topics: ["founder journey", "customer discovery", "SaaS growth"],
      targetAudience: "Founders, creators, and operators building lean teams",
    },
    hooks: [
      {
        id: "demo-founder-podcast-hook-1",
        text: "I almost shut everything down 48 hours before our biggest deal closed.",
        hookType: "Curiosity gap",
        reachScore: 94,
      },
      {
        id: "demo-founder-podcast-hook-2",
        text: "We grew from zero to $2M ARR without paid ads.",
        hookType: "Data",
        reachScore: 90,
      },
      {
        id: "demo-founder-podcast-hook-3",
        text: "The customer call that saved the company lasted 19 minutes.",
        hookType: "Story",
        reachScore: 86,
      },
    ],
    contents: [
      {
        id: "demo-founder-podcast-content-1",
        hookId: "demo-founder-podcast-hook-1",
        platform: "TWITTER",
        contentType: "Tweet",
        body:
          "I almost shut everything down 48 hours before our biggest deal closed.\n\nThe lesson: panic makes you shrink the plan. Customer truth makes you sharpen it.",
        tone: "Casual",
        approved: true,
        order: 0,
      },
      {
        id: "demo-founder-podcast-content-2",
        hookId: "demo-founder-podcast-hook-1",
        platform: "LINKEDIN",
        contentType: "Post",
        body:
          "Two days before signing the deal that saved the company, I was writing the shutdown email.\n\nNobody prepares you for that moment. Not the books. Not the podcasts. Not the mentors.\n\nWhat changed was not a better growth hack. It was one customer call that made the next product decision painfully obvious.",
        tone: "Casual",
        approved: true,
        order: 1,
      },
      {
        id: "demo-founder-podcast-content-3",
        hookId: "demo-founder-podcast-hook-2",
        platform: "INSTAGRAM",
        contentType: "Caption",
        body:
          "Growth looked quiet from the outside.\n\nInside, it was a weekly loop: listen, ship, learn, repeat. The customer call became the content plan and the product roadmap.",
        tone: "Educational",
        approved: true,
        order: 2,
      },
      {
        id: "demo-founder-podcast-content-4",
        hookId: "demo-founder-podcast-hook-3",
        platform: "YOUTUBE",
        contentType: "Community post",
        body:
          "What would you do if one customer call contradicted your entire roadmap?\n\nA) Trust the roadmap\nB) Rebuild the plan\nC) Call 10 more customers\nD) Pause and rethink positioning",
        tone: "Casual",
        approved: false,
        order: 3,
      },
    ],
  },
  {
    id: "demo-marketing-blog",
    title: "The Ultimate Guide to Cold Email in 2024",
    sourceType: "blog",
    duration: null,
    wordCount: 4200,
    transcript:
      "A practical cold email guide covering research, personalization, concise offers, follow-up timing, and reply-driven campaign design.",
    summary: {
      tldr: "Good cold email works when the offer is specific, researched, and easy to answer.",
      takeaways: [
        "Personalization needs a real reason, not a merge tag.",
        "The first line should prove relevance quickly.",
        "Follow-ups should add value instead of repeating the ask.",
      ],
      hooks: [
        "Most cold emails fail before the pitch begins.",
        "The best cold email is easy to reply to in one sentence.",
        "A weak first line makes the rest invisible.",
      ],
      detectedTone: "educational",
      topics: ["sales", "cold email", "B2B marketing"],
      targetAudience: "Founders, marketers, and agency operators",
    },
    hooks: [
      {
        id: "demo-marketing-blog-hook-1",
        text: "Most cold emails fail before the pitch begins.",
        hookType: "Controversy",
        reachScore: 88,
      },
      {
        id: "demo-marketing-blog-hook-2",
        text: "The best cold email is easy to reply to in one sentence.",
        hookType: "Data",
        reachScore: 82,
      },
      {
        id: "demo-marketing-blog-hook-3",
        text: "A weak first line makes the rest invisible.",
        hookType: "Curiosity gap",
        reachScore: 80,
      },
    ],
    contents: [
      {
        id: "demo-marketing-blog-content-1",
        hookId: "demo-marketing-blog-hook-1",
        platform: "TWITTER",
        contentType: "Tweet",
        body:
          "Most cold emails do not fail because the offer is bad.\n\nThey fail because the first sentence proves nothing: no research, no context, no reason to keep reading.",
        tone: "Educational",
        approved: false,
        order: 0,
      },
      {
        id: "demo-marketing-blog-content-2",
        hookId: "demo-marketing-blog-hook-2",
        platform: "LINKEDIN",
        contentType: "Post",
        body:
          "A good cold email does one thing unusually well: it makes the next reply obvious.\n\nNot a calendar link. Not a five-paragraph pitch. A simple, relevant question that respects the reader's time.",
        tone: "Professional",
        approved: false,
        order: 1,
      },
    ],
  },
  {
    id: "demo-ai-youtube",
    title: "How I Got 100k Subscribers in 90 Days",
    sourceType: "youtube",
    duration: 18,
    wordCount: 3100,
    transcript:
      "A creator breaks down the positioning, packaging, publishing cadence, and audience feedback loop behind a rapid YouTube channel launch.",
    summary: {
      tldr: "Rapid channel growth came from clear packaging, consistent publishing, and fast feedback loops.",
      takeaways: [
        "Titles did the positioning work before the video started.",
        "Retention improved when each intro made one sharp promise.",
        "Audience comments became the next upload queue.",
      ],
      hooks: [
        "100k subscribers came from better packaging, not better gear.",
        "The first 15 seconds decided whether the video had a chance.",
        "Every comment became a content signal.",
      ],
      detectedTone: "educational",
      topics: ["YouTube growth", "creator strategy", "audience research"],
      targetAudience: "YouTubers, educators, and solo creators",
    },
    hooks: [
      {
        id: "demo-ai-youtube-hook-1",
        text: "100k subscribers came from better packaging, not better gear.",
        hookType: "Data",
        reachScore: 92,
      },
      {
        id: "demo-ai-youtube-hook-2",
        text: "The first 15 seconds decided whether the video had a chance.",
        hookType: "Curiosity gap",
        reachScore: 89,
      },
      {
        id: "demo-ai-youtube-hook-3",
        text: "Every comment became a content signal.",
        hookType: "Story",
        reachScore: 78,
      },
    ],
    contents: [
      {
        id: "demo-ai-youtube-content-1",
        hookId: "demo-ai-youtube-hook-1",
        platform: "TWITTER",
        contentType: "Tweet",
        body:
          "100k subscribers did not come from better gear.\n\nIt came from sharper packaging: one promise, one audience, one reason to click now.",
        tone: "Casual",
        approved: true,
        order: 0,
      },
      {
        id: "demo-ai-youtube-content-2",
        hookId: "demo-ai-youtube-hook-2",
        platform: "YOUTUBE",
        contentType: "Community post",
        body:
          "What makes you click a creator video fastest?\n\nA) Title\nB) Thumbnail\nC) First 15 seconds\nD) Trusted creator",
        tone: "Casual",
        approved: true,
        order: 1,
      },
    ],
  },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@recastr.app" },
    update: {
      supabaseId: "demo-user",
      name: "Demo user",
      role: "owner",
      plan: "pro",
      creatorType: "Founder",
      tonePref: "casual",
      platforms: ["TWITTER", "LINKEDIN", "INSTAGRAM", "YOUTUBE"],
    },
    create: {
      id: "demo-user",
      supabaseId: "demo-user",
      email: "demo@recastr.app",
      name: "Demo user",
      role: "owner",
      plan: "pro",
      creatorType: "Founder",
      tonePref: "casual",
      platforms: ["TWITTER", "LINKEDIN", "INSTAGRAM", "YOUTUBE"],
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: "recastr-demo-studio" },
    update: { name: "Recastr demo studio", ownerId: user.id },
    create: { name: "Recastr demo studio", slug: "recastr-demo-studio", ownerId: user.id },
  });

  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: { role: "owner" },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: "owner",
    },
  });

  await prisma.userCredit.upsert({
    where: { userId: user.id },
    update: { credits: 100, used: 0 },
    create: { userId: user.id, credits: 100, used: 0 },
  });

  await prisma.brandVoice.upsert({
    where: { id: "demo-brand-voice" },
    update: {
      name: "Founder operator",
      toneDescriptors: ["specific", "plainspoken", "useful"],
      bannedWords: ["game-changing", "unlock"],
      samplePosts: [
        "The best growth ideas usually sound boring until they compound.",
        "Specific beats clever when your customer is busy.",
      ],
      targetAudience: "Founders and creators building lean content systems",
      contentPillars: ["customer insight", "operator lessons", "distribution"],
    },
    create: {
      id: "demo-brand-voice",
      userId: user.id,
      name: "Founder operator",
      toneDescriptors: ["specific", "plainspoken", "useful"],
      bannedWords: ["game-changing", "unlock"],
      samplePosts: [
        "The best growth ideas usually sound boring until they compound.",
        "Specific beats clever when your customer is busy.",
      ],
      targetAudience: "Founders and creators building lean content systems",
      contentPillars: ["customer insight", "operator lessons", "distribution"],
    },
  });

  for (const project of projects) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: {
        userId: user.id,
        organizationId: organization.id,
        title: project.title,
        sourceType: project.sourceType,
        transcript: project.transcript,
        summary: project.summary,
        duration: project.duration,
        wordCount: project.wordCount,
      },
      create: {
        id: project.id,
        userId: user.id,
        organizationId: organization.id,
        title: project.title,
        sourceType: project.sourceType,
        transcript: project.transcript,
        summary: project.summary,
        duration: project.duration,
        wordCount: project.wordCount,
      },
    });

    for (const hook of project.hooks) {
      await prisma.hook.upsert({
        where: { id: hook.id },
        update: {
          text: hook.text,
          hookType: hook.hookType,
          reachScore: hook.reachScore,
        },
        create: {
          id: hook.id,
          projectId: project.id,
          text: hook.text,
          hookType: hook.hookType,
          reachScore: hook.reachScore,
        },
      });
    }

    for (const item of project.contents) {
      await prisma.content.upsert({
        where: { id: item.id },
        update: {
          hookId: item.hookId,
          platform: item.platform,
          contentType: item.contentType,
          body: item.body,
          originalBody: item.body,
          tone: item.tone,
          approved: item.approved,
          order: item.order,
        },
        create: {
          id: item.id,
          projectId: project.id,
          hookId: item.hookId,
          platform: item.platform,
          contentType: item.contentType,
          body: item.body,
          originalBody: item.body,
          tone: item.tone,
          approved: item.approved,
          order: item.order,
        },
      });
    }
  }

  await upsertScheduledPost({
    id: "demo-scheduled-1",
    userId: user.id,
    contentId: "demo-founder-podcast-content-1",
    platform: "TWITTER",
    scheduledAt: futureDate(1, 9),
    status: "pending",
  });
  await upsertScheduledPost({
    id: "demo-scheduled-2",
    userId: user.id,
    contentId: "demo-founder-podcast-content-2",
    platform: "LINKEDIN",
    scheduledAt: futureDate(3, 14),
    status: "pending",
  });
  await upsertScheduledPost({
    id: "demo-history-1",
    userId: user.id,
    contentId: "demo-founder-podcast-content-3",
    platform: "INSTAGRAM",
    scheduledAt: pastDate(5, 11),
    status: "published",
    publishedAt: pastDate(5, 11),
  });
  await upsertScheduledPost({
    id: "demo-history-2",
    userId: user.id,
    contentId: "demo-ai-youtube-content-2",
    platform: "YOUTUBE",
    scheduledAt: pastDate(2, 16),
    status: "failed",
    failReason: "Demo failure: account token expired",
  });

  await prisma.auditLog.upsert({
    where: { id: "demo-audit-seed" },
    update: {
      userId: user.id,
      organizationId: organization.id,
      action: "seed_demo_workspace",
      entityType: "workspace",
      entityId: organization.id,
      metadata: { projects: projects.length },
    },
    create: {
      id: "demo-audit-seed",
      userId: user.id,
      organizationId: organization.id,
      action: "seed_demo_workspace",
      entityType: "workspace",
      entityId: organization.id,
      metadata: { projects: projects.length },
    },
  });
}

async function upsertScheduledPost(input: {
  id: string;
  userId: string;
  contentId: string;
  platform: string;
  scheduledAt: Date;
  status: string;
  publishedAt?: Date;
  failReason?: string;
}) {
  await prisma.scheduledPost.upsert({
    where: { id: input.id },
    update: {
      userId: input.userId,
      contentId: input.contentId,
      platform: input.platform,
      scheduledAt: input.scheduledAt,
      status: input.status,
      publishedAt: input.publishedAt ?? null,
      failReason: input.failReason ?? null,
    },
    create: {
      id: input.id,
      userId: input.userId,
      contentId: input.contentId,
      platform: input.platform,
      scheduledAt: input.scheduledAt,
      status: input.status,
      publishedAt: input.publishedAt ?? null,
      failReason: input.failReason ?? null,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
