import { useState, useRef, useCallback } from 'react';

export default function SearchBar({ value, onChange, placeholder = "搜索记录..." }) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef(null);

  const handleChange = useCallback((e) => {
    const v = e.target.value;
    setLocal(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), 300);
  }, [onChange]);

  const handleClear = useCallback(() => {
    setLocal("");
    clearTimeout(timerRef.current);
    onChange("");
  }, [onChange]);

  return (
    <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <input
        type="text"
        value={local}
        onChange={handleChange}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "8px 32px 8px 12px", borderRadius: 10,
          border: "1.5px solid #e8e5e0", background: "#fff", fontSize: 13,
          fontFamily: "'Noto Sans SC', sans-serif", outline: "none", boxSizing: "border-box",
        }}
      />
      {local && (
        <button onClick={handleClear} style={{
          position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", fontSize: 14, color: "#aaa", cursor: "pointer",
          padding: "2px 4px", lineHeight: 1,
        }}>×</button>
      )}
    </div>
  );
}
