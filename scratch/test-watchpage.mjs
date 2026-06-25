// Test the watch page caption scraping method (same as used in fetchYoutubeWatchPage)
import axios from "axios";

const videoId = "dQw4w9WgXcQ";
const url = `https://www.youtube.com/watch?v=${videoId}`;

function browserHeaders() {
  return {
    Accept: "text/html,application/json,text/plain,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
  };
}

console.log(`Fetching watch page for ${url}...`);
try {
  const response = await axios.get(url, {
    headers: browserHeaders(),
    timeout: 15000,
  });
  const html = response.data;
  console.log(`HTML length: ${html.length}`);

  // Check for captionTracks
  const match = html.match(/"captionTracks":(\[.*?\])/);
  if (match?.[1]) {
    const tracks = JSON.parse(match[1]);
    console.log(`\nFound ${tracks.length} caption tracks:`);
    for (const track of tracks) {
      console.log(`  - Language: ${track.languageCode}, Kind: ${track.kind}, BaseUrl present: ${!!track.baseUrl}`);
      if (track.name?.simpleText) console.log(`    Name: ${track.name.simpleText}`);
    }

    // Try to fetch the first track
    if (tracks[0]?.baseUrl) {
      const captionUrl = tracks[0].baseUrl + "&fmt=json3";
      console.log(`\nFetching caption from: ${captionUrl.slice(0, 100)}...`);
      const captionResponse = await axios.get(captionUrl, {
        headers: browserHeaders(),
        timeout: 15000,
      });
      const data = captionResponse.data;
      if (data.events) {
        const text = data.events
          .flatMap(event => {
            if (!event?.segs) return [];
            return event.segs.map(seg => seg.utf8 || "");
          })
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        console.log(`Caption text length: ${text.length}`);
        console.log(`First 200 chars: ${text.slice(0, 200)}`);
      } else {
        console.log("No events in caption response");
        console.log("Response type:", typeof data);
        console.log("Response keys:", Object.keys(data));
      }
    }
  } else {
    console.log("NO captionTracks found in HTML!");
    // Check if page contains consent/bot detection
    if (html.includes("consent.youtube.com") || html.includes("CONSENT")) {
      console.log("DETECTED: YouTube consent wall - this blocks server-side requests");
    }
    if (html.includes("bot") || html.includes("captcha")) {
      console.log("DETECTED: Possible bot detection");
    }
  }
} catch (error) {
  console.log("ERROR:", error.message);
}
