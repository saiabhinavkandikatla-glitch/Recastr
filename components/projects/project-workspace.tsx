"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AuthPromptModal } from "@/components/auth/AuthPromptModal";
import { HookSidebar } from "@/components/content/HookSidebar";
import { Button } from "@/components/ui/button";
import { assertApiOk, emitScheduleCreated, readApiJson } from "@/lib/client-api";
import { getPlatformCharacterLimit, normalizePlatformCopy } from "@/lib/platform-limits";
import { cn } from "@/lib/utils";
import type { ContentPiece, Platform, Project, ScheduledPost, ViralHook } from "@/lib/types";

import { ProjectStudioTopBar } from "./ProjectStudioTopBar";
import { ContentFeed, type FeedItem } from "./ContentFeed";
import { ExportInlinePanel } from "./ExportInlinePanel";
import { GenerateDrawer } from "./GenerateDrawer";
import { type PlatformFilter, type ExportFormat, platformOrder, platformLabels } from "./types";
import { toCardPlatform, normalizeSupportedPlatform } from "./utils";

export function ProjectWorkspace({
  project,
  readOnly = false,
}: {
  project: Project;
  readOnly?: boolean;
}) {
  const queryClient = useQueryClient();
  const initialContent = useMemo(() => normalizeContents(project), [project]);
  const hooks = useMemo(() => normalizeHooks(project), [project]);
  const [contents, setContents] = useState(initialContent);
  const [selectedHookId, setSelectedHookId] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [scheduledDates, setScheduledDates] = useState<Record<string, Date>>({});
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    () => initialContent[0]?.id ?? null,
  );
  const [selectedExportIds, setSelectedExportIds] = useState<string[]>(() =>
    initialContent.map((item) => item.id),
  );

  const updateContentMutation = useMutation({
    mutationFn: patchContent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project", project.id] });
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "credit_exhausted") return;
      toast.error("Could not save content change");
    },
  });

  const toneMutation = useMutation({
    mutationFn: rewriteTone,
    onSuccess: ({ id, rewritten, tone }) => {
      setContents((current) =>
        current.map((item) =>
          item.id === id ? { ...item, body: rewritten, tone } : item,
        ),
      );
      updateContentMutation.mutate({ id, body: rewritten, tone });
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "credit_exhausted") return;
      toast.error("Tone rewrite failed");
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateContentPiece,
    onSuccess: ({ id, rewritten, tone }) => {
      streamReplaceContent(id, rewritten, setContents);
      updateContentMutation.mutate({ id, body: rewritten, tone });
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "credit_exhausted") return;
      toast.error("Regeneration failed");
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: scheduleContent,
    onSuccess: () => toast.success("Post scheduled. You will receive an email reminder when it is time to post.", {
      description: "Please check your spam or promotions folder if you don't see our emails.",
    }),
    onError: (error) => {
      if (error instanceof Error && error.message === "credit_exhausted") return;
      toast.error(error instanceof Error ? error.message : "Schedule failed");
    },
  });

  const requireAccount = useCallback((action = "continue") => {
    setAuthPromptOpen(true);
    toast.info(`Create a free account to ${action}.`);
  }, []);

  const filteredContents = useMemo(() => {
    return contents
      .filter((item) => selectedHookId === null || item.hookId === selectedHookId)
      .filter((item) => platformFilter === "all" || toCardPlatform(item.platform) === platformFilter)
      .sort((a, b) => {
        const platformDelta =
          platformOrder.indexOf(toCardPlatform(a.platform)) -
          platformOrder.indexOf(toCardPlatform(b.platform));
        return platformDelta || a.order - b.order;
      });
  }, [contents, platformFilter, selectedHookId]);

  const feedItems = useMemo(() => buildFeedItems(filteredContents), [filteredContents]);
  useEffect(() => {
    if (filteredContents.length === 0) return;
    if (selectedContentId && filteredContents.some((item) => item.id === selectedContentId)) return;
    setSelectedContentId(filteredContents[0]?.id ?? null);
  }, [filteredContents, selectedContentId]);

  const handleApprove = useCallback(
    (id: string) => {
      if (readOnly) {
        requireAccount("publish this post");
        return;
      }
      const content = contents.find((item) => item.id === id);
      if (!content) return;
      const limit = getPlatformCharacterLimit(content.platform);
      if (content.body.length > limit) {
        toast.error(`Shorten this ${platformLabels[toCardPlatform(content.platform)]} post to ${limit} characters before publishing.`);
        return;
      }
      setContents((current) =>
        current.map((item) =>
          item.id === id ? { ...item, approved: true } : item,
        ),
      );
      setSelectedExportIds((current) =>
        current.includes(id) ? current : [...current, id],
      );
      updateContentMutation.mutate({ id, approved: true });
    },
    [contents, readOnly, requireAccount, updateContentMutation],
  );

  const handleBodyChange = useCallback(
    (id: string, body: string) => {
      if (readOnly) {
        requireAccount("edit generated posts");
        return;
      }
      const content = contents.find((item) => item.id === id);
      const overLimit = content ? body.length > getPlatformCharacterLimit(content.platform) : false;
      setContents((current) =>
        current.map((item) => (item.id === id ? { ...item, body, approved: overLimit ? false : item.approved } : item)),
      );
      updateContentMutation.mutate(overLimit ? { id, body, approved: false } : { id, body });
    },
    [contents, readOnly, requireAccount, updateContentMutation],
  );

  const handleToneChange = useCallback(
    (id: string, tone: string) => {
      if (readOnly) {
        requireAccount("rewrite tone");
        return;
      }
      const content = contents.find((item) => item.id === id);
      if (!content) return;
      setContents((current) =>
        current.map((item) => (item.id === id ? { ...item, tone } : item)),
      );
      toneMutation.mutate({ id, content: content.body, tone });
    },
    [contents, readOnly, requireAccount, toneMutation],
  );

  const handleSchedule = useCallback(
    (id: string, date: Date, method: "email_reminder" | "direct_post" = "email_reminder") => {
      if (readOnly) {
        requireAccount("schedule reminders");
        return;
      }
      const content = contents.find((item) => item.id === id);
      if (!content) return;
      const limit = getPlatformCharacterLimit(content.platform);
      if (content.body.length > limit) {
        toast.error(`Shorten this ${platformLabels[toCardPlatform(content.platform)]} post to ${limit} characters before scheduling.`);
        return;
      }
      scheduleMutation.mutate({
        contentId: id,
        projectId: project.id,
        projectTitle: project.title,
        platform: content.platform,
        scheduledAt: date.toISOString(),
        body: content.body,
        originalBody: content.originalBody,
        contentType: content.contentType,
        tone: content.tone,
        postingMethod: method,
        hookId: content.hookId,
      }, {
        onSuccess: (scheduledPost) => {
          setScheduledDates((current) => ({ ...current, [id]: date }));
          emitScheduleCreated(scheduledPost);
        },
      });
    },
    [contents, project.id, project.title, readOnly, requireAccount, scheduleMutation],
  );

  const handleCopy = useCallback(
    (id: string) => {
      const content = contents.find((item) => item.id === id);
      if (!content) return;
      void navigator.clipboard.writeText(content.body);
      toast.success("Copied");
    },
    [contents],
  );

  const handleRegenerate = useCallback(
    (id: string) => {
      if (readOnly) {
        requireAccount("generate more variations");
        return;
      }
      const content = contents.find((item) => item.id === id);
      if (!content) return;

      toast.info("Regenerating content piece...");
      regenerateMutation.mutate({ id, content: content.body, tone: content.tone });
    },
    [contents, readOnly, requireAccount, regenerateMutation],
  );

  const addGeneratedCards = useCallback(
    (cards: ContentPiece[]) => {
      setContents((current) => [...cards, ...current]);
      setPlatformFilter("all");
      setSelectedHookId(null);
      toast.success(`${cards.length} new pieces generated`);
    },
    [],
  );

  const exportIds = selectedExportIds.length ? selectedExportIds : filteredContents.map((item) => item.id);

  return (
    <div className="space-y-6 text-foreground">
      <motion.div
        animate={{ x: drawerOpen ? -24 : 0 }}
        transition={{ duration: 0.26, ease: [0.16, 1, 0.32, 1] }}
        className={cn("mx-auto max-w-[1480px] pb-10", drawerOpen && "lg:pr-[420px]")}
      >
        <ProjectStudioTopBar
          project={project}
          platformFilter={platformFilter}
          onPlatformFilterChange={setPlatformFilter}
          exportOpen={exportOpen}
          onExportToggle={() => readOnly ? requireAccount("export content") : setExportOpen((current) => !current)}
          onGenerateToggle={() => readOnly ? requireAccount("generate more content") : setDrawerOpen(true)}
        />

        {readOnly ? (
          <div className="mb-4 rounded-2xl border border-[var(--violet)]/25 bg-[var(--violet-muted)] px-4 py-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Preview mode.</span>{" "}
            Browse this project freely. Create an account when you want to edit, export, or schedule.
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {exportOpen ? (
            <ExportInlinePanel
              contents={filteredContents}
              selectedIds={exportIds}
              format={exportFormat}
              onFormatChange={setExportFormat}
              onToggleContent={(id) =>
                setSelectedExportIds((current) =>
                  current.includes(id)
                    ? current.filter((item) => item !== id)
                    : [...current, id],
                )
              }
              projectId={project.id}
              onClose={() => setExportOpen(false)}
            />
          ) : null}
        </AnimatePresence>

        <div className="grid gap-6 border-t border-[var(--app-line)] pt-6 min-[700px]:grid-cols-[248px_minmax(0,1fr)]">
          <HookSidebar
            hooks={hooks}
            selectedHookId={selectedHookId}
            contentCount={contents.length}
            onSelect={setSelectedHookId}
          />

          <section className="min-w-0">
            {feedItems.length > 0 ? (
              <ContentFeed
                feedItems={feedItems}
                scheduledDates={scheduledDates}
                selectedContentId={selectedContentId}
                onApprove={handleApprove}
                onToneChange={handleToneChange}
                onBodyChange={handleBodyChange}
                onSchedule={handleSchedule}
                onCopy={handleCopy}
                onRegenerate={handleRegenerate}
                onActivate={setSelectedContentId}
                onGenerateMore={() => readOnly ? requireAccount("generate more content") : setDrawerOpen(true)}
              />
            ) : (
              <div className="rounded-3xl border border-dashed border-[var(--app-line-strong)] bg-[var(--app-surface)] p-10 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-primary" />
                <h3 className="mt-4 text-lg font-medium">No cards for this filter yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Clear the hook filter or generate more content from the right drawer.
                </p>
                <Button className="mt-5 rounded-full bg-[var(--violet)] px-5 text-black hover:bg-[var(--violet-hover)]" onClick={() => readOnly ? requireAccount("generate more content") : setDrawerOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Generate more
                </Button>
              </div>
            )}
          </section>
        </div>
      </motion.div>

      <AnimatePresence>
        {drawerOpen ? (
          <GenerateDrawer
            project={project}
            selectedHook={hooks.find((hook) => hook.id === selectedHookId)}
            onClose={() => setDrawerOpen(false)}
            onGenerated={addGeneratedCards}
          />
        ) : null}
      </AnimatePresence>

      <AuthPromptModal
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        projectTitle={project.title}
      />
    </div>
  );
}



async function patchContent(payload: {
  id: string;
  body?: string;
  approved?: boolean;
  tone?: string;
}) {
  const response = await fetch(`/api/content/${payload.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await assertApiOk(response);
  return response.json() as Promise<{ content: unknown }>;
}

async function rewriteTone({
  id,
  content,
  tone,
}: {
  id: string;
  content: string;
  tone: string;
}) {
  const response = await fetch("/api/tone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentId: id, content, tone }),
  });
  const data = await readApiJson<{ rewritten?: string; content?: string }>(response);
  return { id, tone, rewritten: data.rewritten ?? data.content ?? content };
}

async function regenerateContentPiece({
  id,
  content,
  tone,
}: {
  id: string;
  content: string;
  tone: string;
}) {
  const response = await fetch("/api/tone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentId: id, content, tone, regenerate: true }),
  });
  const data = await readApiJson<{ rewritten?: string; content?: string }>(response);
  return { id, tone, rewritten: data.rewritten ?? data.content ?? content };
}

async function scheduleContent(payload: {
  contentId: string;
  projectId: string;
  projectTitle: string;
  platform: Platform;
  scheduledAt: string;
  body: string;
  originalBody: string;
  contentType: string;
  tone: string;
  postingMethod: "email_reminder" | "direct_post";
}) {
  const response = await fetch("/api/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await assertApiOk(response);
  const data = (await response.json()) as ScheduleResponse;
  return {
    id: data.scheduledPostId,
    outputId: payload.contentId,
    contentId: payload.contentId,
    platform: payload.platform,
    postingMethod: payload.postingMethod,
    publishAt: data.publishAt ?? payload.scheduledAt,
    scheduledAt: data.scheduledAt ?? data.publishAt ?? payload.scheduledAt,
    status: "PENDING",
    title: payload.contentType,
  } satisfies ScheduledPost;
}

type ScheduleResponse = {
  publishAt?: string;
  scheduledAt?: string;
  scheduledPostId: string;
};

function normalizeContents(project: Project): ContentPiece[] {
  const source = project.contents?.length
    ? project.contents
    : project.outputs.map((output, index) => {
        const body = typeof output.content === "string" ? output.content : JSON.stringify(output.content, null, 2);
        return {
          id: output.id,
          projectId: output.projectId,
          platform: output.platform,
          contentType: output.outputType,
          body,
          originalBody: typeof output.originalContent === "string" ? output.originalContent : body,
          tone: String(output.tone).toLowerCase(),
          approved: output.approved,
          order: index,
          createdAt: output.createdAt,
        };
      });

  return source.map((item, index) => ({
    ...item,
    platform: normalizeSupportedPlatform(item.platform),
    body: normalizePlatformCopy(normalizeSupportedPlatform(item.platform), item.body),
    tone: item.tone.toLowerCase(),
    order: item.order ?? index,
  }));
}

function normalizeHooks(project: Project): ViralHook[] {
  return project.hooks?.length
    ? project.hooks
    : project.summary.hooks.slice(0, 5).map((text, index) => ({
        id: `${project.id}-hook-${index + 1}`,
        projectId: project.id,
        text,
        hookType: index % 2 === 0 ? "Curiosity gap" : "Data",
        reachScore: 88 - index * 4,
      }));
}

function buildFeedItems(contents: ContentPiece[]): FeedItem[] {
  const items: FeedItem[] = [];
  for (const platform of platformOrder) {
    const group = contents.filter((item) => toCardPlatform(item.platform) === platform);
    if (group.length === 0) continue;
    items.push(...group.map((content) => ({ kind: "content" as const, id: content.id, content })));
  }
  return items;
}



function regenerateBody(
  project: Project,
  content: ContentPiece,
  selectedHookId: string | null,
  hooks: ViralHook[],
) {
  const hook = hooks.find((item) => item.id === (selectedHookId ?? content.hookId));
  const seed = hook?.text ?? project.summary.hooks[0] ?? project.title;
  const platform = platformLabels[toCardPlatform(content.platform)];
  const body =
    platform === "Twitter/X"
      ? `${seed}\n\nOne simple idea. One clear next step. That is what makes the lesson easy to remember and use.`
      : platform === "LinkedIn"
        ? `${seed}\n\nI used to overcomplicate this.\n\nThen I realized the best explanation does three things:\n\n1. Names the real problem\n2. Gives people a simple mental model\n3. Ends with one action they can use today\n\nThat is the difference between content people skim and content people save.`
        : `${seed}\n\n-> Name the problem\n-> Give the simple mental model\n-> Show the next step\n\nSave this before your next project.`;
  return normalizePlatformCopy(content.platform, body);
}

function streamReplaceContent(
  id: string,
  body: string,
  setContents: React.Dispatch<React.SetStateAction<ContentPiece[]>>,
) {
  const tokens = body.split(/(\s+)/).filter(Boolean);
  let index = 0;
  setContents((current) =>
    current.map((item) => (item.id === id ? { ...item, body: "" } : item)),
  );
  const timer = window.setInterval(() => {
    index += 1;
    const next = tokens.slice(0, index).join("");
    setContents((current) =>
      current.map((item) => (item.id === id ? { ...item, body: next } : item)),
    );
    if (index >= tokens.length) window.clearInterval(timer);
  }, 22);
}
