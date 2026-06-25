// Quick test to verify youtube-transcript works at all on this machine
import { YoutubeTranscript } from "youtube-transcript";

const testVideoIds = [
  "dQw4w9WgXcQ",      // Rick Astley - popular, definitely has captions
  "jNQXAC9IVRw",      // "Me at the zoo" - first YouTube video
];

for (const videoId of testVideoIds) {
  console.log(`\n--- Testing videoId: ${videoId} ---`);
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    if (!transcript || transcript.length === 0) {
      console.log(`RESULT: Empty or null transcript`);
    } else {
      const fullText = transcript.map(item => item.text).join(" ");
      const wordCount = fullText.split(/\s+/).filter(Boolean).length;
      console.log(`RESULT: Success! Got ${transcript.length} segments, ${wordCount} words`);
      console.log(`FIRST 200 CHARS: ${fullText.slice(0, 200)}`);
    }
  } catch (error) {
    console.log(`RESULT: ERROR`);
    console.log(`Error type: ${error?.constructor?.name}`);
    console.log(`Error message: ${error?.message}`);
    if (error?.stack) console.log(`Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
  }
}
