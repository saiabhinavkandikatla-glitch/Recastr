"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export function RichTextEditor() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: `
      <h2>LinkedIn Post</h2>
      <p>Most creators fail because they don't have a system...</p>
    `,
  });

  return (
    <div className="rounded-[40px] border border-[#232323] bg-[#151515] p-8">
      <EditorContent
        editor={editor}
        className="prose prose-invert max-w-none"
      />
    </div>
  );
}
