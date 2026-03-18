import { test as setup } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

setup("authenticate as admin", async ({ page }) => {
  await loginAsAdmin(page);
  await page.context().storageState({ path: "tests/e2e/.auth/admin.json" });
});
