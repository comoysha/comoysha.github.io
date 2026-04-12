const selectStyle = {
  padding: "6px 10px", borderRadius: 8, border: "1.5px solid #e8e5e0",
  background: "#fff", fontSize: 12, fontFamily: "'Noto Sans SC', sans-serif",
  color: "#555", cursor: "pointer", outline: "none",
};

export default function SortControl({ sortBy, onSortBy, groupBy, onGroupBy }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select value={sortBy} onChange={(e) => onSortBy(e.target.value)} style={selectStyle}>
        <option value="date-desc">最新优先</option>
        <option value="date-asc">最早优先</option>
        <option value="type">按类型</option>
        <option value="member">按成员</option>
      </select>
      <select value={groupBy} onChange={(e) => onGroupBy(e.target.value)} style={selectStyle}>
        <option value="month">按月分组</option>
        <option value="type">按类型分组</option>
        <option value="member">按成员分组</option>
        <option value="none">不分组</option>
      </select>
    </div>
  );
}
