import { useState, useEffect, useRef } from 'react';

export default function HeaderMenu({ items }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  const visible = items.filter((it) => !it.hide);
  if (visible.length === 0) return null;

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        padding: "0 10px", height: 30, borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.3)",
        background: open ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)",
        color: "rgba(255,255,255,0.9)", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }} title="更多" aria-label="更多">
        <svg width="16" height="4" viewBox="0 0 16 4" fill="currentColor" aria-hidden="true">
          <circle cx="2" cy="2" r="1.6" />
          <circle cx="8" cy="2" r="1.6" />
          <circle cx="14" cy="2" r="1.6" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
          background: "#fff", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          padding: 6, minWidth: 140,
        }}>
          {visible.map((it, i) => (
            <button key={i} onClick={() => { setOpen(false); it.onClick(); }} style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent",
              fontSize: 14, color: "#333", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
              textAlign: "left",
            }} onMouseEnter={(e) => e.currentTarget.style.background = "#f5f3f0"}
               onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              {it.icon && <span style={{ fontSize: 16 }}>{it.icon}</span>}
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
