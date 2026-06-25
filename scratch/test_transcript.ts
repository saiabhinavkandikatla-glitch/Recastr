import { YoutubeTranscript } from "youtube-transcript";

async function test() {
  const videoId = "y58ppLTelk8";
  console.log("Fetching transcript for video:", videoId);
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    console.log("Success! Transcript length:", transcript?.length);
    if (transcript && transcript.length > 0) {
      console.log("First 3 items:", transcript.slice(0, 3));
    }
  } catch (error) {
    console.error("Failed to fetch transcript:", error);
  }
}

test();
