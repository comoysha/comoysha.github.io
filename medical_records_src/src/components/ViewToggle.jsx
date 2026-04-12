export default function ViewToggle({ viewMode, onViewMode }) {
  const btn = (mode, label) => ({
    padding: "6px 12px", borderRadius: 8,
    border: viewMode === mode ? "1.5px solid #4A7C6F" : "1.5px solid #e8e5e0",
    background: viewMode === mode ? "#4A7C6F" : "#fff",
    color: viewMode === mode ? "#fff" : "#888",
    fontSize: 12, cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
  });

  return (
    <div style={{ display: "flex", gap: 4 }}>
      <button onClick={() => onViewMode("card")} style={btn("card")}>卡片</button>
      <button onClick={() => onViewMode("table")} style={btn("table")}>表格</button>
    </div>
  );
}
