import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { FET_CLI_PATH, FET_TIMEOUT_MS, FET_WORK_DIR } from "./env";
import { buildFetXml } from "./fet-xml";
import type { FetRunRequest, FetRunResult } from "./types";

async function findActivitiesXml(dir: string): Promise<string | null> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await findActivitiesXml(fullPath);
      if (nested) return nested;
    }

    if (entry.isFile() && entry.name.endsWith("_activities.xml")) {
      return fullPath;
    }
  }

  return null;
}

function runFetCli(inputFilePath: string, outputDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(FET_CLI_PATH, [
      `--inputfile=${inputFilePath}`,
      `--outputdir=${outputDir}`,
      `--timelimitseconds=${Math.ceil(FET_TIMEOUT_MS / 1000)}`,
    ], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`FET не уложился в таймаут ${FET_TIMEOUT_MS} мс`));
    }, FET_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      if (error.code === "ENOENT") {
        reject(new Error(`FET CLI не найден: ${FET_CLI_PATH}. Укажите FET_CLI_PATH или установите fet-cl`));
        return;
      }

      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve([stdout.trim(), stderr.trim()].filter(Boolean).join("\n"));
        return;
      }

      reject(new Error(`FET завершился с кодом ${code}: ${[stdout.trim(), stderr.trim()].filter(Boolean).join("\n")}`));
    });
  });
}

export async function runFetCliPass(request: FetRunRequest): Promise<FetRunResult> {
  const artifactDir = path.join(process.cwd(), FET_WORK_DIR, request.artifactId, request.kind);
  const outputDir = path.join(artifactDir, "out");
  await mkdir(outputDir, { recursive: true });

  const inputFilePath = path.join(artifactDir, `${request.kind}.fet`);
  await writeFile(inputFilePath, buildFetXml(request.input, request.activities), "utf8");

  const cliOutput = await runFetCli(inputFilePath, outputDir);
  const outputActivitiesXmlPath = await findActivitiesXml(outputDir);

  if (!outputActivitiesXmlPath) {
    throw new Error(`FET не создал файл *_activities.xml для прохода "${request.kind}"`);
  }

  await writeFile(path.join(artifactDir, "fet-cli.log"), cliOutput, "utf8");

  return {
    artifactDir,
    outputActivitiesXmlPath,
    warnings: [],
  };
}

export async function readFetActivitiesXml(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}
