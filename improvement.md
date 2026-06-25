# Fix for YouTube Transcript Blocked Error

## Root Cause
When a YouTube video has no transcript available and no description, the application throws a specific error message: "YouTube transcript is blocked on this network, and no description was provided. Please verify your credentials or configure your proxy." This error was being handled generically by the API error handler, which returned a response with code "ingest_failed". However, the client-side code in `components/upload/multi-source-ingest.tsx` was specifically checking for code "NO_TRANSCRIPT" to show a manual transcript input modal.

## Fix
Modified the error handling in `app/api/ingest/url/route.ts` to specifically catch the YouTube transcript blocked error and return a response with code "NO_TRANSCRIPT".

### Changes Made
**File:** `app/api/ingest/url/route.ts`
- Added a specific error check in the catch block of the POST function
- When the YouTube transcript blocked error is detected, returns a JSON response with:
  - `error`: the original error message
  - `code`: "NO_TRANSCRIPT" 
  - `status`: 422 (Unprocessable Entity)

### Code Change
```typescript
} catch (error) {
  if (error instanceof Response) return error;
  const planResponse = planLimitErrorResponse(error);
  if (planResponse) return planResponse;
  const creditResponse = creditErrorResponse(error);
  if (creditResponse) return creditResponse;

  // Handle YouTube transcript blocked error specifically
  if (error instanceof Error &&
      error.message === "YouTube transcript is blocked on this network, and no description was provided. Please verify your credentials or configure your proxy.") {
    return NextResponse.json(
      {
        error: error.message,
        code: "NO_TRANSCRIPT",
      },
      { status: 422 }
    );
  }

  return apiError(error, "ingest_failed", 400);
}
```

## Why This Fix Works
1. **Addresses the Specific Error:** The fix targets the exact error message thrown when YouTube transcripts are unavailable
2. **Maintains Compatibility:** All other error handling paths remain unchanged
3. **Matches Client Expectations:** Returns the "NO_TRANSCRIPT" code that the client-side code is specifically checking for
4. **Uses Appropriate Status Code:** 422 is semantically correct for this type of validation error

## Verification
After this fix:
- When a YouTube video has no transcript available, the API will return `{ code: "NO_TRANSCRIPT" }`
- The client-side code will detect this code and show the manual transcript input modal
- Users will be able to paste a transcript manually to generate content from YouTube videos that don't have automatic captions

## Files Changed
- `app/api/ingest/url/route.ts` - Added specific error handling for YouTube transcript blocked errors