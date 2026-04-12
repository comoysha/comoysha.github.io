export default function ItemList({ items, onChange, nameLabel, valueLabel, valueKey }) {
  const handleChange = function(idx, field, val) {
    const next = items.map(function(item, i) {
      if (i !== idx) return item;
      const o = Object.assign({}, item); o[field] = val; return o;
    });
    onChange(next);
  };
  const handleAdd = function() {
    const o = { name: "" }; o[valueKey] = "";
    onChange(items.concat([o]));
  };
  const handleRemove = function(idx) { onChange(items.filter(function(_, i) { return i !== idx; })); };
  const rowStyle = { display: "flex", gap: 6, marginBottom: 6, alignItems: "center" };
  const inputStyle = {
    flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e8e5e0",
    fontSize: 13, fontFamily: "'Noto Sans SC', sans-serif", background: "#faf9f7", outline: "none", boxSizing: "border-box",
  };
  return (
    <div style={{ marginBottom: 8 }}>
      {items.map(function(item, i) {
        return (
          <div key={i} style={rowStyle}>
            <input placeholder={nameLabel} value={item.name} onChange={function(e) { handleChange(i, "name", e.target.value); }} style={inputStyle} />
            <input placeholder={valueLabel} value={item[valueKey] || ""} onChange={function(e) { handleChange(i, valueKey, e.target.value); }} style={inputStyle} />
            <button onClick={function() { handleRemove(i); }} style={{
              width: 24, height: 24, borderRadius: "50%", border: "none", background: "#f5e6e3",
              color: "#c06b5d", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>×</button>
          </div>
        );
      })}
      <button onClick={handleAdd} style={{
        padding: "6px 12px", borderRadius: 8, border: "1.5px dashed #d0cdc5", background: "#faf9f7",
        fontSize: 12, color: "#aaa", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
      }}>+ {nameLabel}</button>
    </div>
  );
}
