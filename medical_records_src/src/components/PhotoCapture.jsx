import { useState, useRef } from 'react';
import { RECORD_TYPES } from '../constants.js';
import { extractFromImage } from '../services/aiExtract.js';
import MemberPill from './MemberPill.jsx';
import QuickForm from './QuickForm.jsx';

export default function PhotoCapture({ members, onSave, onCancel, aiConfig, defaultMemberId }) {
  const [memberId, setMemberId] = useState(defaultMemberId || members[0]?.id);
  const [status, setStatus] = useState("idle"); // idle | processing | done | error | form
  const [extracted, setExtracted] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [imageThumb, setImageThumb] = useState(null);
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!aiConfig || !aiConfig.apiKey || !aiConfig.url || !aiConfig.endpoint) { alert("请先在设置中填写火山引擎配置"); return; }
    setStatus("processing");
    const fullData = await new Promise(function(res) { const r = new FileReader(); r.onload = function() { res(r.result); }; r.readAsDataURL(file); });
    setImageData(fullData);
    const thumb = await new Promise(function(res) {
      const img = new Image();
      img.onload = function() { const c = document.createElement("canvas"); const s = 88 / Math.max(img.width, img.height); c.width = img.width * s; c.height = img.height * s; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", 0.7)); };
      img.src = fullData;
    });
    setImageThumb(thumb);
    const base64 = fullData.split(",")[1];
    const mediaType = file.type || "image/jpeg";
    const result = await extractFromImage(base64, mediaType, aiConfig);
    if (result) { setExtracted(result); setStatus("done"); } else { setStatus("error"); }
  };

  const handleNext = function() { setStatus("form"); };

  return (
    <div style={{ padding: "0 0 20px" }}>
      {status !== "form" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {members.map(function(m) { return <MemberPill key={m.id} member={m} selected={memberId === m.id} onClick={function() { setMemberId(m.id); }} />; })}
        </div>
      )}
      {status === "idle" && (
        <div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
          <button onClick={function() { fileRef.current && fileRef.current.click(); }} style={{
            width: "100%", padding: "40px 20px", borderRadius: 16, border: "2px dashed #d0cdc5",
            background: "#faf9f7", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 36 }}>📸</span>
            <span style={{ fontSize: 14, color: "#888", fontFamily: "'Noto Sans SC', sans-serif" }}>拍照或选取单据</span>
            <span style={{ fontSize: 12, color: "#bbb", fontFamily: "'Noto Sans SC', sans-serif" }}>AI自动识别提取信息</span>
          </button>
        </div>
      )}
      {status === "processing" && (
        <div style={{ textAlign: "center", padding: "40px 20px", background: "#faf9f7", borderRadius: 16 }}>
          <div style={{ width: 32, height: 32, border: "3px solid #e8e5e0", borderTopColor: "#4A7C6F", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
          <div style={{ fontSize: 14, color: "#888", fontFamily: "'Noto Sans SC', sans-serif" }}>AI正在识别单据内容...</div>
        </div>
      )}
      {status === "error" && (
        <div style={{ textAlign: "center", padding: "30px 20px" }}>
          <div style={{ fontSize: 14, color: "#c06b5d", marginBottom: 12, fontFamily: "'Noto Sans SC', sans-serif" }}>识别失败，请重试或手动填写</div>
          <button onClick={function() { setStatus("idle"); setImageData(null); }} style={{
            padding: "8px 20px", borderRadius: 10, border: "1.5px solid #e8e5e0", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
          }}>重试</button>
        </div>
      )}
      {status === "done" && extracted && (
        <div>
          <div style={{ background: "#f0f7f4", borderRadius: 12, padding: 14, marginBottom: 14, border: "1px solid #d5e8df" }}>
            <div style={{ fontSize: 12, color: "#4A7C6F", fontWeight: 600, marginBottom: 8, fontFamily: "'Noto Sans SC', sans-serif" }}>AI识别结果</div>
            {extracted.date && <div style={{ fontSize: 13, color: "#555", marginBottom: 3, fontFamily: "'Noto Sans SC', sans-serif" }}>📅 {extracted.date}</div>}
            {extracted.hospital && <div style={{ fontSize: 13, color: "#555", marginBottom: 3, fontFamily: "'Noto Sans SC', sans-serif" }}>🏥 {extracted.hospital} {extracted.doctor && (" · " + extracted.doctor)}</div>}
            {extracted.diagnosis && <div style={{ fontSize: 13, color: "#555", marginBottom: 3, fontFamily: "'Noto Sans SC', sans-serif" }}>📌 {extracted.diagnosis}</div>}
            {extracted.medications && extracted.medications.length > 0 && extracted.medications.map(function(m, i) {
              return <div key={i} style={{ fontSize: 12, color: "#666", paddingLeft: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>💊 {m.name} {m.dosage ? "— " + m.dosage : ""}</div>;
            })}
            {extracted.tests && extracted.tests.length > 0 && extracted.tests.map(function(t, i) {
              return <div key={i} style={{ fontSize: 12, color: "#666", paddingLeft: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>🔬 {t.name} {t.result ? "— " + t.result : ""}</div>;
            })}
            {extracted.summary && <div style={{ fontSize: 13, color: "#333", marginTop: 6, fontWeight: 500, fontFamily: "'Noto Sans SC', sans-serif" }}>{extracted.summary}</div>}
          </div>
          {imageThumb && <img src={imageData} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: 14 }} />}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={function() { setStatus("idle"); setExtracted(null); setImageData(null); }} style={{
              flex: 1, padding: "12px", borderRadius: 12, border: "1.5px solid #e8e5e0", background: "#fff", fontSize: 14, color: "#888", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
            }}>重拍</button>
            <button onClick={handleNext} style={{
              flex: 2, padding: "12px", borderRadius: 12, border: "none", background: "#4A7C6F", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
            }}>下一步</button>
          </div>
        </div>
      )}
      {status === "form" && extracted && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#333", marginBottom: 10, fontFamily: "'Noto Sans SC', sans-serif" }}>
            {(function() { const t = RECORD_TYPES.find(function(x) { return x.key === (extracted.type || "visit"); }); return t ? t.icon + " " + t.label : ""; })()}
            <span style={{ fontSize: 12, color: "#aaa", fontWeight: 400, marginLeft: 8 }}>确认并编辑识别结果</span>
          </div>
          <QuickForm
            type={extracted.type || "visit"}
            memberId={memberId}
            onSave={onSave}
            onCancel={onCancel}
            aiConfig={aiConfig}
            initialData={extracted}
            initialImages={[{ imageData: imageData, imageThumb: imageThumb }]}
          />
        </div>
      )}
      {(status === "idle" || status === "error") && (
        <button onClick={onCancel} style={{
          width: "100%", marginTop: 12, padding: "10px", borderRadius: 12, border: "1.5px solid #e8e5e0",
          background: "#fff", fontSize: 14, color: "#888", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
        }}>取消</button>
      )}
    </div>
  );
}
