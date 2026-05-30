import type { SocialAccount } from "@prisma/client";
import { decryptToken } from "@/lib/crypto";

export async function publishToTwitter(account: SocialAccount, body: string) {
  const token = decryptToken(account.accessToken);
  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: body.slice(0, 280) }),
  });

  if (!response.ok) {
    throw new Error(`Twitter publish failed: ${response.status}`);
  }
}
