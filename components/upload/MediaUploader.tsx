"use client";

import { UploadCloud } from "lucide-react";

export function MediaUploader() {
  return (
    <div className="rounded-[40px] border-2 border-dashed border-[#232323] bg-[#151515] p-20 text-center">
      <UploadCloud className="mx-auto h-10 w-10 text-white" />
      <h2 className="mt-8 text-2xl font-semibold text-white">
        Upload Media
      </h2>
      <p className="mt-4 text-[#8A8A8A]">
        Drag and drop files or browse.
      </p>
    </div>
  );
}
