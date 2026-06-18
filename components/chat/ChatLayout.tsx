"use client";

import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { SuggestedPrompts } from "./SuggestedPrompts";
import { TypingIndicator } from "./TypingIndicator";

export function ChatLayout() {
  return (
    <div className="flex h-[600px] flex-col rounded-[32px] border border-[#232323] bg-[#111111] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <MessageBubble role="assistant" content="Hello! I'm your ReCastr AI assistant. How can I help you repurpose content today?" />
        <MessageBubble role="user" content="Can you turn my latest blog post into a Twitter thread?" />
        <TypingIndicator />
      </div>
      <div className="border-t border-[#232323] bg-[#151515] p-4">
        <SuggestedPrompts />
        <div className="mt-4">
          <ChatInput />
        </div>
      </div>
    </div>
  );
}
