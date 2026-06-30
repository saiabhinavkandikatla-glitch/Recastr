import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/current-user";
import { MediaLibrary } from "@/components/media/MediaLibrary";

export const metadata: Metadata = {
  title: "Media Library",
  description: "Browse and manage your uploaded media files, thumbnails, and content assets for social post creation.",
  openGraph: {
    title: "Media Library | Recastr",
    description: "Browse and manage your uploaded media assets.",
  },
  twitter: {
    title: "Media Library | Recastr",
    description: "Browse and manage your uploaded media assets.",
  },
};

export default async function MediaPage() {
  const user = await getCurrentUser();

  return (
    <AppShell projects={[]} title="Media" user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Media Library</h1>
          <p className="mt-1 text-sm text-[#8A8A8A]">
            Manage images, videos, and audio used across your content.
          </p>
        </div>

        <MediaLibrary />
      </div>
    </AppShell>
  );
}
