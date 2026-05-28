// 紧急恢复：把指定备份文件 push 回 gist
// 用法:
//   node --env-file=../.env scripts/restore-from-backup.mjs <backup-file> [--apply]
// 默认 dry-run，加 --apply 真推送

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const apply = process.argv.includes("--apply");
const file = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
if (!file) {
  console.error("用法: node scripts/restore-from-backup.mjs <backup-file> [--apply]");
  process.exit(1);
}

const { GITHUB_TOKEN, GIST_ID } = process.env;
if (!GITHUB_TOKEN || !GIST_ID) {
  console.error("缺少 GITHUB_TOKEN / GIST_ID");
  process.exit(1);
}

const FILENAME = "medical-records.json";
const __dirname = dirname(fileURLToPath(import.meta.url));
const backupDir = resolve(__dirname, ".backup");
mkdirSync(backupDir, { recursive: true });

// 1) 先备份 gist 当前状态（坏的也存一份）
console.log("拉取当前 gist 作为安全备份 ...");
const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
  headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
});
if (!res.ok) {
  console.error("拉取失败:", res.status, await res.text());
  process.exit(1);
}
const gist = await res.json();
const currentContent = gist.files?.[FILENAME]?.content;
if (!currentContent) {
  console.error("gist 中没有", FILENAME);
  process.exit(1);
}
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const safetyPath = resolve(backupDir, `medical-records.pre-restore.${ts}.json`);
writeFileSync(safetyPath, currentContent);
console.log("✓ 当前 gist 安全备份:", safetyPath);

// 2) 读要恢复的备份
const restoreContent = readFileSync(resolve(file), "utf-8");
const restoreData = JSON.parse(restoreContent);
const currentData = JSON.parse(currentContent);

// 3) 关键合并策略：
//    - 使用备份的 records / members（含 imageKey/thumbKey）
//    - 保留 gist 当前的 aiConfig / tosConfig / deletedIds / deletedMemberIds（这些是元信息，不能用 24h 前的）
const merged = {
  members: restoreData.members,
  records: restoreData.records,
  deletedIds: currentData.deletedIds || [],
  deletedMemberIds: currentData.deletedMemberIds || [],
  aiConfig: currentData.aiConfig || restoreData.aiConfig,
  tosConfig: currentData.tosConfig || restoreData.tosConfig,
  syncedAt: new Date().toISOString(),
};

// 4) 统计
let keyCount = 0;
for (const r of merged.records || []) {
  for (const img of (r.images || [])) {
    if (img.imageKey) keyCount++;
  }
}
console.log("\n=== 恢复内容统计 ===");
console.log(`恢复源: ${basename(file)}`);
console.log(`records: ${merged.records?.length}`);
console.log(`含 imageKey 的图片: ${keyCount}`);
console.log(`沿用 gist 现状: deletedIds=${merged.deletedIds.length} deletedMemberIds=${merged.deletedMemberIds.length}`);
console.log(`aiConfig 来源: ${currentData.aiConfig ? "gist" : "backup"}`);
console.log(`tosConfig 来源: ${currentData.tosConfig ? "gist" : "backup"}`);

if (!apply) {
  const previewPath = resolve(backupDir, `medical-records.restore-preview.${ts}.json`);
  writeFileSync(previewPath, JSON.stringify(merged, null, 2));
  console.log(`\n✓ dry-run 预览: ${previewPath}`);
  console.log("(dry-run) 加 --apply 真推送");
  process.exit(0);
}

console.log("\n推送到 gist ...");
const patchRes = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
  method: "PATCH",
  headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
  body: JSON.stringify({ files: { [FILENAME]: { content: JSON.stringify(merged) } } }),
});
if (!patchRes.ok) {
  console.error("推送失败:", patchRes.status, await patchRes.text());
  process.exit(1);
}
console.log("✓ 推送成功");
