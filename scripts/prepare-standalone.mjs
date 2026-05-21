import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const staticSourceDir = path.join(projectRoot, ".next", "static");
const staticTargetDir = path.join(
  projectRoot,
  ".next",
  "standalone",
  ".next",
  "static",
);

if (!existsSync(staticSourceDir)) {
  throw new Error(`Не найдена директория со статикой: ${staticSourceDir}`);
}

mkdirSync(staticTargetDir, { recursive: true });
cpSync(staticSourceDir, staticTargetDir, { recursive: true });

console.log(`Скопирована release-статика: ${staticSourceDir} -> ${staticTargetDir}`);
