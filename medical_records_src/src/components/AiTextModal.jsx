import { useState } from 'react';
import { extractFromText } from '../services/aiExtract.js';

export default function AiTextModal({ type, aiConfig, onResult, onClose }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("idle");

  const handleExtract = async function() {
    if (!text.trim()) return;
    if (!aiConfig || !aiConfig.apiKey) { alert("请先在设置中配置火山引擎 API"); return; }
    setStatus("processing");
    const result = await extractFromText(text, type, aiConfig);
    if (result) { onResult(result); onClose(); }
    else { setStatus("error"); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 420, width: "100%" }} onClick={function(e) { e.stopPropagation(); }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, fontFamily: "'Noto Sans SC', sans-serif" }}>AI 识别文字</div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 12, fontFamily: "'Noto Sans SC', sans-serif" }}>粘贴或输入一段医疗相关的文字描述，AI 会自动提取信息并填入表单。</div>
        <textarea value={text} onChange={function(e) { setText(e.target.value); }} placeholder="例如：4月10日去社区医院看了感冒，医生开了阿莫西林和布洛芬..." rows={6} style={{
          width: "100%", padding: "12px", borderRadius: 10, border: "1.5px solid #e8e5e0", fontSize: 14,
          fontFamily: "'Noto Sans SC', sans-serif", background: "#faf9f7", outline: "none", boxSizing: "border-box", resize: "vertical", marginBottom: 12,
        }} autoFocus />
        {status === "error" && <div style={{ fontSize: 12, color: "#c06b5d", marginBottom: 8, fontFamily: "'Noto Sans SC', sans-serif" }}>识别失败，请重试</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "1.5px solid #e8e5e0", background: "#fff", fontSize: 14, color: "#888", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif" }}>取消</button>
          <button onClick={handleExtract} disabled={status === "processing" || !text.trim()} style={{
            flex: 2, padding: "10px", borderRadius: 12, border: "none",
            background: (text.trim() && status !== "processing") ? "#4A7C6F" : "#ccc", color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: (text.trim() && status !== "processing") ? "pointer" : "default", fontFamily: "'Noto Sans SC', sans-serif",
          }}>{status === "processing" ? "识别中..." : "识别并填入"}</button>
        </div>
      </div>
    </div>
  );
}
