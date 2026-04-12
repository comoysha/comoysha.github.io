import { useState } from 'react';
import { createId } from '../constants.js';

export default function MemberManager({ members, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(members);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("👤");
  const colors = ["#4A7C6F", "#C06B5D", "#7B6B8D", "#5B7FA5", "#A08C5B", "#5BA07C"];

  const updateMemberField = function(id, field, value) {
    setDraft(draft.map(function(m) { return m.id === id ? Object.assign({}, m, {[field]: value}) : m; }));
  };
  const handleAdd = () => {
    if (!newName.trim() || draft.length >= 8) return;
    setDraft([...draft, { id: createId(), name: newName.trim(), avatar: newEmoji || "👤", color: colors[draft.length % colors.length] }]);
    setNewName(""); setNewEmoji("👤");
  };
  const handleRemove = (id) => { if (draft.length <= 1) return; setDraft(draft.filter((m) => m.id !== id)); };
  const handleSave = () => { onUpdate(draft); setEditing(false); };

  if (!editing) return (
    <button onClick={() => { setEditing(true); setDraft(members); }} style={{
      padding: "6px 14px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)",
      fontSize: 12, color: "rgba(255,255,255,0.8)", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
    }}>管理成员</button>
  );

  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
      {draft.map((m) => (
        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <input value={m.avatar} onChange={function(e) { updateMemberField(m.id, "avatar", e.target.value); }} style={{
            width: 36, height: 36, textAlign: "center", fontSize: 20, padding: 0, borderRadius: 8,
            border: "1.5px solid #e8e5e0", background: "#faf9f7", outline: "none",
          }} />
          <input value={m.name} onChange={function(e) { updateMemberField(m.id, "name", e.target.value); }} style={{
            flex: 1, padding: "6px 10px", borderRadius: 8, border: "1.5px solid #e8e5e0",
            fontSize: 14, fontFamily: "'Noto Sans SC', sans-serif", outline: "none",
          }} />
          {draft.length > 1 && (
            <button onClick={() => handleRemove(m.id)} style={{
              width: 24, height: 24, borderRadius: "50%", border: "none", background: "#f5e6e3",
              color: "#c06b5d", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          )}
        </div>
      ))}
      {draft.length < 8 && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder="😀" style={{
            width: 36, height: 36, textAlign: "center", fontSize: 18, padding: 0, borderRadius: 8,
            border: "1.5px solid #e8e5e0", background: "#faf9f7", outline: "none",
          }} />
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="新成员姓名" style={{
            flex: 1, padding: "8px 12px", borderRadius: 10, border: "1.5px solid #e8e5e0", fontSize: 13, fontFamily: "'Noto Sans SC', sans-serif", outline: "none",
          }} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          <button onClick={handleAdd} style={{
            padding: "8px 14px", borderRadius: 10, border: "none", background: newName.trim() ? "#4A7C6F" : "#ddd",
            color: "#fff", fontSize: 13, cursor: newName.trim() ? "pointer" : "default", fontFamily: "'Noto Sans SC', sans-serif",
          }}>添加</button>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={() => setEditing(false)} style={{
          flex: 1, padding: "8px", borderRadius: 10, border: "1.5px solid #e8e5e0", background: "#fff", fontSize: 13, color: "#888", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
        }}>取消</button>
        <button onClick={handleSave} style={{
          flex: 1, padding: "8px", borderRadius: 10, border: "none", background: "#4A7C6F", color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
        }}>保存</button>
      </div>
    </div>
  );
}
