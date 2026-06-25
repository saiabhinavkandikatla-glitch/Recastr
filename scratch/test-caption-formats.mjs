// Test the actual caption URL response format
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

const response = await axios.get(url, { headers: browserHeaders(), timeout: 15000 });
const html = response.data;
const match = html.match(/"captionTracks":(\[.*?\])/);
const tracks = JSON.parse(match[1]);
const track = tracks[0]; // English manual track

// Test different formats
for (const fmt of ["json3", "vtt", undefined]) {
  const captionUrl = fmt ? `${track.baseUrl}&fmt=${fmt}` : track.baseUrl;
  const label = fmt || "default (XML)";
  console.log(`\n--- Format: ${label} ---`);
  try {
    const captionResponse = await axios.get(captionUrl, {
      headers: browserHeaders(),
      timeout: 15000,
      // Force string so we can inspect the raw data
      responseType: "text",
    });
    const data = captionResponse.data;
    console.log(`Response type: ${typeof data}`);
    console.log(`Response length: ${data.length}`);
    console.log(`First 300 chars:\n${data.slice(0, 300)}`);
    
    // Check if it's XML with <text> tags
    const xmlMatches = Array.from(data.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g));
    if (xmlMatches.length > 0) {
      const fullText = xmlMatches.map(m => m[1]
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
      ).join(" ").replace(/\s+/g, " ").trim();
      console.log(`\nXML parse found ${xmlMatches.length} text segments`);
      console.log(`Extracted text (first 200 chars): ${fullText.slice(0, 200)}`);
    }
    
    // Check if it has JSON events
    try {
      const jsonData = JSON.parse(data);
      if (jsonData.events) {
        console.log(`\nJSON parse found ${jsonData.events.length} events`);
      }
    } catch { /* not JSON */ }
    
  } catch (error) {
    console.log(`ERROR: ${error.message}`);
  }
}
