import { AppShell } from "@/components/layout/AppShell";
import { GeneratorWorkspace } from "@/components/generator/GeneratorWorkspace";

export default function GeneratePage() {
  return (
    <AppShell projects={[]} title="Generator Workspace" sourceBadge="New Content">
      <div className="p-6">
        <GeneratorWorkspace project={null} />
      </div>
    </AppShell>
  );
}
