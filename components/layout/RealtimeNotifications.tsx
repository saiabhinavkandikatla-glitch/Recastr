"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const NOTIFICATION_PROMPTS = [
  "Hey, are you ready to generate new posts today? 🚀",
  "Time to make some content magic! What are we repurposing next? ✨",
  "Ready to turn your ideas into high-engagement assets? Let's build! 🪝",
  "Hope you're having an awesome day! Ready to draft some updates? 💡",
  "Your audience is waiting for your next big post. Let's make it count! 📣",
  "Consistency pays off. Ready to outline your weekly content calendar? 📅",
  "Let's create something spectacular today. Pick a video to start! 🎬",
  "Need a spark of inspiration? Check out the viral hooks generator! ⚡",
  "Let's turn your next podcast episode into 30 platform-ready posts! 🎙️"
];

export function RealtimeNotifications() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Show the toast after 3.5 seconds
    const timer = setTimeout(() => {
      let shownIndices: number[] = [];
      try {
        const stored = sessionStorage.getItem("recastr_shown_notifs");
        if (stored) {
          shownIndices = JSON.parse(stored);
        }
      } catch (e) {
        // ignore
      }

      let availableIndices = NOTIFICATION_PROMPTS.map((_, i) => i).filter(
        (i) => !shownIndices.includes(i)
      );

      if (availableIndices.length === 0) {
        availableIndices = NOTIFICATION_PROMPTS.map((_, i) => i);
        shownIndices = [];
      }

      const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      const message = NOTIFICATION_PROMPTS[randomIndex];

      shownIndices.push(randomIndex);
      try {
        sessionStorage.setItem("recastr_shown_notifs", JSON.stringify(shownIndices));
      } catch (e) {
        // ignore
      }

      toast(message, {
        description: "Friendly Reminder · ReCastr Assistant",
        duration: 8000,
        action: {
          label: "Generate Now",
          onClick: () => {
            window.location.href = "/generate";
          }
        }
      });
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
