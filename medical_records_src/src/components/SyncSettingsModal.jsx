import { useState } from 'react';
import { gistSync } from '../services/gistSync.js';
import { storage } from '../services/storage.js';
import { tosHelper } from '../services/tosHelper.js';
import { stripBase64 } from '../utils/stripBase64.js';

export default function SyncSettingsModal({ onClose, onSyncDone, aiConfig }) {
  const [config, setConfig] = useState(gistSync.getConfig());
  const [token, setToken] = useState(config.token || "");
  const [gistId, setGistId] = useState(config.gistId || "");
  const [status, setStatus] = useState("idle");
  const [msg, setMsg] = useState("");

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e8e5e0",
    fontSize: 13, fontFamily: "'JetBrains Mono', monospace", background: "#faf9f7", outline: "none", boxSizing: "border-box", marginBottom: 10,
  };

  const handleSave = () => {
    gistSync.saveConfig({ token, gistId });
    setConfig({ token, gistId });
    setMsg("配置已保存");
    setTimeout(() => setMsg(""), 2000);
  };

  const handleInitGist = async () => {
    if (!token) { setMsg("请先填写 GitHub Token"); return; }
    setStatus("syncing"); setMsg("正在创建 Gist...");
    try {
      const newId = await gistSync.createGist(token, aiConfig);
      setGistId(newId);
      gistSync.saveConfig({ token, gistId: newId });
      setConfig({ token, gistId: newId });
      setStatus("success"); setMsg("Gist 创建成功！ID: " + newId);
    } catch (e) {
      setStatus("error"); setMsg(e.message);
    }
  };

  const handleSync = async () => {
    if (!token || !gistId) { setMsg("请先完成配置"); return; }
    gistSync.saveConfig({ token, gistId });
    setConfig({ token, gistId });
    setStatus("syncing"); setMsg("正在同步...");
    try {
      const remote = await gistSync.pull(token, gistId);
      const local = await storage.load() || { members: [], records: [] };
      const localDeleted = JSON.parse(localStorage.getItem("deleted-record-ids") || "[]");
      const localForSync = { members: local.members, records: local.records.map(r => stripBase64(r)), deletedIds: localDeleted };
      const remoteClean = { members: remote.members || [], records: (remote.records || []), deletedIds: remote.deletedIds || [] };
      const merged = gistSync.mergeData(localForSync, remoteClean);
      const localAi = aiConfig && aiConfig.apiKey ? aiConfig : null;
      const remoteAi = remote.aiConfig || null;
      const mergedAi = localAi || remoteAi || {};
      const tc = tosHelper.getConfig();
      await gistSync.push(token, gistId, merged, mergedAi, (tc && tc.accessKeyId) ? tc : undefined);
      const localImageMap = new Map();
      (local.records || []).forEach(r => { if (r.imageData) localImageMap.set(r.id, { imageData: r.imageData, imageThumb: r.imageThumb }); });
      const finalRecords = merged.records.map(r => {
        const imgs = localImageMap.get(r.id);
        return imgs ? { ...r, ...imgs } : r;
      });
      const finalData = { members: merged.members, records: finalRecords };
      await storage.save(finalData);
      localStorage.setItem("deleted-record-ids", JSON.stringify(merged.deletedIds || []));
      if (!localAi && remoteAi && remoteAi.apiKey) {
        localStorage.setItem("volcengine-config", JSON.stringify(remoteAi));
      }
      if (remote.tosConfig && remote.tosConfig.accessKeyId && !tosHelper.isConfigured()) {
        tosHelper.saveConfig(remote.tosConfig);
      }
      setStatus("success"); setMsg(`同步完成！共 ${merged.records.length} 条记录`);
      if (onSyncDone) onSyncDone(finalData, mergedAi);
    } catch (e) {
      setStatus("error"); setMsg(e.message);
    }
  };

  const isConfigured = token && gistId;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 400, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, fontFamily: "'Noto Sans SC', sans-serif" }}>云同步设置</div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 14, fontFamily: "'Noto Sans SC', sans-serif", lineHeight: 1.6 }}>
          通过 GitHub Gist 实现跨设备同步。需要一个 GitHub Personal Access Token（仅勾选 gist 权限）。
          <a href="https://github.com/settings/tokens/new?scopes=gist&description=medical-records-sync" target="_blank" rel="noopener" style={{ color: "#4A7C6F", marginLeft: 4 }}>去创建 Token</a>
        </div>

        <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>GitHub Token</div>
        <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" type="password" style={inputStyle} />

        <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>Gist ID {!gistId && <span style={{ color: "#bbb" }}>（首次使用点击下方"创建"）</span>}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={gistId} onChange={(e) => setGistId(e.target.value)} placeholder="自动生成或手动填写" style={{ ...inputStyle, flex: 1, marginBottom: 0 }} />
          {!gistId && <button onClick={handleInitGist} disabled={status === "syncing"} style={{
            padding: "8px 14px", borderRadius: 10, border: "none", background: token ? "#4A7C6F" : "#ddd",
            color: "#fff", fontSize: 12, cursor: token ? "pointer" : "default", whiteSpace: "nowrap", fontFamily: "'Noto Sans SC', sans-serif",
          }}>创建</button>}
        </div>

        {msg && <div style={{
          fontSize: 12, padding: "8px 12px", borderRadius: 8, marginBottom: 10, fontFamily: "'Noto Sans SC', sans-serif",
          background: status === "error" ? "#fef2f0" : status === "success" ? "#f0f7f4" : "#f5f3f0",
          color: status === "error" ? "#c06b5d" : status === "success" ? "#4A7C6F" : "#888",
        }}>{status === "syncing" && <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #e8e5e0", borderTopColor: "#4A7C6F", borderRadius: "50%", animation: "spin 0.8s linear infinite", verticalAlign: "middle", marginRight: 6 }} />}{msg}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "1.5px solid #e8e5e0", background: "#fff", fontSize: 14, color: "#888", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif" }}>关闭</button>
          <button onClick={handleSave} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "1.5px solid #e8e5e0", background: "#fff", fontSize: 14, color: "#4A7C6F", fontWeight: 600, cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif" }}>保存配置</button>
          {isConfigured && <button onClick={handleSync} disabled={status === "syncing"} style={{
            flex: 1, padding: "10px", borderRadius: 12, border: "none",
            background: status === "syncing" ? "#aaa" : "#4A7C6F", color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: status === "syncing" ? "default" : "pointer", fontFamily: "'Noto Sans SC', sans-serif",
          }}>同步</button>}
        </div>
      </div>
    </div>
  );
}
