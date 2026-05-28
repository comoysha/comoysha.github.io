import { GIST_CONFIG_KEY, GIST_FILENAME } from '../constants.js';

export const gistSync = {
  getConfig() {
    try { return JSON.parse(localStorage.getItem(GIST_CONFIG_KEY) || "{}"); } catch { return {}; }
  },
  saveConfig(cfg) { localStorage.setItem(GIST_CONFIG_KEY, JSON.stringify(cfg)); },
  isConfigured() { const c = this.getConfig(); return !!(c.token); },

  async createGist(token, aiConfig) {
    const resp = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: { "Authorization": "token " + token, "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "家庭诊疗记录数据",
        public: false,
        files: { [GIST_FILENAME]: { content: JSON.stringify({ members: [], records: [], aiConfig: aiConfig || {}, syncedAt: new Date().toISOString() }) } },
      }),
    });
    if (!resp.ok) throw new Error("创建 Gist 失败: " + resp.status);
    const data = await resp.json();
    return data.id;
  },

  async pull(token, gistId) {
    const resp = await fetch("https://api.github.com/gists/" + gistId, {
      headers: { "Authorization": "token " + token },
    });
    if (!resp.ok) throw new Error("拉取失败: " + resp.status);
    const data = await resp.json();
    const file = data.files?.[GIST_FILENAME];
    if (!file) throw new Error("Gist 中没有找到数据文件");
    return JSON.parse(file.content);
  },

  async push(token, gistId, data, aiConfig, tosConfig, retries) {
    retries = retries || 0;
    const payload = Object.assign({}, data, { syncedAt: new Date().toISOString() });
    if (aiConfig) payload.aiConfig = aiConfig;
    if (tosConfig && tosConfig.accessKeyId) payload.tosConfig = tosConfig;
    const resp = await fetch("https://api.github.com/gists/" + gistId, {
      method: "PATCH",
      headers: { "Authorization": "token " + token, "Content-Type": "application/json" },
      body: JSON.stringify({
        files: { [GIST_FILENAME]: { content: JSON.stringify(payload) } },
      }),
    });
    if (resp.status === 409 && retries < 2) {
      await new Promise(function(r) { setTimeout(r, 1000); });
      return this.push(token, gistId, data, aiConfig, tosConfig, retries + 1);
    }
    if (!resp.ok) throw new Error("推送失败: " + resp.status);
    return true;
  },

  mergeData(local, remote) {
    // Merge members while honoring tombstones from both sides
    const localMembers = local.members || [];
    const remoteMembers = remote.members || [];
    const deletedMemberIds = new Set([...(local.deletedMemberIds || []), ...(remote.deletedMemberIds || [])]);
    const memberMap = new Map();
    for (const m of remoteMembers) {
      if (!deletedMemberIds.has(m.id)) memberMap.set(m.id, m);
    }
    for (const m of localMembers) {
      if (deletedMemberIds.has(m.id)) {
        memberMap.delete(m.id);
        continue;
      }
      memberMap.set(m.id, m);
    }
    const mergedMembers = [...memberMap.values()];

    // Collect deleted IDs from both sides
    const deletedIds = new Set([...(local.deletedIds || []), ...(remote.deletedIds || [])]);

    // Merge records: union by id, exclude deleted. Same-id resolution prefers
    // the side carrying the newer image format (imageKey) so a client whose
    // localStorage still holds legacy imageUrl records can't silently overwrite
    // already-migrated gist data. Falls back to createdAt otherwise.
    const localRecords = local.records || [];
    const remoteRecords = remote.records || [];
    const hasNewImages = (rec) => Array.isArray(rec.images) && rec.images.some((i) => i && i.imageKey);
    const recordMap = new Map();
    for (const r of remoteRecords) { if (!deletedIds.has(r.id)) recordMap.set(r.id, r); }
    for (const r of localRecords) {
      if (deletedIds.has(r.id)) { recordMap.delete(r.id); continue; }
      const existing = recordMap.get(r.id);
      if (!existing) { recordMap.set(r.id, r); continue; }
      const localNew = hasNewImages(r);
      const remoteNew = hasNewImages(existing);
      if (remoteNew && !localNew) continue; // keep remote (newer format)
      if (localNew && !remoteNew) { recordMap.set(r.id, r); continue; }
      if ((r.createdAt || 0) >= (existing.createdAt || 0)) recordMap.set(r.id, r);
    }
    const mergedRecords = [...recordMap.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return { members: mergedMembers, records: mergedRecords, deletedIds: [...deletedIds], deletedMemberIds: [...deletedMemberIds] };
  },
};
