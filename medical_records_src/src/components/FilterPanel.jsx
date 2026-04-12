import MemberPill from './MemberPill.jsx';
import TypeChip from './TypeChip.jsx';
import { RECORD_TYPES } from '../constants.js';

export default function FilterPanel({
  members, filterMember, onFilterMember,
  filterType, onFilterType,
  filterDateRange, onFilterDateRange,
  totalCount, filteredCount,
  onClear,
}) {
  const hasFilter = filterMember !== "all" || filterType !== "all" || filterDateRange.from || filterDateRange.to;

  return (
    <div style={{
      width: 240, flexShrink: 0, background: "#fff", borderRadius: 12,
      padding: 16, alignSelf: "flex-start", position: "sticky", top: 80,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#999", marginBottom: 10, letterSpacing: 0.5 }}>成员</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
        <button onClick={() => onFilterMember("all")} style={{
          padding: "6px 12px", borderRadius: 8, border: filterMember === "all" ? "2px solid #4A7C6F" : "2px solid transparent",
          background: filterMember === "all" ? "#4A7C6F18" : "transparent", color: filterMember === "all" ? "#4A7C6F" : "#999",
          fontSize: 13, fontWeight: filterMember === "all" ? 600 : 400, cursor: "pointer", textAlign: "left",
          fontFamily: "'Noto Sans SC', sans-serif",
        }}>全部</button>
        {members.map((m) => (
          <MemberPill key={m.id} member={m} selected={filterMember === m.id} onClick={() => onFilterMember(m.id)} />
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: "#999", marginBottom: 10, letterSpacing: 0.5 }}>类型</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        <TypeChip type={{ icon: "📁", label: "全部" }} selected={filterType === "all"} onClick={() => onFilterType("all")} />
        {RECORD_TYPES.map((t) => (
          <TypeChip key={t.key} type={t} selected={filterType === t.key} onClick={() => onFilterType(t.key)} />
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: "#999", marginBottom: 10, letterSpacing: 0.5 }}>时间范围</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        <input type="date" value={filterDateRange.from} onChange={(e) => onFilterDateRange({ ...filterDateRange, from: e.target.value })}
          style={{ padding: "6px 8px", borderRadius: 8, border: "1.5px solid #e8e5e0", fontSize: 12, fontFamily: "'Noto Sans SC', sans-serif" }} />
        <input type="date" value={filterDateRange.to} onChange={(e) => onFilterDateRange({ ...filterDateRange, to: e.target.value })}
          style={{ padding: "6px 8px", borderRadius: 8, border: "1.5px solid #e8e5e0", fontSize: 12, fontFamily: "'Noto Sans SC', sans-serif" }} />
      </div>

      {hasFilter && (
        <button onClick={onClear} style={{
          width: "100%", padding: "8px", borderRadius: 8, border: "1.5px solid #e8e5e0",
          background: "#fff", fontSize: 12, color: "#888", cursor: "pointer",
          fontFamily: "'Noto Sans SC', sans-serif", marginBottom: 8,
        }}>清除筛选</button>
      )}

      <div style={{ fontSize: 11, color: "#bbb", textAlign: "center" }}>
        {hasFilter ? `${filteredCount} / ${totalCount} 条` : `共 ${totalCount} 条`}
      </div>
    </div>
  );
}
