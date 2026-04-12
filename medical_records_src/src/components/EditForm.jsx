import { useState } from 'react';
import { RECORD_TYPES } from '../constants.js';
import { tosHelper } from '../services/tosHelper.js';
import MemberPill from './MemberPill.jsx';
import TypeChip from './TypeChip.jsx';
import TypedFormFields from './TypedFormFields.jsx';
import MultiImageAttachment from './MultiImageAttachment.jsx';

// Helper: convert old single-image record to images array
export function getRecordImages(record) {
  if (record.images && record.images.length) return record.images;
  if (record.imageUrl) return [{ imageUrl: record.imageUrl, thumbUrl: record.thumbUrl }];
  if (record.imageData) return [{ imageData: record.imageData, imageThumb: record.imageThumb }];
  return [];
}

export default function EditForm({ record, members, onSave, onCancel }) {
  const [memberId, setMemberId] = useState(record.memberId);
  const [type, setType] = useState(record.type || "visit");
  const [formState, setFormState] = useState({
    date: record.date || "", summary: record.summary || "", hospital: record.hospital || "",
    doctor: record.doctor || "", diagnosis: record.diagnosis || "",
    medications: record.medications || [], tests: record.tests || [], notes: record.notes || "",
  });
  const [images, setImages] = useState(getRecordImages(record));
  const [saving, setSaving] = useState(false);

  const handleSave = async function() {
    if (!formState.summary.trim() || saving) return;
    setSaving(true);
    const updated = Object.assign({}, record, {
      memberId: memberId, type: type, date: formState.date, summary: formState.summary.trim(),
      hospital: formState.hospital, doctor: formState.doctor, diagnosis: formState.diagnosis,
      medications: (formState.medications || []).filter(function(m) { return m.name.trim(); }),
      tests: (formState.tests || []).filter(function(t) { return t.name.trim(); }),
      notes: formState.notes,
    });
    // Clear old single-image fields
    delete updated.imageUrl; delete updated.thumbUrl; delete updated.imageData; delete updated.imageThumb;
    // Upload new images to TOS
    if (images.length > 0) {
      const uploaded = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.imageUrl) { uploaded.push({ imageUrl: img.imageUrl, thumbUrl: img.thumbUrl }); continue; }
        if (img.imageData && tosHelper.isConfigured()) {
          try {
            const imgId = record.id + "-" + i + "-" + Date.now();
            const u = await tosHelper.uploadBase64(img.imageData, imgId);
            const t = await tosHelper.uploadThumb(img.imageThumb, imgId);
            uploaded.push({ imageUrl: u, thumbUrl: t });
          } catch (e) { uploaded.push({ imageData: img.imageData, imageThumb: img.imageThumb }); }
        } else if (img.imageData) {
          uploaded.push({ imageData: img.imageData, imageThumb: img.imageThumb });
        }
      }
      updated.images = uploaded;
    } else {
      updated.images = [];
    }
    setSaving(false);
    onSave(updated);
  };

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e8e5e0",
    fontSize: 14, fontFamily: "'Noto Sans SC', sans-serif", background: "#faf9f7", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }} onClick={function(e) { e.stopPropagation(); }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#333", marginBottom: 12, fontFamily: "'Noto Sans SC', sans-serif" }}>编辑记录</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {members.map(function(m) { return <MemberPill key={m.id} member={m} selected={memberId === m.id} onClick={function() { setMemberId(m.id); }} />; })}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {RECORD_TYPES.map(function(t) { return <TypeChip key={t.key} type={t} selected={type === t.key} onClick={function() { setType(t.key); }} />; })}
      </div>
      <TypedFormFields type={type} state={formState} setState={setFormState} inputStyle={inputStyle} />
      <MultiImageAttachment images={images} onChange={setImages} />
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "1.5px solid #e8e5e0", background: "#fff", fontSize: 13, color: "#888", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif" }}>取消</button>
        <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "10px", borderRadius: 12, border: "none", background: (formState.summary.trim() && !saving) ? "#4A7C6F" : "#ccc", color: "#fff", fontSize: 13, fontWeight: 600, cursor: (formState.summary.trim() && !saving) ? "pointer" : "default", fontFamily: "'Noto Sans SC', sans-serif" }}>{saving ? "保存中..." : "保存修改"}</button>
      </div>
    </div>
  );
}
