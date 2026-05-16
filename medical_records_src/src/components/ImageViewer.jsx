import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

export default function ImageViewer({ src, onClose }) {
  const handleDownload = async function(e) {
    e.stopPropagation();
    const filename = "medical-image-" + Date.now() + ".jpg";
    let blob;
    try {
      const resp = await fetch(src);
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      blob = await resp.blob();
    } catch (err) {
      // Gesture context is lost after await — window.open here gets popup-blocked
      // on iOS Safari, leaving the user with nothing. Navigate the current tab
      // instead so they can at least long-press to save.
      console.error("Image fetch failed, navigating to src as fallback:", err);
      window.location.assign(src);
      return;
    }
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
    try {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setTimeout(function() { URL.revokeObjectURL(blobUrl); }, 1000);
    }
  };
  const stop = function(e) { e.stopPropagation(); };
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 0 20px",
      touchAction: "none",
    }}>
      <div onClick={stop} onPointerDown={stop} style={{ width: "100%", flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <TransformWrapper
          initialScale={1}
          minScale={1}
          maxScale={4}
          doubleClick={{ mode: "toggle", step: 2 }}
          wheel={{ step: 0.2 }}
          pinch={{ step: 5 }}
          panning={{ velocityDisabled: true }}
          centerOnInit
        >
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <img src={src} alt="" style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 8, objectFit: "contain", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }} draggable={false} />
          </TransformComponent>
        </TransformWrapper>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 16 }} onClick={stop}>
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
