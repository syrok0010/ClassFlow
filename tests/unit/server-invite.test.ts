import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { buildServerInviteUrl, getInviteOrigin } from "@/lib/server-invite";

const originalAppUrl = process.env.APP_URL;
const originalBetterAuthUrl = process.env.BETTER_AUTH_URL;

afterEach(() => {
  process.env.APP_URL = originalAppUrl;
  process.env.BETTER_AUTH_URL = originalBetterAuthUrl;
});

test("server invite URL is built from APP_URL without duplicate slashes", () => {
  process.env.APP_URL = "https://classflow.example/";
  process.env.BETTER_AUTH_URL = "";

  assert.equal(getInviteOrigin(), "https://classflow.example");
  assert.equal(buildServerInviteUrl("ABCD-1234"), "https://classflow.example/invite/ABCD-1234");
});

test("server invite URL falls back to BETTER_AUTH_URL", () => {
  process.env.APP_URL = "";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";

  assert.equal(buildServerInviteUrl("TOKEN"), "http://localhost:3000/invite/TOKEN");
});

test("server invite URL requires configured app origin", () => {
  process.env.APP_URL = "";
  process.env.BETTER_AUTH_URL = "";

  assert.throws(() => getInviteOrigin(), /Не настроен базовый URL приложения/);
});
