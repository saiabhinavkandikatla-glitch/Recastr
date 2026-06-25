import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  backLabel,
  backHref
}: {
  title: string
  backLabel?: string
  backHref?: string
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      {backHref && (
        <Link href={backHref}>
          <button className="flex items-center gap-2 border border-gray-600 bg-transparent px-3 py-1.5 rounded-md text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white">
            <ChevronLeft className="h-3 w-3" />
            {backLabel || "Back"}
          </button>
        </Link>
      )}
      <h1 className="text-2xl font-bold">{title}</h1>
    </div>
  );
}