import type { SocialAccount } from "@prisma/client";
import { decryptToken } from "@/lib/crypto";

export async function publishToInstagram(account: SocialAccount, body: string) {
  if (!account.platformId) {
    throw new Error("Instagram account is missing an account id");
  }

  const token = decryptToken(account.accessToken);
  const createResponse = await fetch(
    `https://graph.instagram.com/${account.platformId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: token,
        caption: body.slice(0, 2200),
      }),
    },
  );

  if (!createResponse.ok) {
    throw new Error(`Instagram media creation failed: ${createResponse.status}`);
  }

  const created = (await createResponse.json()) as { id?: string };
  if (!created.id) throw new Error("Instagram media creation did not return an id");

  const publishResponse = await fetch(
    `https://graph.instagram.com/${account.platformId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: token,
        creation_id: created.id,
      }),
    },
  );

  if (!publishResponse.ok) {
    throw new Error(`Instagram publish failed: ${publishResponse.status}`);
  }
}
