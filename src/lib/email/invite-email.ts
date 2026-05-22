import { Resend } from "resend";

export type InviteEmailInput = {
  to: string;
  inviteUrl: string;
  userFullName: string;
};

export class InviteEmailConfigError extends Error {
  constructor() {
    super("Не настроена отправка email");
    this.name = "InviteEmailConfigError";
  }
}

let resendClient: Resend | null = null;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new InviteEmailConfigError();
  }

  resendClient ??= new Resend(apiKey);
  return resendClient;
}

function getSender() {
  const from = process.env.RESEND_FROM?.trim();

  if (!from) {
    throw new InviteEmailConfigError();
  }

  return from;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildInviteEmailHtml({ inviteUrl, userFullName }: InviteEmailInput) {
  const displayName = escapeHtml(userFullName || "пользователь");
  const safeInviteUrl = escapeHtml(inviteUrl);

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">Приглашение в ClassFlow</h1>
      <p>Здравствуйте, ${displayName}.</p>
      <p>Для вас создан аккаунт в ClassFlow. Перейдите по ссылке, чтобы активировать аккаунт и установить пароль.</p>
      <p style="margin: 24px 0;">
        <a href="${safeInviteUrl}" style="display: inline-block; padding: 10px 16px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 6px;">
          Активировать аккаунт
        </a>
      </p>
      <p>Если кнопка не работает, скопируйте ссылку в браузер:</p>
      <p><a href="${safeInviteUrl}">${safeInviteUrl}</a></p>
    </div>
  `;
}

function buildInviteEmailText({ inviteUrl, userFullName }: InviteEmailInput) {
  const displayName = userFullName || "пользователь";

  return [
    `Здравствуйте, ${displayName}.`,
    "",
    "Для вас создан аккаунт в ClassFlow.",
    "Перейдите по ссылке, чтобы активировать аккаунт и установить пароль:",
    inviteUrl,
  ].join("\n");
}

export async function sendInviteEmail(input: InviteEmailInput) {
  const result = await getResendClient().emails.send({
    from: getSender(),
    to: input.to,
    subject: "Приглашение в ClassFlow",
    html: buildInviteEmailHtml(input),
    text: buildInviteEmailText(input),
  });

  if (result.error) {
    console.error("Resend invite email error:", result.error);
    throw new Error("Не удалось отправить email");
  }

  return { id: result.data?.id ?? "" };
}
