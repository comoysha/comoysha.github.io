import { useState } from 'react';
import { RECORD_TYPES } from '../constants.js';
import { getRecordImages } from './EditForm.jsx';
import ImageViewer from './ImageViewer.jsx';
import EditForm from './EditForm.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

export default function RecordCard({ record, members, onDelete, onEdit, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [viewImage, setViewImage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const member = members.find((m) => m.id === record.memberId) || members[0];

  if (editing) {
    return <EditForm record={record} members={members} onSave={function(updated) { onEdit(updated); setEditing(false); }} onCancel={function() { setEditing(false); }} />;
  }

  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 10,
      borderLeft: `4px solid ${member.color}`, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "all 0.2s",
    }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 13 }}>{RECORD_TYPES.find((t) => t.key === record.type)?.icon || "📝"}</span>
            <span style={{ fontSize: 12, color: member.color, fontWeight: 600, fontFamily: "'Noto Sans SC', sans-serif" }}>{member.name}</span>
            <span style={{ fontSize: 11, color: "#aaa", fontFamily: "'JetBrains Mono', monospace" }}>{record.date || "未注明日期"}</span>
          </div>
          <div style={{ fontSize: 14, color: "#333", fontFamily: "'Noto Sans SC', sans-serif", lineHeight: 1.5 }}>{record.summary}</div>
        </div>
        {(function() {
          const imgs = getRecordImages(record);
          if (imgs.length === 0) return null;
          const first = imgs[0];
          const src = first.thumbUrl || first.imageThumb || first.imageUrl || first.imageData;
          return (
            <div style={{ position: "relative", marginLeft: 10, flexShrink: 0 }}>
              <img src={src} alt="" onClick={function(e) { e.stopPropagation(); setViewImage(first.imageUrl || first.imageData || src); }} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", cursor: "pointer" }} />
              {imgs.length > 1 && <span style={{ position: "absolute", bottom: -2, right: -2, background: "#4A7C6F", color: "#fff", fontSize: 10, fontWeight: 600, borderRadius: 8, padding: "1px 5px", lineHeight: 1.4 }}>{imgs.length}</span>}
            </div>
          );
        })()}
      </div>
      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f0ede8" }}>
          {record.hospital && <div style={{ fontSize: 13, color: "#666", marginBottom: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>🏥 {record.hospital}{record.doctor && ` · ${record.doctor}`}</div>}
          {record.diagnosis && <div style={{ fontSize: 13, color: "#666", marginBottom: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>📌 {record.diagnosis}</div>}
          {record.medications?.length > 0 && <div style={{ marginBottom: 4 }}>{record.medications.map((med, i) => (
            <div key={i} style={{ fontSize: 12, color: "#777", fontFamily: "'Noto Sans SC', sans-serif", paddingLeft: 4 }}>💊 {med.name} {med.dosage && `— ${med.dosage}`}</div>
          ))}</div>}
          {record.tests?.length > 0 && <div style={{ marginBottom: 4 }}>{record.tests.map((test, i) => (
            <div key={i} style={{ fontSize: 12, color: "#777", fontFamily: "'Noto Sans SC', sans-serif", paddingLeft: 4 }}>🔬 {test.name} {test.result && `— ${test.result}`}</div>
          ))}</div>}
          {record.notes && <div style={{ fontSize: 12, color: "#888", marginTop: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>{record.notes}</div>}
          {(function() {
            const imgs = getRecordImages(record);
            if (imgs.length === 0) return null;
            return (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {imgs.map(function(img, i) {
                  const src = img.imageUrl || img.imageData || img.thumbUrl || img.imageThumb;
                  return <img key={i} src={src} alt="" onClick={function(e) { e.stopPropagation(); setViewImage(img.imageUrl || img.imageData || src); }} style={{ width: imgs.length === 1 ? "100%" : 120, height: imgs.length === 1 ? "auto" : 120, borderRadius: 8, objectFit: "cover", cursor: "pointer" }} />;
                })}
              </div>
            );
          })()}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} style={{
              padding: "4px 12px", fontSize: 12, color: "#4A7C6F", background: "#4A7C6F15",
              border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
            }}>编辑</button>
            <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }} style={{
              padding: "4px 12px", fontSize: 12, color: "#c06b5d", background: "#c06b5d15",
              border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
            }}>删除</button>
          </div>
        </div>
      )}
      {viewImage && <ImageViewer src={viewImage} onClose={function() { setViewImage(null); }} />}
      {showDeleteConfirm && <ConfirmDialog message="确定删除这条记录？" onConfirm={function() { setShowDeleteConfirm(false); onDelete(record.id); }} onCancel={function() { setShowDeleteConfirm(false); }} />}
    </div>
  );
}
