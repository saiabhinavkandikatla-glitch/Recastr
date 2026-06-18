"use client";

import { ReactNode } from "react";

interface WorkspaceHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function WorkspaceHeader({ title, description, action }: WorkspaceHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
        {description && <p className="mt-2 text-sm text-[#8A8A8A]">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
