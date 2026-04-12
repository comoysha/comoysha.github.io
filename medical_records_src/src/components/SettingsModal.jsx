import { useState } from 'react';
import { tosHelper } from '../services/tosHelper.js';

export default function SettingsModal({ aiConfig, onSave, onClose, onPush }) {
  const [url, setUrl] = useState(aiConfig.url || "https://ark.cn-beijing.volces.com/api/v3");
  const [apiKey, setApiKey] = useState(aiConfig.apiKey || "");
  const [endpoint, setEndpoint] = useState(aiConfig.endpoint || "");
  const [apiType, setApiType] = useState(aiConfig.apiType || "responses");
  const tosCfg = tosHelper.getConfig();
  const [tosAk, setTosAk] = useState(tosCfg.accessKeyId || "");
  const [tosSk, setTosSk] = useState(tosCfg.accessKeySecret || "");
  const [tosBucket, setTosBucket] = useState(tosCfg.bucket || "");
  const [tosRegion, setTosRegion] = useState(tosCfg.region || "cn-beijing");
  const [tab, setTab] = useState("ai");
  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e8e5e0",
    fontSize: 13, fontFamily: "'JetBrains Mono', monospace", background: "#faf9f7", outline: "none", boxSizing: "border-box", marginBottom: 10,
  };
  const tabStyle = (active) => ({
    flex: 1, padding: "8px 0", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 500,
    cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif", transition: "all 0.15s",
    background: active ? "#4A7C6F" : "#f0ede8", color: active ? "#fff" : "#888",
  });
  const handleSaveAll = () => {
    onSave({ url: url, apiKey: apiKey, endpoint: endpoint, apiType: apiType });
    tosHelper.saveConfig({ accessKeyId: tosAk, accessKeySecret: tosSk, bucket: tosBucket, region: tosRegion });
    if (onPush) setTimeout(onPush, 200);
    onClose();
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 420, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, fontFamily: "'Noto Sans SC', sans-serif" }}>设置</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, background: "#f0ede8", borderRadius: 10, padding: 3 }}>
          <button onClick={() => setTab("ai")} style={tabStyle(tab === "ai")}>AI 识别</button>
          <button onClick={() => setTab("tos")} style={tabStyle(tab === "tos")}>图片存储</button>
        </div>

        {tab === "ai" && <>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 10, fontFamily: "'Noto Sans SC', sans-serif" }}>火山引擎 API 配置，用于拍照识别。</div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>API 类型</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, background: "#f5f3f0", borderRadius: 10, padding: 3 }}>
            <button onClick={() => setApiType("responses")} style={tabStyle(apiType === "responses")}>Responses</button>
            <button onClick={() => setApiType("chat")} style={tabStyle(apiType === "chat")}>Chat</button>
          </div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>API URL</div>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://ark.cn-beijing.volces.com/api/v3" style={inputStyle} />
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>API Key</div>
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="输入 API Key" type="password" style={inputStyle} />
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>Endpoint</div>
          <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="ep-20240xxx-xxxxx" style={inputStyle} />
        </>}

        {tab === "tos" && <>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 10, fontFamily: "'Noto Sans SC', sans-serif" }}>火山引擎 TOS 对象存储，用于跨设备同步图片。</div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>AccessKey ID</div>
          <input value={tosAk} onChange={(e) => setTosAk(e.target.value)} placeholder="AKLT..." style={inputStyle} />
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>AccessKey Secret</div>
          <input value={tosSk} onChange={(e) => setTosSk(e.target.value)} placeholder="..." type="password" style={inputStyle} />
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>Bucket</div>
          <input value={tosBucket} onChange={(e) => setTosBucket(e.target.value)} placeholder="your-bucket-name" style={inputStyle} />
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>Region</div>
          <input value={tosRegion} onChange={(e) => setTosRegion(e.target.value)} placeholder="cn-beijing" style={inputStyle} />
        </>}

        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "1.5px solid #e8e5e0", background: "#fff", fontSize: 14, color: "#888", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif" }}>取消</button>
          <button onClick={handleSaveAll} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "none", background: "#4A7C6F", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif" }}>保存</button>
        </div>
      </div>
    </div>
  );
}
