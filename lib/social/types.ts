export const publishingPlatforms = ["twitter", "linkedin", "instagram"] as const;

export type PublishingPlatform = (typeof publishingPlatforms)[number];

export function isPublishingPlatform(value: string): value is PublishingPlatform {
  return publishingPlatforms.includes(value as PublishingPlatform);
}

export type OAuthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

export type SocialProfile = {
  handle?: string;
  platformId?: string;
};
