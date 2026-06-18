import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/current-user";
import { Video, ImagePlus, Upload, Film, FileImage, Music } from "lucide-react";

export default async function MediaPage() {
  const user = await getCurrentUser();

  return (
    <AppShell projects={[]} title="Media" user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Media Library</h1>
            <p className="mt-1 text-sm text-[#8A8A8A]">
              Manage images, videos, and audio used across your content.
            </p>
          </div>
        </div>

        {/* Upload Drop Zone / Empty State */}
        <div className="rounded-2xl border-2 border-dashed border-[#232323] bg-[#0F0F0F] transition-colors hover:border-[#333]">
          <div className="flex flex-col items-center justify-center px-6 py-20">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1A1A1A]">
              <Upload className="h-7 w-7 text-[#8A8A8A]" />
            </span>

            <h2 className="mt-6 text-lg font-semibold text-white">
              Your media library is empty
            </h2>
            <p className="mt-2 max-w-md text-center text-sm text-[#8A8A8A]">
              Upload images and videos to use in your content. Drag and drop
              files here or click the button below.
            </p>

            <button
              type="button"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
            >
              <ImagePlus className="h-4 w-4" />
              Upload Media
            </button>

            <p className="mt-4 text-xs text-[#555]">
              PNG, JPG, GIF, MP4, WEBM, MP3 — up to 50 MB
            </p>
          </div>
        </div>

        {/* Supported Formats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormatCard
            icon={FileImage}
            title="Images"
            formats="PNG, JPG, GIF, WEBP, SVG"
          />
          <FormatCard
            icon={Film}
            title="Videos"
            formats="MP4, WEBM, MOV"
          />
          <FormatCard
            icon={Music}
            title="Audio"
            formats="MP3, WAV, OGG"
          />
        </div>
      </div>
    </AppShell>
  );
}

/* ── Format Card ──────────────────────────────────────────────── */

function FormatCard({
  icon: Icon,
  title,
  formats,
}: {
  icon: React.ElementType;
  title: string;
  formats: string;
}) {
  return (
    <div className="rounded-2xl border border-[#232323] bg-[#0F0F0F] p-5 transition-colors hover:border-[#333]">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1A1A1A]">
        <Icon className="h-4 w-4 text-[#8A8A8A]" />
      </span>
      <p className="mt-3 text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-xs text-[#8A8A8A]">{formats}</p>
    </div>
  );
}
