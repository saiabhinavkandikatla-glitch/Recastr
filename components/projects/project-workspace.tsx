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
import { HookSidebar } from "@/components/content/HookSidebar";
import { Button } from "@/components/ui/button";
import { assertApiOk, readApiJson } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { ContentPiece, Platform, Project, ViralHook } from "@/lib/types";

import { ProjectStudioTopBar } from "./ProjectStudioTopBar";
import { ContentFeed, type FeedItem } from "./ContentFeed";
import { ExportInlinePanel } from "./ExportInlinePanel";
import { GenerateDrawer } from "./GenerateDrawer";
import { type PlatformFilter, type ExportFormat, platformOrder, platformLabels } from "./types";
import { toCardPlatform, normalizeSupportedPlatform } from "./utils";

export function ProjectWorkspace({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const initialContent = useMemo(() => normalizeContents(project), [project]);
  const hooks = useMemo(() => normalizeHooks(project), [project]);
  const [contents, setContents] = useState(initialContent);
  const [selectedHookId, setSelectedHookId] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scheduledDates, setScheduledDates] = useState<Record<string, Date>>({});
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    () => initialContent[0]?.id ?? null,
  );
  const [selectedExportIds, setSelectedExportIds] = useState<string[]>(() =>
    initialContent.filter((item) => item.approved).map((item) => item.id),
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

  const scheduleMutation = useMutation({
    mutationFn: scheduleContent,
    onSuccess: () => toast.success("Scheduled"),
    onError: (error) => {
      if (error instanceof Error && error.message === "credit_exhausted") return;
      toast.error("Schedule failed");
    },
  });

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
    [updateContentMutation],
  );

  const handleBodyChange = useCallback(
    (id: string, body: string) => {
      setContents((current) =>
        current.map((item) => (item.id === id ? { ...item, body } : item)),
      );
      updateContentMutation.mutate({ id, body });
    },
    [updateContentMutation],
  );

  const handleToneChange = useCallback(
    (id: string, tone: string) => {
      const content = contents.find((item) => item.id === id);
      if (!content) return;
      setContents((current) =>
        current.map((item) => (item.id === id ? { ...item, tone } : item)),
      );
      toneMutation.mutate({ id, content: content.body, tone });
    },
    [contents, toneMutation],
  );

  const handleSchedule = useCallback(
    (id: string, date: Date) => {
      const content = contents.find((item) => item.id === id);
      if (!content) return;
      setScheduledDates((current) => ({ ...current, [id]: date }));
      scheduleMutation.mutate({
        contentId: id,
        platform: content.platform,
        scheduledAt: date.toISOString(),
      });
    },
    [contents, scheduleMutation],
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
      const content = contents.find((item) => item.id === id);
      if (!content) return;
      const next = regenerateBody(project, content, selectedHookId, hooks);
      streamReplaceContent(id, next, setContents);
      updateContentMutation.mutate({ id, body: next });
    },
    [contents, hooks, project, selectedHookId, updateContentMutation],
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
          onExportToggle={() => setExportOpen((current) => !current)}
          onGenerateToggle={() => setDrawerOpen(true)}
        />

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

        <div className="grid gap-6 border-t border-white/5 pt-6 min-[700px]:grid-cols-[240px_minmax(0,1fr)]">
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
                onGenerateMore={() => setDrawerOpen(true)}
              />
            ) : (
              <div className="rounded-[16px] border border-dashed bg-card/60 p-10 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-primary" />
                <h3 className="mt-4 text-lg font-medium">No cards for this filter yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Clear the hook filter or generate more content from the right drawer.
                </p>
                <Button className="mt-5" onClick={() => setDrawerOpen(true)}>
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

async function scheduleContent(payload: {
  contentId: string;
  platform: Platform;
  scheduledAt: string;
}) {
  const response = await fetch("/api/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await assertApiOk(response);
  return response.json() as Promise<{ scheduledPostId: string }>;
}

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
  return `${seed}\n\nHere is the sharper ${platform} version:\n\n${content.body.replace(/\s+/g, " ").slice(0, 260)}\n\nMake the opening more specific, keep the source promise, and close with one clear action.`;
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
