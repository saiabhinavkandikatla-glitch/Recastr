import type { SocialAccount } from "@prisma/client";
import { decryptToken } from "@/lib/crypto";

export async function publishToLinkedIn(account: SocialAccount, body: string) {
  if (!account.platformId) {
    throw new Error("LinkedIn account is missing a member id");
  }

  const token = decryptToken(account.accessToken);
  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: `urn:li:person:${account.platformId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: body },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });

  if (!response.ok) {
    throw new Error(`LinkedIn publish failed: ${response.status}`);
  }
}
