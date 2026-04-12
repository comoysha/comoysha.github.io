export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div onClick={onCancel} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={function(e) { e.stopPropagation(); }} style={{
        background: "#fff", borderRadius: 16, padding: 24, maxWidth: 320, width: "100%", textAlign: "center",
      }}>
        <div style={{ fontSize: 15, color: "#333", marginBottom: 20, fontFamily: "'Noto Sans SC', sans-serif", lineHeight: 1.6 }}>{message}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "1.5px solid #e8e5e0", background: "#fff", fontSize: 14, color: "#888", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif" }}>取消</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "none", background: "#c06b5d", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif" }}>确定删除</button>
        </div>
      </div>
    </div>
  );
}
