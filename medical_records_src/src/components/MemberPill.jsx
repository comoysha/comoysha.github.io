export default function MemberPill({ member, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
      borderRadius: 20, border: selected ? `2px solid ${member.color}` : "2px solid transparent",
      background: selected ? `${member.color}18` : "#f5f3f0", fontSize: 14,
      fontFamily: "'Noto Sans SC', sans-serif", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: 16 }}>{member.avatar}</span>
      <span style={{ color: selected ? member.color : "#666", fontWeight: selected ? 600 : 400 }}>{member.name}</span>
    </button>
  );
}
