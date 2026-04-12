export default function TypeChip({ type, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 12px", borderRadius: 16, border: selected ? "2px solid #4A7C6F" : "2px solid #e8e5e0",
      background: selected ? "#4A7C6F" : "transparent", color: selected ? "#fff" : "#888",
      fontSize: 13, fontFamily: "'Noto Sans SC', sans-serif", cursor: "pointer", transition: "all 0.15s",
      display: "flex", alignItems: "center", gap: 4,
    }}>
      <span style={{ fontSize: 13 }}>{type.icon}</span>{type.label}
    </button>
  );
}
