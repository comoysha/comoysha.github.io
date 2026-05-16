export default function ImageViewer({ src, onClose }) {
  const handleDownload = async function(e) {
    e.stopPropagation();
    const filename = "medical-image-" + Date.now() + ".jpg";
    try {
      const resp = await fetch(src);
      const blob = await resp.blob();
      const type = blob.type || "image/jpeg";
      // iOS Safari ignores <a download> for cross-origin/data URLs.
      // Web Share with a File lets the user save to Photos via the share sheet.
      if (typeof File !== "undefined" && navigator.canShare) {
        try {
          const file = new File([blob], filename, { type: type });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file] });
            return;
          }
        } catch (_) { /* fall through */ }
      }
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(blobUrl); }, 1000);
    } catch (err) {
      console.error("Download failed:", err);
      window.open(src, "_blank");
    }
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
