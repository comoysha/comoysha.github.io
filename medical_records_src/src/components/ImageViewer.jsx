export default function ImageViewer({ src, onClose }) {
  const handleDownload = function(e) {
    e.stopPropagation();
    const a = document.createElement("a");
    if (src.startsWith("data:")) {
      a.href = src;
    } else {
      a.href = src;
      a.target = "_blank";
    }
    a.download = "medical-image-" + Date.now() + ".jpg";
    a.click();
  };
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <img src={src} alt="" style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 8, objectFit: "contain" }} onClick={function(e) { e.stopPropagation(); }} />
      <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
        <button onClick={handleDownload} style={{
          padding: "10px 24px", borderRadius: 12, border: "none", background: "#fff", color: "#333",
          fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
        }}>下载</button>
        <button onClick={onClose} style={{
          padding: "10px 24px", borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.4)", background: "transparent", color: "#fff",
          fontSize: 14, cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
        }}>关闭</button>
      </div>
    </div>
  );
}
