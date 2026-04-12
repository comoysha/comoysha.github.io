import { RECORD_TYPES } from '../constants.js';
import SearchBar from './SearchBar.jsx';
import FilterPanel from './FilterPanel.jsx';
import SortControl from './SortControl.jsx';
import ViewToggle from './ViewToggle.jsx';
import TableView from './TableView.jsx';
import RecordCard from './RecordCard.jsx';

export default function DesktopLayout({
  members, records, groups, totalCount, filteredCount,
  filterMember, onFilterMember,
  filterType, onFilterType,
  filterDateRange, onFilterDateRange,
  searchText, onSearchText,
  viewMode, onViewMode,
  sortBy, onSortBy,
  groupBy, onGroupBy,
  onDelete, onEdit,
  onClearFilters,
}) {
  const getGroupLabel = (key) => {
    switch (groupBy) {
      case "type": {
        const t = RECORD_TYPES.find((rt) => rt.key === key);
        return t ? `${t.icon} ${t.label}` : key;
      }
      case "member": {
        const m = members.find((mb) => mb.id === key);
        return m ? `${m.avatar} ${m.name}` : key;
      }
      case "none": return null;
      default: return key;
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <SearchBar value={searchText} onChange={onSearchText} />
        <ViewToggle viewMode={viewMode} onViewMode={onViewMode} />
        <SortControl sortBy={sortBy} onSortBy={onSortBy} groupBy={groupBy} onGroupBy={onGroupBy} />
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <FilterPanel
          members={members}
          filterMember={filterMember} onFilterMember={onFilterMember}
          filterType={filterType} onFilterType={onFilterType}
          filterDateRange={filterDateRange} onFilterDateRange={onFilterDateRange}
          totalCount={totalCount} filteredCount={filteredCount}
          onClear={onClearFilters}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {filteredCount === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#bbb" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14, fontFamily: "'Noto Sans SC', sans-serif" }}>没有匹配的记录</div>
            </div>
          ) : viewMode === "table" ? (
            <TableView records={records} members={members} onDelete={onDelete} onEdit={onEdit} />
          ) : (
            Object.entries(groups).map(([key, recs]) => (
              <div key={key} style={{ marginBottom: 20 }}>
                {getGroupLabel(key) && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#aaa", marginBottom: 8, paddingLeft: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>{getGroupLabel(key)}</div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 10 }}>
                  {recs.map((r) => <RecordCard key={r.id} record={r} members={members} onDelete={onDelete} onEdit={onEdit} compact />)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
