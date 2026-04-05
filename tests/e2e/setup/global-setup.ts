import "dotenv/config";
import { execSync } from "node:child_process";
function run(command: string) {
  execSync(command, {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL_E2E,
    },
  });
}

export default async function globalSetup() {
  if (!process.env.DATABASE_URL_E2E) {
    throw new Error("DATABASE_URL_E2E is not set. Add it to .env");
  }

  run("pnpm prisma db push --accept-data-loss");
  run("pnpm tsx prisma/seed.e2e.ts");
}
