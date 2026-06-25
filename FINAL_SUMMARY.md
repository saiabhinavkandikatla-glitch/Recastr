# Fix for YouTube Transcript Extraction Flow

## Problem
The original YouTube transcript extraction had several issues:
1. Misleading error message suggesting users verify credentials or configure proxy (when no such functionality existed)
2. Poor user experience when transcripts failed - no clear path forward
3. Missing fallback mechanisms when primary extraction methods failed
4. Frontend not showing manual transcript modal due to incorrect error code

## Solution Implemented

### 1. Improved Error Messaging
**Before:** "YouTube transcript is blocked on this network, and no description was provided. Please verify your credentials or configure your proxy."
**After:** "Unable to retrieve subtitles automatically. We couldn't access subtitles for this video.\n\nPossible reasons:\n• Captions are disabled.\n• The video is private or restricted.\n• YouTube temporarily blocked transcript access.\n\nYou can paste a transcript manually or try another video."

### 2. Robust Fallback Chain (Implementation in `lib/ai/pipeline.ts`)
1. **Scrape watch page captions** (existing method)
2. **youtube-transcript npm package** (existing method) 
3. **yt-dlp subtitles extraction** (NEW)
4. **Video description fallback** (existing method)
5. **User-friendly error with manual transcript option** (IMPROVED)

### 3. yt-dlp Integration
Added `fetchYtdlSubtitles()` function that:
- Uses ytdl to check subtitle availability
- Prioritizes English subtitles (user-uploaded then auto-generated)
- Falls back to any available language
- Downloads and cleans subtitle text (removes timing info, tags, etc.)
- Returns null on failure or insufficient text (< 50 characters)

### 4. Frontend Compatibility
Maintained the NO_TRANSCRIPT error code (422) that triggers the manual transcript input modal in `components/upload/multi-source-ingest.tsx`

### 5. Progress Visibility
Added detailed logging at each fallback stage:
- "[pipeline:extract] Attempting caption watch page scrape for: {videoId}"
- "[pipeline:extract] Watch page scrape failed, trying youtube-transcript library..."
- "[pipeline:extract] Trying yt-dlp for subtitles..."
- "[pipeline:extract] All automated methods failed, using video metadata description fallback..."

## Files Modified
1. `lib/ai/pipeline.ts` - Complete rewrite of extractTranscriptStage with fallback chain and yt-dlp integration
2. `app/api/ingest/url/route.ts` - Updated error message check to match new user-friendly message

## Result
Users now experience:
- Clear, honest messaging when transcripts fail
- Multiple automatic fallback attempts before giving up
- Path to manually provide transcript when all automated methods fail
- No misleading technical details about credentials/proxy
- Improved transparency through console logging of fallback attempts

This addresses all core issues raised in the original feedback while maintaining backward compatibility with the frontend.