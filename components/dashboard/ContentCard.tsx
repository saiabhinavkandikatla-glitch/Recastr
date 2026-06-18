"use client";

import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ContentCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function ContentCard({
  title,
  description,
  children,
  action,
  className,
  noPadding = false,
}: ContentCardProps) {
  return (
    <Card className={cn("flex flex-col bg-[#090909] border-[#232323]", className)}>
      {(title || description || action) && (
        <div className="flex items-start justify-between border-b border-[#232323] p-6">
          <div>
            {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
            {description && <p className="mt-1 text-sm text-[#8A8A8A]">{description}</p>}
          </div>
          {action && <div className="ml-4">{action}</div>}
        </div>
      )}
      <div className={cn("flex-1", !noPadding && "p-6")}>
        {children}
      </div>
    </Card>
  );
}
