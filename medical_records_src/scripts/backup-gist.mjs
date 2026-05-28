// 备份 GitHub Gist 上的 medical-records.json 到 scripts/.backup/
// 用法: node --env-file=../../.env scripts/backup-gist.mjs
//      (在 medical_records_src/ 目录下运行)

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const { GITHUB_TOKEN, GIST_ID } = process.env;
if (!GITHUB_TOKEN || !GIST_ID) {
  console.error("缺少 GITHUB_TOKEN 或 GIST_ID（需要 --env-file=../.env）");
  process.exit(1);
}

const FILENAME = "medical-records.json";
const __dirname = dirname(fileURLToPath(import.meta.url));
const backupDir = resolve(__dirname, ".backup");
mkdirSync(backupDir, { recursive: true });

console.log("拉取 gist", GIST_ID, "...");
const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
  headers: {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
  },
});
if (!res.ok) {
  console.error("拉取失败:", res.status, await res.text());
  process.exit(1);
}
const gist = await res.json();
const file = gist.files?.[FILENAME];
if (!file) {
  console.error(`gist 中没有 ${FILENAME}，已有文件:`, Object.keys(gist.files || {}));
  process.exit(1);
}

const content = file.truncated
  ? await fetch(file.raw_url).then((r) => r.text())
  : file.content;

const ts = new Date().toISOString().replace(/[:.]/g, "-");
const outPath = resolve(backupDir, `medical-records.${ts}.json`);
writeFileSync(outPath, content);

const data = JSON.parse(content);
const recordCount = data.records?.length ?? 0;
const imageCount = (data.records || []).reduce(
  (sum, r) => sum + (Array.isArray(r.images) ? r.images.length : 0) + (r.imageUrl ? 1 : 0),
  0
);
console.log(`✓ 备份完成: ${outPath}`);
console.log(`  records=${recordCount}, 图片总数(含旧字段)=${imageCount}`);
