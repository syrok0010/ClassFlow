import { buildInviteUrl } from "@/lib/invite";

export function getInviteOrigin() {
  const appUrl = process.env.APP_URL?.trim();
  const authUrl = process.env.BETTER_AUTH_URL?.trim();
  const origin = appUrl || authUrl;
  const normalizedOrigin = origin?.replace(/\/+$/, "");

  if (!normalizedOrigin) {
    throw new Error("Не настроен базовый URL приложения");
  }

  return normalizedOrigin;
}

export function buildServerInviteUrl(token: string) {
  return buildInviteUrl(token, getInviteOrigin());
}
