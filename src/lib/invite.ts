type ClipboardWriter = Pick<Clipboard, "writeText">;

function getClipboard(clipboard?: ClipboardWriter) {
  if (clipboard) {
    return clipboard;
  }

  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    throw new Error("Буфер обмена недоступен");
  }

  return navigator.clipboard;
}

function getInviteOrigin(origin?: string) {
  if (origin) {
    return origin;
  }

  if (typeof window === "undefined") {
    throw new Error("Не удалось определить origin");
  }

  return window.location.origin;
}

export function buildInviteUrl(token: string, origin?: string) {
  const trimmedToken = token.trim();

  if (!trimmedToken) {
    throw new Error("Отсутствует инвайт-токен");
  }

  return `${getInviteOrigin(origin)}/invite/${trimmedToken}`;
}

export async function copyInviteUrl(
  token: string,
  options?: {
    origin?: string;
    clipboard?: ClipboardWriter;
  }
) {
  const inviteUrl = buildInviteUrl(token, options?.origin);
  await getClipboard(options?.clipboard).writeText(inviteUrl);
  return inviteUrl;
}
