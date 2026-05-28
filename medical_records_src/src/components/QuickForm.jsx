import { useState } from 'react';
import { createId } from '../constants.js';
import { tosHelper } from '../services/tosHelper.js';
import TypedFormFields from './TypedFormFields.jsx';
import MultiImageAttachment from './MultiImageAttachment.jsx';
import AiTextModal from './AiTextModal.jsx';

export default function QuickForm({ type, memberId, onSave, onCancel, aiConfig, initialData, initialImages }) {
  const [formState, setFormState] = useState(function() {
    const d = initialData || {};
    return {
      date: d.date || new Date().toISOString().slice(0, 10), summary: d.summary || "", hospital: d.hospital || "",
      doctor: d.doctor || "", diagnosis: d.diagnosis || "",
      medications: d.medications || [], tests: d.tests || [], notes: d.notes || "",
    };
  });
  const [images, setImages] = useState(initialImages || []);
  const [saving, setSaving] = useState(false);
  const [showAiText, setShowAiText] = useState(false);

  const handleAiResult = function(result) {
    setFormState({
      date: result.date || formState.date, summary: result.summary || formState.summary,
      hospital: result.hospital || formState.hospital, doctor: result.doctor || formState.doctor,
      diagnosis: result.diagnosis || formState.diagnosis,
      medications: (result.medications && result.medications.length) ? result.medications : formState.medications,
      tests: (result.tests && result.tests.length) ? result.tests : formState.tests,
      notes: result.notes || formState.notes,
    });
  };

  const handleSave = async function() {
    if (!formState.summary.trim() || saving) return;
    setSaving(true);
    const id = createId();
    const record = { id: id, memberId: memberId, type: type, date: formState.date, summary: formState.summary.trim(),
      hospital: formState.hospital, doctor: formState.doctor, diagnosis: formState.diagnosis,
      medications: (formState.medications || []).filter(function(m) { return m.name.trim(); }),
      tests: (formState.tests || []).filter(function(t) { return t.name.trim(); }),
      notes: formState.notes, createdAt: Date.now() };
    // Upload images to TOS
    if (images.length > 0) {
      const uploaded = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.imageKey) { uploaded.push({ imageKey: img.imageKey, thumbKey: img.thumbKey }); continue; }
        if (img.imageUrl) { uploaded.push({ imageUrl: img.imageUrl, thumbUrl: img.thumbUrl }); continue; }
        if (img.imageData && tosHelper.isConfigured()) {
          try {
            const imgId = id + "-" + i;
            const imageKey = await tosHelper.uploadBase64(img.imageData, imgId);
            const thumbKey = await tosHelper.uploadThumb(img.imageThumb, imgId);
            uploaded.push({ imageKey, thumbKey });
          } catch (e) { uploaded.push({ imageData: img.imageData, imageThumb: img.imageThumb }); }
        } else if (img.imageData) {
          uploaded.push({ imageData: img.imageData, imageThumb: img.imageThumb });
        }
      }
      record.images = uploaded;
    }
    setSaving(false);
    onSave(record);
  };

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e8e5e0",
    fontSize: 14, fontFamily: "'Noto Sans SC', sans-serif", background: "#faf9f7", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ padding: "0 0 20px" }}>
      {showAiText && <AiTextModal type={type} aiConfig={aiConfig} onResult={handleAiResult} onClose={function() { setShowAiText(false); }} />}
      <TypedFormFields type={type} state={formState} setState={setFormState} inputStyle={inputStyle} />
      <MultiImageAttachment images={images} onChange={setImages} />
      <button onClick={function() { setShowAiText(true); }} style={{
        width: "100%", padding: "10px", borderRadius: 10, border: "1.5px solid #5B7FA5", background: "#5B7FA518",
        fontSize: 13, color: "#5B7FA5", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif", marginBottom: 12,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <span>🤖</span> AI 识别文字
      </button>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1.5px solid #e8e5e0", background: "#fff", fontSize: 14, color: "#888", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif" }}>取消</button>
        <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", background: (formState.summary.trim() && !saving) ? "#4A7C6F" : "#ccc", color: "#fff", fontSize: 14, fontWeight: 600, cursor: (formState.summary.trim() && !saving) ? "pointer" : "default", fontFamily: "'Noto Sans SC', sans-serif" }}>
          {saving ? "保存中..." : "保存记录"}
        </button>
      </div>
    </div>
  );
}
