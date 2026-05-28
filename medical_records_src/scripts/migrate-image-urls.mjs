// 把 gist 中 records.images[*].imageUrl/thumbUrl 改写成 imageKey/thumbKey
// 用法:
//   node --env-file=../.env scripts/migrate-image-urls.mjs           # dry-run
//   node --env-file=../.env scripts/migrate-image-urls.mjs --apply   # 真推送

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apply = process.argv.includes("--apply");
const { GITHUB_TOKEN, GIST_ID } = process.env;
if (!GITHUB_TOKEN || !GIST_ID) {
  console.error("缺少 GITHUB_TOKEN 或 GIST_ID（需要 --env-file=../.env）");
  process.exit(1);
}

const FILENAME = "medical-records.json";
const __dirname = dirname(fileURLToPath(import.meta.url));
const backupDir = resolve(__dirname, ".backup");
mkdirSync(backupDir, { recursive: true });

// 提取 key：从形如 https://{anyhost}/medical-images/xxx.jpeg → medical-images/xxx.jpeg
function extractKey(url) {
  if (!url || typeof url !== "string") return null;
  if (!url.startsWith("http")) return null;
  const m = url.match(/(medical-images\/.+)$/);
  return m ? m[1] : null;
}

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
  console.error(`gist 中没有 ${FILENAME}`);
  process.exit(1);
}
const originalContent = file.truncated
  ? await fetch(file.raw_url).then((r) => r.text())
  : file.content;

// 本次预迁移备份
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const preMigratePath = resolve(backupDir, `medical-records.pre-migrate.${ts}.json`);
writeFileSync(preMigratePath, originalContent);
console.log(`✓ 预迁移备份: ${preMigratePath}`);

const data = JSON.parse(originalContent);
let recordsTouched = 0;
let imagesConverted = 0;
let imagesAlreadyKey = 0;
let imagesUnconvertible = 0;

for (const r of data.records || []) {
  if (!Array.isArray(r.images)) continue;
  let touched = false;
  for (const img of r.images) {
    if (img.imageKey) { imagesAlreadyKey++; continue; }
    if (img.imageUrl) {
      const ik = extractKey(img.imageUrl);
      const tk = extractKey(img.thumbUrl);
      if (ik) {
        img.imageKey = ik;
        if (tk) img.thumbKey = tk;
        delete img.imageUrl;
        delete img.thumbUrl;
        imagesConverted++;
        touched = true;
      } else {
        imagesUnconvertible++;
        console.warn(`  ⚠ 无法提取 key (record=${r.id}):`, img.imageUrl);
      }
    }
  }
  if (touched) recordsTouched++;
}

console.log("\n=== 迁移统计 ===");
console.log(`记录总数: ${data.records?.length ?? 0}`);
console.log(`受影响记录: ${recordsTouched}`);
console.log(`转换图片: ${imagesConverted}`);
console.log(`已是 key 跳过: ${imagesAlreadyKey}`);
console.log(`无法转换: ${imagesUnconvertible}`);

if (imagesConverted === 0) {
  console.log("\n没有需要迁移的图片，退出。");
  process.exit(0);
}

const newContent = JSON.stringify(data, null, 2);

// 写一份转换结果到本地，便于人肉对比
const previewPath = resolve(backupDir, `medical-records.post-migrate.${ts}.json`);
writeFileSync(previewPath, newContent);
console.log(`✓ 迁移结果预览: ${previewPath}`);

// 抽样打印第一条对比
const firstSample = (data.records || []).find((r) => r.images?.[0]?.imageKey);
if (firstSample) {
  console.log("\n样例 (record id=" + firstSample.id + ", images[0]):");
  console.log("  →", JSON.stringify(firstSample.images[0]));
}

if (!apply) {
  console.log("\n(dry-run) 加 --apply 真实推送回 gist");
  process.exit(0);
}

console.log("\n推送到 gist ...");
const patchRes = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
  method: "PATCH",
  headers: {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ files: { [FILENAME]: { content: newContent } } }),
});
if (!patchRes.ok) {
  console.error("推送失败:", patchRes.status, await patchRes.text());
  process.exit(1);
}
console.log("✓ 推送成功");
