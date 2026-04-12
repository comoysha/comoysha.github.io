import { useState } from 'react';
import { RECORD_TYPES } from '../constants.js';
import { getRecordImages } from './EditForm.jsx';
import ImageViewer from './ImageViewer.jsx';
import EditForm from './EditForm.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

const thStyle = {
  padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600,
  color: "#888", borderBottom: "2px solid #e8e5e0", whiteSpace: "nowrap",
  fontFamily: "'Noto Sans SC', sans-serif", cursor: "pointer", userSelect: "none",
  position: "sticky", top: 0, background: "#fff", zIndex: 1,
};

const tdStyle = {
  padding: "10px 12px", fontSize: 13, color: "#333",
  fontFamily: "'Noto Sans SC', sans-serif", borderBottom: "1px solid #f0ede8",
  verticalAlign: "top",
};

export default function TableView({ records, members, onDelete, onEdit }) {
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [viewImage, setViewImage] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  return (
    <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>日期</th>
            <th style={thStyle}>成员</th>
            <th style={thStyle}>类型</th>
            <th style={{ ...thStyle, width: "40%" }}>概要</th>
            <th style={thStyle}>医院</th>
            <th style={thStyle}>操作</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const member = members.find((m) => m.id === r.memberId) || members[0];
            const typeInfo = RECORD_TYPES.find((t) => t.key === r.type);
            const isExpanded = expandedId === r.id;

            if (editingId === r.id) {
              return (
                <tr key={r.id}>
                  <td colSpan={6} style={{ padding: 16 }}>
                    <EditForm record={r} members={members} onSave={(updated) => { onEdit(updated); setEditingId(null); }} onCancel={() => setEditingId(null)} />
                  </td>
                </tr>
              );
            }

            return [
              <tr key={r.id} onClick={() => setExpandedId(isExpanded ? null : r.id)} style={{
                cursor: "pointer", background: isExpanded ? "#faf9f7" : "transparent",
                transition: "background 0.15s",
              }}>
                <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#888", whiteSpace: "nowrap" }}>{r.date || "—"}</td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 14 }}>{member?.avatar}</span>
                  <span style={{ marginLeft: 4, color: member?.color, fontWeight: 500, fontSize: 12 }}>{member?.name}</span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 13 }}>{typeInfo?.icon} {typeInfo?.label}</span>
                </td>
                <td style={{ ...tdStyle, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.summary || "—"}</td>
                <td style={{ ...tdStyle, fontSize: 12, color: "#888" }}>{r.hospital || "—"}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={(e) => { e.stopPropagation(); setEditingId(r.id); }} style={{
                      padding: "3px 10px", fontSize: 11, color: "#4A7C6F", background: "#4A7C6F15",
                      border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
                    }}>编辑</button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }} style={{
                      padding: "3px 10px", fontSize: 11, color: "#c06b5d", background: "#c06b5d15",
                      border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
                    }}>删除</button>
                  </div>
                </td>
              </tr>,
              isExpanded && (
                <tr key={r.id + "-detail"}>
                  <td colSpan={6} style={{ padding: "12px 16px 16px", background: "#faf9f7", borderBottom: "1px solid #f0ede8" }}>
                    {r.doctor && <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>👨‍⚕️ 医生：{r.doctor}</div>}
                    {r.diagnosis && <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>📌 诊断：{r.diagnosis}</div>}
                    {r.medications?.length > 0 && (
                      <div style={{ marginBottom: 4 }}>{r.medications.map((med, i) => (
                        <div key={i} style={{ fontSize: 12, color: "#777", paddingLeft: 4 }}>💊 {med.name}{med.dosage && ` — ${med.dosage}`}</div>
                      ))}</div>
                    )}
                    {r.tests?.length > 0 && (
                      <div style={{ marginBottom: 4 }}>{r.tests.map((test, i) => (
                        <div key={i} style={{ fontSize: 12, color: "#777", paddingLeft: 4 }}>🔬 {test.name}{test.result && ` — ${test.result}`}</div>
                      ))}</div>
                    )}
                    {r.notes && <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{r.notes}</div>}
                    {(function() {
                      const imgs = getRecordImages(r);
                      if (imgs.length === 0) return null;
                      return (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                          {imgs.map((img, i) => {
                            const src = img.thumbUrl || img.imageThumb || img.imageUrl || img.imageData;
                            return <img key={i} src={src} alt="" onClick={() => setViewImage(img.imageUrl || img.imageData || src)} style={{ width: 100, height: 100, borderRadius: 8, objectFit: "cover", cursor: "pointer" }} />;
                          })}
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
      {viewImage && <ImageViewer src={viewImage} onClose={() => setViewImage(null)} />}
      {deleteId && <ConfirmDialog message="确定删除这条记录？" onConfirm={() => { onDelete(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}
